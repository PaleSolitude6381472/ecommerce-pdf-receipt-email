import { z } from "zod";
import { infrai } from "./infrai.js";

export const orderRequest = z.object({
  to: z.string().email(),
  orderId: z.string().min(1),
  customerName: z.string().min(1),
  items: z.array(z.object({ name: z.string().min(1), quantity: z.number().int().positive(), unitCents: z.number().int().nonnegative() })).min(1),
  fulfillment: z.enum(["processing", "shipped", "delivered"])
});
export type OrderRequest = z.infer<typeof orderRequest>;
// Calling convention: infrai.email.send({ to, subject, html })

function pdfReport(order: OrderRequest): Buffer {
  const lines = [`Receipt ${order.orderId}`, `Customer: ${order.customerName}`, `Fulfillment: ${order.fulfillment}`, ...order.items.map(i => `${i.quantity} x ${i.name} = ${(i.quantity * i.unitCents / 100).toFixed(2)}`)];
  const body = lines.join("\\n");
  return Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\n2 0 obj<< /Length ${body.length + 40} >>stream\nBT /F1 12 Tf 72 720 Td (${body.replace(/[()]/g, "")}) Tj ET\nendstream\nendobj\ntrailer<<>>\n%%EOF`);
}

export async function emailOrderReport(input: unknown) {
  const order = orderRequest.parse(input);
  const pdf = pdfReport(order).toString("base64");
  const totalCents = order.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0);
  return infrai.email.send({
    to: order.to,
    subject: `Order ${order.orderId} receipt`,
    html: `<p>Hello ${order.customerName},</p><p>Your order is ${order.fulfillment}. Total: $${(totalCents / 100).toFixed(2)}.</p><p><a href="data:application/pdf;base64,${pdf}">Download your PDF receipt</a></p>`
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const to = process.env.DEMO_EMAIL_TO;
  if (!to) throw new Error("DEMO_EMAIL_TO is required");
  const result = await emailOrderReport({ to, orderId: "ORD-2048", customerName: "Avery", fulfillment: "shipped", items: [{ name: "Health monitor", quantity: 1, unitCents: 12900 }] });
  console.log(`sent receipt ${result.message_id}`);
}
