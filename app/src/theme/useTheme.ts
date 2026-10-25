import { useTendo } from '../state/store';
import { palettes, type Palette } from './tokens';

export function usePalette(): Palette {
  return palettes[useTendo(s => s.settings.theme)];
}
