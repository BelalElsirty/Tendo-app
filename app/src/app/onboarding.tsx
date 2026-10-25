import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { INTENT_CHIPS, STARTERS } from '../domain/library';
import { DAY_ENDS, THRESHOLDS, type DayEnd, type Threshold } from '../domain/types';
import { requestNotificationPermission } from '../services/notifications';
import { useTendo, type CommitmentDraft } from '../state/store';
import { usePalette } from '../theme/useTheme';
import { Body, Box, Button, Check, Chip, ChipRow, Display, Eyebrow, Field, Muted, Screen, Spacer, T } from '../ui/kit';
import { Sheet } from '../ui/Sheet';

const DAY_END_NOTES: Record<DayEnd, string> = {
  '11:00 PM': 'For early sleepers.',
  Midnight: 'Clean cut. Classic.',
  '1:00 AM': 'A little slack after a late night.',
  '2:00 AM': 'For late evenings.',
  '3:00 AM': 'For night owls.',
  Custom: 'Pick your own time.',
};

export default function Onboarding() {
  const p = usePalette();
  const reduce = useReducedMotion();
  const completeOnboarding = useTendo(s => s.completeOnboarding);
  const updateSettings = useTendo(s => s.updateSettings);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [intent, setIntent] = useState('');
  const [picked, setPicked] = useState<Record<string, boolean>>(() => Object.fromEntries(STARTERS.map(s => [s.key, s.pickedByDefault])));
  const [dayEnd, setDayEnd] = useState<DayEnd>('Midnight');
  const [custom, setCustom] = useState('00:30');
  const [threshold, setThreshold] = useState<Threshold>(80);
  const [askNotif, setAskNotif] = useState(false);

  const nPicked = STARTERS.filter(s => picked[s.key]).length;
  const customValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(custom);

  function finish(granted: boolean) {
    const drafts: CommitmentDraft[] = STARTERS.filter(s => picked[s.key]).map(s => ({
      name: s.name, category: s.category, track: 'simple', target: null, unit: null, pattern: s.pattern,
      startDate: '', endDate: null, timeOfDay: s.timeOfDay, why: '',
    }));
    completeOnboarding({ commitments: drafts, dayEnd, dayEndCustom: custom, threshold });
    updateSettings({ notificationsAsked: true, notificationsGranted: granted });
    setAskNotif(false);
    router.replace('/checkin');
  }

  const enter = reduce ? undefined : FadeInDown.duration(350);

  return (
    <Screen gutter={24}>
      {step === 1 && (
        <Animated.View entering={enter} style={{ flex: 1 }}>
          <Eyebrow>Step 1 of 3</Eyebrow>
          <Display size={36} style={{ marginTop: 18 }}>What are you{'\n'}trying to build?</Display>
          <Body style={{ marginTop: 14, maxWidth: 300 }}>Say it plainly. Tendo turns it into a handful of daily commitments you can actually keep.</Body>
          <Field value={intent} onChangeText={setIntent} placeholder="Discipline in the morning" accessibilityLabel="What are you trying to build?" style={{ marginTop: 26 }} />
          <ChipRow style={{ marginTop: 14 }}>
            {INTENT_CHIPS.map(c => <Chip key={c} label={c} compact active={intent === c} onPress={() => setIntent(c)} />)}
          </ChipRow>
          <Spacer flex h={24} />
          <Button label="Continue" onPress={() => setStep(2)} />
        </Animated.View>
      )}

      {step === 2 && (
        <Animated.View entering={enter} style={{ flex: 1 }}>
          <Eyebrow>Step 2 of 3 · {(intent.trim() || 'Discipline in the morning').toUpperCase()}</Eyebrow>
          <Display style={{ marginTop: 16 }}>Start with these.</Display>
          <Body style={{ marginTop: 12, maxWidth: 310 }}>Drop anything that isn't yours. You can add more once these hold.</Body>
          <View style={{ gap: 10, marginTop: 22 }}>
            {STARTERS.map(s => {
              const on = !!picked[s.key];
              return (
                <Pressable key={s.key} onPress={() => setPicked(x => ({ ...x, [s.key]: !on }))} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                  accessibilityLabel={s.name + ', ' + s.meta}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: p.surface, borderRadius: 10, padding: 16 }}>
                  <Box on={on} />
                  <View style={{ flex: 1 }}>
                    <T w={600} size={15} color={on ? p.text : p.secondary}>{s.name}</T>
                    <T size={12} color={p.muted} style={{ marginTop: 3 }}>{s.meta}</T>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Spacer flex h={24} />
          <Button label={nPicked === 0 ? 'Pick at least one' : 'Continue with ' + nPicked} disabled={nPicked === 0} onPress={() => setStep(3)} />
          <Pressable onPress={() => setStep(1)} style={{ alignSelf: 'center', padding: 10, marginTop: 6 }} accessibilityRole="button">
            <T size={13.5} color={p.muted}>Back</T>
          </Pressable>
        </Animated.View>
      )}

      {step === 3 && (
        <Animated.View entering={enter} style={{ flex: 1 }}>
          <Eyebrow>Step 3 of 3</Eyebrow>
          <Display style={{ marginTop: 16 }}>When does your{'\n'}day end?</Display>
          <Body style={{ marginTop: 12, maxWidth: 310 }}>Not everyone's day ends at midnight. Tendo closes the books when you say so.</Body>
          <View style={{ gap: 9, marginTop: 24 }}>
            {DAY_ENDS.map(d => {
              const on = dayEnd === d;
              return (
                <Pressable key={d} onPress={() => setDayEnd(d)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: on ? p.olive : p.border, backgroundColor: on ? p.surface : 'transparent', borderRadius: 10, padding: 16 }}>
                  <View>
                    <T w={600} size={16}>{d}</T>
                    <T size={12.5} color={p.muted} style={{ marginTop: 3 }}>{DAY_END_NOTES[d]}</T>
                  </View>
                  {on ? <Check size={16} /> : null}
                </Pressable>
              );
            })}
          </View>
          {dayEnd === 'Custom' ? (
            <>
              <Field value={custom} onChangeText={t => setCustom(t.replace(/[^\d:]/g, '').slice(0, 5))} placeholder="00:30" accessibilityLabel="Custom day end time, 24-hour"
                keyboardType="numbers-and-punctuation" error={!customValid} style={{ marginTop: 10 }} />
              <Muted style={{ marginTop: 6 }}>24-hour time. Before noon counts as after midnight.</Muted>
            </>
          ) : null}
          <Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>A successful day is</Eyebrow>
          <ChipRow>
            {THRESHOLDS.map(t => <Chip key={t} label={t + '%'} active={threshold === t} onPress={() => setThreshold(t)} />)}
          </ChipRow>
          <Muted style={{ marginTop: 8 }}>Days at or above this keep your streak going.</Muted>
          <Spacer flex h={24} />
          <Button label="Start day 1" disabled={dayEnd === 'Custom' && !customValid} onPress={() => setAskNotif(true)} />
          <Muted style={{ textAlign: 'center', marginTop: 14 }}>Your score starts once you have five days behind you.</Muted>
        </Animated.View>
      )}

      <Sheet visible={askNotif} onClose={() => finish(false)} dismissable={false} label="Allow notifications">
        <T w={600} size={24} style={{ letterSpacing: -0.24 }} accessibilityRole="header">Allow notifications?</T>
        <T size={14.5} color={p.textSoft} style={{ marginTop: 10, lineHeight: 22 }}>Tendo can remind you about commitments and your weekly review. Nothing else.</T>
        <Muted size={13} style={{ marginTop: 10 }}>Your phone will ask next. You can change this any time in Notifications.</Muted>
        <Button label="Continue" style={{ marginTop: 20 }} onPress={async () => finish(await requestNotificationPermission())} />
        <Button label="Not now" kind="outline" small style={{ marginTop: 10 }} onPress={() => finish(false)} />
      </Sheet>
    </Screen>
  );
}
