import { router } from 'expo-router';
import { View } from 'react-native';
import { formatPoints } from '../../../domain/score';
import { scoreHeadline, useTodayModel } from '../../../state/todayModel';
import { radius } from '../../../theme/tokens';
import { usePalette } from '../../../theme/useTheme';
import { BackLink, Body, Display, Eyebrow, Muted, Screen, T } from '../../../ui/kit';

/** "Today's score" — every point on the board, so the headline always reconciles (PRD §15). */
export default function Score() {
  const p = usePalette();
  const m = useTodayModel();
  const head = scoreHeadline(m);
  const heaviest = [...m.score.items].sort((a, b) => b.commitment.weight - a.commitment.weight)[0];

  return (
    <Screen>
      <BackLink label="Today" onPress={() => router.back()} />
      <T w={700} size={30} style={{ marginTop: 16, letterSpacing: -0.3 }} accessibilityRole="header">Today's score</T>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 14, marginTop: 10 }}>
        <Display size={56} color={p.olive}>{head.text}</Display>
        <T size={13.5} color={p.secondary} style={{ flexShrink: 1, lineHeight: 19 }}>{head.sub}</T>
      </View>
      {m.tooNew && m.score.score !== null && !m.day?.recovery ? (
        <Muted style={{ marginTop: 10 }}>Today is at {m.score.score}% so far. The headline number appears once you have five days behind you.</Muted>
      ) : null}
      <Body size={13.5} style={{ marginTop: 14 }}>Every commitment carries points. Tendo divides what you earned by what was on the board, nothing hidden.</Body>

      <Eyebrow style={{ marginTop: 24, marginBottom: 10 }}>The math</Eyebrow>
      {m.score.items.length === 0 && m.score.skipped.length === 0 ? (
        <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: p.border, borderRadius: radius.lg, padding: 22 }}>
          <T size={14} color={p.secondary} style={{ textAlign: 'center' }}>Nothing due today, so there's nothing to score. Today shows “—”, never 100%.</T>
        </View>
      ) : (
        <View style={{ gap: 1, backgroundColor: p.raised, borderRadius: radius.md, overflow: 'hidden' }}>
          {m.score.items.map(i => {
            const full = i.credit >= 1;
            const unit = i.commitment.track === 'duration' ? 'min' : i.commitment.unit ?? '';
            const state = full ? 'Completed'
              : i.credit > 0 ? formatPoints(i.entry.progress) + ' of ' + formatPoints(i.commitment.target ?? 0) + (unit ? ' ' + unit : '') + '. ' + Math.round(i.credit * 100) + '%'
                : 'Not yet';
            return (
              <View key={i.commitment.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: p.surface, paddingVertical: 14, paddingHorizontal: 15 }}
                accessible accessibilityLabel={i.commitment.name + ', ' + state + ', ' + formatPoints(i.earned) + ' of ' + i.points + ' points, weight ' + i.commitment.weight.toFixed(1)}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T size={14.5} color={full ? p.text : p.secondary}>{i.commitment.name}</T>
                  <T size={11.5} color={full ? p.olive : p.sand} style={{ marginTop: 3 }}>{state} · ×{i.commitment.weight.toFixed(1)}</T>
                </View>
                <T size={13} color={p.muted} style={{ fontVariant: ['tabular-nums'] }}>{formatPoints(i.earned)} / {i.points}</T>
              </View>
            );
          })}
          {m.score.skipped.map(c => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: p.surface, paddingVertical: 14, paddingHorizontal: 15 }}>
              <View style={{ flex: 1 }}>
                <T size={14.5} color={p.muted}>{c.name}</T>
                <T size={11.5} color={p.muted} style={{ marginTop: 3 }}>Skipped, excluded</T>
              </View>
              <T size={13} color={p.muted}>— / —</T>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: p.oliveBg, padding: 15 }}>
            <T w={600} size={14.5} style={{ flex: 1 }}>Earned / available</T>
            <T w={600} size={14} color={p.olive} style={{ fontVariant: ['tabular-nums'] }}>
              {formatPoints(m.score.earned)} / {m.score.possible}{m.score.score !== null ? ' = ' + m.score.score + '%' : ''}
            </T>
          </View>
        </View>
      )}
      <Muted style={{ marginTop: 12 }}>Skipped and optional commitments leave the denominator, so a legitimate rest day can't lower your score. Weekly targets are measured on the week.</Muted>

      <Eyebrow style={{ marginTop: 24, marginBottom: 10 }}>Adaptive weight</Eyebrow>
      <View style={{ backgroundColor: p.surface, borderRadius: radius.md, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <T w={700} size={21} color={p.olive} style={{ lineHeight: 22 }}>×{(heaviest?.commitment.weight ?? 1).toFixed(1)}</T>
        <T size={13.5} color={p.secondary} style={{ flex: 1, lineHeight: 20 }}>
          {heaviest && heaviest.commitment.weight > 1
            ? 'You\'ve missed ' + heaviest.commitment.name + ' more than anything else lately, so Tendo raised its weight. The things you avoid matter more.'
            : 'Everything sits at ×1.0 for now. After five scheduled days, a commitment you keep missing gains weight: 1 + its miss rate over 30 days, up to ×2.0.'}
        </T>
      </View>
    </Screen>
  );
}
