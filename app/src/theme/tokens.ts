// Design tokens from the approved prototype and PRD §36. Two themes share everything but surfaces.

export type ThemeName = 'warm' | 'black';

export interface Palette {
  bg: string;
  surface: string;
  raised: string;
  tabBar: string;
  selfRow: string;
  border: string;
  borderStrong: string;
  divider: string;
  text: string;
  textSoft: string;
  secondary: string;
  muted: string;
  faint: string;
  olive: string;
  oliveBright: string;
  oliveBg: string;
  oliveBd: string;
  oliveFill: string;
  onOlive: string;
  sand: string;
  danger: string;
  dangerSoft: string;
  dangerBg: string;
  dangerBd: string;
  errorBd: string;
  dangerStrong: string;
  warn: string;
  scrim: string;
}

const shared = {
  text: '#F4EDE4',
  textSoft: '#D8CFC2',
  secondary: '#A79A8C',
  muted: '#9A8E82',
  faint: '#8C8175',
  olive: '#8C9B6E',
  oliveBright: '#A9B88A',
  oliveBd: '#33402A',
  oliveFill: '#26301C',
  onOlive: '#14100D',
  sand: '#C0A98A',
  danger: '#D69A8C',
  dangerSoft: '#E0A596',
  dangerBd: '#4A322B',
  errorBd: '#6B4038',
  dangerStrong: '#7A3B33',
  warn: '#C08A4A',
  scrim: 'rgba(8,6,5,0.7)',
};

export const palettes: Record<ThemeName, Palette> = {
  warm: {
    ...shared,
    bg: '#14100D',
    surface: '#1E1915',
    raised: '#2A231D',
    tabBar: '#181310',
    selfRow: '#221D18',
    border: '#3A312A',
    borderStrong: '#4A4036',
    divider: '#2A231D',
    oliveBg: '#1B2116',
    dangerBg: '#241A17',
  },
  black: {
    ...shared,
    bg: '#000000',
    surface: '#0D0D0D',
    raised: '#1B1B1B',
    tabBar: '#050505',
    selfRow: '#161616',
    border: '#272727',
    borderStrong: '#343434',
    divider: '#1A1A1A',
    oliveBg: '#0E120C',
    dangerBg: '#160F0E',
  },
};

export const fonts = {
  400: 'Montserrat_400Regular',
  500: 'Montserrat_500Medium',
  600: 'Montserrat_600SemiBold',
  700: 'Montserrat_700Bold',
} as const;

export type FontWeight = keyof typeof fonts;

export const radius = { sm: 10, md: 12, lg: 14, sheet: 18, pill: 999 } as const;
