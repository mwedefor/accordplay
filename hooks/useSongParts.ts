import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { decryptNotes } from '../utils/notesEncryption';

export interface SongSection {
  id: string;
  name: string;
  start: number;
  end: number;
}

export interface SongData {
  notes: string[];
  sections: SongSection[];
  speedMs: number;
}

// Fetches all parts for a song, decrypts notes, and returns a flat notes array
// with section index markers — matching the shape AccordionScreen expects.
export function useSongParts(songId?: string) {
  const [songData, setSongData] = useState<SongData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token || !songId) { setSongData(null); return; }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      setSongData(null);
      try {
        const data = await apiClient.getSongParts(token, songId);
        const meta = (data as any[])
          .filter((p: any) => !p.isHidden)
          .sort((a: any, b: any) => a.order - b.order);
        if (cancelled || meta.length === 0) return;

        // Fetch all section details in parallel
        const details = await Promise.all(
          meta.map((p: any) => apiClient.getSongPartDetail(token, songId, p.sectionId))
        );
        if (cancelled) return;

        // Decrypt all notes in parallel
        const parts = await Promise.all(
          details.map(async (raw: any, i: number) => {
            const notes = typeof raw.notes === 'string'
              ? await decryptNotes(raw.notes)
              : (Array.isArray(raw.notes) ? raw.notes : []);
            return { ...meta[i], ...raw, notes };
          })
        );
        if (cancelled) return;

        // Build flat notes array + section index
        const flatNotes: string[] = [];
        const sections: SongSection[] = [];
        for (const p of parts) {
          const start = flatNotes.length;
          flatNotes.push(...p.notes);
          sections.push({ id: p.sectionId, name: p.name, start, end: flatNotes.length });
        }

        const speedMs = parts[0]?.recommendedSpeedMs ?? 300;
        setSongData({ notes: flatNotes, sections, speedMs });
      } catch (err) {
        console.error('[useSongParts] failed for songId', songId, err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar la canción');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [token, songId]);

  return { songData, loading, error };
}
