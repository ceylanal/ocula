-- ============================================================================
-- OkurLab — Supabase PostgreSQL şeması (tek kaynak)
--
-- Supabase SQL Editor'de çalıştırın. Dosya yeniden çalıştırılabilir (idempotent);
-- mevcut bir kurulumu da güvenli şekilde yükseltir.
--
-- Erişim modeli: Her satır Supabase Auth kullanıcısına aittir (auth.uid()).
-- Bölüm 1-4: kişisel veriler (özel). Bölüm 5: topluluk katmanı (kontrollü paylaşım).
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

-- ============================================================================
-- 5. Sosyal katman (Okur Salonu & Marginalia)
--
-- Tablolar : profiles, annotations, reviews, quote_posts, likes, comments
-- Görünümler: annotations_feed, reviews_feed, quote_posts_feed, comments_feed
--
-- Tasarım ilkeleri
--  * users tablosu özeldir (e-posta içerir). Topluluğa açık veri yalnızca
--    profiles içindedir: görünen ad ve kendi bildirdiği WPM.
--  * Yazarlık sunucuda doğrulanır: user_id = auth.uid() RLS ile zorunludur.
--  * Beğeni ve yorum sayaçları saklanmaz; *_feed görünümlerinden türetilir.
--    Görünümler security_invoker olduğundan RLS çağıranın yetkisiyle işler.
--  * annotations varsayılan olarak özeldir (is_public = false). Reviews ve
--    quote_posts doğaları gereği oturum açmış tüm okurlara açıktır.
--  * likes / comments çok biçimli (target_type, target_id) bağlanır; hedefin
--    görünürlüğü can_view_target() ile denetlenir, hedef silinince bağlı
--    beğeni ve yorumlar tetikleyiciyle temizlenir.
--  * Anonim rolün hiçbir tabloya/görünüme erişimi yoktur.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5.1 Tablolar
-- ---------------------------------------------------------------------------

