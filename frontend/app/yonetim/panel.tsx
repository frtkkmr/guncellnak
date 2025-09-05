import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  user_type: string; // customer, mover, admin, moderator
  is_active: boolean;
}

export default function AdminPanel() {
  const router = useRouter();
  const [token, setToken] = React.useState<string | null>(null);
  const [users, setUsers] = React.useState<UserItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const t = await AsyncStorage.getItem('userToken');
      if (!t) {
        setError('Oturum bulunamadı. Yönetim girişi yapın.');
        return;
      }
      setToken(t);
      const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error('Yetki veya bağlantı hatası');
      const data = await res.json();
      setUsers(data);
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const act = async (label: string, url: string, body?: any) => {
    if (!token) return;
    setWorking(label);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || 'İşlem başarısız');
      }
      const j = await res.json().catch(() => ({}));
      setSuccess(j.message || 'İşlem başarılı');
      await load();
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu');
    } finally {
      setWorking('');
    }
  };

  const Row = ({ u }: { u: UserItem }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{u.name}</Text>
        <Text style={styles.meta}>{u.email} • {u.phone}</Text>
        <Text style={styles.meta}>Rol: {u.user_type} • Durum: {u.is_active ? 'Aktif' : 'Banlı'}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={() => act('mod', `${BACKEND_URL}/api/admin/update-user-role/${encodeURIComponent(u.email)}`, { role: 'moderator' })}>
          <Text style={styles.btnText}>Moderatör</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => act('admin', `${BACKEND_URL}/api/admin/update-user-role/${encodeURIComponent(u.email)}`, { role: 'admin' })}>
          <Text style={styles.btnText}>Admin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOutline} onPress={() => act('cust', `${BACKEND_URL}/api/admin/update-user-role/${encodeURIComponent(u.email)}`, { role: 'customer' })}>
          <Text style={styles.btnOutlineText}>Müşteri</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOutline} onPress={() => act('mover', `${BACKEND_URL}/api/admin/update-user-role/${encodeURIComponent(u.email)}`, { role: 'mover' })}>
          <Text style={styles.btnOutlineText}>Nakliyeci</Text>
        </TouchableOpacity>
        {u.is_active ? (
          <>
            <TouchableOpacity style={styles.btnDanger} onPress={() => act('ban3', `${BACKEND_URL}/api/admin/ban-user/${encodeURIComponent(u.email)}`, { ban_days: 3 })}>
              <Text style={styles.btnDangerText}>Ban 3g</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnDanger} onPress={() => act('ban7', `${BACKEND_URL}/api/admin/ban-user/${encodeURIComponent(u.email)}`, { ban_days: 7 })}>
              <Text style={styles.btnDangerText}>Ban 7g</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={() => act('unban', `${BACKEND_URL}/api/admin/unban-user/${encodeURIComponent(u.email)}`)}>
            <Text style={styles.btnText}>Ban Kaldır</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <Head>
          <title>Yönetim Paneli | Sadece Nakliyat</title>
          <meta name="description" content="Kullanıcı yönetimi" />
        </Head>
        <AppHeader active="yonetim" />
        <View style={styles.page}>
          <View style={[styles.maxWidth, { maxWidth: 1000 }]}> 
            <Text style={styles.title}>Kullanıcı Yönetimi</Text>
            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
            {success ? <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View> : null}
            {loading ? (
              <ActivityIndicator style={{ marginTop: 24 }} />
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                {users.map((u) => (
                  <Row key={u.id} u={u} />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7fb' },
  page: { flex: 1, alignItems: 'center' },
  maxWidth: { width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#2c3e50', marginBottom: 12 },
  row: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eef0f3', marginBottom: 10, flexDirection: 'row' },
  name: { fontSize: 15, fontWeight: '800', color: '#2c3e50' },
  meta: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  btn: { backgroundColor: '#2F80ED', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginLeft: 6 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  btnOutline: { borderWidth: 1, borderColor: '#cfd6de', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginLeft: 6 },
  btnOutlineText: { color: '#2c3e50', fontSize: 12, fontWeight: '700' },
  btnDanger: { backgroundColor: '#e74c3c', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginLeft: 6 },
  btnDangerText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  errorBox: { backgroundColor: '#ffe8e6', borderRadius: 8, padding: 10, marginBottom: 8 },
  errorText: { color: '#d64541', fontSize: 12, fontWeight: '700' },
  successBox: { backgroundColor: '#e9f7ef', borderRadius: 8, padding: 10, marginBottom: 8 },
  successText: { color: '#2ecc71', fontSize: 12, fontWeight: '700' },
});