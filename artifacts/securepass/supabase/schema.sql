-- SecurePass stores only non-sensitive characteristics and anonymous learning
-- results. There is deliberately no password or password_hash column.

create extension if not exists pgcrypto;

create table if not exists public.password_evaluations (
  id uuid primary key default gen_random_uuid(),
  strength text not null check (
    strength in ('Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong')
  ),
  length_category text not null check (
    length_category in ('1-7', '8-11', '12-15', '16+')
  ),
  has_uppercase boolean not null,
  has_lowercase boolean not null,
  has_number boolean not null,
  has_special boolean not null,
  has_sequence boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions between 1 and 50),
  created_at timestamptz not null default now(),
  constraint quiz_score_within_total check (score <= total_questions)
);

create table if not exists public.security_checklists (
  id uuid primary key default gen_random_uuid(),
  strong_unique_passwords boolean not null,
  avoids_personal_information boolean not null,
  password_manager boolean not null,
  multi_factor_authentication boolean not null,
  avoids_password_sharing boolean not null,
  recognizes_phishing boolean not null,
  avoids_predictable_patterns boolean not null,
  reviews_security_settings boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists password_evaluations_created_at_idx
  on public.password_evaluations (created_at desc);
create index if not exists quiz_results_created_at_idx
  on public.quiz_results (created_at desc);
create index if not exists security_checklists_created_at_idx
  on public.security_checklists (created_at desc);

alter table public.password_evaluations enable row level security;
alter table public.quiz_results enable row level security;
alter table public.security_checklists enable row level security;

drop policy if exists "Anonymous users can add password characteristics"
  on public.password_evaluations;
create policy "Anonymous users can add password characteristics"
  on public.password_evaluations for insert to anon with check (true);

drop policy if exists "Anonymous users can add quiz scores"
  on public.quiz_results;
create policy "Anonymous users can add quiz scores"
  on public.quiz_results for insert to anon with check (true);

drop policy if exists "Anonymous users can add checklist results"
  on public.security_checklists;
create policy "Anonymous users can add checklist results"
  on public.security_checklists for insert to anon with check (true);

revoke all on public.password_evaluations from anon, authenticated;
revoke all on public.quiz_results from anon, authenticated;
revoke all on public.security_checklists from anon, authenticated;
grant insert on public.password_evaluations to anon;
grant insert on public.quiz_results to anon;
grant insert on public.security_checklists to anon;

-- The only read surface for anonymous visitors is this aggregate-only function.
-- Direct table reads stay disabled by both grants and RLS.
create or replace function public.get_securepass_aggregates()
returns jsonb
language sql
security definer
set search_path = pg_catalog, pg_temp
stable
as $function$
  select jsonb_build_object(
    'strength',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', bands.label,
        'count', coalesce(counts.amount, 0)
      ) order by bands.position)
      from (values
        ('Very Weak', 1),
        ('Weak', 2),
        ('Fair', 3),
        ('Strong', 4),
        ('Very Strong', 5)
      ) as bands(label, position)
      left join (
        select strength as label, count(*)::integer as amount
        from public.password_evaluations
        group by strength
      ) as counts using (label)
    ), '[]'::jsonb),
    'length',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', bands.label,
        'count', coalesce(counts.amount, 0)
      ) order by bands.position)
      from (values
        ('1-7', 1),
        ('8-11', 2),
        ('12-15', 3),
        ('16+', 4)
      ) as bands(label, position)
      left join (
        select length_category as label, count(*)::integer as amount
        from public.password_evaluations
        group by length_category
      ) as counts using (label)
    ), '[]'::jsonb),
    'characterTypes',
    jsonb_build_array(
      jsonb_build_object('label', 'Uppercase', 'count', (
        select count(*)::integer from public.password_evaluations
        where has_uppercase
      )),
      jsonb_build_object('label', 'Lowercase', 'count', (
        select count(*)::integer from public.password_evaluations
        where has_lowercase
      )),
      jsonb_build_object('label', 'Numbers', 'count', (
        select count(*)::integer from public.password_evaluations
        where has_number
      )),
      jsonb_build_object('label', 'Special characters', 'count', (
        select count(*)::integer from public.password_evaluations
        where has_special
      ))
    ),
    'totals', jsonb_build_object(
      'evaluations', (select count(*)::integer from public.password_evaluations),
      'quizzes', (select count(*)::integer from public.quiz_results),
      'checklists', (select count(*)::integer from public.security_checklists)
    )
  );
$function$;

revoke all on function public.get_securepass_aggregates() from public;
grant execute on function public.get_securepass_aggregates() to anon;
