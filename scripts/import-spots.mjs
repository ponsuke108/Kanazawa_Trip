// スポットCSVの変換スクリプト（要件定義書 9.6、BR-17）。追加のライブラリを使わず Node.js だけで動く
//
// 使い方：npm run import-spots
//   supabase/data/spots.csv を読み、確認して、supabase/seed/spots.sql を作る。
//   別のファイルを使うとき：npm run import-spots -- 入力.csv 出力.sql
//
// 作った SQL は、Supabase 管理画面の SQL Editor に貼り付けるか psql で実行する。
// 中身は id をキーにした upsert（あれば更新、なければ追加）で、削除はしない。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = resolve(ROOT, process.argv[2] ?? 'supabase/data/spots.csv');
const output = resolve(ROOT, process.argv[3] ?? 'supabase/seed/spots.sql');

// 列名と順番は変えない（9.6）
const COLUMNS = [
  'id',
  'name',
  'spot_type',
  'area',
  'description',
  'lat',
  'lng',
  'google_place_id',
  'sort_order',
  'is_active',
  'source',
  'added_by',
  'checked',
];
const REQUIRED = COLUMNS.filter((c) => c !== 'google_place_id' && c !== 'sort_order');
const SPOT_TYPES = ['major', 'minor', 'hub'];
// 金沢市の付近（9.6）
const LAT = [36.4, 36.7];
const LNG = [136.5, 136.9];

// エリア一覧は src/constants/areas.ts から読む（1か所で管理するため）
function loadAreas() {
  const src = readFileSync(resolve(ROOT, 'src/constants/areas.ts'), 'utf8');
  const body = src.slice(src.indexOf('['), src.indexOf(']'));
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

// RFC 4180 の CSV を読む（ダブルクォート、カンマ、改行を含む値に対応）。行番号も返す
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        if (c === '\n') line++;
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push({ line: rowLine, cells: row });
      row = [];
      field = '';
      line++;
      rowLine = line;
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push({ line: rowLine, cells: row });
  }
  return rows.filter((r) => r.cells.some((c) => c.trim() !== ''));
}

function sqlText(s) {
  return `'${s.replace(/'/g, "''")}'`;
}

function main() {
  const areas = loadAreas();
  const rows = parseCsv(readFileSync(input, 'utf8'));
  const errors = [];
  const fail = (line, msg) => errors.push(`${line}行目：${msg}`);

  if (rows.length === 0) {
    console.error('CSV が空です');
    process.exit(1);
  }
  const header = rows[0].cells.map((c) => c.trim());
  if (header.join(',') !== COLUMNS.join(',')) {
    console.error(
      `1行目の列名が決まりと違います。\n  期待：${COLUMNS.join(',')}\n  実際：${header.join(',')}`,
    );
    process.exit(1);
  }

  const spots = [];
  const seenIds = new Map();
  const seenNames = new Map();
  for (const { line, cells } of rows.slice(1)) {
    if (cells.length !== COLUMNS.length) {
      fail(line, `列の数が ${cells.length} 個です（${COLUMNS.length} 個のはず）`);
      continue;
    }
    const r = Object.fromEntries(COLUMNS.map((c, i) => [c, cells[i].trim()]));
    const before = errors.length;

    if (!['TRUE', 'FALSE'].includes(r.checked.toUpperCase())) {
      fail(line, 'checked は TRUE か FALSE です');
      continue;
    }
    // PMが確認済み（checked = TRUE）の行だけ確認して取り込む。FALSE の行は集めている途中なので飛ばす
    if (r.checked.toUpperCase() !== 'TRUE') continue;
    for (const c of REQUIRED) if (r[c] === '') fail(line, `${c} が空です`);

    if (r.id !== '' && !/^\d+$/.test(r.id)) fail(line, `id「${r.id}」は正の整数にしてください`);
    if (r.id !== '' && seenIds.has(r.id))
      fail(line, `id「${r.id}」が ${seenIds.get(r.id)}行目と重複しています`);
    if (r.name !== '' && seenNames.has(r.name)) {
      fail(line, `name「${r.name}」が ${seenNames.get(r.name)}行目と重複しています`);
    }
    if (r.spot_type !== '' && !SPOT_TYPES.includes(r.spot_type)) {
      fail(line, `spot_type「${r.spot_type}」は ${SPOT_TYPES.join(' / ')} のどれかです`);
    }
    if (r.area !== '' && !areas.includes(r.area))
      fail(line, `area「${r.area}」はエリア一覧にありません`);
    const lat = Number(r.lat);
    const lng = Number(r.lng);
    if (r.lat !== '' && (!Number.isFinite(lat) || lat < LAT[0] || lat > LAT[1])) {
      fail(line, `lat「${r.lat}」が金沢市の付近（${LAT[0]}〜${LAT[1]}）にありません`);
    }
    if (r.lng !== '' && (!Number.isFinite(lng) || lng < LNG[0] || lng > LNG[1])) {
      fail(line, `lng「${r.lng}」が金沢市の付近（${LNG[0]}〜${LNG[1]}）にありません`);
    }
    if (r.sort_order !== '' && !/^-?\d+$/.test(r.sort_order))
      fail(line, 'sort_order は整数か空です');
    if (!['TRUE', 'FALSE'].includes(r.is_active.toUpperCase()))
      fail(line, 'is_active は TRUE か FALSE です');

    if (r.id !== '') seenIds.set(r.id, line);
    if (r.name !== '') seenNames.set(r.name, line);
    if (errors.length === before) spots.push({ ...r, lat, lng });
  }

  if (errors.length > 0) {
    console.error('CSV に問題があるため、SQL を作りませんでした：');
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  const values = spots
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map(
      (s) =>
        `  (${Number(s.id)}, ${sqlText(s.name)}, ${sqlText(s.description)}, ${s.lat}, ${s.lng}, ` +
        `${s.google_place_id ? sqlText(s.google_place_id) : 'null'}, ${sqlText(s.spot_type)}, ` +
        `${sqlText(s.area)}, ${s.is_active.toUpperCase() === 'TRUE'}, ${s.sort_order === '' ? 0 : Number(s.sort_order)})`,
    )
    .join(',\n');

  const sql = `-- スポットの取り込み（npm run import-spots で自動生成。手で編集しない）
-- 元のファイル：${input.slice(ROOT.length + 1).replace(/\\/g, '/')}（${spots.length}件）
-- id をキーにした upsert。削除はしない（BR-17）。使わなくなったスポットは CSV の is_active を FALSE にする
insert into public.spots
  (id, name, description, lat, lng, google_place_id, spot_type, area, is_active, sort_order)
values
${values}
on conflict (id) do update
  set name = excluded.name, description = excluded.description, lat = excluded.lat,
      lng = excluded.lng, google_place_id = excluded.google_place_id,
      spot_type = excluded.spot_type, area = excluded.area,
      is_active = excluded.is_active, sort_order = excluded.sort_order;

select count(*) as spot_count from public.spots;
`;
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, sql);
  console.log(`${spots.length}件のスポットから ${output.slice(ROOT.length + 1)} を作りました。`);
}

main();
