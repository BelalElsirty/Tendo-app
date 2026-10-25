import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const safe = (fn: () => Promise<void>) => { if (Platform.OS !== 'web') fn().catch(() => {}); };

/** Light tick when a hold starts. */
export const holdTick = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
/** Confirmation when a commitment completes. */
export const completeTick = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const selectTick = () => safe(() => Haptics.selectionAsync());
