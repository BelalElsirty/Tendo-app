import Svg, { Path, Rect } from 'react-native-svg';
import { usePalette } from '../theme/useTheme';

export function Logo({ size = 76 }: { size?: number }) {
  const p = usePalette();
  return (
    <Svg width={size} height={size} viewBox="0 0 76 76" accessibilityLabel="Tendo">
      <Rect width={76} height={76} rx={22} fill={p.surface} />
      <Path d="M38 20a18 18 0 1 1-12.7 30.7" fill="none" stroke={p.olive} strokeWidth={5} strokeLinecap="round" />
    </Svg>
  );
}
