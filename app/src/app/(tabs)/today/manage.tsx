import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { shortLabel } from '../../../domain/dates';
import { currentSchedule, patternLabel } from '../../../domain/schedule';
import { CATEGORIES, type Category } from '../../../domain/types';
import { useTendo } from '../../../state/store';
import { radius } from '../../../theme/tokens';
import { usePalette } from '../../../theme/useTheme';
import { CommitmentSheets, useCommitmentSheets } from '../../../ui/CommitmentSheets';
import { BackLink, Chip, ChipRow, Eyebrow, Field, Muted, Screen, T, Tag } from '../../../ui/kit';

const STATUSES = ['Active', 'Paused', 'Archived'] as const;
type StatusFilter = (typeof STATUSES)[number];

export default function Manage() {
  const p = usePalette();
  const commitments = useTendo(s => s.commitments);
  const sheets = useCommitmentSheets();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('Active');
  const [cat, setCat] = useState<Category | 'All'>('All');

  const q = query.trim().toLowerCase();
  const rows = commitments
    .filter(c => c.lifecycle === status.toLowerCase())
    .filter(c => cat === 'All' || c.category === cat)
    .filter(c => !q || c.name.toLowerCase().includes(q))
    .sort((a, b) => a.order - b.order);

  return (
    <Screen>
      <BackLink label="Today" onPress={() => router.back()} />
      <T w={700} size={30} style={{ marginTop: 16, letterSpacing: -0.3 }} accessibilityRole="header">Commitments</T>
      <Field value={query} onChangeText={setQuery} placeholder="Search commitments" accessibilityLabel="Search commitments" style={{ marginTop: 18, padding: 15, fontSize: 15 }} />
      <ChipRow style={{ marginTop: 14 }}>
        {STATUSES.map(s => <Chip key={s} label={s} compact active={status === s} onPress={() => setStatus(s)} />)}
      </ChipRow>
      <ChipRow style={{ marginTop: 8 }}>
        {(['All', ...CATEGORIES] as const).map(c => <Chip key={c} label={c} compact active={cat === c} onPress={() => setCat(c)} />)}
      </ChipRow>

      <Eyebrow style={{ marginTop: 24, marginBottom: 10 }}>{rows.length + (rows.length === 1 ? ' commitment' : ' commitments')}</Eyebrow>
      <View style={{ gap: 10 }}>
        {rows.map(c => (
          <View key={c.id} style={{ backgroundColor: p.surface, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => router.push({ pathname: '/commitment/[id]', params: { id: c.id } })} accessibilityRole="button"
              style={{ flex: 1, minWidth: 0, padding: 16 }}>
              <T w={600} size={15.5} color={c.lifecycle === 'active' ? p.text : p.secondary}>{c.name}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                {c.lifecycle === 'paused' ? <Tag label="PAUSED" /> : null}
                {c.lifecycle === 'archived' ? <Tag label="ARCHIVED" /> : null}
                <T size={12} color={p.muted}>
                  {c.category} · {patternLabel(currentSchedule(c).pattern)}
                  {c.lifecycle === 'paused' ? ' · ' + (c.pausedUntil ? 'back ' + shortLabel(c.pausedUntil) : 'until you resume') : ''}
                </T>
              </View>
            </Pressable>
            <Pressable onPress={() => sheets.open(c.id, 'actions')} accessibilityRole="button" accessibilityLabel={'More actions for ' + c.name}
              style={{ width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
              <T size={17} color={p.faint}>⋯</T>
            </Pressable>
          </View>
        ))}
      </View>
      {rows.length === 0 ? (
        <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: p.border, borderRadius: radius.lg, padding: 26 }}>
          <T size={14} color={p.secondary} style={{ textAlign: 'center', lineHeight: 21 }}>
            {q ? 'Nothing called “' + query.trim() + '”. Try another word or filter.'
              : status === 'Active' ? 'No active commitments here yet.'
                : status === 'Paused' ? 'Nothing paused.' : 'Nothing archived.'}
          </T>
        </View>
      ) : null}
      <Muted style={{ marginTop: 16 }}>Archiving keeps the history and the analytics. Deleting doesn't.</Muted>
      <CommitmentSheets ctl={sheets} />
    </Screen>
  );
}
