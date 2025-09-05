import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  user_type: string;
}

interface LivePost {
  id: string;
  mover_id: string;
  mover_name: string;
  company_name?: string;
  phone?: string;
  title: string;
  from_location?: string;
  to_location?: string;
  when?: string;
  vehicle?: string;
  price_note?: string;
  extra?: string;
  created_at: string;
}

export default function LiveFeedScreen() {
  const [user, setUser] = React.useState<User | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [posts, setPosts] = React.useState<LivePost[]>([]);
  const [error, setError] = React.useState('');

  const [form, setForm] = React.useState({
    title: '',
    from_location: '',
    to_location: '',
    when: '',
    vehicle: '',
    price_note: '',
    extra: '',
  });

  const loadSession = async () => {
    try {
      const t = await AsyncStorage.getItem('userToken');
      const u = await AsyncStorage.getItem('userData');
      if (t && u) {
        setToken(t);
        setUser(JSON.parse(u));
      }
    } catch (e) {}
  };

  const fetchFeed = async () => {
    try {
      const endpoint = user && (user.user_type === 'mover' || user.user_type === 'admin') ? '/api/live-feed/full' : '/api/live-feed';
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Feed yüklenemedi');
      const data = await res.json();
      setPosts(data);
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadSession().then(fetchFeed);
    const interval = setInterval(fetchFeed, 5000);
    return () => clearInterval(interval);
  }, [token, user]);

  const submitPost = async () => {
    if (!token || !user || user.user_type !== 'mover') return;
    if (!form.title.trim()) {
      setError('Başlık gereklidir');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/live-feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || 'Gönderilemedi');
      }
      setForm({ title: '', from_location: '', to_location: '', when: '', vehicle: '', price_note: '', extra: '' });
      await fetchFeed();
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPost = (p: LivePost) => {
    return (
      <View key={p.id} style={styles.postCard}>
        <View style={styles.postHeader}>
          <Text style={styles.postTitle}>{p.title}</Text>
          <Text style={styles.postWhen}>{p.when || ''}</Text>
        </View>
        <Text style={styles.postRoute}>
          {(p.from_location || '-') + ' → ' + (p.to_location || '-')}
        </Text>
        {p.vehicle ? <Text style={styles.postMeta}>Araç: {p.vehicle}</Text> : null}
        {p.price_note ? <Text style={styles.postMeta}>Not/Fiyat: {p.price_note}</Text> : null}
        {p.extra ? <Text style={styles.postExtra}>{p.extra}</Text> : null}
        <View style={styles.postFooter}>
          <Text style={styles.postMover}>{p.company_name || p.mover_name}</Text>
          {p.phone ? (
            <View style={styles.phoneBadge}>
              <Ionicons name="call" size={14} color="#fff" />
              <Text style={styles.phoneText}>{p.phone}</Text>
            </View>
          ) : (
            <Text style={styles.phoneHidden}>Telefon (yalnız nakliyecilere görünür)</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Canlı Akış</Text>
          <Text style={styles.headerSub}>Nakliyecilerin anlık paylaşımları</Text>
        </View>

        {user?.user_type === 'mover' && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Yeni İlan Paylaş</Text>
            <View style={styles.row}>
              <TextInput style={styles.input} placeholder="Başlık" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
            </View>
            <View style={styles.rowSplit}>
              <TextInput style={[styles.input, styles.split]} placeholder="Nereden" value={form.from_location} onChangeText={(v) => setForm({ ...form, from_location: v })} />
              <TextInput style={[styles.input, styles.split]} placeholder="Nereye" value={form.to_location} onChangeText={(v) => setForm({ ...form, to_location: v })} />
            </View>
            <View style={styles.rowSplit}>
              <TextInput style={[styles.input, styles.split]} placeholder="Ne zaman" value={form.when} onChangeText={(v) => setForm({ ...form, when: v })} />
              <TextInput style={[styles.input, styles.split]} placeholder="Araç" value={form.vehicle} onChangeText={(v) => setForm({ ...form, vehicle: v })} />
            </View>
            <View style={styles.row}>
              <TextInput style={styles.input} placeholder="Fiyat/Not" value={form.price_note} onChangeText={(v) => setForm({ ...form, price_note: v })} />
            </View>
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Ek açıklama" multiline value={form.extra} onChangeText={(v) => setForm({ ...form, extra: v })} />
            </View>
            {error ? (
              <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
            ) : null}
            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={submitPost} disabled={submitting}>
              <Text style={styles.submitText}>{submitting ? 'Gönderiliyor...' : 'Paylaş'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.feed}>
            {posts.map(renderPost)}
          </ScrollView>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7fb' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#2c3e50' },
  headerSub: { fontSize: 13, color: '#7f8c8d', marginTop: 4 },
  formCard: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#2c3e50', marginBottom: 12 },
  row: { marginBottom: 10 },
  rowSplit: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  split: { flex: 1 },
  input: { borderWidth: 1, borderColor: '#e1e5ea', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.select({ ios: 12, android: 10, default: 10 }), backgroundColor: '#fafafa', fontSize: 14, color: '#2c3e50' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#2F80ED', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  feed: { padding: 16 },
  postCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eef0f3' },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  postTitle: { fontSize: 16, fontWeight: '700', color: '#2c3e50' },
  postWhen: { fontSize: 12, color: '#7f8c8d' },
  postRoute: { fontSize: 13, color: '#34495e', marginBottom: 2 },
  postMeta: { fontSize: 12, color: '#7f8c8d' },
  postExtra: { fontSize: 12, color: '#7f8c8d', marginTop: 6 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  postMover: { fontSize: 13, color: '#2c3e50', fontWeight: '600' },
  phoneBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27ae60', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  phoneText: { color: '#fff', marginLeft: 6, fontSize: 12, fontWeight: '700' },
  phoneHidden: { fontSize: 12, color: '#95a5a6' },
});