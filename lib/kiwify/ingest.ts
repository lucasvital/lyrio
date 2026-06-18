import { createHmac } from "node:crypto";
import { db } from "@/lib/db/client";
import { kiwifyEvent, kiwifySubscription } from "@/lib/db/schema";
import { ensureSchema } from "@/lib/db/ensure-schema";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface KiwifyResult {
  ok: boolean;
  eventType?: string | null;
  subscriptionId?: string | null;
  error?: string;
}

/** Map Kiwify event types (en + pt) to a normalized subscription status. */
const STATUS_BY_EVENT: Record<string, string> = {
  order_approved: "active",
  compra_aprovada: "active",
  subscription_renewed: "active",
  assinatura_renovada: "active",
  subscription_late: "late",
  assinatura_atrasada: "late",
  subscription_canceled: "canceled",
  assinatura_cancelada: "canceled",
  order_refunded: "refunded",
  compra_reembolsada: "refunded",
  chargeback: "chargeback",
};

function rec(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : undefined;
}

function pick(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

function parseDate(v: unknown): Date | null {
  if (v == null) return null;
  if (typeof v === "number") return new Date(v);
  const s = String(v).trim();
  if (!s) return null;
  // dd/mm/yyyy (optionally with time)
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (br) {
    const [, d, m, y, hh = "0", mi = "0", ss = "0"] = br;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mi), Number(ss));
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toAmount(v: unknown): string | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : null;
}

/** Optional Kiwify signature check (HMAC-SHA1 of the raw body with the token). */
function signatureOk(raw: string, signature: string | null): boolean {
  const { KIWIFY_WEBHOOK_TOKEN } = getEnv();
  if (!KIWIFY_WEBHOOK_TOKEN) return true; // no token configured → accept
  if (!signature) return false;
  const expected = createHmac("sha1", KIWIFY_WEBHOOK_TOKEN).update(raw).digest("hex");
  return expected === signature;
}

/**
 * Process one Kiwify webhook for a given project/expert: log the raw event and
 * upsert the subscription state. Always stores the raw payload so mapping can be
 * refined against real data.
 */
export async function handleKiwifyWebhook(
  project: string,
  raw: string,
  signature: string | null,
): Promise<KiwifyResult> {
  const log = logger.child({ source: "kiwify", project });

  if (!signatureOk(raw, signature)) {
    return { ok: false, error: "invalid signature" };
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "invalid json" };
  }

  try {
    await ensureSchema();

    const sub = rec(body.Subscription) ?? rec(body.subscription);
    const customer = rec(body.Customer) ?? rec(body.customer);
    const product = rec(body.Product) ?? rec(body.product);
    const commissions = rec(body.Commissions) ?? rec(body.commissions);
    const plan = rec(sub?.plan);

    const eventType = (
      pick(body.webhook_event_type, body.event, body.order_status) ?? ""
    ).toLowerCase();
    const orderId = pick(body.order_id, rec(body.Order)?.id, body.id);
    const subscriptionId = pick(sub?.id, body.subscription_id);

    // 1. Append-only raw log
    await db.insert(kiwifyEvent).values({
      project,
      eventType: eventType || null,
      orderId,
      subscriptionId,
      payload: body,
    });

    // 2. Subscription state (only when there is a subscription)
    if (subscriptionId) {
      const status =
        STATUS_BY_EVENT[eventType] ??
        (pick(sub?.status) ? normalizeStatus(pick(sub?.status)!) : null);
      const canceledAt =
        status === "canceled" ? (parseDate(sub?.canceled_at) ?? new Date()) : null;

      const values = {
        subscriptionId,
        project,
        status,
        customerEmail: pick(customer?.email, customer?.Email),
        customerName: pick(customer?.full_name, customer?.name, customer?.Name),
        productId: pick(product?.product_id, product?.id),
        productName: pick(product?.product_name, product?.name),
        plan: pick(plan?.name, sub?.plan_name),
        amount: toAmount(commissions?.charge_amount ?? body.charge_amount ?? product?.price),
        currency: pick(commissions?.currency, body.currency) ?? "BRL",
        startedAt: parseDate(sub?.start_date ?? sub?.started_at),
        nextChargeAt: parseDate(sub?.next_payment ?? sub?.next_charge ?? sub?.next_payment_date),
        canceledAt,
        raw: body,
        updatedAt: new Date(),
      };

      await db
        .insert(kiwifySubscription)
        .values(values)
        .onConflictDoUpdate({
          target: kiwifySubscription.subscriptionId,
          set: {
            project: values.project,
            ...(status ? { status } : {}),
            customerEmail: values.customerEmail,
            customerName: values.customerName,
            productId: values.productId,
            productName: values.productName,
            plan: values.plan,
            amount: values.amount,
            currency: values.currency,
            startedAt: values.startedAt,
            nextChargeAt: values.nextChargeAt,
            ...(canceledAt ? { canceledAt } : {}),
            raw: values.raw,
            updatedAt: new Date(),
          },
        });
    }

    log.info({ eventType, subscriptionId }, "kiwify webhook processed");
    return { ok: true, eventType: eventType || null, subscriptionId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err: message }, "kiwify webhook failed");
    return { ok: false, error: message };
  }
}

function normalizeStatus(raw: string): string {
  const s = raw.toLowerCase();
  if (["paid", "active", "approved", "aprovada", "ativa"].includes(s)) return "active";
  if (["canceled", "cancelled", "cancelada"].includes(s)) return "canceled";
  if (["late", "atrasada", "past_due"].includes(s)) return "late";
  if (["refunded", "reembolsada"].includes(s)) return "refunded";
  return s;
}
