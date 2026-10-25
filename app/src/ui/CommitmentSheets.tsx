import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { addDays, shortLabel } from '../domain/dates';
import { creditFor, entryOf, formatPoints, plannedOn, weeklyCount } from '../domain/score';
import { currentSchedule, isWeekly, patternLabel, weeklyTarget } from '../domain/schedule';
import { useTendo } from '../state/store';
import { usePalette } from '../theme/useTheme';
import { DateField } from './DateField';
import { Body, Button, Field, Muted, OptionRow, T, TextLink } from './kit';
import { ActionList, Sheet } from './Sheet';
import { toast } from './Toast';

export type SheetKind = 'actions' | 'pause' | 'delete' | 'log';

/** Shared state for the commitment sheets so Today, Manage and Detail behave identically. */
export function useCommitmentSheets() {
  const [target, setTarget] = useState<{ id: string; kind: SheetKind } | null>(null);
  return {
    target,
    open: (id: string, kind: SheetKind) => setTarget({ id, kind }),
    close: () => setTarget(null),
  };
}

type Controller = ReturnType<typeof useCommitmentSheets>;

/** Sensible quick-add steps around a target: 2 L → 0.2 / 0.5 / 1, 10,000 steps → 1000 / 2500 / 5000. */
export function quickSteps(target: number): number[] {
  const nice = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
  const near = (x: number) => nice.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
  return Array.from(new Set([near(target / 10), near(target / 4), near(target / 2)])).filter(n => n > 0);
}

