/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   The Company OS - Billing Foundation                         ║
 * ║   RUN-008: Multi-Tenant + Whitelabel Foundation              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Stripe-ready billing infrastructure:
 * - Billing record types and interfaces
 * - Plan pricing definitions
 * - Invoice generation helpers
 * - Webhook handler skeleton
 *
 * NOTE: Stripe SDK integration is prepared but not wired in.
 *       To activate: `npm install stripe` and uncomment SDK calls.
 */

import type {
  Tenant,
  TenantPlan,
  BillingRecord,
  BillingStatus,
  StripeWebhookEvent,
} from "./types";

// ───────────────────────────────────────────────
// Plan Pricing
// ───────────────────────────────────────────────

/** Monthly pricing per plan (in cents) */
export const PLAN_PRICES: Record<TenantPlan, number> = {
  starter: 4900,        // EUR 49.00
  professional: 14900,  // EUR 149.00
  enterprise: 49900,    // EUR 499.00
};

/** Plan display names */
export const PLAN_NAMES: Record<TenantPlan, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

/** Plan descriptions for invoices */
export const PLAN_DESCRIPTIONS: Record<TenantPlan, string> = {
  starter: "Starter Plan - Up to 3 agents, 5 users, 10 workflows",
  professional: "Professional Plan - Up to 10 agents, 25 users, 50 workflows",
  enterprise: "Enterprise Plan - Up to 100 agents, 500 users, 500 workflows",
};

/** Features included per plan (for invoice line items) */
export const PLAN_FEATURES_LIST: Record<TenantPlan, string[]> = {
  starter: [
    "3 AI Agents",
    "5 Team Members",
    "10 Workflows",
    "1 GB Storage",
    "10,000 API Calls/month",
    "Basic Dashboard",
  ],
  professional: [
    "10 AI Agents",
    "25 Team Members",
    "50 Workflows",
    "10 GB Storage",
    "100,000 API Calls/month",
    "Advanced Analytics",
    "SSO Authentication",
    "Custom Integrations",
  ],
  enterprise: [
    "100 AI Agents",
    "500 Team Members",
    "500 Workflows",
    "100 GB Storage",
    "1,000,000 API Calls/month",
    "White-Label Option",
    "Priority Support",
    "Audit Log",
    "Dedicated Infrastructure",
  ],
};

// ───────────────────────────────────────────────
// Billing Record Factory
// ───────────────────────────────────────────────

/**
 * Create a new billing record for a tenant.
 * Called at the start of each billing period.
 */
export function createBillingRecord(
  tenant: Tenant,
  period: string, // e.g. "2026-01"
  overrides?: Partial<BillingRecord>
): BillingRecord {
  const price = PLAN_PRICES[tenant.plan];
  const now = new Date();

  return {
    tenantId: tenant.id,
    plan: tenant.plan,
    amount: price,
    currency: tenant.limits.currency || "EUR",
    period,
    status: "pending",
    stripeCustomerId: tenant.stripeCustomerId,
    stripeSubscriptionId: tenant.stripeSubscriptionId,
    stripeInvoiceId: undefined,
    paidAt: undefined,
    dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    createdAt: now,
    ...overrides,
  };
}

// ───────────────────────────────────────────────
// Invoice Generation
// ───────────────────────────────────────────────

/** Line item for an invoice */
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // in cents
  total: number;     // in cents
}

/** Generated invoice */
export interface GeneratedInvoice {
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  period: string;
  issueDate: Date;
  dueDate: Date;
  lineItems: InvoiceLineItem[];
  subtotal: number;  // in cents
  taxRate: number;   // e.g., 0.19 for 19%
  taxAmount: number; // in cents
  total: number;     // in cents
  currency: string;
  status: BillingStatus;
  notes?: string;
}

/**
 * Generate an invoice for a tenant's billing period.
 */
export function generateInvoice(
  tenant: Tenant,
  billingRecord: BillingRecord
): GeneratedInvoice {
  const planPrice = PLAN_PRICES[billingRecord.plan];
  const vatRate = getVatRate(tenant); // Country-specific VAT

  const lineItems: InvoiceLineItem[] = [
    {
      description: PLAN_DESCRIPTIONS[billingRecord.plan],
      quantity: 1,
      unitPrice: planPrice,
      total: planPrice,
    },
  ];

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = Math.round(subtotal * vatRate);
  const total = subtotal + taxAmount;

  return {
    invoiceNumber: generateInvoiceNumber(billingRecord),
    tenantId: tenant.id,
    tenantName: tenant.name,
    period: billingRecord.period,
    issueDate: new Date(),
    dueDate: billingRecord.dueDate || new Date(),
    lineItems,
    subtotal,
    taxRate: vatRate,
    taxAmount,
    total,
    currency: billingRecord.currency,
    status: billingRecord.status,
    notes: `Subscription period: ${billingRecord.period}`,
  };
}

// ───────────────────────────────────────────────
// Stripe Integration (Prepared)
// ───────────────────────────────────────────────

/**
 * Stripe customer creation (prepared).
 * Uncomment and configure with actual Stripe SDK.
 */
export async function createStripeCustomer(
  _tenant: Tenant
  // stripe: Stripe // Stripe SDK instance
): Promise<{ customerId: string }> {
  // const customer = await stripe.customers.create({
  //   name: tenant.name,
  //   email: tenant.branding.emailFrom,
  //   metadata: {
  //     tenantId: tenant.id,
  //     slug: tenant.slug,
  //     plan: tenant.plan,
  //   },
  // });
  // return { customerId: customer.id };

  // Placeholder for development
  return { customerId: `cus_mock_${_tenant.id.slice(0, 8)}` };
}

