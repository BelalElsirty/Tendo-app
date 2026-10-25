import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { longLabel } from '../../../domain/dates';
import { formatPoints } from '../../../domain/score';
import { countWord } from '../../../domain/tone';
import type { TimeOfDay } from '../../../domain/types';
import { useTendo } from '../../../state/store';
import { scoreHeadline, useDayNumber, useTodayModel, type PlannedItem } from '../../../state/todayModel';
import { radius } from '../../../theme/tokens';
import { usePalette } from '../../../theme/useTheme';
import { CommitmentRow } from '../../../ui/CommitmentRow';
import { CommitmentSheets, useCommitmentSheets } from '../../../ui/CommitmentSheets';
import { Button, Card, Display, Eyebrow, Muted, Screen, T } from '../../../ui/kit';
import { ScoreArc } from '../../../ui/ScoreArc';
import { Sheet } from '../../../ui/Sheet';

const ORDER: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'any'];
const SECTION_LABEL: Record<TimeOfDay, string> = { morning: 'MORNING', afternoon: 'AFTERNOON', evening: 'EVENING', any: 'ANY TIME' };
/** How long a just-completed row holds its place before settling below unfinished rows. */
const SETTLE_MS = 520;
const HEAVY_DAY = 8;

/** Remembers rows that just changed state so they stay put briefly before moving. */
function useSettling(items: PlannedItem[]) {
  const prev = useRef(new Map<string, boolean>());
  const [settling, setSettling] = useState<Set<string>>(new Set());
  useEffect(() => {
    const changed: string[] = [];
    for (const i of items) {
      const settled = i.done || i.skipped;
      const was = prev.current.get(i.c.id);
      if (was !== undefined && was !== settled) changed.push(i.c.id);
      prev.current.set(i.c.id, settled);
    }
    if (!changed.length) return;
    setSettling(s => new Set([...s, ...changed]));
    const t = setTimeout(() => setSettling(s => new Set([...s].filter(id => !changed.includes(id)))), SETTLE_MS);
    return () => clearTimeout(t);
  }, [items]);
  return settling;
}

