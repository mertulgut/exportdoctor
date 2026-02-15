/**
 * Verify Stripe webhook signature using Web Crypto API (no Node.js deps).
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const item of signature.split(',')) {
    const [key, value] = item.split('=');
    parts[key] = value;
  }

  const timestamp = parts['t'];
  if (!timestamp) return false;

  // Reject timestamps older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) return false;

  const signedPayload = `${timestamp}.${body}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === parts['v1'];
}

/**
 * Minimal Stripe API client using fetch (no SDK needed in Workers).
 */
export class StripeClient {
  private apiKey: string;
  private baseUrl = 'https://api.stripe.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  async createCheckoutSession(params: {
    priceId: string;
    licenseKey: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ id: string; url: string }> {
    const body = new URLSearchParams({
      'mode': 'subscription',
      'line_items[0][price]': params.priceId,
      'line_items[0][quantity]': '1',
      'metadata[license_key]': params.licenseKey,
      'subscription_data[metadata][license_key]': params.licenseKey,
      'success_url': params.successUrl,
      'cancel_url': params.cancelUrl,
    });

    const res = await fetch(`${this.baseUrl}/checkout/sessions`, {
      method: 'POST',
      headers: this.headers(),
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Stripe checkout error: ${err}`);
    }

    return res.json();
  }

  async getSubscription(subId: string): Promise<{
    id: string;
    status: string;
    current_period_end: number;
    customer: string;
  }> {
    const res = await fetch(`${this.baseUrl}/subscriptions/${subId}`, {
      headers: this.headers(),
    });
    return res.json();
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
    const body = new URLSearchParams({
      customer: customerId,
      return_url: returnUrl,
    });

    const res = await fetch(`${this.baseUrl}/billing_portal/sessions`, {
      method: 'POST',
      headers: this.headers(),
      body: body.toString(),
    });

    return res.json();
  }
}
