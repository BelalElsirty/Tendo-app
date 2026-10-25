import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { AMOUNT_UNITS, CUSTOM_SUGGESTION_PATTERN, LIBRARY, TIME_LABELS } from '../domain/library';
import { formatPoints } from '../domain/score';
import { CADENCES, patternLabel } from '../domain/schedule';
import { CATEGORIES, type TimeOfDay, type TrackType } from '../domain/types';
import { cadencePatch, targetStep, toCommitmentDraft, TRACK_DEFAULTS, useDraft } from '../state/draft';
import { useTendo } from '../state/store';
import { fonts, radius } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { Button, Card, Check, Chip, ChipRow, Display, Eyebrow, Field, Muted, Screen, Spacer, Stepper, T, TextLink } from '../ui/kit';
import { toast } from '../ui/Toast';

const TRACKS: { key: TrackType; label: string; note: string }[] = [
  { key: 'simple', label: 'Done / not done', note: 'Make bed, brush teeth, meditate' },
  { key: 'amount', label: 'Reach an amount', note: '2 L water, 10,000 steps, 20 pages' },
  { key: 'duration', label: 'Spend time', note: 'Study 60 min, code an hour' },
  { key: 'weekly', label: 'Times per week', note: 'Workout 3×, call parents 2×' },
];
const TIMES: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'any'];
const MEANINGFUL_LIMIT = 15;
const SUGGESTIONS_SHOWN = 6;

