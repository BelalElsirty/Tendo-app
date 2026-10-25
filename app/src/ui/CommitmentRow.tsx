import { useEffect, useRef } from 'react';
import { Pressable, View, type AccessibilityActionEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { formatPoints } from '../domain/score';
import { completeTick, holdTick } from '../services/haptics';
import type { PlannedItem } from '../state/todayModel';
import { radius } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { Box, T, Tag } from './kit';

/** Hold length grows with weight: the heavier the commitment, the longer the hold (×1.0 ≈ 0.9s). */
export const holdDuration = (weight: number) => 420 + weight * 480;
/** A press shorter than this is a tap (open details), not a hold. */
const TAP_MS = 250;

export function metaLine(i: PlannedItem): string {
  if (i.streak > 0 && i.kept !== null) return i.streak + '-day streak · kept ' + Math.round(i.kept * 100) + '%';
  if (i.streak > 0) return i.streak + '-day streak';
  if (i.kept !== null) return 'streak reset · kept ' + Math.round(i.kept * 100) + '%';
  return 'New · learning your pattern';
}

export function progressLabel(i: PlannedItem): string | null {
  if (i.weekly) return i.weekCount + ' / ' + i.weekTarget + ' this week';
  if ((i.c.track === 'amount' || i.c.track === 'duration') && i.c.target) {
    const unit = i.c.track === 'duration' ? 'min' : i.c.unit ?? '';
    return formatPoints(i.entry.progress) + ' / ' + formatPoints(i.c.target) + (unit ? ' ' + unit : '');
  }
  return null;
}

interface Props {
  item: PlannedItem;
  priority?: boolean;
  onComplete: (done: boolean) => void;
  onOpen: () => void;
  onActions: () => void;
  onLog: () => void;
}

/**
 * Commitment row with press-and-hold completion: an olive sweep fills the row for the
 * hold duration, then the row settles as done. Holding a done row undoes it. Tapping opens
 * details. Screen readers get Complete / Undo as an accessibility action (PRD §33).
 */
export function CommitmentRow({ item, priority, onComplete, onOpen, onActions, onLog }: Props) {
  const p = usePalette();
  const fill = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);
  const fired = useRef(false);
  const { c, done, skipped } = item;
  const measured = progressLabel(item);
  const showBar = !!measured && !skipped;
  const settled = done || skipped;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  function pressIn() {
    fired.current = false;
    started.current = Date.now();
    if (skipped) return;
    const dur = holdDuration(c.weight) * (done ? 0.6 : 1);
    holdTick();
    fill.value = withTiming(1, { duration: dur, easing: Easing.linear });
    timer.current = setTimeout(() => {
      fired.current = true;
      completeTick();
      onComplete(!done);
      fill.value = withTiming(0, { duration: 260 });
    }, dur);
  }

  function pressOut() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!fired.current) fill.value = withTiming(0, { duration: 140 });
  }

  function press() {
    if (fired.current || Date.now() - started.current > TAP_MS) return;
    onOpen();
  }

  function onA11yAction(e: AccessibilityActionEvent) {
    if (e.nativeEvent.actionName === 'complete') onComplete(!done);
    if (e.nativeEvent.actionName === 'activate') onOpen();
    if (e.nativeEvent.actionName === 'more') onActions();
  }

  const state = done ? 'completed' : skipped ? 'skipped today' : item.entry.optional ? 'optional, not done' : 'not done';
  const nameColor = settled ? p.muted : p.text;
  const wColor = c.weight >= 1.6 ? p.olive : p.muted;

  return (
    <View style={{
      backgroundColor: priority ? p.oliveBg : p.surface, borderRadius: radius.md, flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden',
      borderWidth: priority ? 1 : 0, borderColor: p.oliveBd, opacity: settled && !priority ? 0.72 : 1,
    }}>
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={c.name + ', ' + state + (measured ? ', ' + measured : '') + ', weight ×' + c.weight.toFixed(1)}
        accessibilityHint={skipped ? 'Opens details.' : 'Hold to ' + (done ? 'undo' : 'complete') + '. Tap for details.'}
        accessibilityActions={[
          ...(skipped ? [] : [{ name: 'complete', label: done ? 'Mark not done' : 'Complete' }]),
          { name: 'activate', label: 'Open details' },
          { name: 'more', label: 'More actions' },
        ]}
        onAccessibilityAction={onA11yAction}
        style={{ flex: 1, minWidth: 0, padding: priority ? 17 : 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
      >
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: p.oliveFill }, fillStyle]} />
        <Box on={done} size={24} dash={skipped} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={600} size={priority ? 16 : 15.5} color={nameColor} style={{ textDecorationLine: skipped ? 'line-through' : 'none' }}>{c.name}</T>
          {showBar ? (
            <View style={{ height: 4, borderRadius: 3, backgroundColor: p.raised, marginTop: 8, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.round(item.fraction * 100)}%`, backgroundColor: p.olive, borderRadius: 3 }} />
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {skipped ? <Tag label="SKIPPED" tone="sand" /> : null}
            {item.entry.optional && !skipped ? <Tag label="OPTIONAL" dashed /> : null}
            <T size={12} color={p.muted}>{item.weekly ? 'Weekly target · not in the daily score' : metaLine(item)}</T>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          {measured ? (
            <Pressable onPress={onLog} hitSlop={8} accessibilityRole="button" accessibilityLabel={'Log progress for ' + c.name}>
              <T w={600} size={13} color={p.olive} style={{ fontVariant: ['tabular-nums'] }}>{measured}</T>
            </Pressable>
          ) : null}
          {!item.weekly ? (
            <T w={600} size={12.5} color={wColor} style={{ marginTop: measured ? 4 : 0, fontVariant: ['tabular-nums'] }}>×{c.weight.toFixed(1)}</T>
          ) : null}
        </View>
      </Pressable>
      <Pressable onPress={onActions} accessibilityRole="button" accessibilityLabel={'More actions for ' + c.name}
        style={{ width: 44, alignItems: 'center', justifyContent: 'center' }}>
        <T size={17} color={p.faint}>⋯</T>
      </Pressable>
    </View>
  );
}