-- Topluluğa açık profil (users tablosunun yayınlanabilir alt kümesi)
create table if not exists public.profiles (
  id text primary key,
  display_name text not null check (char_length(display_name) between 1 and 60),
  current_wpm integer check (current_wpm is null or current_wpm between 0 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mevcut kullanıcılar için profil oluştur (yeniden çalıştırmada zararsız)
insert into public.profiles (id, display_name, current_wpm)
select u.id,
       left(coalesce(nullif(trim(u.name), ''), nullif(split_part(u.email, '@', 1), ''), 'Okur'), 60),
       case when u.current_wpm between 0 and 1500 then u.current_wpm end
from public.users u
on conflict (id) do nothing;

-- Kenar notları ve altı çizili yerler (BookNote)
create table if not exists public.annotations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  book_id text not null,
  word_index integer not null check (word_index >= 0),
  type text not null default 'note' check (type in ('highlight', 'note')),
  selected_text text check (selected_text is null or char_length(selected_text) <= 2000),
  content text not null default '' check (char_length(content) <= 4000),
  is_public boolean not null default false,
  author_wpm integer check (author_wpm is null or author_wpm between 0 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- not yazılan bir kaydın içeriği boş olamaz; altı çizili yer boş içerikle olabilir
  constraint annotations_note_has_content check (type = 'highlight' or char_length(trim(content)) > 0)
);

-- Kitap incelemeleri (CommunityReview); okur başına kitap başına bir inceleme
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  book_id text not null,
  book_title text not null check (char_length(book_title) between 1 and 300),
  book_author text not null default '' check (char_length(book_author) <= 300),
  rating smallint not null check (rating between 1 and 5),
  review_text text not null check (char_length(trim(review_text)) between 1 and 4000),
  achieved_wpm integer check (achieved_wpm is null or achieved_wpm between 0 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);

-- Alıntı kartları (CommunityQuotePost)
create table if not exists public.quote_posts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  book_id text not null,
  book_title text not null check (char_length(book_title) between 1 and 300),
  book_author text not null default '' check (char_length(book_author) <= 300),
  quote_text text not null check (char_length(trim(quote_text)) between 1 and 2000),
  word_index integer not null default 0 check (word_index >= 0),
  note_comment text check (note_comment is null or char_length(note_comment) <= 1000),
  user_wpm integer check (user_wpm is null or user_wpm between 0 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Beğeniler: okur başına hedef başına en fazla bir beğeni
create table if not exists public.likes (
  user_id text not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('annotation', 'review', 'quote_post')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

-- Yorumlar
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('annotation', 'review', 'quote_post')),
  target_id uuid not null,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists annotations_book_public_idx
  on public.annotations (book_id, created_at desc) where is_public;
create index if not exists annotations_user_idx on public.annotations (user_id, created_at desc);
create index if not exists reviews_created_idx on public.reviews (created_at desc);
create index if not exists reviews_book_idx on public.reviews (book_id);
create index if not exists quote_posts_created_idx on public.quote_posts (created_at desc);
create index if not exists quote_posts_book_idx on public.quote_posts (book_id, word_index);
create index if not exists likes_target_idx on public.likes (target_type, target_id);
create index if not exists comments_target_idx on public.comments (target_type, target_id, created_at);
create index if not exists comments_user_idx on public.comments (user_id);

-- ---------------------------------------------------------------------------
-- 5.2 Yardımcı fonksiyonlar ve tetikleyiciler
-- ---------------------------------------------------------------------------

-- Çağıranın hedefi görüp göremediği. RLS'yi aşar (security definer) fakat
-- yalnızca boolean döndürür; böylece likes/comments politikaları hedef
-- tablolarının politikalarını yinelemeden aynı kuralı uygular.
create or replace function public.can_view_target(t text, tid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case t
    when 'annotation' then exists (
      select 1 from public.annotations a
      where a.id = tid and (a.is_public or a.user_id = (select auth.uid())::text)
    )
    when 'review' then exists (select 1 from public.reviews r where r.id = tid)
    when 'quote_post' then exists (select 1 from public.quote_posts q where q.id = tid)
    else false
  end;
$$;

-- Hedefin sahibi (yorum denetimi için)
create or replace function public.target_owner(t text, tid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case t
    when 'annotation' then (select a.user_id from public.annotations a where a.id = tid)
    when 'review' then (select r.user_id from public.reviews r where r.id = tid)
    when 'quote_post' then (select q.user_id from public.quote_posts q where q.id = tid)
  end;
$$;

revoke all on function public.can_view_target(text, uuid) from public, anon;
revoke all on function public.target_owner(text, uuid) from public, anon;
grant execute on function public.can_view_target(text, uuid) to authenticated;
grant execute on function public.target_owner(text, uuid) to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Hedef silinince bağlı beğeni ve yorumları temizle
create or replace function public.cleanup_target_engagement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.likes where target_type = tg_argv[0] and target_id = old.id;
  delete from public.comments where target_type = tg_argv[0] and target_id = old.id;
  return old;
end;
$$;

-- Yorumun hangi gönderiye ait olduğu sonradan değiştirilemez
create or replace function public.comments_freeze_target()
returns trigger
language plpgsql
as $$
begin
  if new.target_type is distinct from old.target_type
     or new.target_id is distinct from old.target_id then
    raise exception 'Yorumun hedefi değiştirilemez';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists annotations_touch on public.annotations;
create trigger annotations_touch before update on public.annotations
  for each row execute function public.touch_updated_at();
drop trigger if exists reviews_touch on public.reviews;
create trigger reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();
drop trigger if exists quote_posts_touch on public.quote_posts;
create trigger quote_posts_touch before update on public.quote_posts
  for each row execute function public.touch_updated_at();
drop trigger if exists comments_touch on public.comments;
create trigger comments_touch before update on public.comments
  for each row execute function public.touch_updated_at();
drop trigger if exists comments_freeze_target_trg on public.comments;
create trigger comments_freeze_target_trg before update on public.comments
  for each row execute function public.comments_freeze_target();

drop trigger if exists annotations_cleanup on public.annotations;
create trigger annotations_cleanup after delete on public.annotations
  for each row execute function public.cleanup_target_engagement('annotation');
drop trigger if exists reviews_cleanup on public.reviews;
create trigger reviews_cleanup after delete on public.reviews
  for each row execute function public.cleanup_target_engagement('review');
drop trigger if exists quote_posts_cleanup on public.quote_posts;
create trigger quote_posts_cleanup after delete on public.quote_posts
  for each row execute function public.cleanup_target_engagement('quote_post');

-- ---------------------------------------------------------------------------
-- 5.3 Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.annotations enable row level security;
alter table public.reviews enable row level security;
alter table public.quote_posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

revoke all on public.profiles, public.annotations, public.reviews,
  public.quote_posts, public.likes, public.comments from anon;

-- profiles: herkes okur; yalnızca sahibi yazar
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles for select to authenticated
  using (true);
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = (select auth.uid())::text);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())::text)
  with check (id = (select auth.uid())::text);
create policy "profiles_delete_own" on public.profiles for delete to authenticated
  using (id = (select auth.uid())::text);

-- annotations: sahibi her şeyi görür; başkaları yalnızca is_public olanları
drop policy if exists "annotations_select_own_or_public" on public.annotations;
drop policy if exists "annotations_insert_own" on public.annotations;
drop policy if exists "annotations_update_own" on public.annotations;
drop policy if exists "annotations_delete_own" on public.annotations;
create policy "annotations_select_own_or_public" on public.annotations for select to authenticated
  using (is_public or user_id = (select auth.uid())::text);
create policy "annotations_insert_own" on public.annotations for insert to authenticated
  with check (user_id = (select auth.uid())::text);
create policy "annotations_update_own" on public.annotations for update to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);
create policy "annotations_delete_own" on public.annotations for delete to authenticated
  using (user_id = (select auth.uid())::text);

-- reviews: oturum açmış herkes okur; yalnızca sahibi yazar
drop policy if exists "reviews_select_authenticated" on public.reviews;
drop policy if exists "reviews_insert_own" on public.reviews;
drop policy if exists "reviews_update_own" on public.reviews;
drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_select_authenticated" on public.reviews for select to authenticated
  using (true);
create policy "reviews_insert_own" on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid())::text);
create policy "reviews_update_own" on public.reviews for update to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);
create policy "reviews_delete_own" on public.reviews for delete to authenticated
  using (user_id = (select auth.uid())::text);

