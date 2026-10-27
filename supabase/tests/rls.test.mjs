import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Supabase şemasını (supabase/schema.sql) bellek içi Postgres (PGlite) üzerinde sınar.
// Çalıştırma: npm run test:rls

const schema = readFileSync(fileURLToPath(new URL("../schema.sql", import.meta.url)), "utf8");
const db = new PGlite();

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`);

// Eski (açık) kurulum: şemayı uygulamadan önce Faz 0 öncesi tabloları oluştur ve veri ekle
await db.exec(`
  create table public.users (id text primary key, email text not null, name text, current_wpm integer default 220,
    baseline_wpm integer default 215, comprehension_rate integer default 75, streak_days integer default 1, created_at timestamptz default now());
  create table public.books (id text primary key, title text not null, author text not null, category text not null,
    difficulty_level text not null, word_count integer not null, cover_gradient text, summary text default '', content jsonb not null,
    questions jsonb default '[]'::jsonb, is_custom boolean default true, created_at timestamptz default now());
  create table public.comprehension_questions (id text primary key, book_id text references public.books(id), question_text text, options jsonb, correct_option integer);
  alter table public.users enable row level security;
  create policy "Public access users" on public.users for all using (true) with check (true);
  insert into public.users (id,email,name,current_wpm) values ('11111111-1111-1111-1111-111111111111','a@x.com','Ayşe',300),
    ('22222222-2222-2222-2222-222222222222','b@x.com',null,2500);
  insert into public.books (id,title,author,category,difficulty_level,word_count,content) values ('legacy','L','A','C','Orta',1,'[]');
`);

let ok = 0, fail = 0;
const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const C = "33333333-3333-3333-3333-333333333333";

async function as(role, sub, sql) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${sub ?? ""}',false); set role ${role};`);
  try { return { rows: (await db.query(sql)).rows }; }
  catch (e) { return { error: e.message }; }
  finally { await db.exec("reset role"); }
}
function check(name, cond, detail = "") {
  if (cond) { ok++; console.log("  ok   ", name); } else { fail++; console.log("  FAIL ", name, detail); }
}

// Şemayı iki kez uygula (idempotency)
for (let i = 1; i <= 2; i++) {
  try { await db.exec(schema); console.log(`schema run ${i}: ok`); }
  catch (e) { console.log(`schema run ${i}: ERROR`, e.message); process.exit(1); }
}

console.log("\n-- profiles backfill");
let r = await db.query("select id, display_name, current_wpm from public.profiles order by id");
check("2 profil oluştu", r.rows.length === 2);
check("ad boşsa e-postadan türetildi", r.rows[1].display_name === "b");
check("aralık dışı WPM null'landı", r.rows[1].current_wpm === null);

console.log("\n-- anon erişimi");
for (const t of ["users","books","profiles","annotations","reviews","quote_posts","likes","comments","reviews_feed","annotations_feed"]) {
  const x = await as("anon", "", `select * from public.${t}`);
  check(`anon ${t} okuyamaz`, !!x.error && /permission denied/.test(x.error), x.error);
}

console.log("\n-- users.plan koruması");
let x = await as("authenticated", A, "select plan from public.users");
check("A kendi planını okur (varsayılan free)", x.rows?.[0]?.plan === "free", JSON.stringify(x));
x = await as("authenticated", A, "update public.users set plan = 'pro' where id = '" + A + "'");
check("A kendi planını Pro'ya yükseltemez", (await db.query("select plan from public.users where id='" + A + "'")).rows[0].plan === "free");
x = await as("authenticated", C, "insert into public.users (id,email,name,plan) values ('" + C + "','c@x.com','Can','pro')");
check("yeni kayıt Pro olarak eklenemez", !x.error && (await db.query("select plan from public.users where id='" + C + "'")).rows[0].plan === "free", x.error);
await db.query("update public.users set plan = 'pro' where id = '" + A + "'");
x = await as("authenticated", A, "select plan from public.users");
check("yönetici verince A Pro görür", x.rows?.[0]?.plan === "pro", JSON.stringify(x));
x = await as("authenticated", A, "update public.users set name = 'Ayşe Y', plan = 'free' where id = '" + A + "'");
check("A başka alanı güncellerken planı düşüremez/değiştiremez", (await db.query("select plan, name from public.users where id='" + A + "'")).rows[0].plan === "pro");
x = await as("authenticated", A, "update public.users set plan = 'gold' where id = '" + A + "'");
check("geçersiz plan reddedilir veya yok sayılır", (await db.query("select plan from public.users where id='" + A + "'")).rows[0].plan === "pro");
await db.query("update public.users set plan = 'free' where id = '" + A + "'");
await db.query("delete from public.users where id = '" + C + "'");

