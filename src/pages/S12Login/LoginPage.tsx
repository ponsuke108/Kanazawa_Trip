import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { signIn, signUp } from '@/api/auth';
import { isApiError } from '@/api/errors';
import { AppLayout } from '@/components/common/AppLayout';
import { Button } from '@/components/common/Button';
import { Logo } from '@/components/common/Logo';
import { PageHeader } from '@/components/common/PageHeader';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { TextField } from '@/components/common/TextField';
import { useToast } from '@/components/common/useToast';
import { AuthMessages, Toasts } from '@/constants/messages';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/errorMessage';
import { ActionIcons } from '@/lib/icons';
import { safeRedirect } from '@/lib/redirect';
import { validateAuth, type AuthErrors } from '@/pages/S12Login/validateAuth';
import styles from './LoginPage.module.css';

type Mode = 'login' | 'signup';

const MODES: Array<{ value: Mode; label: string }> = [
  { value: 'login', label: 'ログイン' },
  { value: 'signup', label: '新規登録' },
];

// S-12 ログイン・登録（6.4、BR-05、BR-14）
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

  const changeMode = (next: Mode) => {
    const p = new URLSearchParams(params);
    p.set('mode', next);
    setParams(p, { replace: true });
    setErrors({});
    setFormError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const found = validateAuth({ displayName, email, password }, mode);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const user =
        mode === 'login'
          ? await signIn({ email: email.trim(), password })
          : await signUp({ email: email.trim(), password, displayName: displayName.trim() });
      queryClient.clear();
      toast.show({
        type: 'success',
        message: mode === 'login' ? Toasts.loggedIn : Toasts.signedUp,
      });
      navigate(safeRedirect(params.get('redirect')), { replace: true });
      setUser(user);
    } catch (err) {
      if (isApiError(err) && err.code === 'AUTH_EMAIL_TAKEN') {
        setErrors({ email: AuthMessages.emailTaken });
      } else if (isApiError(err) && err.code === 'AUTH_INVALID_CREDENTIALS') {
        setFormError(AuthMessages.invalidCredentials);
      } else {
        setFormError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'login' ? 'ログイン' : '新規登録';

  return (
    <AppLayout showTabBar={false}>
      <PageHeader title={title} backTo={null} />
      <main className={styles.main}>
        <div className={styles.logo}>
          <Logo size="lg" />
        </div>
        <SegmentedControl
          options={MODES}
          value={mode}
          onChange={changeMode}
          label="ログインか新規登録か"
        />
        <form className={styles.form} onSubmit={submit} noValidate>
          {mode === 'signup' && (
            <TextField
              label="表示名"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              error={errors.displayName}
              hint="20文字以内。プランに「〇〇さんのプラン」と表示されます"
              autoComplete="nickname"
              maxLength={40}
            />
          )}
          <TextField
            label="メールアドレス"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
          />
          <TextField
            label="パスワード"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint={mode === 'signup' ? '8文字以上' : undefined}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
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
        <p className={styles.notice}>{AuthMessages.forgotPassword}</p>
      </main>
    </AppLayout>
  );
}
