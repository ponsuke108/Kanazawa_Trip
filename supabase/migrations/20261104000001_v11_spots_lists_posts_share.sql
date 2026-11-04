-- I-26（v11）スポットの拡張・リスト・スポットの投稿・プランの共有
-- 要件定義書 9.1〜9.5、9.7、9.8、10.9、BR-17〜BR-21、BR-30。2回実行してもエラーにならないように書く
-- お店・キャンペーン・管理者（role、shops、campaigns など）は I-36 で足す。
-- そのため spot_posts.campaign_id と、spot_summaries.active_campaign_id の中身は I-36 で足す

-- ============================================================
-- spots の拡張（9.2、BR-17）
-- ============================================================

alter table public.spots add column if not exists source text not null default 'curated';
alter table public.spots add column if not exists osm_ref text;
alter table public.spots add column if not exists address text;
alter table public.spots add column if not exists place_kind text;
alter table public.spots add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.spots add column if not exists is_demo boolean not null default false;
alter table public.spots add column if not exists cover_image_path text;
alter table public.spots add column if not exists created_at timestamptz not null default now();

-- 名前の重複不可をやめる（同じ名前のお店が別の場所にあるため。重複は register_spot で防ぐ。BR-20）
alter table public.spots drop constraint if exists spots_name_key;
-- 利用者の登録は紹介文とエリアが空（BR-20）。開発側の登録で必須なのは下のチェック制約で守る
alter table public.spots alter column description drop not null;
alter table public.spots alter column area drop not null;

alter table public.spots drop constraint if exists spots_name_length_check;
alter table public.spots add constraint spots_name_length_check
  check (char_length(name) between 1 and 50);
alter table public.spots drop constraint if exists spots_source_check;
alter table public.spots add constraint spots_source_check check (source in ('curated', 'user'));
alter table public.spots drop constraint if exists spots_address_length_check;
alter table public.spots add constraint spots_address_length_check
  check (address is null or char_length(address) <= 100);
-- 開発側の登録は紹介文とエリアが必須。利用者の登録は osm_ref が必須で、id は 100001 から（9.2、BR-17）
alter table public.spots drop constraint if exists spots_source_fields_check;
alter table public.spots add constraint spots_source_fields_check check (
  (source = 'curated' and description is not null and area is not null)
  or (source = 'user' and osm_ref is not null and id >= 100001)
);
-- 金沢市の範囲（BR-19 の四角。src/lib/geo.ts の KanazawaBounds と同じ）。デモ用のスポットは除く（BR-17）
alter table public.spots drop constraint if exists spots_in_kanazawa_check;
alter table public.spots add constraint spots_in_kanazawa_check check (
  is_demo or (lat between 36.4 and 36.7 and lng between 136.5 and 136.9)
);

create unique index if not exists spots_osm_ref_key on public.spots (osm_ref);
create index if not exists spots_source_idx on public.spots (source);

-- 利用者の登録の id の連番（BR-17）
create sequence if not exists public.spots_user_id_seq start with 100001 minvalue 100001;
revoke all on sequence public.spots_user_id_seq from public, anon, authenticated;

-- 2点の距離（m、球面での距離）。register_spot の「50m 以内の同じ名前」（BR-20）で使う
create or replace function public.distance_m(
  p_lat1 double precision, p_lng1 double precision,
  p_lat2 double precision, p_lng2 double precision
)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(p_lat2 - p_lat1) / 2), 2)
    + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lng2 - p_lng1) / 2), 2)
  ));
$$;

-- デモ用のスポット（9.7、BR-17、K53）。金沢市の外（野々市市）にある例外
insert into public.spots
  (id, name, description, lat, lng, google_place_id, spot_type, area, is_active, sort_order,
   source, osm_ref, address, place_kind, is_demo)
values
  (90001, '金沢工業大学', '扇が丘キャンパス。このサイトのデモで、お店の申請とキャンペーンを試すために使う',
   36.530922, 136.627583, null, 'minor', 'その他', true, 0,
   'curated', 'way/295949646', '石川県野々市市扇が丘7-1', '場所', true)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, lat = excluded.lat,
      lng = excluded.lng, spot_type = excluded.spot_type, area = excluded.area,
      is_active = excluded.is_active, sort_order = excluded.sort_order, source = excluded.source,
      osm_ref = excluded.osm_ref, address = excluded.address, place_kind = excluded.place_kind,
      is_demo = excluded.is_demo;

