import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('Incorrect') || msg.includes('incorrect') || msg.includes('UserNotFound')) {
        setError('Correo o contraseña incorrectos');
      } else if (msg.includes('User does not exist')) {
        setError('No existe una cuenta con ese correo');
      } else if (msg.includes('attempts')) {
        setError('Demasiados intentos. Intenta más tarde');
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Background decoration */}
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo area */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../assets/accord-logo.png')}
                style={styles.logoImg}
                resizeMode="contain"
                fadeDuration={0}
              />
            </View>
            <Text style={styles.appName}>
              <Text style={styles.appNameAccord}>Accord</Text>
              <Text style={styles.appNamePlay}>Play</Text>
            </Text>
            <Text style={styles.tagline}>Tu instrumento, en cualquier lugar</Text>
          </View>

          {/* Login card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar Sesión</Text>

            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={password}
              onChangeText={t => { setPassword(t); setError(''); }}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Entrar</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#1a0a2e' },
  bgTop: {
    position: 'absolute', top: -80, left: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#2d1155', opacity: 0.6,
  },
  bgBottom: {
    position: 'absolute', bottom: -100, right: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#3d1f6e', opacity: 0.4,
  },
  kav:    { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },

  logoArea:      { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.3)',
  },
  logoImg:       { width: 48, height: 48 },
  appName:       { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  appNameAccord: { color: '#c4b5fd' },
  appNamePlay:   { color: '#ffffff' },
  tagline:       { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 20 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  error: { color: '#ef4444', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  btn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
