import type { Mood, Tone } from './types';

export type Lean = 'gentle' | 'balanced' | 'direct';

const BASE: Record<Tone, number> = { Gentle: 0, Balanced: 1, 'Push me': 2 };
const LEANS: Lean[] = ['gentle', 'balanced', 'direct'];

/**
 * Mood shifts the user's tone preference by at most one step (PRD §17).
 * It changes copy only — never score, weight or requirements.
 */
export function leanFor(tone: Tone, mood: Mood | null): Lean {
  const shift = mood === 'Rough' || mood === 'Low' ? -1 : mood === 'Good' || mood === 'Great' ? 1 : 0;
  return LEANS[Math.max(0, Math.min(2, BASE[tone] + shift))];
}

const WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export const countWord = (n: number) => WORDS[n] ?? String(n);

export interface CoachInput {
  lean: Lean;
  planned: number;
  due: number;
  left: number;
  recovery: boolean;
}

/** Curated coach line under the score. Never guilt, never shame. */
export function coachLine({ lean, planned, due, left, recovery }: CoachInput): string {
  if (recovery) return lean === 'gentle' ? 'Recovery day. Rest counts too.' : 'Recovery day. Take what you can.';
  if (planned === 0) return 'Nothing on the board yet.';
  if (due === 0) return 'Nothing due today.';
  if (left === 0) return lean === 'gentle' ? 'All of it. Well held.' : lean === 'direct' ? 'All of it. Done.' : 'All of it. Keep your way.';
  if (left === 1) return lean === 'gentle' ? 'One left. No rush.' : 'One left. Finish it.';
  if (lean === 'gentle') return left === due ? 'Start with one. That is enough to begin.' : countWord(left) + ' left. One at a time.';
  if (lean === 'direct') return countWord(left) + ' left. You know the plan.';
  return countWord(left) + ' left. Still winnable.';
}

export function toneNote(tone: Tone, mood: Mood | null): string {
  if (!mood) return 'Mood can soften or sharpen this for a day. It never changes what the score asks of you.';
  return 'You said ' + mood.toLowerCase() + ' today, so Tendo leans ' + leanFor(tone, mood) + '. Mood changes the conversation, never the score.';
}
