import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Song } from '../types';

interface Props {
  folder: Song;
  songCount: number;
  isAdmin?: boolean;
  onOpen: (folder: Song) => void;
  onRename?: (folder: Song) => void;
  onDelete?: (folder: Song) => void;
}

export default function FolderCard({ folder, songCount, isAdmin, onOpen, onRename, onDelete }: Props) {
  return (
    <TouchableOpacity style={s.card} onPress={() => onOpen(folder)} activeOpacity={0.75}>
      {/* Admin buttons — top-right corner */}
      {isAdmin && (
        <View style={s.adminBtns}>
          {onRename && (
            <TouchableOpacity onPress={() => onRename(folder)} hitSlop={8} style={s.adminBtn}>
              <Feather name="edit-2" size={13} color="#818cf8" />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(folder)} hitSlop={8} style={s.adminBtn}>
              <Feather name="trash-2" size={13} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Icon */}
      <Feather name="folder" size={44} color="#818cf8" style={s.icon} />

      {/* Text */}
      <Text style={s.name} numberOfLines={2}>{folder.name}</Text>
      <Text style={s.count}>{songCount} canción{songCount !== 1 ? 'es' : ''}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#c7d2fe',
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 14,
    alignItems: 'center',
    gap: 6,
    minHeight: 110,
  },
  icon:      { marginBottom: 2 },
  name:      { fontSize: 13, fontWeight: '700', color: '#1f2937', textAlign: 'center' },
  count:     { fontSize: 11, color: '#9ca3af' },
  adminBtns: { position: 'absolute', top: 7, right: 7, flexDirection: 'row', gap: 6 },
  adminBtn:  { padding: 3 },
});
