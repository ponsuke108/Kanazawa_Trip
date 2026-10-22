-- RLS と RPC の確認（I-18）。最後に rollback するので、データは残らない
-- 実行：psql で、または Supabase の SQL Editor に貼り付けて実行する
-- 結果の各行の ok がすべて true なら成功
begin;

-- 利用者を2人作る（登録時のトリガーで profiles ができる）
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'taro-check@example.com', '{"display_name": "確認太郎"}'),
  ('00000000-0000-0000-0000-00000000000b', 'hanako-check@example.com', '{"display_name": "確認花子"}');

create temp table results (no serial, name text, ok boolean, detail text);
grant all on results to authenticated, anon;
grant all on sequence results_no_seq to authenticated, anon;
create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;

-- 確認太郎として操作する
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;

insert into results (name, ok, detail)
select 'profiles がトリガーで作られる', count(*) = 2, string_agg(display_name, ',') from public.profiles
where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');

-- 公開：定番だけのプラン（金沢駅→近江町市場→兼六園）、写真タグ
insert into ids select 'taro_major', public.save_plan('{
  "id": null, "title": "定番だけ", "status": "published", "source_plan_id": null, "tag_ids": [4, 2],
  "blocks": [
    {"type": "spot", "spot_id": 1, "transport_mode": null, "image_path": null},
    {"type": "spot", "spot_id": 2, "transport_mode": "bus", "image_path": null},
    {"type": "comment", "body": "  朝が空いている  "},
    {"type": "spot", "spot_id": 5, "transport_mode": "walk", "image_path": "00000000-0000-0000-0000-00000000000a/x.jpg"}
  ]}'::jsonb);

-- 下書き：スポット1つでもよい
insert into ids select 'taro_draft', public.save_plan('{
  "id": null, "title": "", "status": "draft", "source_plan_id": null, "tag_ids": [],
  "blocks": [{"type": "spot", "spot_id": 4, "transport_mode": null, "image_path": null}]}'::jsonb);

insert into results (name, ok, detail)
select '保存：ブロックの並びと前後の空白', string_agg(coalesce(b.body, b.spot_id::text), '|' order by b.position) = '1|2|朝が空いている|5',
       string_agg(coalesce(b.body, b.spot_id::text), '|' order by b.position)
from public.plan_blocks b where b.plan_id = (select id from ids where name = 'taro_major');

insert into results (name, ok, detail)
select '保存：公開日時が入る（BR-09）', published_at is not null, published_at::text
from public.plans where id = (select id from ids where name = 'taro_major');

insert into results (name, ok, detail)
select 'ビュー：定番だけなら has_minor_spot は false、写真の表紙', not has_minor_spot and cover_image_path is not null,
       has_minor_spot::text || ' ' || coalesce(cover_image_path, '')
from public.plan_summaries where id = (select id from ids where name = 'taro_major');

-- 公開時の確認（10.6）
do $$
declare
  cases jsonb := '[
    ["TITLE_REQUIRED", {"title": "", "tag_ids": [1], "blocks": [{"type":"spot","spot_id":1,"transport_mode":null},{"type":"spot","spot_id":2,"transport_mode":"walk"}]}],
    ["SPOTS_TOO_FEW", {"title": "a", "tag_ids": [1], "blocks": [{"type":"spot","spot_id":1,"transport_mode":null}]}],
    ["TAGS_REQUIRED", {"title": "a", "tag_ids": [], "blocks": [{"type":"spot","spot_id":1,"transport_mode":null},{"type":"spot","spot_id":2,"transport_mode":"walk"}]}],
    ["SAME_SPOT_ADJACENT", {"title": "a", "tag_ids": [1], "blocks": [{"type":"spot","spot_id":1,"transport_mode":null},{"type":"comment","body":"x"},{"type":"spot","spot_id":1,"transport_mode":"walk"}]}],
    ["TRANSPORT_INVALID", {"title": "a", "tag_ids": [1], "blocks": [{"type":"spot","spot_id":1,"transport_mode":"bus"},{"type":"spot","spot_id":2,"transport_mode":"walk"}]}],
    ["FORBIDDEN", {"title": "a", "tag_ids": [1], "blocks": [{"type":"spot","spot_id":1,"transport_mode":null,"image_path":"other/x.jpg"},{"type":"spot","spot_id":2,"transport_mode":"walk"}]}]
  ]';
  c jsonb;
  got text;
begin
  for c in select * from jsonb_array_elements(cases) loop
    begin
      perform public.save_plan((c -> 1) || '{"id": null, "status": "published", "source_plan_id": null}'::jsonb);
      got := '（例外なし）';
    exception when sqlstate 'P0001' then
      got := sqlerrm;
    end;
    insert into results (name, ok, detail) values ('公開時の確認：' || (c ->> 0), got = c ->> 0, got);
  end loop;
