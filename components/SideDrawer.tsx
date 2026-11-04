import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Pressable, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDrawer } from '../context/DrawerContext';
import { useAuth } from '../context/AuthContext';

const DRAWER_W = 272;

type IconLib = 'feather' | 'mci';
interface NavItem {
  key: string;
  label: string;
  icon: string;
  lib?: IconLib;
  screen?: string;
}

const USER_ITEMS: NavItem[] = [
  { key: 'Library',        label: 'Biblioteca',        icon: 'music',        screen: 'Songs' },
  { key: 'MyMusic',        label: 'Mis Canciones',      icon: 'heart' },
  { key: 'MyPurchases',    label: 'Mis Compras',        icon: 'shopping-bag' },
  { key: 'Subscription',   label: 'Membresías',         icon: 'crown',        lib: 'mci', screen: 'Subscription' },
  { key: 'Tasks',          label: 'Tareas',             icon: 'check-square' },
  { key: 'ChangePassword', label: 'Cambiar Contraseña', icon: 'key' },
];

const PROFILE_ITEM: NavItem = { key: 'Profile', label: 'Perfil', icon: 'user' };

const ADMIN_ITEMS: NavItem[] = [
  { key: 'Digitalize',   label: 'Digitalizar',   icon: 'file-music',     lib: 'mci' },
  { key: 'SongsMgmt',    label: 'Canciones',     icon: 'playlist-music', lib: 'mci' },
  { key: 'AdminUsers',   label: 'Usuarios',      icon: 'users' },
  { key: 'Institutions', label: 'Instituciones', icon: 'domain',         lib: 'mci' },
  { key: 'Metrics',      label: 'Métricas',      icon: 'bar-chart-2' },
  { key: 'Tour',         label: 'Tour / Ayuda',  icon: 'mouse-pointer' },
  { key: 'AdminConfig',  label: 'Configuración', icon: 'tune',           lib: 'mci' },
  { key: 'Payments',     label: 'Pagos',         icon: 'dollar-sign' },
];

export default function SideDrawer({ navigation }: { navigation: any }) {
  const { isOpen, close } = useDrawer();
  const { user, logout }  = useAuth();
  const insets = useSafeAreaInsets();

  const isAdmin = user?.role === 'admin';

  const translateX = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlayOp  = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 18 }),
        Animated.timing(overlayOp,  { toValue: 0.55, duration: 250, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_W, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayOp,  { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [isOpen]);

  if (!mounted) return null;

  const go = (screen?: string) => {
    if (!screen) return;
    close();
    setTimeout(() => navigation.navigate(screen), 20);
  };

  const renderItem = (item: NavItem) => {
    const clickable = !!item.screen;
    const icon = item.lib === 'mci'
      ? <MaterialCommunityIcons name={item.icon as any} size={19} color={clickable ? '#c4b5fd' : '#8b7ba8'} />
      : <Feather name={item.icon as any} size={19} color={clickable ? '#c4b5fd' : '#8b7ba8'} />;
    return (
      <TouchableOpacity
        key={item.key}
        style={styles.navRow}
        onPress={() => go(item.screen)}
        disabled={!clickable}
        activeOpacity={clickable ? 0.6 : 1}
      >
        {icon}
        <Text style={[styles.navLabel, !clickable && styles.navMuted]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayOp }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View
        style={[styles.panel, { top: insets.top + 60, transform: [{ translateX }] }]}
        pointerEvents="auto"
      >
        {/* User info */}
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {(user?.name ?? 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.sectionGroup}>
            {USER_ITEMS.map(renderItem)}
          </View>

          {isAdmin && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Administración</Text>
              <View style={styles.sectionGroup}>
                {ADMIN_ITEMS.map(renderItem)}
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.sectionGroup}>
            {renderItem(PROFILE_ITEM)}
          </View>
        </ScrollView>

        {/* Logout */}
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.logoutRow}
          onPress={() => { close(); logout(); }}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={20} color="#f87171" />
          <Text style={styles.logoutLabel}>Cerrar Sesión</Text>
        </TouchableOpacity>
        <View style={{ height: insets.bottom + 8 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: '#000',
  },
  panel: {
    position: 'absolute', bottom: 0, left: 0,
    width: DRAWER_W,
    backgroundColor: '#160826',
    borderRightWidth: 1,
    borderRightColor: '#3d1f6e',
  },
  userSection: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#7c3aed',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 20, fontWeight: '700' },
  userInfo:     { flex: 1 },
  userName:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  userEmail:    { color: '#7a6892', fontSize: 12, marginTop: 2 },
  scroll:       { paddingBottom: 8 },
  divider:      { height: 1, backgroundColor: '#2e1555', marginHorizontal: 12, marginVertical: 4 },
  sectionLabel: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2,
    fontSize: 10, fontWeight: '700', color: '#5a4a6a',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  sectionGroup: { paddingHorizontal: 8, paddingVertical: 2 },
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 8,
  },
  navLabel: { flex: 1, color: '#ddd0f0', fontSize: 14, fontWeight: '500' },
  navMuted: { color: '#5a4a72' },
  logoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    marginHorizontal: 8, marginBottom: 4, borderRadius: 8,
  },
  logoutLabel: { color: '#f87171', fontSize: 14, fontWeight: '500' },
});
