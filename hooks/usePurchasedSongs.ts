import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import type { PurchasedSong } from '../types';

export function usePurchasedSongs() {
  const { token } = useAuth();
  const [purchasedSongs, setPurchasedSongs] = useState<PurchasedSong[]>([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    apiClient.getPurchasedSongs(token)
      .then((data: PurchasedSong[]) => setPurchasedSongs(Array.isArray(data) ? data : []))
      .catch(() => setError('Error al cargar compras'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  return { purchasedSongs, loading, error, refresh };
}
