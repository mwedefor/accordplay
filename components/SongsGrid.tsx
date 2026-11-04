import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Alert, Linking, ScrollView, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import SongCard from './SongCard';
import FolderCard from './FolderCard';
import MembershipCard from './MembershipCard';
import { usePurchasedSongs } from '../hooks/usePurchasedSongs';
import { useSubscription } from '../hooks/useSubscription';
import { useFolders } from '../hooks/useFolders';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import type { Song } from '../types';

type SortKey      = 'date' | 'name' | 'artist' | 'price';
type FilterKey    = 'all' | 'recent' | 'by-price' | 'by-artist';
type Currency     = 'COP' | 'USD';
type InstrumentTab = 'accordion' | 'piano' | 'flauta' | 'violin' | 'guitarra';

function isAccordionSong(song: Song) {
  const i = (song.instrument ?? '').toLowerCase();
  return i.includes('acordeon') || i.includes('acordeón') || i.includes('accordion');
}

function isPianoSong(song: Song) {
  return (song.instrument ?? '').toLowerCase() === 'piano';
}

function isRecorderSong(song: Song) {
  const i = (song.instrument ?? '').toLowerCase();
  return i.includes('recorder') || i.includes('flauta');
}

interface Props {
  songs: Song[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  navigation: any;
  initialTab?: InstrumentTab;
}

export default function SongsGrid({ songs, loading, error, onRefresh, navigation, initialTab }: Props) {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { purchasedSongs }                    = usePurchasedSongs();
  const { hasActiveAccordionAccess, hasActivePianoAccess, hasActiveRecorderAccess, subscriptions: allSubs, activeList: activeSubs, loading: subLoading, refresh: refreshSubs } = useSubscription();
  const { folders, createFolder, moveSongToFolder } = useFolders(songs, token ?? null);

  const purchasedIds = useMemo(() => new Set(purchasedSongs.map(s => s.songId)), [purchasedSongs]);

  // --- local state ---
  const [searchTerm, setSearchTerm]   = useState('');
  const [filter, setFilter]           = useState<FilterKey>('all');
  const [sortBy, setSortBy]           = useState<SortKey>('date');
  const [currency, setCurrency]       = useState<Currency>('COP');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [deletedIds, setDeletedIds]   = useState<Set<string>>(new Set());
  const [togglingVisId, setTogglingVisId]   = useState<string | null>(null);
  const [visOverrides, setVisOverrides]     = useState<Map<string, boolean>>(new Map());
  const [folderOverrides, setFolderOverrides] = useState<Map<string, string | null>>(new Map());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [instrumentTab, setInstrumentTab]   = useState<InstrumentTab>(initialTab ?? 'accordion');
  const [renameFolder, setRenameFolder]     = useState<Song | null>(null);
  const [renameName, setRenameName]         = useState('');

  // apply optimistic overrides
  const mergedSongs = useMemo(() =>
    songs.map(s => {
      let r = s;
      if (visOverrides.has(s.songId))    r = { ...r, isVisible: visOverrides.get(s.songId) };
      if (folderOverrides.has(s.songId)) r = { ...r, folderId: folderOverrides.get(s.songId) ?? undefined };
      return r;
    }), [songs, visOverrides, folderOverrides]);

  const accordionSongs = useMemo(
    () => mergedSongs.filter(s => s.type !== 'folder' && isAccordionSong(s)),
    [mergedSongs],
  );

  const pianoSongs = useMemo(
    () => mergedSongs.filter(s => s.type !== 'folder' && isPianoSong(s) && !deletedIds.has(s.songId) && (isAdmin || s.isVisible === true)),
    [mergedSongs, deletedIds, isAdmin],
  );

  const recorderSongs = useMemo(
    () => mergedSongs.filter(s => s.type !== 'folder' && isRecorderSong(s) && !deletedIds.has(s.songId) && (isAdmin || s.isVisible === true)),
    [mergedSongs, deletedIds, isAdmin],
  );

  // filtered + sorted songs
  const filteredSongs = useMemo(() => {
    if (instrumentTab !== 'accordion') return [];
    const base = accordionSongs;
    let list = base.filter(song => {
      if (deletedIds.has(song.songId)) return false;
      if (!isAdmin && song.isVisible !== true) return false;
      if (activeFolderId !== null) return song.folderId === activeFolderId;
      if (song.folderId) return false;
      const q = searchTerm.toLowerCase();
      return !q || song.name.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q) || song.instrument.toLowerCase().includes(q);
    });

    if (filter === 'recent') {
      const cutoff = Date.now() - 15 * 24 * 60 * 60 * 1000;
      list = list.filter(s => parseInt(s.createdAt, 10) > cutoff);
    } else if (filter === 'by-price') {
      list = list.filter(s => s.price < 8000);
    }

    return list.sort((a, b) => {
      switch (sortBy) {
        case 'name':   return a.name.localeCompare(b.name);
        case 'artist': return a.artist.localeCompare(b.artist);
        case 'price':  return a.price - b.price;
        default:       return parseInt(b.createdAt, 10) - parseInt(a.createdAt, 10);
      }
    });
  }, [accordionSongs, searchTerm, filter, sortBy, deletedIds, isAdmin, activeFolderId, instrumentTab]);

