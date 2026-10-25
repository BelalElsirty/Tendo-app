import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { usePalette } from '../theme/useTheme';
import { T } from './kit';

const LABELS: Record<string, string> = { today: 'Today', groups: 'Groups', progress: 'Progress', you: 'You' };

function Icon({ name, color }: { name: string; color: string }) {
  const sw = 1.8;
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      {name === 'today' && <><Path d="M3 13a7 7 0 0 1 14 0" stroke={color} strokeWidth={sw} strokeLinecap="round" /><Path d="M10 13 14 8" stroke={color} strokeWidth={sw} strokeLinecap="round" /></>}
      {name === 'groups' && <><Circle cx={7.5} cy={7} r={3} stroke={color} strokeWidth={sw} /><Circle cx={14} cy={8.5} r={2.2} stroke={color} strokeWidth={sw} /><Path d="M2.5 16c0-2.5 2.2-4 5-4s5 1.5 5 4" stroke={color} strokeWidth={sw} strokeLinecap="round" /></>}
      {name === 'progress' && <Path d="M3 14l4-5 3.5 3L17 5" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />}
      {name === 'you' && <><Circle cx={10} cy={7} r={3.2} stroke={color} strokeWidth={sw} /><Path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke={color} strokeWidth={sw} strokeLinecap="round" /></>}
    </Svg>
  );
}

/** Four-tab bar from the prototype: Today · Groups · Progress · You. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: p.divider, backgroundColor: p.tabBar, paddingTop: 11, paddingHorizontal: 8, paddingBottom: Math.max(insets.bottom, 14) + 4 }}
    >
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const color = focused ? p.text : p.faint;
        const key = route.name.split('/')[0];
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={LABELS[key]}
            onPress={() => {
              if (!focused) navigateToTab(route.key);
              // Re-tapping Today returns to its root from the score or Manage screens.
              else if (key === 'today') router.dismissTo('/today');
            }}
            style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 4, minHeight: 44 }}
          >
            <Icon name={key} color={color} />
            <T size={10.5} w={focused ? 600 : 500} color={color}>{LABELS[key]}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
