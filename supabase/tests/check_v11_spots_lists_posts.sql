-- v11 のデータベースの確認（I-26）。最後に rollback するので、データは残らない
-- 実行：Supabase の SQL Editor に貼り付けて実行する（または psql）
-- 結果の各行の ok がすべて true なら成功
begin;

-- 利用者を2人作る（登録時のトリガーで profiles ができる）
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'taro-v11@example.com', '{"display_name": "確認太郎"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'hanako-v11@example.com', '{"display_name": "確認花子"}');

create temp table results (no serial, name text, ok boolean, detail text);
grant all on results to authenticated, anon;
grant all on sequence results_no_seq to authenticated, anon;
create temp table ids (name text primary key, id text);
grant all on ids to authenticated, anon;

-- SQL を実行して、エラーならそのメッセージ、成功なら 'ok' を返す
create function pg_temp.try(q text) returns text language plpgsql as $$
begin
  execute q;
  return 'ok';
exception when others then
  return sqlerrm;
end $$;
grant execute on function pg_temp.try(text) to authenticated, anon;

-- ============================================================
-- 今あるスポット（id 1〜33）とデモ用のスポット
-- ============================================================

insert into results (name, ok, detail)
select '今あるスポット（id 1〜33）がそのまま残る', count(*) = 33, count(*)::text
from public.spots where id between 1 and 33 and source = 'curated';

insert into results (name, ok, detail)
select 'デモ用のスポット（90001）が入る', count(*) = 1, string_agg(name, ',')
from public.spots where id = 90001 and is_demo and osm_ref = 'way/295949646';

-- ============================================================
-- 確認太郎として操作する
-- ============================================================

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;

insert into results (name, ok, detail)
select 'spot_summaries：今あるスポットとデモ用のスポットが読める', count(*) = 34, count(*)::text
from public.spot_summaries where id between 1 and 33 or id = 90001;

-- register_spot（BR-20）
insert into ids select 'new_spot', r.spot_id::text from public.register_spot(
  '{"osm_ref": "node/900000001", "name": "  確認の甘味処  ", "lat": 36.5700, "lng": 136.6600, "address": "石川県金沢市確認町1", "place_kind": "飲食店"}'
) r;
insert into results (name, ok, detail)
select 'register_spot：新しい場所は 100001 からの id で登録される', s.id >= 100001
  and s.source = 'user' and s.spot_type = 'minor' and s.name = '確認の甘味処'
  and s.created_by = '00000000-0000-0000-0000-0000000000a1' and s.area is null and s.description is null,
  s.id::text || ' ' || s.name
from public.spots s where s.id = (select id::int from ids where name = 'new_spot');

insert into results (name, ok, detail)
select 'register_spot：同じ osm_ref なら同じ id を返す（reused）',
  r.spot_id = (select id::int from ids where name = 'new_spot') and r.reused, r.spot_id::text
from public.register_spot('{"osm_ref": "node/900000001", "name": "別の名前", "lat": 36.5701, "lng": 136.6601}') r;

insert into results (name, ok, detail)
select 'register_spot：50m 以内の同じ名前なら既存のスポット（兼六園）を返す', r.spot_id = 5 and r.reused, r.spot_id::text
from public.register_spot('{"osm_ref": "way/900000002", "name": "兼六園", "lat": 36.56230, "lng": 136.66280}') r;

insert into results (name, ok, detail)
select 'register_spot：同じ名前でも 50m より遠ければ新しく登録する', not r.reused, r.spot_id::text
from public.register_spot('{"osm_ref": "node/900000003", "name": "兼六園", "lat": 36.5700, "lng": 136.6700}') r;

insert into results (name, ok, detail)
select 'register_spot：金沢市の範囲の外は OUT_OF_AREA', r = 'OUT_OF_AREA', r
from pg_temp.try($q$select * from public.register_spot('{"osm_ref": "node/900000004", "name": "東京駅", "lat": 35.6812, "lng": 139.7671}')$q$) r;

