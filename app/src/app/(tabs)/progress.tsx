import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline } from 'react-native-svg';
import { addDays, shortLabel } from '../../domain/dates';
import { useTendo } from '../../state/store';
import { MIN_RATED_DAYS, scoreHeadline, useTodayModel } from '../../state/todayModel';
import { radius } from '../../theme/tokens';
import { usePalette } from '../../theme/useTheme';
import { Body, Muted, Screen, Stat, T } from '../../ui/kit';

const W = 300, H = 150, DAYS = 30;
const y = (v: number) => 140 - (v / 100) * 128;

export default function Progress() {
  const p = usePalette();
  const m = useTodayModel();
  const days = useTendo(s => s.days);
  const threshold = useTendo(s => s.settings.threshold);
  const head = scoreHeadline(m);

  const window = Array.from({ length: DAYS }, (_, i) => addDays(m.today, i - DAYS));
  const points = window
    .map((d, i) => ({ d, i, s: days[d]?.summary }))
    .filter(x => x.s?.status === 'scored' && x.s.score !== null)
    .map(x => ({ d: x.d, x: (x.i / (DAYS - 1)) * W, v: x.s!.score! }));
  const scores = points.map(x => x.v);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const best = scores.length ? Math.max(...scores) : null;
  const tagged = window.filter(d => days[d]?.summary?.status === 'recovery').length;
  const closed = Object.values(days).filter(d => d.closed).length;
  const enough = points.length >= 2;
  const line = points.map(pt => pt.x.toFixed(1) + ',' + y(pt.v).toFixed(1)).join(' ');
  const last = points[points.length - 1];

  return (
    <Screen>
      <T w={700} size={28} style={{ letterSpacing: -0.28 }} accessibilityRole="header">Progress</T>
      <T size={14} color={p.secondary} style={{ marginTop: 6 }}>Your score over the last 30 days</T>

      <View style={{ marginTop: 22, backgroundColor: p.surface, borderRadius: radius.lg, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 14 }}
        accessible accessibilityLabel={enough
          ? '30-day score chart. ' + points.length + ' scored days, average ' + avg + ', best ' + best + ', latest ' + last.v + ' on ' + shortLabel(last.d) + '.'
          : 'Not enough scored days for a chart yet.'}>
        {enough ? (
          <Svg width="100%" height={150} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <Line x1={0} y1={y(threshold)} x2={W} y2={y(threshold)} stroke={p.raised} strokeWidth={1} strokeDasharray="3 4" />
            <Line x1={0} y1={y(100)} x2={W} y2={y(100)} stroke={p.raised} strokeWidth={1} />
            <Polygon points={`${points[0].x},${H} ${line} ${last.x},${H}`} fill={p.olive} opacity={0.1} />
            <Polyline points={line} fill="none" stroke={p.olive} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            <Circle cx={last.x} cy={y(last.v)} r={4.5} fill={p.olive} />
          </Svg>
        ) : (
          <View style={{ height: 150, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
            <T w={700} size={18} style={{ textAlign: 'center' }}>Score too new to rate.</T>
            <T size={13} color={p.secondary} style={{ textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
              The line starts after your first closed days. {Math.max(0, MIN_RATED_DAYS - closed)} more until your score is rated.
            </T>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          {[window[0], window[14], window[29]].map(d => <T key={d} size={11} color={p.muted}>{shortLabel(d).toUpperCase()}</T>)}
        </View>
      </View>
      <Muted size={12} style={{ marginTop: 8 }}>Dashed line: your {threshold}% successful-day threshold.</Muted>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Stat label="TODAY" value={head.text} accent />
        <Stat label="30-DAY AVG" value={avg === null ? '—' : String(avg)} />
        <Stat label="BEST" value={best === null ? '—' : String(best)} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Stat label="STREAK" value={String(m.streak.current)} />
        <Stat label="BEST STREAK" value={String(m.streak.best)} />
        <Stat label="DAYS CLOSED" value={String(closed)} />
      </View>

      {enough && avg !== null && m.score.score !== null && !m.tooNew ? (
        <T w={700} size={20} style={{ marginTop: 18, lineHeight: 27 }}>
          {m.score.score >= avg
            ? (m.score.score - avg) + ' points above your 30-day average today.'
            : (avg - m.score.score) + ' points under your 30-day average. The day isn’t closed yet.'}
        </T>
      ) : null}
      {tagged ? <Body size={13.5} style={{ marginTop: 10 }}>{tagged} recovery {tagged === 1 ? 'day sits' : 'days sit'} out of these numbers, as they should.</Body> : null}
      <Muted style={{ marginTop: 14 }}>Day-by-day history and corrections arrive in the next build.</Muted>
    </Screen>
  );
}
