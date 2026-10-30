import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { signIn, signUp } from '@/api/auth';
import { isApiError } from '@/api/errors';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { IconButton } from '@/components/common/IconButton';
import { Logo } from '@/components/common/Logo';
import { PageHeader } from '@/components/common/PageHeader';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { SnowScene } from '@/components/common/SnowScene';
import { TextField } from '@/components/common/TextField';
import { useToast } from '@/components/common/useToast';
import { AuthMessages, Toasts, UiMessages } from '@/constants/messages';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons, StateIcons } from '@/lib/icons';
import { safeRedirect } from '@/lib/redirect';
import { validateAuth, type AuthErrors } from '@/pages/S12Login/validateAuth';
import { TeaScene, type TeaState } from './TeaScene';
import styles from './LoginPage.module.css';

type Mode = 'login' | 'signup';

const MODES: Array<{ value: Mode; label: string }> = [
  { value: 'login', label: 'ログイン' },
  { value: 'signup', label: '新規登録' },
];

// お茶を点てる絵の長さ（7.7）。ログインがすぐ終わっても、ここまでは見せる
const BREW_MS = 3700;
const SERVE_MS = 800;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 入力欄の名前（form の中で探して、カーソルを移すのに使う）
type FieldName = 'displayName' | 'email' | 'password';
const FIELD_ORDER: FieldName[] = ['displayName', 'email', 'password'];

function fieldOf(form: HTMLFormElement | null, name: FieldName): HTMLInputElement | null {
  const el = form?.elements.namedItem(name);
  return el instanceof HTMLInputElement ? el : null;
}

// 送れなかったとき、対応している端末（Android など）では短く2回震わせる
function buzz() {
  if ('vibrate' in navigator) navigator.vibrate([18, 40, 18]);
}

// Enter で次の入力欄へ進む（最後の欄では送る）
function nextOnEnter(next: FieldName) {
  return (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    fieldOf(e.currentTarget.form, next)?.focus();
  };
}

// ひとことは「、」の後ろで2行に分けて縦に置く
const LEAD_LINES = UiMessages.homeLead.split(/(?<=、)/);

