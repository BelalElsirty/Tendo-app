import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { fromKey, longLabel, toKey } from '../domain/dates';
import type { DateKey } from '../domain/types';
import { usePalette } from '../theme/useTheme';
import { T } from './kit';

export interface DateFieldProps {
  value: DateKey | null;
  onChange: (d: DateKey) => void;
  min?: DateKey;
  max?: DateKey;
  label: string;
  placeholder?: string;
}

/** Native date picker (PRD: native pickers). iOS shows the compact control; Android opens its dialog. */
export function DateField({ value, onChange, min, max, label, placeholder = 'Choose a date' }: DateFieldProps) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const date = value ? fromKey(value) : fromKey(min ?? toKey(new Date()));
  const picker = (
    <DateTimePicker
      value={date}
      mode="date"
      display={Platform.OS === 'ios' ? 'compact' : 'default'}
      minimumDate={min ? fromKey(min) : undefined}
      maximumDate={max ? fromKey(max) : undefined}
      themeVariant="dark"
      accentColor={p.olive}
      onChange={(e, d) => { setOpen(false); if (e.type === 'set' && d) onChange(toKey(d)); }}
    />
  );
  if (Platform.OS === 'ios') {
    return (
      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: p.bg, borderWidth: 1, borderColor: p.border, borderRadius: 10, padding: 10 }}>
        <T size={14} color={p.secondary}>{label}</T>
        {picker}
      </View>
    );
  }
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label + ', ' + (value ? longLabel(value) : 'not set')}
        style={{ marginTop: 10, backgroundColor: p.bg, borderWidth: 1, borderColor: p.border, borderRadius: 10, padding: 14 }}>
        <T w={600} size={15} color={value ? p.text : p.faint}>{value ? longLabel(value) : placeholder}</T>
      </Pressable>
      {open ? picker : null}
    </>
  );
}
