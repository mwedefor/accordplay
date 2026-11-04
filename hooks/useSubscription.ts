import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';

export interface Subscription {
  plan: string;
  status: 'active' | 'cancelled' | 'expired';
  endDate?: string;
}

export function useSubscription() {
  const { token, user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading]             = useState(false);

  const refresh = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiClient.getSubscriptionStatus(token)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.subscriptions) ? data.subscriptions : []);
        setSubscriptions(list);
      })
      .catch(() => setSubscriptions([]))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (user) refresh();
    else { setSubscriptions([]); setLoading(false); }
  }, [user, refresh]);

  const now = new Date();
  const activeList = subscriptions.filter(s =>
    (s.status === 'active' || s.status === 'cancelled') &&
    s.endDate && new Date(s.endDate) > now
  );
  const activePlans = activeList.map(s => s.plan);

  const getSubscriptionForPlan = (plan: string) =>
    activeList.find(s => s.plan === plan) ?? null;

  const hasActivePlanPrefix = (prefix: string) =>
    activePlans.some(p => p.startsWith(prefix));

  const hasActiveAccordionAccess = hasActivePlanPrefix('accordion_');
  const hasActivePianoAccess     = hasActivePlanPrefix('piano_');
  const hasActiveViolinAccess    = hasActivePlanPrefix('violin_');
  const hasActiveRecorderAccess  = hasActivePlanPrefix('recorder_');
  const hasActiveGuitarAccess    = hasActivePlanPrefix('guitar_');
  const hasActiveBundleAccess    =
    hasActivePianoAccess && hasActiveViolinAccess &&
    hasActiveRecorderAccess && hasActiveGuitarAccess;

  return {
    subscriptions,
    activeList,
    loading,
    refresh,
    getSubscriptionForPlan,
    hasActiveAccordionAccess,
    hasActivePianoAccess,
    hasActiveViolinAccess,
    hasActiveRecorderAccess,
    hasActiveGuitarAccess,
    hasActiveBundleAccess,
  };
}
