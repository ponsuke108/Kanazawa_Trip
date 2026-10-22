// 範囲チェック（要件定義書 12.2、12.3）
// ブランチ名の接頭辞から担当を判定し、担当の範囲外のファイルが変わっていたら失敗させる。
// 使い方：node scripts/check-scope.mjs
//   CI では GITHUB_HEAD_REF（ブランチ名）と GITHUB_EVENT_PATH（ラベル）を読む。
//   手元では現在のブランチ名を使い、ラベルはないものとして扱う。
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// 要件定義書 12.2 の表。末尾が / のものはフォルダ、それ以外はファイル
const SCOPES = {
  'base/': [
    'src/pages/S01Home/',
    'src/pages/S10Ranking/',
    'src/pages/S11MyPage/',
    'src/pages/S12Login/',
    'src/pages/NotFound/',
    'src/components/common/',
    'src/styles/',
    'src/lib/', // blocks.ts は下の EXCLUDE で除く
    'src/constants/',
    'src/hooks/',
    'src/App.tsx',
    'src/main.tsx',
    '.github/',
    'scripts/check-scope.mjs',
    'CLAUDE.md',
    // 設定ファイル
    'package.json',
    'package-lock.json',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'eslint.config.js',
    '.prettierrc.json',
    '.prettierignore',
    'vercel.json',
    '.nvmrc',
    'index.html',
    'README.md',
    '.gitignore',
    '.env.example',
  ],
  'browse/': ['src/pages/S02Search/', 'src/pages/S03SearchResults/', 'src/pages/S04PlanDetail/'],
  'editor/': [
    'src/pages/PlanEditor/',
    'src/components/blocks/',
    'src/lib/blocks.ts',
    'src/lib/blocks.test.ts',
  ],
  'data/': ['src/api/', 'src/types/', 'supabase/', 'scripts/import-spots.mjs'],
  'docs/': ['docs/'],
};

// 担当の範囲から除くもの
const EXCLUDE = {
  'base/': ['src/lib/blocks.ts', 'src/lib/blocks.test.ts'],
};

// 全範囲を変更できる接頭辞
const UNLIMITED = ['init/'];
// pm-approved ラベルがあれば全範囲を変更できる接頭辞
const CONTRACT = 'contract/';
const APPROVED_LABEL = 'pm-approved';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function getBranch() {
  return process.env.GITHUB_HEAD_REF || sh('git rev-parse --abbrev-ref HEAD');
}

function getLabels() {
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path) return [];
  const event = JSON.parse(readFileSync(path, 'utf8'));
  return (event.pull_request?.labels ?? []).map((l) => l.name);
}

function getChangedFiles() {
  const out = sh('git diff --name-only origin/main...HEAD');
  return out ? out.split('\n') : [];
}

function matches(file, rule) {
  return rule.endsWith('/') ? file.startsWith(rule) : file === rule;
}

function main() {
  const branch = getBranch();
  console.log(`ブランチ：${branch}`);

  if (UNLIMITED.some((p) => branch.startsWith(p))) {
    console.log('init/ のブランチは範囲チェックをしません（要件定義書 13.1）。');
    return;
  }

  if (branch.startsWith(CONTRACT)) {
    if (getLabels().includes(APPROVED_LABEL)) {
      console.log(
        `contract/ のブランチで ${APPROVED_LABEL} ラベルがあるため、全範囲を変更できます。`,
      );
      return;
    }
    console.error(
      `contract/ のブランチは、PMが ${APPROVED_LABEL} ラベルを付けるまで取り込めません（要件定義書 12.2）。`,
    );
    process.exit(1);
  }

  const prefix = Object.keys(SCOPES).find((p) => branch.startsWith(p));
  if (!prefix) {
    console.error(
      `ブランチ名の接頭辞が決まりと違います。使える接頭辞：${[...Object.keys(SCOPES), ...UNLIMITED, CONTRACT].join('、')}（要件定義書 12.2）`,
    );
    process.exit(1);
  }

  const allowed = SCOPES[prefix];
  const excluded = EXCLUDE[prefix] ?? [];
  const outside = getChangedFiles().filter(
    (f) => excluded.some((r) => matches(f, r)) || !allowed.some((r) => matches(f, r)),
  );

  if (outside.length > 0) {
    console.error(`${prefix} の担当範囲の外のファイルが変更されています（要件定義書 12.2）：`);
    for (const f of outside) console.error(`  - ${f}`);
    console.error(
      '範囲外の変更は、そのファイルの持ち主に依頼するか、contract/ の手順で行ってください。',
    );
    process.exit(1);
  }
  console.log(`変更はすべて ${prefix} の担当範囲の中です。`);
}

main();
