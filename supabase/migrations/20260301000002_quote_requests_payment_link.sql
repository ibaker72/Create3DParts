-- Add stripe_payment_link to quote_requests
-- This column stores the persistent Stripe Payment Link URL that the admin
-- generates via /api/admin/send-quote. Unlike stripe_session_id (which is a
-- one-time Checkout Session), a Payment Link never expires and can be shared.

alter table public.quote_requests
  add column if not exists stripe_payment_link text;

-- Extend the status check constraint to include the new 'priced' state.
-- If a check constraint already exists on status, drop and recreate it.
-- If there is no constraint yet, just the alter above is sufficient.
--
-- Typical status flow:
--   pending → priced → paid
--
-- NOTE: The existing /api/stripe/quote-checkout route guards on status = 'quoted'.
-- Now that the admin flow uses status = 'priced', update that guard to accept
-- both values, or rename 'quoted' → 'priced' consistently across the codebase.
