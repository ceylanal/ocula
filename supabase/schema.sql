-- ============================================================================
-- OkurLab — Supabase PostgreSQL şeması (tek kaynak)
--
-- Supabase SQL Editor'de çalıştırın. Dosya yeniden çalıştırılabilir (idempotent);
-- mevcut bir kurulumu da güvenli şekilde yükseltir.
--
-- Erişim modeli: Her satır Supabase Auth kullanıcısına aittir (auth.uid()).
-- Tablo kimlikleri geriye dönük uyumluluk için `text` tutulur; sahiplik
-- karşılaştırması auth.uid()::text ile yapılır. Anonim (oturumsuz) erişim yoktur.
-- Eski kurulumlardan kalan ve sahibi olmayan satırlar (owner_id / user_id'si
-- bir auth kullanıcısıyla eşleşmeyenler) politikalar gereği görünmez olur.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tablolar
-- ---------------------------------------------------------------------------

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

-- Sahiplik ve paylaşım sütunları (eski kurulumlar için yükseltme)
alter table public.books add column if not exists owner_id text;
alter table public.books add column if not exists owner_name text;
alter table public.books add column if not exists share_code text;
alter table public.books add column if not exists visibility text not null default 'private';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'books_visibility_check' and conrelid = 'public.books'::regclass
  ) then
    alter table public.books
      add constraint books_visibility_check
      check (visibility in ('private', 'friends', 'public'));
  end if;
end $$;

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

create index if not exists books_owner_id_idx on public.books (owner_id);
create index if not exists books_share_code_idx on public.books (share_code) where share_code is not null;
create index if not exists exercise_logs_user_idx on public.exercise_logs (user_id, completed_at);
create index if not exists reading_progress_user_idx on public.user_reading_progress (user_id);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.books enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.user_reading_progress enable row level security;

-- Eski "herkese açık" politikaları kaldır
drop policy if exists "Public access users" on public.users;
drop policy if exists "Public access books" on public.books;
drop policy if exists "Public access logs" on public.exercise_logs;
drop policy if exists "Public access progress" on public.user_reading_progress;

-- Anonim rolün tablolara doğrudan erişimini kapat (RLS'ye ek savunma katmanı)
revoke all on public.users, public.books, public.exercise_logs, public.user_reading_progress from anon;

-- users: yalnızca kendi profili
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;
drop policy if exists "users_delete_own" on public.users;
create policy "users_select_own" on public.users for select to authenticated
  using (id = (select auth.uid())::text);
create policy "users_insert_own" on public.users for insert to authenticated
  with check (id = (select auth.uid())::text);
create policy "users_update_own" on public.users for update to authenticated
  using (id = (select auth.uid())::text)
  with check (id = (select auth.uid())::text);
create policy "users_delete_own" on public.users for delete to authenticated
  using (id = (select auth.uid())::text);

-- books: sahibi her şeyi yapar; 'public' kitaplar tüm oturum açmış okurlara okunur.
-- 'friends' kitaplar yalnızca get_book_by_share_code() ile davet koduyla alınır.
drop policy if exists "books_select_own_or_public" on public.books;
drop policy if exists "books_insert_own" on public.books;
drop policy if exists "books_update_own" on public.books;
drop policy if exists "books_delete_own" on public.books;
create policy "books_select_own_or_public" on public.books for select to authenticated
  using (owner_id = (select auth.uid())::text or visibility = 'public');
create policy "books_insert_own" on public.books for insert to authenticated
  with check (owner_id = (select auth.uid())::text);
create policy "books_update_own" on public.books for update to authenticated
  using (owner_id = (select auth.uid())::text)
  with check (owner_id = (select auth.uid())::text);
create policy "books_delete_own" on public.books for delete to authenticated
  using (owner_id = (select auth.uid())::text);

-- exercise_logs: yalnızca kendi kayıtları
drop policy if exists "logs_select_own" on public.exercise_logs;
drop policy if exists "logs_insert_own" on public.exercise_logs;
drop policy if exists "logs_update_own" on public.exercise_logs;
drop policy if exists "logs_delete_own" on public.exercise_logs;
create policy "logs_select_own" on public.exercise_logs for select to authenticated
  using (user_id = (select auth.uid())::text);
create policy "logs_insert_own" on public.exercise_logs for insert to authenticated
  with check (user_id = (select auth.uid())::text);
create policy "logs_update_own" on public.exercise_logs for update to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);
create policy "logs_delete_own" on public.exercise_logs for delete to authenticated
  using (user_id = (select auth.uid())::text);

-- user_reading_progress: yalnızca kendi okuma konumları
drop policy if exists "progress_select_own" on public.user_reading_progress;
drop policy if exists "progress_insert_own" on public.user_reading_progress;
drop policy if exists "progress_update_own" on public.user_reading_progress;
drop policy if exists "progress_delete_own" on public.user_reading_progress;
create policy "progress_select_own" on public.user_reading_progress for select to authenticated
  using (user_id = (select auth.uid())::text);
create policy "progress_insert_own" on public.user_reading_progress for insert to authenticated
  with check (user_id = (select auth.uid())::text);
create policy "progress_update_own" on public.user_reading_progress for update to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);
create policy "progress_delete_own" on public.user_reading_progress for delete to authenticated
  using (user_id = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- 3. Davet koduyla kitap alma (friends / public)
-- ---------------------------------------------------------------------------

create or replace function public.get_book_by_share_code(code text)
returns setof public.books
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.books
  where share_code = upper(trim(code))
    and visibility in ('friends', 'public')
  order by created_at asc
  limit 1;
$$;

revoke all on function public.get_book_by_share_code(text) from public, anon;
grant execute on function public.get_book_by_share_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Kullanımdan kalkan tablo
-- comprehension_questions artık kullanılmıyor (sorular books.questions içinde).
-- Eski kurulumda varsa verisi silinmez; yalnızca tüm erişim kapatılır.
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.comprehension_questions') is not null then
    execute 'alter table public.comprehension_questions enable row level security';
    execute 'drop policy if exists "Public access questions" on public.comprehension_questions';
    execute 'revoke all on public.comprehension_questions from anon';
  end if;
end $$;
