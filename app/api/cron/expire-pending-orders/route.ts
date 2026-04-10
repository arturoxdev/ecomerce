import { findStuckPendingOrders, reconcileStripeOrder } from "@/features/checkout";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return new Response("Server misconfigured", { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stuck = await findStuckPendingOrders(100);
  let processed = 0;
  for (const order of stuck) {
    try {
      await reconcileStripeOrder(order);
      processed++;
    } catch (err) {
      logger.error("cron.reconcile_error", {
        orderId: order.id,
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return Response.json({ scanned: stuck.length, processed });
}
