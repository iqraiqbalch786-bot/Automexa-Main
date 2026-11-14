-- Automexa marketing site: newsletter sign-ups.
-- Isolated objects only (marketing_newsletter, submit_marketing_newsletter). Nothing used by the Mexy app is touched.
-- Same access model as marketing_leads: RLS ON with NO policies, table privileges revoked from anon/authenticated,
-- and the only write path is a SECURITY DEFINER function gated by the server-held ingest token
-- (public.marketing_ingest_keys, stored as a SHA-256 hash).
-- Consent (UK GDPR / PECR): a sign-up is stored only with an explicit, unticked-by-default opt-in. We keep the exact
-- wording shown, the time, the page and the source, so consent can be evidenced and withdrawn.

create table if not exists public.marketing_newsletter (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  site             text not null default 'automexa.co.uk',
  email            text not null unique check (char_length(email) between 3 and 254 and position('@' in email) > 1 and email = lower(email)),
  status           text not null default 'subscribed' check (status in ('subscribed','unsubscribed')),
  consent          boolean not null check (consent),
  consent_text     text not null check (char_length(consent_text) between 10 and 500),
  consent_at       timestamptz not null default now(),
  source           text check (source is null or char_length(source) <= 40),
  page             text check (page is null or char_length(page) <= 300),
  referrer         text check (referrer is null or char_length(referrer) <= 500),
  utm              jsonb not null default '{}'::jsonb,
  ip_hash          text,
  user_agent       text check (user_agent is null or char_length(user_agent) <= 400),
  unsubscribed_at  timestamptz,
  is_test          boolean not null default false
);
create index if not exists marketing_newsletter_created_idx on public.marketing_newsletter (created_at desc);
create index if not exists marketing_newsletter_ip_idx on public.marketing_newsletter (ip_hash, created_at desc);

alter table public.marketing_newsletter enable row level security;
revoke all on public.marketing_newsletter from anon, authenticated;

create or replace function public.submit_marketing_newsletter(p_token text, p_sub jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_ip text := nullif(p_sub->>'ip_hash','');
  v_recent int;
begin
  if p_token is null or not exists (
    select 1 from public.marketing_ingest_keys
    where key_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and revoked_at is null
  ) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if coalesce((p_sub->>'consent')::boolean, false) is not true then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;

  if v_ip is not null then
    select count(*) into v_recent from public.marketing_newsletter
      where ip_hash = v_ip and updated_at > now() - interval '10 minutes';
    if v_recent >= 5 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;

  -- Idempotent: signing up again re-subscribes and refreshes the consent record.
  insert into public.marketing_newsletter (email, consent, consent_text, consent_at, source, page, referrer, utm, ip_hash, user_agent, is_test)
  values (
    lower(btrim(p_sub->>'email')),
    true,
    left(p_sub->>'consent_text', 500),
    now(),
    left(nullif(p_sub->>'source',''), 40),
    left(nullif(p_sub->>'page',''), 300),
    left(nullif(p_sub->>'referrer',''), 500),
    coalesce(p_sub->'utm','{}'::jsonb),
    v_ip,
    left(p_sub->>'user_agent', 400),
    coalesce((p_sub->>'is_test')::boolean, false)
  )
  on conflict (email) do update set
    status = 'subscribed', unsubscribed_at = null, updated_at = now(),
    consent = true, consent_text = excluded.consent_text, consent_at = now(),
    source = excluded.source, page = excluded.page, referrer = excluded.referrer, utm = excluded.utm,
    ip_hash = excluded.ip_hash, user_agent = excluded.user_agent, is_test = excluded.is_test
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.submit_marketing_newsletter(text, jsonb) from public;
grant execute on function public.submit_marketing_newsletter(text, jsonb) to anon, authenticated, service_role;