-- quote_posts: reviews ile aynı model
drop policy if exists "quote_posts_select_authenticated" on public.quote_posts;
drop policy if exists "quote_posts_insert_own" on public.quote_posts;
drop policy if exists "quote_posts_update_own" on public.quote_posts;
drop policy if exists "quote_posts_delete_own" on public.quote_posts;
create policy "quote_posts_select_authenticated" on public.quote_posts for select to authenticated
  using (true);
create policy "quote_posts_insert_own" on public.quote_posts for insert to authenticated
  with check (user_id = (select auth.uid())::text);
create policy "quote_posts_update_own" on public.quote_posts for update to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);
create policy "quote_posts_delete_own" on public.quote_posts for delete to authenticated
  using (user_id = (select auth.uid())::text);

-- likes: yalnızca görebildiğin hedefin beğenilerini görür/ekler; yalnızca kendininkini siler.
-- Güncelleme politikası yoktur (beğeni değiştirilemez, yalnızca eklenir/silinir).
drop policy if exists "likes_select_visible_target" on public.likes;
drop policy if exists "likes_insert_own" on public.likes;
drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_select_visible_target" on public.likes for select to authenticated
  using (public.can_view_target(target_type, target_id));
create policy "likes_insert_own" on public.likes for insert to authenticated
  with check (
    user_id = (select auth.uid())::text
    and public.can_view_target(target_type, target_id)
  );
create policy "likes_delete_own" on public.likes for delete to authenticated
  using (user_id = (select auth.uid())::text);

