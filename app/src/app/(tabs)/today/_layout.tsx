import { Stack } from 'expo-router/stack';
import { usePalette } from '../../../theme/useTheme';

/** Today keeps its tab bar for the score breakdown and Manage, as in the prototype. */
export default function TodayStack() {
  const p = usePalette();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg }, animation: 'slide_from_right' }} />;
}
