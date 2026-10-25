import { View } from 'react-native';
import { radius } from '../../theme/tokens';
import { usePalette } from '../../theme/useTheme';
import { Body, Card, Muted, Screen, T } from '../../ui/kit';

/** Groups need the server (Phase 2). Until then, the PRD's no-groups state, honestly labelled. */
export default function Groups() {
  const p = usePalette();
  return (
    <Screen>
      <T w={700} size={28} style={{ letterSpacing: -0.28 }} accessibilityRole="header">Groups</T>
      <View style={{ marginTop: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: p.border, borderRadius: radius.lg, paddingVertical: 28, paddingHorizontal: 22, alignItems: 'center' }}>
        <T w={700} size={20} style={{ letterSpacing: -0.2, textAlign: 'center' }}>Discipline holds better with witnesses.</T>
        <Body size={14} style={{ marginTop: 8, textAlign: 'center' }}>
          Private circles of up to 12 friends, scored only on what you share. Nobody sees your personal commitments.
        </Body>
      </View>
      <Card tone="outline" style={{ marginTop: 16 }}>
        <T w={600} size={14.5}>Not switched on yet</T>
        <T size={13} color={p.secondary} style={{ marginTop: 5, lineHeight: 19 }}>
          Friends and groups need Tendo's servers to keep everyone in sync. They turn on with account sync in the next build.
        </T>
      </Card>
      <Muted style={{ marginTop: 14 }}>Free includes two groups. Your personal score never enters a group score.</Muted>
    </Screen>
  );
}
