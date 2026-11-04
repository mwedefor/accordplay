import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { useUserProfile } from '../context/UserProfileContext';
import ScreenLayout from '../components/ScreenLayout';
import { NAV_RAIL_W } from '../components/NavRail';
import type { Song } from '../types';

// ── YouTube thumbnail helper ──────────────────────────────────────────────────
function getYoutubeThumbnail(link: string): string | null {
  try {
    const url = new URL(link);
    if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
      const v = url.searchParams.get('v');
      if (v) return `https://img.youtube.com/vi/${v}/mqdefault.jpg`;
      const m = url.pathname.match(/\/(?:shorts|embed|v)\/([a-zA-Z0-9_-]+)/);
      if (m) return `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`;
    }
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('?')[0];
      if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
    }
  } catch {}
  return null;
}

// ── Quick actions ─────────────────────────────────────────────────────────────
const ALL_QUICK_ACTIONS = [
  { key: 'songs',     label: 'Explorar biblioteca', icon: 'music',        color: '#3b82f6', screen: null,        instrument: null },
  { key: 'mymusic',   label: 'Mis canciones',       icon: 'heart',        color: '#ef4444', screen: null,        instrument: null },
  { key: 'accordion', label: 'Tocar acordeón',      icon: 'sliders',      color: '#f97316', screen: 'Accordion', instrument: 'accordion' },
  { key: 'piano',     label: 'Practicar piano',     icon: 'play',         color: '#8b5cf6', screen: 'Piano',      instrument: 'piano' },
  { key: 'recorder',  label: 'Tocar flauta',        icon: 'mic',          color: '#0d9488', screen: null,        instrument: 'recorder' },
  { key: 'violin',    label: 'Tocar violín',        icon: 'activity',     color: '#b45309', screen: null,        instrument: 'violin' },
  { key: 'guitar',    label: 'Tocar guitarra',      icon: 'headphones',   color: '#ca8a04', screen: null,        instrument: 'guitar' },
  { key: 'tasks',     label: 'Mis tareas',          icon: 'check-square', color: '#22c55e', screen: null,        instrument: null },
];

// ── Instrument emoji map ──────────────────────────────────────────────────────
function instrumentEmoji(inst: string): string {
  const i = inst?.toLowerCase() ?? '';
  if (i === 'acordeon' || i === 'acordeón' || i === 'accordion') return '🪗';
  if (i === 'violin'   || i === 'violín')                          return '🎻';
  if (i === 'piano')                                               return '🎹';
  if (i === 'guitar'   || i === 'guitarra')                        return '🎸';
  if (i === 'flauta'   || i === 'recorder')                        return '🪈';
  return '🎵';
}

