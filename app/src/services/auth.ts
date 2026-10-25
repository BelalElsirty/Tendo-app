// Auth boundary. Phase 1 ships a local implementation so the app is usable before a
// Supabase project exists; Phase 2 swaps in `SupabaseAuthService` with the same shape.

export type Provider = 'email' | 'apple' | 'google';

export interface AuthUser {
  email: string;
  name: string;
  provider: Provider;
}

export interface AuthService {
  register(input: { name: string; email: string; password: string }): Promise<{ needsVerification: boolean }>;
  verifyEmail(email: string, code: string): Promise<boolean>;
  resendCode(email: string): Promise<void>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signInWithProvider(provider: Exclude<Provider, 'email'>): Promise<AuthUser>;
  sendPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Device-only stand-in. It never stores passwords and accepts any six-digit code,
 * so it must not ship to the stores — Phase 2 replaces it with Supabase Auth.
 */
export const localAuth: AuthService = {
  async register() {
    await wait(300);
    return { needsVerification: true };
  },
  async verifyEmail(_email, code) {
    await wait(300);
    return /^\d{6}$/.test(code);
  },
  async resendCode() {
    await wait(200);
  },
  async signIn(email) {
    await wait(700);
    return { email, name: email.split('@')[0], provider: 'email' };
  },
  async signInWithProvider(provider) {
    await wait(500);
    return { email: '', name: '', provider };
  },
  async sendPasswordReset() {
    await wait(300);
  },
  async signOut() {},
};

export const isValidEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());

export type UsernameState = 'empty' | 'short' | 'long' | 'chars' | 'taken' | 'ok';

const RESERVED = ['tendo', 'admin', 'support', 'help', 'root'];

/** 3–20 chars, letters/numbers/underscore, case-insensitive unique (PRD §20). */
export function usernameState(u: string): UsernameState {
  if (!u) return 'empty';
  if (u.length < 3) return 'short';
  if (u.length > 20) return 'long';
  if (!/^[a-z0-9_]+$/i.test(u)) return 'chars';
  if (RESERVED.includes(u.toLowerCase())) return 'taken';
  return 'ok';
}

export const USERNAME_HINT: Record<UsernameState, string> = {
  empty: '3–20 characters. Letters, numbers and underscores.',
  short: 'At least 3 characters.',
  long: '20 characters at most.',
  chars: 'Only letters, numbers and underscores.',
  taken: 'That one is taken.',
  ok: 'Available.',
};

/** 0 = too short, 1 weak, 2 decent, 3 strong. */
export function passwordScore(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 8) return 0;
  if (pw.length >= 12 && /[^A-Za-z0-9]/.test(pw)) return 3;
  return /\d/.test(pw) ? 2 : 1;
}
