import { Link } from 'react-router';
import { Logo } from '@/components/common/Logo';
import { MainMenuItems } from '@/components/common/mainMenu';
import { MapMessages, UiMessages } from '@/constants/messages';
import { DataSources } from '@/constants/sources';
import styles from './SiteFooter.module.css';

type Props = {
  sources?: boolean; // 出典の一覧を出す（S-01 ホーム。9.6、K21、BR-19、BR-24）
  links?: boolean; // メニューへのリンクを出す。ログインしていない人が見る画面（S-24）では出さない
};

// サイトのフッター（6.1、v23）。臙脂の地に、ロゴ、ひとこと、メニュー、出典
export function SiteFooter({ sources = false, links = true }: Props) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Logo size="lg" seal tone="onBrand" />
          <p className={styles.lead}>{UiMessages.homeLead}</p>
        </div>
        {links && (
          <nav aria-label="フッターのメニュー">
            <ul className={styles.links}>
              <li>
                <Link to="/">ホーム</Link>
              </li>
              {MainMenuItems.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {sources && (
          <div className={styles.sources}>
            <p className={styles.sourcesTitle}>出典</p>
            <ul>
              {DataSources.map((s) => (
                <li key={s.name}>
                  {s.label}：
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.name}
                    </a>
                  ) : (
                    s.name
                  )}
                </li>
              ))}
              {/* （v11）地図と場所の情報の出典（BR-19、BR-24） */}
              <li>地図：{MapMessages.mapAttribution}</li>
              <li>{MapMessages.attribution}</li>
            </ul>
          </div>
        )}
        <p className={styles.copy}>旅ノート金沢</p>
      </div>
    </footer>
  );
}
