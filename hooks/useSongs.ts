import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import type { Song } from '../types';

export function useSongs() {
  const { token } = useAuth();
  const [songs, setSongs]     = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchSongs = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    apiClient.getSongs(token)
      .then((data: Song[]) => setSongs(Array.isArray(data) ? data : []))
      .catch(() => setError('No se pudieron cargar las canciones'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchSongs(); }, [fetchSongs]);

  return { songs, loading, error, refresh: fetchSongs };
}
