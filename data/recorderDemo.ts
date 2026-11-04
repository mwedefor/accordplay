import type { SongData } from '../hooks/useSongParts';

// Demo — My Heart Will Go On (port of web recorderDemo.ts)
export const DEMO_NAME     = 'My Heart Will Go On';
export const DEMO_SPEED_MS = 500;

export const DEMO_NOTES: string[] = [
  "12", "6",
  "rn_d5:3 3", "rn_e5:3 3", "rn_fs5:18 18", "rn_e5:3 3", "rn_d5:3 3",
  "rn_e5:3 3", "rn_a5:3 3", "12", "rn_g5:3 3", "rn_fs5:3 3",
  "rn_d5:18 18", "rn_b4:6 6", "rn_a4:18 18",
  "rn_d5:3 3", "rn_e5:3 3", "rn_fs5:18 18", "rn_e5:3 3", "rn_d5:3 3",
  "rn_e5:3 3", "rn_a5:3 3", "12", "rn_g5:3 3", "rn_a5:3 3",
  "rn_b5:12 12", "rn_a5:12 12", "rn_fs5:3 3", "rn_e5:18 18", "3",
  "rn_d5:9 9", "rn_d5:3 3", "rn_d5:6 6", "rn_d5:6 6", "rn_cs5:6 6",
  "rn_d5:12 12", "rn_d5:6 6", "rn_cs5:6 6", "rn_d5:12 12",
  "rn_e5:6 6", "rn_fs5:12 12", "rn_e5:12 12",
  "rn_d5:9 9", "rn_d5:3 3", "rn_d5:6 6", "rn_d5:6 6", "rn_cs5:6 6",
  "rn_d5:12 12", "rn_d5:6 6", "rn_b4:24 24", "rn_a4:24 24",
  "rn_d5:9 9", "rn_d5:3 3", "rn_d5:6 6", "rn_d5:6 6", "rn_cs5:6 6",
  "rn_d5:12 12", "rn_d5:6 6", "rn_cs5:6 6", "rn_d5:12 12",
  "rn_e5:6 6", "rn_fs5:12 12", "rn_e5:12 12",
  "rn_d5:9 9", "rn_d5:3 3", "rn_d5:6 6", "rn_d5:6 6", "rn_cs5:6 6",
  "rn_d5:12 12", "rn_d5:6 6", "rn_b4:24 24", "rn_a4:24 24",
  "rn_d5:24 24", "rn_e5:18 18", "rn_a4:6 6",
  "rn_a5:12 12", "rn_g5:6 6", "rn_fs5:6 6", "rn_e5:12 12",
  "rn_fs5:6 6", "rn_g5:6 6", "rn_fs5:12 12", "rn_e5:6 6", "rn_d5:6 6",
  "rn_cs5:6 6", "rn_d5:12 12", "rn_cs5:6 6", "rn_b4:24 24", "rn_a4:24 24",
  "rn_d5:24 24", "rn_e5:18 18", "rn_a4:6 6",
  "rn_a5:12 12", "rn_g5:6 6", "rn_fs5:6 6", "rn_e5:12 12",
  "rn_fs5:6 6", "rn_g5:6 6", "rn_fs5:12 12", "rn_e5:6 6", "rn_d5:6 6",
  "rn_cs5:6 6", "rn_d5:12 12", "rn_d5:6 6", "rn_cs5:6 6", "rn_d5:12 12",
  "rn_e5:6 6", "rn_fs5:12 12", "rn_e5:12 12", "rn_d5:24 24",
];

export const DEMO_DATA: SongData = {
  notes:    DEMO_NOTES,
  sections: [{ id: 'demo-s1', name: DEMO_NAME, start: 0, end: DEMO_NOTES.length }],
  speedMs:  DEMO_SPEED_MS,
};
