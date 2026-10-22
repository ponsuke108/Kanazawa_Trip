-- I-18 ビュー plan_summaries と RPC（search_plans、save_plan）
-- 要件定義書 9.3、10.4〜10.6、BR-01、BR-06、BR-09。2回実行してもエラーにならないように書く

-- ============================================================
-- ビュー plan_summaries（9.3）。security_invoker を付けて RLS を効かせる
-- ============================================================

create or replace view public.plan_summaries
with (security_invoker = true)
as
select
  p.id,
  p.user_id,
  p.title,
  p.status,
  p.source_plan_id,
  p.created_at,
  p.updated_at,
  p.published_at,
  pr.display_name as author_name,
  (select count(*)::int from public.likes l where l.plan_id = p.id) as like_count,
  (select count(*)::int from public.plan_blocks b
    where b.plan_id = p.id and b.block_type = 'spot') as spot_count,
  -- BR-02：定番以外（minor）のスポットが1つ以上あれば true。起点（hub）は数えない
  exists (
    select 1 from public.plan_blocks b
    join public.spots s on s.id = b.spot_id
    where b.plan_id = p.id and s.spot_type = 'minor'
  ) as has_minor_spot,
  coalesce((
    select array_agg(s.name order by b.position)
    from public.plan_blocks b
    join public.spots s on s.id = b.spot_id
    where b.plan_id = p.id
  ), '{}'::text[]) as spot_names,
  coalesce((
    select array_agg(pt.tag_id order by pt.tag_id)
    from public.plan_tags pt
    where pt.plan_id = p.id
  ), '{}'::int[]) as tag_ids,
  (
    select b.image_path from public.plan_blocks b
    where b.plan_id = p.id and b.image_path is not null
    order by b.position
    limit 1
  ) as cover_image_path
from public.plans p
join public.profiles pr on pr.id = p.user_id;

revoke all on public.plan_summaries from anon;
grant select on public.plan_summaries to authenticated;

-- ============================================================
-- RPC search_plans（10.4、BR-01）
-- ============================================================

