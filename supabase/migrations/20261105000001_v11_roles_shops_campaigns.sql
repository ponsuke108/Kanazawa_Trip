-- v11 第3段階のデータベース（I-36）：利用者の種類、お店の申請、お店、キャンペーン、特典、管理者の記録
-- 要件定義書 9.1〜9.4、10.9、BR-25〜BR-29
-- 失敗はメッセージにコードを入れた例外（errcode P0001）で返す（10.2）

-- ============================================================
-- 利用者の種類（BR-25）。本人は変えられない（8.3）
-- ============================================================

alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'official', 'admin'));

-- 本人が変えられるのは表示名だけ。列の権限で role を書けないようにする
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- 念のため、ログインユーザーとして role を変えようとしたら止める（RPC は関数の持ち主として動くので通る）
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and current_user in ('authenticated', 'anon') then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_profile_role() from public, anon, authenticated;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- 管理者かどうか（9.4）。RLS と RPC で使う
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 日本時間の今日（BR-27 の期間、BR-28 の特典の有効期限）
create or replace function public.jst_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Tokyo')::date;
$$;
revoke execute on function public.jst_today() from public, anon;
grant execute on function public.jst_today() to authenticated;

-- ============================================================
-- テーブル（9.2）
-- ============================================================

create table if not exists public.shop_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  spot_id int not null references public.spots (id),
  shop_name text not null check (char_length(shop_name) between 1 and 30),
  introduction text not null default '' check (char_length(introduction) <= 300),
  contact_name text not null check (char_length(contact_name) between 1 and 30),
  contact_email text not null check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone text not null check (contact_phone ~ '^[0-9-]{1,20}$'),
  campaign_draft jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text check (char_length(reject_reason) <= 200),
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
-- 1人が持てる審査中の申請は1つ（BR-26）
create unique index if not exists shop_applications_one_pending
  on public.shop_applications (user_id) where status = 'pending';
create index if not exists shop_applications_status_idx on public.shop_applications (status);

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  spot_id int not null unique references public.spots (id),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  introduction text not null default '' check (char_length(introduction) <= 300),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists shops_set_updated_at on public.shops;
create trigger shops_set_updated_at
  before update on public.shops
  for each row execute function public.set_updated_at();

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 30),
  benefit text not null check (char_length(benefit) between 1 and 50),
  notice text not null default '' check (char_length(notice) <= 200),
  description text not null default '' check (char_length(description) <= 500),
  image_path text,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active' check (status in ('active', 'ended', 'stopped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 終了日は開始日から90日以内（BR-27、K46）
  check (ends_on >= starts_on and ends_on <= starts_on + 90)
);
-- 1つのお店で同時に行えるキャンペーンは1つ（BR-27）
create unique index if not exists campaigns_one_active
  on public.campaigns (shop_id) where status = 'active';
create index if not exists campaigns_shop_id_status_idx on public.campaigns (shop_id, status);

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create table if not exists public.campaign_rewards (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid references public.spot_posts (id) on delete set null,
  issued_at timestamptz not null default now(),
  distance_m int not null check (distance_m between 0 and 100),
  used_at timestamptz,
  -- 1人1キャンペーン1回（BR-28）
  unique (campaign_id, user_id)
);
create index if not exists campaign_rewards_user_id_idx on public.campaign_rewards (user_id);

create table if not exists public.admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles (id),
  action text not null check (action in (
    'approve_application', 'reject_application', 'suspend_shop', 'resume_shop',
    'stop_campaign', 'resume_campaign', 'hide_post', 'show_post', 'deactivate_spot'
  )),
  target_id text not null,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);

-- スポットの投稿に、キャンペーンで投稿したかを足す（「キャンペーン参加」のラベル。BR-21、BR-28）
alter table public.spot_posts
  add column if not exists campaign_id uuid references public.campaigns (id) on delete set null;

-- ============================================================
-- いまキャンペーン中か（BR-27）：キャンペーンが active、お店が active、日本時間の今日が期間の中
-- お店を止めるとキャンペーンも止まる（BR-29）ので、お店の status もここで見る
-- ============================================================

create or replace function public.active_campaign_id(p_spot_id int)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.shops s
  join public.campaigns c on c.shop_id = s.id
  where s.spot_id = p_spot_id
    and s.status = 'active'
    and c.status = 'active'
    and public.jst_today() between c.starts_on and c.ends_on
  limit 1;
$$;
revoke execute on function public.active_campaign_id(int) from public, anon;
grant execute on function public.active_campaign_id(int) to authenticated;

