import { describe, expect, it } from 'vitest';
import { adaptiveWeight, closeDays } from '../close';
import { addDays, dayEndOffset, tendoDate, weekday, weekStart } from '../dates';
import { isDueOn, patternLabel, scheduleSummary } from '../schedule';
import { creditFor, formatPoints, scoreDay, summarize, weeklyCount } from '../score';
import { commitmentStreak, personalStreak } from '../streaks';
import { coachLine, leanFor } from '../tone';
import type { DayRecord } from '../types';
import { commitment, day } from './helpers';

describe('Tendo day boundary', () => {
  it('maps day-end choices to minute offsets', () => {
    expect(dayEndOffset('Midnight', '')).toBe(0);
    expect(dayEndOffset('3:00 AM', '')).toBe(180);
    expect(dayEndOffset('11:00 PM', '')).toBe(-60);
    expect(dayEndOffset('Custom', '00:30')).toBe(30);
    expect(dayEndOffset('Custom', '22:15')).toBe(-105);
  });

  it('keeps 1:30 AM on the previous day when the day ends at 3 AM', () => {
    expect(tendoDate(new Date(2026, 8, 22, 1, 30), 180)).toBe('2026-09-21');
    expect(tendoDate(new Date(2026, 8, 22, 3, 0), 180)).toBe('2026-09-22');
  });

  it('rolls to the next day after an 11 PM day end', () => {
    expect(tendoDate(new Date(2026, 8, 22, 23, 30), -60)).toBe('2026-09-23');
    expect(tendoDate(new Date(2026, 8, 22, 22, 59), -60)).toBe('2026-09-22');
  });

  it('computes weekdays Monday-first', () => {
    expect(weekday('2026-09-21')).toBe(0); // Monday
    expect(weekday('2026-09-27')).toBe(6); // Sunday
    expect(weekStart('2026-09-24')).toBe('2026-09-21');
  });
});

describe('schedules', () => {
  it('honours weekday, specific-day and interval patterns', () => {
    const wk = commitment({ pattern: { kind: 'weekdays' } });
    expect(isDueOn(wk, '2026-09-25')).toBe(true); // Fri
    expect(isDueOn(wk, '2026-09-26')).toBe(false); // Sat
    const mwf = commitment({ pattern: { kind: 'days', days: [0, 2, 4] } });
    expect(isDueOn(mwf, '2026-09-23')).toBe(true); // Wed
    expect(isDueOn(mwf, '2026-09-24')).toBe(false); // Thu
    const every3 = commitment({ pattern: { kind: 'interval', every: 3 } });
    expect(isDueOn(every3, '2026-09-04')).toBe(true);
    expect(isDueOn(every3, '2026-09-05')).toBe(false);
  });

  it('is not due before creation, while paused, or when archived', () => {
    const c = commitment({ createdOn: '2026-09-10' });
    expect(isDueOn(c, '2026-09-09')).toBe(false);
    expect(isDueOn({ ...c, lifecycle: 'paused', pausedUntil: null }, '2026-09-20')).toBe(false);
    expect(isDueOn({ ...c, lifecycle: 'paused', pausedUntil: '2026-09-21' }, '2026-09-20')).toBe(false);
    expect(isDueOn({ ...c, lifecycle: 'paused', pausedUntil: '2026-09-21' }, '2026-09-21')).toBe(true);
    expect(isDueOn({ ...c, lifecycle: 'archived' }, '2026-09-20')).toBe(false);
  });

  it('keeps past days on the schedule version that applied then', () => {
    const c = commitment({ pattern: { kind: 'days', days: [0, 2, 4] } });
    c.schedules.push({ pattern: { kind: 'days', days: [1, 3, 5] }, effectiveFrom: '2026-09-21', startDate: '2026-09-01', endDate: null });
    expect(isDueOn(c, '2026-09-16')).toBe(true); // old Wed
    expect(isDueOn(c, '2026-09-23')).toBe(false); // new schedule, Wed
    expect(isDueOn(c, '2026-09-22')).toBe(true); // new Tue
  });

  it('labels patterns in plain language', () => {
    expect(patternLabel({ kind: 'days', days: [4, 0, 2] })).toBe('Mon, Wed, Fri');
    expect(scheduleSummary({ kind: 'weekdays' }, 'Morning', 'today', null)).toBe('Due weekdays · morning, starting today.');
  });
});

