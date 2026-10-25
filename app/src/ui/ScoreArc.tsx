import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { usePalette } from '../theme/useTheme';
import { T } from './kit';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const ARC = 'M20 118 A98 98 0 0 1 216 118';
const LEN = 308;

/** Half-ring score gauge with the number, the comparison line and "SEE THE MATH". */
export function ScoreArc({ fraction, text, sub, onPress }: { fraction: number; text: string; sub: string; onPress: () => void }) {
  const p = usePalette();
  const reduce = useReducedMotion();
  const f = useSharedValue(fraction);
  useEffect(() => {
    f.value = reduce ? fraction : withTiming(fraction, { duration: 400, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
  }, [fraction, reduce, f]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: LEN * (1 - Math.max(0, Math.min(1, f.value))) }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={'Discipline Score ' + (text === '—' ? 'not rated' : text) + '. ' + sub + '. See the math.'}
      style={{ alignItems: 'center', marginTop: 16 }}
    >
      <Svg width={236} height={132} viewBox="0 0 236 132">
        <Path d={ARC} fill="none" stroke={p.raised} strokeWidth={14} strokeLinecap="round" />
        <AnimatedPath d={ARC} fill="none" stroke={p.olive} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${LEN} ${LEN}`} animatedProps={props} />
      </Svg>
      <View style={{ marginTop: -86, alignItems: 'center' }}>
        <T w={700} size={62} style={{ letterSpacing: -1.2, lineHeight: 64, fontVariant: ['tabular-nums'] }}>{text}</T>
        <T size={12} color={p.secondary} style={{ marginTop: 8 }}>{sub}</T>
        <T w={600} size={11} color={p.olive} style={{ marginTop: 6, letterSpacing: 0.66 }}>SEE THE MATH</T>
      </View>
    </Pressable>
  );
}
