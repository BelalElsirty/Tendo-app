import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { addDays, daysBetween, shortLabel } from '../domain/dates';
import { usernameState, USERNAME_HINT } from '../services/auth';
import { useTendo } from '../state/store';
import { usePalette } from '../theme/useTheme';
import { BackLink, Body, Box, Button, Card, Display, Eyebrow, Field, Muted, Screen, Spacer, T } from '../ui/kit';
import { toast } from '../ui/Toast';

const COOLDOWN_DAYS = 30;

/** Username setup (after SSO) and the once-every-30-days change (PRD §20). */
export default function Username() {
  const p = usePalette();
  const stage = useTendo(s => s.stage);
  const account = useTendo(s => s.account);
  const today = useTendo(s => s.today);
  const setUsername = useTendo(s => s.setUsername);
  const signOut = useTendo(s => s.signOut);
  const editing = stage === 'ready';
  const current = account?.username ?? '';
  const [draft, setDraft] = useState(editing ? current : '');
  const [age, setAge] = useState(account?.ageConfirmed ?? false);

  const changedOn = account?.usernameChangedOn ?? null;
  const locked = editing && !!changedOn && daysBetween(changedOn, today) < COOLDOWN_DAYS;
  const same = editing && draft.trim().toLowerCase() === current.toLowerCase();
  const st = same ? 'empty' : usernameState(draft.trim());
  const ok = st === 'ok' && (editing || age);
  const hintColor = same ? p.muted : st === 'ok' ? p.olive : st === 'empty' ? p.muted : p.dangerSoft;

  function save() {
    if (!ok) return;
    const u = draft.trim();
    setUsername(u, editing ? undefined : age);
    if (editing) {
      toast('Username changed to @' + u + '. Next change available ' + shortLabel(addDays(today, COOLDOWN_DAYS)) + '.');
      router.back();
    } else router.replace('/onboarding');
  }

  return (
    <Screen gutter={24}>
      <BackLink label="Back" onPress={() => { if (editing) router.back(); else { signOut(); router.replace('/welcome'); } }} />
      <Display style={{ marginTop: 16 }}>{editing ? 'Change username' : 'Choose a username'}</Display>
      <Body style={{ marginTop: 12, maxWidth: 300 }}>Friends find you by it. It's the only thing people can search for.</Body>
      {locked && changedOn ? (
        <Card tone="outline" style={{ marginTop: 22 }}>
          <T w={600} size={14.5}>@{current}</T>
          <T size={13} color={p.secondary} style={{ marginTop: 5, lineHeight: 19 }}>
            You changed your username on {shortLabel(changedOn)}. You can change it again on {shortLabel(addDays(changedOn, COOLDOWN_DAYS))}.
          </T>
        </Card>
      ) : (
        <>
          <Eyebrow style={{ marginTop: 26, marginBottom: 10 }}>Username</Eyebrow>
          <Field prefix="@" value={draft} autoCapitalize="none" autoCorrect={false} placeholder="aridelmar" accessibilityLabel="Username"
            onChangeText={t => setDraft(t.replace(/\s/g, '').slice(0, 24))} error={!same && st !== 'ok' && st !== 'empty'} onSubmitEditing={save} />
          <T size={12} color={hintColor} style={{ marginTop: 8 }}>{same ? 'This is your current username.' : USERNAME_HINT[st]}</T>
          {editing ? (
            <Muted style={{ marginTop: 14 }}>You can change it once every 30 days. Friends and groups keep you either way.</Muted>
          ) : (
            <Pressable onPress={() => setAge(a => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: age }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, minHeight: 44 }}>
              <Box on={age} />
              <T size={14} color={p.textSoft}>I'm 16 or older</T>
            </Pressable>
          )}
          <Spacer flex h={24} />
          <Button label={editing ? 'Save username' : 'Continue'} disabled={!ok} onPress={save} style={{ marginTop: 22 }} />
        </>
      )}
    </Screen>
  );
}
