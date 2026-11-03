/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Breakpoints } from '@/styles/breakpoints';

// src の中の CSS ファイルをすべて集める
function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return cssFiles(path);
    return e.name.endsWith('.css') ? [path] : [];
  });
}

const files = cssFiles(join(process.cwd(), 'src'));

const allowed = new Set([
  `(min-width: ${Breakpoints.tablet}px)`,
  `(min-width: ${Breakpoints.pc}px)`,
]);

describe('幅の区切り（7.8）', () => {
  it('CSS を読み込めている', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('幅の @media は 768px と 1024px の min-width だけを使う', () => {
    const wrong: string[] = [];
    for (const path of files) {
      const css = readFileSync(path, 'utf8');
      for (const m of css.matchAll(/@media\s+([^{]+)\{/g)) {
        const query = (m[1] ?? '').trim();
        if (!/width/.test(query)) continue; // prefers-reduced-motion などは対象外
        if (!allowed.has(query)) wrong.push(`${path}: ${query}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});
