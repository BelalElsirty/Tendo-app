import { router, useLocalSearchParams } from 'expo-router';
import { usePalette } from '../theme/useTheme';
import { BackLink, Body, Card, Display, Muted, Screen, T } from '../ui/kit';

/**
 * Terms / Privacy placeholder. The PRD forbids inventing legal text before legal review,
 * so this states plainly what is pending instead of showing filler.
 */
export default function Legal() {
  const p = usePalette();
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const isTerms = kind === 'terms';
  return (
    <Screen>
      <BackLink label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <Display size={30} style={{ marginTop: 16 }}>{isTerms ? 'Terms of Service' : 'Privacy Policy'}</Display>
      <Card tone="outline" style={{ marginTop: 20 }}>
        <T w={600} size={14.5}>Awaiting legal review</T>
        <T size={13.5} color={p.secondary} style={{ marginTop: 6, lineHeight: 20 }}>
          The final {isTerms ? 'Terms of Service' : 'Privacy Policy'} will appear here before Tendo launches publicly.
        </T>
      </Card>
      {!isTerms ? (
        <Body size={13.5} style={{ marginTop: 18 }}>
          What Tendo keeps today: your account details, your commitments and what you log against them, your mood check-ins and day settings. Mood is only ever visible to you. Tendo doesn't ask for your location, contacts, camera, microphone or health data.
        </Body>
      ) : null}
      <Muted style={{ marginTop: 14 }}>Version: draft · not yet in force</Muted>
    </Screen>
  );
}
