import styles from './MascotSprite.module.css';

// （v21）マスコット「おちゃねこ」のドット絵（K64、K68、K73）。メンバーが Aseprite で手で描いた5コマの画像を
// コマ送りして、しっぽのちょうちんをゆらし、ふわふわ浮かび、ときどき目を開ける。飾りなので読み上げない。
// 大きさは CSS の --mascot-size で決める（48px の整数倍にして、ドットをにじませない）
export function MascotSprite({ className }: { className?: string }) {
  return <span className={`${styles.sprite} ${className ?? ''}`} aria-hidden="true" />;
}
