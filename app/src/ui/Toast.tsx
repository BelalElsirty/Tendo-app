import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { create } from 'zustand';
import { usePalette } from '../theme/useTheme';
import { T } from './kit';

interface ToastState {
  message: string | null;
  key: number;
  show(message: string): void;
  clear(): void;
}

export const useToast = create<ToastState>(set => ({
  message: null,
  key: 0,
  show: message => set(s => ({ message, key: s.key + 1 })),
  clear: () => set({ message: null }),
}));

export const toast = (m: string) => useToast.getState().show(m);

/** Brief, factual confirmation at the bottom of the screen (PRD §35). */
export function ToastHost({ bottom = 98 }: { bottom?: number }) {
  const p = usePalette();
  const { message, key, clear } = useToast();
  useEffect(() => {
    if (!message) return;
    AccessibilityInfo.announceForAccessibility?.(message);
    const t = setTimeout(clear, 2600);
    return () => clearTimeout(t);
  }, [message, key, clear]);
  if (!message) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom, alignItems: 'center', zIndex: 90 }}>
      <Animated.View
        key={key}
        entering={FadeInDown.duration(200)}
        exiting={FadeOut.duration(150)}
        accessibilityLiveRegion="polite"
        style={{ width: '100%', maxWidth: 400, backgroundColor: p.oliveFill, borderWidth: 1, borderColor: p.oliveBd, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16 }}
      >
        <T size={14} color="#E4E9D8">{message}</T>
      </Animated.View>
    </View>
  );
}
