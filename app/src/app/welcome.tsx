import { router } from 'expo-router';
import { View } from 'react-native';
import { usePalette } from '../theme/useTheme';
import { Button, Screen, T } from '../ui/kit';
import { LegalLine } from '../ui/Legal';
import { Logo } from '../ui/Logo';

export default function Welcome() {
  const p = usePalette();
  return (
    <Screen gutter={24} scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Logo />
        <T w={700} size={44} style={{ marginTop: 24, letterSpacing: -1.3 }} accessibilityRole="header">Tendo</T>
        <T w={600} size={12} color={p.muted} style={{ marginTop: 10, letterSpacing: 2.6 }}>KEEP YOUR WAY</T>
        <T size={16} color={p.secondary} style={{ marginTop: 18, lineHeight: 24, maxWidth: 280, textAlign: 'center' }}>
          Daily commitments, one honest number, and people who'll notice.
        </T>
      </View>
      <Button label="Create an account" onPress={() => router.push('/register')} />
      <Button label="I already have an account" kind="outline" style={{ marginTop: 10 }} onPress={() => router.push('/login')} />
      <LegalLine />
    </Screen>
  );
}
