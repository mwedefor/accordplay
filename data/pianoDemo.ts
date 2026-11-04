import type { SongData } from '../hooks/useSongParts';

// Demo — My Heart Will Go On (adapted from web pianoDemo.ts)
export const DEMO_NOTES: string[] = [
  "12", "6",
  "pD5 3", "pE5 3", "pFs5 18", "pE5 3", "pD5 3", "pE5 3", "pA5 3",
  "12",
  "pG5 3", "pFs5 3", "pD5 18", "pB4 6", "pA4 18",
  "pD5 3", "pE5 3", "pFs5 18", "pE5 3", "pD5 3", "pE5 3", "pA5 3",
  "12",
  "pG5 3", "pA5 3", "pB5 12", "pA5 12",
  "pFs5 3", "pE5 18", "3",
  "pD5 9", "pD5 3", "pD5 6", "pD5 6", "pCs5 6", "pD5 12", "pD5 6", "pCs5 6", "pD5 12",
  "pE5 6", "pFs5 12", "pE5 12",
  "pD5 9", "pD5 3", "pD5 6", "pD5 6", "pCs5 6", "pD5 12", "pD5 6",
  "pB4 24", "pA4 24",
  "pD5 9", "pD5 3", "pD5 6", "pD5 6", "pCs5 6", "pD5 12", "pD5 6", "pCs5 6", "pD5 12",
  "pE5 6", "pFs5 12", "pE5 12",
  "pD5 9", "pD5 3", "pD5 6", "pD5 6", "pCs5 6", "pD5 12", "pD5 6",
  "pB4 24", "pA4 24",
  "pD5 24",
  "pE5 18", "pA4 6", "pA5 12", "pG5 6", "pFs5 6",
  "pE5 12", "pFs5 6", "pG5 6", "pFs5 12", "pE5 6", "pD5 6", "pCs5 6", "pD5 12", "pCs5 6", "pB4 24", "pA4 24",
  "pD5 24",
  "pE5 18", "pA4 6", "pA5 12", "pG5 6", "pFs5 6",
  "pE5 12", "pFs5 6", "pG5 6", "pFs5 12", "pE5 6", "pD5 6", "pCs5 6", "pD5 12",
  "pD5 6", "pCs5 6", "pD5 12",
  "pE5 6", "pFs5 12", "pE5 12", "pD5 24",
];

export const DEMO_NAME   = 'My Heart Will Go On';
export const DEMO_SPEED_MS = 500;
export const DEMO_DATA: SongData = {
  notes:    DEMO_NOTES,
  sections: [{ id: 'demo-1', name: DEMO_NAME, start: 0, end: DEMO_NOTES.length }],
  speedMs:  DEMO_SPEED_MS,
};