export default function Create() {
  const p = usePalette();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const st = useTendo();
  const d = useDraft();
  const [showAll, setShowAll] = useState(false);
  const editing = st.commitments.find(c => c.id === edit) ?? null;

  useEffect(() => {
    if (editing) d.load(editing); else d.reset(st.today);
    // Only on open; the draft then belongs to this screen and the schedule screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);

  const typeLocked = !!editing?.firstRecordOn;
  const nameLc = d.name.trim().toLowerCase();
  const dupe = !!nameLc && st.commitments.some(c => c.name.toLowerCase() === nameLc && c.lifecycle !== 'archived' && c.id !== d.editId);
  const activeCount = st.commitments.filter(c => c.lifecycle !== 'archived').length;
  const showMeaningful = !editing && activeCount >= MEANINGFUL_LIMIT && !st.settings.manyDismissed;
  const lib = LIBRARY[d.category];
  const shown = showAll ? lib : lib.slice(0, SUGGESTIONS_SHOWN);
  const ready = !!d.name.trim() && (d.track !== 'amount' || d.unit !== 'Custom' || !!d.customUnit.trim());
  const step = targetStep(d.track, d.unit);
  const unitName = d.track === 'amount' ? (d.unit === 'Custom' ? d.customUnit.trim() || 'unit' : d.unit) : '';

  function pickTrack(t: TrackType) {
    if (typeLocked) return;
    d.set({ track: t, target: t === 'simple' ? d.target : t === 'amount' && d.track === 'amount' ? d.target : TRACK_DEFAULTS[t as Exclude<TrackType, 'simple'>] });
  }

  function save() {
    if (!ready) return;
    const draft = toCommitmentDraft(useDraft.getState());
    if (editing) {
      st.updateCommitment(editing.id, draft);
      toast('Saved. Past days keep the version they had.');
    } else {
      st.addCommitment(draft);
      toast('Added. Starts at ×1.0 until Tendo learns your pattern.');
    }
    router.back();
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextLink label="Cancel" color={p.secondary} size={14} onPress={() => router.back()} />
      </View>
      <Display size={30} style={{ marginTop: 10 }}>{editing ? 'Edit commitment' : 'New commitment'}</Display>

      {showMeaningful ? (
        <Card tone="outline" style={{ marginTop: 14 }}>
          <T w={600} size={14}>Keep your list meaningful.</T>
          <T size={13} color={p.secondary} style={{ marginTop: 4, lineHeight: 19 }}>You have {activeCount} active commitments. The ones you'd genuinely miss count most.</T>
          <TextLink label="Got it" size={13} onPress={() => st.updateSettings({ manyDismissed: true })} style={{ marginTop: 4 }} />
        </Card>
      ) : null}

      <TextInput
        value={d.name}
        onChangeText={t => d.set({ name: t })}
        placeholder="Run 5k"
        placeholderTextColor={p.faint}
        accessibilityLabel="Commitment name"
        maxLength={60}
        style={{ marginTop: 20, borderBottomWidth: 1, borderBottomColor: p.border, paddingVertical: 12, color: p.text, fontFamily: fonts[600], fontSize: 21 }}
      />
      {dupe ? <T size={13} color={p.sand} style={{ marginTop: 10, lineHeight: 19 }} accessibilityRole="alert">You already have “{d.name.trim()}.” You can still add another.</T> : null}

      <Eyebrow style={{ marginTop: 26, marginBottom: 12 }}>How do you want to track this?</Eyebrow>
      <View style={{ gap: 9 }}>
        {TRACKS.map(k => {
          const on = d.track === k.key;
          return (
            <Pressable key={k.key} onPress={() => pickTrack(k.key)} disabled={typeLocked && !on} accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: typeLocked && !on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderColor: on ? p.olive : p.border, backgroundColor: on ? p.oliveBg : p.surface, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 15 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={15} w={on ? 600 : 500} color={on ? p.text : typeLocked ? p.faint : p.textSoft}>{k.label}</T>
                <T size={12} color={p.muted} style={{ marginTop: 3 }}>{k.note}</T>
              </View>
              {on ? <Check /> : null}
            </Pressable>
          );
        })}
      </View>
      {typeLocked ? <Muted style={{ marginTop: 10 }}>Tracking type locks after the first record. To track it differently, add a new commitment.</Muted> : null}

      {d.track !== 'simple' ? (
        <>
          <View style={{ marginTop: 14, backgroundColor: p.surface, borderRadius: 10, paddingVertical: 15, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <T size={13.5} color={p.secondary} style={{ flex: 1 }}>
              {d.track === 'amount' ? 'Daily target · ' + unitName : d.track === 'duration' ? 'Minutes per day' : 'Times per week'}
            </T>
            <Stepper
              value={formatPoints(d.target)}
              minusLabel="Lower target" plusLabel="Raise target"
              onMinus={() => d.set({ target: Math.max(d.track === 'duration' ? 5 : step, Math.round((d.target - step) * 100) / 100) })}
              onPlus={() => d.set({ target: Math.min(d.track === 'weekly' ? 7 : d.track === 'duration' ? 600 : 100000, Math.round((d.target + step) * 100) / 100) })}
            />
          </View>
          {d.track === 'amount' ? (
            <>
              <Eyebrow style={{ marginTop: 16, marginBottom: 10 }}>Unit</Eyebrow>
              <ChipRow>{AMOUNT_UNITS.map(u => <Chip key={u} label={u} active={d.unit === u} onPress={() => d.set({ unit: u })} />)}</ChipRow>
              {d.unit === 'Custom' ? (
                <Field value={d.customUnit} onChangeText={t => d.set({ customUnit: t.slice(0, 14) })} placeholder="e.g. chapters, laps, cups" accessibilityLabel="Custom unit"
                  style={{ marginTop: 10, padding: 14, fontSize: 15, backgroundColor: p.bg }} />
              ) : null}
            </>
          ) : null}
          <Muted style={{ marginTop: 8 }}>
            {d.track === 'weekly'
              ? 'Measured on the week, not in your daily score. Done once you hit the target, whenever you do it.'
              : 'Partial progress earns partial credit. ' + formatPoints(Math.round(d.target * 0.6 * 10) / 10) + ' of ' + formatPoints(d.target) + ' is 60% of this commitment.'}
          </Muted>
        </>
      ) : null}

      <Eyebrow style={{ marginTop: 26, marginBottom: 12 }}>Category</Eyebrow>
      <ChipRow>{CATEGORIES.map(c => <Chip key={c} label={c} active={d.category === c} onPress={() => { d.set({ category: c }); setShowAll(false); }} />)}</ChipRow>

      {!editing ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 }}>
            <Eyebrow>Suggested</Eyebrow>
            {lib.length > SUGGESTIONS_SHOWN ? <TextLink label={showAll ? 'Show less' : 'View more'} size={12} onPress={() => setShowAll(v => !v)} style={{ paddingVertical: 0 }} /> : null}
          </View>
          {lib.length ? (
            <ChipRow>
              {shown.map(([name, cad]) => (
                <Chip key={name} label={name} compact active={d.name === name} onPress={() => d.set({
                  name, ...(d.track === 'weekly' ? {} : cad === 'Custom' ? { cadence: 'Custom', pattern: CUSTOM_SUGGESTION_PATTERN } : cadencePatch(cad, d.pattern)),
                })} />
              ))}
            </ChipRow>
          ) : (
            <T size={13.5} color={p.secondary} style={{ lineHeight: 21 }}>
              Anything that belongs to your day counts: calling your parents, watering the plants, a routine only you would name. Type it above.
            </T>
          )}
        </>
      ) : null}

      {d.track !== 'weekly' ? (
        <>
          <Eyebrow style={{ marginTop: 24, marginBottom: 12 }}>Cadence</Eyebrow>
          <ChipRow>
            {CADENCES.map(c => (
              <Chip key={c} label={c} active={d.cadence === c} onPress={() => {
                if (c === 'Custom') { d.set({ cadence: 'Custom' }); router.push('/schedule'); } else d.set(cadencePatch(c, d.pattern));
              }} />
            ))}
          </ChipRow>
          {d.cadence === 'Custom' ? (
            <Pressable onPress={() => router.push('/schedule')} accessibilityRole="button" style={{ marginTop: 8, paddingVertical: 4 }}>
              <T size={12.5} color={p.muted}>Due {patternLabel(d.pattern)}. <T size={12.5} w={600} color={p.olive}>Change</T></T>
            </Pressable>
          ) : null}
          {d.pattern.kind === 'perWeek' ? <Muted style={{ marginTop: 8 }}>Any days you like. Counts on the week, not in the daily score.</Muted> : null}
        </>
      ) : null}

      <Eyebrow style={{ marginTop: 24, marginBottom: 10 }}>Time of day</Eyebrow>
      <ChipRow>{TIMES.map(t => <Chip key={t} label={TIME_LABELS[t]} active={d.timeOfDay === t} onPress={() => d.set({ timeOfDay: t })} />)}</ChipRow>
      <Muted style={{ marginTop: 8 }}>Where it sits on Today. Any time keeps it in one simple list.</Muted>

      <Eyebrow style={{ marginTop: 24, marginBottom: 10 }}>Why I do this</Eyebrow>
      <TextInput
        value={d.why}
        onChangeText={t => d.set({ why: t })}
        placeholder="I want to feel stronger."
        placeholderTextColor={p.faint}
        accessibilityLabel="Why I do this, optional"
        maxLength={90}
        style={{ borderBottomWidth: 1, borderBottomColor: p.border, paddingVertical: 10, color: p.text, fontFamily: fonts[600], fontSize: 19 }}
      />
      <Muted style={{ marginTop: 8 }}>Optional, one line. Tendo shows it back to you on the days you're about to let it go.</Muted>

      <View style={{ marginTop: 22, backgroundColor: p.surface, borderRadius: radius.md, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <T w={700} size={21} color={p.olive} style={{ lineHeight: 22 }}>×{(editing?.weight ?? 1).toFixed(1)}</T>
        <T size={13.5} color={p.secondary} style={{ flex: 1, lineHeight: 20 }}>
          {editing
            ? 'Editing keeps its weight and history. Past days keep the schedule they had.'
            : 'New commitments start at ×1.0. If you start skipping this one, Tendo raises its weight. The things you avoid are worth the most.'}
        </T>
      </View>
      <Spacer flex h={20} />
      <Button label={editing ? 'Save changes' : 'Add commitment'} disabled={!ready} onPress={save} style={{ marginTop: 20 }} />
    </Screen>
  );
}
