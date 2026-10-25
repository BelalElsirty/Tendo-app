import { type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { T } from './kit';

/** Bottom sheet from the prototype: scrim, 18pt top radius, grab handle, capped at 88% height. */
export function Sheet({ visible, onClose, children, title, dismissable = true, label }: {
  visible: boolean; onClose: () => void; children: ReactNode; title?: string; dismissable?: boolean; label?: string;
}) {
  const p = usePalette();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismissable ? onClose : undefined} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: p.scrim }}
          onPress={dismissable ? onClose : undefined}
          accessibilityLabel="Close"
          accessible={dismissable}
        />
        <Animated.View
          entering={reduce ? undefined : FadeInDown.duration(220)}
          accessibilityViewIsModal
          accessibilityLabel={label ?? title}
          role="dialog"
          style={{
            maxHeight: height * 0.88, backgroundColor: p.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
            width: '100%', maxWidth: 440, alignSelf: 'center',
          }}
        >
          <ScrollView contentContainerStyle={{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: Math.max(40, insets.bottom + 24) }} keyboardShouldPersistTaps="handled">
            {dismissable ? <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: p.border, alignSelf: 'center', marginBottom: 18 }} /> : null}
            {title ? <T w={700} size={21} style={{ letterSpacing: -0.2 }} accessibilityRole="header">{title}</T> : null}
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Rows inside the actions sheet. */
export function ActionList({ items }: { items: { key: string; label: string; note: string; danger?: boolean; onPress: () => void }[] }) {
  const p = usePalette();
  return (
    <View style={{ marginTop: 18, borderRadius: radius.md, overflow: 'hidden', gap: 1, backgroundColor: p.raised }}>
      {items.map(a => (
        <Pressable
          key={a.key}
          onPress={a.onPress}
          accessibilityRole="button"
          accessibilityHint={a.note}
          style={({ pressed }) => ({ backgroundColor: pressed ? p.raised : p.surface, padding: 16, minHeight: 52 })}
        >
          <T size={15.5} w={600} color={a.danger ? p.danger : p.text}>{a.label}</T>
          <T size={12.5} color={p.muted} style={{ marginTop: 3 }}>{a.note}</T>
        </Pressable>
      ))}
    </View>
  );
}