-- comments: görünür hedefte okunur/eklenir; yorum sahibi düzenler ve siler;
-- hedefin sahibi de kendi gönderisi altındaki yorumları silebilir.
drop policy if exists "comments_select_visible_target" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_update_own" on public.comments;
drop policy if exists "comments_delete_own_or_target_owner" on public.comments;
create policy "comments_select_visible_target" on public.comments for select to authenticated
  using (public.can_view_target(target_type, target_id));
create policy "comments_insert_own" on public.comments for insert to authenticated
  with check (
    user_id = (select auth.uid())::text
    and public.can_view_target(target_type, target_id)
  );
create policy "comments_update_own" on public.comments for update to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);
create policy "comments_delete_own_or_target_owner" on public.comments for delete to authenticated
  using (
    user_id = (select auth.uid())::text
    or public.target_owner(target_type, target_id) = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- 5.4 Akış görünümleri (yazar adı, beğeni/yorum sayısı, liked_by_me)
-- security_invoker: görünümler çağıranın RLS yetkisiyle çalışır.
-- ---------------------------------------------------------------------------

create or replace view public.annotations_feed with (security_invoker = true) as
select
  a.id, a.user_id, a.book_id, a.word_index, a.type, a.selected_text, a.content,
  a.is_public, a.author_wpm, a.created_at, a.updated_at,
  p.display_name as author_name,
  (select count(*) from public.likes l
    where l.target_type = 'annotation' and l.target_id = a.id) as likes_count,
  (select count(*) from public.comments c
    where c.target_type = 'annotation' and c.target_id = a.id) as comments_count,
  exists (select 1 from public.likes l
    where l.target_type = 'annotation' and l.target_id = a.id
      and l.user_id = (select auth.uid())::text) as liked_by_me
from public.annotations a
join public.profiles p on p.id = a.user_id;

create or replace view public.reviews_feed with (security_invoker = true) as
select
  r.id, r.user_id, r.book_id, r.book_title, r.book_author, r.rating, r.review_text,
  r.achieved_wpm, r.created_at, r.updated_at,
  p.display_name as user_name,
  (select count(*) from public.likes l
    where l.target_type = 'review' and l.target_id = r.id) as likes_count,
  (select count(*) from public.comments c
    where c.target_type = 'review' and c.target_id = r.id) as comments_count,
  exists (select 1 from public.likes l
    where l.target_type = 'review' and l.target_id = r.id
      and l.user_id = (select auth.uid())::text) as liked_by_me
from public.reviews r
join public.profiles p on p.id = r.user_id;

-- highlight_count: aynı kitapta, aynı kelime konumunda, kamuya açık altı çizili yer sayısı
create or replace view public.quote_posts_feed with (security_invoker = true) as
select
  q.id, q.user_id, q.book_id, q.book_title, q.book_author, q.quote_text, q.word_index,
  q.note_comment, q.user_wpm, q.created_at, q.updated_at,
  p.display_name as user_name,
  (select count(*) from public.annotations a
    where a.book_id = q.book_id and a.word_index = q.word_index
      and a.type = 'highlight' and a.is_public) as highlight_count,
  (select count(*) from public.likes l
    where l.target_type = 'quote_post' and l.target_id = q.id) as likes_count,
  (select count(*) from public.comments c
    where c.target_type = 'quote_post' and c.target_id = q.id) as comments_count,
  exists (select 1 from public.likes l
    where l.target_type = 'quote_post' and l.target_id = q.id
      and l.user_id = (select auth.uid())::text) as liked_by_me
from public.quote_posts q
join public.profiles p on p.id = q.user_id;

create or replace view public.comments_feed with (security_invoker = true) as
select
  c.id, c.user_id, c.target_type, c.target_id, c.content, c.created_at, c.updated_at,
  p.display_name as author_name
from public.comments c
join public.profiles p on p.id = c.user_id;

revoke all on public.annotations_feed, public.reviews_feed,
  public.quote_posts_feed, public.comments_feed from anon;
grant select on public.annotations_feed, public.reviews_feed,
  public.quote_posts_feed, public.comments_feed to authenticated;
