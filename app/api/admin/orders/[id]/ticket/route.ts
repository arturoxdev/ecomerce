import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { z } from "zod";

import { auth } from "@/auth";
import { OrderTicketDocument } from "@/features/orders/components/admin/order-ticket-pdf";
import { findByIdWithItems } from "@/features/orders/services/orders.service";
import { problemResponse } from "@/lib/api/problem-response";
import { notFoundProblem, unauthorizedProblem } from "@/lib/problems";

const paramsSchema = z.object({ id: z.string().uuid() });

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  // /api/* is outside the proxy's admin guard, so the session check lives here.
  const session = await auth();
  if (!session?.user) {
    return problemResponse(unauthorizedProblem());
  }

  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) {
    return problemResponse(notFoundProblem("Order not found"));
  }

  const order = await findByIdWithItems(parsed.data.id);
  if (!order) {
    return problemResponse(notFoundProblem("Order not found"));
  }

  const pdf = await renderToBuffer(
    createElement(OrderTicketDocument, { order, generatedAt: new Date() }),
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${order.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
