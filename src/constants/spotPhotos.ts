// （K65）開発側が登録したスポットの写真。Wikimedia Commons の再利用できる写真を縮小して public/spot-photos に置く。
// 投稿の写真やチームの写真（spots.cover_image_path）があれば、そちらを優先する（BR-24、K50）
export type SpotPhoto = {
  author: string;
  license: string;
  licenseUrl: string | null; // パブリックドメインは null
  sourceUrl: string; // 写真の元のページ
  note?: string; // スポットそのものの写真でないときの説明など
};

export const SpotPhotos: Readonly<Record<number, SpotPhoto>> = {
  1: {
    author: '金沢市',
    license: 'CC BY 2.1 JP',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.1/jp/deed.en',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:%E9%87%91%E6%B2%A2%E9%A7%85%E9%BC%93%E9%96%80003.jpg',
  }, // 金沢駅
  2: {
    author: 'DimiTalen',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Omicho_covered_market_western_entrance,_Kanazawa,_2016.jpg',
  }, // 近江町市場
  3: {
    author: '金沢市',
    license: 'CC BY 2.1 JP',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.1/jp/deed.en',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:%E9%95%B7%E7%94%BA%E6%AD%A6%E5%AE%B6%E5%B1%8B%E6%95%B7%E8%B7%A1001.jpg',
  }, // 長町武家屋敷跡界隈
  4: {
    author: '金沢市',
    license: 'CC BY 2.1 JP',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.1/jp/deed.en',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:21st_Century_Museum_of_Contemporary_Art,_Kanazawa001.jpg',
  }, // 金沢21世紀美術館
  5: {
    author: 'Daderot',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kenrokuen_linterna_fall.JPG',
  }, // 兼六園
  6: {
    author: 'Balon Greyjoy',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:20190705_Kanazawa_Castle-3.jpg',
  }, // 金沢城公園
  7: {
    author: '金沢市',
    license: 'CC BY 2.1 JP',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.1/jp/deed.en',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:%E3%81%B2%E3%81%8C%E3%81%97%E8%8C%B6%E5%B1%8B%EF%BC%91.jpg',
  }, // ひがし茶屋街
  8: {
    author: '金沢市',
    license: 'CC BY 2.1 JP',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.1/jp/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Nishichayagai003.jpg',
  }, // にし茶屋街
  9: {
    author: 'Fred Cherrygarden',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Myoryu-ji_Temple.jpg',
  }, // 妙立寺
  10: {
    author: 'sprklg',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Gate,_Oyama_Shrine,_Kanazawa_-_Mar_9,_2007.jpg',
  }, // 尾山神社
  11: {
    author: '金沢市',
    license: 'CC BY 2.1 JP',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.1/jp/deed.en',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:%E9%88%B4%E6%9C%A8%E5%A4%A7%E6%8B%99%E9%A4%A8001.jpg',
  }, // 鈴木大拙館
  12: {
    author: 'Drivephotographer',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:National_Crafts_Museum.jpg',
  }, // 国立工芸館
  13: {
    author: 'Asturio Cantabrio',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Ishikawa_Prefectural_Library_2022-07_ac_(1).jpg',
  }, // 石川県立図書館
  17: {
    author: '金沢市',
    license: 'CC BY 2.1 JP',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.1/jp/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Higashi_chaya_gai_kyukeijo001.jpg',
  }, // 旧涌波家住宅主屋
  18: {
    author: '金沢市',
    license: 'CC BY 2.1 JP',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.1/jp/deed.en',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:%E5%AF%BA%E5%B3%B6%E8%94%B5%E4%BA%BA%E9%82%B8001.jpg',
  }, // 寺島蔵人邸跡
  19: {
    author: '金沢市',
    license: 'CC BY 2.1 JP',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.1/jp/deed.en',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:%E5%8D%AF%E8%BE%B0%E5%B1%B1%E5%85%AC%E5%9C%92%EF%BC%92.jpg',
  }, // 卯辰山公園
  20: {
    author: '金沢市',
    license: 'CC BY 2.1 JP',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.1/jp/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Teramachijiingun003.jpg',
    note: '立像寺の鐘楼',
  }, // 立像寺
  21: {
    author: 'Opqr',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Myohoji_kanazawa_teramachi.jpg',
  }, // 妙法寺
  25: {
    author: 'Saigawasakurabashi',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ohnominato_jinja.jpg',
  }, // 大野湊神社
  28: {
    author: '金沢市',
    license: 'CC BY 2.1 JP',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.1/jp/deed.en',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:%E5%A4%A7%E9%87%8E%E7%94%BA%E4%B8%A6%E3%81%BF%EF%BC%92.jpg',
    note: '周辺の大野の町並みの写真',
  }, // 大野こまちなみ公園
  29: {
    author: '663highland',
    license: 'CC BY 2.5',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.5',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:131109_Kanazawa_Yuwaku_Edomura_Kanazawa_Ishikawa_pref_Japan03s3.jpg',
  }, // 金沢湯涌江戸村
  30: {
    author: '金沢市',
    license: 'CC BY 2.1 JP',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.1/jp/deed.en',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:%E6%B9%AF%E6%B6%8C%E6%B8%A9%E6%B3%89%EF%BC%91.jpg',
    note: '周辺の湯涌温泉の写真',
  }, // 湯涌散策園
  31: {
    author: 'Yusuke.ogawa',
    license: 'パブリックドメイン',
    licenseUrl: null,
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ishikawa_Daijyouji_Sanmon.jpg',
  }, // 大乗寺
  32: {
    author: 'Akimoto',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tikamoriisekikouen.jpg',
  }, // チカモリ遺跡公園
  34: {
    author: 'Motokoka',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Japanese_garden_at_Nomura-ke.jpg',
  }, // 武家屋敷跡 野村家
  35: {
    author: '金沢市',
    license: 'CC BY 2.1 JP',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.1/jp/deed.en',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:%E4%B8%BB%E8%A8%88%E7%94%BA%E8%8C%B6%E5%B1%8B%E8%A1%97001.jpg',
  }, // 主計町茶屋街
  90001: {
    author: 'Rob Oo',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Kanazawa_Institute_of_Technology_Building_No.1_-_May_24,_2024.jpg',
  }, // 金沢工業大学
};

export function spotPhotoUrl(spotId: number): string | null {
  return SpotPhotos[spotId] ? `/spot-photos/${spotId}.jpg` : null;
}

// いま表示している写真が、このファイルの写真なら出典を返す（投稿の写真には作者の表示をしない）
export function spotPhotoCredit(spot: {
  id: number;
  latestImageUrl: string | null;
}): SpotPhoto | null {
  return spot.latestImageUrl !== null && spot.latestImageUrl === spotPhotoUrl(spot.id)
    ? (SpotPhotos[spot.id] ?? null)
    : null;
}