insert into results (name, ok, detail)
select 'register_spot：osm_ref がなければ登録できない', r = 'INVALID_CANDIDATE', r
from pg_temp.try($q$select * from public.register_spot('{"name": "名前だけ", "lat": 36.57, "lng": 136.66}')$q$) r;

insert into results (name, ok, detail)
select 'spots：表に直接は追加できない（RPC だけ）', r <> 'ok', r
from pg_temp.try($q$insert into public.spots (id, name, description, lat, lng, spot_type, area) values (99999, 'x', 'x', 36.57, 136.66, 'minor', 'その他')$q$) r;

insert into results (name, ok, detail)
select 'spots：表を直接は変えられない', r <> 'ok' or (select name from public.spots where id = 5) = '兼六園', r
from pg_temp.try($q$update public.spots set name = '乗っ取り' where id = 5$q$) r;

-- リスト（BR-18）
with x as (
  insert into public.lists (user_id, name) values ('00000000-0000-0000-0000-0000000000a1', '行きたい店') returning id
)
insert into ids select 'list1', id::text from x;
insert into public.lists (user_id, name)
select '00000000-0000-0000-0000-0000000000a1', 'リスト' || g from generate_series(2, 20) g;
insert into results (name, ok, detail)
select 'lists：21個目は LIMIT_REACHED', r = 'LIMIT_REACHED', r
from pg_temp.try($q$insert into public.lists (user_id, name) values ('00000000-0000-0000-0000-0000000000a1', '21個目')$q$) r;

insert into results (name, ok, detail)
select 'lists：前後に空白のある名前は入らない（画面で取り除く）', r <> 'ok', r
from pg_temp.try($q$update public.lists set name = ' 空白 ' where name = 'リスト2'$q$) r;

insert into ids select 'list2', id::text from public.lists where name = 'リスト2';

insert into public.list_spots (list_id, spot_id)
select (select id::uuid from ids where name = 'list1'), 1;
insert into results (name, ok, detail)
select 'list_spots：同じスポットは2回入らない', r like '%duplicate key%', r
from pg_temp.try($q$insert into public.list_spots (list_id, spot_id) select id::uuid, 1 from ids where name = 'list1'$q$) r;

insert into public.list_spots (list_id, spot_id)
select (select id::uuid from ids where name = 'list1'), s.id from public.spots s where s.id between 2 and 30;
insert into results (name, ok, detail)
select 'list_spots：31件目は LIMIT_REACHED', r = 'LIMIT_REACHED', r
from pg_temp.try($q$insert into public.list_spots (list_id, spot_id) select id::uuid, 31 from ids where name = 'list1'$q$) r;

-- スポットの投稿（BR-21）
insert into ids select 'post1', r.post_id::text from public.save_spot_post(
  '{"id": null, "spot_id": 8, "body": "  夕方の茶屋街が静か  ", "image_paths": ["00000000-0000-0000-0000-0000000000a1/p1.jpg", "00000000-0000-0000-0000-0000000000a1/p2.jpg"], "position": null}'
) r;
insert into results (name, ok, detail)
select 'save_spot_post：投稿と写真が保存される（ひとことの前後の空白を取り除く）',
  p.body = '夕方の茶屋街が静か' and (select count(*) from public.spot_post_images i where i.post_id = p.id) = 2,
  p.body
from public.spot_posts p where p.id = (select id::uuid from ids where name = 'post1');

insert into results (name, ok, detail)
select 'spot_summaries：投稿の写真がピンの写真になり、地図に出る',
  latest_image_path = '00000000-0000-0000-0000-0000000000a1/p1.jpg' and on_map and post_count = 1,
  coalesce(latest_image_path, 'null')
from public.spot_summaries where id = 8;