describe('Discipline Score', () => {
  it('weights points and gives proportional credit to amounts', () => {
    const bed = commitment({ name: 'Make bed' });
    const workout = commitment({ name: 'Workout', weight: 1.3 });
    const water = commitment({ name: 'Water', track: 'amount', target: 2, unit: 'L' });
    const d = day('2026-09-22', { [bed.id]: { state: 'done' }, [water.id]: { progress: 1.4 } });
    const s = scoreDay([bed, workout, water], d, '2026-09-22');
    expect(s.possible).toBe(10 + 13 + 10);
    expect(s.earned).toBeCloseTo(10 + 0 + 7);
    expect(s.score).toBe(Math.round((17 / 33) * 100));
    expect(creditFor(water, { state: 'pending', progress: 3, optional: false })).toBe(1);
  });

  it('removes skipped and optional items from the denominator', () => {
    const a = commitment();
    const b = commitment();
    const c = commitment();
    const d = day('2026-09-22', { [a.id]: { state: 'done' }, [b.id]: { state: 'skipped' }, [c.id]: { optional: true } });
    const s = scoreDay([a, b, c], d, '2026-09-22');
    expect(s.score).toBe(100);
    expect(s.skipped.map(x => x.id)).toEqual([b.id]);
  });

  it('keeps weekly targets out of the daily score', () => {
    const weekly = commitment({ pattern: { kind: 'perWeek', times: 3 }, track: 'weekly', target: 3 });
    const s = scoreDay([weekly], day('2026-09-22'), '2026-09-22');
    expect(s.score).toBeNull();
    const days = { '2026-09-21': day('2026-09-21', { [weekly.id]: { state: 'done' } }), '2026-09-22': day('2026-09-22', { [weekly.id]: { state: 'done' } }) };
    expect(weeklyCount(weekly, days, '2026-09-23')).toBe(2);
  });

  it('shows no score when nothing is due rather than 100%', () => {
    const s = scoreDay([commitment({ pattern: { kind: 'weekends' } })], undefined, '2026-09-22');
    expect(s.score).toBeNull();
    expect(summarize(s, false, 80).status).toBe('empty');
  });

  it('formats partial points so the breakdown reconciles', () => {
    expect(formatPoints(7)).toBe('7');
    expect(formatPoints(6.6667)).toBe('6.7');
  });
});

describe('adaptive weight', () => {
  function history(id: string, keptPattern: boolean[]): Record<string, DayRecord> {
    const days: Record<string, DayRecord> = {};
    keptPattern.forEach((kept, i) => {
      const date = addDays('2026-09-30', -i);
      days[date] = day(date, {}, {
        closed: true,
        summary: { status: 'scored', score: 0, earned: 0, possible: 10, skippedIds: [], success: false,
          items: [{ id, name: 'x', points: 10, credit: kept ? 1 : 0, outcome: kept ? 'completed' : 'missed' }] },
      });
    });
    return days;
  }

  it('follows the PRD table', () => {
    const ten = (k: number) => Array.from({ length: 10 }, (_, i) => i < k);
    expect(adaptiveWeight('a', history('a', ten(10)), '2026-09-30')).toBe(1.0);
    expect(adaptiveWeight('a', history('a', ten(8)), '2026-09-30')).toBe(1.2);
    expect(adaptiveWeight('a', history('a', ten(5)), '2026-09-30')).toBe(1.5);
    expect(adaptiveWeight('a', history('a', ten(2)), '2026-09-30')).toBe(1.8);
    expect(adaptiveWeight('a', history('a', ten(0)), '2026-09-30')).toBe(2.0);
  });

  it('stays at ×1.0 with fewer than five occurrences', () => {
    expect(adaptiveWeight('a', history('a', [false, false, false, false]), '2026-09-30')).toBe(1);
  });
});