// S-12 ログイン・登録（6.4、BR-05、BR-14）。見た目は雪の茶屋街（7.7、I-23）
export function LoginPage() {
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get('mode') === 'signup' ? 'signup' : 'login';
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { setUser } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<AuthErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 送れなかった回数。増えるたびに箱を小さく揺らす（同じ動きを2つの名前で交互に付けて、毎回動かす）
  const [failed, setFailed] = useState(0);
  const [tea, setTea] = useState<TeaState | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // 直しはじめたら、その欄の誤りの文を消す
  const edit = (name: FieldName, set: (v: string) => void) => (value: string) => {
    set(value);
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (formError) setFormError(null);
  };

  const changeMode = (next: Mode) => {
    const p = new URLSearchParams(params);
    p.set('mode', next);
    setParams(p, { replace: true });
    setErrors({});
    setFormError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget instanceof HTMLFormElement ? e.currentTarget : null;
    setFormError(null);
    const found = validateAuth({ displayName, email, password }, mode);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFailed((n) => n + 1);
      buzz();
      // 最初の誤りの欄へカーソルを移す（BR-05）
      const first = FIELD_ORDER.find((name) => found[name]);
      if (first) fieldOf(form, first)?.focus();
      return;
    }

    setSubmitting(true);
    setTea('brewing');
    const still = reducedMotion();
    const brewed = wait(still ? 0 : BREW_MS);
    try {
      const user =
        mode === 'login'
          ? await signIn({ email: email.trim(), password })
          : await signUp({ email: email.trim(), password, displayName: displayName.trim() });
      // 点て終えて、湯気が立つのを少し見せてから移る
      await brewed;
      setTea('done');
      await wait(still ? 0 : SERVE_MS);
      queryClient.clear();
      toast.show({
        type: 'success',
        message: mode === 'login' ? Toasts.loggedIn : Toasts.signedUp,
      });
      navigate(safeRedirect(params.get('redirect')), { replace: true });
      setUser(user);
    } catch (err) {
      setTea(null);
      setFailed((n) => n + 1);
      buzz();
      if (isApiError(err) && err.code === 'AUTH_EMAIL_TAKEN') {
        setErrors({ email: AuthMessages.emailTaken });
        fieldOf(form, 'email')?.select();
      } else if (isApiError(err) && err.code === 'AUTH_INVALID_CREDENTIALS') {
        setFormError(AuthMessages.invalidCredentials);
        fieldOf(form, 'password')?.select();
      } else {
        setFormError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'login' ? 'ログイン' : '新規登録';
  const Flake = StateIcons.snow;

  return (
    <div className={styles.theme}>
      <SnowScene />
      <AppLayout showTabBar={false}>
        <PageHeader title={title} backTo={null} />
        <main className={styles.main}>
          {/* 縦書きの題字。右にサイト名と落款、左にひとことを2行で（7.7） */}
          <div className={styles.logo}>
            <div className={styles.title}>
              <Flake className={styles.mark} size={28} strokeWidth={1.5} aria-hidden="true" />
              <Logo size="lg" />
              <span className={styles.seal} aria-hidden="true">
                金沢
              </span>
            </div>
            <p className={styles.lead}>
              {LEAD_LINES.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
          </div>
          {/* 入力はすりガラスの箱の中。共通部品はそのまま使い、色だけ箱の中で変える（7.7） */}
          <div
            className={`${styles.card} ${failed === 0 ? '' : failed % 2 === 0 ? styles.shakeA : styles.shakeB}`}
          >
            <SegmentedControl
              options={MODES}
              value={mode}
              onChange={changeMode}
              label="ログインか新規登録か"
            />
            {/* 切り替えたら入力欄を出し直す（key）ので、入力欄がふわっと入れ替わる */}
            <form key={mode} className={styles.form} onSubmit={submit} noValidate>
              {mode === 'signup' && (
                <TextField
                  label="表示名"
                  value={displayName}
                  onChange={(e) => edit('displayName', setDisplayName)(e.target.value)}
                  error={errors.displayName}
                  hint="20文字以内。プランに「〇〇さんのプラン」と表示されます"
                  autoComplete="nickname"
                  maxLength={40}
                  name="displayName"
                  enterKeyHint="next"
                  onKeyDown={nextOnEnter('email')}
                />
              )}
              <TextField
                label="メールアドレス"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => edit('email', setEmail)(e.target.value)}
                error={errors.email}
                autoComplete="email"
                name="email"
                enterKeyHint="next"
                onKeyDown={nextOnEnter('password')}
              />
              {/* パスワードは、右端の目のボタンで見せる・隠すを切り替えられる */}
              <div className={styles.password}>
                <TextField
                  label="パスワード"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => edit('password', setPassword)(e.target.value)}
                  error={errors.password}
                  hint={mode === 'signup' ? '8文字以上' : undefined}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  name="password"
                  enterKeyHint="go"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <IconButton
                  icon={showPassword ? ActionIcons.hidePassword : ActionIcons.showPassword}
                  label="パスワードを表示する"
                  aria-pressed={showPassword}
                  className={styles.reveal}
                  onClick={() => setShowPassword((v) => !v)}
                />
              </div>
              {formError && (
                <p className={styles.formError} role="alert">
                  {formError}
                </p>
              )}
              <Button
                type="submit"
                fullWidth
                loading={submitting}
                icon={mode === 'login' ? ActionIcons.login : ActionIcons.signup}
              >
                {mode === 'login' ? 'ログイン' : '登録する'}
              </Button>
            </form>
          </div>
          <p className={styles.notice}>{AuthMessages.forgotPassword}</p>
        </main>
        {tea && <TeaScene state={tea} />}
      </AppLayout>
    </div>
  );
}
