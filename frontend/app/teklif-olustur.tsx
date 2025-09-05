import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../components/AppHeader';
import Head from 'expo-router/head';

const BACKEND_URL = (process.env.EXPO_BACKEND_URL as string) || '';

interface User { id: string; name: string; email: string; phone: string; user_type: string }

export default function TeklifOlustur() {
  const [user, setUser] = React.useState<User | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  const [form, setForm] = React.useState({
    from_location: '',
    to_location: '',
    moving_date: '',
    description: '',
  });

  React.useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('userToken');
        const u = await AsyncStorage.getItem('userData');
        if (t && u) {
          setToken(t);
          setUser(JSON.parse(u));
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const loginDemoCustomer = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo.musteri@demo.com', password: '123456**' }),
      });
      if (!res.ok) throw new Error('Giriş başarısız');
      const tokenData = await res.json();
      const me = await fetch(`${BACKEND_URL}/api/me`, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
      if (!me.ok) throw new Error('Kullanıcı bilgisi alınamadı');
      const meUser = await me.json();
      await AsyncStorage.setItem('userToken', tokenData.access_token);
      await AsyncStorage.setItem('userData', JSON.stringify(meUser));
      setToken(tokenData.access_token);
      setUser(meUser);
      setMsg('Demo müşteri ile giriş yapıldı.');
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Giriş yapılamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if (!token || !user || user.user_type !== 'customer') {
      Alert.alert('Bilgi', 'Teklif oluşturmak için müşteri olarak giriş yapın.');
      return;
    }
    if (!form.from_location.trim() || !form.to_location.trim()) {
      Alert.alert('Eksik', 'Nereden ve Nereye zorunludur.');
      return;
    }
    setSubmitting(true);
    setMsg('');
    try {
      const payload = {
        from_location: form.from_location,
        to_location: form.to_location,
        from_floor: 1,
        to_floor: 1,
        has_elevator_from: true,
        has_elevator_to: true,
        needs_mobile_elevator: false,
        truck_distance: 'Uygun',
        packing_service: true,
        moving_date: new Date(form.moving_date || new Date()).toISOString(),
        description: form.description,
      };
      const res = await fetch(`${BACKEND_URL}/api/moving-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.detail || 'Oluşturulamadı');
      setMsg('Talebiniz alındı. Kısa sürede dönüş yapacağız.');
      setForm({ from_location: '', to_location: '', moving_date: '', description: '' });
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Talep oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <Head>
          <title>Ücretsiz Teklif Al | Sadece Nakliyat</title>
          <meta name="description" content="Hızlıca ücretsiz taşınma teklifi oluşturun" />
        </Head>
        <AppHeader active="quote" />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Ücretsiz Teklif Al</Text>
          <Text style={styles.sub}>Nereden nereye taşıma ihtiyacınızı yazın, kısa sürede teklif alın.</Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 16 }} />
          ) : (
            <View style={styles.card}>
              {user?.user_type !== 'customer' ? (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>Teklif oluşturmak için müşteri olarak giriş yapın.</Text>
                  <TouchableOpacity style={styles.demoBtn} onPress={loginDemoCustomer} disabled={submitting}>
                    <Text style={styles.demoBtnText}>{submitting ? 'Giriş yapılıyor...' : 'Demo müşteri ile devam et'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.rowSplit}>
                <TextInput style={[styles.input, styles.split]} placeholder="Nereden" value={form.from_location} onChangeText={(v) => setForm({ ...form, from_location: v })} />
                <TextInput style={[styles.input, styles.split]} placeholder="Nereye" value={form.to_location} onChangeText={(v) => setForm({ ...form, to_location: v })} />
              </View>
              <TextInput style={styles.input} placeholder="Tarih (YYYY-MM-DD)" value={form.moving_date} onChangeText={(v) => setForm({ ...form, moving_date: v })} />
              <TextInput style={[styles.input, styles.textArea]} multiline placeholder="Notlar" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />
              {msg ? <Text style={styles.success}>{msg}</Text> : null}
              <TouchableOpacity style={[styles.btn, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting || user?.user_type !== 'customer'}>
                <Text style={styles.btnText}>{submitting ? 'Gönderiliyor...' : 'Talep Oluştur'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7fb' },
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#2c3e50' },
  sub: { fontSize: 13, color: '#7f8c8d', marginTop: 4 },
  card: { marginTop: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#eef0f3' },
  rowSplit: { flexDirection: 'row', gap: 10 },
  split: { flex: 1 },
  input: { borderWidth: 1, borderColor: '#e1e5ea', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.select({ ios: 12, android: 10, default: 10 }), backgroundColor: '#fafafa', fontSize: 14, color: '#2c3e50', marginTop: 10 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  btn: { backgroundColor: '#2F80ED', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  infoBox: { backgroundColor: '#f0f7ff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#d7e8ff', marginBottom: 8 },
  infoText: { color: '#2c3e50', fontSize: 13 },
  demoBtn: { marginTop: 8, backgroundColor: '#0F6CFD', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  demoBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  success: { color: '#2ecc71', marginTop: 6, fontSize: 12, fontWeight: '700' },
});