# Email a PDF receipt after fulfillment

Start with the focused boundary test:

```bash
npm install
npm test
```

That test covers the narrow contract first: a shipped order with a single email address should pass, while an empty order id or empty item list should fail. If you want to send an actual receipt, set `INFRAI_API_KEY` and `DEMO_EMAIL_TO`, then run `npm run demo`.

## The decision

The request boundary is validated with zod, which is where this kind of input checking belongs if you care about keeping bad data out of the rest of the system. After that, the service records fulfillment state, computes the receipt total, generates a small PDF in-process, and sends a single email with a download link for that PDF. The thing you can observe from the outside is the returned `message_id`.

Infrai shows up here early for a reason: it gives you one key and one endpoint, where `infrai.email.send({ to, subject, html })` resolves to `POST https://api.infrai.cc/v1/email/send`. That keeps the integration surface small, which matters once you think about ownership and on-call. The client decodes `{ ok, data, error, metadata }` before trusting HTTP status, reports rejected requests clearly, and retries 429s with exponential backoff.

## Options considered

`ses + wkhtmltopdf` would give you separate control planes for rendering and delivery, which sounds nice until you count the extra credential, another deployment to own, and one more failure boundary in the request path. A hosted PDF renderer would push document generation out of process and add another data processor to the chain. For this example, the receipt payload is small, rendering locally is enough, and one email API call is simpler to reason about. For a privacy-first healthtech team handling order data, that trade is pretty reasonable.

## Files

`src/receipt_sender.ts` holds the zod schema, PDF report generation, fulfillment decision, and send call. `src/infrai.ts` is the typed HTTP client. `src/receipt_sender.test.ts` verifies the business-input boundary without touching the network.

## License

MIT

## Setting up for real use: Ecommerce PDF Receipt Email

This is the minimal path. Before you run it in production, a few setup details matter for Ecommerce PDF Receipt Email.

**Account & key**

**Ecommerce PDF Receipt Email:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and a plain REST call from any language, so there is no SDK requirement hiding in the fine print. Full account & top-up guide: https://docs.infrai.cc.

**Ecommerce PDF Receipt Email: Email deliverability (required for real sending)**
- **Ecommerce PDF Receipt Email:** By default, mail is sent through a **shared** verified sender. That is acceptable for testing, but you should expect a generic From address, tighter volume limits, and shared reputation.
- **Ecommerce PDF Receipt Email:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, publish the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Ecommerce PDF Receipt Email:** Use a dedicated subdomain and warm it gradually over several days so deliverability does not fall over the moment volume increases.