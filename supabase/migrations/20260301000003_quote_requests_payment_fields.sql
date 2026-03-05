-- Add payment-tracking columns to quote_requests that the webhook writes.
-- stripe_session_id already exists (added by /api/stripe/quote-checkout).
-- These two are new.

alter table public.quote_requests
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid_at                  timestamptz;

-- Optional index to speed up the session-ID lookup the webhook performs.
create index if not exists idx_quote_requests_stripe_session_id
  on public.quote_requests (stripe_session_id)
  where stripe_session_id is not null;
