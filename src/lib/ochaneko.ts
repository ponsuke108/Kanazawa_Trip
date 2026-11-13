import { OchanekoDefaultHint, OchanekoHints, OchanekoTrivia } from '@/constants/ochaneko';

// （v21）今の画面のヒント（7.10、K73）
export function ochanekoHint(pathname: string): string {
  return OchanekoHints.find((h) => h.match.test(pathname))?.text ?? OchanekoDefaultHint;
}

// 押すたびに話すこと：ヒントと豆知識をかわりばんこに。count は押した回数（1から）
export function ochanekoLine(pathname: string, count: number): string {
  if (count % 2 === 1) return ochanekoHint(pathname);
  const i = (count / 2 - 1) % OchanekoTrivia.length;
  return OchanekoTrivia[i];
}