  const filteredPianoSongs = useMemo(() => {
    const q = searchTerm.toLowerCase();
    let list = pianoSongs.filter(s => {
      if (activeFolderId !== null) return s.folderId === activeFolderId;
      if (s.folderId) return false;
      return !q || s.name.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
    });
    if (filter === 'recent') {
      const cutoff = Date.now() - 15 * 24 * 60 * 60 * 1000;
      list = list.filter(s => parseInt(s.createdAt, 10) > cutoff);
    } else if (filter === 'by-price') {
      list = list.filter(s => s.price < 8000);
    }
    return list.sort((a, b) => {
      switch (sortBy) {
        case 'name':   return a.name.localeCompare(b.name);
        case 'artist': return a.artist.localeCompare(b.artist);
        case 'price':  return a.price - b.price;
        default:       return parseInt(b.createdAt, 10) - parseInt(a.createdAt, 10);
      }
    });
  }, [pianoSongs, searchTerm, filter, sortBy, activeFolderId]);

  const filteredRecorderSongs = useMemo(() => {
    const q = searchTerm.toLowerCase();
    let list = recorderSongs.filter(s => {
      if (activeFolderId !== null) return s.folderId === activeFolderId;
      if (s.folderId) return false;
      return !q || s.name.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
    });
    if (filter === 'recent') {
      const cutoff = Date.now() - 15 * 24 * 60 * 60 * 1000;
      list = list.filter(s => parseInt(s.createdAt, 10) > cutoff);
    } else if (filter === 'by-price') {
      list = list.filter(s => s.price < 8000);
    }
    return list.sort((a, b) => {
      switch (sortBy) {
        case 'name':   return a.name.localeCompare(b.name);
        case 'artist': return a.artist.localeCompare(b.artist);
        case 'price':  return a.price - b.price;
        default:       return parseInt(b.createdAt, 10) - parseInt(a.createdAt, 10);
      }
    });
  }, [recorderSongs, searchTerm, filter, sortBy, activeFolderId]);

  const visibleFolders = useMemo(() => {
    if (instrumentTab !== 'accordion') return [];
    return activeFolderId !== null ? [] : folders.filter(f => isAccordionSong(f));
  }, [folders, activeFolderId, instrumentTab]);

  const visiblePianoFolders = useMemo(() => {
    if (instrumentTab !== 'piano') return [];
    return activeFolderId !== null ? [] : folders.filter(f => isPianoSong(f));
  }, [folders, activeFolderId, instrumentTab]);

  const visibleRecorderFolders = useMemo(() => {
    if (instrumentTab !== 'flauta') return [];
    return activeFolderId !== null ? [] : folders.filter(f => isRecorderSong(f));
  }, [folders, activeFolderId, instrumentTab]);