end $$;

-- 確認花子として操作する
reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
set local role authenticated;

-- 定番以外を含むプラン（金沢駅→にし茶屋街）、写真タグ。コピー元は太郎の公開プラン
insert into ids select 'hanako_minor', public.save_plan(jsonb_build_object(
  'id', null, 'title', '静かな茶屋街', 'status', 'published',
  'source_plan_id', (select id from ids where name = 'taro_major'), 'tag_ids', '[4]'::jsonb,
  'blocks', '[{"type":"spot","spot_id":1,"transport_mode":null},{"type":"spot","spot_id":8,"transport_mode":"walk"}]'::jsonb));

insert into results (name, ok, detail)
select 'RLS：他人の下書きは見えない', count(*) = 0, count(*)::text
from public.plans where id = (select id from ids where name = 'taro_draft');

insert into results (name, ok, detail)
select 'RLS：他人の下書きのブロックも見えない', count(*) = 0, count(*)::text
from public.plan_blocks where plan_id = (select id from ids where name = 'taro_draft');

do $$
begin
  perform public.save_plan(jsonb_build_object('id', (select id from ids where name = 'taro_major'),
    'title', '乗っ取り', 'status', 'draft', 'tag_ids', '[]'::jsonb, 'blocks', '[]'::jsonb));
  insert into results (name, ok, detail) values ('RPC：他人のプランは保存できない', false, '保存できてしまった');
exception when sqlstate 'P0001' then
  insert into results (name, ok, detail) values ('RPC：他人のプランは保存できない', sqlerrm = 'FORBIDDEN', sqlerrm);
end $$;

update public.plans set title = '乗っ取り' where id = (select id from ids where name = 'taro_major');
insert into results (name, ok, detail)
select 'RLS：他人のプランは更新できない', title = '定番だけ', title
from public.plans where id = (select id from ids where name = 'taro_major');

-- いいね：他人の公開プランにはできる、自分のプランにはできない（BR-08）
insert into public.likes (user_id, plan_id)
values ('00000000-0000-0000-0000-00000000000b', (select id from ids where name = 'taro_major'));
insert into results (name, ok, detail)
select 'いいね：他人の公開プラン', like_count = 1, like_count::text
from public.plan_summaries where id = (select id from ids where name = 'taro_major');

do $$
begin
  insert into public.likes (user_id, plan_id)
  values ('00000000-0000-0000-0000-00000000000b', (select id from ids where name = 'hanako_minor'));
  insert into results (name, ok, detail) values ('いいね：自分のプランにはできない', false, 'できてしまった');
exception when insufficient_privilege then
  insert into results (name, ok, detail) values ('いいね：自分のプランにはできない', true, sqlstate);
end $$;

-- 検索（BR-01）：写真で、一致数が同じなら定番以外を含む花子のプランが先
insert into results (name, ok, detail)
select '検索：写真で定番以外を含むプランが先', string_agg(title, ',' order by rn) = '静かな茶屋街,定番だけ',
       string_agg(title, ',' order by rn) || ' total=' || max(total_count)
from (select title, total_count, row_number() over () as rn from public.search_plans(array[4])) s;

insert into results (name, ok, detail)
select '検索：一致数の多い順（写真と景観）', string_agg(title, ',' order by rn) = '定番だけ,静かな茶屋街',
       string_agg(title, ',' order by rn)
from (select title, row_number() over () as rn from public.search_plans(array[4, 2])) s;

insert into results (name, ok, detail)
select '検索：下書きは出ない', count(*) = 2, count(*)::text from public.search_plans('{}');

-- 太郎が非公開に戻すと、花子のいいねしたプランや検索から消え、コピー元の表示も消える（BR-09、BR-07）
reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
update public.plans set status = 'draft', published_at = null where id = (select id from ids where name = 'taro_major');

reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
set local role authenticated;
insert into results (name, ok, detail)
select '非公開：いいねしたプランから消える', count(*) = 0, count(*)::text
from public.likes l join public.plan_summaries s on s.id = l.plan_id
where l.user_id = '00000000-0000-0000-0000-00000000000b';
insert into results (name, ok, detail)
select '非公開：検索から消える', count(*) = 1, count(*)::text from public.search_plans('{}');

-- 未ログイン（anon）は何も読めない
reset role;
set local request.jwt.claim.sub = '';
set local role anon;
insert into results (name, ok, detail)
select 'anon：プランは読めない', count(*) = 0, count(*)::text from public.plans;
reset role;

select no, ok, name, detail from results order by no;
select bool_and(ok) as all_ok from results;

rollback;
