import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { isValidEmail, localAuth } from '../services/auth';
import { useTendo } from '../state/store';
import { usePalette } from '../theme/useTheme';
import { BackLink, Body, Box, Button, Display, Divider, Field, Screen, T, TextLink } from '../ui/kit';

export default function Login() {
  const p = usePalette();
  const signedIn = useTendo(s => s.signedIn);
  const [email, setEmail] = useState(useTendo.getState().account?.email ?? '');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = isValidEmail(email) && pw.length > 0;

  async function submit() {
    if (!isValidEmail(email)) return setErr('That email doesn’t look right.');
    if (!pw) return setErr('Enter your password.');
    setBusy(true);
    const u = await localAuth.signIn(email.trim(), pw);
    setBusy(false);
    signedIn(u);
    router.replace('/');
  }

  async function sso(provider: 'apple' | 'google') {
    signedIn(await localAuth.signInWithProvider(provider));
    router.replace('/');
  }

  return (
    <Screen gutter={24}>
      <BackLink label="Back" onPress={() => router.back()} />
      <Display style={{ marginTop: 16 }}>Welcome back</Display>
      <Body style={{ marginTop: 12 }}>Your commitments are waiting.</Body>

      <View style={{ marginTop: 8 }}>
        <Field label="Email" value={email} onChangeText={t => { setEmail(t); setErr(null); }} placeholder="you@example.com"
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" error={!!err && err.includes('email')} />
        <Field label="Password" value={pw} onChangeText={t => { setPw(t); setErr(null); }} placeholder="Your password"
          secureTextEntry={!showPw} autoComplete="current-password" textContentType="password" error={!!err && err.includes('assword')}
          onSubmitEditing={submit} right={<TextLink label={showPw ? 'Hide' : 'Show'} size={13} onPress={() => setShowPw(v => !v)} />} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <Pressable onPress={() => setRemember(r => !r)} accessibilityRole="checkbox" accessibilityState={{ checked: remember }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
          <Box on={remember} size={20} />
          <T size={13.5} color={p.secondary}>Stay signed in</T>
        </Pressable>
        <TextLink label="Forgot password?" onPress={() => router.push('/forgot')} />
      </View>

      {err ? <T size={13} color={p.danger} style={{ marginTop: 14 }} accessibilityRole="alert">{err}</T> : null}
      <Button label={busy ? 'Signing in…' : 'Sign in'} disabled={!ready || busy} onPress={submit} style={{ marginTop: 22 }} />

      <Divider />
      <Button label="Continue with Apple" kind="outline" small onPress={() => sso('apple')} />
      <Button label="Continue with Google" kind="outline" small onPress={() => sso('google')} style={{ marginTop: 10 }} />
      <Pressable onPress={() => router.replace('/register')} style={{ marginTop: 22, alignSelf: 'center', padding: 4 }} accessibilityRole="link">
        <T size={13.5} color={p.secondary}>New to Tendo? <T size={13.5} w={600} color={p.olive}>Create an account</T></T>
      </Pressable>
    </Screen>
  );
}
