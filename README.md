# Create3DParts

Next.js app for managing 3D print quote requests, payments, and order tracking (Supabase + Stripe + Resend).

## Getting Started

Install deps and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_WEBHOOK_SECRET_QUOTES=

# App URL (used in emails/webhooks)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Resend
RESEND_API_KEY=
RESEND_FROM=
ADMIN_EMAIL=
```

## Notes

- Supabase migrations live in `supabase/migrations/`.
- Stripe webhooks require a Node.js runtime route (`src/app/api/stripe/webhook/route.ts` and `src/app/api/webhooks/stripe/route.ts`).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
