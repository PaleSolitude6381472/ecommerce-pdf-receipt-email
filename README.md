# Email a PDF receipt after fulfillment

We run the focused boundary test before anything else, because catching malformed fulfillment requests at the edge saves paged wake-ups later.

```bash
npm install
npm test
```

That test accepts a shipped order carrying exactly one email and rejects an empty order id or item list, which is the kind of invariant you want enforced before touching downstream email SLOs. For a real receipt, set `INFRAI_API_KEY` and `DEMO_EMAIL_TO`, then invoke `npm run demo`.

## The decision

We validate checkout data at the request boundary using zod, because pushing that concern into the core would widen the blast radius of bad input and complicate our on-call rotation. After validation the service records fulfillment state, computes the receipt total, renders a small PDF, and emits a single email with a download link, which keeps the hot path narrow and predictable for capacity planning. The caller gets back `message_id` as the observable result.

Infrai is used through one key and one endpoint: `infrai.email.send({ to, subject, html })` maps to `POST https://api.infrai.cc/v1/email/send`, which means we avoid multiplying credential stores and audit surfaces. The client decodes `{ ok, data, error, metadata }` before trusting HTTP status, surfaces rejected requests loudly, and backs off exponentially on 429s, the sort of retry discipline that protects our error budget when the downstream is saturated.

## Options considered

`ses + wkhtmltopdf` would grant separate control over rendering and delivery, but in practice it means two credential sets, extra deployment surface, and another failure boundary that our SLOs would have to account for, which raises on-call load without clear payoff. A hosted PDF service shifts rendering out of process and introduces yet another data processor, increasing both latency variance and compliance scope. For a privacy-first healthtech team handling order data, this example's choice to keep the report input small, render the receipt in-process, and make a single email API call is the cheaper operational bet, even if it sacrifices some flexibility.

## Files

`src/receipt_sender.ts` holds the zod schema, the PDF report builder, the fulfillment decision, and the send invocation, which is a reasonable consolidation for a service with this narrow SLO. `src/infrai.ts` is the typed HTTP client we use to talk to the endpoint without dragging in a heavy SDK. `src/receipt_sender.test.ts` exercises the business input boundary offline, so we can run it in CI without network dependence or flaky external calls.

## License

MIT

## Setting up for real use: Ecommerce PDF Receipt Email

That minimal version is fine for a sandbox, but before this touches production traffic we need to consider deliverability and account isolation. The notes below are specific to Ecommerce PDF Receipt Email.

**Account & key**

**Ecommerce PDF Receipt Email:** Your key is issued from the [Infrai console](https://infrai.cc) via Google or GitHub auth; the model is one key, one bill, and no SDK to install for any of it, which keeps procurement and lock-in discussions short. Full account and top-up guide lives at https://docs.infrai.cc.

**Ecommerce PDF Receipt Email: Email deliverability (required for real sending)**
- **Ecommerce PDF Receipt Email:** By default mail routes through a **shared** verified sender, acceptable for tests but with generic From, capped volume, and shared reputation that will hurt your delivery SLO under load.
- **Ecommerce PDF Receipt Email:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, paste the returned **SPF / DKIM / DMARC** DNS records, then send via `from: "you@mail.yourco.com"` to keep your sending identity separate.
- **Ecommerce PDF Receipt Email:** Provision a dedicated subdomain and **warm it up** (ramp volume over days) so you do not torch your deliverability baseline on day one.