export function CommitmentSheets({ ctl }: { ctl: Controller }) {
  const p = usePalette();
  const st = useTendo();
  const c = st.commitments.find(x => x.id === ctl.target?.id);
  const [pauseMode, setPauseMode] = useState<'resume' | 'date'>('resume');
  const [pauseDate, setPauseDate] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  if (!c || !ctl.target) return null;

  const today = st.today;
  const kind = ctl.target.kind;
  const day = st.days[today];
  const entry = entryOf(day, c.id);
  const plannedToday = plannedOn(st.commitments, today).some(x => x.id === c.id);
  const weekly = isWeekly(c, today);
  const done = entry.state === 'done';
  const skipped = entry.state === 'skipped';
  const isPriority = day?.priorityId === c.id;
  const close = () => { ctl.close(); setManual(''); setPauseMode('resume'); setPauseDate(null); };
  const go = (k: SheetKind) => ctl.open(c.id, k);

  const meta = c.category + ' · ' + patternLabel(currentSchedule(c).pattern);

  const actions = [
    ...(plannedToday && !skipped ? [{
      key: 'complete', label: done ? 'Mark not done' : 'Complete', note: done ? 'Take it back off the board' : 'Counts toward today',
      onPress: () => { st.setDone(c.id, !done); close(); },
    }] : []),
    ...(plannedToday && !done ? [{
      key: 'skip', label: skipped ? 'Undo skip' : 'Skip today', note: skipped ? 'Back in today’s score' : 'Illness, travel, a rest day. Leaves your score alone',
      onPress: () => { st.setSkipped(c.id, !skipped); close(); if (!skipped) toast(c.name + ' skipped today. Your streak holds.'); },
    }] : []),
    ...(plannedToday && !weekly && !skipped ? [{
      key: 'optional', label: entry.optional ? 'Make it required' : 'Optional today', note: entry.optional ? 'Back in the score' : 'Can’t lower your score if left undone',
      onPress: () => { st.setOptional(c.id, !entry.optional); close(); },
    }] : []),
    ...(plannedToday && !skipped ? [{
      key: 'priority', label: isPriority ? 'Remove priority' : 'Make it today’s priority', note: 'Visual only. The score treats it the same',
      onPress: () => { st.setPriority(isPriority ? null : c.id); close(); },
    }] : []),
    c.lifecycle === 'paused'
      ? { key: 'resume', label: 'Resume', note: 'Back on the board from today', onPress: () => { st.resume(c.id); close(); toast(c.name + ' resumed.'); } }
      : c.lifecycle === 'active'
        ? { key: 'pause', label: 'Pause', note: 'Until you resume, or until a date', onPress: () => go('pause') }
        : null,
    c.lifecycle === 'archived'
      ? { key: 'restore', label: 'Restore', note: 'Put it back in rotation', onPress: () => { st.restore(c.id); close(); toast(c.name + ' restored.'); } }
      : { key: 'archive', label: 'Archive', note: 'Out of planning, still in your history', onPress: () => { st.archive(c.id); close(); toast(c.name + ' archived. History kept.'); } },
    { key: 'edit', label: 'Edit', note: c.firstRecordOn ? 'Name, category, schedule and time of day. Tracking type stays.' : 'Name, type, category, schedule and time of day', onPress: () => { close(); router.push({ pathname: '/create', params: { edit: c.id } }); } },
    { key: 'delete', label: 'Delete', note: 'Asks first. Archive keeps the history.', danger: true, onPress: () => go('delete') },
  ].filter(Boolean) as { key: string; label: string; note: string; danger?: boolean; onPress: () => void }[];

  // Log sheet values
  const isDuration = c.track === 'duration';
  const unit = isDuration ? 'min' : c.unit ?? '';
  const tgt = c.target ?? 1;
  const credit = creditFor(c, entry);
  const steps = isDuration ? [15, 30, 60] : quickSteps(tgt);
  const wkCount = weekly ? weeklyCount(c, st.days, today) : 0;
  const wkTarget = weekly ? weeklyTarget(c, today) : 0;
  const tomorrow = addDays(today, 1);

  return (
    <>
      <Sheet visible={kind === 'actions'} onClose={close} title={c.name}>
        <T size={13} color={p.muted} style={{ marginTop: 5 }}>{meta}</T>
        <ActionList items={actions} />
      </Sheet>

      <Sheet visible={kind === 'pause'} onClose={close} title={'Pause ' + c.name}>
        <Body size={13.5} style={{ marginTop: 8 }}>Paused commitments leave Today and never count as missed. History is kept.</Body>
        <View style={{ gap: 9, marginTop: 18 }}>
          <OptionRow label="Until I resume" note="Off Today until you bring it back" on={pauseMode === 'resume'} onPress={() => setPauseMode('resume')} />
          <OptionRow label="Until a date" note="Comes back on its own that morning" on={pauseMode === 'date'} onPress={() => setPauseMode('date')} />
        </View>
        {pauseMode === 'date' ? <DateField label="Resume on" value={pauseDate} min={tomorrow} onChange={setPauseDate} /> : null}
        <Button
          label="Pause"
          disabled={pauseMode === 'date' && !pauseDate}
          style={{ marginTop: 18 }}
          onPress={() => {
            const until = pauseMode === 'date' ? pauseDate : null;
            st.pause(c.id, until);
            close();
            toast(c.name + (until ? ' paused until ' + shortLabel(until) + '.' : ' paused until you resume.'));
          }}
        />
        <TextLink label="Cancel" color={p.textSoft} center size={14} onPress={close} style={{ marginTop: 10 }} />
      </Sheet>

      <Sheet visible={kind === 'delete'} onClose={close} title={'Delete ' + c.name + ' permanently?'}>
        <Body size={13.5} style={{ marginTop: 10 }}>This removes the commitment and all of its history from your days, scores and streaks. It cannot be undone.</Body>
        <Body size={13.5} style={{ marginTop: 6 }}>Archive takes it off Today and keeps the history.</Body>
        <Button label="Archive instead" style={{ marginTop: 18 }} onPress={() => { st.archive(c.id); close(); toast(c.name + ' archived. History kept.'); }} />
        <View style={{ marginTop: 10 }}>
          <Button label="Delete permanently" kind="outline" small onPress={() => {
            const name = c.name;
            close();
            st.remove(c.id);
            toast(name + ' deleted permanently.');
          }} />
        </View>
        <TextLink label="Cancel" color={p.textSoft} center size={14} onPress={close} style={{ marginTop: 10 }} />
      </Sheet>

      <Sheet visible={kind === 'log'} onClose={close} title={c.name}>
        {weekly ? (
          <>
            <T size={13} color={p.muted} style={{ marginTop: 5 }}>Times this week</T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginTop: 22 }}>
              <T w={700} size={49} color={p.olive} style={{ letterSpacing: -1.4 }}>{wkCount}</T>
              <T size={16} color={p.muted}>/ {wkTarget} this week</T>
            </View>
            <Button label={done ? 'Undo today' : 'Done today'} kind={done ? 'outline' : 'primary'} style={{ marginTop: 20 }}
              onPress={() => { st.setDone(c.id, !done); close(); }} />
            <Muted style={{ marginTop: 16 }}>Weekly targets score on the week, not the day. Spread them however you like.</Muted>
          </>
        ) : (
          <>
            <T size={13} color={p.muted} style={{ marginTop: 5 }}>{isDuration ? 'Time spent today' : 'Amount today'}</T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginTop: 22 }}>
              <T w={700} size={49} color={p.olive} style={{ letterSpacing: -1.4, fontVariant: ['tabular-nums'] }}>{formatPoints(entry.progress)}</T>
              <T size={16} color={p.muted}>/ {formatPoints(tgt)} {unit}</T>
            </View>
            <View style={{ height: 6, borderRadius: 4, backgroundColor: p.raised, marginTop: 18, overflow: 'hidden' }}
              accessible accessibilityLabel={Math.round(credit * 100) + ' percent of target'}>
              <View style={{ height: '100%', width: `${Math.round(credit * 100)}%`, backgroundColor: p.olive, borderRadius: 4 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 9, marginTop: 20 }}>
              {steps.map(n => (
                <Button key={n} label={'+' + formatPoints(n) + (unit ? ' ' + unit : '')} kind="outline" small style={{ flex: 1 }}
                  onPress={() => st.setProgress(c.id, Math.round((entry.progress + n) * 100) / 100)} />
              ))}
              <Button label="Done" kind="outline" small style={{ flex: 1 }} onPress={() => st.setProgress(c.id, tgt)} />
            </View>
            <View style={{ flexDirection: 'row', gap: 9, marginTop: 12, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Field value={manual} onChangeText={t => setManual(t.replace(/[^\d.]/g, ''))} placeholder={'Set exact ' + (isDuration ? 'minutes' : unit || 'amount')}
                  keyboardType="decimal-pad" accessibilityLabel="Set exact value" style={{ padding: 13, fontSize: 15, backgroundColor: p.bg }} />
              </View>
              <Button label="Set" kind="outline" small style={{ paddingHorizontal: 18 }} disabled={!manual || isNaN(Number(manual))}
                onPress={() => { st.setProgress(c.id, Number(manual)); setManual(''); }} />
            </View>
            <Muted style={{ marginTop: 16 }}>Partial counts proportionally: {Math.round(credit * 100)}% of this commitment right now.</Muted>
            {entry.progress > 0 ? <TextLink label="Reset to zero" color={p.muted} size={13} onPress={() => st.setProgress(c.id, 0)} style={{ marginTop: 4 }} /> : null}
            <Button label="Save progress" style={{ marginTop: 12 }} onPress={close} />
          </>
        )}
      </Sheet>
    </>
  );
}
