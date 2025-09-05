import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Head from 'expo-router/head';
import AppHeader from '../components/AppHeader';

export default function MusteriPaneli() {
  const [name, setName] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const u = await AsyncStorage.getItem('userData');
        if (u) {
          const parsed = JSON.parse(u);
          setName(parsed.name || 'Müşteri');
        }
      } catch {}
    })();
  }, []);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <Head>
          <title>Müşteri Paneli | Sadece Nakliyat</title>
          <meta name="description" content="Müşteri paneli" />
        </Head>
        <AppHeader active="home" />
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Merhaba, {name}</Text>
          <Text style={styles.sub}>Buradan taleplerinizi takip edebilir, yeni talep oluşturabilirsiniz.</Text>
          {/* TODO: İlanlarım / Taleplerim bileşenleri eklenecek */}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7fb' },
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#2c3e50' },
  sub: { fontSize: 13, color: '#7f8c8d', marginTop: 6 },
});