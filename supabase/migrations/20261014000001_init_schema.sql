-- I-17 テーブル・制約・インデックス・トリガー・RLS・Storage・初期データ
-- 要件定義書 9.1〜9.5、9.7。SQL Editor に貼り付けて実行しても、2回実行してもエラーにならないように書く

-- ============================================================
-- テーブル（9.2）
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  created_at timestamptz not null default now()
);

create table if not exists public.spots (
  id int primary key, -- 自動採番しない。スプレッドシートの id をそのまま使う（BR-17）
  name text not null unique,
  description text not null,
  lat double precision not null,
  lng double precision not null,
  google_place_id text,
  spot_type text not null check (spot_type in ('major', 'minor', 'hub')),
  area text not null check (area in (
    '金沢駅周辺', '近江町市場周辺', '香林坊・長町武家屋敷跡周辺', '兼六園周辺', 'ひがし茶屋街周辺',
    '寺町・にし茶屋街周辺', '金石・大野周辺', '湯涌温泉周辺', '森本周辺', 'その他'
  )),
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.tags (
  id int primary key,
  slug text not null unique check (slug ~ '^[a-z]+$'),
  name text not null unique,
  tag_group text not null check (tag_group in ('theme', 'weather')),
  sort_order int not null default 0
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 50),
  status text not null default 'draft' check (status in ('draft', 'published')),
  source_plan_id uuid references public.plans (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  -- BR-09：公開中なら公開日時あり、下書きなら空
  constraint plans_published_at_check check ((status = 'published') = (published_at is not null))
);

create table if not exists public.plan_blocks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  position int not null check (position between 0 and 29),
  block_type text not null check (block_type in ('spot', 'comment')),
  spot_id int references public.spots (id),
  transport_mode text check (transport_mode in ('walk', 'bus', 'bicycle', 'car')),
  body text check (char_length(body) between 1 and 500),
  image_path text,
  unique (plan_id, position),
  -- 種類ごとの組み合わせ（9.2）
  constraint plan_blocks_kind_check check (
    (block_type = 'spot' and spot_id is not null and body is null)
    or (block_type = 'comment' and body is not null and spot_id is null
        and transport_mode is null and image_path is null)
  )
);

create table if not exists public.plan_tags (
  plan_id uuid not null references public.plans (id) on delete cascade,
  tag_id int not null references public.tags (id),
  primary key (plan_id, tag_id)
);

create table if not exists public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, plan_id)
);

create index if not exists plans_status_published_at_idx on public.plans (status, published_at);
create index if not exists plans_user_id_idx on public.plans (user_id);
create index if not exists plan_tags_tag_id_idx on public.plan_tags (tag_id);
create index if not exists likes_plan_id_idx on public.likes (plan_id);
create index if not exists plan_blocks_plan_id_idx on public.plan_blocks (plan_id);
create index if not exists plans_source_plan_id_idx on public.plans (source_plan_id);

-- ============================================================
-- トリガー
-- ============================================================

-- plans の updated_at を更新する
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- 新規登録時に profiles を作る。表示名は signUp の options.data.display_name（9.2）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), '利用者'), 20)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- アクセス制御（9.4）。すべてログインユーザー（authenticated）だけ。anon には何も許可しない
-- ============================================================

alter table public.profiles enable row level security;
alter table public.spots enable row level security;
alter table public.tags enable row level security;
alter table public.plans enable row level security;
alter table public.plan_blocks enable row level security;
alter table public.plan_tags enable row level security;
alter table public.likes enable row level security;

-- profiles：読むのはログインユーザー、変えるのは本人。作るのはトリガーだけ
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- spots、tags：読むだけ
drop policy if exists spots_select on public.spots;
create policy spots_select on public.spots for select to authenticated using (true);
drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags for select to authenticated using (true);

-- plans：公開中はログインユーザー、それ以外は本人だけ読める。作る・変える・消すのは本人
drop policy if exists plans_select on public.plans;
create policy plans_select on public.plans
  for select to authenticated
  using (status = 'published' or user_id = (select auth.uid()));
drop policy if exists plans_insert_own on public.plans;
create policy plans_insert_own on public.plans
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists plans_update_own on public.plans;
create policy plans_update_own on public.plans
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists plans_delete_own on public.plans;
create policy plans_delete_own on public.plans
  for delete to authenticated using (user_id = (select auth.uid()));

-- plan_blocks、plan_tags：親のプランが読めるなら読める。変えるのは親のプランの本人
drop policy if exists plan_blocks_select on public.plan_blocks;
create policy plan_blocks_select on public.plan_blocks
  for select to authenticated
  using (exists (select 1 from public.plans p where p.id = plan_id));
drop policy if exists plan_blocks_write_own on public.plan_blocks;
create policy plan_blocks_write_own on public.plan_blocks
  for all to authenticated
  using (exists (select 1 from public.plans p where p.id = plan_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.plans p where p.id = plan_id and p.user_id = (select auth.uid())));

drop policy if exists plan_tags_select on public.plan_tags;
create policy plan_tags_select on public.plan_tags
  for select to authenticated
  using (exists (select 1 from public.plans p where p.id = plan_id));
drop policy if exists plan_tags_write_own on public.plan_tags;
create policy plan_tags_write_own on public.plan_tags
  for all to authenticated
  using (exists (select 1 from public.plans p where p.id = plan_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.plans p where p.id = plan_id and p.user_id = (select auth.uid())));

