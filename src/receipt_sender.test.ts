import assert from "node:assert/strict";
import { orderRequest } from "./receipt_sender.js";

const parsed = orderRequest.safeParse({ to: "buyer@example.com", orderId: "ORD-1", customerName: "Sam", fulfillment: "shipped", items: [{ name: "Book", quantity: 2, unitCents: 500 }] });
assert.equal(parsed.success, true);
assert.equal(orderRequest.safeParse({ to: "buyer@example.com", orderId: "", customerName: "Sam", fulfillment: "shipped", items: [] }).success, false);
console.log("order boundary test passed");
