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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'login' | 'register' | 'dashboard'>('welcome');
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
    company_name: ''
  });

  const [verificationForm, setVerificationForm] = useState({
    email: '',
    email_code: '',
    phone_code: ''
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
      // For now, we'll skip fetching user profile and just set basic info
      // In a real app, you'd make an API call to get user profile
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
    <SafeAreaView style={styles.container}>
      <View style={styles.welcomeContainer}>
        <Ionicons name="home" size={80} color="#007AFF" />
        <Text style={styles.welcomeTitle}>Nakliyat Platformu</Text>
        <Text style={styles.welcomeSubtitle}>
          Evini taşıtacaklar ile nakliyecileri buluşturan platform
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setCurrentScreen('login')}
          >
            <Text style={styles.primaryButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentScreen('register')}
          >
            <Text style={styles.secondaryButtonText}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  const renderLoginScreen = () => (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.formContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentScreen('welcome')}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <Text style={styles.formTitle}>Giriş Yap</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Email adresinizi girin"
            keyboardType="email-address"
            autoCapitalize="none"
            value={loginForm.email}
            onChangeText={(text) => setLoginForm({...loginForm, email: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Şifre</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Şifrenizi girin"
            secureTextEntry
            value={loginForm.password}
            onChangeText={(text) => setLoginForm({...loginForm, password: text})}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setCurrentScreen('register')}>
          <Text style={styles.linkText}>Hesabınız yok mu? Kayıt olun</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  const renderRegisterScreen = () => (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.formContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentScreen('welcome')}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <Text style={styles.formTitle}>Kayıt Ol</Text>
        
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
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Ad Soyad</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ad soyadınızı girin"
            value={registerForm.name}
            onChangeText={(text) => setRegisterForm({...registerForm, name: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Email adresinizi girin"
            keyboardType="email-address"
            autoCapitalize="none"
            value={registerForm.email}
            onChangeText={(text) => setRegisterForm({...registerForm, email: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Telefon</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Telefon numaranızı girin"
            keyboardType="phone-pad"
            value={registerForm.phone}
            onChangeText={(text) => setRegisterForm({...registerForm, phone: text})}
          />
        </View>
        
        {userType === 'mover' && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Şirket Adı</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Şirket adınızı girin"
              value={registerForm.company_name}
              onChangeText={(text) => setRegisterForm({...registerForm, company_name: text})}
            />
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Şifre</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Şifrenizi girin"
            secureTextEntry
            value={registerForm.password}
            onChangeText={(text) => setRegisterForm({...registerForm, password: text})}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Kayıt Oluşturuluyor...' : 'Kayıt Ol'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setCurrentScreen('login')}>
          <Text style={styles.linkText}>Zaten hesabınız var mı? Giriş yapın</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  const renderVerificationScreen = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Hesap Doğrulama</Text>
        <Text style={styles.formSubtitle}>
          Email ve telefon numaranıza gönderilen doğrulama kodlarını girin
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Doğrulama Kodu</Text>
          <TextInput
            style={styles.textInput}
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
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Telefon Doğrulama Kodu</Text>
          <TextInput
            style={styles.textInput}
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nakliyat Platformu</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.dashboardContainer}>
        <Text style={styles.welcomeText}>Hoş geldiniz!</Text>
        <Text style={styles.userInfoText}>
          Kullanıcı Tipi: {user?.user_type === 'customer' ? 'Müşteri' : 'Nakliyeci'}
        </Text>
        
        <View style={styles.featureGrid}>
          <TouchableOpacity style={styles.featureCard}>
            <Ionicons name="add-circle" size={40} color="#007AFF" />
            <Text style={styles.featureTitle}>
              {user?.user_type === 'customer' ? 'Talep Oluştur' : 'Talepleri Gör'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.featureCard}>
            <Ionicons name="list" size={40} color="#007AFF" />
            <Text style={styles.featureTitle}>
              {user?.user_type === 'customer' ? 'Taleplerim' : 'Tekliflerim'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.featureCard}>
            <Ionicons name="person" size={40} color="#007AFF" />
            <Text style={styles.featureTitle}>Profil</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.featureCard}>
            <Ionicons name="chatbubble" size={40} color="#007AFF" />
            <Text style={styles.featureTitle}>Mesajlar</Text>
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
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
  formContainer: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  userTypeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'hidden',
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
  },
  userTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  userTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  userTypeButtonTextActive: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  verifyButton: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    color: '#1a1a1a',
  },
  dashboardContainer: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  userInfoText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 8,
  },
});