insert into results (name, ok, detail)
select 'save_spot_post：写真が0枚なら保存できない', r = 'POST_IMAGES_INVALID', r
from pg_temp.try($q$select * from public.save_spot_post('{"id": null, "spot_id": 8, "body": "a", "image_paths": []}')$q$) r;

insert into results (name, ok, detail)
select 'save_spot_post：写真が5枚なら保存できない', r = 'POST_IMAGES_INVALID', r
from pg_temp.try($q$select * from public.save_spot_post('{"id": null, "spot_id": 8, "body": "a", "image_paths": ["00000000-0000-0000-0000-0000000000a1/1.jpg","00000000-0000-0000-0000-0000000000a1/2.jpg","00000000-0000-0000-0000-0000000000a1/3.jpg","00000000-0000-0000-0000-0000000000a1/4.jpg","00000000-0000-0000-0000-0000000000a1/5.jpg"]}')$q$) r;

insert into results (name, ok, detail)
select 'save_spot_post：ひとことが空なら保存できない', r = 'POST_BODY_INVALID', r
from pg_temp.try($q$select * from public.save_spot_post('{"id": null, "spot_id": 8, "body": "   ", "image_paths": ["00000000-0000-0000-0000-0000000000a1/1.jpg"]}')$q$) r;

insert into results (name, ok, detail)
select 'save_spot_post：他人のフォルダの写真は使えない', r = 'FORBIDDEN', r
from pg_temp.try($q$select * from public.save_spot_post('{"id": null, "spot_id": 8, "body": "a", "image_paths": ["other/1.jpg"]}')$q$) r;

insert into results (name, ok, detail)
select 'spot_posts：表に直接は追加できない（RPC だけ）', r <> 'ok', r
from pg_temp.try($q$insert into public.spot_posts (user_id, spot_id, body) values ('00000000-0000-0000-0000-0000000000a1', 8, 'x')$q$) r;

-- 共有（BR-30）
insert into ids select 'plan', public.save_plan('{
  "id": null, "title": "共有の確認", "status": "draft", "source_plan_id": null, "tag_ids": [],
  "blocks": [{"type": "spot", "spot_id": 1, "transport_mode": null, "image_path": null}]}'::jsonb)::text;
update public.plans set share_token = 'abcdefghijklmnopqrstuvwxyz012345'
 where id = (select id::uuid from ids where name = 'plan');
insert into results (name, ok, detail)
select 'plans：本人は合言葉を付けられる', share_token is not null, coalesce(share_token, 'null')
from public.plans where id = (select id::uuid from ids where name = 'plan');

insert into results (name, ok, detail)
select 'plans：合言葉は32文字だけ', r <> 'ok', r
from pg_temp.try($q$update public.plans set share_token = 'short' where id = (select id::uuid from ids where name = 'plan')$q$) r;

-- ============================================================
-- 確認花子として操作する
-- ============================================================

reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
set local role authenticated;

insert into results (name, ok, detail)
select 'RLS：他人のリストは見えない', count(*) = 0, count(*)::text from public.lists;
insert into results (name, ok, detail)
select 'RLS：他人のリストのスポットも見えない', count(*) = 0, count(*)::text from public.list_spots;

insert into results (name, ok, detail)
select 'RLS：他人のリストにスポットを入れられない', r like '%row-level security%', r
from pg_temp.try($q$insert into public.list_spots (list_id, spot_id) select id::uuid, 32 from ids where name = 'list2'$q$) r;

insert into results (name, ok, detail)
select 'RLS：表示中の投稿は他の利用者も見られる', count(*) = 1, count(*)::text
from public.spot_posts where id = (select id::uuid from ids where name = 'post1');

insert into results (name, ok, detail)
select 'save_spot_post：他人の投稿は直せない', r = 'FORBIDDEN', r
from pg_temp.try($q$select * from public.save_spot_post(jsonb_build_object('id', (select id from ids where name = 'post1'), 'spot_id', 8, 'body', '乗っ取り', 'image_paths', '["00000000-0000-0000-0000-0000000000b1/x.jpg"]'::jsonb))$q$) r;

