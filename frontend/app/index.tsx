import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  TextInput,
  Alert,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  user_type: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_approved: boolean;
}

interface MovingRequest {
  id: string;
  customer_id: string;
  customer_name: string;
  from_location: string;
  to_location: string;
  from_floor: number;
  to_floor: number;
  has_elevator_from: boolean;
  has_elevator_to: boolean;
  needs_mobile_elevator: boolean;
  truck_distance: string;
  packing_service: boolean;
  moving_date: string;
  description?: string;
  status: string;
  selected_mover_id?: string;
  created_at: string;
}

export default function Index() {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'quote_request' | 'login' | 'register' | 'dashboard'>('welcome');
  const [userType, setUserType] = useState<'customer' | 'mover'>('customer');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    company_name: '',
    company_description: '',
    company_images: [] as string[], // Base64 images
  });

  const [verificationForm, setVerificationForm] = useState({
    email: '',
    email_code: '',
    phone_code: ''
  });

  // Quote request form (for non-members)
  const [quoteForm, setQuoteForm] = useState({
    customer_name: '',
    customer_phone: '',
    from_location: '',
    to_location: '',
    from_floor: 1,
    to_floor: 1,
    has_elevator_from: false,
    has_elevator_to: false,
    needs_mobile_elevator: false,
    truck_distance: '',
    packing_service: true,
    moving_date: '',
    description: ''
  });

  const [showVerification, setShowVerification] = useState(false);

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.access_token);
        await fetchUserProfile(data.access_token);
        setCurrentScreen('dashboard');
        Alert.alert('Başarılı', 'Giriş yapıldı!');
      } else {
        Alert.alert('Hata', data.detail || 'Giriş yapılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucu bağlantı hatası');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.name || !registerForm.email || !registerForm.phone || !registerForm.password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...registerForm,
          user_type: userType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationForm({
          email: registerForm.email,
          email_code: '',
          phone_code: ''
        });
        setShowVerification(true);
        Alert.alert('Başarılı', 'Kayıt oluşturuldu! Lütfen email ve telefon doğrulama kodlarınızı girin.');
      } else {
        Alert.alert('Hata', data.detail || 'Kayıt oluşturulamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucu bağlantı hatası');
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteRequest = async () => {
    if (!quoteForm.customer_name || !quoteForm.customer_phone || !quoteForm.from_location || !quoteForm.to_location || !quoteForm.moving_date) {
      Alert.alert('Hata', 'Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      // Store quote data and redirect to register
      setCurrentScreen('register');
      Alert.alert('Teklif İsteğiniz Alındı', 'Teklifleri görmek için lütfen kayıt olun ve giriş yapın.');
    } catch (error) {
      Alert.alert('Hata', 'Teklif gönderiminde hata oluştu');
      console.error('Quote error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (type: 'email' | 'phone') => {
    const code = type === 'email' ? verificationForm.email_code : verificationForm.phone_code;
    
    if (!code) {
      Alert.alert('Hata', 'Lütfen doğrulama kodunu girin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationForm.email,
          verification_code: code,
          verification_type: type,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Başarılı', data.message);
        if (type === 'phone') {
          setShowVerification(false);
          setCurrentScreen('login');
        }
      } else {
        Alert.alert('Hata', data.detail || 'Doğrulama başarısız');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucu bağlantı hatası');
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (authToken: string) => {
    try {
      setUser({
        id: '1',
        name: 'Test User',
        email: loginForm.email,
        phone: '555-0123',
        user_type: 'customer',
        is_active: true,
        is_email_verified: true,
        is_phone_verified: true,
        is_approved: true
      });
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setCurrentScreen('welcome');
    setLoginForm({ email: '', password: '' });
    setRegisterForm({ name: '', email: '', phone: '', password: '', company_name: '' });
  };

  const renderWelcomeScreen = () => (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.gradientBackground}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.welcomeContainer} showsVerticalScrollIndicator={false}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.logoContainer}>
                <View style={styles.logoIcon}>
                  <Ionicons name="home" size={50} color="#fff" />
                </View>
              </View>
              
              <Text style={styles.heroTitle}>Nakliyat Platformu</Text>
              <Text style={styles.heroSubtitle}>
                Türkiye'nin en güvenilir taşınma çözümü
              </Text>
              <Text style={styles.heroDescription}>
                Evini taşıtacaklar ile profesyonel nakliyecileri buluşturan platform
              </Text>
            </View>

            {/* Features Grid */}
            <View style={styles.featuresGrid}>
              <View style={styles.featureCard}>
                <Ionicons name="shield-checkmark" size={32} color="#4CAF50" />
                <Text style={styles.featureTitle}>Güvenli</Text>
                <Text style={styles.featureDesc}>Onaylı firmalar</Text>
              </View>
              
              <View style={styles.featureCard}>
                <Ionicons name="flash" size={32} color="#FF9800" />
                <Text style={styles.featureTitle}>Hızlı</Text>
                <Text style={styles.featureDesc}>Anında teklif</Text>
              </View>
              
              <View style={styles.featureCard}>
                <Ionicons name="people" size={32} color="#2196F3" />
                <Text style={styles.featureTitle}>Profesyonel</Text>
                <Text style={styles.featureDesc}>Uzman ekipler</Text>
              </View>
            </View>

            {/* CTA Section */}
            <View style={styles.ctaSection}>
              <TouchableOpacity
                style={styles.primaryCTA}
                onPress={() => setCurrentScreen('quote_request')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#56CCF2', '#2F80ED']}
                  style={styles.primaryCTAGradient}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#fff" />
                  <Text style={styles.primaryCTAText}>Ücretsiz Teklif Al</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>veya</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.authButtons}>
                <TouchableOpacity
                  style={styles.authButton}
                  onPress={() => setCurrentScreen('login')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.authButtonText}>Giriş Yap</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.authButton, styles.registerButton]}
                  onPress={() => setCurrentScreen('register')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.authButtonText, styles.registerButtonText]}>Kayıt Ol</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Trust Indicators */}
            <View style={styles.trustSection}>
              <View style={styles.trustItem}>
                <Ionicons name="star" size={20} color="#FFD700" />
                <Text style={styles.trustText}>4.8/5 Müşteri Memnuniyeti</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.trustText}>10,000+ Başarılı Taşınma</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="shield" size={20} color="#2196F3" />
                <Text style={styles.trustText}>%100 Güvenli Platform</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );

  const renderQuoteRequestScreen = () => (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#f8f9fa', '#e9ecef']}
        style={styles.gradientBackground}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentScreen('welcome')}
            >
              <Ionicons name="arrow-back" size={24} color="#2c3e50" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Teklif İsteği</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Ionicons name="document-text" size={32} color="#3498db" />
                <Text style={styles.formTitle}>Ücretsiz Teklif Al</Text>
                <Text style={styles.formSubtitle}>
                  Taşınma detaylarınızı doldurun, profesyonel nakliyecilerden teklif alın
                </Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="person" size={16} color="#7f8c8d" /> Adınız Soyadınız *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Adınızı soyadınızı girin"
                  value={quoteForm.customer_name}
                  onChangeText={(text) => setQuoteForm({...quoteForm, customer_name: text})}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="call" size={16} color="#7f8c8d" /> Telefon Numaranız *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Telefon numaranızı girin"
                  keyboardType="phone-pad"
                  value={quoteForm.customer_phone}
                  onChangeText={(text) => setQuoteForm({...quoteForm, customer_phone: text})}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="location" size={16} color="#7f8c8d" /> Nereden Taşınacak *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mevcut adresinizi girin"
                  value={quoteForm.from_location}
                  onChangeText={(text) => setQuoteForm({...quoteForm, from_location: text})}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="location-outline" size={16} color="#7f8c8d" /> Nereye Taşınacak *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Yeni adresinizi girin"
                  value={quoteForm.to_location}
                  onChangeText={(text) => setQuoteForm({...quoteForm, to_location: text})}
                />
              </View>
              
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Mevcut Kat</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Kat"
                    keyboardType="numeric"
                    value={quoteForm.from_floor.toString()}
                    onChangeText={(text) => setQuoteForm({...quoteForm, from_floor: parseInt(text) || 1})}
                  />
                </View>
                
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Yeni Kat</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Kat"
                    keyboardType="numeric"
                    value={quoteForm.to_floor.toString()}
                    onChangeText={(text) => setQuoteForm({...quoteForm, to_floor: parseInt(text) || 1})}
                  />
                </View>
              </View>
              
              <View style={styles.checkboxSection}>
                <Text style={styles.sectionTitle}>Ek Bilgiler</Text>
                
                <TouchableOpacity
                  style={styles.checkboxItem}
                  onPress={() => setQuoteForm({...quoteForm, has_elevator_from: !quoteForm.has_elevator_from})}
                >
                  <View style={[styles.checkbox, quoteForm.has_elevator_from && styles.checkboxActive]}>
                    {quoteForm.has_elevator_from && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Mevcut adreste asansör var</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.checkboxItem}
                  onPress={() => setQuoteForm({...quoteForm, has_elevator_to: !quoteForm.has_elevator_to})}
                >
                  <View style={[styles.checkbox, quoteForm.has_elevator_to && styles.checkboxActive]}>
                    {quoteForm.has_elevator_to && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Yeni adreste asansör var</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.checkboxItem}
                  onPress={() => setQuoteForm({...quoteForm, needs_mobile_elevator: !quoteForm.needs_mobile_elevator})}
                >
                  <View style={[styles.checkbox, quoteForm.needs_mobile_elevator && styles.checkboxActive]}>
                    {quoteForm.needs_mobile_elevator && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Mobil asansör gerekli</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.checkboxItem}
                  onPress={() => setQuoteForm({...quoteForm, packing_service: !quoteForm.packing_service})}
                >
                  <View style={[styles.checkbox, quoteForm.packing_service && styles.checkboxActive]}>
                    {quoteForm.packing_service && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Eşyalarımı kendim paketleyeceğim</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="calendar" size={16} color="#7f8c8d" /> Taşınma Tarihi *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="GG/AA/YYYY"
                  value={quoteForm.moving_date}
                  onChangeText={(text) => setQuoteForm({...quoteForm, moving_date: text})}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="chatbubble-ellipses" size={16} color="#7f8c8d" /> Ek Açıklama
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Eşyalar hakkında detay verebilirsiniz..."
                  multiline
                  numberOfLines={4}
                  value={quoteForm.description}
                  onChangeText={(text) => setQuoteForm({...quoteForm, description: text})}
                />
              </View>
              
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.disabledButton]}
                onPress={handleQuoteRequest}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={loading ? ['#bdc3c7', '#95a5a6'] : ['#56CCF2', '#2F80ED']}
                  style={styles.submitButtonGradient}
                >
                  {loading ? (
                    <Text style={styles.submitButtonText}>Gönderiliyor...</Text>
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Teklif İste</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <Text style={styles.noteText}>
                <Ionicons name="information-circle" size={14} color="#7f8c8d" /> 
                Teklif aldıktan sonra kayıt olmaya yönlendirileceksiniz
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );

  const renderLoginScreen = () => (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.authContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('welcome')}
          >
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>Hoş Geldiniz</Text>
            <Text style={styles.authSubtitle}>Hesabınıza giriş yapın</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Email adresinizi girin"
                keyboardType="email-address"
                autoCapitalize="none"
                value={loginForm.email}
                onChangeText={(text) => setLoginForm({...loginForm, email: text})}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Şifre</Text>
              <TextInput
                style={styles.input}
                placeholder="Şifrenizi girin"
                secureTextEntry
                value={loginForm.password}
                onChangeText={(text) => setLoginForm({...loginForm, password: text})}
              />
            </View>
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setCurrentScreen('register')}>
              <Text style={styles.linkText}>Hesabınız yok mu? Kayıt olun</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );

  const renderRegisterScreen = () => (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.authContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('welcome')}
          >
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>Hesap Oluştur</Text>
            <Text style={styles.authSubtitle}>Platformumuza katılın</Text>
            
            <View style={styles.userTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'customer' && styles.userTypeButtonActive
                ]}
                onPress={() => setUserType('customer')}
              >
                <Text style={[
                  styles.userTypeButtonText,
                  userType === 'customer' && styles.userTypeButtonTextActive
                ]}>
                  Müşteri
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'mover' && styles.userTypeButtonActive
                ]}
                onPress={() => setUserType('mover')}
              >
                <Text style={[
                  styles.userTypeButtonText,
                  userType === 'mover' && styles.userTypeButtonTextActive
                ]}>
                  Nakliyeci
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ad Soyad</Text>
              <TextInput
                style={styles.input}
                placeholder="Ad soyadınızı girin"
                value={registerForm.name}
                onChangeText={(text) => setRegisterForm({...registerForm, name: text})}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Email adresinizi girin"
                keyboardType="email-address"
                autoCapitalize="none"
                value={registerForm.email}
                onChangeText={(text) => setRegisterForm({...registerForm, email: text})}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefon</Text>
              <TextInput
                style={styles.input}
                placeholder="Telefon numaranızı girin"
                keyboardType="phone-pad"
                value={registerForm.phone}
                onChangeText={(text) => setRegisterForm({...registerForm, phone: text})}
              />
            </View>
            
            {userType === 'mover' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Şirket Adı</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Şirket adınızı girin"
                  value={registerForm.company_name}
                  onChangeText={(text) => setRegisterForm({...registerForm, company_name: text})}
                />
              </View>
            )}
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Şifre</Text>
              <TextInput
                style={styles.input}
                placeholder="Şifrenizi girin"
                secureTextEntry
                value={registerForm.password}
                onChangeText={(text) => setRegisterForm({...registerForm, password: text})}
              />
            </View>
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Kayıt Oluşturuluyor...' : 'Kayıt Ol'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setCurrentScreen('login')}>
              <Text style={styles.linkText}>Zaten hesabınız var mı? Giriş yapın</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );

  const renderVerificationScreen = () => (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.authContainer}>
        <Text style={styles.authTitle}>Hesap Doğrulama</Text>
        <Text style={styles.authSubtitle}>
          Email ve telefon numaranıza gönderilen doğrulama kodlarını girin
        </Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email Doğrulama Kodu</Text>
          <TextInput
            style={styles.input}
            placeholder="Email kodunu girin"
            keyboardType="numeric"
            value={verificationForm.email_code}
            onChangeText={(text) => setVerificationForm({...verificationForm, email_code: text})}
          />
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => handleVerification('email')}
          >
            <Text style={styles.verifyButtonText}>Email Doğrula</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Telefon Doğrulama Kodu</Text>
          <TextInput
            style={styles.input}
            placeholder="Telefon kodunu girin"
            keyboardType="numeric"
            value={verificationForm.phone_code}
            onChangeText={(text) => setVerificationForm({...verificationForm, phone_code: text})}
          />
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => handleVerification('phone')}
          >
            <Text style={styles.verifyButtonText}>Telefon Doğrula</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  const renderDashboard = () => (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nakliyat Platformu</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#2c3e50" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.dashboardContainer}>
        <Text style={styles.welcomeText}>Hoş geldiniz!</Text>
        <Text style={styles.userInfoText}>
          Kullanıcı Tipi: {user?.user_type === 'customer' ? 'Müşteri' : 'Nakliyeci'}
        </Text>
        
        <View style={styles.dashboardGrid}>
          <TouchableOpacity style={styles.dashboardCard}>
            <Ionicons name="add-circle" size={40} color="#3498db" />
            <Text style={styles.dashboardCardTitle}>
              {user?.user_type === 'customer' ? 'Talep Oluştur' : 'Talepleri Gör'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dashboardCard}>
            <Ionicons name="list" size={40} color="#e74c3c" />
            <Text style={styles.dashboardCardTitle}>
              {user?.user_type === 'customer' ? 'Taleplerim' : 'Tekliflerim'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dashboardCard}>
            <Ionicons name="person" size={40} color="#27ae60" />
            <Text style={styles.dashboardCardTitle}>Profil</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dashboardCard}>
            <Ionicons name="chatbubble" size={40} color="#f39c12" />
            <Text style={styles.dashboardCardTitle}>Mesajlar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  if (showVerification) {
    return renderVerificationScreen();
  }

  switch (currentScreen) {
    case 'welcome':
      return renderWelcomeScreen();
    case 'quote_request':
      return renderQuoteRequestScreen();
    case 'login':
      return renderLoginScreen();
    case 'register':
      return renderRegisterScreen();
    case 'dashboard':
      return renderDashboard();
    default:
      return renderWelcomeScreen();
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  welcomeContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  featureCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  ctaSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  primaryCTA: {
    width: '100%',
    marginBottom: 24,
  },
  primaryCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryCTAText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  authButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  authButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  registerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerButtonText: {
    color: '#2c3e50',
  },
  trustSection: {
    alignItems: 'center',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trustText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  placeholder: {
    width: 24,
  },
  backButton: {
    padding: 8,
  },
  formContainer: {
    padding: 20,
    flexGrow: 1,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfWidth: {
    width: '48%',
  },
  checkboxSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  checkboxActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
    fontWeight: '500',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginBottom: 16,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  noteText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authContainer: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  authCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 32,
  },
  userTypeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  userTypeButtonActive: {
    backgroundColor: '#3498db',
  },
  userTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  userTypeButtonTextActive: {
    color: '#fff',
  },
  linkText: {
    color: '#3498db',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dashboardContainer: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  userInfoText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 32,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dashboardCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dashboardCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginTop: 12,
  },
});