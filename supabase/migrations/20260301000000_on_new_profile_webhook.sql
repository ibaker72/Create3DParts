-- Migration: trigger edge function on new profile row
--
-- Supabase's built-in `supabase_functions.http_request` fires an HTTP POST to
-- an Edge Function every time a row is inserted into public.profiles.
--
-- Before running this migration you must:
--   1. Deploy the edge function:
--        supabase functions deploy on-new-user --no-verify-jwt
--   2. Copy your project ref from the Supabase dashboard URL
--        (looks like: abcdefghijklmnop)
--   3. Replace YOUR_PROJECT_REF and YOUR_WEBHOOK_SECRET below.
--      YOUR_WEBHOOK_SECRET must match the WEBHOOK_SECRET secret you set:
--        supabase secrets set WEBHOOK_SECRET=<random-string>

create or replace trigger on_profile_insert
  after insert on public.profiles
  for each row
  execute function supabase_functions.http_request(
    -- Edge Function URL
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/on-new-user',
    -- HTTP method
    'POST',
    -- Headers (JSON string) — Authorization header carries the shared secret
    '{"Content-Type":"application/json","Authorization":"Bearer YOUR_WEBHOOK_SECRET"}',
    -- Extra query params (none)
    '{}',
    -- Timeout in milliseconds
    '5000'
  );
