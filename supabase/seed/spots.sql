-- スポットの取り込み（npm run import-spots で自動生成。手で編集しない）
-- 元のファイル：supabase/data/spots.csv（13件）
-- id をキーにした upsert。削除はしない（BR-17）。使わなくなったスポットは CSV の is_active を FALSE にする
insert into public.spots
  (id, name, description, lat, lng, google_place_id, spot_type, area, is_active, sort_order)
values
  (1, '金沢駅', '鼓門ともてなしドームが迎える金沢の玄関口。多くの路線バスがここから出る', 36.578342, 136.647983, null, 'hub', '金沢駅周辺', true, 0),
  (2, '近江町市場', '鮮魚や青果の店が並ぶ「金沢の台所」。海鮮丼や食べ歩きが楽しめる', 36.571665, 136.656146, null, 'major', '近江町市場周辺', true, 0),
  (3, '長町武家屋敷跡界隈', '土塀と石畳の路地が続く、加賀藩士の屋敷が並んでいた一帯', 36.563617, 136.65076, null, 'major', '香林坊・長町武家屋敷跡周辺', true, 0),
  (4, '金沢21世紀美術館', 'ガラス張りの円形の建物が目印の現代美術館。無料で入れる場所もある', 36.560896, 136.658152, null, 'major', '兼六園周辺', true, 0),
  (5, '兼六園', '日本三名園の一つに数えられる加賀藩の大名庭園。冬の雪吊りが有名', 36.562128, 136.662652, null, 'major', '兼六園周辺', true, 0),
  (6, '金沢城公園・玉泉院丸庭園', '加賀藩前田家の居城跡。復元された櫓や門と、夜のライトアップが見どころ', 36.565771, 136.659622, null, 'major', '兼六園周辺', true, 0),
  (7, 'ひがし茶屋街', '格子戸の茶屋建築が並ぶ、金沢を代表する茶屋街', 36.57263, 136.666446, null, 'major', 'ひがし茶屋街周辺', true, 0),
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

select count(*) as spot_count from public.spots;