delete from public.spot_posts where id = (select id::uuid from ids where name = 'post1');
insert into results (name, ok, detail)
select 'RLS：他人の投稿は消せない', count(*) = 1, count(*)::text
from public.spot_posts where id = (select id::uuid from ids where name = 'post1');

update public.plans set share_token = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'
 where id = (select id::uuid from ids where name = 'plan');
reset role;
insert into results (name, ok, detail)
select 'RLS：他人のプランに合言葉を付けられない', share_token = 'abcdefghijklmnopqrstuvwxyz012345', share_token
from public.plans where id = (select id::uuid from ids where name = 'plan');

-- 管理者が非表示にした投稿（I-36 では admin_set_status で行う。ここでは直接変える）
update public.spot_posts set is_hidden = true where id = (select id::uuid from ids where name = 'post1');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
set local role authenticated;
insert into results (name, ok, detail)
select 'RLS：非表示の投稿は他の利用者に見えない', count(*) = 0, count(*)::text
from public.spot_posts where id = (select id::uuid from ids where name = 'post1');
insert into results (name, ok, detail)
select 'spot_summaries：非表示の投稿の写真は使わない', not on_map and post_count = 0 and latest_image_path is null,
  coalesce(latest_image_path, 'null')
from public.spot_summaries where id = 8;

reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
insert into results (name, ok, detail)
select 'RLS：非表示の投稿も本人には見える', count(*) = 1, count(*)::text
from public.spot_posts where id = (select id::uuid from ids where name = 'post1');

-- ============================================================
-- 未ログイン（anon）
-- ============================================================

reset role;
set local request.jwt.claim.sub = '';
set local role anon;

insert into results (name, ok, detail)
select 'anon：共有のプランは合言葉で見られる',
  (r ->> 'title') = '共有の確認' and (r ->> 'author_name') = '確認太郎'
  and jsonb_array_length(r -> 'blocks') = 1 and not (r ? 'user_id'),
  coalesce(r ->> 'title', 'null')
from (select public.get_shared_plan('abcdefghijklmnopqrstuvwxyz012345') as r) x;

insert into results (name, ok, detail)
select 'anon：違う合言葉では何も返らない', r is null, coalesce(r::text, 'null')
from (select public.get_shared_plan('abcdefghijklmnopqrstuvwxyz000000') as r) x;

insert into results (name, ok, detail)
select 'anon：プランの表は読めない', r <> 'ok' or (select count(*) from public.plans) = 0, r
from pg_temp.try('select * from public.plans') r;
insert into results (name, ok, detail)
select 'anon：spot_summaries は読めない', r <> 'ok', r
from pg_temp.try('select * from public.spot_summaries') r;
insert into results (name, ok, detail)
select 'anon：リストは読めない', r <> 'ok', r
from pg_temp.try('select * from public.lists') r;
insert into results (name, ok, detail)
select 'anon：投稿は読めない', r <> 'ok', r
from pg_temp.try('select * from public.spot_posts') r;
insert into results (name, ok, detail)
select 'anon：register_spot は呼べない', r <> 'ok', r
from pg_temp.try($q$select * from public.register_spot('{"osm_ref": "node/1", "name": "x", "lat": 36.57, "lng": 136.66}')$q$) r;
insert into results (name, ok, detail)
select 'anon：save_spot_post は呼べない', r <> 'ok', r
from pg_temp.try($q$select * from public.save_spot_post('{"spot_id": 8, "body": "x", "image_paths": ["a/b.jpg"]}')$q$) r;
insert into results (name, ok, detail)
select 'anon：search_plans は呼べない', r <> 'ok', r
from pg_temp.try('select * from public.search_plans()') r;

reset role;

select no, ok, name, detail from results order by no;
select bool_and(ok) as all_ok from results;

rollback;