-- spot_summaries の active_campaign_id を、I-26 の null から中身に変える（列は同じ）
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
  coalesce((
    select i.image_path
    from public.spot_posts p
    join public.spot_post_images i on i.post_id = p.id
    where p.spot_id = s.id and not p.is_hidden
    order by p.created_at desc, i.position
    limit 1
  ), s.cover_image_path) as latest_image_path,
  (
    s.cover_image_path is not null
    or exists (
      select 1 from public.spot_posts p
      join public.spot_post_images i on i.post_id = p.id
      where p.spot_id = s.id and not p.is_hidden
    )
  ) as on_map,
  -- キャンペーン中なら、そのキャンペーン（BR-27）
  public.active_campaign_id(s.id) as active_campaign_id
from public.spots s;

revoke all on public.spot_summaries from anon;
grant select on public.spot_summaries to authenticated;

-- ============================================================
-- RLS（9.4）
-- ============================================================

alter table public.shop_applications enable row level security;
alter table public.shops enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_rewards enable row level security;
alter table public.admin_actions enable row level security;

revoke all on public.shop_applications, public.shops, public.campaigns,
  public.campaign_rewards, public.admin_actions from anon;

-- 申請：本人と管理者だけが読める（担当者の名前と連絡先を守る）。作るのは RPC だけ
drop policy if exists shop_applications_select on public.shop_applications;
create policy shop_applications_select on public.shop_applications
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
revoke insert, update, delete on public.shop_applications from authenticated;

-- お店：ログインユーザーが読める。本人は name、introduction だけ変えられる
drop policy if exists shops_select on public.shops;
create policy shops_select on public.shops for select to authenticated using (true);
drop policy if exists shops_update_own on public.shops;
create policy shops_update_own on public.shops
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
revoke insert, update, delete on public.shops from authenticated;
grant update (name, introduction) on public.shops to authenticated;