console.log("\n-- Faz 0: users/books");
x = await as("authenticated", A, "select id from public.users");
check("A yalnızca kendi users satırını görür", x.rows?.length === 1 && x.rows[0].id === A, JSON.stringify(x));
x = await as("authenticated", A, "select id from public.books");
check("A sahibi olmayan eski kitabı görmez", x.rows?.length === 0, JSON.stringify(x));
x = await as("authenticated", A, `insert into public.books (id,title,author,category,difficulty_level,word_count,content,owner_id,visibility,share_code)
  values ('bk-priv','P','A','C','Orta',1,'[]','${A}','private',null),('bk-fr','F','A','C','Orta',1,'[]','${A}','friends','OKUR-9')`);
check("A kendi kitabını ekler", !x.error, x.error);
x = await as("authenticated", B, `insert into public.books (id,title,author,category,difficulty_level,word_count,content,owner_id) values ('bk-x','X','A','C','Orta',1,'[]','${A}')`);
check("B, A adına kitap ekleyemez", !!x.error && /row-level security/.test(x.error), x.error);
x = await as("authenticated", B, "select id from public.books");
check("B özel/friends kitabı listeleyemez", x.rows?.length === 0, JSON.stringify(x));
x = await as("authenticated", B, "select id from public.get_book_by_share_code(' okur-9 ')");
check("B davet koduyla friends kitabını alır", x.rows?.length === 1 && x.rows[0].id === "bk-fr", JSON.stringify(x));
x = await as("authenticated", B, "select id from public.get_book_by_share_code('bk-priv')");
check("özel kitap koduyla alınamaz", x.rows?.length === 0);
x = await as("anon", "", "select * from public.get_book_by_share_code('OKUR-9')");
check("anon RPC çağıramaz", !!x.error, x.error);

console.log("\n-- Faz 2: yazma yetkileri");
x = await as("authenticated", A, `insert into public.reviews (id,user_id,book_id,book_title,rating,review_text,achieved_wpm)
  values ('aaaaaaaa-0000-0000-0000-000000000001','${A}','bk1','Kitap',5,'Harika',320)`);
check("A kendi incelemesini ekler", !x.error, x.error);
x = await as("authenticated", B, `insert into public.reviews (user_id,book_id,book_title,rating,review_text) values ('${A}','bk2','K',4,'sahte')`);
check("B, A adına inceleme yazamaz", !!x.error && /row-level security/.test(x.error), x.error);
x = await as("authenticated", A, `insert into public.reviews (user_id,book_id,book_title,rating,review_text) values ('${A}','bk1','K',4,'ikinci')`);
check("aynı kitaba ikinci inceleme engellenir", !!x.error && /unique/.test(x.error), x.error);
x = await as("authenticated", A, `insert into public.reviews (user_id,book_id,book_title,rating,review_text) values ('${A}','bk3','K',6,'x')`);
check("rating 6 reddedilir", !!x.error && /check/.test(x.error), x.error);
x = await as("authenticated", C, `insert into public.reviews (user_id,book_id,book_title,rating,review_text) values ('${C}','bk3','K',3,'profilsiz')`);
check("profili olmayan kullanıcı içerik yazamaz (FK)", !!x.error, x.error);
x = await as("authenticated", C, `insert into public.profiles (id,display_name) values ('${C}','Can')`);
check("C kendi profilini ekler", !x.error, x.error);
x = await as("authenticated", C, `insert into public.profiles (id,display_name) values ('${B}','Sahte')`);
check("başkası adına profil eklenemez", !!x.error, x.error);
x = await as("authenticated", B, `update public.reviews set review_text='ele geçirildi' where id='aaaaaaaa-0000-0000-0000-000000000001'`);
check("B, A'nın incelemesini güncelleyemez (0 satır)", !x.error && x.rows.length === 0 &&
  (await db.query("select review_text from public.reviews where id='aaaaaaaa-0000-0000-0000-000000000001'")).rows[0].review_text === "Harika");
x = await as("authenticated", B, `delete from public.reviews where id='aaaaaaaa-0000-0000-0000-000000000001'`);
check("B, A'nın incelemesini silemez", (await db.query("select count(*)::int n from public.reviews")).rows[0].n === 1);

