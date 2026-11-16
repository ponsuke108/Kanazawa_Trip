type Props = { className?: string };

// 飾りの絵「雪吊り」（7.11、K75）。兼六園の冬の風物詩。柱から縄を張って、松の枝を雪から守る。
// 線は currentColor で描くので、置く場所の文字の色に合わせて色が変わる。飾りなので読み上げない
export function YukitsuriArt({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 236"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* 松：重なる枝ぶりと幹 */}
      <g fill="currentColor" stroke="none" opacity="0.16">
        <ellipse cx="120" cy="82" rx="26" ry="10" />
        <ellipse cx="148" cy="108" rx="36" ry="12" />
        <ellipse cx="92" cy="126" rx="42" ry="14" />
        <ellipse cx="136" cy="152" rx="56" ry="17" />
        <ellipse cx="100" cy="176" rx="62" ry="16" />
      </g>
      <path d="M118 206c2-22-6-34 0-52s10-30 4-46 2-24-2-32" strokeWidth="3" opacity="0.3" />
      {/* 奥の縄 */}
      <path
        d="M120 14L23.9 199.1M120 14L46.5 193.3M120 14L80.2 189.4M120 14L120 188M120 14L159.8 189.4M120 14L193.5 193.3M120 14L216.1 199.1"
        strokeWidth="0.7"
        opacity="0.4"
      />
      {/* すそを結ぶ輪 */}
      <ellipse cx="120" cy="206" rx="104" ry="18" strokeWidth="1.2" opacity="0.7" />
      {/* 手前の縄 */}
      <path
        d="M120 14L224 206M120 14L222 209.5M120 14L216.1 212.9M120 14L206.5 216M120 14L193.5 218.7M120 14L177.8 221M120 14L159.8 222.6M120 14L140.3 223.7M120 14L120 224M120 14L99.7 223.7M120 14L80.2 222.6M120 14L62.2 221M120 14L46.5 218.7M120 14L33.5 216M120 14L23.9 212.9M120 14L18 209.5M120 14L16 206"
        strokeWidth="1"
      />
      {/* 柱の頭の飾り結び */}
      <path d="M120 2v14M114 8l6 6 6-6" strokeWidth="1.6" />
    </svg>
  );
}
