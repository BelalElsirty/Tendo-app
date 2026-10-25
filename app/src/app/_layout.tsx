import {
  Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, useFonts,
} from '@expo-google-fonts/montserrat';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initCrashReporting, wrapRoot } from '../services/crash';
import { onHydrationError, useTendo } from '../state/store';
import { usePalette } from '../theme/useTheme';
import { ToastHost } from '../ui/Toast';

initCrashReporting();

/** Any screen that throws while rendering lands here instead of a blank app. */
export { ErrorScreen as ErrorBoundary } from '../ui/ErrorScreen';

function useHydrated() {
  const [done, setDone] = useState(() => useTendo.persist.hasHydrated());
  const [failed, setFailed] = useState<unknown>(null);
  useEffect(() => {
    const unsub = useTendo.persist.onFinishHydration(() => setDone(true));
    const unsubError = onHydrationError(setFailed);
    setDone(useTendo.persist.hasHydrated());
    return () => { unsub(); unsubError(); };
  }, []);
  // Hand saved data that couldn't be read to the error boundary. The app must not carry on with
  // a fresh state, which would be saved over the user's data.
  if (failed) throw failed instanceof Error ? failed : new Error(String(failed));
  return done;
}

/** Keeps the Tendo date current: on launch, every minute, and whenever the app returns to the foreground. */
function useDayKeeper(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const roll = () => useTendo.getState().rollover();
    roll();
    const t = setInterval(roll, 60_000);
    const sub = AppState.addEventListener('change', st => { if (st === 'active') roll(); });
    return () => { clearInterval(t); sub.remove(); };
  }, [enabled]);
}

export default wrapRoot(RootLayout);

function RootLayout() {
  const [fontsLoaded] = useFonts({ Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold });
  const hydrated = useHydrated();
  const stage = useTendo(s => s.stage);
  const p = usePalette();
  useDayKeeper(hydrated);

  if (!fontsLoaded || !hydrated) return <View style={{ flex: 1, backgroundColor: p.bg }} />;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg }, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="legal" />
          <Stack.Protected guard={stage === 'signedOut'} redirectTo="/">
            <Stack.Screen name="welcome" />
            <Stack.Screen name="register" />
            <Stack.Screen name="login" />
            <Stack.Screen name="forgot" />
          </Stack.Protected>
          <Stack.Protected guard={stage === 'verify'} redirectTo="/">
            <Stack.Screen name="verify" />
          </Stack.Protected>
          <Stack.Protected guard={stage === 'username' || stage === 'ready'} redirectTo="/">
            <Stack.Screen name="username" />
          </Stack.Protected>
          <Stack.Protected guard={stage === 'onboarding'} redirectTo="/">
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Protected guard={stage === 'ready'} redirectTo="/">
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="checkin" />
            <Stack.Screen name="commitment/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="create" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="schedule" options={{ animation: 'slide_from_right' }} />
          </Stack.Protected>
        </Stack>
        <ToastHost />
      </View>
    </SafeAreaProvider>
  );
}