-- ============================================================
-- plans の共有（9.2、BR-30）。推測できない32文字。null なら共有していない
-- ============================================================

alter table public.plans add column if not exists share_token text;
alter table public.plans drop constraint if exists plans_share_token_check;
alter table public.plans add constraint plans_share_token_check
  check (share_token is null or share_token ~ '^[A-Za-z0-9_-]{32}$');
create unique index if not exists plans_share_token_key on public.plans (share_token);

-- ============================================================
-- リスト（9.2、BR-18）
-- ============================================================

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 1〜30文字。前後の空白は取り除いて保存する
  name text not null check (char_length(name) between 1 and 30 and name = btrim(name)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.list_spots (
  list_id uuid not null references public.lists (id) on delete cascade,
  spot_id int not null references public.spots (id),
  added_at timestamptz not null default now(),
  primary key (list_id, spot_id)
);

create index if not exists lists_user_id_idx on public.lists (user_id, updated_at desc);
create index if not exists list_spots_spot_id_idx on public.list_spots (spot_id);

drop trigger if exists lists_set_updated_at on public.lists;
create trigger lists_set_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

-- 1人20個まで（BR-18）。超えたら LIMIT_REACHED
create or replace function public.check_lists_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('lists:' || new.user_id::text));
  if (select count(*) from public.lists l where l.user_id = new.user_id) >= 20 then
    raise exception using errcode = 'P0001', message = 'LIMIT_REACHED';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_lists_limit() from public, anon, authenticated;

drop trigger if exists lists_check_limit on public.lists;
create trigger lists_check_limit
  before insert on public.lists
  for each row execute function public.check_lists_limit();

-- 1つのリストに30件まで（BR-18）。超えたら LIMIT_REACHED
create or replace function public.check_list_spots_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('list_spots:' || new.list_id::text));
  if (select count(*) from public.list_spots ls where ls.list_id = new.list_id) >= 30 then
    raise exception using errcode = 'P0001', message = 'LIMIT_REACHED';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_list_spots_limit() from public, anon, authenticated;

drop trigger if exists list_spots_check_limit on public.list_spots;
create trigger list_spots_check_limit
  before insert on public.list_spots
  for each row execute function public.check_list_spots_limit();

-- スポットを入れる・外すときも、リストの updated_at を更新する（9.2。getLists の並び順）
create or replace function public.touch_list()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.lists l set updated_at = now()
   where l.id = coalesce(new.list_id, old.list_id);
  return null;
end;
$$;

drop trigger if exists list_spots_touch_list on public.list_spots;
create trigger list_spots_touch_list
  after insert or delete on public.list_spots
  for each row execute function public.touch_list();

-- ============================================================
-- スポットの投稿（9.2、BR-21）
-- ============================================================

create table if not exists public.spot_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  spot_id int not null references public.spots (id),
  body text not null check (char_length(body) between 1 and 300),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spot_post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.spot_posts (id) on delete cascade,
  image_path text not null,
  position int not null check (position between 0 and 3),
  unique (post_id, position)
);

create index if not exists spot_posts_spot_id_created_at_idx on public.spot_posts (spot_id, created_at);
create index if not exists spot_posts_user_id_idx on public.spot_posts (user_id);

drop trigger if exists spot_posts_set_updated_at on public.spot_posts;
create trigger spot_posts_set_updated_at
  before update on public.spot_posts
  for each row execute function public.set_updated_at();

-- ============================================================
-- ビュー spot_summaries（9.3）。security_invoker を付けて RLS を効かせる
-- ============================================================

