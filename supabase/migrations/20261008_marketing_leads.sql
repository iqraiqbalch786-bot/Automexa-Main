-- Automexa marketing site: lead capture.
-- Isolated objects only (marketing_leads, marketing_ingest_keys, submit_marketing_lead).
-- Nothing used by the Mexy app is touched.
-- Access model: both tables have RLS ON with NO policies, and all table privileges are revoked
-- from anon/authenticated. The only write path is submit_marketing_lead(), a SECURITY DEFINER
-- function that requires a server-held ingest token (stored here only as a SHA-256 hash).

create table if not exists public.marketing_leads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  site             text not null default 'automexa.co.uk',
  form             text not null check (form in ('discovery','contact','scorecard','calculator')),
  name             text not null check (char_length(name) between 1 and 120),
  email            text not null check (char_length(email) between 3 and 254 and position('@' in email) > 1),
  phone            text check (phone is null or char_length(phone) <= 40),
  company          text check (company is null or char_length(company) <= 160),
  website          text check (website is null or char_length(website) <= 300),
  interests        text[] not null default '{}',
  budget           text check (budget is null or char_length(budget) <= 60),
  message          text check (message is null or char_length(message) <= 4000),
  details          jsonb not null default '{}'::jsonb,
  page             text check (page is null or char_length(page) <= 300),
  referrer         text check (referrer is null or char_length(referrer) <= 500),
  utm              jsonb not null default '{}'::jsonb,
  consent_privacy  boolean not null check (consent_privacy),
  marketing_opt_in boolean not null default false,
  ip_hash          text,
  user_agent       text check (user_agent is null or char_length(user_agent) <= 400),
  status           text not null default 'new' check (status in ('new','contacted','qualified','won','lost','spam')),
  notified_at      timestamptz,
  is_test          boolean not null default false
);
create index if not exists marketing_leads_created_idx on public.marketing_leads (created_at desc);
create index if not exists marketing_leads_ip_idx on public.marketing_leads (ip_hash, created_at desc);

create table if not exists public.marketing_ingest_keys (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  key_hash   text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.marketing_leads enable row level security;
alter table public.marketing_ingest_keys enable row level security;
revoke all on public.marketing_leads from anon, authenticated;
revoke all on public.marketing_ingest_keys from anon, authenticated;

create or replace function public.submit_marketing_lead(p_token text, p_lead jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_ip text := nullif(p_lead->>'ip_hash','');
  v_recent int;
begin
  if p_token is null or not exists (
    select 1 from public.marketing_ingest_keys
    where key_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and revoked_at is null
  ) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if v_ip is not null then
    select count(*) into v_recent from public.marketing_leads
      where ip_hash = v_ip and created_at > now() - interval '10 minutes';
    if v_recent >= 5 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;

  insert into public.marketing_leads (
    form, name, email, phone, company, website, interests, budget, message, details,
    page, referrer, utm, consent_privacy, marketing_opt_in, ip_hash, user_agent, is_test
  ) values (
    p_lead->>'form',
    btrim(p_lead->>'name'),
    lower(btrim(p_lead->>'email')),
    nullif(btrim(coalesce(p_lead->>'phone','')),''),
    nullif(btrim(coalesce(p_lead->>'company','')),''),
    nullif(btrim(coalesce(p_lead->>'website','')),''),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_lead->'interests','[]'::jsonb))), '{}'),
    nullif(p_lead->>'budget',''),
    nullif(btrim(coalesce(p_lead->>'message','')),''),
    coalesce(p_lead->'details','{}'::jsonb),
    nullif(p_lead->>'page',''),
    nullif(p_lead->>'referrer',''),
    coalesce(p_lead->'utm','{}'::jsonb),
    coalesce((p_lead->>'consent_privacy')::boolean, false),
    coalesce((p_lead->>'marketing_opt_in')::boolean, false),
    v_ip,
    left(p_lead->>'user_agent', 400),
    coalesce((p_lead->>'is_test')::boolean, false)
  ) returning id into v_id;
  return v_id;
end $$;

-- Lets the server mark a lead as notified (same token gate).
create or replace function public.mark_marketing_lead_notified(p_token text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_token is null or not exists (
    select 1 from public.marketing_ingest_keys
    where key_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and revoked_at is null
  ) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  update public.marketing_leads set notified_at = now() where id = p_id;
end $$;

revoke all on function public.submit_marketing_lead(text, jsonb) from public;
revoke all on function public.mark_marketing_lead_notified(text, uuid) from public;
grant execute on function public.submit_marketing_lead(text, jsonb) to anon, authenticated, service_role;
grant execute on function public.mark_marketing_lead_notified(text, uuid) to anon, authenticated, service_role;