console.log("\n-- annotations görünürlüğü");
x = await as("authenticated", A, `insert into public.annotations (id,user_id,book_id,word_index,type,selected_text,content,is_public) values
  ('bbbbbbbb-0000-0000-0000-000000000001','${A}','bk1',10,'note','alıntı','özel not',false),
  ('bbbbbbbb-0000-0000-0000-000000000002','${A}','bk1',20,'highlight','altı çizili','',true),
  ('bbbbbbbb-0000-0000-0000-000000000003','${A}','bk1',30,'note','x','açık not',true)`);
check("A not ve altı çizili ekler", !x.error, x.error);
x = await as("authenticated", A, `insert into public.annotations (user_id,book_id,word_index,type,content) values ('${A}','bk1',5,'note','   ')`);
check("boş not reddedilir", !!x.error && /annotations_note_has_content/.test(x.error), x.error);
x = await as("authenticated", B, "select id from public.annotations order by id");
check("B yalnızca açık notları görür", x.rows?.length === 2 && !x.rows.some(r => r.id.endsWith("001")), JSON.stringify(x));
x = await as("authenticated", B, "select id, author_name from public.annotations_feed order by id");
check("feed özel notu sızdırmaz, yazar adı gelir", x.rows?.length === 2 && x.rows[0].author_name === "Ayşe", JSON.stringify(x));

console.log("\n-- likes");
x = await as("authenticated", B, `insert into public.likes (user_id,target_type,target_id) values ('${B}','annotation','bbbbbbbb-0000-0000-0000-000000000003')`);
check("B açık notu beğenir", !x.error, x.error);
x = await as("authenticated", B, `insert into public.likes (user_id,target_type,target_id) values ('${B}','annotation','bbbbbbbb-0000-0000-0000-000000000001')`);
check("B özel notu beğenemez", !!x.error && /row-level security/.test(x.error), x.error);
x = await as("authenticated", B, `insert into public.likes (user_id,target_type,target_id) values ('${A}','review','aaaaaaaa-0000-0000-0000-000000000001')`);
check("B, A adına beğeni ekleyemez", !!x.error && /row-level security/.test(x.error), x.error);
x = await as("authenticated", B, `insert into public.likes (user_id,target_type,target_id) values ('${B}','review','aaaaaaaa-0000-0000-0000-000000000001')`);
check("B incelemeyi beğenir", !x.error, x.error);
x = await as("authenticated", B, `insert into public.likes (user_id,target_type,target_id) values ('${B}','review','aaaaaaaa-0000-0000-0000-000000000001')`);
check("çift beğeni engellenir", !!x.error && /duplicate|unique/.test(x.error), x.error);
x = await as("authenticated", B, `insert into public.likes (user_id,target_type,target_id) values ('${B}','review','00000000-0000-0000-0000-00000000dead')`);
check("var olmayan hedef beğenilemez", !!x.error, x.error);
x = await as("authenticated", B, `insert into public.likes (user_id,target_type,target_id) values ('${B}','bogus','aaaaaaaa-0000-0000-0000-000000000001')`);
check("geçersiz target_type reddedilir", !!x.error, x.error);
x = await as("authenticated", A, "select likes_count::int lc, liked_by_me from public.reviews_feed");
check("A için inceleme: 1 beğeni, liked_by_me=false", x.rows?.[0]?.lc === 1 && x.rows[0].liked_by_me === false, JSON.stringify(x));
x = await as("authenticated", B, "select likes_count::int lc, liked_by_me from public.reviews_feed");
check("B için liked_by_me=true", x.rows?.[0]?.liked_by_me === true, JSON.stringify(x));
x = await as("authenticated", A, "select count(*)::int n from public.likes where target_type='annotation'");
check("A kendi açık notunun beğenisini görür", x.rows?.[0]?.n === 1, JSON.stringify(x));
x = await as("authenticated", A, `delete from public.likes where user_id='${B}'`);
check("A, B'nin beğenisini silemez", (await db.query("select count(*)::int n from public.likes where user_id='"+B+"'")).rows[0].n === 2);

console.log("\n-- comments");
x = await as("authenticated", B, `insert into public.comments (id,user_id,target_type,target_id,content) values
  ('cccccccc-0000-0000-0000-000000000001','${B}','review','aaaaaaaa-0000-0000-0000-000000000001','Katılıyorum')`);
