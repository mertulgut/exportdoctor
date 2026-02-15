export interface Env {
  LICENSES: KVNamespace;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_ID: string;
}

export interface LicenseRecord {
  licenseKey: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  email: string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodEnd: number; // Unix timestamp
  createdAt: number;
  machineId?: string;
}

export interface ValidateResponse {
  valid: boolean;
  status: string;
  expiresAt: number;
}

export interface CheckoutResponse {
  url: string;
  licenseKey: string;
}
