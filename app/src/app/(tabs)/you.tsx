import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { addDays, formatClock } from '../../domain/dates';
import { toneNote } from '../../domain/tone';
import { DAY_ENDS, THRESHOLDS, type DayEnd } from '../../domain/types';
import { useTendo } from '../../state/store';
import { useDayNumber, useTodayModel } from '../../state/todayModel';
import { palettes, radius, type ThemeName } from '../../theme/tokens';
import { usePalette } from '../../theme/useTheme';
import { Button, Check, Chip, ChipRow, Eyebrow, Field, List, ListRow, Muted, OptionRow, Screen, Stat, T, TextLink } from '../../ui/kit';
import { Sheet } from '../../ui/Sheet';
import { toast } from '../../ui/Toast';

const THEMES: { key: ThemeName; label: string }[] = [{ key: 'warm', label: 'Warm dark' }, { key: 'black', label: 'Pure black' }];
const TONES = ['Gentle', 'Balanced', 'Push me'] as const;

export default function You() {
  const p = usePalette();
  const st = useTendo();
  const m = useTodayModel();
  const dayNo = useDayNumber();
  const [sheet, setSheet] = useState<null | 'dayEnd' | 'delete'>(null);
  const [dayEnd, setDayEnd] = useState<DayEnd>(st.settings.dayEnd);
  const [custom, setCustom] = useState(st.settings.dayEndCustom);
  const [confirm, setConfirm] = useState('');
  const a = st.account;
  if (!a) return null;

  const initials = (a.name || a.username).split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '·';
  const week = Object.values(st.days).filter(d => d.date < m.today && d.date >= addDays(m.today, -7) && d.summary?.status === 'scored');
  const weekAvg = week.length ? Math.round(week.reduce((s, d) => s + (d.summary!.score ?? 0), 0) / week.length) : null;
  const active = st.commitments.filter(c => c.lifecycle === 'active').length;
  const dayEndLabel = st.settings.dayEnd === 'Custom' ? formatClock(st.settings.dayEndCustom) : st.settings.dayEnd;
  const customValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(custom);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: 62, height: 62, borderRadius: 14, backgroundColor: p.raised, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
          <T w={700} size={21} color={p.olive}>{initials}</T>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={700} size={23} numberOfLines={1} accessibilityRole="header">{a.name || '@' + a.username}</T>
          <Pressable onPress={() => router.push('/username')} accessibilityRole="button" accessibilityLabel="Change username"
            style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            <T size={13} color={p.muted}>@{a.username} · Day {dayNo}</T>
            <T size={13} w={600} color={p.olive}>Edit</T>
          </Pressable>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Stat label="THIS WEEK" value={weekAvg === null ? '—' : weekAvg + '%'} accent size={23} />
        <Stat label="STREAK" value={String(m.streak.current)} size={23} />
        <Stat label="BEST" value={String(m.streak.best)} size={23} />
      </View>

      <Eyebrow style={{ marginTop: 26, marginBottom: 10 }}>Your day</Eyebrow>
      <List>
        <ListRow label="Day ends at" value={dayEndLabel} valueColor={p.olive} onPress={() => { setDayEnd(st.settings.dayEnd); setCustom(st.settings.dayEndCustom); setSheet('dayEnd'); }} />
        <ListRow label="Commitments" value={active + ' active'} onPress={() => router.push('/today/manage')} last />
      </List>
      <Eyebrow style={{ marginTop: 18, marginBottom: 10 }}>A successful day is</Eyebrow>
      <ChipRow>{THRESHOLDS.map(t => <Chip key={t} label={t + '%'} active={st.settings.threshold === t} onPress={() => st.updateSettings({ threshold: t })} />)}</ChipRow>
      <Muted style={{ marginTop: 10 }}>Days at or above this keep your streak going. Nothing rolls over at midnight: your day closes when you say it does.</Muted>

      <Eyebrow style={{ marginTop: 24, marginBottom: 10 }}>Appearance</Eyebrow>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {THEMES.map(t => {
          const on = st.settings.theme === t.key;
          const sw = palettes[t.key];
          return (
            <Pressable key={t.key} onPress={() => st.updateSettings({ theme: t.key })} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={t.label}
              style={{ flex: 1, borderWidth: 1, borderColor: on ? p.olive : p.border, borderRadius: radius.md, padding: 14 }}>
              <View style={{ height: 54, borderRadius: 10, backgroundColor: sw.surface, borderWidth: 1, borderColor: sw.border, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12 }}>
                <View style={{ width: 14, height: 14, borderRadius: 5, backgroundColor: p.olive }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: sw.text, width: '70%' }} />
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: sw.muted, width: '45%' }} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 }}>
                <T size={14} color={on ? p.text : p.secondary}>{t.label}</T>
                {on ? <Check size={14} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Muted style={{ marginTop: 10 }}>
        {st.settings.theme === 'black' ? 'True black surfaces for OLED screens. Same olive, same type, same everything else.' : 'The default warm charcoal. Switch to pure black for OLED screens.'}
      </Muted>

      <Eyebrow style={{ marginTop: 24, marginBottom: 10 }}>Tendo tone</Eyebrow>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {TONES.map(t => <Chip key={t} label={t} active={st.settings.tone === t} onPress={() => st.updateSettings({ tone: t })} style={{ flex: 1, alignItems: 'center' }} />)}
      </View>
      <Muted style={{ marginTop: 10 }}>{toneNote(st.settings.tone, m.day?.mood ?? null)}</Muted>

      <Eyebrow style={{ marginTop: 24, marginBottom: 10 }}>Account</Eyebrow>
      <List>
        <ListRow label="Email" value={a.email || 'Signed in with ' + (a.provider === 'apple' ? 'Apple' : 'Google')} />
        <ListRow label="Privacy Policy" onPress={() => router.push({ pathname: '/legal', params: { kind: 'privacy' } })} />
        <ListRow label="Terms of Service" onPress={() => router.push({ pathname: '/legal', params: { kind: 'terms' } })} />
        <ListRow label="About Tendo" value={'v' + (Constants.expoConfig?.version ?? '1.0.0')} last />
      </List>
      <TextLink label="Sign out" color={p.muted} center size={13} style={{ marginTop: 18 }} onPress={() => { st.signOut(); router.replace('/welcome'); }} />
      <View style={{ marginTop: 26 }}>
        <List>
          <ListRow label="Delete account" danger onPress={() => { setConfirm(''); setSheet('delete'); }} last />
        </List>
        <Muted size={12} style={{ marginTop: 8 }}>Removes your account and everything in it. Asks first.</Muted>
      </View>

      <Sheet visible={sheet === 'dayEnd'} onClose={() => setSheet(null)} title="When does your day end?">
        <T size={13.5} color={p.secondary} style={{ marginTop: 8, lineHeight: 20 }}>Applies from today. Days already closed stay as they were.</T>
        <View style={{ gap: 9, marginTop: 16 }}>
          {DAY_ENDS.map(d => <OptionRow key={d} label={d} on={dayEnd === d} onPress={() => setDayEnd(d)} />)}
        </View>
        {dayEnd === 'Custom' ? (
          <Field value={custom} onChangeText={t => setCustom(t.replace(/[^\d:]/g, '').slice(0, 5))} placeholder="00:30" accessibilityLabel="Custom day end, 24-hour"
            error={!customValid} style={{ marginTop: 10, backgroundColor: p.bg }} />
        ) : null}
        <Button label="Save" disabled={dayEnd === 'Custom' && !customValid} style={{ marginTop: 18 }} onPress={() => {
          st.updateSettings({ dayEnd, dayEndCustom: custom });
          setSheet(null);
          toast('Your day now ends at ' + (dayEnd === 'Custom' ? formatClock(custom) : dayEnd) + '.');
        }} />
      </Sheet>

      <Sheet visible={sheet === 'delete'} onClose={() => setSheet(null)} title="Delete your account?">
        <T size={13.5} color={p.secondary} style={{ marginTop: 10, lineHeight: 20 }}>
          This permanently removes your Tendo account, your commitments, your history, your mood check-ins and your settings. It cannot be undone.
        </T>
        <T size={13.5} color={p.secondary} style={{ marginTop: 8, lineHeight: 20 }}>Type DELETE to confirm.</T>
        <Field value={confirm} onChangeText={setConfirm} placeholder="DELETE" autoCapitalize="characters" accessibilityLabel="Type DELETE to confirm"
          style={{ marginTop: 14, backgroundColor: p.bg }} />
        <Button label="Delete account" kind="danger" disabled={confirm.trim().toUpperCase() !== 'DELETE'} style={{ marginTop: 16 }}
          onPress={() => { setSheet(null); st.deleteAccount(); router.replace('/welcome'); toast('Account deleted.'); }} />
        <TextLink label="Cancel" color={p.textSoft} center size={14} onPress={() => setSheet(null)} style={{ marginTop: 10 }} />
      </Sheet>
    </Screen>
  );
}