check("B yorum ekler", !x.error, x.error);
x = await as("authenticated", B, `insert into public.comments (user_id,target_type,target_id,content) values ('${B}','annotation','bbbbbbbb-0000-0000-0000-000000000001','gizli nota yorum')`);
check("B özel nota yorum yazamaz", !!x.error && /row-level security/.test(x.error), x.error);
x = await as("authenticated", C, `update public.comments set target_id='bbbbbbbb-0000-0000-0000-000000000003' where id='cccccccc-0000-0000-0000-000000000001'`);
check("C başkasının yorumunu güncelleyemez", (await db.query("select content from public.comments")).rows[0].content === "Katılıyorum");
x = await as("authenticated", B, `update public.comments set target_type='annotation', target_id='bbbbbbbb-0000-0000-0000-000000000003' where id='cccccccc-0000-0000-0000-000000000001'`);
check("yorumun hedefi taşınamaz", !!x.error && /hedefi değiştirilemez/.test(x.error), x.error);
x = await as("authenticated", B, `update public.comments set content='Düzenlendi' where id='cccccccc-0000-0000-0000-000000000001'`);
check("B kendi yorumunu düzenler", !x.error && (await db.query("select content, updated_at >= created_at ok from public.comments")).rows[0].content === "Düzenlendi");
x = await as("authenticated", C, "select author_name, content from public.comments_feed");
check("C (üçüncü kişi) yorumu feed'de görür", x.rows?.length === 1 && x.rows[0].author_name === "b", JSON.stringify(x));
x = await as("authenticated", C, `delete from public.comments`);
check("C yorum silemez", (await db.query("select count(*)::int n from public.comments")).rows[0].n === 1);
x = await as("authenticated", A, "select comments_count::int cc from public.reviews_feed");
check("inceleme comments_count=1", x.rows?.[0]?.cc === 1, JSON.stringify(x));
x = await as("authenticated", A, `delete from public.comments where id='cccccccc-0000-0000-0000-000000000001'`);
check("hedef sahibi A, B'nin yorumunu siler", (await db.query("select count(*)::int n from public.comments")).rows[0].n === 0);

console.log("\n-- quote_posts ve highlight_count");
x = await as("authenticated", A, `insert into public.quote_posts (id,user_id,book_id,book_title,quote_text,word_index,user_wpm) values
  ('dddddddd-0000-0000-0000-000000000001','${A}','bk1','Kitap','Alıntı',20,320)`);
check("A alıntı kartı ekler", !x.error, x.error);
x = await as("authenticated", B, "select highlight_count::int hc, user_name from public.quote_posts_feed");
check("highlight_count=1 (açık altı çizili aynı konumda)", x.rows?.[0]?.hc === 1 && x.rows[0].user_name === "Ayşe", JSON.stringify(x));
x = await as("authenticated", B, `insert into public.comments (user_id,target_type,target_id,content) values ('${B}','quote_post','dddddddd-0000-0000-0000-000000000001','güzel')`);
check("B alıntıya yorum yazar", !x.error, x.error);

console.log("\n-- bağlı verinin temizlenmesi");
await as("authenticated", A, `delete from public.quote_posts where id='dddddddd-0000-0000-0000-000000000001'`);
check("alıntı silinince yorumları da silinir", (await db.query("select count(*)::int n from public.comments")).rows[0].n === 0);
await as("authenticated", A, `delete from public.reviews where id='aaaaaaaa-0000-0000-0000-000000000001'`);
check("inceleme silinince beğenisi silinir", (await db.query("select count(*)::int n from public.likes where target_type='review'")).rows[0].n === 0);
await as("authenticated", A, `update public.annotations set is_public=false where id='bbbbbbbb-0000-0000-0000-000000000003'`);
x = await as("authenticated", B, "select id from public.annotations");
check("not özele çevrilince B artık görmez", x.rows?.length === 1, JSON.stringify(x));
x = await as("authenticated", B, "select count(*)::int n from public.likes where target_type='annotation'");
check("özele dönen notun beğenisi B'ye de görünmez", x.rows?.[0]?.n === 0, JSON.stringify(x));
await as("authenticated", A, `delete from public.profiles where id='${A}'`);
check("profil silinince içerik zincirleme silinir", (await db.query("select (select count(*) from public.annotations)::int a, (select count(*) from public.quote_posts)::int q")).rows[0].a === 0);

console.log(`\n${ok} başarılı, ${fail} başarısız`);
process.exit(fail ? 1 : 0);