create or replace view public.spot_summaries
with (security_invoker = true)
as
select
  s.id,
  s.name,
  s.description,
  s.lat,
  s.lng,
  s.google_place_id,
  s.spot_type,
  s.area,
  s.is_active,
  s.sort_order,
  s.source,
  s.address,
  s.place_kind,
  s.is_demo,
  (select count(*)::int from public.spot_posts p
    where p.spot_id = s.id and not p.is_hidden) as post_count,
  -- 表示中の投稿の、いちばん新しい写真。なければチームの写真（K50）
  coalesce((
    select i.image_path
    from public.spot_posts p
    join public.spot_post_images i on i.post_id = p.id
    where p.spot_id = s.id and not p.is_hidden
    order by p.created_at desc, i.position
    limit 1
  ), s.cover_image_path) as latest_image_path,
  -- 写真があれば地図（S-13）に出す（BR-24、K50）
  (
    s.cover_image_path is not null
    or exists (
      select 1 from public.spot_posts p
      join public.spot_post_images i on i.post_id = p.id
      where p.spot_id = s.id and not p.is_hidden
    )
  ) as on_map,
  -- キャンペーン中なら、そのキャンペーン（BR-27）。キャンペーンは I-36 で足すので、それまでは null
  null::uuid as active_campaign_id
from public.spots s;

revoke all on public.spot_summaries from anon;
grant select on public.spot_summaries to authenticated;

-- ============================================================
-- アクセス制御（9.4）。すべてログインユーザー（authenticated）だけ
-- ============================================================

alter table public.lists enable row level security;
alter table public.list_spots enable row level security;
alter table public.spot_posts enable row level security;
alter table public.spot_post_images enable row level security;

-- lists、list_spots：本人だけ
drop policy if exists lists_own on public.lists;
create policy lists_own on public.lists
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists list_spots_own on public.list_spots;
create policy list_spots_own on public.list_spots
  for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));

-- spot_posts、spot_post_images：表示中ならログインユーザー、非表示は本人だけ（管理者は I-36 で足す）。
-- 作る・変えるのは RPC save_spot_post だけ。消すのは本人
drop policy if exists spot_posts_select on public.spot_posts;
create policy spot_posts_select on public.spot_posts
  for select to authenticated
  using (not is_hidden or user_id = (select auth.uid()));
drop policy if exists spot_posts_delete_own on public.spot_posts;
create policy spot_posts_delete_own on public.spot_posts
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists spot_post_images_select on public.spot_post_images;
create policy spot_post_images_select on public.spot_post_images
  for select to authenticated
  using (exists (select 1 from public.spot_posts p where p.id = post_id));
drop policy if exists spot_post_images_delete_own on public.spot_post_images;
create policy spot_post_images_delete_own on public.spot_post_images
  for delete to authenticated
  using (exists (select 1 from public.spot_posts p where p.id = post_id and p.user_id = (select auth.uid())));

-- 未ログイン（anon）には何も許可しない（9.4）
revoke all on public.lists, public.list_spots, public.spot_posts, public.spot_post_images from anon;
-- 書き込みは RLS か RPC で守る。投稿の追加・更新は RPC だけなので、表の権限からも外す
revoke insert, update on public.spot_posts, public.spot_post_images from authenticated;
-- spots は RPC register_spot だけで追加する（9.4）
revoke insert, update, delete on public.spots from anon, authenticated;

-- ============================================================
-- Storage（9.4）
-- ============================================================

