import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import AppHeader from '../components/AppHeader';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function YonetimLogin() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleLogin = async () => {
    setError('');
    setSuccess('');
    if (!email || !password) {
      setError('E‑posta ve şifre gerekli');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || 'Giriş başarısız');
      }
      const tokenData = await res.json();
      await AsyncStorage.setItem('userToken', tokenData.access_token);
      // Admin doğrulaması: admin kullanıcı listesi çekmeyi dene
      const adminRes = await fetch(`${BACKEND_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (adminRes.ok) {
        setSuccess('Giriş başarılı. Panel açılıyor...');
        setTimeout(() => router.push('/yonetim/panel'), 500);
      } else {
        setError('Bu hesap yönetici değil. Yetkili bir hesapla deneyin.');
      }
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <Head>
          <title>Yönetim | Sadece Nakliyat</title>
          <meta name="description" content="Yönetim paneli girişi" />
        </Head>
        <AppHeader active="yonetim" />
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Yönetim Girişi</Text>
            <Text style={styles.sub}>Admin paneline erişmek için giriş yapın</Text>
            <TextInput
              style={styles.input}
              placeholder="E‑posta"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Şifre"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {error ? (
              <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
            ) : null}
            {success ? (
              <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View>
            ) : null}
            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Giriş Yap</Text>}
            </TouchableOpacity>
            <Text style={styles.hint}>Yalnızca yetkili kullanıcılar giriş yapabilir.</Text>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7fb' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#eef0f3' },
  title: { fontSize: 20, fontWeight: '800', color: '#2c3e50', textAlign: 'center' },
  sub: { fontSize: 13, color: '#7f8c8d', textAlign: 'center', marginTop: 6, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#e1e5ea', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.select({ ios: 12, android: 10, default: 10 }), backgroundColor: '#fafafa', fontSize: 14, color: '#2c3e50', marginBottom: 10 },
  btn: { backgroundColor: '#2F80ED', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorBox: { backgroundColor: '#ffe8e6', borderRadius: 8, padding: 10, marginBottom: 8 },
  errorText: { color: '#d64541', fontSize: 12, textAlign: 'center', fontWeight: '700' },
  successBox: { backgroundColor: '#e9f7ef', borderRadius: 8, padding: 10, marginBottom: 8 },
  successText: { color: '#2ecc71', fontSize: 12, textAlign: 'center', fontWeight: '700' },
  hint: { textAlign: 'center', color: '#95a5a6', fontSize: 12, marginTop: 10 },
});