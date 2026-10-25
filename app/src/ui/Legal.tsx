import { router } from 'expo-router';
import { usePalette } from '../theme/useTheme';
import { T } from './kit';

/** "By continuing, you agree to the Terms of Service and Privacy Policy." with tappable links. */
export function LegalLine({ extra }: { extra?: string }) {
  const p = usePalette();
  const link = (label: string, kind: 'terms' | 'privacy') => (
    <T size={12.5} color={p.textSoft} style={{ textDecorationLine: 'underline' }} accessibilityRole="link"
      onPress={() => router.push({ pathname: '/legal', params: { kind } })}>
      {label}
    </T>
  );
  return (
    <T size={12.5} color={p.muted} style={{ textAlign: 'center', marginTop: 18, lineHeight: 20 }}>
      By continuing, you agree to the {link('Terms of Service', 'terms')} and {link('Privacy Policy', 'privacy')}.{extra ? ' ' + extra : ''}
    </T>
  );
}
