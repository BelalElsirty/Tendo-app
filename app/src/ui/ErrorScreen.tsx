import { type ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { reportError } from '../services/crash';
import { useTendo } from '../state/store';
import { palettes, radius } from '../theme/tokens';

/**
 * Fallback for a screen that threw while rendering. Kept free of the kit and custom fonts:
 * it may render before fonts load, or because something in them is what failed.
 * Nothing is reset or deleted; the user's data stays on the device.
 */
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const p = palettes[useTendo(s => s.settings?.theme)] ?? palettes.warm;
  useEffect(() => { reportError(error, { boundary: 'screen' }); }, [error]);
  return (
    <View style={{ flex: 1, backgroundColor: p.bg, justifyContent: 'center', paddingHorizontal: 28 }} accessibilityRole="alert">
      <Text style={{ color: p.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.6 }}>Something went wrong</Text>
      <Text style={{ color: p.secondary, fontSize: 15, lineHeight: 22, marginTop: 10 }}>
        This screen couldn't load. Your commitments and history are safe on this device.
      </Text>
      {__DEV__ ? <Text style={{ color: p.muted, fontSize: 12.5, marginTop: 14 }} selectable>{error.message}</Text> : null}
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        style={({ pressed }) => ({
          backgroundColor: p.olive, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center',
          marginTop: 28, minHeight: 44, opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: p.onOlive, fontSize: 16, fontWeight: '600' }}>Try again</Text>
      </Pressable>
    </View>
  );
}
