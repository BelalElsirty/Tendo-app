import { type ReactNode } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { fonts, radius, type FontWeight } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';

/** Montserrat text. Body copy is 500, controls 600, headings and numerals 700 (PRD §36). */
export function T({ w = 500, size = 15, color, style, ...rest }: TextProps & { w?: FontWeight; size?: number; color?: string }) {
  const p = usePalette();
  return (
    <Text
      {...rest}
      style={[{ fontFamily: fonts[w], fontSize: size, color: color ?? p.text, letterSpacing: size >= 20 ? -0.01 * size : 0 }, style]}
    />
  );
}

/** Large display heading: tight tracking, 700. */
export function Display({ size = 33, children, style, color }: { size?: number; children: ReactNode; style?: StyleProp<TextStyle>; color?: string }) {
  return (
    <T w={700} size={size} color={color} style={[{ letterSpacing: -0.03 * size, lineHeight: size * 1.06 }, style]}>
      {children}
    </T>
  );
}

export function Eyebrow({ children, color, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  const p = usePalette();
  return (
    <T w={600} size={11} color={color ?? p.muted} style={[{ letterSpacing: 1.76, textTransform: 'uppercase' }, style]}>
      {children}
    </T>
  );
}

export function Muted({ children, size = 12.5, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  const p = usePalette();
  return <T size={size} color={p.muted} style={[{ lineHeight: size * 1.5 }, style]}>{children}</T>;
}

export function Body({ children, size = 15, style, color }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle>; color?: string }) {
  const p = usePalette();
  return <T size={size} color={color ?? p.secondary} style={[{ lineHeight: size * 1.5 }, style]}>{children}</T>;
}

interface ScreenProps {
  children: ReactNode;
  gutter?: number;
  scroll?: boolean;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Full-height screen with the prototype's 54pt top rhythm adapted to the safe area. */
export function Screen({ children, gutter = 20, scroll = true, footer, contentStyle }: ScreenProps) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: Math.max(insets.top + 10, 54), paddingHorizontal: gutter, paddingBottom: 24 };
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={[pad, { flexGrow: 1 }, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[pad, { flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer}
    </View>
  );
}

export const Spacer = ({ h = 0, flex }: { h?: number; flex?: boolean }) => <View style={flex ? { flex: 1, minHeight: h } : { height: h }} />;

export function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={'Back to ' + label} hitSlop={12} style={{ alignSelf: 'flex-start', minHeight: 24 }}>
      <T size={14} color={p.secondary}>‹ {label}</T>
    </Pressable>
  );
}

type ButtonKind = 'primary' | 'outline' | 'ghost' | 'danger';

export function Button({ label, onPress, kind = 'primary', disabled, style, small, accessibilityHint }: {
  label: string; onPress?: () => void; kind?: ButtonKind; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean; accessibilityHint?: string;
}) {
  const p = usePalette();
  const bg = disabled ? p.raised : kind === 'primary' ? p.olive : kind === 'danger' ? p.dangerStrong : 'transparent';
  const fg = disabled ? p.muted : kind === 'primary' ? p.onOlive : kind === 'danger' ? p.text : kind === 'ghost' ? p.textSoft : p.text;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [{
        backgroundColor: bg, borderRadius: radius.md, paddingVertical: small ? 15 : 18, alignItems: 'center', justifyContent: 'center',
        borderWidth: kind === 'outline' ? 1 : 0, borderColor: p.border, minHeight: 44, opacity: pressed && !disabled ? 0.85 : 1,
      }, style]}
    >
      <T w={600} size={small ? 15 : 16} color={fg}>{label}</T>
    </Pressable>
  );
}

export function TextLink({ label, onPress, color, size = 13.5, center, style }: { label: string; onPress: () => void; color?: string; size?: number; center?: boolean; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={[{ paddingVertical: 6, alignSelf: center ? 'center' : 'flex-start' }, style]}>
      <T w={600} size={size} color={color ?? p.olive} style={center ? { textAlign: 'center' } : undefined}>{label}</T>
    </Pressable>
  );
}

/** The prototype's pill chip: olive fill when active, hairline border otherwise. */
export function Chip({ label, active, onPress, compact, style, dashed }: { label: string; active?: boolean; onPress?: () => void; compact?: boolean; style?: StyleProp<ViewStyle>; dashed?: boolean }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: !!active }}
      style={[{
        paddingVertical: compact ? 9 : 11, paddingHorizontal: compact ? 14 : 16, borderRadius: radius.pill, borderWidth: 1,
        borderColor: active ? p.olive : p.border, backgroundColor: active ? p.olive : 'transparent', minHeight: 40, justifyContent: 'center',
        borderStyle: dashed ? 'dashed' : 'solid',
      }, style]}
    >
      <T w={600} size={compact ? 13 : 13.5} color={active ? p.onOlive : p.secondary}>{label}</T>
    </Pressable>
  );
}

export function ChipRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}

