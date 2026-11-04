import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import type { Subscription } from '../hooks/useSubscription';
import { apiClient } from '../services/apiClient';
import ScreenLayout from '../components/ScreenLayout';

// ── Plan prices ───────────────────────────────────────────────────────────────
const PLAN_PRICES: Record<string, number> = {
  piano_monthly:      39900,  piano_quarterly:    119900,
  piano_biannual:     239900, piano_annual:       479000,
  violin_monthly:     39900,  violin_quarterly:   119900,
  violin_biannual:    239900, violin_annual:      479000,
  recorder_monthly:   39900,  recorder_quarterly: 119900,
  recorder_biannual:  239900, recorder_annual:    479000,
  guitar_monthly:     39900,  guitar_quarterly:   119900,
  guitar_biannual:    239900, guitar_annual:      479000,
  bundle_monthly:     69900,  bundle_quarterly:   189900,
  bundle_annual:      599000,
};

function fmt(cop: number) {
  return `$${cop.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} COP`;
}

const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function generateInvoice(): string {
  const h = () => Math.floor(Math.random() * 16).toString(16);
  const s = (n: number) => Array(n).fill(0).map(h).join('');
  return `${s(8)}-${s(4)}-4${s(3)}-${['8','9','a','b'][Math.floor(Math.random()*4)]}${s(3)}-${s(12)}`;
}

