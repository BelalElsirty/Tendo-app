import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { weekdayName } from '../domain/dates';
import { MOODS, type Mood } from '../domain/types';
import { useTendo } from '../state/store';
import { useDayNumber, useTodayModel } from '../state/todayModel';
import { usePalette } from '../theme/useTheme';
import { patternLabel, currentSchedule } from '../domain/schedule';
import { Body, Button, Display, Eyebrow, Muted, OptionRow, Screen, Spacer, TextLink } from '../ui/kit';

/** First open of each Tendo day: mood (or Skip), then an optional priority (PRD §17, J2). */
export default function Checkin() {
  const p = usePalette();
  const reduce = useReducedMotion();
  const m = useTodayModel();
  const dayNo = useDayNumber();
  const setMood = useTendo(s => s.setMood);
  const finishCheckin = useTendo(s => s.finishCheckin);
  const editingMood = !!m.day?.checkinDone;
  const [step, setStep] = useState<'mood' | 'priority'>('mood');
  const [mood, setLocalMood] = useState<Mood | null>(m.day?.mood ?? null);
  const [priority, setPriority] = useState<string | null>(m.day?.priorityId ?? null);

  const options = m.planned.filter(i => !i.skipped && !i.weekly).slice(0, 5);

  function done(prio: string | null) {
    finishCheckin(prio);
    router.replace('/today');
  }

  function skip() {
    if (!editingMood) setMood(null);
    done(null);
  }

  function next() {
    if (!mood) return;
    setMood(mood);
    if (editingMood) { router.back(); return; }
    if (options.length === 0) { done(null); return; }
    setStep('priority');
  }

  const enter = reduce ? undefined : FadeInDown.duration(300);

  return (
    <Screen gutter={24}>
      {step === 'mood' ? (
        <Animated.View entering={enter} style={{ flex: 1 }}>
          <Eyebrow>{weekdayName(m.today)} · Day {dayNo}</Eyebrow>
          <Display size={34} style={{ marginTop: 16 }}>How are you{'\n'}feeling today?</Display>
          <Body size={14.5} style={{ marginTop: 12, maxWidth: 300 }}>One tap. It changes how Tendo talks to you today, never what the score asks of you.</Body>
          <View style={{ gap: 9, marginTop: 26 }}>
            {MOODS.map(md => <OptionRow key={md} label={md} on={mood === md} onPress={() => setLocalMood(md)} filled />)}
          </View>
          <Spacer flex h={20} />
          <Button label={editingMood ? 'Save' : 'Continue'} disabled={!mood} onPress={next} />
          {editingMood
            ? <TextLink label="Cancel" color={p.textSoft} center size={14.5} onPress={() => router.back()} style={{ marginTop: 10 }} />
            : <TextLink label="Skip" color={p.textSoft} center size={14.5} onPress={skip} style={{ marginTop: 10 }} />}
          <Muted style={{ textAlign: 'center', marginTop: 8 }}>Only you can see this. Never shared with friends or groups.</Muted>
        </Animated.View>
      ) : (
        <Animated.View entering={enter} style={{ flex: 1 }}>
          <Eyebrow>{mood ? mood.toUpperCase() + ' DAY' : 'TODAY'}</Eyebrow>
          <Display size={34} style={{ marginTop: 16 }}>What matters{'\n'}most today?</Display>
          <Body size={14.5} style={{ marginTop: 12, maxWidth: 300 }}>Pick one to sit at the top. It's a reminder, not a rule. The score treats it like any other.</Body>
          <View style={{ gap: 9, marginTop: 24 }}>
            {options.map(i => (
              <OptionRow key={i.c.id} label={i.c.name} note={i.c.category + ' · ' + patternLabel(currentSchedule(i.c).pattern)}
                on={priority === i.c.id} onPress={() => setPriority(priority === i.c.id ? null : i.c.id)} filled />
            ))}
          </View>
          <Spacer flex h={20} />
          <Button label="Start the day" onPress={() => done(priority)} />
          <TextLink label="No priority today" color={p.muted} center onPress={() => done(null)} style={{ marginTop: 10 }} />
        </Animated.View>
      )}
    </Screen>
  );
}