  const songCountInFolder = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const folder of folders) {
      counts[folder.songId] = mergedSongs.filter(s =>
        s.folderId === folder.songId && s.type !== 'folder' && !deletedIds.has(s.songId) &&
        (isAdmin || s.isVisible === true)
      ).length;
    }
    return counts;
  }, [folders, mergedSongs, isAdmin, deletedIds]);

  const activeFolder = useMemo(
    () => activeFolderId ? songs.find(s => s.songId === activeFolderId) : null,
    [activeFolderId, songs]);

  const isPurchasedSong = (song: Song) =>
    isAdmin ||
    purchasedIds.has(song.songId) ||
    (hasActiveAccordionAccess && isAccordionSong(song)) ||
    (hasActivePianoAccess && isPianoSong(song)) ||
    (hasActiveRecorderAccess && isRecorderSong(song));

  // --- admin actions ---
  const handleDelete = useCallback(async (song: Song) => {
    if (!token) return;
    Alert.alert(
      'Eliminar canción',
      `¿Eliminar "${song.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            setDeletingId(song.songId);
            try {
              await apiClient.deleteSong(token, song.songId);
              setDeletedIds(prev => new Set([...prev, song.songId]));
              onRefresh();
            } catch { Alert.alert('Error', 'No se pudo eliminar la canción'); }
            finally { setDeletingId(null); }
          },
        },
      ],
    );
  }, [token, onRefresh]);

  const handleToggleVisibility = useCallback(async (song: Song) => {
    if (!token) return;
    const newVal = song.isVisible !== true;
    setVisOverrides(prev => new Map(prev).set(song.songId, newVal));
    setTogglingVisId(song.songId);
    try {
      await apiClient.updateSong(token, song.songId, { isVisible: newVal });
    } catch {
      setVisOverrides(prev => { const n = new Map(prev); n.delete(song.songId); return n; });
    } finally { setTogglingVisId(null); }
  }, [token]);

  const handleRemoveFromFolder = useCallback(async (song: Song) => {
    setFolderOverrides(prev => new Map(prev).set(song.songId, null));
    try { await moveSongToFolder(song.songId, null); }
    catch { setFolderOverrides(prev => { const n = new Map(prev); n.delete(song.songId); return n; }); }
  }, [moveSongToFolder]);

  const handleCreateFolder = useCallback(async () => {
    if (!token) return;
    Alert.prompt?.(
      'Nueva carpeta',
      'Nombre de la carpeta:',
      async (name: string) => {
        if (!name?.trim()) return;
        setCreatingFolder(true);
        try {
          await createFolder(name.trim(), 'Acordeon');
          onRefresh();
        } catch { Alert.alert('Error', 'No se pudo crear la carpeta'); }
        finally { setCreatingFolder(false); }
      },
    );
  }, [token, createFolder, onRefresh]);

  const handleCreatePianoFolder = useCallback(async () => {
    if (!token) return;
    Alert.prompt?.(
      'Nueva carpeta',
      'Nombre de la carpeta:',
      async (name: string) => {
        if (!name?.trim()) return;
        setCreatingFolder(true);
        try {
          await createFolder(name.trim(), 'Piano');
          onRefresh();
        } catch { Alert.alert('Error', 'No se pudo crear la carpeta'); }
        finally { setCreatingFolder(false); }
      },
    );
  }, [token, createFolder, onRefresh]);

  const handleCreateRecorderFolder = useCallback(async () => {
    if (!token) return;
    Alert.prompt?.(
      'Nueva carpeta',
      'Nombre de la carpeta:',
      async (name: string) => {
        if (!name?.trim()) return;
        setCreatingFolder(true);
        try {
          await createFolder(name.trim(), 'Flauta Dulce');
          onRefresh();
        } catch { Alert.alert('Error', 'No se pudo crear la carpeta'); }
        finally { setCreatingFolder(false); }
      },
    );
  }, [token, createFolder, onRefresh]);

  const handleDeleteFolder = useCallback(async (folder: Song) => {
    if (!token) return;
    Alert.alert(
      'Eliminar carpeta',
      `¿Eliminar "${folder.name}"? Las canciones quedarán sin carpeta.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deleteSong(token, folder.songId);
              setDeletedIds(prev => new Set([...prev, folder.songId]));
              if (activeFolderId === folder.songId) setActiveFolderId(null);
              onRefresh();
            } catch { Alert.alert('Error', 'No se pudo eliminar la carpeta'); }
          },
        },
      ],
    );
  }, [token, activeFolderId, onRefresh]);

  const handleRenameFolder = useCallback((folder: Song) => {
    setRenameName(folder.name);
    setRenameFolder(folder);
  }, []);

  const submitRename = useCallback(async () => {
    if (!token || !renameFolder) return;
    const name = renameName.trim();
    if (!name || name === renameFolder.name) { setRenameFolder(null); return; }
    try {
      await apiClient.updateSong(token, renameFolder.songId, { name });
      onRefresh();
    } catch { Alert.alert('Error', 'No se pudo renombrar'); }
    finally { setRenameFolder(null); }
  }, [token, renameFolder, renameName, onRefresh]);

  // --- membership card logic ---
  // busca primero en activeList, cae a allSubs para admin que puede no pasar el filtro en mobile
  const accordionSub = activeSubs.find(s => s.plan?.startsWith('accordion_'))
    ?? allSubs.find(s => s.plan?.startsWith('accordion_'));
  const showMembership = !subLoading && (hasActiveAccordionAccess || isAdmin);

  const pianoSub = activeSubs.find(s => s.plan?.startsWith('piano_'))
    ?? allSubs.find(s => s.plan?.startsWith('piano_'));
  const showPianoMembership = !subLoading && (hasActivePianoAccess || isAdmin);

  const recorderSub = activeSubs.find(s => s.plan?.startsWith('recorder_'))
    ?? allSubs.find(s => s.plan?.startsWith('recorder_'));
  const showRecorderMembership = !subLoading && (hasActiveRecorderAccess || isAdmin);

  // --- filter / sort labels ---
  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all',       label: 'Todas las canciones' },
    { key: 'recent',    label: 'Recientes' },
    { key: 'by-price',  label: 'Menos de $2' },
    { key: 'by-artist', label: 'Por artista' },
  ];
  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'date',   label: 'Más nuevas primero' },
    { key: 'name',   label: 'Nombre A-Z' },
    { key: 'artist', label: 'Artista A-Z' },
    { key: 'price',  label: 'Precio menor a mayor' },
  ];

  const INSTRUMENT_TABS: { key: InstrumentTab; label: string }[] = [
    { key: 'accordion', label: 'Acordeón' },
    { key: 'piano',     label: 'Piano' },
    { key: 'flauta',    label: 'Flauta' },
    { key: 'violin',    label: 'Violín' },
    { key: 'guitarra',  label: 'Guitarra' },
  ];

  const filterLabel = FILTERS.find(f => f.key === filter)?.label ?? 'Todas las canciones';
  const sortLabel   = SORTS.find(s => s.key === sortBy)?.label ?? 'Más nuevas primero';

  const showFilterPicker = useCallback(() => {
    Alert.alert(
      'Filtrar por',
      undefined,
      [
        ...FILTERS.map(({ key, label }) => ({
          text: filter === key ? `✓ ${label}` : label,
          onPress: () => setFilter(key),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ],
    );
  }, [filter]);

  const showSortPicker = useCallback(() => {
    Alert.alert(
      'Ordenar por',
      undefined,
      [
        ...SORTS.map(({ key, label }) => ({
          text: sortBy === key ? `✓ ${label}` : label,
          onPress: () => setSortBy(key),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ],
    );
  }, [sortBy]);

  const isEmpty = !loading && !error && visibleFolders.length === 0 && filteredSongs.length === 0 && instrumentTab === 'accordion';
  const isPianoEmpty = !loading && !error && filteredPianoSongs.length === 0 && visiblePianoFolders.length === 0 && instrumentTab === 'piano';
  const isRecorderEmpty = !loading && !error && filteredRecorderSongs.length === 0 && visibleRecorderFolders.length === 0 && instrumentTab === 'flauta';

  return (
    <>
    {/* Rename folder modal */}
    <Modal visible={!!renameFolder} transparent animationType="fade" onRequestClose={() => setRenameFolder(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
        <View style={s.modalBox}>
          <Text style={s.modalTitle}>Renombrar carpeta</Text>
          <TextInput
            style={s.modalInput}
            value={renameName}
            onChangeText={setRenameName}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={submitRename}
          />
          <View style={s.modalActions}>
            <TouchableOpacity onPress={() => setRenameFolder(null)} style={s.modalCancel}>
              <Text style={s.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submitRename} style={s.modalConfirm}>
              <Text style={s.modalConfirmText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    <FlatList
      data={instrumentTab === 'piano' ? filteredPianoSongs : instrumentTab === 'flauta' ? filteredRecorderSongs : filteredSongs}
      keyExtractor={item => item.songId}
      showsVerticalScrollIndicator={false}
      onRefresh={onRefresh}
      refreshing={loading}
      contentContainerStyle={s.list}
      ListHeaderComponent={
        <View>
          {/* Title / breadcrumb */}
          {activeFolderId ? (
            <View style={s.breadcrumb}>
              <TouchableOpacity style={s.backBtn} onPress={() => { setActiveFolderId(null); onRefresh(); }} activeOpacity={0.7}>
                <Feather name="arrow-left" size={16} color="#4f46e5" />
                <Text style={s.backText}>Biblioteca</Text>
              </TouchableOpacity>
              <Text style={s.breadSep}>/</Text>
              <Text style={s.breadFolder}>{activeFolder?.name}</Text>
            </View>
          ) : (
            <View style={s.titleRow}>
              <View style={s.titleBlock}>
                <Text style={s.title}>Biblioteca Musical</Text>
                <Text style={s.subtitle}>
                  {instrumentTab === 'piano' ? 'Explora el catálogo de piano'
                    : instrumentTab === 'flauta' ? 'Explora el catálogo de flauta dulce'
                    : 'Explora el catálogo de acordeón'}
                </Text>
              </View>
              <View style={s.titleActions}>
                {isAdmin && instrumentTab === 'accordion' && (
                  <TouchableOpacity style={s.newFolderBtn} onPress={handleCreateFolder} disabled={creatingFolder} activeOpacity={0.8}>
                    <Feather name="folder-plus" size={15} color="#4f46e5" />
                    <Text style={s.newFolderText}>Carpeta</Text>
                  </TouchableOpacity>
                )}
                {isAdmin && instrumentTab === 'piano' && (
                  <TouchableOpacity style={s.newFolderBtn} onPress={handleCreatePianoFolder} disabled={creatingFolder} activeOpacity={0.8}>
                    <Feather name="folder-plus" size={15} color="#4f46e5" />
                    <Text style={s.newFolderText}>Carpeta</Text>
                  </TouchableOpacity>
                )}
                {isAdmin && instrumentTab === 'flauta' && (
                  <TouchableOpacity style={s.newFolderBtn} onPress={handleCreateRecorderFolder} disabled={creatingFolder} activeOpacity={0.8}>
                    <Feather name="folder-plus" size={15} color="#4f46e5" />
                    <Text style={s.newFolderText}>Carpeta</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.refreshBtn} onPress={onRefresh} disabled={loading} activeOpacity={0.8}>
                  <Feather name="refresh-cw" size={15} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Instrument tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.tabsRow}
            contentContainerStyle={s.tabsContent}
          >
            {INSTRUMENT_TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, instrumentTab === tab.key && s.tabActive]}
                onPress={() => { setInstrumentTab(tab.key); setActiveFolderId(null); }}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, instrumentTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {instrumentTab === 'accordion' ? (
            <>
              {/* Search + filter card */}
              <View style={s.controlCard}>
                {/* Row 1: Search */}
                <View style={s.searchRow}>
                  <Feather name="search" size={16} color="#9ca3af" />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Buscar canción, artista…"
                    placeholderTextColor="#9ca3af"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                  />
                </View>

                <View style={s.cardDivider} />

                {/* Row 2: Filter */}
                <TouchableOpacity style={s.controlsRow} onPress={showFilterPicker} activeOpacity={0.7}>
                  <Text style={s.dropdownText} numberOfLines={1}>{filterLabel}</Text>
                  <Feather name="chevron-down" size={13} color="#6b7280" />
                </TouchableOpacity>

                <View style={s.cardDivider} />

                {/* Row 3: Sort */}
                <TouchableOpacity style={s.controlsRow} onPress={showSortPicker} activeOpacity={0.7}>
                  <Text style={s.dropdownText} numberOfLines={1}>{sortLabel}</Text>
                  <Feather name="chevron-down" size={13} color="#6b7280" />
                </TouchableOpacity>

                <View style={s.cardDivider} />

                {/* Row 3: Currency toggle */}
                <View style={s.currencyRow}>
                  <View style={s.currencyToggle}>
                    <TouchableOpacity style={[s.currBtn, currency === 'COP' && s.currBtnActive]} onPress={() => setCurrency('COP')}>
                      <Text style={[s.currText, currency === 'COP' && s.currTextActive]}>COP</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.currBtn, currency === 'USD' && s.currBtnActive]} onPress={() => setCurrency('USD')}>
                      <Text style={[s.currText, currency === 'USD' && s.currTextActive]}>USD</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Membership card */}
              {showMembership && (
                <MembershipCard
                  plan={accordionSub?.plan ?? 'accordion_daily'}
                  activeSub={accordionSub}
                  colorTheme="blue"
                  instrumentName="Acordeón"
                  feature="Todas las canciones de acordeón incluidas"
                  isAdmin={isAdmin}
                  onRefresh={refreshSubs}
                  refreshing={subLoading}
                  onSubscribe={() => navigation.navigate('Subscription')}
                />
              )}

              {/* Result count */}
              {!loading && (
                <Text style={s.count}>
                  Mostrando {filteredSongs.length} de {songs.length} canciones
                </Text>
              )}

              {/* Loading skeleton */}
              {loading && (
                <View style={s.center}>
                  <ActivityIndicator size="large" color="#7c3aed" />
                  <Text style={s.loadingText}>Cargando canciones…</Text>
                </View>
              )}

              {/* Error */}
              {!loading && error && (
                <View style={s.center}>
                  <Feather name="music" size={40} color="#ef4444" />
                  <Text style={s.errorText}>{error}</Text>
                  <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
                    <Text style={s.retryText}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Folder cards — 2-column grid */}
              {!loading && !error && visibleFolders.length > 0 && (
                <View style={s.foldersSection}>
                  {visibleFolders.reduce<Song[][]>((rows, folder, i) => {
                    if (i % 2 === 0) rows.push([folder]);
                    else rows[rows.length - 1].push(folder);
                    return rows;
                  }, []).map((row, rowIdx) => (
                    <View key={rowIdx} style={s.folderRow}>
                      {row.map(folder => (
                        <FolderCard
                          key={folder.songId}
                          folder={folder}
                          songCount={songCountInFolder[folder.songId] ?? 0}
                          isAdmin={isAdmin}
                          onOpen={f => setActiveFolderId(f.songId)}
                          onRename={isAdmin ? handleRenameFolder : undefined}
                          onDelete={isAdmin ? handleDeleteFolder : undefined}
                        />
                      ))}
                      {/* Fill empty slot if odd number */}
                      {row.length === 1 && <View style={s.folderPlaceholder} />}
                    </View>
                  ))}
                </View>
              )}

              {/* Empty state */}
              {isEmpty && (
                <View style={s.center}>
                  <Feather name="music" size={40} color="#9ca3af" />
                  <Text style={s.emptyText}>
                    {searchTerm ? 'Sin resultados para tu búsqueda' : 'No hay canciones disponibles'}
                  </Text>
                </View>
              )}
            </>
          ) : instrumentTab === 'piano' ? (
            <>
              {/* Piano search + filter card */}
              <View style={s.controlCard}>
                <View style={s.searchRow}>
                  <Feather name="search" size={16} color="#9ca3af" />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Buscar canción, artista…"
                    placeholderTextColor="#9ca3af"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                  />
                </View>

                <View style={s.cardDivider} />

                <TouchableOpacity style={s.controlsRow} onPress={showFilterPicker} activeOpacity={0.7}>
                  <Text style={s.dropdownText} numberOfLines={1}>{filterLabel}</Text>
                  <Feather name="chevron-down" size={13} color="#6b7280" />
                </TouchableOpacity>

                <View style={s.cardDivider} />

                <TouchableOpacity style={s.controlsRow} onPress={showSortPicker} activeOpacity={0.7}>
                  <Text style={s.dropdownText} numberOfLines={1}>{sortLabel}</Text>
                  <Feather name="chevron-down" size={13} color="#6b7280" />
                </TouchableOpacity>

                <View style={s.cardDivider} />

                <View style={s.currencyRow}>
                  <View style={s.currencyToggle}>
                    <TouchableOpacity style={[s.currBtn, currency === 'COP' && s.currBtnActive]} onPress={() => setCurrency('COP')}>
                      <Text style={[s.currText, currency === 'COP' && s.currTextActive]}>COP</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.currBtn, currency === 'USD' && s.currBtnActive]} onPress={() => setCurrency('USD')}>
                      <Text style={[s.currText, currency === 'USD' && s.currTextActive]}>USD</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Membership card */}
              {showPianoMembership && (
                <MembershipCard
                  plan={pianoSub?.plan ?? 'piano_daily'}
                  activeSub={pianoSub}
                  colorTheme="blue"
                  instrumentName="Piano"
                  feature="Todas las canciones de piano incluidas"
                  isAdmin={isAdmin}
                  onRefresh={refreshSubs}
                  refreshing={subLoading}
                  onSubscribe={() => navigation.navigate('Subscription')}
                />
              )}

              {/* Folder cards — 2-column grid */}
              {!loading && !error && visiblePianoFolders.length > 0 && (
                <View style={s.foldersSection}>
                  {visiblePianoFolders.reduce<Song[][]>((rows, folder, i) => {
                    if (i % 2 === 0) rows.push([folder]);
                    else rows[rows.length - 1].push(folder);
                    return rows;
                  }, []).map((row, rowIdx) => (
                    <View key={rowIdx} style={s.folderRow}>
                      {row.map(folder => (
                        <FolderCard
                          key={folder.songId}
                          folder={folder}
                          songCount={songCountInFolder[folder.songId] ?? 0}
                          isAdmin={isAdmin}
                          onOpen={f => setActiveFolderId(f.songId)}
                          onRename={isAdmin ? handleRenameFolder : undefined}
                          onDelete={isAdmin ? handleDeleteFolder : undefined}
                        />
                      ))}
                      {row.length === 1 && <View style={s.folderPlaceholder} />}
                    </View>
                  ))}
                </View>
              )}

              {!loading && (
                <Text style={s.count}>
                  Mostrando {filteredPianoSongs.length} de {songs.length} canciones
                </Text>
              )}

              {loading && (
                <View style={s.center}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={s.loadingText}>Cargando canciones…</Text>
                </View>
              )}

              {!loading && error && (
                <View style={s.center}>
                  <Feather name="music" size={40} color="#ef4444" />
                  <Text style={s.errorText}>{error}</Text>
                  <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
                    <Text style={s.retryText}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isPianoEmpty && (
                <View style={s.center}>
                  <Feather name="music" size={40} color="#9ca3af" />
                  <Text style={s.emptyText}>
                    {searchTerm ? 'Sin resultados para tu búsqueda' : 'No hay canciones de piano disponibles'}
                  </Text>
                </View>
              )}
            </>
          ) : instrumentTab === 'flauta' ? (
            <>
              {/* Flauta search + filter card */}
              <View style={s.controlCard}>
                <View style={s.searchRow}>
                  <Feather name="search" size={16} color="#9ca3af" />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Buscar canción, artista…"
                    placeholderTextColor="#9ca3af"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                  />
                </View>

                <View style={s.cardDivider} />

                <TouchableOpacity style={s.controlsRow} onPress={showFilterPicker} activeOpacity={0.7}>
                  <Text style={s.dropdownText} numberOfLines={1}>{filterLabel}</Text>
                  <Feather name="chevron-down" size={13} color="#6b7280" />
                </TouchableOpacity>

                <View style={s.cardDivider} />

                <TouchableOpacity style={s.controlsRow} onPress={showSortPicker} activeOpacity={0.7}>
                  <Text style={s.dropdownText} numberOfLines={1}>{sortLabel}</Text>
                  <Feather name="chevron-down" size={13} color="#6b7280" />
                </TouchableOpacity>

                <View style={s.cardDivider} />

                <View style={s.currencyRow}>
                  <View style={s.currencyToggle}>
                    <TouchableOpacity style={[s.currBtn, currency === 'COP' && s.currBtnActive]} onPress={() => setCurrency('COP')}>
                      <Text style={[s.currText, currency === 'COP' && s.currTextActive]}>COP</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.currBtn, currency === 'USD' && s.currBtnActive]} onPress={() => setCurrency('USD')}>
                      <Text style={[s.currText, currency === 'USD' && s.currTextActive]}>USD</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Membership card */}
              {showRecorderMembership && (
                <MembershipCard
                  plan={recorderSub?.plan ?? 'recorder_daily'}
                  activeSub={recorderSub}
                  colorTheme="teal"
                  instrumentName="Flauta"
                  feature="Todas las canciones de flauta incluidas"
                  isAdmin={isAdmin}
                  onRefresh={refreshSubs}
                  refreshing={subLoading}
                  onSubscribe={() => navigation.navigate('Subscription')}
                />
              )}

              {/* Folder cards — 2-column grid */}
              {!loading && !error && visibleRecorderFolders.length > 0 && (
                <View style={s.foldersSection}>
                  {visibleRecorderFolders.reduce<Song[][]>((rows, folder, i) => {
                    if (i % 2 === 0) rows.push([folder]);
                    else rows[rows.length - 1].push(folder);
                    return rows;
                  }, []).map((row, rowIdx) => (
                    <View key={rowIdx} style={s.folderRow}>
                      {row.map(folder => (
                        <FolderCard
                          key={folder.songId}
                          folder={folder}
                          songCount={songCountInFolder[folder.songId] ?? 0}
                          isAdmin={isAdmin}
                          onOpen={f => setActiveFolderId(f.songId)}
                          onRename={isAdmin ? handleRenameFolder : undefined}
                          onDelete={isAdmin ? handleDeleteFolder : undefined}
                        />
                      ))}
                      {row.length === 1 && <View style={s.folderPlaceholder} />}
                    </View>
                  ))}
                </View>
              )}

              {!loading && (
                <Text style={s.count}>
                  Mostrando {filteredRecorderSongs.length} de {songs.length} canciones
                </Text>
              )}

              {loading && (
                <View style={s.center}>
                  <ActivityIndicator size="large" color="#0d9488" />
                  <Text style={s.loadingText}>Cargando canciones…</Text>
                </View>
              )}

              {!loading && error && (
                <View style={s.center}>
                  <Feather name="music" size={40} color="#ef4444" />
                  <Text style={s.errorText}>{error}</Text>
                  <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
                    <Text style={s.retryText}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isRecorderEmpty && (
                <View style={s.center}>
                  <Feather name="music" size={40} color="#9ca3af" />
                  <Text style={s.emptyText}>
                    {searchTerm ? 'Sin resultados para tu búsqueda' : 'No hay canciones de flauta disponibles'}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={s.construction}>
              <Feather name="tool" size={36} color="#c4b5fd" />
              <Text style={s.constructionTitle}>En construcción</Text>
              <Text style={s.constructionSub}>Próximamente disponible</Text>
            </View>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <SongCard
          song={item}
          isPurchased={isPurchasedSong(item)}
          isAdmin={isAdmin}
          displayCurrency={currency}
          isDeleting={deletingId === item.songId}
          isTogglingVisibility={togglingVisId === item.songId}
          inFolder={activeFolderId !== null}
          onPractice={song => {
            const inst = song.instrument?.toLowerCase() ?? '';
            let screen: string | null = 'Accordion';
            if (inst === 'piano') screen = 'Piano';
            else if (inst.includes('recorder') || inst.includes('flauta')) screen = 'Recorder';
            navigation.navigate(screen, { songId: song.songId, songName: song.name });
          }}
          onOpenLink={song => song.link && Linking.openURL(song.link)}
          onDelete={isAdmin ? handleDelete : undefined}
          onToggleVisibility={isAdmin ? handleToggleVisibility : undefined}
          onRemoveFromFolder={isAdmin && activeFolderId !== null ? handleRemoveFromFolder : undefined}
        />
      )}
    />
    </>
  );
}

const s = StyleSheet.create({
  list:         { paddingHorizontal: 16, paddingBottom: 32 },
  titleRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 16, marginBottom: 12 },
  titleBlock:   { flex: 1 },
  title:        { fontSize: 20, fontWeight: '800', color: '#1f2937' },
  subtitle:     { fontSize: 12, color: '#6b7280', marginTop: 2 },
  titleActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  newFolderBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  newFolderText:{ fontSize: 12, fontWeight: '600', color: '#4f46e5' },
  refreshBtn:   { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8 },
  breadcrumb:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 14, marginBottom: 12 },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText:     { fontSize: 13, fontWeight: '600', color: '#4f46e5' },
  breadSep:     { fontSize: 13, color: '#9ca3af' },
  breadFolder:  { fontSize: 13, fontWeight: '700', color: '#1f2937' },
  controlCard:  {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  searchRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 44 },
  searchInput:  { flex: 1, fontSize: 14, color: '#1f2937' },
  cardDivider:  { height: 1, backgroundColor: '#f3f4f6' },
  controlsRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 44, gap: 8 },
  dropdownText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#374151' },
  ctrlDivider:  { width: 1, height: 20, backgroundColor: '#e5e7eb' },
  currencyRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8 },
  currencyToggle:{ flexDirection: 'row', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 7, overflow: 'hidden' },
  currBtn:      { paddingHorizontal: 8, paddingVertical: 4 },
  currBtnActive:{ backgroundColor: '#7c3aed' },
  currText:     { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  currTextActive:{ color: '#fff' },
  count:       { fontSize: 12, color: '#9ca3af', marginBottom: 10 },
  foldersSection:   { marginBottom: 8, gap: 10 },
  folderRow:        { flexDirection: 'row', gap: 10 },
  folderPlaceholder:{ flex: 1 },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox:      { backgroundColor: '#fff', borderRadius: 14, padding: 20 },
  modalTitle:    { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  modalInput:    {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827', marginBottom: 16,
  },
  modalActions:  { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancel:   { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
  modalCancelText: { fontSize: 14, color: '#6b7280' },
  modalConfirm:  { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, backgroundColor: '#7c3aed' },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  center:      { paddingVertical: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#9ca3af' },
  errorText:   { fontSize: 14, color: '#ef4444', textAlign: 'center' },
  retryBtn:    { backgroundColor: '#7c3aed', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText:   { color: '#fff', fontWeight: '600' },
  emptyText:   { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  tabsRow:     { marginBottom: 14, marginHorizontal: -16 },
  tabsContent: { paddingHorizontal: 16, gap: 4 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:   { borderBottomColor: '#2563eb' },
  tabText:     { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive:{ color: '#2563eb' },
  construction: { paddingVertical: 60, alignItems: 'center', gap: 10 },
  constructionTitle: { fontSize: 16, fontWeight: '700', color: '#6b7280' },
  constructionSub:   { fontSize: 13, color: '#9ca3af' },
});
