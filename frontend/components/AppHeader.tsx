import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

const LOGO_URI = 'https://customer-assets.emergentagent.com/job_easymove/artifacts/xwprnnjo_Ads%C4%B1z%20tasar%C4%B1m.png';

interface Props {
  active?: 'home' | 'sadece-nakliyat' | 'quote' | 'yonetim';
}

export default function AppHeader({ active = 'home' }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const maxWidth = isDesktop ? 1000 : isTablet ? 720 : '100%';

  const NavBtn = ({ label, route, isActive }: { label: string; route: string; isActive?: boolean }) => (
    <TouchableOpacity onPress={() => router.push(route)} style={[styles.navBtn, isActive && styles.navBtnActive]} activeOpacity={0.85}>
      <Text style={[styles.navBtnText, isActive && styles.navBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper}>
      <View style={[styles.inner, { maxWidth }]}> 
        <TouchableOpacity style={styles.brandWrap} onPress={() => router.push('/')} activeOpacity={0.85}>
          <Image source={{ uri: LOGO_URI }} style={styles.logoImage} contentFit="cover" />
          <Text style={styles.brandText}>Sadece Nakliyat</Text>
        </TouchableOpacity>
        <View style={styles.actions}>
          <NavBtn label="Anasayfa" route="/" isActive={active === 'home'} />
          <NavBtn label="Sadece Nakliyat" route="/sadece-nakliyat" isActive={active === 'sadece-nakliyat'} />
          <NavBtn label="Ücretsiz Teklif Al" route="/" isActive={active === 'quote'} />
          <NavBtn label="Yönetim" route="/yonetim" isActive={active === 'yonetim'} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  brandText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 4,
  },
  navBtnActive: {
    backgroundColor: 'rgba(47,128,237,0.08)',
  },
  navBtnText: {
    color: '#2c3e50',
    fontSize: 13,
    fontWeight: '700',
  },
  navBtnTextActive: {
    color: '#2F80ED',
  },
});