import type { Env, LicenseRecord, ValidateResponse, CheckoutResponse } from './types';
import { verifyWebhookSignature, StripeClient } from './stripe';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for desktop app
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response: Response;

      if (path === '/checkout' && request.method === 'POST') {
        response = await handleCheckout(request, env);
      } else if (path === '/validate' && request.method === 'POST') {
        response = await handleValidate(request, env);
      } else if (path === '/webhook' && request.method === 'POST') {
        response = await handleWebhook(request, env);
      } else if (path === '/manage' && request.method === 'GET') {
        response = await handleManage(url, env);
      } else {
        response = new Response('Not Found', { status: 404 });
      }

      // Add CORS headers to all responses (except webhook)
      if (path !== '/webhook') {
        const headers = new Headers(response.headers);
        for (const [key, value] of Object.entries(corsHeaders)) {
          headers.set(key, value);
        }
        return new Response(response.body, { status: response.status, headers });
      }

      return response;
    } catch (err) {
      console.error('Worker error:', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};

// ── POST /checkout ──
async function handleCheckout(request: Request, env: Env): Promise<Response> {
  let machineId: string | undefined;
  try {
    const body = await request.json<{ machineId?: string }>();
    machineId = body.machineId;
  } catch {
    // No body or invalid JSON — machineId stays undefined
  }

  const licenseKey = crypto.randomUUID();
  const stripe = new StripeClient(env.STRIPE_SECRET_KEY);

  const session = await stripe.createCheckoutSession({
    priceId: env.STRIPE_PRICE_ID,
    licenseKey,
    successUrl: 'https://exportdoctor.app/success',
    cancelUrl: 'https://exportdoctor.app/cancel',
  });

  // Pre-create a partial record with machineId so it's available when webhook fires
  if (machineId) {
    const partialRecord: Partial<LicenseRecord> & { machineId: string } = {
      licenseKey,
      machineId,
      stripeCustomerId: '',
      stripeSubscriptionId: '',
      email: '',
      status: 'unpaid',
      currentPeriodEnd: 0,
      createdAt: Math.floor(Date.now() / 1000),
    };
    await env.LICENSES.put(licenseKey, JSON.stringify(partialRecord));
  }

  const result: CheckoutResponse = {
    url: session.url,
    licenseKey,
  };

  return Response.json(result);
}

// ── POST /validate ──
async function handleValidate(request: Request, env: Env): Promise<Response> {
  const body = await request.json<{ licenseKey: string; machineId?: string }>();
  const { licenseKey, machineId } = body;

  if (!licenseKey) {
    return Response.json({ valid: false, status: 'unknown', expiresAt: 0 } satisfies ValidateResponse);
  }

  const record = await env.LICENSES.get<LicenseRecord>(licenseKey, 'json');

  if (!record) {
    return Response.json({ valid: false, status: 'unknown', expiresAt: 0 } satisfies ValidateResponse);
  }

  // Machine lock: if license is bound to a machine, reject other machines
  if (record.machineId && machineId && record.machineId !== machineId) {
    return Response.json({ valid: false, status: 'machine_mismatch', expiresAt: 0 } satisfies ValidateResponse);
  }

  const now = Math.floor(Date.now() / 1000);

  // No grace period — only active subscriptions within their period are valid
  const valid =
    record.status === 'active' ||
    (record.status === 'canceled' && now < record.currentPeriodEnd);

  const result: ValidateResponse = {
    valid,
    status: record.status,
    expiresAt: record.currentPeriodEnd,
  };

  return Response.json(result);
}

// ── POST /webhook ──
async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  const body = await request.text();
  const valid = await verifyWebhookSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(body);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const licenseKey = session.metadata?.license_key;
      if (!licenseKey) break;

      const stripe = new StripeClient(env.STRIPE_SECRET_KEY);
      const subscription = await stripe.getSubscription(session.subscription);

      // Preserve machineId from partial record created during checkout
      const existing = await env.LICENSES.get<LicenseRecord>(licenseKey, 'json');

      const record: LicenseRecord = {
        licenseKey,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        email: session.customer_details?.email || '',
        status: 'active',
        currentPeriodEnd: subscription.current_period_end,
        createdAt: Math.floor(Date.now() / 1000),
        machineId: existing?.machineId,
      };

      await env.LICENSES.put(licenseKey, JSON.stringify(record));
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const licenseKey = sub.metadata?.license_key;
      if (!licenseKey) break;

      const existing = await env.LICENSES.get<LicenseRecord>(licenseKey, 'json');
      if (!existing) break;

      existing.status = mapStripeStatus(sub.status);
      existing.currentPeriodEnd = sub.current_period_end;
      await env.LICENSES.put(licenseKey, JSON.stringify(existing));
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const licenseKey = sub.metadata?.license_key;
      if (!licenseKey) break;

      const existing = await env.LICENSES.get<LicenseRecord>(licenseKey, 'json');
      if (!existing) break;

      existing.status = 'canceled';
      existing.currentPeriodEnd = sub.current_period_end;
      await env.LICENSES.put(licenseKey, JSON.stringify(existing));
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      const subId = invoice.subscription;
      if (!subId) break;

      const stripe = new StripeClient(env.STRIPE_SECRET_KEY);
      const subscription = await stripe.getSubscription(subId);
      const licenseKey = subscription.id ? await findLicenseBySubscription(env, subId) : null;
      if (!licenseKey) break;

      const existing = await env.LICENSES.get<LicenseRecord>(licenseKey, 'json');
      if (!existing) break;

      existing.status = 'active';
      existing.currentPeriodEnd = subscription.current_period_end;
      await env.LICENSES.put(licenseKey, JSON.stringify(existing));
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subId = invoice.subscription;
      if (!subId) break;

      const licenseKey = await findLicenseBySubscription(env, subId);
      if (!licenseKey) break;

      const existing = await env.LICENSES.get<LicenseRecord>(licenseKey, 'json');
      if (!existing) break;

      existing.status = 'past_due';
      await env.LICENSES.put(licenseKey, JSON.stringify(existing));
      break;
    }
  }

  return new Response('ok');
}

// ── GET /manage ──
async function handleManage(url: URL, env: Env): Promise<Response> {
  const licenseKey = url.searchParams.get('licenseKey');
  if (!licenseKey) {
    return Response.json({ error: 'Missing licenseKey' }, { status: 400 });
  }

  const record = await env.LICENSES.get<LicenseRecord>(licenseKey, 'json');
  if (!record) {
    return Response.json({ error: 'License not found' }, { status: 404 });
  }

  const stripe = new StripeClient(env.STRIPE_SECRET_KEY);
  const portal = await stripe.createPortalSession(
    record.stripeCustomerId,
    'https://exportdoctor.app/manage-done'
  );

  return Response.json({ url: portal.url });
}

// ── Helpers ──

function mapStripeStatus(status: string): LicenseRecord['status'] {
  switch (status) {
    case 'active': return 'active';
    case 'past_due': return 'past_due';
    case 'canceled': return 'canceled';
    default: return 'unpaid';
  }
}

/**
 * Find a license key by subscription ID.
 * KV doesn't support secondary indexes, so we scan by listing keys.
 * For a small user base this is fine. For scale, add a secondary KV index.
 */
async function findLicenseBySubscription(env: Env, subscriptionId: string): Promise<string | null> {
  const list = await env.LICENSES.list();
  for (const key of list.keys) {
    const record = await env.LICENSES.get<LicenseRecord>(key.name, 'json');
    if (record && record.stripeSubscriptionId === subscriptionId) {
      return key.name;
    }
  }
  return null;
}
