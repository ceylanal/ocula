-- ============================================================================
-- KitUp — Supabase PostgreSQL Veritabanı Şeması (SQL Editor'e Yapıştırıp Çalıştırın)
-- ============================================================================

create table if not exists public.users (
  id text primary key,
  email text not null,
  name text,
  current_wpm integer default 220,
  baseline_wpm integer default 215,
  comprehension_rate integer default 75,
  streak_days integer default 1,
  created_at timestamptz default now()
);

create table if not exists public.books (
  id text primary key,
  title text not null,
  author text not null,
  category text not null,
  difficulty_level text not null,
  word_count integer not null,
  cover_gradient text default 'from-indigo-600 via-violet-600 to-purple-700',
  summary text default '',
  content jsonb not null,
  questions jsonb default '[]'::jsonb,
  is_custom boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.comprehension_questions (
  id text primary key,
  book_id text references public.books(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_option integer not null
);

create table if not exists public.exercise_logs (
  id text primary key,
  user_id text not null,
  exercise_type text not null,
  achieved_wpm integer not null,
  accuracy_score integer not null,
  duration_seconds integer not null,
  label text,
  completed_at timestamptz default now()
);

create table if not exists public.user_reading_progress (
  id text primary key,
  user_id text not null,
  book_id text not null,
  current_word_index integer default 0,
  reading_mode text default 'standard',
  preferred_wpm integer default 320,
  updated_at timestamptz default now()
);

-- Hızlı başlangıç için RLS (Row Level Security) açık erişim politikaları
alter table public.users enable row level security;
alter table public.books enable row level security;
alter table public.comprehension_questions enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.user_reading_progress enable row level security;

create policy "Public access users" on public.users for all using (true) with check (true);
create policy "Public access books" on public.books for all using (true) with check (true);
create policy "Public access questions" on public.comprehension_questions for all using (true) with check (true);
create policy "Public access logs" on public.exercise_logs for all using (true) with check (true);
create policy "Public access progress" on public.user_reading_progress for all using (true) with check (true);
