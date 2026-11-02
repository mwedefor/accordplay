import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import type { Todo, Song, PurchasedSong } from '../types';

export interface DashboardStats {
  songs: number;
  instruments: number;
  spent: number;
  tasks: number;
}

export interface DashboardData {
  loading: boolean;
  stats: DashboardStats;
  pendingTodos: Todo[];
  recentSongs: Song[];
  purchasedIds: Set<string>;
  refresh: () => void;
}

export function useDashboard(): DashboardData {
  const { token } = useAuth();
  const [todos, setTodos]               = useState<Todo[]>([]);
  const [songs, setSongs]               = useState<Song[]>([]);
  const [purchased, setPurchased]       = useState<PurchasedSong[]>([]);
  const [loading, setLoading]           = useState(true);

  const fetchAll = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiClient.getTodos(token).then(setTodos).catch(() => {}),
      apiClient.getSongs(token).then(setSongs).catch(() => {}),
      apiClient.getPurchasedSongs(token).then(setPurchased).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(fetchAll, [token]);

  const uniquePurchased = [...new Map(purchased.map(s => [s.songId, s])).values()];
  const instruments     = [...new Set(uniquePurchased.map(s => s.instrument))];
  const totalSpent      = uniquePurchased.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const pendingTodos    = todos.filter(t => !t.completed);
  const purchasedIds    = new Set(uniquePurchased.map(s => s.songId));

  const recentSongs = songs
    .filter(s => s.isVisible === true)
    .sort((a, b) => parseInt(b.createdAt) - parseInt(a.createdAt))
    .slice(0, 6);

  return {
    loading,
    stats: {
      songs:       uniquePurchased.length,
      instruments: instruments.length,
      spent:       totalSpent,
      tasks:       pendingTodos.length,
    },
    pendingTodos: pendingTodos.slice(0, 6),
    recentSongs,
    purchasedIds,
    refresh: fetchAll,
  };
}