export function Check({ size = 15, color }: { size?: number; color?: string }) {
  const p = usePalette();
  return (
    <Svg width={size} height={(size * 10) / 13} viewBox="0 0 13 10">
      <Path d="M1 5l4 4 7-8" fill="none" stroke={color ?? p.olive} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Square tick box used on rows, onboarding and consent. */
export function Box({ on, size = 22, dash }: { on: boolean; size?: number; dash?: boolean }) {
  const p = usePalette();
  return (
    <View style={{
      width: size, height: size, borderRadius: size >= 24 ? 8 : 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
      borderColor: on ? p.olive : p.borderStrong, backgroundColor: on ? p.olive : 'transparent',
    }}>
      {on ? <Check size={size >= 24 ? 13 : 12} color={p.onOlive} /> : dash ? <View style={{ width: 11, height: 2, borderRadius: 2, backgroundColor: p.muted }} /> : null}
    </View>
  );
}

/** Bordered single-choice row with a check on the right (mood, day end, pause, track type…). */
export function OptionRow({ label, note, on, onPress, filled, accessibilityLabel }: { label: string; note?: string; on: boolean; onPress: () => void; filled?: boolean; accessibilityLabel?: string }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.md, paddingVertical: note ? 15 : 16, paddingHorizontal: 16,
        borderColor: on ? p.olive : p.border, backgroundColor: on ? p.oliveBg : filled ? p.surface : 'transparent', minHeight: 52,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={16} w={on ? 600 : 500} color={on ? p.text : p.textSoft}>{label}</T>
        {note ? <T size={12.5} color={p.muted} style={{ marginTop: 3 }}>{note}</T> : null}
      </View>
      {on ? <Check /> : null}
    </Pressable>
  );
}

export function Field({ label, style, error, prefix, right, ...rest }: TextInputProps & { label?: string; error?: boolean; prefix?: string; right?: ReactNode }) {
  const p = usePalette();
  return (
    <View>
      {label ? <Eyebrow style={{ marginTop: 18, marginBottom: 8 }}>{label}</Eyebrow> : null}
      <View>
        {prefix ? <T w={600} size={15} color={p.muted} style={{ position: 'absolute', left: 16, top: 17, zIndex: 1 }}>{prefix}</T> : null}
        <TextInput
          placeholderTextColor={p.faint}
          accessibilityLabel={label}
          {...rest}
          style={[{
            backgroundColor: p.surface, borderWidth: 1, borderColor: error ? p.errorBd : p.border, borderRadius: radius.sm,
            padding: 16, paddingLeft: prefix ? 34 : 16, paddingRight: right ? 74 : 16, color: p.text, fontFamily: fonts[600], fontSize: 16,
          }, style]}
        />
        {right ? <View style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}>{right}</View> : null}
      </View>
    </View>
  );
}

export function Card({ children, style, tone = 'surface' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'surface' | 'olive' | 'danger' | 'outline' }) {
  const p = usePalette();
  const map = {
    surface: { backgroundColor: p.surface, borderColor: p.surface },
    olive: { backgroundColor: p.oliveBg, borderColor: p.oliveBd },
    danger: { backgroundColor: p.dangerBg, borderColor: p.dangerBd },
    outline: { backgroundColor: p.surface, borderColor: p.border },
  };
  return <View style={[{ borderRadius: radius.md, borderWidth: 1, padding: 16 }, map[tone], style]}>{children}</View>;
}

/** Settings-style grouped list. */
export function List({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return <View style={[{ backgroundColor: p.surface, borderRadius: radius.md, overflow: 'hidden' }, style]}>{children}</View>;
}

export function ListRow({ label, value, onPress, last, valueColor, danger }: { label: string; value?: string; onPress?: () => void; last?: boolean; valueColor?: string; danger?: boolean }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, minHeight: 52,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: p.divider, backgroundColor: pressed ? p.raised : 'transparent',
      })}
    >
      <T size={15} color={danger ? p.dangerSoft : p.text}>{label}</T>
      {value !== undefined || onPress ? (
        <T size={14} color={valueColor ?? p.muted} numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>
          {value ?? ''}{onPress ? ' ›' : ''}
        </T>
      ) : null}
    </Pressable>
  );
}

/** Stat with a hairline on top, as on detail, You and Progress. */
export function Stat({ label, value, accent, size = 25 }: { label: string; value: string; accent?: boolean; size?: number }) {
  const p = usePalette();
  return (
    <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: p.border, paddingTop: 12 }} accessible accessibilityLabel={label + ', ' + value}>
      <T size={11} color={p.muted} style={{ letterSpacing: 1.1 }}>{label}</T>
      <T w={700} size={size} color={accent ? p.olive : p.text} style={{ marginTop: 4, letterSpacing: -0.01 * size }}>{value}</T>
    </View>
  );
}

/** Small status tag (SKIPPED, OPTIONAL, PAUSED…). Always text, never colour alone. */
export function Tag({ label, tone = 'neutral', dashed }: { label: string; tone?: 'neutral' | 'sand' | 'olive'; dashed?: boolean }) {
  const p = usePalette();
  const fg = tone === 'sand' ? p.sand : tone === 'olive' ? p.olive : p.muted;
  const bd = tone === 'sand' ? p.borderStrong : tone === 'olive' ? p.oliveBd : p.border;
  return (
    <View style={{ borderWidth: 1, borderColor: dashed ? p.borderStrong : bd, borderStyle: dashed ? 'dashed' : 'solid', borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 8 }}>
      <T w={600} size={10.5} color={fg} style={{ letterSpacing: 0.6 }}>{label}</T>
    </View>
  );
}

export function Stepper({ value, onMinus, onPlus, minusLabel, plusLabel }: { value: string; onMinus: () => void; onPlus: () => void; minusLabel: string; plusLabel: string }) {
  const p = usePalette();
  const btn = (label: string, a11y: string, fn: () => void) => (
    <Pressable onPress={fn} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={6}
      style={{ width: 36, height: 36, borderRadius: 999, borderWidth: 1, borderColor: p.border, alignItems: 'center', justifyContent: 'center' }}>
      <T size={17} color={p.secondary}>{label}</T>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {btn('−', minusLabel, onMinus)}
      <T w={700} size={21} style={{ minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{value}</T>
      {btn('+', plusLabel, onPlus)}
    </View>
  );
}

/** "—— or ——" separator above SSO buttons. */
export function Divider() {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: p.raised }} />
      <T size={12} color={p.muted}>or</T>
      <View style={{ flex: 1, height: 1, backgroundColor: p.raised }} />
    </View>
  );
}

export const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

export type { PressableProps };
