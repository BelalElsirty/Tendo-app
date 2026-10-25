import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { addDays, longLabel } from '../../domain/dates';
import { entryOf, plannedOn } from '../../domain/score';
import { currentSchedule, isWeekly, patternLabel } from '../../domain/schedule';
import { bestCommitmentStreak, commitmentStreak, keptRate, recentDots, type DotState } from '../../domain/streaks';
import { TIME_LABELS } from '../../domain/library';
import { useTendo } from '../../state/store';
import { usePalette } from '../../theme/useTheme';
import { CommitmentSheets, useCommitmentSheets } from '../../ui/CommitmentSheets';
import { BackLink, Button, Eyebrow, ListRow, List, Muted, Screen, Stat, T, Tag } from '../../ui/kit';

const pct = (r: number | null) => (r === null ? '—' : Math.round(r * 100) + '%');

export default function CommitmentDetail() {
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const st = useTendo();
  const sheets = useCommitmentSheets();
  const c = st.commitments.find(x => x.id === id);

  useEffect(() => { if (!c) router.back(); }, [c]);
  if (!c) return null;

  const today = st.today;
  const entry = entryOf(st.days[today], c.id);
  const planned = plannedOn(st.commitments, today).some(x => x.id === c.id);
  const weekly = isWeekly(c, today);
  const done = entry.state === 'done';
  const streak = commitmentStreak(c, st.days, today);
  const best = bestCommitmentStreak(c, st.days, today);
  const k7 = keptRate(c, st.days, today, 7);
  const k30 = keptRate(c, st.days, today, 30);
  const kAll = keptRate(c, st.days, today, 3650);
  const dots = recentDots(c, st.days, today);
  const sched = currentSchedule(c);

  // This calendar month: scored occurrences kept / scheduled.
  let monthOcc = 0, monthKept = 0;
  for (let d = today.slice(0, 8) + '01'; d < today; d = addDays(d, 1)) {
    const item = st.days[d]?.summary?.items.find(x => x.id === c.id);
    if (!item) continue;
    monthOcc++;
    if (item.outcome === 'completed') monthKept++;
  }
  if (planned && !weekly) { monthOcc++; if (done) monthKept++; }

  const w = c.weight;
  const whyWeight = k30 === null
    ? 'New commitments start at ×1.0. After five scheduled days, Tendo sets the weight from how often you keep it.'
    : 'You kept this ' + Math.round(k30 * 100) + '% of the time over the last 30 days. ' + (
      w >= 1.6 ? 'You avoid this one more than most, so Tendo raised its weight. It moves your score the most.'
        : w >= 1.3 ? 'You miss it often enough that Tendo nudged its weight above the baseline.'
          : w > 1 ? 'An occasional miss keeps it slightly above the base weight.'
            : 'You rarely miss it, so it sits at the base weight. The ones you avoid are worth more.');

  const dotColor = (s: DotState) => (s === 'kept' ? p.olive : s === 'today' ? 'transparent' : p.surface);
  const dotBorder = (s: DotState) => (s === 'kept' ? p.olive : s === 'today' ? p.olive : s === 'missed' ? p.borderStrong : p.raised);
  const keptCount = dots.filter(d => d.state === 'kept').length;
  const missedCount = dots.filter(d => d.state === 'missed').length;

  return (
    <Screen>
      <BackLink label="Back" onPress={() => router.back()} />
      <T w={700} size={30} style={{ marginTop: 16, letterSpacing: -0.3, lineHeight: 34 }} accessibilityRole="header">{c.name}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        <T size={13} color={p.muted}>{c.category} · {patternLabel(sched.pattern)} · {TIME_LABELS[c.timeOfDay].toLowerCase()}</T>
        {c.lifecycle === 'paused' ? <Tag label="PAUSED" /> : null}
        {c.lifecycle === 'archived' ? <Tag label="ARCHIVED" /> : null}
      </View>
      {c.lifecycle === 'paused' ? (
        <Muted style={{ marginTop: 8 }}>{c.pausedUntil ? 'Paused. It comes back on ' + longLabel(c.pausedUntil) + '.' : 'Paused until you resume it. It won’t appear on Today or count as missed.'}</Muted>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
        <Stat label="WEIGHT" value={'×' + w.toFixed(1)} accent />
        <Stat label="STREAK" value={String(streak)} />
        <Stat label="KEPT" value={pct(k30)} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Stat label="BEST STREAK" value={String(best)} />
        <Stat label="THIS MONTH" value={monthOcc ? monthKept + ' / ' + monthOcc : '—'} />
      </View>

      <View style={{ marginTop: 20, backgroundColor: p.surface, borderRadius: 12, padding: 18 }}>
        <T size={11} color={p.muted} style={{ letterSpacing: 1.1 }}>MOMENTUM</T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 5 }}>
          <T w={700} size={28} color={p.olive}>{pct(k30)}</T>
          <T size={12.5} color={p.muted}>last 30 days</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 18, marginTop: 14 }}>
          {[['7 DAYS', k7], ['30 DAYS', k30], ['ALL TIME', kAll]].map(([l, v]) => (
            <View key={l as string}><T size={11} color={p.muted}>{l as string}</T><T size={15} style={{ marginTop: 3 }}>{pct(v as number | null)}</T></View>
          ))}
        </View>
      </View>

      {c.why ? (
        <View style={{ marginTop: 12, paddingVertical: 4 }}>
          <T size={11} color={p.muted} style={{ letterSpacing: 1.1 }}>WHY I DO THIS</T>
          <T w={600} size={19} color={p.textSoft} style={{ marginTop: 6, lineHeight: 26 }}>{c.why}</T>
        </View>
      ) : null}

      <View style={{ marginTop: 12, backgroundColor: p.surface, borderRadius: 12, padding: 18 }}>
        <T w={600} size={14}>Why it's worth ×{w.toFixed(1)}</T>
        <T size={13.5} color={p.secondary} style={{ marginTop: 8, lineHeight: 21 }}>{whyWeight}</T>
      </View>

      <Eyebrow style={{ marginTop: 24, marginBottom: 12 }}>Last 14 days</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessible accessibilityLabel={'Last 14 days: ' + keptCount + ' kept, ' + missedCount + ' missed.'}>
        {dots.map(d => (
          <View key={d.date} style={{ width: '12%', flexGrow: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: dotColor(d.state), borderWidth: 1, borderColor: dotBorder(d.state), borderStyle: d.state === 'skipped' ? 'dashed' : 'solid' }} />
        ))}
      </View>
      <Muted size={12} style={{ marginTop: 8 }}>Filled: kept · outlined: missed · dashed: skipped · ringed: today</Muted>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
        {planned && !entry.state.startsWith('skip') ? (
          <Button label={done ? 'Completed today' : 'Complete now'} kind={done ? 'outline' : 'primary'} small style={{ flex: 1 }}
            accessibilityHint={done ? 'Marks it not done' : undefined}
            onPress={() => (weekly || c.track === 'simple' || done ? st.setDone(c.id, !done) : sheets.open(c.id, 'log'))} />
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Button label="More" kind="outline" small style={{ paddingHorizontal: 20 }} onPress={() => sheets.open(c.id, 'actions')} />
      </View>
      <List style={{ marginTop: 12 }}>
        <ListRow label="Schedule" value={patternLabel(sched.pattern)} onPress={() => router.push({ pathname: '/create', params: { edit: c.id } })} last />
      </List>
      <CommitmentSheets ctl={sheets} />
    </Screen>
  );
}