export default function Today() {
  const p = usePalette();
  const reduce = useReducedMotion();
  const m = useTodayModel();
  const dayNo = useDayNumber();
  const st = useTendo();
  const sheets = useCommitmentSheets();
  const [closeOut, setCloseOut] = useState(false);
  const head = scoreHeadline(m);
  const settling = useSettling(m.planned);

  const priorityId = m.day?.priorityId ?? null;
  const priority = m.planned.find(i => i.c.id === priorityId && !i.skipped) ?? null;
  const rest = m.planned.filter(i => i !== priority);

  const sections = useMemo(() => {
    // Unfinished first, completed after; otherwise keep the user's order (PRD §14, acceptance §37).
    const rank = (i: PlannedItem) => (settling.has(i.c.id) ? (i.done || i.skipped ? 0 : 1) : i.done || i.skipped ? 1 : 0);
    const sort = (arr: PlannedItem[]) => arr.map((i, n) => ({ i, n })).sort((a, b) => rank(a.i) - rank(b.i) || a.n - b.n).map(x => x.i);
    const grouped = ORDER.map(t => ({ t, items: sort(rest.filter(i => i.c.timeOfDay === t)) })).filter(g => g.items.length);
    if (rest.length > 4 && grouped.length > 1) return grouped.map(g => ({ key: g.t, label: SECTION_LABEL[g.t], progress: g.items.filter(i => i.done).length + ' / ' + g.items.length, items: g.items }));
    return [{ key: 'all', label: '', progress: '', items: sort(rest) }];
  }, [rest, settling]);

  const allDone = m.score.items.length > 0 && m.left === 0;
  const heavy = m.score.items.length >= HEAVY_DAY && st.settings.heavyDismissedOn !== m.today;
  const mood = m.day?.mood;

  const row = (i: PlannedItem, isPriority = false) => (
    <CommitmentRow
      item={i}
      priority={isPriority}
      onComplete={done => st.setDone(i.c.id, done)}
      onOpen={() => router.push({ pathname: '/commitment/[id]', params: { id: i.c.id } })}
      onActions={() => sheets.open(i.c.id, 'actions')}
      onLog={() => sheets.open(i.c.id, 'log')}
    />
  );

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <T w={700} size={22} accessibilityRole="header">{longLabel(m.today)}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <T size={11} color={p.muted} style={{ letterSpacing: 0.66 }}>DAY {dayNo}</T>
          <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: p.olive }} />
        </View>
      </View>
      {mood ? (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <T size={12.5} color={p.muted}>Feeling {mood.toLowerCase()} · only you see this</T>
          {!m.day?.moodEdited ? (
            <T size={12.5} w={600} color={p.olive} accessibilityRole="button" onPress={() => router.push('/checkin')}>Change</T>
          ) : null}
        </View>
      ) : null}

      <ScoreArc fraction={head.fraction} text={head.text} sub={head.sub} onPress={() => router.push('/today/score')} />

      <T w={700} size={22} style={{ marginTop: 30, letterSpacing: -0.22 }}>{m.coach}</T>

      {heavy ? (
        <Card tone="outline" style={{ marginTop: 18 }}>
          <T w={600} size={14.5}>You have {m.score.items.length} commitments today.</T>
          <T size={13} color={p.secondary} style={{ marginTop: 5, lineHeight: 19 }}>Want to mark a few as optional? Optional ones can't lower your score.</T>
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
            <Pill label="Review" primary onPress={() => router.push('/today/manage')} />
            <Pill label="Keep all" onPress={() => st.updateSettings({ heavyDismissedOn: m.today })} />
          </View>
        </Card>
      ) : null}

      {priority ? (
        <>
          <Eyebrow color={p.olive} style={{ marginTop: 24, marginBottom: 8 }}>Today's priority</Eyebrow>
          {row(priority, true)}
        </>
      ) : null}

      {m.planned.length === 0 ? (
        <View style={{ marginTop: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: p.border, borderRadius: radius.lg, paddingVertical: 28, paddingHorizontal: 22, alignItems: 'center' }}>
          <T w={700} size={20} style={{ letterSpacing: -0.2 }}>{st.commitments.some(c => c.lifecycle === 'active') ? 'Nothing due today.' : 'Nothing committed yet.'}</T>
          <T size={14} color={p.secondary} style={{ marginTop: 8, lineHeight: 21, textAlign: 'center' }}>
            {st.commitments.some(c => c.lifecycle === 'active')
              ? 'Nothing on your schedule lands today. The score waits for tomorrow.'
              : 'A score needs something to measure. Add two or three things you\'d do on a good day.'}
          </T>
          <Pill label="Add your first" primary onPress={() => router.push('/create')} style={{ marginTop: 18 }} />
        </View>
      ) : null}

      {rest.length > 0 ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 8 }}>
            <Eyebrow>My commitments</Eyebrow>
          </View>
          <View style={{ gap: 18 }}>
            {sections.map(sec => (
              <View key={sec.key} style={{ gap: 10 }}>
                {sec.label ? (
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }} accessible accessibilityRole="header"
                    accessibilityLabel={sec.label.toLowerCase() + ', ' + sec.progress.replace(' / ', ' of ') + ' done'}>
                    <T w={600} size={11} color={p.faint} style={{ letterSpacing: 1.54 }}>{sec.label}</T>
                    <T size={11} color={p.faint} style={{ fontVariant: ['tabular-nums'] }}>{sec.progress}</T>
                  </View>
                ) : null}
                {sec.items.map(i => (
                  <Animated.View key={i.c.id} layout={reduce ? undefined : LinearTransition.duration(320)}>
                    {row(i)}
                  </Animated.View>
                ))}
              </View>
            ))}
          </View>
        </>
      ) : null}

      {allDone ? (
        <Card tone="olive" style={{ marginTop: 16, padding: 20, alignItems: 'center' }}>
          <Display size={33} color={p.olive}>100%</Display>
          <T w={700} size={22} style={{ marginTop: 10, letterSpacing: -0.22 }}>All commitments complete.</T>
          <T w={600} size={17} color={p.muted} style={{ marginTop: 8 }}>keep your way</T>
          <Pill label="Close out the day" outline onPress={() => setCloseOut(true)} style={{ marginTop: 16 }} />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
        <Pressable onPress={() => router.push('/create')} accessibilityRole="button"
          style={{ flex: 1, borderWidth: 1, borderColor: p.border, borderRadius: radius.md, padding: 15, alignItems: 'center', minHeight: 48 }}>
          <T size={14} color={p.secondary}>+ Add a commitment</T>
        </Pressable>
        <Pressable onPress={() => router.push('/today/manage')} accessibilityRole="button"
          style={{ borderWidth: 1, borderColor: p.border, borderRadius: radius.md, paddingVertical: 15, paddingHorizontal: 18, minHeight: 48 }}>
          <T size={14} color={p.secondary}>Manage</T>
        </Pressable>
      </View>

      <CommitmentSheets ctl={sheets} />

      <Sheet visible={closeOut} onClose={() => setCloseOut(false)}>
        <Eyebrow>Day {dayNo} · closing</Eyebrow>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 10 }}>
          <T w={700} size={49} style={{ letterSpacing: -1.4 }}>{head.text}</T>
          <T size={13.5} color={p.secondary} style={{ flexShrink: 1 }}>{head.sub}</T>
        </View>
        <View style={{ marginTop: 20, backgroundColor: p.raised, borderRadius: 10, overflow: 'hidden', gap: 1 }}>
          {m.planned.filter(i => !i.weekly).map(i => (
            <View key={i.c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: p.surface, paddingVertical: 13, paddingHorizontal: 14 }}>
              <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: i.done ? p.olive : p.borderStrong }} />
              <T size={14.5} color={i.done ? p.text : p.muted} style={{ flex: 1 }}>{i.c.name}</T>
              <T size={13} color={p.muted} style={{ fontVariant: ['tabular-nums'] }}>
                {i.skipped ? 'skipped' : i.entry.optional ? 'optional' : (i.done ? '+' : '—') + ' ' + formatPoints(i.points)}
              </T>
            </View>
          ))}
        </View>
        <T w={700} size={19} style={{ marginTop: 18, lineHeight: 26 }}>
          {m.left === 0 ? 'Clean sheet. That is how the number climbs.' : countWord(m.left) + ' unfinished. The ones you skip most gain weight over time.'}
        </T>
        <Muted style={{ marginTop: 8 }}>The day closes on its own at your day end. You can still log until then.</Muted>
        <Button label="Done" style={{ marginTop: 18 }} onPress={() => setCloseOut(false)} />
      </Sheet>
    </Screen>
  );
}

function Pill({ label, onPress, primary, outline, style }: { label: string; onPress: () => void; primary?: boolean; outline?: boolean; style?: object }) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[{
      paddingVertical: 11, paddingHorizontal: 20, borderRadius: 999, minHeight: 44, justifyContent: 'center',
      backgroundColor: primary ? p.olive : 'transparent', borderWidth: primary ? 0 : 1, borderColor: outline ? p.oliveBd : p.border,
    }, style]}>
      <T w={600} size={13.5} color={primary ? p.onOlive : outline ? p.olive : p.secondary}>{label}</T>
    </Pressable>
  );
}