describe('closing days', () => {
  it('closes unopened days as missed and updates weights at close', () => {
    const c = commitment({ createdOn: '2026-09-20' });
    const res = closeDays({ commitments: [c], days: {}, since: '2026-09-20', today: '2026-09-26', threshold: 80 });
    expect(res.closed).toEqual(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']);
    expect(res.days['2026-09-22'].summary?.score).toBe(0);
    expect(res.commitments[0].weight).toBe(2.0);
  });

  it('gives recovery days no numeric score', () => {
    const c = commitment();
    const res = closeDays({ commitments: [c], days: { '2026-09-21': day('2026-09-21', {}, { recovery: true }) }, since: '2026-09-21', today: '2026-09-22', threshold: 80 });
    expect(res.days['2026-09-21'].summary).toMatchObject({ status: 'recovery', score: null });
  });

  it('never reopens a closed day', () => {
    const c = commitment();
    const first = closeDays({ commitments: [c], days: { '2026-09-21': day('2026-09-21', { [c.id]: { state: 'done' } }) }, since: '2026-09-21', today: '2026-09-22', threshold: 80 });
    const again = closeDays({ ...first, since: '2026-09-21', today: '2026-09-23', threshold: 80 });
    expect(again.closed).toEqual(['2026-09-22']);
    expect(again.days['2026-09-21'].summary?.score).toBe(100);
  });
});

describe('streaks', () => {
  it('lets skip preserve a commitment streak without counting', () => {
    const c = commitment({ createdOn: '2026-09-18' });
    const raw = {
      '2026-09-18': day('2026-09-18', { [c.id]: { state: 'done' } }),
      '2026-09-19': day('2026-09-19', { [c.id]: { state: 'skipped' } }),
      '2026-09-20': day('2026-09-20', { [c.id]: { state: 'done' } }),
    };
    const { days } = closeDays({ commitments: [c], days: raw, since: '2026-09-18', today: '2026-09-21', threshold: 80 });
    expect(commitmentStreak(c, days, '2026-09-21')).toBe(2); // today pending doesn't break
  });

  it('resets the personal streak on a scored day below threshold and holds on recovery', () => {
    const mk = (date: string, status: 'scored' | 'recovery', score: number | null): DayRecord =>
      day(date, {}, { closed: true, summary: { status, score, earned: 0, possible: 0, items: [], skippedIds: [], success: score === null ? null : score >= 80 } });
    const days = {
      '2026-09-18': mk('2026-09-18', 'scored', 50),
      '2026-09-19': mk('2026-09-19', 'scored', 85),
      '2026-09-20': mk('2026-09-20', 'recovery', null),
      '2026-09-21': mk('2026-09-21', 'scored', 90),
    };
    expect(personalStreak(days, '2026-09-22')).toEqual({ current: 2, best: 2 });
  });
});

describe('tone', () => {
  it('shifts tone by at most one step for mood', () => {
    expect(leanFor('Push me', null)).toBe('direct');
    expect(leanFor('Push me', 'Low')).toBe('balanced');
    expect(leanFor('Gentle', 'Great')).toBe('balanced');
    expect(leanFor('Balanced', 'Rough')).toBe('gentle');
  });

  it('never shows 100%-style copy when nothing is due', () => {
    expect(coachLine({ lean: 'balanced', planned: 3, due: 0, left: 0, recovery: false })).toBe('Nothing due today.');
    expect(coachLine({ lean: 'balanced', planned: 5, due: 5, left: 3, recovery: false })).toBe('Three left. Still winnable.');
  });
});
