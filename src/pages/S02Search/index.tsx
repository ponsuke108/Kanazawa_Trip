import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Utensils,
  Mountain,
  Landmark,
  Camera,
  Leaf,
  Timer,
  Wallet,
  Coffee,
  Sun,
  CloudRain,
  Cloud,
  Search,
  Check,
} from 'lucide-react';
import './search.css';

// S-02 検索条件(担当:A)
type Tag = { id: string; label: string; Icon: LucideIcon };

const THEMES: Tag[] = [
  { id: 'food', label: '食事', Icon: Utensils },
  { id: 'view', label: '景観', Icon: Mountain },
  { id: 'history', label: '歴史', Icon: Landmark },
  { id: 'photo', label: '写真', Icon: Camera },
  { id: 'slow', label: 'ゆったり', Icon: Leaf },
  { id: 'fast', label: '時短', Icon: Timer },
  { id: 'cost', label: 'コスパ', Icon: Wallet },
  { id: 'cafe', label: 'くつろぎ', Icon: Coffee },
];
const WEATHER: Tag[] = [
  { id: 'sunny', label: '晴れ', Icon: Sun },
  { id: 'rain', label: '雨', Icon: CloudRain },
  { id: 'cloudy', label: '曇り', Icon: Cloud },
];

type Props = { onSearch?: (c: { themes: string[]; weather: string[] }) => void };

export default function S02Search({ onSearch }: Props) {
  const [themes, setThemes] = useState<string[]>([]);
  const [weather, setWeather] = useState<string[]>([]);
  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <div className="sp">
      <header className="sp-header">
        <span className="sp-brand">旅ノート金沢</span>
        <h1>プランを探す</h1>
        <span />
      </header>

      <main className="sp-main">
        <p className="sp-hint">
          気になるタグを選んでください。
          <br />
          どれか1つでも合うプランが見つかります。
        </p>

        <h2 className="sp-label">テーマ</h2>
        <div className="sp-grid">
          {THEMES.map(({ id, label, Icon }) => {
            const on = themes.includes(id);
            return (
              <button
                key={id}
                className={`sp-card ${on ? 'on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle(themes, setThemes, id)}
              >
                <Icon size={20} strokeWidth={1.4} />
                <span className="sp-card-label">{label}</span>
                <span className="sp-ring">{on && <Check size={11} strokeWidth={2.4} />}</span>
              </button>
            );
          })}
        </div>

        <h2 className="sp-label">天気</h2>
        <div className="sp-seg">
          {WEATHER.map(({ id, label, Icon }) => {
            const on = weather.includes(id);
            return (
              <button
                key={id}
                className={on ? 'on' : ''}
                aria-pressed={on}
                onClick={() => toggle(weather, setWeather, id)}
              >
                <Icon size={22} strokeWidth={1.4} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </main>

      <div className="sp-cta">
        <button onClick={() => onSearch?.({ themes, weather })}>
          <Search size={18} strokeWidth={1.6} />
          <span>この条件で探す</span>
        </button>
      </div>
    </div>
  );
}
