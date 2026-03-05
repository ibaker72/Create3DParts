-- Migration: fire edge function when a profile is approved
--
-- The WHEN clause means PostgreSQL only evaluates the trigger function for rows
-- where status actually transitions from 'pending' to 'approved'.  All other
-- UPDATE statements on public.profiles are completely unaffected.
--
-- Before running this migration:
--   1. Deploy the function:
--        supabase functions deploy on-user-approved --no-verify-jwt
--   2. Set SITE_URL if you haven't already:
--        supabase secrets set SITE_URL=https://create3dparts.com
--   3. Replace YOUR_PROJECT_REF and YOUR_WEBHOOK_SECRET below
--      (same values used in 20260301000000_on_new_profile_webhook.sql)

create or replace trigger on_profile_approved
  after update on public.profiles
  for each row
  when (old.status = 'pending' and new.status = 'approved')
  execute function supabase_functions.http_request(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/on-user-approved',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer YOUR_WEBHOOK_SECRET"}',
    '{}',
    '5000'
  );
