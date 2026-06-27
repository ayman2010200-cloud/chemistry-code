-- Chemistry Code / Chemistry 2026 production database schema
-- Run this in Supabase SQL Editor.

create extension if not exists "uuid-ossp";

-- Profiles linked to Supabase Auth users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  grade text,
  role text not null default 'student' check (role in ('student','admin','teacher')),
  plan text not null default 'free' check (plan in ('free','monthly','vip')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists lessons (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  title_ar text,
  description text,
  grade text default 'grade2',
  access text default 'free' check (access in ('free','monthly','vip')),
  duration text,
  level text,
  icon text default '📚',
  video_url text,
  pdf_url text,
  html_content text,
  sort_order int default 0,
  published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists questions (
  id uuid primary key default uuid_generate_v4(),
  type text default 'multiple-choice',
  category text default 'general',
  difficulty text default 'easy',
  question_text text not null,
  options jsonb default '[]'::jsonb,
  correct_answer text,
  explanation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists quizzes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  icon text default '📝',
  duration int default 10,
  points int default 50,
  question_ids uuid[] default '{}',
  published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists student_quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  quiz_id uuid references quizzes(id) on delete cascade,
  score int default 0,
  total int default 0,
  answers jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists files_library (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  storage_path text,
  public_url text,
  file_type text,
  size_bytes bigint,
  access text default 'free' check (access in ('free','monthly','vip')),
  created_at timestamptz default now()
);

create table if not exists activation_codes (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  plan text not null check (plan in ('free','monthly','vip')),
  used boolean default false,
  used_by uuid references profiles(id),
  used_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  plan text not null check (plan in ('free','monthly','vip')),
  provider text check (provider in ('tap','fawry','paypal','code','manual')),
  provider_reference text,
  status text default 'active' check (status in ('pending','active','cancelled','expired','failed')),
  amount numeric,
  currency text default 'EGP',
  starts_at timestamptz default now(),
  ends_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists payment_events (
  id uuid primary key default uuid_generate_v4(),
  provider text not null,
  reference text,
  user_email text,
  plan text,
  amount numeric,
  currency text,
  status text,
  raw jsonb,
  created_at timestamptz default now()
);

create table if not exists certificates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  certificate_code text unique not null,
  issued_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

-- Storage bucket for course files
insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', false)
on conflict (id) do nothing;

-- Row Level Security
alter table profiles enable row level security;
alter table lessons enable row level security;
alter table questions enable row level security;
alter table quizzes enable row level security;
alter table student_quiz_attempts enable row level security;
alter table files_library enable row level security;
alter table activation_codes enable row level security;
alter table subscriptions enable row level security;
alter table payment_events enable row level security;
alter table certificates enable row level security;

-- Helper function: admin check
create or replace function is_admin()
returns boolean language sql stable as $$
  select exists(select 1 from profiles where id = auth.uid() and role in ('admin','teacher'));
$$;

-- Policies
create policy "profiles_self_read" on profiles for select using (auth.uid() = id or is_admin());
create policy "profiles_self_update" on profiles for update using (auth.uid() = id or is_admin());
create policy "admin_all_profiles" on profiles for all using (is_admin()) with check (is_admin());

create policy "published_lessons_read" on lessons for select using (published = true or is_admin());
create policy "admin_lessons_all" on lessons for all using (is_admin()) with check (is_admin());

create policy "questions_read" on questions for select using (auth.role() = 'authenticated');
create policy "admin_questions_all" on questions for all using (is_admin()) with check (is_admin());

create policy "quizzes_read" on quizzes for select using (published = true or is_admin());
create policy "admin_quizzes_all" on quizzes for all using (is_admin()) with check (is_admin());

create policy "attempts_self" on student_quiz_attempts for select using (auth.uid() = user_id or is_admin());
create policy "attempts_insert_self" on student_quiz_attempts for insert with check (auth.uid() = user_id);
create policy "admin_attempts_all" on student_quiz_attempts for all using (is_admin()) with check (is_admin());

create policy "files_read" on files_library for select using (true);
create policy "admin_files_all" on files_library for all using (is_admin()) with check (is_admin());

create policy "codes_admin_read" on activation_codes for select using (is_admin());
create policy "codes_admin_all" on activation_codes for all using (is_admin()) with check (is_admin());

create policy "subscriptions_self_read" on subscriptions for select using (auth.uid() = user_id or is_admin());
create policy "admin_subscriptions_all" on subscriptions for all using (is_admin()) with check (is_admin());

create policy "payment_events_admin" on payment_events for select using (is_admin());

create policy "certificates_self_read" on certificates for select using (auth.uid() = user_id or is_admin());
create policy "admin_certificates_all" on certificates for all using (is_admin()) with check (is_admin());

-- Auto create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
