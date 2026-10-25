import { router } from 'expo-router';
import { useState } from 'react';
import { isValidEmail, localAuth } from '../services/auth';
import { usePalette } from '../theme/useTheme';
import { BackLink, Body, Button, Display, Field, Muted, Screen, T } from '../ui/kit';
import { toast } from '../ui/Toast';

export default function Forgot() {
  const p = usePalette();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!isValidEmail(email)) return setErr('That email doesn’t look right.');
    await localAuth.sendPasswordReset(email.trim());
    toast('Reset link sent. Check your inbox.');
    router.back();
  }

  return (
    <Screen gutter={24}>
      <BackLink label="Sign in" onPress={() => router.back()} />
      <Display style={{ marginTop: 16 }}>Reset your{'\n'}password</Display>
      <Body style={{ marginTop: 12, maxWidth: 300 }}>Enter the email on your account and we'll send a reset link.</Body>
      <Field value={email} onChangeText={t => { setEmail(t); setErr(null); }} placeholder="you@example.com" accessibilityLabel="Email"
        keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={!!err} style={{ marginTop: 22 }} />
      {err ? <T size={13} color={p.danger} style={{ marginTop: 12 }} accessibilityRole="alert">{err}</T> : null}
      <Button label="Send reset link" onPress={submit} style={{ marginTop: 20 }} />
      <Muted style={{ marginTop: 16 }}>Your streak and score are untouched by a password reset.</Muted>
    </Screen>
  );
}
