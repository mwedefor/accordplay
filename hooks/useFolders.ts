import { useMemo, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import type { Song } from '../types';

export function useFolders(songs: Song[], token: string | null) {
  const folders = useMemo(() => songs.filter(s => s.type === 'folder'), [songs]);

  const createFolder = useCallback(async (name: string, instrument: string): Promise<Song> => {
    if (!token) throw new Error('No token');
    const folder: Song = {
      songId:    Math.random().toString(36).slice(2),
      name,
      artist:    '',
      instrument,
      link:      '',
      price:     0,
      createdAt: Date.now().toString(),
      type:      'folder',
    };
    await apiClient.createSong(token, folder);
    return folder;
  }, [token]);

  const moveSongToFolder = useCallback(async (songId: string, folderId: string | null) => {
    if (!token) throw new Error('No token');
    await apiClient.updateSong(token, songId, { folderId: folderId ?? null });
  }, [token]);

  return { folders, createFolder, moveSongToFolder };
}
