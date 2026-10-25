import { Redirect } from 'expo-router';
import { useTendo } from '../state/store';

/** Routes to wherever the account lifecycle currently is. */
export default function Index() {
  const stage = useTendo(s => s.stage);
  const checkedIn = useTendo(s => !!s.days[s.today]?.checkinDone);
  if (stage === 'signedOut') return <Redirect href="/welcome" />;
  if (stage === 'verify') return <Redirect href="/verify" />;
  if (stage === 'username') return <Redirect href="/username" />;
  if (stage === 'onboarding') return <Redirect href="/onboarding" />;
  return <Redirect href={checkedIn ? '/today' : '/checkin'} />;
}
