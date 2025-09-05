import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import AppHeader from '../components/AppHeader';

const BACKEND_URL = (process.env.EXPO_BACKEND_URL as string) || '';

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

export default function SadeceNakliyatScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const maxWidth = isDesktop ? 1000 : isTablet ? 720 : '100%';

  const [user, setUser] = React.useState<User | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [posts, setPosts] = React.useState<LivePost[]>([]);
  const [error, setError] = React.useState('');
  const [visibleCount, setVisibleCount] = React.useState(8);

  // Polling disabled for web stability. Manual refresh only.
  const pollTimer = React.useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = React.useRef<boolean>(true);
  const isTypingRef = React.useRef<boolean>(false);
  const abortRef = React.useRef<AbortController | null>(null);

  const clearPoll = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current as any);
      pollTimer.current = null;
    }
  };

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
    if (!isActiveRef.current) return;
    try {
      const endpoint = user && (user.user_type === 'mover' || user.user_type === 'admin') ? '/api/live-feed/full' : '/api/live-feed';
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Feed yüklenemedi');
      const data = await res.json();
      setPosts(data);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadSession().then(() => {
      setLoading(true);
      fetchFeed();
    });
    const sub = AppState.addEventListener('change', (s) => {
      const active = s === 'active';
      isActiveRef.current = active;
      if (active) {
        fetchFeed();
      } else {
        clearPoll();
      }
    });
    return () => {
      sub.remove();
      clearPoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchFeed();
    } finally {
      setRefreshing(false);
    }
  };

  const showMore = () => setVisibleCount((c) => c + 8);

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
          Authorization: `Bearer ${token}`,
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
      <View key={p.id} style={[styles.postCard, isDesktop && styles.postCardDesktop]}>
        <View style={styles.postHeader}>
          <Text style={styles.postTitle}>{p.title}</Text>
          <Text style={styles.postWhen}>{p.when || ''}</Text>
        </View>
        <Text style={styles.postRoute}>
          {(p.from_location || '-') + ' → ' + (p.to_location || '-')}
        </Text>
        {p.vehicle ? (
          <View style={styles.metaRow}>
            <Ionicons name="car" size={14} color="#7f8c8d" />
            <Text style={styles.postMeta}>Araç: {p.vehicle}</Text>
          </View>
        ) : null}
        {p.price_note ? (
          <View style={styles.metaRow}>
            <Ionicons name="pricetag" size={14} color="#7f8c8d" />
            <Text style={styles.postMeta}>Not/Fiyat: {p.price_note}</Text>
          </View>
        ) : null}
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

  const EmptyState = () => (
    <View style={styles.emptyBox}>
      <Ionicons name="chatbubbles-outline" size={28} color="#95a5a6" />
      <Text style={styles.emptyTitle}>Henüz paylaşım yok</Text>
      <Text style={styles.emptySub}>Nakliyeciler paylaştıkça burada listelenecek.</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: 'height', default: undefined })} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <Head>
          <title>Sadece Nakliyat | Canlı Akış</title>
          <meta name="description" content="Türkiye'nin En Pratik Nakliye Portalı" />
        </Head>
        <AppHeader active="sadece-nakliyat" />
        <View style={styles.page}>
          <View style={[styles.maxWidth, { maxWidth }]}> 
            <View style={styles.header}>
              <Text style={[styles.headerTitle, isDesktop && { fontSize: 22 }]}>Canlı Akış</Text>
              <Text style={styles.headerSub}>Nakliyecilerin anlık paylaşımları</Text>
            </View>

            <FlatList
              data={posts.slice(0, visibleCount)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderPost(item)}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode={Platform.select({ ios: 'on-drag', default: 'on-drag' })}
              scrollEnabled
              removeClippedSubviews={false}
              style={{ flex: 1 }}
              contentContainerStyle={[styles.feed, { paddingBottom: 24 }]}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListHeaderComponent={(
                <View>
                  {user?.user_type === 'mover' && (
                    <View style={styles.formCard}>
                      <Text style={styles.formTitle}>Yeni İlan Paylaş</Text>
                      <View style={styles.row}>
                        <TextInput editable style={styles.input} placeholder="Başlık" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
                      </View>
                      <View style={styles.rowSplit}>
                        <View style={[styles.split, { marginRight: 8 }]}>
                          <TextInput style={styles.input} placeholder="Nereden" value={form.from_location} onChangeText={(v) => setForm({ ...form, from_location: v })} />
                        </View>
                        <View style={[styles.split, { marginLeft: 8 }]}>
                          <TextInput style={styles.input} placeholder="Nereye" value={form.to_location} onChangeText={(v) => setForm({ ...form, to_location: v })} />
                        </View>
                      </View>
                      <View style={styles.rowSplit}>
                        <View style={[styles.split, { marginRight: 8 }]}>
                          <TextInput style={styles.input} placeholder="Ne zaman" value={form.when} onChangeText={(v) => setForm({ ...form, when: v })} />
                        </View>
                        <View style={[styles.split, { marginLeft: 8 }]}>
                          <TextInput style={styles.input} placeholder="Araç" value={form.vehicle} onChangeText={(v) => setForm({ ...form, vehicle: v })} />
                        </View>
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
                      <TouchableOpacity onPress={submitPost} activeOpacity={0.9} disabled={submitting}>
                        <LinearGradient colors={['#6A11CB', '#2575FC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.submitBtn, submitting && { opacity: 0.6 }]}>
                          <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={styles.submitText}>{submitting ? 'Gönderiliyor...' : 'Paylaş'}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}
                  {loading && <ActivityIndicator style={{ marginTop: 24 }} />}
                  {!loading && posts.length === 0 && <EmptyState />}
                </View>
              )}
              ListFooterComponent={(
                !loading && posts.length > visibleCount ? (
                  <TouchableOpacity onPress={showMore} activeOpacity={0.9} style={styles.loadMoreBtn}>
                    <Text style={styles.loadMoreText}>Daha Fazla Göster</Text>
                  </TouchableOpacity>
                ) : null
              )}
              initialNumToRender={8}
              windowSize={8}
            />
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7fb' },
  page: { flex: 1, alignItems: 'center' },
  maxWidth: { width: '100%', alignSelf: 'center' },

  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#2c3e50' },
  headerSub: { fontSize: 13, color: '#7f8c8d', marginTop: 4 },

  formCard: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee', pointerEvents: 'auto' },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#2c3e50', marginBottom: 12 },
  row: { marginBottom: 10 },
  rowSplit: { flexDirection: 'row', marginBottom: 10 },
  split: { flex: 1 },
  input: { borderWidth: 1, borderColor: '#e1e5ea', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.select({ ios: 12, android: 10, default: 10 }), backgroundColor: '#fafafa', fontSize: 14, color: '#2c3e50' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, marginTop: 2 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  feed: { paddingHorizontal: 16, paddingTop: 16 },
  postCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eef0f3' },
  postCardDesktop: { padding: 16 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  postTitle: { fontSize: 16, fontWeight: '800', color: '#2c3e50' },
  postWhen: { fontSize: 12, color: '#7f8c8d' },
  postRoute: { fontSize: 13, color: '#34495e', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  postMeta: { fontSize: 12, color: '#7f8c8d', marginLeft: 6 },
  postExtra: { fontSize: 12, color: '#7f8c8d', marginTop: 6 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  postMover: { fontSize: 13, color: '#2c3e50', fontWeight: '700' },
  phoneBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27ae60', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  phoneText: { color: '#fff', marginLeft: 6, fontSize: 12, fontWeight: '700' },
  phoneHidden: { fontSize: 12, color: '#95a5a6' },

  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eef0f3' },
  emptyTitle: { marginTop: 8, fontSize: 15, fontWeight: '700', color: '#2c3e50' },
  emptySub: { marginTop: 2, fontSize: 12, color: '#7f8c8d' },

  loadMoreBtn: { marginTop: 8, marginBottom: 12, backgroundColor: '#2F80ED', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  loadMoreText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});