create or replace function public.search_plans(
  p_tag_ids int[] default '{}',
  p_page int default 0,
  p_page_size int default 20
)
returns table (
  id uuid,
  user_id uuid,
  title text,
  status text,
  source_plan_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  published_at timestamptz,
  author_name text,
  like_count int,
  spot_count int,
  has_minor_spot boolean,
  spot_names text[],
  tag_ids int[],
  cover_image_path text,
  match_count int,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with matched as (
    select
      s.*,
      (select count(*)::int from unnest(s.tag_ids) t where t = any (coalesce(p_tag_ids, '{}'))) as match_count
    from public.plan_summaries s
    where s.status = 'published' -- 公開中のプランだけ
  ),
  filtered as (
    -- どれか1つでも一致すれば出す。タグなしなら全件
    select * from matched m
    where cardinality(coalesce(p_tag_ids, '{}')) = 0 or m.match_count > 0
  )
  select
    f.id, f.user_id, f.title, f.status, f.source_plan_id, f.created_at, f.updated_at,
    f.published_at, f.author_name, f.like_count, f.spot_count, f.has_minor_spot,
    f.spot_names, f.tag_ids, f.cover_image_path, f.match_count,
    count(*) over () as total_count
  from filtered f
  -- 並び順：一致数、定番以外を含む、いいね数、公開日時、プランID
  order by f.match_count desc, f.has_minor_spot desc, f.like_count desc, f.published_at desc, f.id
  limit greatest(p_page_size, 1)
  offset greatest(p_page, 0) * greatest(p_page_size, 1);
$$;

revoke execute on function public.search_plans(int[], int, int) from public, anon;
grant execute on function public.search_plans(int[], int, int) to authenticated;

-- ============================================================
-- RPC save_plan（10.5、10.6、BR-06、BR-09）
-- 失敗はメッセージにコードを入れた例外（errcode P0001）で返す。api 側でコードを読み取る
-- ============================================================

create or replace function public.save_plan(p_plan jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := nullif(p_plan ->> 'id', '')::uuid;
  v_status text := p_plan ->> 'status';
  v_title text := btrim(coalesce(p_plan ->> 'title', ''));
  v_source uuid := nullif(p_plan ->> 'source_plan_id', '')::uuid;
  v_blocks jsonb := coalesce(p_plan -> 'blocks', '[]'::jsonb);
  v_tags int[];
  v_publish boolean;
  v_old_status text;
  v_old_published_at timestamptz;
  v_old_owner uuid;
begin
  -- 1. ログインしていなければ UNAUTHORIZED
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHORIZED';
  end if;
  if v_status is null or v_status not in ('draft', 'published') then
    raise exception using errcode = 'P0001', message = 'INVALID_STATUS';
  end if;
  if jsonb_typeof(v_blocks) <> 'array' then
    raise exception using errcode = 'P0001', message = 'INVALID_BLOCKS';
  end if;
  v_publish := v_status = 'published';
  select coalesce(array_agg(distinct x::int), '{}')
    into v_tags
    from jsonb_array_elements_text(coalesce(p_plan -> 'tag_ids', '[]'::jsonb)) x;

  -- 2. id があれば本人のプランか確認
  if v_id is not null then
    select p.user_id, p.status, p.published_at
      into v_old_owner, v_old_status, v_old_published_at
      from public.plans p where p.id = v_id;
    if not found or v_old_owner <> v_uid then
      raise exception using errcode = 'P0001', message = 'FORBIDDEN';
    end if;
  end if;

  -- 3. BR-06 の確認（10.6 の順番で、最初のコード）
  if v_publish and v_title = '' then
    raise exception using errcode = 'P0001', message = 'TITLE_REQUIRED';
  end if;
  if char_length(v_title) > 50 then
    raise exception using errcode = 'P0001', message = 'TITLE_TOO_LONG';
  end if;
  if v_publish and (select count(*) from jsonb_array_elements(v_blocks) b where b ->> 'type' = 'spot') < 2 then
    raise exception using errcode = 'P0001', message = 'SPOTS_TOO_FEW';
  end if;
  if v_publish and cardinality(v_tags) = 0 then
    raise exception using errcode = 'P0001', message = 'TAGS_REQUIRED';
  end if;
  if jsonb_array_length(v_blocks) > 30 then
    raise exception using errcode = 'P0001', message = 'BLOCKS_TOO_MANY';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_blocks) b
    where b ->> 'type' = 'comment' and char_length(btrim(coalesce(b ->> 'body', ''))) > 500
  ) then
    raise exception using errcode = 'P0001', message = 'COMMENT_TOO_LONG';
  end if;
  -- BR-03：コメントを除いて隣り合う位置に同じスポットは置けない
  if exists (
    select 1 from (
      select (b ->> 'spot_id')::int as sid,
             lag((b ->> 'spot_id')::int) over (order by ord) as prev
      from jsonb_array_elements(v_blocks) with ordinality t(b, ord)
      where b ->> 'type' = 'spot'
    ) x
    where x.sid = x.prev
  ) then
    raise exception using errcode = 'P0001', message = 'SAME_SPOT_ADJACENT';
  end if;
  -- BR-04：最初のスポットは空、2つ目以降は決まった値
  if exists (
    select 1 from (
      select nullif(b ->> 'transport_mode', '') as tm,
             row_number() over (order by ord) as rn
      from jsonb_array_elements(v_blocks) with ordinality t(b, ord)
      where b ->> 'type' = 'spot'
    ) x
    where (x.rn = 1 and x.tm is not null)
       or (x.rn > 1 and (x.tm is null or x.tm not in ('walk', 'bus', 'bicycle', 'car')))
  ) then
    raise exception using errcode = 'P0001', message = 'TRANSPORT_INVALID';
  end if;
  -- 写真は自分のフォルダのものだけ（BR-13）
  if exists (
    select 1 from jsonb_array_elements(v_blocks) b
    where nullif(b ->> 'image_path', '') is not null
      and split_part(b ->> 'image_path', '/', 1) <> v_uid::text
  ) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;
  -- コピー元が見えない（削除・他人の下書き）場合は記録しない（BR-07）
  if v_source is not null and not exists (select 1 from public.plans p where p.id = v_source) then
    v_source := null;
  end if;

  -- 4. 作成または更新（BR-09：公開日時のルール）
  if v_id is null then
    insert into public.plans (user_id, title, status, source_plan_id, published_at)
    values (v_uid, v_title, v_status, v_source, case when v_publish then now() end)
    returning id into v_id;
  else
    update public.plans p
       set title = v_title,
           status = v_status,
           source_plan_id = v_source,
           -- 初めて公開・非公開から再公開なら現在時刻。公開中の更新では変えない。下書きなら空
           published_at = case
             when not v_publish then null
             when v_old_status = 'published' then v_old_published_at
             else now()
           end
     where p.id = v_id;
  end if;

  -- 5. ブロックとタグを全部消して、送られた順に入れ直す（position は 0 から）
  delete from public.plan_blocks b where b.plan_id = v_id;
  delete from public.plan_tags pt where pt.plan_id = v_id;

  insert into public.plan_blocks (plan_id, position, block_type, spot_id, transport_mode, body, image_path)
  select
    v_id,
    (t.ord - 1)::int,
    t.b ->> 'type',
    case when t.b ->> 'type' = 'spot' then (t.b ->> 'spot_id')::int end,
    case when t.b ->> 'type' = 'spot' then nullif(t.b ->> 'transport_mode', '') end,
    case when t.b ->> 'type' = 'comment' then btrim(t.b ->> 'body') end,
    case when t.b ->> 'type' = 'spot' then nullif(t.b ->> 'image_path', '') end
  from jsonb_array_elements(v_blocks) with ordinality t(b, ord);

  insert into public.plan_tags (plan_id, tag_id)
  select v_id, x from unnest(v_tags) x;

  -- 6. プランIDを返す
  return v_id;
end;
$$;

revoke execute on function public.save_plan(jsonb) from public, anon;
grant execute on function public.save_plan(jsonb) to authenticated;