-- spot-post-images：plan-images と同じ決まり（公開、本人のフォルダの中だけ書く・消す、5MB、jpeg）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('spot-post-images', 'spot-post-images', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists spot_post_images_select_own on storage.objects;
create policy spot_post_images_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'spot-post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists spot_post_images_insert_own on storage.objects;
create policy spot_post_images_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'spot-post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists spot_post_images_update_own on storage.objects;
create policy spot_post_images_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'spot-post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists spot_post_images_delete_own on storage.objects;
create policy spot_post_images_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'spot-post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- spot-covers：チームの写真。読むのは誰でも（公開）。画面からの書き込みと削除は許さない（ポリシーを作らない）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('spot-covers', 'spot-covers', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- RPC register_spot（10.9、BR-20）
-- 失敗はメッセージにコードを入れた例外（errcode P0001）で返す
-- ============================================================

create or replace function public.register_spot(p_candidate jsonb)
returns table (spot_id int, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_osm_ref text := nullif(btrim(coalesce(p_candidate ->> 'osm_ref', '')), '');
  v_name text := btrim(coalesce(p_candidate ->> 'name', ''));
  v_lat double precision;
  v_lng double precision;
  v_address text := left(nullif(btrim(coalesce(p_candidate ->> 'address', '')), ''), 100);
  v_place_kind text := nullif(btrim(coalesce(p_candidate ->> 'place_kind', '')), '');
  v_id int;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED';
  end if;
  begin
    v_lat := (p_candidate ->> 'lat')::double precision;
    v_lng := (p_candidate ->> 'lng')::double precision;
  exception when others then
    raise exception using errcode = 'P0001', message = 'INVALID_CANDIDATE';
  end;
  if v_osm_ref is null or v_name = '' or v_lat is null or v_lng is null then
    raise exception using errcode = 'P0001', message = 'INVALID_CANDIDATE';
  end if;
  -- 名前は OpenStreetMap のもの。50文字まで（BR-20）
  v_name := left(v_name, 50);

  -- 1. 同じ osm_ref のスポットがあれば、それを使う
  select s.id into v_id from public.spots s where s.osm_ref = v_osm_ref;
  if found then
    return query select v_id, true;
    return;
  end if;

  -- 2. 金沢市の範囲（BR-19。src/lib/geo.ts の KanazawaBounds と同じ）でなければ OUT_OF_AREA
  if not (v_lat between 36.4 and 36.7 and v_lng between 136.5 and 136.9) then
    raise exception using errcode = 'P0001', message = 'OUT_OF_AREA';
  end if;

  -- 3. 50m 以内に名前が同じスポットがあれば、それを使う（いちばん近いもの）
  select s.id into v_id
    from public.spots s
   where s.name = v_name
     and public.distance_m(s.lat, s.lng, v_lat, v_lng) <= 50
   order by public.distance_m(s.lat, s.lng, v_lat, v_lng), s.id
   limit 1;
  if found then
    return query select v_id, true;
    return;
  end if;

  -- 4. 新しく登録する。利用者のスポットは定番以外で、紹介文とエリアは空（BR-20）
  insert into public.spots
    (id, name, description, lat, lng, spot_type, area, is_active, source, osm_ref, address,
     place_kind, created_by)
  values
    (nextval('public.spots_user_id_seq'), v_name, null, v_lat, v_lng, 'minor', null, true, 'user',
     v_osm_ref, v_address, v_place_kind, v_uid)
  on conflict (osm_ref) do nothing
  returning id into v_id;

  if v_id is null then
    -- 同時に同じ場所が登録されたときは、先に登録されたものを使う
    select s.id into v_id from public.spots s where s.osm_ref = v_osm_ref;
    return query select v_id, true;
    return;
  end if;
  return query select v_id, false;
end;
$$;

revoke execute on function public.register_spot(jsonb) from public, anon;
grant execute on function public.register_spot(jsonb) to authenticated;

-- ============================================================
-- RPC save_spot_post（10.9、BR-21）
-- この Issue では投稿と写真の保存だけ。キャンペーンの特典の発行（BR-28）と、
-- お店の本人が自分のお店に投稿できない決まりは I-36 で足す。それまで reward_id は null
-- ============================================================

create or replace function public.save_spot_post(p_post jsonb)
returns table (post_id uuid, reward_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := nullif(p_post ->> 'id', '')::uuid;
  v_spot_id int;
  v_body text := btrim(coalesce(p_post ->> 'body', ''));
  v_images jsonb := coalesce(p_post -> 'image_paths', '[]'::jsonb);
  v_owner uuid;
  v_old_spot int;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED';
  end if;
  -- ひとことは1〜300文字（前後の空白を取り除く）
  if char_length(v_body) not between 1 and 300 then
    raise exception using errcode = 'P0001', message = 'POST_BODY_INVALID';
  end if;
  -- 写真は1〜4枚
  if jsonb_typeof(v_images) <> 'array' or jsonb_array_length(v_images) not between 1 and 4 then
    raise exception using errcode = 'P0001', message = 'POST_IMAGES_INVALID';
  end if;
  -- 写真は自分のフォルダのものだけ（BR-13）
  if exists (
    select 1 from jsonb_array_elements_text(v_images) x
    where btrim(x) = '' or split_part(x, '/', 1) <> v_uid::text
  ) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;

  if v_id is null then
    -- 新規：使用中のスポットだけ
    begin
      v_spot_id := (p_post ->> 'spot_id')::int;
    exception when others then
      raise exception using errcode = 'P0001', message = 'NOT_FOUND';
    end;
    if v_spot_id is null or not exists (
      select 1 from public.spots s where s.id = v_spot_id and s.is_active
    ) then
      raise exception using errcode = 'P0001', message = 'NOT_FOUND';
    end if;
    insert into public.spot_posts (user_id, spot_id, body)
    values (v_uid, v_spot_id, v_body)
    returning id into v_id;
  else
    -- 更新：本人の投稿だけ。スポットは変えられない（BR-21）
    select p.user_id, p.spot_id into v_owner, v_old_spot from public.spot_posts p where p.id = v_id;
    if not found or v_owner <> v_uid then
      raise exception using errcode = 'P0001', message = 'FORBIDDEN';
    end if;
    if nullif(p_post ->> 'spot_id', '') is not null and (p_post ->> 'spot_id')::int <> v_old_spot then
      raise exception using errcode = 'P0001', message = 'FORBIDDEN';
    end if;
    update public.spot_posts p set body = v_body where p.id = v_id;
    delete from public.spot_post_images i where i.post_id = v_id;
  end if;

  insert into public.spot_post_images (post_id, image_path, position)
  select v_id, t.x, (t.ord - 1)::int
  from jsonb_array_elements_text(v_images) with ordinality t(x, ord);

  return query select v_id, null::uuid;
end;
$$;

revoke execute on function public.save_spot_post(jsonb) from public, anon;
grant execute on function public.save_spot_post(jsonb) to authenticated;

-- ============================================================
-- RPC get_shared_plan（10.9、BR-30）。未ログイン（anon）でも呼べる。
-- 合言葉が合うプランだけを返す。作成者の表示名のほかの利用者の情報は返さない
-- ============================================================

create or replace function public.get_shared_plan(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'status', p.status,
    'published_at', p.published_at,
    'updated_at', p.updated_at,
    'author_name', pr.display_name,
    'like_count', (select count(*)::int from public.likes l where l.plan_id = p.id),
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'slug', t.slug, 'name', t.name, 'tag_group', t.tag_group, 'sort_order', t.sort_order
      ) order by t.id)
      from public.plan_tags pt join public.tags t on t.id = pt.tag_id
      where pt.plan_id = p.id
    ), '[]'::jsonb),
    'blocks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id,
        'position', b.position,
        'block_type', b.block_type,
        'transport_mode', b.transport_mode,
        'body', b.body,
        'image_path', b.image_path,
        'spot', case when s.id is null then null else jsonb_build_object(
          'id', s.id, 'name', s.name, 'description', s.description, 'lat', s.lat, 'lng', s.lng,
          'google_place_id', s.google_place_id, 'spot_type', s.spot_type, 'area', s.area,
          'is_active', s.is_active, 'source', s.source, 'address', s.address,
          'place_kind', s.place_kind, 'is_demo', s.is_demo
        ) end
      ) order by b.position)
      from public.plan_blocks b left join public.spots s on s.id = b.spot_id
      where b.plan_id = p.id
    ), '[]'::jsonb)
  )
  from public.plans p
  join public.profiles pr on pr.id = p.user_id
  where p_token ~ '^[A-Za-z0-9_-]{32}$'
    and p.share_token = p_token;
$$;

revoke execute on function public.get_shared_plan(text) from public;
grant execute on function public.get_shared_plan(text) to anon, authenticated;

-- ============================================================
-- 関数の実行権限（9.4）。トリガー用の関数と距離の関数は直接呼ばせない
-- ============================================================

revoke execute on function public.touch_list() from public, anon, authenticated;
revoke execute on function public.distance_m(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.distance_m(double precision, double precision, double precision, double precision) to authenticated;
