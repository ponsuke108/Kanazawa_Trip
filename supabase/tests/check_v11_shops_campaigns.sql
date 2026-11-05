-- v11 第3段階のデータベースの確認（I-36）。最後に rollback するので、データは残らない
-- 実行：Supabase の SQL Editor に貼り付けて「Run without RLS」で実行する（または psql）
-- 結果の各行の ok がすべて true なら成功（最後の all_ok が true）
-- 流れ：申請 → 承認 → 現在地を渡して投稿 → 特典の発行 → 使用済み、と、権限の確かめ（IT-19 の一部）
begin;

drop table if exists public.zz_check_results;
drop table if exists public.zz_check_ids;
drop function if exists public.zz_check_try(text);
delete from auth.users
 where id in ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b2',
              '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d2');

-- お店役、管理者、一般の利用者2人
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a2', 'shop-v11@example.com', '{"display_name": "確認のお店"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'admin-v11@example.com', '{"display_name": "確認の管理者"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'user1-v11@example.com', '{"display_name": "確認次郎"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'user2-v11@example.com', '{"display_name": "確認三郎"}');

-- 管理者は Supabase の管理画面で role を admin にする（P-14）。ここでは SQL で同じことをする
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b2';

create table public.zz_check_results (no serial, name text, ok boolean, detail text);
grant all on public.zz_check_results to authenticated, anon;
grant all on sequence public.zz_check_results_no_seq to authenticated, anon;
create table public.zz_check_ids (name text primary key, id text);
grant all on public.zz_check_ids to authenticated, anon;

create function public.zz_check_try(q text) returns text language plpgsql as $$
begin
  execute q;
  return 'ok';
exception when others then
  return sqlerrm;
end $$;
grant execute on function public.zz_check_try(text) to authenticated, anon;

-- お店のスポット（id 8）。位置の確かめに使う
insert into public.zz_check_ids select 'spot', '8';

-- ============================================================
-- 一般の利用者は role を変えられない（8.3、IT-19 の一部）
-- ============================================================

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
set local role authenticated;

insert into public.zz_check_results (name, ok, detail)
select 'role：登録した人は一般（user）', role = 'user', role
from public.profiles where id = '00000000-0000-0000-0000-0000000000c2';

insert into public.zz_check_results (name, ok, detail)
select 'role：本人が admin に変えようとしても変わらない', r <> 'ok'
  and (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000c2') = 'user', r
from public.zz_check_try($q$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c2'$q$) r;

insert into public.zz_check_results (name, ok, detail)
select 'role：表示名は本人が変えられる', r = 'ok', r
from public.zz_check_try($q$update public.profiles set display_name = '確認次郎2' where id = '00000000-0000-0000-0000-0000000000c2'$q$) r;

insert into public.zz_check_results (name, ok, detail)
select 'is_admin：一般は false', not public.is_admin(), '';

insert into public.zz_check_results (name, ok, detail)
select 'review_application：一般は呼べない（FORBIDDEN）', r = 'FORBIDDEN', r
from public.zz_check_try($q$select public.review_application(gen_random_uuid(), true, null)$q$) r;

insert into public.zz_check_results (name, ok, detail)
select 'admin_set_status：一般は呼べない（FORBIDDEN）', r = 'FORBIDDEN', r
from public.zz_check_try($q$select public.admin_set_status('spot', '8', 'inactive', null)$q$) r;

insert into public.zz_check_results (name, ok, detail)
select 'shops：一般は直接作れない', r <> 'ok', r
from public.zz_check_try($q$insert into public.shops (spot_id, owner_id, name) values (8, '00000000-0000-0000-0000-0000000000c2', '乗っ取り')$q$) r;

-- ============================================================
-- お店役が申請する（BR-26）
-- ============================================================

reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
set local role authenticated;

insert into public.zz_check_ids
select 'app', public.submit_application(jsonb_build_object(
  'spot_id', 8,
  'shop_name', '確認の喫茶店',
  'introduction', '確認のための紹介文',
  'contact_name', '確認 担当',
  'contact_email', 'tantou@example.com',
  'contact_phone', '076-000-0000',
  'campaign_draft', jsonb_build_object(
    'title', '投稿でコーヒー1杯無料',
    'benefit', 'コーヒー1杯無料',
    'notice', 'お知らせ',
    'description', '説明',
    'image_path', null,
    'starts_on', public.jst_today() - 1,
    'ends_on', public.jst_today() + 30
  )
))::text;

insert into public.zz_check_results (name, ok, detail)
select 'submit_application：申請が審査中で入る', status = 'pending', status
from public.shop_applications where id = (select id::uuid from public.zz_check_ids where name = 'app');

insert into public.zz_check_results (name, ok, detail)
select 'submit_application：審査中の申請は1つまで（LIMIT_REACHED）', r = 'LIMIT_REACHED', r
from public.zz_check_try($q$select public.submit_application('{"spot_id": 1, "shop_name": "2つ目", "contact_name": "x", "contact_email": "x@example.com", "contact_phone": "0"}')$q$) r;

-- ============================================================
-- 申請は本人と管理者だけが読める
-- ============================================================

reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
set local role authenticated;

insert into public.zz_check_results (name, ok, detail)
select 'shop_applications：ほかの利用者は担当者の連絡先を読めない', count(*) = 0, count(*)::text
from public.shop_applications;

-- 一般の利用者の、却下される申請（スポット 1）
insert into public.zz_check_ids
select 'app_rejected', public.submit_application(
  '{"spot_id": 1, "shop_name": "却下される店", "contact_name": "次郎", "contact_email": "jiro@example.com", "contact_phone": "090-0000-0000"}'
)::text;

insert into public.zz_check_results (name, ok, detail)
select 'submit_application：キャンペーンの期間が90日を超えると受け付けない', r = 'LIMIT_REACHED' or r = 'CAMPAIGN_INVALID', r
from public.zz_check_try($q$select public.submit_application('{"spot_id": 2, "shop_name": "x", "contact_name": "x", "contact_email": "x@example.com", "contact_phone": "0", "campaign_draft": {"title": "t", "benefit": "b", "starts_on": "2026-01-01", "ends_on": "2026-06-01"}}')$q$) r;

-- ============================================================
-- 管理者が審査する
-- ============================================================

reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
set local role authenticated;

insert into public.zz_check_results (name, ok, detail)
select 'shop_applications：管理者は読める', count(*) >= 2, count(*)::text
from public.shop_applications
where id in (select id::uuid from public.zz_check_ids where name in ('app', 'app_rejected'));

insert into public.zz_check_results (name, ok, detail)
select 'review_application：却下は理由が必須', r = 'REASON_REQUIRED', r
from public.zz_check_try($q$select public.review_application((select id::uuid from public.zz_check_ids where name = 'app_rejected'), false, '  ')$q$) r;

select public.review_application(
  (select id::uuid from public.zz_check_ids where name = 'app_rejected'), false, '連絡先に電話がつながりませんでした'
);
select public.review_application((select id::uuid from public.zz_check_ids where name = 'app'), true, null);

insert into public.zz_check_results (name, ok, detail)
select 'review_application：却下すると理由が残る', status = 'rejected' and reject_reason is not null, status
from public.shop_applications where id = (select id::uuid from public.zz_check_ids where name = 'app_rejected');

insert into public.zz_check_results (name, ok, detail)
select 'review_application：承認すると申請者の role がお店（official）になる', role = 'official', role
from public.profiles where id = '00000000-0000-0000-0000-0000000000a2';

insert into public.zz_check_ids select 'shop', id::text from public.shops where spot_id = 8;
insert into public.zz_check_ids
select 'campaign', c.id::text from public.campaigns c
where c.shop_id = (select id::uuid from public.zz_check_ids where name = 'shop');

insert into public.zz_check_results (name, ok, detail)
select 'review_application：お店と最初のキャンペーンができる', count(*) = 2, count(*)::text
from public.zz_check_ids where name in ('shop', 'campaign');

insert into public.zz_check_results (name, ok, detail)
select 'review_application：審査済みの申請はもう一度審査できない', r = 'FORBIDDEN', r
from public.zz_check_try($q$select public.review_application((select id::uuid from public.zz_check_ids where name = 'app'), true, null)$q$) r;

insert into public.zz_check_results (name, ok, detail)
select 'admin_actions：承認と却下が記録される', count(*) = 2, string_agg(action, ',')
from public.admin_actions
where target_id in (select id from public.zz_check_ids where name in ('app', 'app_rejected'));

-- ============================================================
-- 一般の利用者：キャンペーンの表示と、位置の確かめ（BR-27、BR-28）
-- ============================================================

reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
set local role authenticated;

insert into public.zz_check_results (name, ok, detail)
select 'spot_summaries：キャンペーン中のスポットに active_campaign_id が付く',
  active_campaign_id = (select id::uuid from public.zz_check_ids where name = 'campaign'), active_campaign_id::text
from public.spot_summaries where id = 8;

insert into public.zz_check_results (name, ok, detail)
select 'check_campaign_eligibility：お店の場所（誤差20m）なら対象', r.eligible and r.distance_m = 0
  and r.campaign_id = (select id::uuid from public.zz_check_ids where name = 'campaign'), r.distance_m::text
from public.spots s, public.check_campaign_eligibility(8, s.lat, s.lng, 20) r where s.id = 8;

insert into public.zz_check_results (name, ok, detail)
select 'check_campaign_eligibility：約200m 離れると対象でない（距離は返す）',
  not r.eligible and r.distance_m between 150 and 250, r.distance_m::text
from public.spots s, public.check_campaign_eligibility(8, s.lat + 0.0018, s.lng, 20) r where s.id = 8;

insert into public.zz_check_results (name, ok, detail)
select 'check_campaign_eligibility：誤差が100mを超えると対象でない', not r.eligible, r.distance_m::text
from public.spots s, public.check_campaign_eligibility(8, s.lat, s.lng, 150) r where s.id = 8;

insert into public.zz_check_results (name, ok, detail)
select 'check_campaign_eligibility：キャンペーンのないスポットは対象でない', not r.eligible and r.campaign_id is null, coalesce(r.distance_m::text, '')
from public.spots s, public.check_campaign_eligibility(5, s.lat, s.lng, 20) r where s.id = 5;

-- 投稿する（位置を渡す）→ 特典が出る
insert into public.zz_check_ids
select 'reward', r.reward_id::text
from public.spots s, public.save_spot_post(jsonb_build_object(
  'spot_id', 8, 'body', 'おいしかった',
  'image_paths', jsonb_build_array('00000000-0000-0000-0000-0000000000c2/p1.jpg'),
  'position', jsonb_build_object('lat', s.lat + 0.0003, 'lng', s.lng, 'accuracy', 30)
)) r
where s.id = 8;

insert into public.zz_check_results (name, ok, detail)
select 'save_spot_post：対象なら特典が出て、投稿に campaign_id が付く（キャンペーン参加）',
  r.id is not null and p.campaign_id = (select id::uuid from public.zz_check_ids where name = 'campaign')
  and r.distance_m between 20 and 50 and r.used_at is null,
  coalesce(r.distance_m::text, 'なし')
from public.campaign_rewards r
join public.spot_posts p on p.id = r.post_id
where r.id = (select nullif(id, '')::uuid from public.zz_check_ids where name = 'reward');

insert into public.zz_check_results (name, ok, detail)
select 'campaign_rewards：位置そのもの（緯度・経度）の列はない', count(*) = 0, string_agg(column_name, ',')
from information_schema.columns
where table_schema = 'public' and table_name = 'campaign_rewards' and column_name in ('lat', 'lng', 'accuracy');

insert into public.zz_check_results (name, ok, detail)
select 'save_spot_post：2回目の投稿では特典は出ない（1人1キャンペーン1回）', r.reward_id is null, coalesce(r.reward_id::text, 'null')
from public.spots s, public.save_spot_post(jsonb_build_object(
  'spot_id', 8, 'body', 'また来た',
  'image_paths', jsonb_build_array('00000000-0000-0000-0000-0000000000c2/p2.jpg'),
  'position', jsonb_build_object('lat', s.lat, 'lng', s.lng, 'accuracy', 10)
)) r
where s.id = 8;

insert into public.zz_check_results (name, ok, detail)
select 'campaign_rewards：直接は作れない', r <> 'ok', r
from public.zz_check_try($q$insert into public.campaign_rewards (campaign_id, user_id, distance_m) select id::uuid, '00000000-0000-0000-0000-0000000000c2', 0 from public.zz_check_ids where name = 'campaign'$q$) r;

-- 特典を使う
select public.use_reward((select id::uuid from public.zz_check_ids where name = 'reward'));
insert into public.zz_check_results (name, ok, detail)
select 'use_reward：使用済みになる', used_at is not null, used_at::text
from public.campaign_rewards where id = (select id::uuid from public.zz_check_ids where name = 'reward');
insert into public.zz_check_results (name, ok, detail)
select 'use_reward：使用済みはもう一度使えない（CAMPAIGN_NOT_ELIGIBLE）', r = 'CAMPAIGN_NOT_ELIGIBLE', r
from public.zz_check_try($q$select public.use_reward((select id::uuid from public.zz_check_ids where name = 'reward'))$q$) r;

-- ============================================================
-- ほかの利用者は特典を読めない
-- ============================================================

reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d2';
set local role authenticated;

insert into public.zz_check_results (name, ok, detail)
select 'campaign_rewards：ほかの利用者は読めない', count(*) = 0, count(*)::text from public.campaign_rewards;
insert into public.zz_check_results (name, ok, detail)
select 'use_reward：ほかの人の特典は使えない', r = 'CAMPAIGN_NOT_ELIGIBLE', r
from public.zz_check_try($q$select public.use_reward((select id::uuid from public.zz_check_ids where name = 'reward'))$q$) r;
insert into public.zz_check_results (name, ok, detail)
select 'admin_actions：一般は読めない', count(*) = 0, count(*)::text from public.admin_actions;

-- ============================================================
-- お店：自分のスポットに投稿できない、特典の数を数えられる、キャンペーンの決まり
-- ============================================================

reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
set local role authenticated;

insert into public.zz_check_results (name, ok, detail)
select 'save_spot_post：お店は自分のお店のスポットに投稿できない（FORBIDDEN）', r = 'FORBIDDEN', r
from public.zz_check_try($q$select * from public.save_spot_post('{"spot_id": 8, "body": "自作自演", "image_paths": ["00000000-0000-0000-0000-0000000000a2/x.jpg"]}')$q$) r;

insert into public.zz_check_results (name, ok, detail)
select 'campaign_rewards：お店は自分のお店の特典の数と使用済みの数を読める',
  count(*) = 1 and count(used_at) = 1, count(*)::text || '/' || count(used_at)::text
from public.campaign_rewards;

insert into public.zz_check_results (name, ok, detail)
select 'campaigns：同時に行えるキャンペーンは1つ', r <> 'ok', r
from public.zz_check_try($q$insert into public.campaigns (shop_id, title, benefit, starts_on, ends_on) select id::uuid, '2つ目', '特典', current_date, current_date + 10 from public.zz_check_ids where name = 'shop'$q$) r;

update public.campaigns set title = '変えた題名'
 where id = (select id::uuid from public.zz_check_ids where name = 'campaign');
insert into public.zz_check_results (name, ok, detail)
select 'campaigns：お店はキャンペーンを変えられる', title = '変えた題名', title
from public.campaigns where id = (select id::uuid from public.zz_check_ids where name = 'campaign');

insert into public.zz_check_results (name, ok, detail)
select 'campaigns：お店は stopped にできない', r <> 'ok', r
from public.zz_check_try($q$update public.campaigns set status = 'stopped' where id = (select id::uuid from public.zz_check_ids where name = 'campaign')$q$) r;

insert into public.zz_check_results (name, ok, detail)
select 'campaigns：期間は最長90日', r <> 'ok', r
from public.zz_check_try($q$update public.campaigns set ends_on = starts_on + 120 where id = (select id::uuid from public.zz_check_ids where name = 'campaign')$q$) r;

insert into public.zz_check_results (name, ok, detail)
select 'shops：お店は名前を変えられるが、status は変えられない', r1 = 'ok' and r2 <> 'ok', r1 || ' / ' || r2
from public.zz_check_try($q$update public.shops set name = '確認の喫茶店2' where id = (select id::uuid from public.zz_check_ids where name = 'shop')$q$) r1,
     public.zz_check_try($q$update public.shops set status = 'active' where id = (select id::uuid from public.zz_check_ids where name = 'shop')$q$) r2;

insert into public.zz_check_results (name, ok, detail)
select 'submit_application：お店になった人は申請できない', r = 'FORBIDDEN', r
from public.zz_check_try($q$select public.submit_application('{"spot_id": 3, "shop_name": "x", "contact_name": "x", "contact_email": "x@example.com", "contact_phone": "0"}')$q$) r;

-- ============================================================
-- 管理者の操作（BR-29）
-- ============================================================

reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
set local role authenticated;

select public.admin_set_status('campaign', (select id from public.zz_check_ids where name = 'campaign'), 'stopped', '不適切な表現');
select public.admin_set_status('post', (select p.id::text from public.spot_posts p where p.body = 'おいしかった'), 'hidden', null);

insert into public.zz_check_results (name, ok, detail)
select 'admin_set_status：キャンペーンを止めると、スポットはキャンペーン中でなくなる', active_campaign_id is null, coalesce(active_campaign_id::text, 'null')
from public.spot_summaries where id = 8;

insert into public.zz_check_results (name, ok, detail)
select 'admin_set_status：管理者は非表示の投稿も読める', count(*) = 1, count(*)::text
from public.spot_posts where body = 'おいしかった' and is_hidden;

insert into public.zz_check_results (name, ok, detail)
select 'admin_set_status：知らない対象は NOT_FOUND', r = 'NOT_FOUND', r
from public.zz_check_try($q$select public.admin_set_status('shop', gen_random_uuid()::text, 'suspended', null)$q$) r;

reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
set local role authenticated;

insert into public.zz_check_results (name, ok, detail)
select 'campaigns：管理者が止めたキャンペーンはお店が変えられない',
  (select title from public.campaigns where id = (select id::uuid from public.zz_check_ids where name = 'campaign')) = '変えた題名', r
from public.zz_check_try($q$update public.campaigns set title = '勝手に再開', status = 'active' where id = (select id::uuid from public.zz_check_ids where name = 'campaign')$q$) r;

insert into public.zz_check_results (name, ok, detail)
select 'spot_posts：非表示の投稿は、ほかの利用者に見えない', count(*) = 0, count(*)::text
from public.spot_posts where body = 'おいしかった';

reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
set local role authenticated;

insert into public.zz_check_results (name, ok, detail)
select 'spot_posts：非表示の投稿も、本人には見える', count(*) = 1, count(*)::text
from public.spot_posts where body = 'おいしかった';

reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
set local role authenticated;

select public.admin_set_status('shop', (select id from public.zz_check_ids where name = 'shop'), 'suspended', null);
select public.admin_set_status('spot', '8', 'inactive', '閉店');

insert into public.zz_check_results (name, ok, detail)
select 'admin_set_status：お店を止めても、お店の人の種類は一般に戻らない', role = 'official', role
from public.profiles where id = '00000000-0000-0000-0000-0000000000a2';

insert into public.zz_check_results (name, ok, detail)
select 'admin_set_status：スポットを使用中止にできる', not is_active, is_active::text
from public.spots where id = 8;

insert into public.zz_check_results (name, ok, detail)
select 'admin_actions：どの操作も記録される（承認・却下・停止・非表示・お店・スポット）', count(*) = 6, string_agg(action, ',' order by id)
from public.admin_actions where admin_id = '00000000-0000-0000-0000-0000000000b2';

-- ============================================================
-- 未ログイン（anon）
-- ============================================================

reset role;
set local role anon;

insert into public.zz_check_results (name, ok, detail)
select 'anon：submit_application は呼べない', r <> 'ok', r
from public.zz_check_try($q$select public.submit_application('{}')$q$) r;
insert into public.zz_check_results (name, ok, detail)
select 'anon：check_campaign_eligibility は呼べない', r <> 'ok', r
from public.zz_check_try($q$select * from public.check_campaign_eligibility(8, 36.5, 136.6, 10)$q$) r;
insert into public.zz_check_results (name, ok, detail)
select 'anon：お店・キャンペーンは読めない', r1 <> 'ok' and r2 <> 'ok', r1 || ' / ' || r2
from public.zz_check_try('select * from public.shops') r1, public.zz_check_try('select * from public.campaigns') r2;

reset role;

select no, ok, name, detail from public.zz_check_results order by no;
select bool_and(ok) as all_ok from public.zz_check_results;

rollback;
