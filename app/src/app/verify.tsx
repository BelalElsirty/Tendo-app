import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { localAuth } from '../services/auth';
import { useTendo } from '../state/store';
import { usePalette } from '../theme/useTheme';
import { BackLink, Body, Button, Display, Field, Screen, Spacer, T, TextLink } from '../ui/kit';
import { toast } from '../ui/Toast';

export default function Verify() {
  const p = usePalette();
  const email = useTendo(s => s.pendingEmail);
  const confirmEmail = useTendo(s => s.confirmEmail);
  const signOut = useTendo(s => s.signOut);
  const [code, setCode] = useState('');
  const [bad, setBad] = useState(false);

  async function submit() {
    if (code.length !== 6 || !(await localAuth.verifyEmail(email, code))) return setBad(true);
    confirmEmail();
    router.replace('/');
  }

  const changeEmail = () => { signOut(); router.replace('/register'); };

  return (
    <Screen gutter={24}>
      <BackLink label="Back" onPress={changeEmail} />
      <Display style={{ marginTop: 16 }}>Check your inbox</Display>
      <Body style={{ marginTop: 12 }}>We sent a six-digit code to {email || 'your inbox'}.</Body>
      <Field
        value={code}
        onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 6)); setBad(false); }}
        placeholder="••••••"
        accessibilityLabel="Six-digit code"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        error={bad}
        onSubmitEditing={submit}
        style={{ marginTop: 24, padding: 20, fontSize: 26, letterSpacing: 8.8, textAlign: 'center' }}
      />
      {bad ? <T size={13} color={p.danger} style={{ marginTop: 12, textAlign: 'center' }} accessibilityRole="alert">That code doesn't match. Six digits, from the email.</T> : null}
      <Button label="Verify" disabled={code.length !== 6} onPress={submit} style={{ marginTop: 20 }} />
      <TextLink label="Resend code" center onPress={async () => { await localAuth.resendCode(email); toast('New code sent to ' + (email || 'your inbox') + '.'); }} style={{ marginTop: 12 }} />
      <Spacer flex h={20} />
      <View style={{ alignItems: 'center' }}>
        <T size={12.5} color={p.muted}>Wrong address? <T size={12.5} color={p.secondary} style={{ textDecorationLine: 'underline' }} onPress={changeEmail} accessibilityRole="link">Change it</T></T>
      </View>
    </Screen>
  );
}
