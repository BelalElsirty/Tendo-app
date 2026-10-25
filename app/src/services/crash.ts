import * as Sentry from '@sentry/react-native';

// Crash reporting boundary. Reports go to Sentry only when a DSN is configured for the build
// (EXPO_PUBLIC_SENTRY_DSN); without one, everything here is a no-op apart from the dev console.

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const crashReportingEnabled = !!dsn;

export function initCrashReporting() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    // Commitments, moods and names are personal (PRD §24): no PII, no screen replay,
    // and nothing from the request or user context beyond what Sentry needs to group a crash.
    sendDefaultPii: false,
    tracesSampleRate: __DEV__ ? 0 : 0.1,
    beforeBreadcrumb: b => (b.category === 'console' ? null : b),
  });
}

/** Reports a caught error, such as one stopped by an error boundary. */
export function reportError(error: unknown, context?: Record<string, string>) {
  if (__DEV__) console.warn('[tendo] caught error', error);
  if (!dsn) return;
  Sentry.captureException(error, context ? { tags: context } : undefined);
}

/** Wraps the root component so uncaught errors and native crashes are captured. */
export const wrapRoot: <P extends Record<string, unknown>>(C: React.ComponentType<P>) => React.ComponentType<P> =
  C => (dsn ? Sentry.wrap(C) : C);
