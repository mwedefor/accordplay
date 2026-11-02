import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Pressable, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDrawer } from '../context/DrawerContext';
import { useAuth } from '../context/AuthContext';

const DRAWER_W = 272;

interface NavItem {
  key: string;
  label: string;
  icon: string;
  screen?: string;
  soon?: boolean;
}

const MAIN_ITEMS: NavItem[] = [
  { key: 'home',    label: 'Inicio',             icon: 'home-outline',          screen: 'Home' },
  { key: 'library', label: 'Biblioteca Musical',  icon: 'library-outline' },
  { key: 'mymusic', label: 'Mis Canciones',        icon: 'musical-notes-outline' },
  { key: 'purchases',label: 'Mis Compras',         icon: 'bag-handle-outline' },
];

const INSTRUMENT_ITEMS: NavItem[] = [
  { key: 'accordion', label: 'Acordeón', icon: 'apps-outline',         screen: 'Accordion' },
  { key: 'violin',    label: 'Violín',   icon: 'musical-note-outline',  soon: true },
  { key: 'guitar',    label: 'Guitarra', icon: 'musical-note-outline',  soon: true },
  { key: 'piano',     label: 'Piano',    icon: 'musical-note-outline',  soon: true },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { key: 'subscription', label: 'Membresías',          icon: 'card-outline' },
  { key: 'tasks',        label: 'Tareas',              icon: 'checkmark-circle-outline' },
  { key: 'password',     label: 'Cambiar Contraseña',  icon: 'lock-closed-outline' },
  { key: 'profile',      label: 'Perfil',              icon: 'person-outline' },
];

export default function SideDrawer({ navigation }: { navigation: any }) {
  const { isOpen, close } = useDrawer();
  const { user, logout }  = useAuth();
  const insets = useSafeAreaInsets();

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
    const clickable = !!item.screen && !item.soon;
    return (
      <TouchableOpacity
        key={item.key}
        style={styles.navRow}
        onPress={() => go(item.screen)}
        disabled={!clickable}
        activeOpacity={clickable ? 0.6 : 1}
      >
        <Ionicons
          name={item.icon as any}
          size={19}
          color={clickable ? '#c4b5fd' : '#4e3f60'}
        />
        <Text style={[styles.navLabel, !clickable && styles.navMuted]}>{item.label}</Text>
        {item.soon && (
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>Pronto</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dark overlay behind drawer */}
      <Animated.View style={[styles.overlay, { opacity: overlayOp }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[styles.panel, { transform: [{ translateX }], paddingTop: insets.top }]}
        pointerEvents="auto"
      >
        {/* User info header */}
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

        {/* Main navigation */}
        <View style={styles.sectionGroup}>
          {MAIN_ITEMS.map(renderItem)}
        </View>

        <View style={styles.divider} />

        {/* Instruments */}
        <Text style={styles.sectionLabel}>Instrumentos</Text>
        <View style={styles.sectionGroup}>
          {INSTRUMENT_ITEMS.map(renderItem)}
        </View>

        <View style={styles.divider} />

        {/* Account */}
        <Text style={styles.sectionLabel}>Cuenta</Text>
        <View style={styles.sectionGroup}>
          {ACCOUNT_ITEMS.map(renderItem)}
        </View>

        <View style={{ flex: 1 }} />

        {/* Logout */}
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.logoutRow}
          onPress={() => { close(); logout(); }}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
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
    position: 'absolute', top: 0, bottom: 0, left: 0,
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
  navMuted: { color: '#4e3f60' },
  soonBadge: {
    backgroundColor: '#2e1555', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  soonText:  { color: '#7a6892', fontSize: 10, fontWeight: '600' },
  logoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    marginHorizontal: 8, marginBottom: 4, borderRadius: 8,
  },
  logoutLabel: { color: '#f87171', fontSize: 14, fontWeight: '500' },
});
