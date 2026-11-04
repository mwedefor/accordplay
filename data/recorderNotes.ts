// Port of web src/utils/recorderNotes.ts
// Baroque soprano recorder — C4 to D7 chromatic (39 notes)
// file convention: Cs=C#, Ds=Eb, Fs=F#, Gs=Ab, As=Bb

export type FingerState = boolean | 'half';

export interface RecorderNote {
  key:       string;
  label:     string;
  file:      string;
  midi:      number;
  fingering: FingerState[]; // [thumb, h1, h2, h3, h4, h5, h6, h7]
}

const T = true;
const F = false;
const H = 'half' as const;

export const RECORDER_NOTES: RecorderNote[] = [
  // Octave 4 — first register
  { key: 'rn_c4',  label: 'C4',  file: 'flute_C4_1_mezzo-forte_normal.mp3',  midi: 60,  fingering: [T, T, T, T, T, T, T, T] },
  { key: 'rn_cs4', label: 'C#4', file: 'flute_Cs4_1_mezzo-forte_normal.mp3', midi: 61,  fingering: [T, T, T, T, T, T, F, T] },
  { key: 'rn_d4',  label: 'D4',  file: 'flute_D4_1_mezzo-forte_normal.mp3',  midi: 62,  fingering: [T, T, T, T, T, T, T, F] },
  { key: 'rn_eb4', label: 'Eb4', file: 'flute_Ds4_1_mezzo-forte_normal.mp3', midi: 63,  fingering: [T, T, T, T, T, T, F, F] },
  { key: 'rn_e4',  label: 'E4',  file: 'flute_E4_1_mezzo-forte_normal.mp3',  midi: 64,  fingering: [T, T, T, T, T, T, F, F] },
  { key: 'rn_f4',  label: 'F4',  file: 'flute_F4_1_mezzo-forte_normal.mp3',  midi: 65,  fingering: [T, T, T, T, T, F, F, F] },
  { key: 'rn_fs4', label: 'F#4', file: 'flute_Fs4_1_mezzo-forte_normal.mp3', midi: 66,  fingering: [T, T, T, T, F, T, T, F] },
  { key: 'rn_g4',  label: 'G4',  file: 'flute_G4_1_mezzo-forte_normal.mp3',  midi: 67,  fingering: [T, T, T, T, F, F, F, F] },
  { key: 'rn_ab4', label: 'Ab4', file: 'flute_Gs4_1_mezzo-forte_normal.mp3', midi: 68,  fingering: [T, T, T, F, T, F, F, F] },
  { key: 'rn_a4',  label: 'A4',  file: 'flute_A4_1_mezzo-forte_normal.mp3',  midi: 69,  fingering: [T, T, T, F, F, F, F, F] },
  { key: 'rn_bb4', label: 'Bb4', file: 'flute_As4_1_mezzo-forte_normal.mp3', midi: 70,  fingering: [T, T, F, T, F, F, F, F] },
  { key: 'rn_b4',  label: 'B4',  file: 'flute_B4_1_mezzo-forte_normal.mp3',  midi: 71,  fingering: [T, T, F, F, F, F, F, F] },
  // Octave 5 — second register
  { key: 'rn_c5',  label: 'C5',  file: 'flute_C5_1_mezzo-forte_normal.mp3',  midi: 72,  fingering: [H, T, T, T, T, T, T, T] },
  { key: 'rn_cs5', label: 'C#5', file: 'flute_Cs5_1_mezzo-forte_normal.mp3', midi: 73,  fingering: [H, T, T, T, T, T, F, T] },
  { key: 'rn_d5',  label: 'D5',  file: 'flute_D5_1_mezzo-forte_normal.mp3',  midi: 74,  fingering: [H, T, T, T, T, T, T, F] },
  { key: 'rn_eb5', label: 'Eb5', file: 'flute_Ds5_1_mezzo-forte_normal.mp3', midi: 75,  fingering: [H, T, T, T, T, T, F, F] },
  { key: 'rn_e5',  label: 'E5',  file: 'flute_E5_1_mezzo-forte_normal.mp3',  midi: 76,  fingering: [H, T, T, T, T, T, F, F] },
  { key: 'rn_f5',  label: 'F5',  file: 'flute_F5_1_mezzo-forte_normal.mp3',  midi: 77,  fingering: [H, T, T, T, T, F, F, F] },
  { key: 'rn_fs5', label: 'F#5', file: 'flute_Fs5_1_mezzo-forte_normal.mp3', midi: 78,  fingering: [H, T, T, T, F, T, T, F] },
  { key: 'rn_g5',  label: 'G5',  file: 'flute_G5_1_mezzo-forte_normal.mp3',  midi: 79,  fingering: [H, T, T, T, F, F, F, F] },
  { key: 'rn_ab5', label: 'Ab5', file: 'flute_Gs5_1_mezzo-forte_normal.mp3', midi: 80,  fingering: [H, T, T, F, T, F, F, F] },
  { key: 'rn_a5',  label: 'A5',  file: 'flute_A5_1_mezzo-forte_normal.mp3',  midi: 81,  fingering: [H, T, T, F, F, F, F, F] },
  { key: 'rn_bb5', label: 'Bb5', file: 'flute_As5_1_mezzo-forte_normal.mp3', midi: 82,  fingering: [H, T, F, T, F, F, F, F] },
  { key: 'rn_b5',  label: 'B5',  file: 'flute_B5_1_mezzo-forte_normal.mp3',  midi: 83,  fingering: [H, T, F, F, F, F, F, F] },
  // Octave 6 — third register
  { key: 'rn_c6',  label: 'C6',  file: 'flute_C6_1_mezzo-forte_normal.mp3',  midi: 84,  fingering: [F, T, T, T, T, T, T, T] },
  { key: 'rn_cs6', label: 'C#6', file: 'flute_Cs6_1_mezzo-forte_normal.mp3', midi: 85,  fingering: [F, T, T, T, T, T, F, T] },
  { key: 'rn_d6',  label: 'D6',  file: 'flute_D6_1_mezzo-forte_normal.mp3',  midi: 86,  fingering: [F, T, T, T, T, T, T, F] },
  { key: 'rn_eb6', label: 'Eb6', file: 'flute_Ds6_1_mezzo-forte_normal.mp3', midi: 87,  fingering: [F, T, T, T, T, T, F, F] },
  { key: 'rn_e6',  label: 'E6',  file: 'flute_E6_1_mezzo-forte_normal.mp3',  midi: 88,  fingering: [F, T, T, T, T, T, F, F] },
  { key: 'rn_f6',  label: 'F6',  file: 'flute_F6_1_mezzo-forte_normal.mp3',  midi: 89,  fingering: [F, T, T, T, T, F, F, F] },
  { key: 'rn_fs6', label: 'F#6', file: 'flute_Fs6_1_mezzo-forte_normal.mp3', midi: 90,  fingering: [F, T, T, T, F, T, T, F] },
  { key: 'rn_g6',  label: 'G6',  file: 'flute_G6_1_mezzo-forte_normal.mp3',  midi: 91,  fingering: [F, T, T, T, F, F, F, F] },
  { key: 'rn_ab6', label: 'Ab6', file: 'flute_Gs6_1_mezzo-forte_normal.mp3', midi: 92,  fingering: [F, T, T, F, T, F, F, F] },
  { key: 'rn_a6',  label: 'A6',  file: 'flute_A6_1_mezzo-forte_normal.mp3',  midi: 93,  fingering: [F, T, T, F, F, F, F, F] },
  { key: 'rn_bb6', label: 'Bb6', file: 'flute_As6_1_mezzo-forte_normal.mp3', midi: 94,  fingering: [F, T, F, T, F, F, F, F] },
  { key: 'rn_b6',  label: 'B6',  file: 'flute_B6_1_mezzo-forte_normal.mp3',  midi: 95,  fingering: [F, T, F, F, F, F, F, F] },
  // Octave 7 — approximate
  { key: 'rn_c7',  label: 'C7',  file: 'flute_C7_1_mezzo-forte_normal.mp3',  midi: 96,  fingering: [F, T, T, T, T, T, T, T] },
  { key: 'rn_cs7', label: 'C#7', file: 'flute_Cs7_1_mezzo-forte_normal.mp3', midi: 97,  fingering: [F, T, T, T, T, T, F, T] },
  { key: 'rn_d7',  label: 'D7',  file: 'flute_D7_1_mezzo-forte_normal.mp3',  midi: 98,  fingering: [F, T, T, T, T, T, T, F] },
];

export const RECORDER_NOTE_MAP: Map<string, RecorderNote> = new Map(
  RECORDER_NOTES.map(n => [n.key, n])
);
