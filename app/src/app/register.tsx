import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { isValidEmail, localAuth, passwordScore, usernameState, USERNAME_HINT } from '../services/auth';
import { useTendo } from '../state/store';
import { usePalette } from '../theme/useTheme';
import { BackLink, Body, Box, Button, Display, Divider, Field, Muted, Screen, T, TextLink } from '../ui/kit';
import { LegalLine } from '../ui/Legal';

export default function Register() {
  const p = usePalette();
  const startRegistration = useTendo(s => s.startRegistration);
  const [name, setName] = useState('');
  const [user, setUser] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [age, setAge] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const us = usernameState(user.trim());
  const score = passwordScore(pw);
  const ready = !!name.trim() && isValidEmail(email) && pw.length >= 8 && us === 'ok' && age;

  async function submit() {
    if (!name.trim()) return setErr('Tell us what to call you.');
    if (us !== 'ok') return setErr(us === 'empty' ? 'Choose a username.' : USERNAME_HINT[us]);
    if (!isValidEmail(email)) return setErr('That email doesn’t look right.');
    if (pw.length < 8) return setErr('Password needs at least 8 characters.');
    if (!age) return setErr('Tendo is for people 16 and older.');
    setBusy(true);
    await localAuth.register({ name: name.trim(), email: email.trim(), password: pw });
    setBusy(false);
    startRegistration({ name: name.trim(), username: user.trim(), email: email.trim(), provider: 'email', ageConfirmed: true });
    router.replace('/verify');
  }

  async function sso(provider: 'apple' | 'google') {
    const u = await localAuth.signInWithProvider(provider);
    startRegistration({ name: name.trim() || u.name, username: '', email: u.email, provider, ageConfirmed: false });
    router.replace('/username');
  }

  const userHintColor = us === 'ok' ? p.olive : us === 'empty' ? p.muted : p.dangerSoft;
  return (
    <Screen gutter={24}>
      <BackLink label="Back" onPress={() => router.back()} />
      <Display style={{ marginTop: 16 }}>Create your{'\n'}account</Display>
      <Body style={{ marginTop: 12, maxWidth: 300 }}>One account, every device. Your commitments stay private by default.</Body>

      <View style={{ marginTop: 8 }}>
        <Field label="Name" value={name} onChangeText={t => { setName(t); setErr(null); }} placeholder="Ari Delmar" autoComplete="name" textContentType="name" />
        <Field label="Username" prefix="@" value={user} autoCapitalize="none" autoCorrect={false} placeholder="aridelmar"
          onChangeText={t => { setUser(t.replace(/\s/g, '').slice(0, 24)); setErr(null); }} error={us !== 'ok' && us !== 'empty'} />
        <T size={12} color={userHintColor} style={{ marginTop: 8 }}>{USERNAME_HINT[us]}</T>
        <Field label="Email" value={email} onChangeText={t => { setEmail(t); setErr(null); }} placeholder="you@example.com"
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" error={!!err && err.includes('email')} />
        <Field label="Password" value={pw} onChangeText={t => { setPw(t); setErr(null); }} placeholder="At least 8 characters"
          secureTextEntry={!showPw} autoComplete="new-password" textContentType="newPassword" error={!!err && err.includes('assword')}
          right={<TextLink label={showPw ? 'Hide' : 'Show'} size={13} onPress={() => setShowPw(v => !v)} />} />
      </View>
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 10 }} accessible accessibilityLabel={'Password strength ' + ['too short', 'weak', 'decent', 'strong'][score]}>
        {[0, 1, 2].map(i => (
          <View key={i} style={{ height: 4, flex: 1, borderRadius: 3, backgroundColor: i < score ? (score === 3 ? p.olive : p.warn) : p.raised }} />
        ))}
      </View>
      <Muted size={12} style={{ marginTop: 8 }}>
        {score === 0 ? 'Eight characters minimum.' : score === 1 ? 'Weak, add length or a number.' : score === 2 ? 'Decent. A symbol would make it strong.' : 'Strong.'}
      </Muted>

      {err ? <T size={13} color={p.danger} style={{ marginTop: 14, lineHeight: 19 }} accessibilityRole="alert">{err}</T> : null}

      <Pressable onPress={() => { setAge(a => !a); setErr(null); }} accessibilityRole="checkbox" accessibilityState={{ checked: age }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, minHeight: 44 }}>
        <Box on={age} />
        <T size={14} color={p.textSoft}>I'm 16 or older</T>
      </Pressable>
      <Button label={busy ? 'Creating…' : 'Create account'} disabled={!ready || busy} onPress={submit} style={{ marginTop: 22 }} />

      <Divider />
      <Button label="Continue with Apple" kind="outline" small onPress={() => sso('apple')} />
      <Button label="Continue with Google" kind="outline" small onPress={() => sso('google')} style={{ marginTop: 10 }} />
      <LegalLine extra="No marketing emails unless you turn them on later." />
      <Pressable onPress={() => router.replace('/login')} style={{ marginTop: 18, alignSelf: 'center', padding: 4 }} accessibilityRole="link">
        <T size={13.5} color={p.secondary}>Already have an account? <T size={13.5} w={600} color={p.olive}>Sign in</T></T>
      </Pressable>
    </Screen>
  );
}
