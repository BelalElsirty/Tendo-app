import { createElement } from 'react';
import { fonts } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import type { DateFieldProps } from './DateField';

/** Web build uses the browser's own date input. */
export function DateField({ value, onChange, min, max, label }: DateFieldProps) {
  const p = usePalette();
  return createElement('input', {
    type: 'date',
    value: value ?? '',
    min,
    max,
    'aria-label': label,
    onChange: (e: { target: { value: string } }) => { if (e.target.value) onChange(e.target.value); },
    style: {
      marginTop: 10, width: '100%', boxSizing: 'border-box', background: p.bg, border: '1px solid ' + p.border, borderRadius: 10,
      padding: 14, color: p.text, fontFamily: fonts[600], fontSize: 15, outline: 'none', colorScheme: 'dark',
    },
  });
}