// ── Color themes ──────────────────────────────────────────────────────────────
type ThemeKey = 'purple' | 'amber' | 'teal' | 'green' | 'bundle';
const THEMES: Record<ThemeKey, { grad: [string, string]; bg: string; border: string; text: string; badge: string; accent: string }> = {
  purple: { grad: ['#6d28d9','#2563eb'], bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6', badge: '#7c3aed', accent: '#ede9fe' },
  amber:  { grad: ['#b45309','#ea580c'], bg: '#fffbeb', border: '#fde68a', text: '#92400e', badge: '#d97706', accent: '#fef3c7' },
  teal:   { grad: ['#0f766e','#059669'], bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a', badge: '#0d9488', accent: '#ccfbf1' },
  green:  { grad: ['#15803d','#059669'], bg: '#f0fdf4', border: '#bbf7d0', text: '#14532d', badge: '#16a34a', accent: '#dcfce7' },
  bundle: { grad: ['#5b21b6','#4338ca'], bg: '#f5f3ff', border: '#c4b5fd', text: '#4c1d95', badge: '#7c3aed', accent: '#ede9fe' },
};

// ── Period metadata ───────────────────────────────────────────────────────────
const PERIOD_LABELS: Record<string, string>    = { monthly:'Mensual', quarterly:'Trimestral', biannual:'Semestral', annual:'Anual' };
const PERIOD_DURATION: Record<string, string>  = { monthly:'30 días', quarterly:'90 días', biannual:'180 días', annual:'365 días' };

type Period = 'monthly' | 'quarterly' | 'biannual' | 'annual';
type BundlePeriod = 'monthly' | 'quarterly' | 'annual';
const PERIODS: Period[]             = ['monthly','quarterly','biannual','annual'];
const BUNDLE_PERIODS: BundlePeriod[] = ['monthly','quarterly','annual'];

// ── Instruments ───────────────────────────────────────────────────────────────
const INSTRUMENTS = [
  { key: 'piano',    label: 'Piano',    emoji: '🎹', theme: 'purple' as ThemeKey, feature: 'Simulador interactivo de Piano' },
  { key: 'violin',   label: 'Violín',   emoji: '🎻', theme: 'amber'  as ThemeKey, feature: 'Simulador interactivo de Violín' },
  { key: 'recorder', label: 'Flauta',   emoji: '🪈', theme: 'teal'   as ThemeKey, feature: 'Simulador interactivo de Flauta' },
  { key: 'guitar',   label: 'Guitarra', emoji: '🎸', theme: 'green'  as ThemeKey, feature: 'Simulador interactivo de Guitarra' },
] as const;

// ── Subscribe modal ───────────────────────────────────────────────────────────
interface SubscribeModalProps {
  visible: boolean;
  plan: string;
  price: number;
  title: string;
  theme: ThemeKey;
  userEmail?: string;
  userName?: string;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

function SubscribeModal({ visible, plan, price, title, theme, userEmail, userName, onClose, onSuccess, token }: SubscribeModalProps) {
  const t = THEMES[theme];
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [docId, setDocId]     = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (visible) {
      if (userName && !name) setName(userName);
      if (userEmail && !email) setEmail(userEmail);
    }
  }, [visible, userName, userEmail]);

  const canSubmit = name.trim() && email.includes('@') && docId.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setProcessing(true);
    try {
      const invoice = generateInvoice();
      await apiClient.initiateSubscription(token, {
        invoice,
        plan,
        amount: price,
        currency: 'COP',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        customerIdentification: docId.trim(),
      });
      onClose();
      onSuccess();
      Alert.alert(
        'Solicitud registrada',
        'Tu solicitud de membresía fue recibida. Recibirás las instrucciones de pago en tu correo para activar el acceso.',
        [{ text: 'Entendido' }],
      );
    } catch {
      Alert.alert('Error', 'No se pudo registrar la solicitud. Intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <LinearGradient colors={t.grad} style={s.mHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.mHeaderTitle}>{title}</Text>
            <Text style={s.mHeaderSub}>{fmt(price)} · {PERIOD_LABELS[plan.split('_').slice(1).join('_')] ?? 'Mensual'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={s.mBody} keyboardShouldPersistTaps="handled">
          {/* Summary box */}
          <View style={[s.mSummary, { backgroundColor: t.accent, borderColor: t.border }]}>
            <Text style={[s.mSummaryTitle, { color: t.text }]}>{title}</Text>
            <Text style={[s.mSummaryPrice, { color: t.badge }]}>{fmt(price)}</Text>
            <Text style={[s.mSummaryDur, { color: t.text }]}>{PERIOD_DURATION[plan.split('_').slice(1).join('_')] ?? '30 días'} de acceso</Text>
          </View>

          {/* Form */}
          <View style={s.formGroup}>
            <Text style={s.label}>Nombre completo *</Text>
            <View style={s.inputRow}>
              <Feather name="user" size={15} color="#9ca3af" style={s.inputIcon} />
              <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Tu nombre" placeholderTextColor="#d1d5db" />
            </View>
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>Correo electrónico *</Text>
            <View style={[s.inputRow, !!email && s.inputDisabled]}>
              <Feather name="mail" size={15} color="#9ca3af" style={s.inputIcon} />
              <TextInput
                style={s.input} value={email} onChangeText={setEmail}
                placeholder="tu@email.com" placeholderTextColor="#d1d5db"
                keyboardType="email-address" autoCapitalize="none"
                editable={!userEmail}
              />
            </View>
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>Teléfono</Text>
            <View style={s.inputRow}>
              <Feather name="phone" size={15} color="#9ca3af" style={s.inputIcon} />
              <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="Número de teléfono" placeholderTextColor="#d1d5db" keyboardType="phone-pad" />
            </View>
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>Número de cédula *</Text>
            <View style={s.inputRow}>
              <Feather name="hash" size={15} color="#9ca3af" style={s.inputIcon} />
              <TextInput style={s.input} value={docId} onChangeText={setDocId} placeholder="Número de identificación" placeholderTextColor="#d1d5db" keyboardType="numeric" />
            </View>
          </View>

          {/* Info */}
          <View style={[s.mInfo, { backgroundColor: t.accent, borderColor: t.border }]}>
            <Feather name="info" size={13} color={t.badge} style={{ marginTop: 1 }} />
            <Text style={[s.mInfoText, { color: t.text }]}>
              Tu solicitud queda registrada y recibirás las instrucciones de pago en tu correo para activar el acceso.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={s.mFooter}>
          <TouchableOpacity style={s.btnCancel} onPress={onClose} activeOpacity={0.7}>
            <Text style={s.btnCancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btnConfirm, { backgroundColor: t.badge }, (!canSubmit || processing) && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || processing}
            activeOpacity={0.8}
          >
            {processing
              ? <ActivityIndicator size="small" color="#fff" />
              : <><MaterialCommunityIcons name="crown" size={15} color="#fff" /><Text style={s.btnConfirmText}>Confirmar</Text></>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Individual plan card ───────────────────────────────────────────────────────
interface PlanCardProps {
  instrument: typeof INSTRUMENTS[number];
  period: Period;
  activeSub: ReturnType<ReturnType<typeof useSubscription>['getSubscriptionForPlan']>;
  token: string;
  userEmail?: string;
  userName?: string;
  onRefresh: () => void;
  refreshing: boolean;
}

function PlanCard({ instrument, period, activeSub, token, userEmail, userName, onRefresh, refreshing }: PlanCardProps) {
  const t    = THEMES[instrument.theme];
  const plan = `${instrument.key}_${period}`;
  const price = PLAN_PRICES[plan] ?? 0;
  const [modal, setModal] = useState(false);

  const endDate = activeSub?.endDate ? fmtDate(activeSub.endDate) : null;

  if (activeSub) {
    return (
      <View style={[s.cardActive, { borderColor: t.badge }]}>
        <LinearGradient colors={t.grad} style={s.cardActiveBorder} />
        <View style={s.cardActiveInner}>
          <View style={[s.crownBadge, { backgroundColor: t.accent }]}>
            <MaterialCommunityIcons name="crown" size={18} color={t.badge} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.activeNameRow}>
              <Text style={s.activeName}>{instrument.emoji} {instrument.label}</Text>
              <View style={s.activePill}>
                <Text style={s.activePillText}>ACTIVO</Text>
              </View>
            </View>
            {endDate && <Text style={s.activeExpiry}>Vence: {endDate}</Text>}
            <Text style={s.activeFeature}>{instrument.feature}</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} disabled={refreshing} hitSlop={8}>
            <Feather name="refresh-cw" size={15} color="#9ca3af" style={refreshing ? { opacity: 0.4 } : undefined} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[s.planCard, { borderColor: t.border }]}>
        <LinearGradient colors={t.grad} style={s.planHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="crown" size={16} color="#fff" />
              <Text style={s.planHeaderTitle}>{instrument.emoji} {instrument.label}</Text>
            </View>
            <Text style={s.planHeaderDuration}>{PERIOD_DURATION[period]} de acceso</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.planPrice}>{fmt(price)}</Text>
            <Text style={s.planPeriodLabel}>{PERIOD_LABELS[period]}</Text>
          </View>
        </LinearGradient>
        <View style={s.planBody}>
          <View style={{ flex: 1, gap: 6 }}>
            {[instrument.feature, 'Acceso a todas las secciones', PERIOD_DURATION[period] + ' de acceso'].map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="check" size={13} color="#22c55e" />
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[s.subBtn, { backgroundColor: t.badge }]} onPress={() => setModal(true)} activeOpacity={0.8}>
            <MaterialCommunityIcons name="crown" size={14} color="#fff" />
            <Text style={s.subBtnText}>Suscribirse</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SubscribeModal
        visible={modal}
        plan={plan}
        price={price}
        title={`${instrument.emoji} ${instrument.label} — ${PERIOD_LABELS[period]}`}
        theme={instrument.theme}
        userEmail={userEmail}
        userName={userName}
        token={token}
        onClose={() => setModal(false)}
        onSuccess={onRefresh}
      />
    </>
  );
}

// ── Bundle card ───────────────────────────────────────────────────────────────
interface BundleCardProps {
  bundlePeriod: BundlePeriod;
  onChangePeriod: (p: BundlePeriod) => void;
  hasActiveBundleAccess: boolean;
  activeList: Subscription[];
  token: string;
  userEmail?: string;
  userName?: string;
  onRefresh: () => void;
  refreshing: boolean;
}

function BundleCard({ bundlePeriod, onChangePeriod, hasActiveBundleAccess, activeList, token, userEmail, userName, onRefresh, refreshing }: BundleCardProps) {
  const t     = THEMES['bundle'];
  const plan  = `bundle_${bundlePeriod}`;
  const price = PLAN_PRICES[plan] ?? 0;
  const [modal, setModal] = useState(false);

  const bundleEndDate = hasActiveBundleAccess
    ? INSTRUMENTS.reduce<string | null>((min, inst) => {
        const sub = activeList.filter(s => s.plan.startsWith(inst.key + '_'))
          .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())[0];
        if (!sub?.endDate) return min;
        return !min || sub.endDate < min ? sub.endDate : min;
      }, null)
    : null;

  const fmtBundleDate = bundleEndDate ? fmtDate(bundleEndDate) : null;

  if (hasActiveBundleAccess) {
    return (
      <>
        <View style={[s.bundleActive, { borderColor: t.badge }]}>
          <View style={s.bundleActiveTop}>
            <View style={[s.crownBadge, { backgroundColor: t.accent, width: 44, height: 44, borderRadius: 22 }]}>
              <MaterialCommunityIcons name="crown" size={22} color={t.badge} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.activeNameRow}>
                <Text style={s.activeName}>🎼 Bundle</Text>
                <View style={s.activePill}><Text style={s.activePillText}>ACTIVO</Text></View>
              </View>
              {fmtBundleDate && <Text style={s.activeExpiry}>Acceso hasta: {fmtBundleDate}</Text>}
            </View>
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} hitSlop={8}>
              <Feather name="refresh-cw" size={15} color="#9ca3af" style={refreshing ? { opacity: 0.4 } : undefined} />
            </TouchableOpacity>
          </View>
          {/* Instrument grid */}
          <View style={s.instrGrid}>
            {INSTRUMENTS.map(inst => (
              <View key={inst.key} style={[s.instrChip, { backgroundColor: t.accent }]}>
                <Text style={s.instrChipEmoji}>{inst.emoji}</Text>
                <Text style={[s.instrChipLabel, { color: t.text }]}>{inst.label}</Text>
                <Feather name="check" size={12} color="#22c55e" />
              </View>
            ))}
          </View>
          {/* Extend */}
          <View style={s.bundleExtendRow}>
            {BUNDLE_PERIODS.map(p => (
              <TouchableOpacity
                key={p}
                style={[s.periodChip, bundlePeriod === p && { backgroundColor: t.badge, borderColor: t.badge }]}
                onPress={() => onChangePeriod(p)}
                activeOpacity={0.7}
              >
                <Text style={[s.periodChipText, bundlePeriod === p && { color: '#fff' }]}>{PERIOD_LABELS[p]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[s.extendBtn]} onPress={() => setModal(true)} activeOpacity={0.8}>
            <LinearGradient colors={t.grad} style={s.extendBtnGrad}>
              <Feather name="credit-card" size={14} color="#fff" />
              <Text style={s.extendBtnText}>Extender — {fmt(price)}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <SubscribeModal
          visible={modal}
          plan={plan}
          price={price}
          title={`🎼 Bundle — ${PERIOD_LABELS[bundlePeriod]}`}
          theme="bundle"
          userEmail={userEmail}
          userName={userName}
          token={token}
          onClose={() => setModal(false)}
          onSuccess={onRefresh}
        />
      </>
    );
  }

  return (
    <>
      <View style={[s.planCard, { borderColor: t.border }]}>
        <LinearGradient colors={t.grad} style={s.planHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="crown" size={16} color="#fff" />
              <Text style={s.planHeaderTitle}>🎼 Bundle — Todos los instrumentos</Text>
            </View>
            <Text style={s.planHeaderDuration}>{PERIOD_DURATION[bundlePeriod]} · {INSTRUMENTS.map(i => i.emoji).join(' ')}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.planPrice}>{fmt(price)}</Text>
            <Text style={s.planPeriodLabel}>{PERIOD_LABELS[bundlePeriod]}</Text>
          </View>
        </LinearGradient>
        {/* Period selector inside card */}
        <View style={[s.planBody, { flexDirection: 'column', gap: 12 }]}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {BUNDLE_PERIODS.map(p => (
              <TouchableOpacity
                key={p}
                style={[s.periodChip, { flex: 1 }, bundlePeriod === p && { backgroundColor: t.badge, borderColor: t.badge }]}
                onPress={() => onChangePeriod(p)}
                activeOpacity={0.7}
              >
                <Text style={[s.periodChipText, bundlePeriod === p && { color: '#fff' }]}>{PERIOD_LABELS[p]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ gap: 6 }}>
            {INSTRUMENTS.map(inst => (
              <View key={inst.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="check" size={13} color="#22c55e" />
                <Text style={s.featureText}>{inst.emoji} {inst.feature}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[s.subBtn, { backgroundColor: t.badge, alignSelf: 'stretch' }]} onPress={() => setModal(true)} activeOpacity={0.8}>
            <MaterialCommunityIcons name="crown" size={14} color="#fff" />
            <Text style={s.subBtnText}>Suscribirse — {fmt(price)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SubscribeModal
        visible={modal}
        plan={plan}
        price={price}
        title={`🎼 Bundle — ${PERIOD_LABELS[bundlePeriod]}`}
        theme="bundle"
        userEmail={userEmail}
        userName={userName}
        token={token}
        onClose={() => setModal(false)}
        onSuccess={onRefresh}
      />
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SubscriptionScreen({ navigation }: any) {
  const { token, user } = useAuth();
  const {
    loading, refresh, getSubscriptionForPlan,
    hasActiveBundleAccess, activeList,
  } = useSubscription();

  const [period, setPeriod]             = useState<Period>('monthly');
  const [bundlePeriod, setBundlePeriod] = useState<BundlePeriod>('monthly');

  return (
    <ScreenLayout navigation={navigation} activeKey="Subscription">
      <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* Page header */}
        <View style={s.pageHeader}>
          <MaterialCommunityIcons name="crown" size={22} color="#7c3aed" />
          <Text style={s.pageTitle}>Membresías</Text>
        </View>

        {/* Bundle section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={s.sectionLabel}>🎼 BUNDLE — TODOS LOS INSTRUMENTOS</Text>
          {loading
            ? <View style={s.skeleton} />
            : <BundleCard
                bundlePeriod={bundlePeriod}
                onChangePeriod={setBundlePeriod}
                hasActiveBundleAccess={hasActiveBundleAccess}
                activeList={activeList}
                token={token ?? ''}
                userEmail={user?.email}
                userName={user?.name}
                onRefresh={refresh}
                refreshing={loading}
              />
          }
        </View>

        {/* Individual section */}
        <View>
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>POR INSTRUMENTO</Text>
            {/* Period selector */}
            <View style={s.periodSelector}>
              {PERIODS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[s.periodBtn, period === p && s.periodBtnActive]}
                  onPress={() => setPeriod(p)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.periodBtnText, period === p && s.periodBtnTextActive]}>
                    {PERIOD_LABELS[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading
            ? [0,1,2,3].map(i => <View key={i} style={[s.skeleton, { marginBottom: 12 }]} />)
            : INSTRUMENTS.map(inst => (
                <PlanCard
                  key={inst.key}
                  instrument={inst}
                  period={period}
                  activeSub={getSubscriptionForPlan(`${inst.key}_${period}`)}
                  token={token ?? ''}
                  userEmail={user?.email}
                  userName={user?.name}
                  onRefresh={refresh}
                  refreshing={loading}
                />
              ))
          }
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </ScreenLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:     { flex: 1, backgroundColor: '#faf9ff' },
  container:  { padding: 16 },

  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  pageTitle:  { fontSize: 22, fontWeight: '800', color: '#1f1535' },

  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 1.2, marginBottom: 10 },
  sectionRow:   { marginBottom: 10 },

  periodSelector:    { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 3, gap: 2, marginTop: 8 },
  periodBtn:         { flex: 1, paddingVertical: 5, alignItems: 'center', borderRadius: 8 },
  periodBtnActive:   { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  periodBtnText:     { fontSize: 10, fontWeight: '600', color: '#6b7280' },
  periodBtnTextActive: { color: '#6d28d9' },

  skeleton: { height: 100, backgroundColor: '#e9e4f5', borderRadius: 14, marginBottom: 12 },

  // Plan card
  planCard:   { borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 14, backgroundColor: '#fff' },
  planHeader: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  planHeaderTitle:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  planHeaderDuration: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  planPrice:       { color: '#fff', fontSize: 20, fontWeight: '900' },
  planPeriodLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  planBody:  { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 12, color: '#374151', flex: 1 },

  subBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  subBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Active card
  cardActive:      { borderWidth: 2, borderRadius: 14, marginBottom: 14, backgroundColor: '#fff', overflow: 'hidden' },
  cardActiveBorder:{ height: 3 },
  cardActiveInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  crownBadge:      { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  activeNameRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  activeName:      { fontSize: 14, fontWeight: '700', color: '#111827' },
  activePill:      { backgroundColor: '#dcfce7', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  activePillText:  { fontSize: 9, fontWeight: '700', color: '#15803d', letterSpacing: 0.5 },
  activeExpiry:    { fontSize: 11, color: '#6b7280', marginTop: 3 },
  activeFeature:   { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  // Bundle active
  bundleActive:    { borderWidth: 2, borderRadius: 14, marginBottom: 14, backgroundColor: '#fff', padding: 14 },
  bundleActiveTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  instrGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  instrChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, flex: 1, minWidth: '45%' },
  instrChipEmoji:  { fontSize: 16 },
  instrChipLabel:  { fontSize: 12, fontWeight: '600', flex: 1 },
  bundleExtendRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  extendBtn:       { borderRadius: 12, overflow: 'hidden' },
  extendBtnGrad:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  extendBtnText:   { color: '#fff', fontSize: 13, fontWeight: '700' },

  periodChip:      { flex: 1, paddingVertical: 7, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, alignItems: 'center' },
  periodChipText:  { fontSize: 11, fontWeight: '600', color: '#6b7280' },

  // Modal
  mHeader:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, gap: 12 },
  mHeaderTitle:   { color: '#fff', fontSize: 16, fontWeight: '800' },
  mHeaderSub:     { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  mBody:          { padding: 20, gap: 0 },
  mSummary:       { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20 },
  mSummaryTitle:  { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  mSummaryPrice:  { fontSize: 22, fontWeight: '900' },
  mSummaryDur:    { fontSize: 11, marginTop: 2, opacity: 0.7 },
  formGroup:      { marginBottom: 14 },
  label:          { fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  inputDisabled:  { backgroundColor: '#f9fafb' },
  inputIcon:      { marginRight: 10 },
  input:          { flex: 1, fontSize: 14, color: '#111827' },
  mInfo:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 4 },
  mInfoText:      { flex: 1, fontSize: 12 },
  mFooter:        { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: '#fff' },
  btnCancel:      { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, alignItems: 'center' },
  btnCancelText:  { fontSize: 14, fontWeight: '600', color: '#374151' },
  btnConfirm:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  btnConfirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnDisabled:    { opacity: 0.5 },
});