-- likes：読むのはログインユーザー。作るのは本人で、他人の公開中のプランだけ（BR-08）。消すのは本人
drop policy if exists likes_select on public.likes;
create policy likes_select on public.likes for select to authenticated using (true);
drop policy if exists likes_insert_own on public.likes;
create policy likes_insert_own on public.likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.plans p
      where p.id = plan_id and p.status = 'published' and p.user_id <> (select auth.uid())
    )
  );
drop policy if exists likes_delete_own on public.likes;
create policy likes_delete_own on public.likes
  for delete to authenticated using (user_id = (select auth.uid()));

-- ============================================================
-- Storage（9.4）：バケット plan-images。読むのは公開、書く・消すのは本人のフォルダだけ
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plan-images', 'plan-images', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists plan_images_select_own on storage.objects;
create policy plan_images_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'plan-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists plan_images_insert_own on storage.objects;
create policy plan_images_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'plan-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists plan_images_update_own on storage.objects;
create policy plan_images_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'plan-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists plan_images_delete_own on storage.objects;
create policy plan_images_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'plan-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ============================================================
-- 初期データ：タグ（9.2）と 9.7 の13件のスポット
-- ============================================================

insert into public.tags (id, slug, name, tag_group, sort_order) values
  (1, 'food', '食事', 'theme', 1),
  (2, 'scenery', '景観', 'theme', 2),
  (3, 'history', '歴史', 'theme', 3),
  (4, 'photo', '写真', 'theme', 4),
  (5, 'relaxed', 'ゆったり', 'theme', 5),
  (6, 'quick', '時短', 'theme', 6),
  (7, 'budget', 'コスパ', 'theme', 7),
  (8, 'cozy', 'くつろぎ', 'theme', 8),
  (9, 'sunny', '晴れ', 'weather', 9),
  (10, 'rainy', '雨', 'weather', 10),
  (11, 'cloudy', '曇り', 'weather', 11)
on conflict (id) do update
  set slug = excluded.slug, name = excluded.name,
      tag_group = excluded.tag_group, sort_order = excluded.sort_order;

insert into public.spots
  (id, name, description, lat, lng, google_place_id, spot_type, area, is_active, sort_order)
values
  (1, '金沢駅', '鼓門ともてなしドームが迎える金沢の玄関口。多くの路線バスがここから出る', 36.578342, 136.647983, null, 'hub', '金沢駅周辺', true, 0),
  (2, '近江町市場', '鮮魚や青果の店が並ぶ「金沢の台所」。海鮮丼や食べ歩きが楽しめる', 36.571665, 136.656146, null, 'major', '近江町市場周辺', true, 0),
  (3, '長町武家屋敷跡界隈', '土塀と石畳の路地が続く、加賀藩士の屋敷が並んでいた一帯', 36.563617, 136.650760, null, 'major', '香林坊・長町武家屋敷跡周辺', true, 0),
  (4, '金沢21世紀美術館', 'ガラス張りの円形の建物が目印の現代美術館。無料で入れる場所もある', 36.560896, 136.658152, null, 'major', '兼六園周辺', true, 0),
  (5, '兼六園', '日本三名園の一つに数えられる加賀藩の大名庭園。冬の雪吊りが有名', 36.562128, 136.662652, null, 'major', '兼六園周辺', true, 0),
  (6, '金沢城公園・玉泉院丸庭園', '加賀藩前田家の居城跡。復元された櫓や門と、夜のライトアップが見どころ', 36.565771, 136.659622, null, 'major', '兼六園周辺', true, 0),
  (7, 'ひがし茶屋街', '格子戸の茶屋建築が並ぶ、金沢を代表する茶屋街', 36.572630, 136.666446, null, 'major', 'ひがし茶屋街周辺', true, 0),
  (8, 'にし茶屋街', '犀川の近くにある小さな茶屋街。ひがし茶屋街より落ち着いた雰囲気', 36.556757, 136.647402, null, 'minor', '寺町・にし茶屋街周辺', true, 0),
  (9, '妙立寺（忍者寺）', '隠し階段や落とし穴など仕掛けの多い寺。「忍者寺」と呼ばれる。見学は予約制', 36.555384, 136.648997, null, 'minor', '寺町・にし茶屋街周辺', true, 0),
  (10, '尾山神社', '前田利家とまつを祀る神社。ステンドグラスのある神門が珍しい', 36.566081, 136.655416, null, 'minor', '香林坊・長町武家屋敷跡周辺', true, 0),
  (11, '鈴木大拙館', '仏教哲学者・鈴木大拙を伝える館。水鏡の庭で静かに過ごせる', 36.557822, 136.661199, null, 'minor', '兼六園周辺', true, 0),
  (12, '国立工芸館', '東京から移転した工芸とデザインの国立美術館。明治期の建物を活用している', 36.559034, 136.661715, null, 'minor', '兼六園周辺', true, 0),
  (13, '石川県立図書館', '円形の大閲覧室が特徴の図書館。本に囲まれた空間を見に訪れる人も多い', 36.548953, 136.679911, null, 'minor', 'その他', true, 0)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, lat = excluded.lat,
      lng = excluded.lng, google_place_id = excluded.google_place_id,
      spot_type = excluded.spot_type, area = excluded.area,
      is_active = excluded.is_active, sort_order = excluded.sort_order;