// ── Song thumbnail ────────────────────────────────────────────────────────────
function SongThumbnail({ song }: { song: Song }) {
  const thumb = getYoutubeThumbnail(song.link);
  if (thumb) {
    return (
      <Image
        source={{ uri: thumb }}
        style={styles.songThumb}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[styles.songThumb, styles.songThumbFallback]}>
      <Text style={{ fontSize: 22 }}>{instrumentEmoji(song.instrument)}</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const BANNER_INSTRUMENTS = [
  { label: 'Acordeón', emoji: '🪗', screen: 'Accordion' },
  { label: 'Piano',    emoji: '🎹', screen: 'Piano' },
  { label: 'Flauta',   emoji: '🪈', screen: null },
  { label: 'Violín',   emoji: '🎻', screen: null },
  { label: 'Guitarra', emoji: '🎸', screen: null },
];

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { loading, stats, pendingTodos, recentSongs } = useDashboard();
  const { instruments, profileLoading } = useUserProfile();

  // Show all instruments while loading or if user has no purchased songs yet (new user);
  // otherwise filter to only the instruments the user has purchased.
  const QUICK_ACTIONS = !profileLoading && instruments.length > 0
    ? ALL_QUICK_ACTIONS.filter(a => !a.instrument || instruments.includes(a.instrument as any))
    : ALL_QUICK_ACTIONS;
  const { width: screenWidth } = useWindowDimensions();

  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Músico';

  const BODY_PAD   = 14;
  const BANNER_PAD = 16;
  const CTA_PAD    = 12;
  const BTN_GAP    = 8;

  const contentW = screenWidth - NAV_RAIL_W;

  // Banner instrument buttons: fill the ctaBox inner width
  const n       = BANNER_INSTRUMENTS.length;
  const btnSize = Math.floor(
    (contentW - BODY_PAD * 2 - BANNER_PAD * 2 - CTA_PAD * 2 - BTN_GAP * (n - 1)) / n
  );

  // Quick action buttons: 4 columns × 2 rows grid (matches web grid-cols-4)
  const qaSize = Math.floor((contentW - BODY_PAD * 2 - BTN_GAP * 3) / 4);

  return (
    <ScreenLayout navigation={navigation} activeKey="Home" contentStyle={styles.root}>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Welcome banner ── */}
        <LinearGradient
          colors={['#2563eb', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <Text style={styles.bannerGreeting}>¡Hola, {firstName}! 👋</Text>
          <Text style={styles.bannerSub}>Bienvenido a tu panel de música. ¿Listo para practicar hoy?</Text>

          {/* Sample CTA box */}
          <View style={styles.ctaBox}>
            <View style={styles.ctaTop}>
              <View style={styles.ctaIconWrap}>
                <Text style={{ fontSize: 20 }}>🎵</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>¡Prueba una canción de muestra gratis!</Text>
                <Text style={styles.ctaSub}>Sin costo — elige tu instrumento y empieza ahora:</Text>
              </View>
            </View>

            <View style={styles.bannerBtns}>
              {BANNER_INSTRUMENTS.map(b => (
                <TouchableOpacity
                  key={b.label}
                  style={[
                    styles.bannerBtn,
                    { width: btnSize, height: btnSize, borderRadius: btnSize * 0.22 },
                    !b.screen && { opacity: 0.55 },
                  ]}
                  onPress={() => b.screen && navigation.navigate(b.screen)}
                  disabled={!b.screen}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.bannerBtnEmoji, { fontSize: btnSize * 0.48 }]}>
                    {b.emoji}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* ── Stats ── */}
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#7c3aed" />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {[
              { label: 'Canciones',         value: stats.songs,                  icon: 'heart',            iconColor: '#ef4444', bg: '#fef2f2' },
              { label: 'Instrumentos',      value: stats.instruments,            icon: 'musical-notes',    iconColor: '#f97316', bg: '#fff7ed' },
              { label: 'Total invertido',   value: `$${stats.spent.toFixed(0)}`, icon: 'trending-up',      iconColor: '#22c55e', bg: '#f0fdf4' },
              { label: 'Tareas pendientes', value: stats.tasks,                  icon: 'checkmark-circle', iconColor: '#3b82f6', bg: '#eff6ff' },
            ].map(s => (
              <View key={s.label} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon as any} size={18} color={s.iconColor} />
                </View>
                <View style={styles.statText}>
                  <Text style={styles.statValue} numberOfLines={1}>{s.value}</Text>
                  <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Quick actions ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="book-outline" size={18} color="#3b82f6" />
          <Text style={styles.sectionHeaderText}>Acciones rápidas</Text>
        </View>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map(a => (
            <TouchableOpacity
              key={a.key}
              style={[
                styles.quickBtn,
                { backgroundColor: a.color, width: qaSize, height: qaSize, borderRadius: qaSize * 0.22 },
                !a.screen && { opacity: 0.5 },
              ]}
              onPress={() => a.screen && navigation.navigate(a.screen)}
              disabled={!a.screen}
              activeOpacity={0.8}
            >
              <Feather name={a.icon as any} size={Math.round(qaSize * 0.38)} color="#fff" />
              <Text style={[styles.quickLabel, { fontSize: Math.round(qaSize * 0.16) }]}>
                {a.label.replace(' ', '\n')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent songs ── */}
        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <Ionicons name="time-outline" size={18} color="#8b5cf6" />
          <Text style={styles.sectionHeaderText}>Recién Agregadas</Text>
        </View>
        <View style={styles.card}>
          {loading ? (
            <View style={styles.cardLoading}>
              <ActivityIndicator color="#7c3aed" />
            </View>
          ) : recentSongs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="musical-notes-outline" size={32} color="#cbd5e1" />
              <Text style={styles.emptyText}>No hay canciones disponibles</Text>
            </View>
          ) : (
            recentSongs.map((song, i) => (
              <View
                key={song.songId}
                style={[styles.songRow, i < recentSongs.length - 1 && styles.songRowBorder]}
              >
                <SongThumbnail song={song} />
                <View style={styles.songInfo}>
                  <Text style={styles.songName} numberOfLines={1}>{song.name}</Text>
                  <Text style={styles.songMeta} numberOfLines={1}>
                    {song.artist}  ·  {instrumentEmoji(song.instrument)} {song.instrument}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.songPlayBtn}
                  onPress={() => {
                    const inst = song.instrument?.toLowerCase() ?? '';
                    if (inst === 'acordeon' || inst === 'acordeón' || inst === 'accordion') {
                      navigation.navigate('Accordion');
                    } else if (inst === 'piano') {
                      navigation.navigate('Piano');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="play" size={14} color="#7c3aed" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* ── Pending tasks ── */}
        {pendingTodos.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Ionicons name="checkmark-done-outline" size={18} color="#22c55e" />
              <Text style={styles.sectionHeaderText}>Tareas</Text>
            </View>
            <View style={styles.card}>
              {pendingTodos.map((todo, i) => (
                <View
                  key={todo.todoId}
                  style={[styles.taskRow, i < pendingTodos.length - 1 && styles.taskRowBorder]}
                >
                  <View style={styles.taskDot} />
                  <Text style={styles.taskTitle} numberOfLines={2}>{todo.title}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

    </ScreenLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f1f5f9' },

  scroll: { flex: 1 },
  body:   { padding: 14 },

  // Banner
  banner:        { borderRadius: 16, padding: 16, marginBottom: 14 },
  bannerGreeting:{ fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  bannerSub:     { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },

  // CTA box inside banner
  ctaBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12, padding: 12, gap: 12,
  },
  ctaTop:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaIconWrap:{
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#facc15',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  ctaTitle:   { color: '#fff', fontWeight: '700', fontSize: 13, lineHeight: 18 },
  ctaSub:     { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2, lineHeight: 16 },

  bannerBtns: { flexDirection: 'row', gap: 8 },
  bannerBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerBtnEmoji: { fontSize: 28 },

  // Loading
  loadingRow: { justifyContent: 'center', alignItems: 'center', height: 80 },

  // Stats — 2×2 grid, horizontal card layout matching web (icon left, value+label right)
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  statCard: {
    width: '47.5%', backgroundColor: '#fff', borderRadius: 12,
    padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statIcon:  { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  statText:  { flex: 1, minWidth: 0 },
  statValue: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 10, color: '#94a3b8', marginTop: 1 },

  // Section header (icon + title, matches web)
  sectionHeader:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionHeaderText: { fontSize: 15, fontWeight: '600', color: '#111827' },

  // Quick actions — 4×2 grid (matches web grid-cols-4)
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn:  { alignItems: 'center', justifyContent: 'center', gap: 4 },
  quickLabel: { color: '#fff', fontWeight: '700', textAlign: 'center' },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardLoading: { padding: 24, alignItems: 'center' },

  // Empty state
  emptyBox:  { padding: 24, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, color: '#94a3b8' },

  // Song row
  songRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  songRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  songThumb: {
    width: 46, height: 46, borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  songThumbFallback: { justifyContent: 'center', alignItems: 'center' },
  songInfo:  { flex: 1 },
  songName:  { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  songMeta:  { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  songPlayBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f3f0ff',
    justifyContent: 'center', alignItems: 'center',
  },

  // Task row
  taskRow:       { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  taskRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  taskDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginTop: 4, flexShrink: 0 },
  taskTitle:     { flex: 1, fontSize: 13, color: '#334155', lineHeight: 20 },
});
