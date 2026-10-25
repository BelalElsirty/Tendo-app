import { Platform } from 'react-native';

/**
 * Asks the OS for notification permission. Only ever called after the in-app explainer's
 * Continue (PRD §25). Scheduling reminders arrives in Phase 3.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const N = await import('expo-notifications');
    const res = await N.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}
