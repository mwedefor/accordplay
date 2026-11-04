import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { Subscription } from '../hooks/useSubscription';

type ColorTheme = 'blue' | 'purple' | 'amber' | 'teal' | 'green';

const THEME: Record<ColorTheme, {
  ring: [string, string]; accentBg: string; accentText: string;
}> = {
  blue:   { ring: ['#2563eb','#4f46e5'], accentBg: '#dbeafe', accentText: '#2563eb' },
  purple: { ring: ['#9333ea','#2563eb'], accentBg: '#f3e8ff', accentText: '#9333ea' },
  amber:  { ring: ['#d97706','#f97316'], accentBg: '#fef3c7', accentText: '#d97706' },
  teal:   { ring: ['#0d9488','#10b981'], accentBg: '#ccfbf1', accentText: '#0d9488' },
  green:  { ring: ['#16a34a','#10b981'], accentBg: '#dcfce7', accentText: '#16a34a' },
};

const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const PERIOD_LABELS: Record<string, string> = {
  daily:'Diaria', monthly:'Mensual', quarterly:'Trimestral',
  biannual:'Semestral', annual:'Anual', trial:'Prueba gratuita',
};

function getPeriodLabel(plan?: string): string {
  if (!plan) return '';
  const suffix = plan.split('_').slice(1).join('_');
  return PERIOD_LABELS[suffix] ?? suffix;
}

interface Props {
  plan: string;
  activeSub?: Subscription | null;
  colorTheme: ColorTheme;
  instrumentName: string;
  feature?: string;
  isAdmin?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  onSubscribe?: () => void;
}

export default function MembershipCard({
  plan, activeSub, colorTheme, instrumentName, feature, isAdmin,
  onRefresh, refreshing, onSubscribe,
}: Props) {
  const th          = THEME[colorTheme];
  const periodLabel = getPeriodLabel(plan);
  const endDate     = activeSub?.endDate ? fmtDate(activeSub.endDate) : null;
  const displayName = `${instrumentName}${periodLabel ? ` — ${periodLabel}` : ''}`;

  return (
    <View style={s.shadow}>
      <View style={s.clip}>
        <LinearGradient colors={th.ring} style={StyleSheet.absoluteFill} />
        <View style={s.body}>

          {/* Row 1: crown + info */}
          <View style={s.topRow}>
            <View style={[s.crownCircle, { backgroundColor: th.accentBg }]}>
              <MaterialCommunityIcons name="crown" size={20} color={th.accentText} />
            </View>
            <View style={s.info}>
              <View style={s.nameRow}>
                <Text style={s.name} numberOfLines={1}>{displayName}</Text>
                {activeSub ? (
                  <View style={s.pill}>
                    <Text style={s.pillText}>Activa</Text>
                  </View>
                ) : null}
              </View>
              {feature  ? <Text style={s.feature}>{feature}</Text>  : null}
              {endDate  ? <Text style={s.expiry}>Vence el {endDate}</Text> : null}
            </View>
          </View>

          {/* Row 2: refresh (active) or subscribe (no active sub) */}
          {activeSub && onRefresh ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} hitSlop={8} style={s.refreshRow}>
              {refreshing
                ? <ActivityIndicator size="small" color="#9ca3af" />
                : <Feather name="refresh-cw" size={13} color="#9ca3af" />
              }
              <Text style={s.refreshText}>Actualizar</Text>
            </TouchableOpacity>
          ) : !activeSub && onSubscribe ? (
            <TouchableOpacity onPress={onSubscribe} activeOpacity={0.8} style={[s.subscribeBtn, { backgroundColor: th.accentText }]}>
              <MaterialCommunityIcons name="crown" size={15} color="#fff" />
              <Text style={s.subscribeBtnText}>Suscribirse</Text>
            </TouchableOpacity>
          ) : null}

        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shadow: {
    borderRadius: 16, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 8, elevation: 4,
  },
  clip: { borderRadius: 16, overflow: 'hidden', padding: 2 },
  body: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 16, gap: 12,
  },
  topRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  crownCircle: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  info:    { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:    { fontSize: 13, fontWeight: '700', color: '#111827', flexShrink: 1, flexGrow: 1 },
  pill:    { backgroundColor: '#dcfce7', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  pillText:{ fontSize: 9, fontWeight: '700', color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.5 },
  feature: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  expiry:  { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  refreshRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  refreshText: { fontSize: 12, color: '#9ca3af' },
  subscribeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  subscribeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
