import { router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { useEffect } from 'react';
import { useTendo } from '../../state/store';
import { usePalette } from '../../theme/useTheme';
import { TabBar } from '../../ui/TabBar';

export default function TabsLayout() {
  const p = usePalette();
  const today = useTendo(s => s.today);
  const checkedIn = useTendo(s => !!s.days[s.today]?.checkinDone);

  // A new Tendo day opens with the check-in, even if the app stayed open overnight.
  useEffect(() => {
    if (!checkedIn) router.push('/checkin');
  }, [today, checkedIn]);

  return (
    <Tabs tabBar={props => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: p.bg } }}>
      <Tabs.Screen name="today" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
