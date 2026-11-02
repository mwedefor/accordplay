import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDrawer } from '../context/DrawerContext';
import { useAuth } from '../context/AuthContext';

interface Props {
  navigation?: any;
  showBack?: boolean;
  onBack?: () => void;
}

export default function AppHeader({ navigation, showBack, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { toggle } = useDrawer();
  const { logout } = useAuth();
  const [lang, setLang] = useState<'es' | 'en'>('es');

  return (
    <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
      <View style={styles.leftGroup}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={showBack ? onBack : toggle}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showBack ? 'chevron-back' : 'menu'}
            size={36}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.brand}
          onPress={() => navigation?.navigate('Home')}
          disabled={!navigation}
          activeOpacity={navigation ? 0.7 : 1}
        >
          <Image
            source={require('../assets/accord-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            fadeDuration={0}
          />
          <View>
            <Text style={styles.brandAccord}>Accord</Text>
            <Text style={styles.brandPlay}>Play</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.rightGroup}>
        <View style={styles.langBox}>
          <TouchableOpacity onPress={() => setLang('es')} activeOpacity={0.7}>
            <Text style={[styles.langItem, lang === 'es' && styles.langActive]}>ES</Text>
          </TouchableOpacity>
          <Text style={styles.langSep}>|</Text>
          <TouchableOpacity onPress={() => setLang('en')} activeOpacity={0.7}>
            <Text style={[styles.langItem, lang === 'en' && styles.langActive]}>EN</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1a0a2e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3d1f6e',
  },
  leftGroup:   { flex: 1, flexDirection: 'row', alignItems: 'center' },
  iconBtn:     { width: 46, height: 46, justifyContent: 'center', alignItems: 'center' },
  brand:       { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logo:        { width: 46, height: 46 },
  brandAccord: { color: '#c4b5fd', fontSize: 13, fontWeight: '800', lineHeight: 15 },
  brandPlay:   { color: '#ffffff', fontSize: 13, fontWeight: '800', lineHeight: 15 },
  rightGroup:  { flexDirection: 'row', alignItems: 'center', gap: 2 },
  langBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 2,
  },
  langItem:   { paddingHorizontal: 5, paddingVertical: 3, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  langActive: { color: '#fff', backgroundColor: 'rgba(124,58,237,0.5)', borderRadius: 4 },
  langSep:    { color: 'rgba(255,255,255,0.2)', fontSize: 11 },
});