-- キャンペーン：ログインユーザーが読める。本人のお店（active のお店だけ）が作る・変える。
-- 管理者が止めたもの（stopped）は変えられず、stopped にもできない（BR-27）
drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns for select to authenticated using (true);
drop policy if exists campaigns_insert_own on public.campaigns;
create policy campaigns_insert_own on public.campaigns
  for insert to authenticated
  with check (
    status = 'active'
    and exists (
      select 1 from public.shops s
      where s.id = shop_id and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
    and (image_path is null or split_part(image_path, '/', 1) = (select auth.uid())::text)
  );
drop policy if exists campaigns_update_own on public.campaigns;
create policy campaigns_update_own on public.campaigns
  for update to authenticated
  using (
    status <> 'stopped'
    and exists (
      select 1 from public.shops s
      where s.id = shop_id and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
  )
  with check (
    status in ('active', 'ended')
    and exists (
      select 1 from public.shops s
      where s.id = shop_id and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
    and (image_path is null or split_part(image_path, '/', 1) = (select auth.uid())::text)
  );
revoke insert, update, delete on public.campaigns from authenticated;
grant insert (shop_id, title, benefit, notice, description, image_path, starts_on, ends_on, status)
  on public.campaigns to authenticated;
grant update (title, benefit, notice, description, image_path, starts_on, ends_on, status)
  on public.campaigns to authenticated;

-- 特典：本人と、そのお店の本人（数を数えるため）が読める。作る・変えるのは RPC だけ
drop policy if exists campaign_rewards_select on public.campaign_rewards;
create policy campaign_rewards_select on public.campaign_rewards
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.campaigns c
      join public.shops s on s.id = c.shop_id
      where c.id = campaign_id and s.owner_id = (select auth.uid())
    )
  );
revoke insert, update, delete on public.campaign_rewards from authenticated;

-- 管理者の記録：管理者だけが読める。作るのは RPC だけ
drop policy if exists admin_actions_select on public.admin_actions;
create policy admin_actions_select on public.admin_actions
  for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.admin_actions from authenticated;

-- 非表示の投稿は、本人と管理者が読める（9.4）
drop policy if exists spot_posts_select on public.spot_posts;
create policy spot_posts_select on public.spot_posts
  for select to authenticated
  using (not is_hidden or user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists spot_post_images_select on public.spot_post_images;
create policy spot_post_images_select on public.spot_post_images
  for select to authenticated
  using (exists (select 1 from public.spot_posts p where p.id = post_id));

-- ============================================================
-- Storage：campaign-images（plan-images と同じ決まり。9.4）
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaign-images', 'campaign-images', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists campaign_images_select_own on storage.objects;
create policy campaign_images_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'campaign-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists campaign_images_insert_own on storage.objects;
create policy campaign_images_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'campaign-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists campaign_images_update_own on storage.objects;
create policy campaign_images_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'campaign-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists campaign_images_delete_own on storage.objects;
create policy campaign_images_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'campaign-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ============================================================
-- 特典の対象かを確かめる（BR-28）。保存しない部分を1か所にまとめる
-- ============================================================

create or replace function public.campaign_eligibility(
  p_uid uuid, p_spot_id int, p_lat float8, p_lng float8, p_accuracy float8
)
returns table (eligible boolean, distance_m int, campaign_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_campaign uuid := public.active_campaign_id(p_spot_id);
  v_spot record;
  v_distance int;
  v_owner uuid;
begin
  select s.lat, s.lng into v_spot from public.spots s where s.id = p_spot_id;
  if not found or p_lat is null or p_lng is null then
    return query select false, null::int, v_campaign;
    return;
  end if;
  v_distance := round(public.distance_m(p_lat, p_lng, v_spot.lat, v_spot.lng))::int;
  if v_campaign is null then
    return query select false, v_distance, null::uuid;
    return;
  end if;
  select s.owner_id into v_owner from public.shops s where s.spot_id = p_spot_id;
  return query select
    -- お店から100m以内、位置の誤差100m以下、お店の本人でない、まだ特典を受けていない
    (
      v_distance <= 100
      and coalesce(p_accuracy, 1e9) <= 100
      and v_owner is distinct from p_uid
      and not exists (
        select 1 from public.campaign_rewards r
        where r.campaign_id = v_campaign and r.user_id = p_uid
      )
    ),
    v_distance,
    v_campaign;
end;
$$;
revoke execute on function public.campaign_eligibility(uuid, int, float8, float8, float8)
  from public, anon, authenticated;

-- RPC check_campaign_eligibility（10.9）。投稿画面で対象かどうかを見せるため。保存はしない
create or replace function public.check_campaign_eligibility(
  p_spot_id int, p_lat float8, p_lng float8, p_accuracy float8
)
returns table (eligible boolean, distance_m int, campaign_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED';
  end if;
  return query select * from public.campaign_eligibility(v_uid, p_spot_id, p_lat, p_lng, p_accuracy);
end;
$$;
revoke execute on function public.check_campaign_eligibility(int, float8, float8, float8) from public, anon;
grant execute on function public.check_campaign_eligibility(int, float8, float8, float8) to authenticated;

-- ============================================================
-- RPC save_spot_post（10.9、BR-21、BR-28）。I-26 のものに、次の2つを足す
-- ・お店の本人は、自分のお店のスポットに投稿できない
-- ・新規で、渡された位置が対象なら、特典を出して campaign_id を付ける（距離だけを残し、位置は保存しない）
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
  v_position jsonb := p_post -> 'position';
  v_owner uuid;
  v_old_spot int;
  v_check record;
  v_reward uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED';
  end if;
  if char_length(v_body) not between 1 and 300 then
    raise exception using errcode = 'P0001', message = 'POST_BODY_INVALID';
  end if;
  if jsonb_typeof(v_images) <> 'array' or jsonb_array_length(v_images) not between 1 and 4 then
    raise exception using errcode = 'P0001', message = 'POST_IMAGES_INVALID';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(v_images) x
    where btrim(x) = '' or split_part(x, '/', 1) <> v_uid::text
  ) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;

  if v_id is null then
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
    -- お店は、自分のお店のスポットに投稿できない（BR-28）
    if exists (select 1 from public.shops s where s.spot_id = v_spot_id and s.owner_id = v_uid) then
      raise exception using errcode = 'P0001', message = 'FORBIDDEN';
    end if;
    insert into public.spot_posts (user_id, spot_id, body)
    values (v_uid, v_spot_id, v_body)
    returning id into v_id;

    -- 投稿するときの位置で、もう一度確かめる（BR-28）。位置は保存しない
    if v_position is not null and jsonb_typeof(v_position) = 'object' then
      select * into v_check from public.campaign_eligibility(
        v_uid, v_spot_id,
        (v_position ->> 'lat')::float8,
        (v_position ->> 'lng')::float8,
        (v_position ->> 'accuracy')::float8
      );
      if v_check.eligible then
        insert into public.campaign_rewards (campaign_id, user_id, post_id, distance_m)
        values (v_check.campaign_id, v_uid, v_id, v_check.distance_m)
        on conflict (campaign_id, user_id) do nothing
        returning id into v_reward;
        if v_reward is not null then
          update public.spot_posts p set campaign_id = v_check.campaign_id where p.id = v_id;
        end if;
      end if;
    end if;
  else
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

  return query select v_id, v_reward;
end;
$$;

revoke execute on function public.save_spot_post(jsonb) from public, anon;
grant execute on function public.save_spot_post(jsonb) to authenticated;

-- ============================================================
-- RPC use_reward（10.9、BR-28）：本人の特典で、受け取った日のうち（日本時間）で、未使用なら使用済みにする
-- ============================================================

create or replace function public.use_reward(p_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED';
  end if;
  update public.campaign_rewards r
     set used_at = now()
   where r.id = p_reward_id
     and r.user_id = v_uid
     and r.used_at is null
     and (r.issued_at at time zone 'Asia/Tokyo')::date = public.jst_today();
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception using errcode = 'P0001', message = 'CAMPAIGN_NOT_ELIGIBLE';
  end if;
end;
$$;
revoke execute on function public.use_reward(uuid) from public, anon;
grant execute on function public.use_reward(uuid) to authenticated;

-- ============================================================
-- キャンペーンの下書き（jsonb）の確かめ（BR-27）。申請の最初のキャンペーンで使う
-- ============================================================

create or replace function public.valid_campaign_draft(p jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_starts date;
  v_ends date;
begin
  if p is null or jsonb_typeof(p) = 'null' then
    return true;
  end if;
  if jsonb_typeof(p) <> 'object' then
    return false;
  end if;
  begin
    v_starts := (p ->> 'starts_on')::date;
    v_ends := (p ->> 'ends_on')::date;
  exception when others then
    return false;
  end;
  return char_length(btrim(coalesce(p ->> 'title', ''))) between 1 and 30
    and char_length(btrim(coalesce(p ->> 'benefit', ''))) between 1 and 50
    and char_length(coalesce(p ->> 'notice', '')) <= 200
    and char_length(coalesce(p ->> 'description', '')) <= 500
    and v_starts is not null and v_ends is not null
    and v_ends >= v_starts and v_ends <= v_starts + 90;
end;
$$;
revoke execute on function public.valid_campaign_draft(jsonb) from public, anon, authenticated;

-- ============================================================
-- RPC submit_application（10.9、BR-26）
-- 一般の利用者で、審査中の申請がなく、スポットにお店がないときだけ受け付ける
-- ============================================================

create or replace function public.submit_application(p_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_spot_id int;
  v_draft jsonb := p_input -> 'campaign_draft';
  v_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.role = 'user') then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;
  if exists (
    select 1 from public.shop_applications a where a.user_id = v_uid and a.status = 'pending'
  ) then
    raise exception using errcode = 'P0001', message = 'LIMIT_REACHED';
  end if;
  begin
    v_spot_id := (p_input ->> 'spot_id')::int;
  exception when others then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end;
  if v_spot_id is null or not exists (
    select 1 from public.spots s where s.id = v_spot_id and s.is_active
  ) then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  -- 1つのスポットに、お店は1つだけ
  if exists (select 1 from public.shops s where s.spot_id = v_spot_id) then
    raise exception using errcode = 'P0001', message = 'LIMIT_REACHED';
  end if;
  if jsonb_typeof(v_draft) = 'null' then
    v_draft := null;
  end if;
  if not public.valid_campaign_draft(v_draft) then
    raise exception using errcode = 'P0001', message = 'CAMPAIGN_INVALID';
  end if;

  begin
    insert into public.shop_applications (
      user_id, spot_id, shop_name, introduction, contact_name, contact_email, contact_phone, campaign_draft
    ) values (
      v_uid,
      v_spot_id,
      btrim(coalesce(p_input ->> 'shop_name', '')),
      btrim(coalesce(p_input ->> 'introduction', '')),
      btrim(coalesce(p_input ->> 'contact_name', '')),
      btrim(coalesce(p_input ->> 'contact_email', '')),
      btrim(coalesce(p_input ->> 'contact_phone', '')),
      v_draft
    )
    returning id into v_id;
  exception when check_violation or not_null_violation then
    raise exception using errcode = 'P0001', message = 'APPLICATION_INVALID';
  end;
  return v_id;
end;
$$;
revoke execute on function public.submit_application(jsonb) from public, anon;
grant execute on function public.submit_application(jsonb) to authenticated;

-- ============================================================
-- RPC review_application（10.9、BR-26）。管理者のみ
-- 承認：申請者の role を official にし、shops と、下書きがあれば campaigns を作る
-- 却下：理由が必須（200文字まで）
-- ============================================================

create or replace function public.review_application(p_id uuid, p_approve boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_app public.shop_applications%rowtype;
  v_shop uuid;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED';
  end if;
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;
  select * into v_app from public.shop_applications a where a.id = p_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_app.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;
  if v_reason is not null and char_length(v_reason) > 200 then
    raise exception using errcode = 'P0001', message = 'REASON_INVALID';
  end if;

  if p_approve then
    if exists (select 1 from public.shops s where s.spot_id = v_app.spot_id or s.owner_id = v_app.user_id) then
      raise exception using errcode = 'P0001', message = 'LIMIT_REACHED';
    end if;
    update public.profiles p set role = 'official' where p.id = v_app.user_id and p.role = 'user';
    insert into public.shops (spot_id, owner_id, name, introduction)
    values (v_app.spot_id, v_app.user_id, v_app.shop_name, v_app.introduction)
    returning id into v_shop;
    -- 最初のキャンペーンは、申請と一緒に管理者が見たので、そのまま公開する（BR-26）
    if v_app.campaign_draft is not null then
      insert into public.campaigns (shop_id, title, benefit, notice, description, image_path, starts_on, ends_on)
      values (
        v_shop,
        btrim(v_app.campaign_draft ->> 'title'),
        btrim(v_app.campaign_draft ->> 'benefit'),
        coalesce(v_app.campaign_draft ->> 'notice', ''),
        coalesce(v_app.campaign_draft ->> 'description', ''),
        nullif(v_app.campaign_draft ->> 'image_path', ''),
        (v_app.campaign_draft ->> 'starts_on')::date,
        (v_app.campaign_draft ->> 'ends_on')::date
      );
    end if;
    update public.shop_applications a
       set status = 'approved', reviewed_by = v_uid, reviewed_at = now(), reject_reason = null
     where a.id = p_id;
    insert into public.admin_actions (admin_id, action, target_id, reason)
    values (v_uid, 'approve_application', p_id::text, v_reason);
  else
    if v_reason is null then
      raise exception using errcode = 'P0001', message = 'REASON_REQUIRED';
    end if;
    update public.shop_applications a
       set status = 'rejected', reviewed_by = v_uid, reviewed_at = now(), reject_reason = v_reason
     where a.id = p_id;
    insert into public.admin_actions (admin_id, action, target_id, reason)
    values (v_uid, 'reject_application', p_id::text, v_reason);
  end if;
end;
$$;
revoke execute on function public.review_application(uuid, boolean, text) from public, anon;
grant execute on function public.review_application(uuid, boolean, text) to authenticated;

-- ============================================================
-- RPC admin_set_status（10.9、BR-29）。管理者のみ。どの操作も admin_actions に残す。削除はしない
-- p_target：'shop'（active / suspended）、'campaign'（active / stopped）、
--           'post'（hidden / shown）、'spot'（inactive。使用中止だけ）
-- ============================================================

create or replace function public.admin_set_status(p_target text, p_id text, p_value text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_action text;
  v_count int;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED';
  end if;
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;
  if v_reason is not null and char_length(v_reason) > 200 then
    raise exception using errcode = 'P0001', message = 'REASON_INVALID';
  end if;

  begin
    if p_target = 'shop' and p_value in ('active', 'suspended') then
      v_action := case p_value when 'suspended' then 'suspend_shop' else 'resume_shop' end;
      update public.shops s set status = p_value where s.id = p_id::uuid;
    elsif p_target = 'campaign' and p_value in ('active', 'stopped') then
      v_action := case p_value when 'stopped' then 'stop_campaign' else 'resume_campaign' end;
      update public.campaigns c set status = p_value where c.id = p_id::uuid;
    elsif p_target = 'post' and p_value in ('hidden', 'shown') then
      v_action := case p_value when 'hidden' then 'hide_post' else 'show_post' end;
      update public.spot_posts p set is_hidden = (p_value = 'hidden') where p.id = p_id::uuid;
    elsif p_target = 'spot' and p_value = 'inactive' then
      v_action := 'deactivate_spot';
      update public.spots s set is_active = false where s.id = p_id::int;
    else
      raise exception using errcode = 'P0001', message = 'FORBIDDEN';
    end if;
    get diagnostics v_count = row_count;
  exception
    when invalid_text_representation then
      raise exception using errcode = 'P0001', message = 'NOT_FOUND';
    -- 再開するキャンペーンのほかに、すでに active のキャンペーンがある（1つのお店に1つ。BR-27）
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'LIMIT_REACHED';
  end;
  if v_count = 0 then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  insert into public.admin_actions (admin_id, action, target_id, reason)
  values (v_uid, v_action, p_id, v_reason);
end;
$$;
revoke execute on function public.admin_set_status(text, text, text, text) from public, anon;
grant execute on function public.admin_set_status(text, text, text, text) to authenticated;
