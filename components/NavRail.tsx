import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDrawer } from '../context/DrawerContext';
import { useAuth } from '../context/AuthContext';

export const NAV_RAIL_W = 48;

type IconLib = 'feather' | 'mci';
interface NavItem { key: string; icon: string; lib?: IconLib; screen: string | null }

// Regular user items — mirrors web SideMenu order and Lucide icons exactly
// Lucide icons not in Feather use MaterialCommunityIcons (mci)
// NOTE: Profile is intentionally NOT here — it goes last, after admin items (matches web)
const USER_ITEMS: NavItem[] = [
  { key: 'Library',        icon: 'music',        screen: 'Songs' }, // Music
  { key: 'MyMusic',        icon: 'heart',        screen: null }, // Heart
  { key: 'MyPurchases',    icon: 'shopping-bag', screen: null }, // ShoppingBag
  { key: 'Subscription',   icon: 'crown',        lib: 'mci', screen: 'Subscription' }, // Crown
  { key: 'Tasks',          icon: 'check-square', screen: null }, // CheckSquare
  { key: 'ChangePassword', icon: 'key',          screen: null }, // KeyRound → key
];

const PROFILE_ITEM: NavItem = { key: 'Profile', icon: 'user', screen: null }; // always last

// Admin-only items — only rendered when user.role === 'admin'
const ADMIN_ITEMS: NavItem[] = [
  { key: 'Digitalize',   icon: 'file-music',     lib: 'mci', screen: null }, // FileMusic
  { key: 'SongsMgmt',    icon: 'playlist-music', lib: 'mci', screen: null }, // ListMusic
  { key: 'AdminUsers',   icon: 'users',                      screen: null }, // Users
  { key: 'Institutions', icon: 'domain',         lib: 'mci', screen: null }, // Building2
  { key: 'Metrics',      icon: 'bar-chart-2',                screen: null }, // BarChart2
  { key: 'Tour',         icon: 'mouse-pointer',              screen: null }, // MousePointerClick
  { key: 'AdminConfig',  icon: 'tune',           lib: 'mci', screen: null }, // SlidersHorizontal
  { key: 'Payments',     icon: 'dollar-sign',                screen: null }, // DollarSign
];


interface Props {
  navigation: any;
  activeKey?: string;
}

export default function NavRail({ navigation, activeKey }: Props) {
  const insets    = useSafeAreaInsets();
  const { open }  = useDrawer();
  const { user }  = useAuth();

  const isAdmin = user?.role === 'admin';

  const renderItem = (item: NavItem) => {
    const active = item.key === activeKey;
    return (
      <TouchableOpacity
        key={item.key}
        style={[styles.item, active && styles.itemActive]}
        onPress={() => item.screen ? navigation.navigate(item.screen) : open()}
        activeOpacity={0.7}
      >
        {item.lib === 'mci'
          ? <MaterialCommunityIcons name={item.icon as any} size={20} color="#c4b5fd" />
          : <Feather name={item.icon as any} size={20} color="#c4b5fd" />
        }
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.rail, { paddingTop: insets.top ? insets.top - 8 : 4 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {USER_ITEMS.map(renderItem)}
        {isAdmin && (
          <>
            <View style={styles.divider} />
            {ADMIN_ITEMS.map(renderItem)}
          </>
        )}
        <View style={styles.divider} />
        {renderItem(PROFILE_ITEM)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: NAV_RAIL_W,
    backgroundColor: '#160826',
    borderRightWidth: 1,
    borderRightColor: '#3d1f6e',
  },
  scroll: {
    alignItems: 'center',
    paddingBottom: 12,
    gap: 4,
  },
  item: {
    width: 40,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemActive: {
    backgroundColor: '#2e1555',
  },
  divider: {
    width: 24,
    height: 1,
    backgroundColor: '#3d1f6e',
    marginVertical: 6,
  },
});
