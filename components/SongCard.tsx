import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import type { Song } from '../types';

function getYoutubeThumbnail(link?: string): string | null {
  if (!link) return null;
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
  } catch { /* ignore */ }
  return null;
}

function isNewSong(createdAt: string) {
  return Date.now() - parseInt(createdAt, 10) < 15 * 24 * 60 * 60 * 1000;
}

interface Props {
  song: Song;
  isPurchased?: boolean;
  isAdmin?: boolean;
  displayCurrency?: 'COP' | 'USD';
  isDeleting?: boolean;
  isTogglingVisibility?: boolean;
  inFolder?: boolean;
  onPractice: (song: Song) => void;
  onOpenLink: (song: Song) => void;
  onDelete?: (song: Song) => void;
  onToggleVisibility?: (song: Song) => void;
  onRemoveFromFolder?: (song: Song) => void;
}

export default function SongCard({
  song, isPurchased = false, isAdmin = false, displayCurrency = 'COP',
  isDeleting = false, isTogglingVisibility = false, inFolder = false,
  onPractice, onOpenLink, onDelete, onToggleVisibility, onRemoveFromFolder,
}: Props) {
  const thumbnail = getYoutubeThumbnail(song.link);
  const isNew     = isNewSong(song.createdAt);
  const hidden    = isAdmin && song.isVisible !== true;

  const gradientColors: [string, string] = hidden
    ? ['#9ca3af', '#6b7280']
    : isNew
      ? ['#f97316', '#fbbf24']
      : ['#a855f7', '#ec4899'];

  const price = displayCurrency === 'USD'
    ? `$${(song.priceUSD ?? song.price / 4000).toFixed(2)} USD`
    : `$${song.price.toLocaleString('es-CO')} COP`;

  const date = new Date(parseInt(song.createdAt, 10))
    .toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <View style={[s.card, isNew && s.cardNew]}>
      {/* Header */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.header}
      >
        <Feather name="music" size={20} color="#fff" />

        {isNew && (
          <View style={s.newBadge}>
            <Text style={s.newBadgeText}>✦ Nuevo</Text>
          </View>
        )}

        {!isAdmin && isPurchased && (
          <View style={s.ownedBadge}>
            <Feather name="heart" size={11} color="#fff" />
            <Text style={s.ownedBadgeText}>Mío</Text>
          </View>
        )}

        {/* Admin buttons — top right area */}
        <View style={s.adminRow}>
          {isAdmin && onRemoveFromFolder && inFolder && (
            <TouchableOpacity style={[s.adminBtn, s.btnIndigo]} onPress={() => onRemoveFromFolder(song)} hitSlop={4}>
              <Feather name="folder-minus" size={13} color="#fff" />
            </TouchableOpacity>
          )}
          {isAdmin && onToggleVisibility && (
            <TouchableOpacity
              style={[s.adminBtn, song.isVisible === true ? s.btnGreen : s.btnAmber]}
              onPress={() => onToggleVisibility(song)}
              disabled={isTogglingVisibility}
              hitSlop={4}
            >
              {isTogglingVisibility
                ? <ActivityIndicator size="small" color="#fff" />
                : <Feather name={song.isVisible === true ? 'eye' : 'eye-off'} size={13} color="#fff" />
              }
            </TouchableOpacity>
          )}
          {isAdmin && onDelete && (
            <TouchableOpacity
              style={[s.adminBtn, s.btnRed]}
              onPress={() => onDelete(song)}
              disabled={isDeleting}
              hitSlop={4}
            >
              {isDeleting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Feather name="trash-2" size={13} color="#fff" />
              }
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Body */}
      <View style={s.body}>
        <View style={s.row}>
          <View style={s.info}>
            <Text style={s.songName} numberOfLines={2}>{song.name}</Text>
            <Text style={s.artist} numberOfLines={1}>{song.artist}</Text>
          </View>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={s.thumb} resizeMode="cover" />
          ) : (
            <View style={[s.thumb, s.thumbPlaceholder]}>
              <Feather name="music" size={22} color="#6d28d9" />
            </View>
          )}
        </View>

        {/* Price + date */}
        <View style={[s.meta, isPurchased && s.metaRight]}>
          {!isPurchased && <Text style={s.price}>{price}</Text>}
          <View style={s.dateRow}>
            <Feather name="calendar" size={12} color="#9ca3af" />
            <Text style={s.date}>{date}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          {isPurchased ? (
            <TouchableOpacity style={s.btnPractice} onPress={() => onPractice(song)} activeOpacity={0.8}>
              <Feather name="play" size={15} color="#fff" />
              <Text style={s.btnPracticeText}>Practicar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.btnCart} onPress={() => {}} activeOpacity={0.8}>
              <Feather name="shopping-cart" size={15} color="#fff" />
              <Text style={s.btnCartText}>Agregar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.btnLink} onPress={() => onOpenLink(song)} activeOpacity={0.8}>
            <Feather name="external-link" size={15} color="#8b7ba8" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  cardNew: { borderWidth: 2, borderColor: '#f97316' },
  header:  { paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  newBadge: {
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  newBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  ownedBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#ef4444', borderRadius: 20,
    paddingHorizontal: 7, paddingVertical: 3,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  ownedBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  adminRow: { position: 'absolute', top: 7, right: 7, flexDirection: 'row', gap: 5 },
  adminBtn: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  btnRed:   { backgroundColor: '#dc2626' },
  btnGreen: { backgroundColor: '#16a34a' },
  btnAmber: { backgroundColor: '#d97706' },
  btnIndigo:{ backgroundColor: '#4f46e5' },
  body:  { padding: 14 },
  row:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, marginTop: 4 },
  info:  { flex: 1 },
  songName: { fontSize: 14, fontWeight: '700', color: '#1f2937', marginBottom: 3, lineHeight: 19 },
  artist:   { fontSize: 12, color: '#6b7280' },
  thumb: { width: 72, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0 },
  thumbPlaceholder: { backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center' },
  meta:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  metaRight: { justifyContent: 'flex-end' },
  price:   { fontSize: 13, fontWeight: '700', color: '#059669' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date:    { fontSize: 11, color: '#9ca3af' },
  actions: { flexDirection: 'row', gap: 8 },
  btnPractice: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#7c3aed', paddingVertical: 9, borderRadius: 8,
  },
  btnPracticeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  btnCart: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#4b5563', paddingVertical: 9, borderRadius: 8,
  },
  btnCartText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  btnLink: {
    width: 38, height: 38, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
  },
});
