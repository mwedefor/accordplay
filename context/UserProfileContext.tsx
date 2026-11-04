import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from '../services/apiClient';

export type NormalizedInstrument = 'accordion' | 'violin' | 'piano' | 'recorder' | 'guitar';

export interface UserProfileContextType {
  instruments: NormalizedInstrument[];
  profileLoading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType>({
  instruments: [],
  profileLoading: false,
});

function normalizeInstrument(raw: string): NormalizedInstrument | null {
  const s = (raw ?? '').toLowerCase().trim();
  if (s.includes('acord') || s === 'accordion') return 'accordion';
  if (s.includes('violin') || s.includes('violín')) return 'violin';
  if (s === 'piano') return 'piano';
  if (s.includes('flauta') || s === 'recorder') return 'recorder';
  if (s.includes('guitar') || s.includes('guitarra')) return 'guitar';
  return null;
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [instruments, setInstruments] = useState<NormalizedInstrument[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setInstruments([]);
      return;
    }
    setProfileLoading(true);
    apiClient.getPurchasedSongs(token)
      .then((purchased: any[]) => {
        const normalized = purchased
          .map((s: any) => normalizeInstrument(s.instrument))
          .filter((i): i is NormalizedInstrument => i !== null);
        setInstruments([...new Set(normalized)]);
      })
      .catch(() => setInstruments([]))
      .finally(() => setProfileLoading(false));
  }, [token]);

  return (
    <UserProfileContext.Provider value={{ instruments, profileLoading }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export const useUserProfile = () => useContext(UserProfileContext);
