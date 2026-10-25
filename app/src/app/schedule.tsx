import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { longLabel } from '../domain/dates';
import { TIME_LABELS } from '../domain/library';
import { patternCadence, scheduleSummary, WEEKDAY_SHORT } from '../domain/schedule';
import type { SchedulePattern, TimeOfDay, Weekday } from '../domain/types';
import { useDraft } from '../state/draft';
import { useTendo } from '../state/store';
import { radius } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { DateField } from '../ui/DateField';
import { BackLink, Body, Button, Chip, ChipRow, Display, Eyebrow, Screen, Spacer, Stepper, T, TextLink } from '../ui/kit';

type Kind = SchedulePattern['kind'];
const PATTERNS: { kind: Kind; label: string }[] = [
  { kind: 'daily', label: 'Every day' }, { kind: 'weekdays', label: 'Weekdays' }, { kind: 'weekends', label: 'Weekends' },
  { kind: 'days', label: 'Specific days' }, { kind: 'perWeek', label: 'X times per week' }, { kind: 'interval', label: 'Every X days' },
];
const TIMES: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'any'];

function defaultPattern(kind: Kind, cur: SchedulePattern): SchedulePattern {
  switch (kind) {
    case 'days': return { kind, days: cur.kind === 'days' ? cur.days : [0, 2, 4] };
    case 'perWeek': return { kind, times: cur.kind === 'perWeek' ? cur.times : 3 };
    case 'interval': return { kind, every: cur.kind === 'interval' ? cur.every : 2 };
    default: return { kind } as SchedulePattern;
  }
}

/** Advanced scheduling lives here so the Add screen stays short (PRD §12). */
export default function Schedule() {
  const p = usePalette();
  const d = useDraft();
  const today = useTendo(s => s.today);
  const pat = d.pattern;
  const valid = pat.kind !== 'days' || pat.days.length > 0;
  const startLabel = d.startDate === today ? 'today' : longLabel(d.startDate);

  function toggleDay(i: Weekday) {
    if (pat.kind !== 'days') return;
    const days = pat.days.includes(i) ? pat.days.filter(x => x !== i) : [...pat.days, i].sort() as Weekday[];
    d.set({ pattern: { kind: 'days', days } });
  }

  function save() {
    if (!valid) return;
    d.set({ cadence: patternCadence(d.pattern) });
    router.back();
  }

  return (
    <Screen>
      <BackLink label="Back" onPress={save} />
      <Display size={30} style={{ marginTop: 16 }}>Custom schedule</Display>
      <Body size={13.5} style={{ marginTop: 8 }}>Everything advanced lives here, so the main screen stays short.</Body>

      <Eyebrow style={{ marginTop: 24, marginBottom: 12 }}>Pattern</Eyebrow>
      <ChipRow>{PATTERNS.map(x => <Chip key={x.kind} label={x.label} active={pat.kind === x.kind} onPress={() => d.set({ pattern: defaultPattern(x.kind, pat) })} />)}</ChipRow>

      {pat.kind === 'days' ? (
        <>
          <Eyebrow style={{ marginTop: 24, marginBottom: 12 }}>Days</Eyebrow>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {WEEKDAY_SHORT.map((label, i) => {
              const on = pat.days.includes(i as Weekday);
              return (
                <Pressable key={label} onPress={() => toggleDay(i as Weekday)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}
                  style={{ flex: 1, aspectRatio: 1, borderRadius: 10, borderWidth: 1, borderColor: on ? p.olive : p.border, backgroundColor: on ? p.olive : 'transparent', alignItems: 'center', justifyContent: 'center', minHeight: 40 }}>
                  <T w={600} size={13} color={on ? p.onOlive : p.secondary}>{label[0]}</T>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {pat.kind === 'perWeek' ? (
        <View style={{ marginTop: 18, backgroundColor: p.surface, borderRadius: 10, padding: 15, flexDirection: 'row', alignItems: 'center' }}>
          <T size={13.5} color={p.secondary} style={{ flex: 1 }}>Times per week</T>
          <Stepper value={String(pat.times)} minusLabel="Fewer times" plusLabel="More times"
            onMinus={() => d.set({ pattern: { kind: 'perWeek', times: Math.max(1, pat.times - 1) } })}
            onPlus={() => d.set({ pattern: { kind: 'perWeek', times: Math.min(7, pat.times + 1) } })} />
        </View>
      ) : null}

      {pat.kind === 'interval' ? (
        <View style={{ marginTop: 18, backgroundColor: p.surface, borderRadius: 10, padding: 15, flexDirection: 'row', alignItems: 'center' }}>
          <T size={13.5} color={p.secondary} style={{ flex: 1 }}>Every … days</T>
          <Stepper value={String(pat.every)} minusLabel="Shorter interval" plusLabel="Longer interval"
            onMinus={() => d.set({ pattern: { kind: 'interval', every: Math.max(2, pat.every - 1) } })}
            onPlus={() => d.set({ pattern: { kind: 'interval', every: Math.min(30, pat.every + 1) } })} />
        </View>
      ) : null}

      <Eyebrow style={{ marginTop: 24, marginBottom: 12 }}>Time of day</Eyebrow>
      <ChipRow>{TIMES.map(t => <Chip key={t} label={TIME_LABELS[t]} active={d.timeOfDay === t} onPress={() => d.set({ timeOfDay: t })} />)}</ChipRow>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
        <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: p.border, paddingTop: 12 }}>
          <T size={11} color={p.muted} style={{ letterSpacing: 1.1 }}>STARTS</T>
          <DateField label="Starts" value={d.startDate} min={d.editId ? undefined : today} onChange={v => d.set({ startDate: v, endDate: d.endDate && d.endDate < v ? null : d.endDate })} />
        </View>
        <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: p.border, paddingTop: 12 }}>
          <T size={11} color={p.muted} style={{ letterSpacing: 1.1 }}>ENDS</T>
          <DateField label="Ends" value={d.endDate} min={d.startDate} placeholder="No end date" onChange={v => d.set({ endDate: v })} />
          {d.endDate ? <TextLink label="Remove end date" size={12} color={p.muted} onPress={() => d.set({ endDate: null })} /> : null}
        </View>
      </View>
      <View style={{ marginTop: 18, backgroundColor: p.surface, borderRadius: radius.md, padding: 16 }} accessibilityLiveRegion="polite">
        <T size={13.5} color={p.secondary} style={{ lineHeight: 20 }}>
          {valid ? scheduleSummary(pat, TIME_LABELS[d.timeOfDay], startLabel, d.endDate ? longLabel(d.endDate) : null) : 'Pick at least one day.'}
        </T>
      </View>
      <Spacer flex h={20} />
      <Button label="Save schedule" disabled={!valid} onPress={save} style={{ marginTop: 22 }} />
    </Screen>
  );
}