/**
 * Stripe subscription creation (prepared).
 */
export async function createStripeSubscription(
  _tenant: Tenant,
  _stripePriceId: string
  // stripe: Stripe
): Promise<{ subscriptionId: string }> {
  // const subscription = await stripe.subscriptions.create({
  //   customer: tenant.stripeCustomerId!,
  //   items: [{ price: stripePriceId }],
  //   metadata: { tenantId: tenant.id },
  // });
  // return { subscriptionId: subscription.id };

  return { subscriptionId: `sub_mock_${_tenant.id.slice(0, 8)}` };
}

/**
 * Stripe webhook handler (prepared).
 * Handles: invoice.paid, invoice.payment_failed, customer.subscription.updated, etc.
 */
export async function handleStripeWebhook(
  event: StripeWebhookEvent
  // tenantManager: TenantManager
): Promise<{ handled: boolean; action?: string }> {
  const { type, data: _data } = event;

  switch (type) {
    case "invoice.paid": {
      // Payment succeeded
      // const invoice = data.object;
      // await tenantManager.recordPayment(invoice.subscription as string, 'paid');
      return { handled: true, action: "payment_recorded" };
    }

    case "invoice.payment_failed": {
      // Payment failed
      // const invoice = data.object;
      // await tenantManager.recordPayment(invoice.subscription as string, 'overdue');
      return { handled: true, action: "payment_failed" };
    }

    case "customer.subscription.updated": {
      // Subscription changed (upgrade/downgrade)
      // const subscription = data.object;
      // const newPlan = extractPlanFromSubscription(subscription);
      // await tenantManager.updatePlanFromStripe(subscription.id, newPlan);
      return { handled: true, action: "subscription_updated" };
    }

    case "customer.subscription.deleted": {
      // Subscription cancelled
      // const subscription = data.object;
      // await tenantManager.cancelSubscription(subscription.id);
      return { handled: true, action: "subscription_cancelled" };
    }

    default:
      return { handled: false };
  }
}

// ───────────────────────────────────────────────
// Utility Functions
// ───────────────────────────────────────────────

/** Generate a unique invoice number */
function generateInvoiceNumber(billingRecord: BillingRecord): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const tenantPrefix = billingRecord.tenantId.slice(0, 6).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${year}${month}-${tenantPrefix}-${random}`;
}

/** Get VAT rate based on tenant country (simplified) */
function getVatRate(_tenant: Tenant): number {
  // Simplified: return German VAT rate
  // In production, determine based on tenant billing address
  // Germany: 19%, Austria: 20%, Switzerland: 7.7%
  return 0.19;
}

/** Format amount in cents to display string */
export function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency || "EUR",
  });
  return formatter.format(amount / 100);
}

/** Calculate prorated amount for mid-cycle upgrades */
export function calculateProratedAmount(
  oldPlan: TenantPlan,
  newPlan: TenantPlan,
  daysUsed: number,
  daysInPeriod: number
): { refund: number; charge: number; netAmount: number } {
  const oldPrice = PLAN_PRICES[oldPlan];
  const newPrice = PLAN_PRICES[newPlan];

  const refund = Math.round((oldPrice * (daysInPeriod - daysUsed)) / daysInPeriod);
  const charge = Math.round((newPrice * (daysInPeriod - daysUsed)) / daysInPeriod);
  const netAmount = charge - refund;

  return { refund, charge, netAmount };
}

/** Check if a tenant's billing is current */
export function isBillingCurrent(billingRecord: BillingRecord): boolean {
  if (billingRecord.status === "paid") return true;
  if (billingRecord.status === "cancelled") return true;
  if (billingRecord.dueDate && new Date() > billingRecord.dueDate) return false;
  return true;
}

// ───────────────────────────────────────────────
// Billing Routes (prepared for Express router)
// ───────────────────────────────────────────────

import { Router } from "express";
import type { Request, Response } from "express";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BillingRouterDependencies {
  // stripe: Stripe; // Stripe SDK instance
  // tenantManager: TenantManager;
}

export function createBillingRouter(_deps: BillingRouterDependencies): Router {
  const router = Router();

  /**
   * POST /api/billing/webhook
   * Stripe webhook endpoint
   */
  router.post("/webhook", async (req: Request, res: Response) => {
    try {
      const event = req.body as StripeWebhookEvent;
      const result = await handleStripeWebhook(event);

      if (result.handled) {
        res.json({ received: true, action: result.action });
      } else {
        res.json({ received: true, action: "ignored" });
      }
    } catch (error) {
      res.status(400).json({
        error: "WEBHOOK_ERROR",
        message: error instanceof Error ? error.message : "Invalid webhook payload",
      });
    }
  });

  /**
   * GET /api/billing/invoices/:tenantId
   * List invoices for a tenant
   */
  router.get("/invoices/:tenantId", (_req: Request, res: Response) => {
    // const invoices = await getInvoicesForTenant(req.params.tenantId);
    res.json({
      success: true,
      data: [],
      message: "Billing integration pending - Stripe not configured.",
    });
  });

  /**
   * POST /api/billing/upgrade
   * Initiate plan upgrade
   */
  router.post("/upgrade", (_req: Request, res: Response) => {
    // const { tenantId, newPlan } = req.body;
    // const result = await initiateUpgrade(tenantId, newPlan);
    res.json({
      success: true,
      message: "Upgrade flow prepared - Stripe checkout not configured.",
      checkoutUrl: null,
    });
  });

  return router;
}
