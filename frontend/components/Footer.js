import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const Footer = ({ onNavigate }) => {
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [distance, setDistance] = useState('');
  const [calculating, setCalculating] = useState(false);

  // Türkiye'nin büyük şehirleri ve koordinatları
  const cities = {
    'İstanbul': { lat: 41.0082, lng: 28.9784 },
    'Ankara': { lat: 39.9334, lng: 32.8597 },
    'İzmir': { lat: 38.4192, lng: 27.1287 },
    'Bursa': { lat: 40.1826, lng: 29.0665 },
    'Antalya': { lat: 36.8969, lng: 30.7133 },
    'Adana': { lat: 37.0000, lng: 35.3213 },
    'Konya': { lat: 37.8667, lng: 32.4833 },
    'Gaziantep': { lat: 37.0662, lng: 37.3833 },
    'Mersin': { lat: 36.8000, lng: 34.6333 },
    'Diyarbakır': { lat: 37.9144, lng: 40.2306 },
    'Kayseri': { lat: 38.7312, lng: 35.4787 },
    'Eskişehir': { lat: 39.7767, lng: 30.5206 },
    'Trabzon': { lat: 41.0015, lng: 39.7178 },
    'Samsun': { lat: 41.2928, lng: 36.3313 },
    'Malatya': { lat: 38.3552, lng: 38.3095 }
  };

  // Haversine formülü ile mesafe hesaplama
  const calculateDistance = () => {
    const from = cities[fromCity];
    const to = cities[toCity];
    
    if (!from || !to) {
      setDistance('Şehir bulunamadı');
      return;
    }

    if (fromCity === toCity) {
      setDistance('0 km');
      return;
    }

    setCalculating(true);
    
    // Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lng - from.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    setTimeout(() => {
      setDistance(Math.round(distance) + ' km');
      setCalculating(false);
    }, 500);
  };

  const openURL = (url) => {
    Linking.openURL(url);
  };

  return (
    <View style={styles.footer}>
      {/* Distance Calculator */}
      <View style={styles.calculatorSection}>
        <Text style={styles.sectionTitle}>Şehirler Arası Mesafe Hesaplayıcı</Text>
        <View style={styles.calculatorRow}>
          <TextInput
            style={styles.cityInput}
            placeholder="Nereden?"
            placeholderTextColor="#95a5a6"
            value={fromCity}
            onChangeText={setFromCity}
          />
          <Ionicons name="arrow-forward" size={20} color="#3498db" />
          <TextInput
            style={styles.cityInput}
            placeholder="Nereye?"
            placeholderTextColor="#95a5a6"
            value={toCity}
            onChangeText={setToCity}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.calculateButton} 
          onPress={calculateDistance}
          disabled={calculating}
        >
          <Text style={styles.calculateButtonText}>
            {calculating ? 'Hesaplanıyor...' : 'Mesafe Hesapla'}
          </Text>
        </TouchableOpacity>
        
        {distance ? (
          <View style={styles.distanceResult}>
            <Ionicons name="location" size={16} color="#27ae60" />
            <Text style={styles.distanceText}>Mesafe: {distance}</Text>
          </View>
        ) : null}
        
        <Text style={styles.cityList}>
          Desteklenen şehirler: İstanbul, Ankara, İzmir, Bursa, Antalya, Adana, Konya, Gaziantep...
        </Text>
      </View>

      {/* Main Footer Content */}
      <View style={styles.footerContent}>
        {/* Company Info */}
        <View style={styles.footerColumn}>
          <Text style={styles.columnTitle}>Nakliyat Platformu</Text>
          <Text style={styles.footerText}>
            Türkiye'nin en güvenilir nakliyat hizmeti. Uzman ekibimizle güvenli taşımacılık.
          </Text>
          
          <View style={styles.socialLinks}>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => openURL('tel:+905xxxxxxxxx')}
            >
              <Ionicons name="call" size={20} color="#3498db" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => openURL('mailto:info@nakliyat.com')}
            >
              <Ionicons name="mail" size={20} color="#3498db" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => openURL('https://wa.me/905xxxxxxxxx')}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.footerColumn}>
          <Text style={styles.columnTitle}>Hızlı Linkler</Text>
          
          <TouchableOpacity 
            style={styles.footerLink}
            onPress={() => onNavigate('quote_request')}
          >
            <Text style={styles.footerLinkText}>Teklif Al</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.footerLink}
            onPress={() => onNavigate('register')}
          >
            <Text style={styles.footerLinkText}>Kayıt Ol</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.footerLink}
            onPress={() => onNavigate('login')}
          >
            <Text style={styles.footerLinkText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>

        {/* Services */}
        <View style={styles.footerColumn}>
          <Text style={styles.columnTitle}>Hizmetlerimiz</Text>
          
          <Text style={styles.serviceItem}>🏠 Ev Taşımacılığı</Text>
          <Text style={styles.serviceItem}>🏢 Ofis Taşımacılığı</Text>
          <Text style={styles.serviceItem}>📦 Ambalajlama</Text>
          <Text style={styles.serviceItem}>🚛 Şehirler Arası</Text>
          <Text style={styles.serviceItem}>🏗️ Nakliye Araç Kiralama</Text>
        </View>

        {/* Contact Info */}
        <View style={styles.footerColumn}>
          <Text style={styles.columnTitle}>İletişim</Text>
          
          <View style={styles.contactItem}>
            <Ionicons name="call" size={16} color="#3498db" />
            <Text style={styles.contactText}>0850 xxx xx xx</Text>
          </View>
          
          <View style={styles.contactItem}>
            <Ionicons name="mail" size={16} color="#3498db" />
            <Text style={styles.contactText}>info@nakliyat.com</Text>
          </View>
          
          <View style={styles.contactItem}>
            <Ionicons name="location" size={16} color="#3498db" />
            <Text style={styles.contactText}>İstanbul, Türkiye</Text>
          </View>
          
          <View style={styles.contactItem}>
            <Ionicons name="time" size={16} color="#3498db" />
            <Text style={styles.contactText}>7/24 Destek</Text>
          </View>
        </View>
      </View>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <Text style={styles.copyrightText}>
          © 2024 Nakliyat Platformu. Tüm hakları saklıdır.
        </Text>
        <View style={styles.bottomLinks}>
          <TouchableOpacity>
            <Text style={styles.bottomLinkText}>Gizlilik</Text>
          </TouchableOpacity>
          <Text style={styles.separator}>•</Text>
          <TouchableOpacity>
            <Text style={styles.bottomLinkText}>Şartlar</Text>
          </TouchableOpacity>
          <Text style={styles.separator}>•</Text>
          <TouchableOpacity>
            <Text style={styles.bottomLinkText}>KVKK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#2c3e50',
    paddingTop: 32,
  },
  
  // Calculator Section
  calculatorSection: {
    backgroundColor: '#34495e',
    padding: 20,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  calculatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cityInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    marginHorizontal: 4,
    color: '#2c3e50',
  },
  calculateButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  distanceResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 12,
  },
  distanceText: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cityList: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  
  // Main Footer
  footerContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  footerColumn: {
    width: '50%',
    paddingRight: 16,
    marginBottom: 24,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  
  // Social Links
  socialLinks: {
    flexDirection: 'row',
  },
  socialButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  
  // Footer Links
  footerLink: {
    marginBottom: 8,
  },
  footerLinkText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  
  // Services
  serviceItem: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  
  // Contact
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginLeft: 8,
  },
  
  // Bottom Bar
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  copyrightText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  bottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomLinkText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  separator: {
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 8,
    fontSize: 12,
  },
});

export default Footer;