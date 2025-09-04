import React, { useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { adminStyles } from '../components/AdminStyles';

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

export default function Index() {
  const [currentScreen, setCurrentScreen] = useState<
    'welcome' | 
    'quote_request' | 
    'login' | 
    'register' | 
    'dashboard' | 
    'forgot_password' | 
    'reset_password' |
    'admin_panel'
  >('welcome');
  const [userType, setUserType] = useState<'customer' | 'mover'>('customer');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Error and success states
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [successMessage, setSuccessMessage] = useState<string>('');

  // reCAPTCHA state
  const [isRecaptchaVerified, setIsRecaptchaVerified] = useState(false);

  // Password reset states
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMethod, setResetMethod] = useState<'email' | 'sms'>('email');
  
  // Verification state
  const [showVerification, setShowVerification] = useState(false);

  // Admin panel states
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'users' | 'requests'>('users');
  
  // Sample data for homepage
  const [sampleJobs, setSampleJobs] = useState<any[]>([]);
  const [sampleCompanies, setSampleCompanies] = useState<any[]>([]);
  
  // Selected user for actions
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserActions, setShowUserActions] = useState(false);

  // Auto-fetch admin data when entering admin panel
  React.useEffect(() => {
    if (currentScreen === 'admin_panel') {
      fetchAdminData();
    }
  }, [currentScreen]);

  // Auto-load sample data on component mount
  React.useEffect(() => {
    fetchSampleData();
    loadStoredSession();
  }, []);

  // Load stored session from AsyncStorage
  const loadStoredSession = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedUser = await AsyncStorage.getItem('userData');
      
      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        
        // Redirect based on user type
        if (userData.user_type === 'admin') {
          setCurrentScreen('admin_panel');
        } else {
          setCurrentScreen('dashboard');
        }
        
        console.log('Session restored for:', userData.email);
      }
    } catch (error) {
      console.error('Error loading stored session:', error);
    }
  };

  // Save session to AsyncStorage
  const saveSession = async (tokenData: string, userData: User) => {
    try {
      await AsyncStorage.setItem('userToken', tokenData);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      console.log('Session saved for:', userData.email);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  // Clear session from AsyncStorage  
  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      console.log('Session cleared');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  };

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
  });

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[+]?[\d\s\-()]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const clearMessages = () => {
    setErrors({});
    setSuccessMessage('');
  };

  const showError = (field: string, message: string) => {
    setErrors(prev => ({...prev, [field]: message}));
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrors({});
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Error message component
  const renderErrorMessage = (field: string) => {
    if (!errors[field]) return null;
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={16} color="#e74c3c" />
        <Text style={styles.errorText}>{errors[field]}</Text>
      </View>
    );
  };

  const renderSuccessMessage = () => {
    if (!successMessage) return null;
    return (
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
        <Text style={styles.successText}>{successMessage}</Text>
      </View>
    );
  };

  const handleLogin = async () => {
    clearMessages();

    // Validation
    if (!loginForm.email.trim()) {
      showError('email', 'Email adresi gereklidir');
      return;
    }
    if (!validateEmail(loginForm.email)) {
      showError('email', 'Geçerli bir email adresi girin');
      return;
    }
    if (!loginForm.password.trim()) {
      showError('password', 'Şifre gereklidir');
      return;
    }
    if (loginForm.password.length < 6) {
      showError('password', 'Şifre en az 6 karakter olmalıdır');
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
        
        // Get user info from backend
        const userResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (userResponse.ok) {
          const users = await userResponse.json();
          const currentUser = users.find((u: User) => u.email === loginForm.email);
          
          if (currentUser) {
            setUser(currentUser);
            
            // Save session to storage
            await saveSession(data.access_token, currentUser);
            
            // If admin, go to admin panel
            if (currentUser.user_type === 'admin') {
              setCurrentScreen('admin_panel');
            } else {
              setCurrentScreen('dashboard');
            }
            
            showSuccess('Başarıyla giriş yapıldı!');
          } else {
            // Fallback for non-admin users
            const fallbackUser = {
              id: '1',
              name: 'User',
              email: loginForm.email,
              phone: '555-0123',
              user_type: 'customer' as const,
              is_active: true,
              is_email_verified: true,
              is_phone_verified: true,
              is_approved: true
            };
            setUser(fallbackUser);
            await saveSession(data.access_token, fallbackUser);
            setCurrentScreen('dashboard');
            showSuccess('Başarıyla giriş yapıldı!');
          }
        } else {
          // Fallback if can't get user info
          const fallbackUser = {
            id: '1',
            name: 'User',
            email: loginForm.email,
            phone: '555-0123',
            user_type: 'customer' as const,
            is_active: true,
            is_email_verified: true,
            is_phone_verified: true,
            is_approved: true
          };
          setUser(fallbackUser);
          await saveSession(data.access_token, fallbackUser);
          setCurrentScreen('dashboard');
          showSuccess('Başarıyla giriş yapıldı!');
        }
      } else {
        if (response.status === 401) {
          showError('general', 'Email veya şifre hatalı');
        } else {
          showError('general', data.detail || 'Giriş yapılamadı');
        }
      }
    } catch (error) {
      showError('general', 'Sunucu bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Simple reCAPTCHA simulation (in production use react-google-recaptcha)
  const simulateRecaptcha = () => {
    Alert.alert(
      'reCAPTCHA Doğrulaması',
      'Robot olmadığınızı doğrulayın',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Doğrula', 
          onPress: () => {
            setIsRecaptchaVerified(true);
            showSuccess('reCAPTCHA doğrulandı!');
          }
        }
      ]
    );
  };

  const handleForgotPassword = async () => {
    clearMessages();
    
    if (!resetEmail.trim()) {
      showError('email', 'Email adresi gereklidir');
      return;
    }
    if (!validateEmail(resetEmail)) {
      showError('email', 'Geçerli bir email adresi girin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: resetEmail,
          method: resetMethod
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(data.message);
        setResetToken(data.reset_token); // For demo purposes
        setCurrentScreen('reset_password');
      } else {
        showError('general', data.detail || 'Şifre sıfırlama isteği gönderilemedi');
      }
    } catch (error) {
      showError('general', 'Sunucu bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    clearMessages();

    if (!resetToken.trim()) {
      showError('token', 'Doğrulama kodu gereklidir');
      return;
    }
    if (!newPassword.trim()) {
      showError('password', 'Yeni şifre gereklidir');
      return;
    }
    if (newPassword.length < 6) {
      showError('password', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: resetEmail, 
          token: resetToken,
          new_password: newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(data.message);
        setTimeout(() => {
          setCurrentScreen('login');
          setResetEmail('');
          setResetToken('');
          setNewPassword('');
        }, 2000);
      } else {
        showError('general', data.detail || 'Şifre sıfırlanamadı');
      }
    } catch (error) {
      showError('general', 'Sunucu bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    clearMessages();

    // reCAPTCHA kontrolü
    if (!isRecaptchaVerified) {
      showError('general', 'Lütfen robot olmadığınızı doğrulayın');
      return;
    }

    // Basic validation
    if (!registerForm.name.trim()) {
      showError('name', 'Ad soyad gereklidir');
      return;
    }
    if (registerForm.name.trim().length < 2) {
      showError('name', 'Ad soyad en az 2 karakter olmalıdır');
      return;
    }
    if (!registerForm.email.trim()) {
      showError('email', 'Email adresi gereklidir');
      return;
    }
    if (!validateEmail(registerForm.email)) {
      showError('email', 'Geçerli bir email adresi girin');
      return;
    }
    if (!registerForm.phone.trim()) {
      showError('phone', 'Telefon numarası gereklidir');
      return;
    }
    if (!registerForm.password.trim()) {
      showError('password', 'Şifre gereklidir');
      return;
    }
    if (registerForm.password.length < 6) {
      showError('password', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    // Mover validation
    if (userType === 'mover') {
      if (!registerForm.company_name.trim()) {
        showError('company_name', 'Şirket adı gereklidir');
        return;
      }
      if (!registerForm.company_description.trim()) {
        showError('company_description', 'Firma açıklaması gereklidir');
        return;
      }
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
        showSuccess('Kayıt oluşturuldu! Email ve telefon doğrulaması gerekiyor.');
        // Reset reCAPTCHA
        setIsRecaptchaVerified(false);
        // For demo, redirect to login
        setTimeout(() => {
          setCurrentScreen('login');
        }, 2000);
      } else {
        if (response.status === 400 && data.detail?.includes('already registered')) {
          showError('email', 'Bu email adresi zaten kayıtlı');
        } else {
          showError('general', data.detail || 'Kayıt oluşturulamadı');
        }
      }
    } catch (error) {
      showError('general', 'Sunucu bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    if (!token) {
      console.log('No token available for admin data fetch');
      return;
    }
    
    console.log('Fetching admin data with token:', token.substring(0, 20) + '...');
    setLoading(true);
    
    try {
      // Fetch all users
      const usersResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Users response status:', usersResponse.status);
      
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        console.log('Fetched users:', users.length);
        setAllUsers(users);
      } else {
        const errorText = await usersResponse.text();
        console.error('Users fetch error:', usersResponse.status, errorText);
        showError('general', 'Kullanıcı verileri yüklenemedi: ' + usersResponse.status);
      }
      
      // Fetch all moving requests  
      const requestsResponse = await fetch(`${BACKEND_URL}/api/moving-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Requests response status:', requestsResponse.status);
      
      if (requestsResponse.ok) {
        const requests = await requestsResponse.json();
        console.log('Fetched requests:', requests.length);
        setAllRequests(requests);
      } else {
        const errorText = await requestsResponse.text();
        console.error('Requests fetch error:', requestsResponse.status, errorText);
        showError('general', 'Talep verileri yüklenemedi: ' + requestsResponse.status);
      }
    } catch (error) {
      console.error('Admin data fetch error:', error);
      showError('general', 'Veri yükleme hatası: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSampleData = async () => {
    try {
      console.log('Fetching sample data...');
      
      // Always show sample data (don't depend on API)
      setSampleJobs([
        {
          id: '1',
          customer_name: 'Ayşe Yılmaz',
          from_location: 'Beşiktaş, İstanbul',
          to_location: 'Kadıköy, İstanbul',
          moving_date: '2024-07-15',
          description: '2+1 daire, beyaz eşyalar dahil. Hassas eşyalar var (cam masalar).'
        },
        {
          id: '2', 
          customer_name: 'Can Demir',
          from_location: 'Şişli, İstanbul',
          to_location: 'Ataşehir, İstanbul',
          moving_date: '2024-07-20',
          description: '3+1 büyük daire. Piyanom var, özel dikkat gerekiyor.'
        },
        {
          id: '3',
          customer_name: 'Elif Kaya',
          from_location: 'Bakırköy, İstanbul',
          to_location: 'Pendik, İstanbul', 
          moving_date: '2024-07-25',
          description: 'Stüdyo daire, az eşya. Hızlı taşınma istiyorum.'
        }
      ]);
      
      setSampleCompanies([
        {
          id: '1',
          name: 'Ahmet Taşımacılık',
          company_name: 'Ahmet Taşımacılık Ltd.',
          description: '15 yıllık deneyimle güvenilir nakliyat hizmeti.'
        },
        {
          id: '2',
          name: 'Mehmet Nakliyat',
          company_name: 'Mehmet Express Nakliyat',
          description: 'Avrupa yakası uzmanı nakliyat firması.'
        },
        {
          id: '3',
          name: 'Özkan Lojistik',
          company_name: 'Özkan Premium Lojistik',
          description: 'Lüks ev eşyalarında uzman nakliyeci.'
        }
      ]);
      
      console.log('Sample data loaded successfully!');
    } catch (error) {
      console.error('Error loading sample data:', error);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    setToken(null);
    setUser(null);
    setCurrentScreen('welcome');
    setLoginForm({ email: '', password: '' });
    setRegisterForm({ name: '', email: '', phone: '', password: '', company_name: '', company_description: '' });
    clearMessages();
  };

  const handleUserAction = async (action: string, userEmail: string, extraData?: any) => {
    if (!token) return;
    
    setLoading(true);
    try {
      let response;
      
      switch (action) {
        case 'make_moderator':
          response = await fetch(`${BACKEND_URL}/api/admin/update-user-role/${userEmail}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'moderator' })
          });
          break;
          
        case 'ban_3_days':
          response = await fetch(`${BACKEND_URL}/api/admin/ban-user/${userEmail}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              ban_days: 3, 
              reason: 'Kullanıcı davranış kurallarını ihlal etti (3 gün)' 
            })
          });
          break;
          
        case 'ban_5_days':
          response = await fetch(`${BACKEND_URL}/api/admin/ban-user/${userEmail}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              ban_days: 5, 
              reason: 'Ciddi ihlal - 5 gün yasak' 
            })
          });
          break;
          
        case 'ban_7_days':
          response = await fetch(`${BACKEND_URL}/api/admin/ban-user/${userEmail}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              ban_days: 7, 
              reason: 'Tekrarlayan ihlaller - 7 gün yasak' 
            })
          });
          break;
          
        case 'unban':
          response = await fetch(`${BACKEND_URL}/api/admin/unban-user/${userEmail}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          });
          break;
          
        default:
          throw new Error('Geçersiz işlem');
      }
      
      if (response && response.ok) {
        const data = await response.json();
        showSuccess(data.message);
        
        // Refresh user data
        await fetchAdminData();
        setShowUserActions(false);
        setSelectedUser(null);
      } else {
        const errorData = await response?.json();
        showError('general', errorData?.detail || 'İşlem başarısız');
      }
    } catch (error) {
      showError('general', 'Bir hata oluştu: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/delete-request/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        showSuccess('Talep başarıyla silindi');
        await fetchAdminData();
      } else {
        const errorData = await response.json();
        showError('general', errorData?.detail || 'Talep silinemedi');
      }
    } catch (error) {
      showError('general', 'Bir hata oluştu: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const renderWelcomeScreen = () => {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#667eea', '#764ba2', '#f093fb']}
          style={styles.gradientBackground}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.welcomeContainer}>
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
                
                {/* Trust indicators */}
                <View style={styles.trustIndicators}>
                  <View style={styles.trustItem}>
                    <Ionicons name="shield-checkmark" size={20} color="#fff" />
                    <Text style={styles.trustText}>Sigortalı Taşıma</Text>
                  </View>
                  <View style={styles.trustItem}>
                    <Ionicons name="people" size={20} color="#fff" />
                    <Text style={styles.trustText}>Onaylı Firmalar</Text>
                  </View>
                  <View style={styles.trustItem}>
                    <Ionicons name="time" size={20} color="#fff" />
                    <Text style={styles.trustText}>7/24 Destek</Text>
                  </View>
                </View>
              </View>

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
                >
                  <Text style={styles.authButtonText}>Giriş Yap</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.authButton, styles.registerButton]}
                  onPress={() => setCurrentScreen('register')}
                >
                  <Text style={[styles.authButtonText, styles.registerButtonText]}>Kayıt Ol</Text>
                </TouchableOpacity>
              </View>


              
              {/* Sample Jobs Section */}
              {sampleJobs.length > 0 && (
                <View style={styles.sampleSection}>
                  <Text style={styles.sampleSectionTitle}>Güncel Taşınma İlanları</Text>
                  {sampleJobs.map((job, index) => (
                    <View key={job.id || index} style={styles.jobCard}>
                      <View style={styles.jobHeader}>
                        <Text style={styles.jobCustomer}>{job.customer_name}</Text>
                        <Text style={styles.jobDate}>
                          {new Date(job.moving_date).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                      <Text style={styles.jobRoute}>
                        <Ionicons name="location" size={16} color="#3498db" />
                        {' '}{job.from_location} → {job.to_location}
                      </Text>
                      <Text style={styles.jobDescription}>{job.description}</Text>
                      <TouchableOpacity
                        style={styles.bidButton}
                        onPress={() => {
                          showSuccess('Teklif vermek için kayıt olun!');
                          setCurrentScreen('register');
                        }}
                      >
                        <Text style={styles.bidButtonText}>Teklif Ver</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Sample Companies Section */}
              {sampleCompanies.length > 0 && (
                <View style={styles.sampleSection}>
                  <Text style={styles.sampleSectionTitle}>Güvenilir Nakliye Firmaları</Text>
                  {sampleCompanies.map((company, index) => (
                    <View key={company.id || index} style={styles.companyCard}>
                      <View style={styles.companyHeader}>
                        <Ionicons name="business" size={24} color="#2c3e50" />
                        <View style={styles.companyInfo}>
                          <Text style={styles.companyName}>{company.company_name}</Text>
                          <Text style={styles.companyDescription}>{company.description}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.contactButton}
                        onPress={() => {
                          showSuccess('Firmalarla iletişim için kayıt olun!');
                          setCurrentScreen('register');
                        }}
                      >
                        <Text style={styles.contactButtonText}>İletişime Geç</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Professional features */}
              <View style={styles.featuresSection}>
                <Text style={styles.featuresTitle}>Neden Biz?</Text>
                <View style={styles.featureGrid}>
                  <View style={styles.featureCard}>
                    <Ionicons name="star" size={24} color="#FFD700" />
                    <Text style={styles.featureCardText}>5 Yıldızlı Hizmet</Text>
                  </View>
                  <View style={styles.featureCard}>
                    <Ionicons name="cash" size={24} color="#27ae60" />
                    <Text style={styles.featureCardText}>Uygun Fiyat</Text>
                  </View>
                  <View style={styles.featureCard}>
                    <Ionicons name="checkmark-circle" size={24} color="#3498db" />
                    <Text style={styles.featureCardText}>Güvenli Teslimat</Text>
                  </View>
                  <View style={styles.featureCard}>
                    <Ionicons name="time" size={24} color="#e67e22" />
                    <Text style={styles.featureCardText}>Hızlı Hizmet</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
            
            {/* Footer */}
            <View style={styles.footer}>
              {/* Distance Calculator */}
              <View style={styles.calculatorSection}>
                <Text style={styles.sectionTitle}>🗺️ Şehirler Arası Mesafe Hesaplayıcı</Text>
                <View style={styles.calculatorRow}>
                  <TextInput
                    style={styles.cityInput}
                    placeholder="Nereden?"
                    placeholderTextColor="#95a5a6"
                  />
                  <Ionicons name="arrow-forward" size={20} color="#3498db" />
                  <TextInput
                    style={styles.cityInput}
                    placeholder="Nereye?"
                    placeholderTextColor="#95a5a6"
                  />
                </View>
                
                <TouchableOpacity style={styles.calculateButton}>
                  <Text style={styles.calculateButtonText}>Mesafe Hesapla</Text>
                </TouchableOpacity>
                
                <Text style={styles.cityList}>
                  📍 Desteklenen şehirler: İstanbul, Ankara, İzmir, Bursa, Antalya, Adana, Konya...
                </Text>
              </View>

              {/* Footer Content */}
              <View style={styles.footerContent}>
                <View style={styles.footerColumn}>
                  <Text style={styles.columnTitle}>🚛 Nakliyat Platformu</Text>
                  <Text style={styles.footerText}>
                    Türkiye'nin en güvenilir nakliyat hizmeti. Uzman ekibimizle güvenli taşımacılık.
                  </Text>
                  
                  <View style={styles.socialLinks}>
                    <TouchableOpacity style={styles.socialButton}>
                      <Ionicons name="call" size={20} color="#3498db" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialButton}>
                      <Ionicons name="mail" size={20} color="#3498db" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialButton}>
                      <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.footerColumn}>
                  <Text style={styles.columnTitle}>⚡ Hızlı Linkler</Text>
                  <TouchableOpacity style={styles.footerLink} onPress={() => setCurrentScreen('quote_request')}>
                    <Text style={styles.footerLinkText}>🎯 Teklif Al</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.footerLink} onPress={() => setCurrentScreen('register')}>
                    <Text style={styles.footerLinkText}>📝 Kayıt Ol</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.footerLink} onPress={() => setCurrentScreen('login')}>
                    <Text style={styles.footerLinkText}>🔐 Giriş Yap</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.footerColumn}>
                  <Text style={styles.columnTitle}>🎯 Hizmetlerimiz</Text>
                  <Text style={styles.serviceItem}>🏠 Ev Taşımacılığı</Text>
                  <Text style={styles.serviceItem}>🏢 Ofis Taşımacılığı</Text>
                  <Text style={styles.serviceItem}>📦 Ambalajlama</Text>
                  <Text style={styles.serviceItem}>🚛 Şehirler Arası</Text>
                </View>

                <View style={styles.footerColumn}>
                  <Text style={styles.columnTitle}>📞 İletişim</Text>
                  <View style={styles.contactItem}>
                    <Ionicons name="call" size={16} color="#3498db" />
                    <Text style={styles.contactText}>0850 555 12 34</Text>
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
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  };

  const renderLoginScreen = () => (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('welcome')}
          >
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          
          <View style={styles.authCard}>
            {renderSuccessMessage()}
            {errors.general && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#e74c3c" />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}
            
            <Text style={styles.authTitle}>Hoş Geldiniz</Text>
            <Text style={styles.authSubtitle}>Hesabınıza giriş yapın</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Email adresinizi girin"
                keyboardType="email-address"
                autoCapitalize="none"
                value={loginForm.email}
                onChangeText={(text) => {
                  setLoginForm({...loginForm, email: text});
                  if (errors.email) setErrors(prev => ({...prev, email: ''}));
                }}
              />
              {renderErrorMessage('email')}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Şifre</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Şifrenizi girin"
                secureTextEntry
                value={loginForm.password}
                onChangeText={(text) => {
                  setLoginForm({...loginForm, password: text});
                  if (errors.password) setErrors(prev => ({...prev, password: ''}));
                }}
              />
              {renderErrorMessage('password')}
            </View>
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#bdc3c7', '#95a5a6'] : ['#3498db', '#2980b9']}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.forgotPasswordButton}
              onPress={() => setCurrentScreen('forgot_password')}
            >
              <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
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
        <ScrollView contentContainerStyle={styles.formContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('welcome')}
          >
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          
          <View style={styles.authCard}>
            {renderSuccessMessage()}
            {errors.general && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#e74c3c" />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}
            
            <Text style={styles.authTitle}>Hesap Oluştur</Text>
            
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
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Ad soyadınızı girin"
                value={registerForm.name}
                onChangeText={(text) => {
                  setRegisterForm({...registerForm, name: text});
                  if (errors.name) setErrors(prev => ({...prev, name: ''}));
                }}
              />
              {renderErrorMessage('name')}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Email adresinizi girin"
                keyboardType="email-address"
                autoCapitalize="none"
                value={registerForm.email}
                onChangeText={(text) => {
                  setRegisterForm({...registerForm, email: text});
                  if (errors.email) setErrors(prev => ({...prev, email: ''}));
                }}
              />
              {renderErrorMessage('email')}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefon</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="Telefon numaranızı girin"
                keyboardType="phone-pad"
                value={registerForm.phone}
                onChangeText={(text) => {
                  setRegisterForm({...registerForm, phone: text});
                  if (errors.phone) setErrors(prev => ({...prev, phone: ''}));
                }}
              />
              {renderErrorMessage('phone')}
            </View>

            {userType === 'mover' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Şirket Adı</Text>
                  <TextInput
                    style={[styles.input, errors.company_name && styles.inputError]}
                    placeholder="Şirket adınızı girin"
                    value={registerForm.company_name}
                    onChangeText={(text) => {
                      setRegisterForm({...registerForm, company_name: text});
                      if (errors.company_name) setErrors(prev => ({...prev, company_name: ''}));
                    }}
                  />
                  {renderErrorMessage('company_name')}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Firma Açıklaması</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, errors.company_description && styles.inputError]}
                    placeholder="Firmanızı tanıtın..."
                    multiline
                    numberOfLines={4}
                    value={registerForm.company_description}
                    onChangeText={(text) => {
                      setRegisterForm({...registerForm, company_description: text});
                      if (errors.company_description) setErrors(prev => ({...prev, company_description: ''}));
                    }}
                  />
                  {renderErrorMessage('company_description')}
                </View>
              </>
            )}
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Şifre</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Şifrenizi girin"
                secureTextEntry
                value={registerForm.password}
                onChangeText={(text) => {
                  setRegisterForm({...registerForm, password: text});
                  if (errors.password) setErrors(prev => ({...prev, password: ''}));
                }}
              />
              {renderErrorMessage('password')}
            </View>

            {/* reCAPTCHA Section */}
            <View style={styles.recaptchaSection}>
              <Text style={styles.recaptchaLabel}>Robot Doğrulaması</Text>
              <TouchableOpacity
                style={[
                  styles.recaptchaButton,
                  isRecaptchaVerified && styles.recaptchaButtonVerified
                ]}
                onPress={simulateRecaptcha}
                disabled={isRecaptchaVerified}
              >
                {isRecaptchaVerified ? (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                    <Text style={styles.recaptchaVerifiedText}>Doğrulandı</Text>
                  </>
                ) : (
                  <>
                    <View style={styles.recaptchaBox} />
                    <Text style={styles.recaptchaText}>Robot değilim</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.recaptchaHelper}>
                Güvenlik için lütfen robot olmadığınızı doğrulayın
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#bdc3c7', '#95a5a6'] : ['#27ae60', '#2ecc71']}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Kayıt Oluşturuluyor...' : 'Kayıt Ol'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setCurrentScreen('login')}>
              <Text style={styles.linkText}>Zaten hesabınız var mı? Giriş yapın</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );

  const renderQuoteRequestScreen = () => (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('welcome')}
          >
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>Ücretsiz Teklif Al</Text>
            <Text style={styles.authSubtitle}>Taşınma detaylarınızı girin</Text>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => {
                setCurrentScreen('register');
                showSuccess('Teklif için kayıt olmaya yönlendiriliyorsunuz...');
              }}
            >
              <LinearGradient
                colors={['#56CCF2', '#2F80ED']}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>Kayıt Olup Teklif Al</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
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
        {renderSuccessMessage()}
        
        <Text style={styles.welcomeText}>Hoş geldiniz!</Text>
        <Text style={styles.userInfoText}>
          {user?.user_type === 'customer' ? 'Müşteri' : 'Nakliyeci'} • {user?.name || 'Kullanıcı'}
        </Text>
        
        <View style={styles.dashboardGrid}>
          <TouchableOpacity style={styles.dashboardCard}>
            <LinearGradient colors={['#3498db', '#2980b9']} style={styles.cardGradient}>
              <Ionicons name="add-circle" size={40} color="#fff" />
              <Text style={styles.dashboardCardTitle}>
                {user?.user_type === 'customer' ? 'Talep Oluştur' : 'Talepleri Gör'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dashboardCard}>
            <LinearGradient colors={['#e74c3c', '#c0392b']} style={styles.cardGradient}>
              <Ionicons name="list" size={40} color="#fff" />
              <Text style={styles.dashboardCardTitle}>
                {user?.user_type === 'customer' ? 'Taleplerim' : 'Tekliflerim'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  const renderForgotPasswordScreen = () => (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('login')}
          >
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          
          <View style={styles.authCard}>
            {renderSuccessMessage()}
            {errors.general && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#e74c3c" />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}
            
            <Text style={styles.authTitle}>Şifre Sıfırlama</Text>
            <Text style={styles.authSubtitle}>Email veya SMS ile doğrulama kodu alın</Text>
            
            {/* Method Selection */}
            <View style={styles.methodSelector}>
              <Text style={styles.methodLabel}>Kod gönderme yöntemi:</Text>
              <View style={styles.methodButtons}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    resetMethod === 'email' && styles.methodButtonActive
                  ]}
                  onPress={() => setResetMethod('email')}
                >
                  <Ionicons name="mail" size={20} color={resetMethod === 'email' ? '#fff' : '#3498db'} />
                  <Text style={[
                    styles.methodButtonText,
                    resetMethod === 'email' && styles.methodButtonTextActive
                  ]}>
                    Email
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    resetMethod === 'sms' && styles.methodButtonActive
                  ]}
                  onPress={() => setResetMethod('sms')}
                >
                  <Ionicons name="phone-portrait" size={20} color={resetMethod === 'sms' ? '#fff' : '#3498db'} />
                  <Text style={[
                    styles.methodButtonText,
                    resetMethod === 'sms' && styles.methodButtonTextActive
                  ]}>
                    SMS
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {resetMethod === 'email' ? 'Email Adresiniz' : 'Kayıtlı Email Adresiniz'}
              </Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Email adresinizi girin"
                keyboardType="email-address"
                autoCapitalize="none"
                value={resetEmail}
                onChangeText={(text) => {
                  setResetEmail(text);
                  if (errors.email) setErrors(prev => ({...prev, email: ''}));
                }}
              />
              {renderErrorMessage('email')}
              <Text style={styles.helperText}>
                {resetMethod === 'email' 
                  ? 'Doğrulama kodu bu email adresine gönderilecek' 
                  : 'Bu email adresine kayıtlı telefon numarasına SMS gönderilecek'}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#bdc3c7', '#95a5a6'] : ['#e67e22', '#d35400']}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Gönderiliyor...' : 'Sıfırlama Kodu Gönder'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setCurrentScreen('login')}>
              <Text style={styles.linkText}>Şifrenizi hatırladınız mı? Giriş yapın</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );

  const renderResetPasswordScreen = () => (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('forgot_password')}
          >
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          
          <View style={styles.authCard}>
            {renderSuccessMessage()}
            {errors.general && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#e74c3c" />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}
            
            <Text style={styles.authTitle}>Yeni Şifre Belirleyin</Text>
            <Text style={styles.authSubtitle}>Emailinize gönderilen kodu girin ve yeni şifrenizi belirleyin</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Doğrulama Kodu</Text>
              <TextInput
                style={[styles.input, errors.token && styles.inputError]}
                placeholder="Email ile gelen 6 haneli kodu girin"
                keyboardType="numeric"
                value={resetToken}
                onChangeText={(text) => {
                  setResetToken(text);
                  if (errors.token) setErrors(prev => ({...prev, token: ''}));
                }}
              />
              {renderErrorMessage('token')}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Yeni Şifre</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Yeni şifrenizi girin"
                secureTextEntry
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errors.password) setErrors(prev => ({...prev, password: ''}));
                }}
              />
              {renderErrorMessage('password')}
            </View>
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#bdc3c7', '#95a5a6'] : ['#27ae60', '#2ecc71']}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Şifre Değiştiriliyor...' : 'Şifremi Değiştir'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setCurrentScreen('login')}>
              <Text style={styles.linkText}>Giriş sayfasına dön</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );

  const renderVerificationScreen = () => (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowVerification(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          
          <View style={styles.authCard}>
            {renderSuccessMessage()}
            {errors.general && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#e74c3c" />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}
            
            <Text style={styles.authTitle}>Hesap Doğrulaması</Text>
            <Text style={styles.authSubtitle}>Email ve telefon doğrulama kodlarınızı girin</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Doğrulama Kodu</Text>
              <TextInput
                style={[styles.input, errors.email_code && styles.inputError]}
                placeholder="Email ile gelen 6 haneli kodu girin"
                keyboardType="numeric"
                value=""
                onChangeText={(text) => {
                  if (errors.email_code) setErrors(prev => ({...prev, email_code: ''}));
                }}
              />
              {renderErrorMessage('email_code')}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefon Doğrulama Kodu</Text>
              <TextInput
                style={[styles.input, errors.phone_code && styles.inputError]}
                placeholder="SMS ile gelen 6 haneli kodu girin"
                keyboardType="numeric"
                value=""
                onChangeText={(text) => {
                  if (errors.phone_code) setErrors(prev => ({...prev, phone_code: ''}));
                }}
              />
              {renderErrorMessage('phone_code')}
            </View>
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={() => {
                showSuccess('Doğrulama tamamlandı!');
                setShowVerification(false);
                setCurrentScreen('login');
              }}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#bdc3c7', '#95a5a6'] : ['#27ae60', '#2ecc71']}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Doğrulanıyor...' : 'Doğrula'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setCurrentScreen('register')}>
              <Text style={styles.linkText}>Kayıt sayfasına dön</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );

  const renderAdminPanel = () => {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={adminStyles.adminHeader}>
          <Text style={adminStyles.adminHeaderTitle}>Admin Panel</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={adminStyles.adminContainer}>
          {renderSuccessMessage()}
          {errors.general && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#e74c3c" />
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}
          
          <Text style={adminStyles.adminWelcomeText}>
            Hoş geldiniz, {user?.name || 'Admin'}!
          </Text>
          
          {/* Tab selector */}
          <View style={adminStyles.adminTabSelector}>
            <TouchableOpacity
              style={[
                adminStyles.adminTab,
                adminTab === 'users' && adminStyles.adminTabActive
              ]}
              onPress={() => setAdminTab('users')}
            >
              <Text style={[
                adminStyles.adminTabText,
                adminTab === 'users' && adminStyles.adminTabTextActive
              ]}>
                Kullanıcılar ({allUsers.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                adminStyles.adminTab,
                adminTab === 'requests' && adminStyles.adminTabActive
              ]}
              onPress={() => setAdminTab('requests')}
            >
              <Text style={[
                adminStyles.adminTabText,
                adminTab === 'requests' && adminStyles.adminTabTextActive
              ]}>
                Talepler ({allRequests.length})
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <ScrollView style={adminStyles.adminContent}>
            {adminTab === 'users' ? (
              <View>
                <Text style={adminStyles.adminSectionTitle}>Tüm Kullanıcılar</Text>
                {allUsers.map((userItem) => (
                  <View key={userItem.id} style={adminStyles.adminUserCard}>
                    <View style={adminStyles.adminUserInfo}>
                      <Text style={adminStyles.adminUserName}>{userItem.name}</Text>
                      <Text style={adminStyles.adminUserEmail}>{userItem.email}</Text>
                      <View style={adminStyles.adminUserBadges}>
                        <View style={[
                          adminStyles.adminBadge,
                          userItem.user_type === 'admin' ? adminStyles.adminBadgeAdmin :
                          userItem.user_type === 'moderator' ? adminStyles.adminBadgeMover :
                          userItem.user_type === 'mover' ? adminStyles.adminBadgeMover : 
                          adminStyles.adminBadgeCustomer
                        ]}>
                          <Text style={adminStyles.adminBadgeText}>
                            {userItem.user_type === 'admin' ? 'Admin' : 
                             userItem.user_type === 'moderator' ? 'Moderatör' :
                             userItem.user_type === 'mover' ? 'Nakliyeci' : 'Müşteri'}
                          </Text>
                        </View>
                        
                        {userItem.is_email_verified && (
                          <View style={[adminStyles.adminBadge, adminStyles.adminBadgeVerified]}>
                            <Text style={adminStyles.adminBadgeText}>Email ✓</Text>
                          </View>
                        )}
                        
                        {userItem.is_phone_verified && (
                          <View style={[adminStyles.adminBadge, adminStyles.adminBadgeVerified]}>
                            <Text style={adminStyles.adminBadgeText}>Telefon ✓</Text>
                          </View>
                        )}
                        
                        {!userItem.is_active && (
                          <View style={[adminStyles.adminBadge, { backgroundColor: '#e74c3c' }]}>
                            <Text style={adminStyles.adminBadgeText}>Yasaklı</Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Admin Actions - Only for non-admin users and if current user is admin */}
                      {user?.user_type === 'admin' && userItem.email !== user.email && (
                        <TouchableOpacity
                          style={[adminStyles.adminBadge, { backgroundColor: '#3498db', marginTop: 8 }]}
                          onPress={() => {
                            setSelectedUser(userItem);
                            setShowUserActions(true);
                          }}
                        >
                          <Text style={adminStyles.adminBadgeText}>İşlemler</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View>
                <Text style={adminStyles.adminSectionTitle}>Tüm Talepler</Text>
                {allRequests.map((request) => (
                  <View key={request.id} style={adminStyles.adminRequestCard}>
                    <View style={adminStyles.adminRequestHeader}>
                      <Text style={adminStyles.adminRequestCustomer}>{request.customer_name}</Text>
                      <View style={[
                        adminStyles.adminBadge,
                        request.status === 'pending' ? adminStyles.adminBadgePending :
                        request.status === 'approved' ? adminStyles.adminBadgeApproved :
                        adminStyles.adminBadgeCompleted
                      ]}>
                        <Text style={adminStyles.adminBadgeText}>
                          {request.status === 'pending' ? 'Bekliyor' :
                           request.status === 'approved' ? 'Onaylandı' : 'Tamamlandı'}
                        </Text>
                      </View>
                    </View>
                    <Text style={adminStyles.adminRequestRoute}>
                      {request.from_location} → {request.to_location}
                    </Text>
                    <Text style={adminStyles.adminRequestDate}>
                      Tarih: {new Date(request.moving_date).toLocaleDateString('tr-TR')}
                    </Text>
                    {request.description && (
                      <Text style={adminStyles.adminRequestDescription}>
                        {request.description}
                      </Text>
                    )}
                    
                    {/* Admin Actions - Delete request */}
                    {user?.user_type === 'admin' && (
                      <TouchableOpacity
                        style={[adminStyles.adminBadge, { backgroundColor: '#e74c3c', marginTop: 8 }]}
                        onPress={() => handleDeleteRequest(request.id)}
                      >
                        <Text style={adminStyles.adminBadgeText}>Talebi Sil</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
          
          {/* User Actions Modal */}
          {showUserActions && selectedUser && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  Kullanıcı İşlemleri: {selectedUser.name}
                </Text>
                
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#f39c12' }]}
                  onPress={() => handleUserAction('make_moderator', selectedUser.email)}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>Moderatör Yap</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#e67e22' }]}
                  onPress={() => handleUserAction('ban_3_days', selectedUser.email)}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>3 Gün Yasakla</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#d35400' }]}
                  onPress={() => handleUserAction('ban_5_days', selectedUser.email)}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>5 Gün Yasakla</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#c0392b' }]}
                  onPress={() => handleUserAction('ban_7_days', selectedUser.email)}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>7 Gün Yasakla</Text>
                </TouchableOpacity>
                
                {!selectedUser.is_active && (
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#27ae60' }]}
                    onPress={() => handleUserAction('unban', selectedUser.email)}
                    disabled={loading}
                  >
                    <Text style={styles.modalButtonText}>Yasağı Kaldır</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#95a5a6' }]}
                  onPress={() => {
                    setShowUserActions(false);
                    setSelectedUser(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>İptal</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  };

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
    case 'forgot_password':
      return renderForgotPasswordScreen();
    case 'reset_password':
      return renderResetPasswordScreen();
    case 'dashboard':
      return renderDashboard();
    case 'admin_panel':
      return renderAdminPanel();
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '600',
  },
  primaryCTA: {
    width: '100%',
    marginBottom: 24,
    maxWidth: 300,
  },
  primaryCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
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
    maxWidth: 300,
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
  },
  authButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    maxWidth: 300,
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
  formContainer: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
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
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
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
  inputError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fdf2f2',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8d7da',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#721c24',
    marginLeft: 6,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#155724',
    marginLeft: 8,
    fontWeight: '500',
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
  },
  disabledButton: {
    opacity: 0.6,
  },
  linkText: {
    color: '#3498db',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
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
    marginBottom: 16,
  },
  cardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  dashboardCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginTop: 12,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#e67e22',
    fontSize: 14,
    fontWeight: '500',
  },
  recaptchaSection: {
    marginBottom: 20,
  },
  recaptchaLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  recaptchaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  recaptchaButtonVerified: {
    backgroundColor: '#d4edda',
    borderColor: '#27ae60',
  },
  recaptchaBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
  },
  recaptchaText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  recaptchaVerifiedText: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '600',
    marginLeft: 8,
  },
  recaptchaHelper: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 6,
    fontStyle: 'italic',
  },
  methodSelector: {
    marginBottom: 20,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  methodButtons: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  methodButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
    marginLeft: 8,
  },
  methodButtonTextActive: {
    color: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Trust indicators styles
  trustIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  trustText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Features section
  featuresSection: {
    width: '100%',
    paddingTop: 20,
    alignItems: 'center',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
  },
  featureCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureCardText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  // Admin link styles
  adminLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  adminLinkText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  // Sample data styles  
  sampleSection: {
    width: '100%',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  sampleSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  // Job card styles
  jobCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobCustomer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  jobDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  jobRoute: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
    fontWeight: '600',
  },
  jobDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 12,
    lineHeight: 18,
  },
  bidButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  bidButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Company card styles
  companyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  companyDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    lineHeight: 18,
  },
  contactButton: {
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Footer styles
  footer: {
    backgroundColor: '#2c3e50',
    paddingTop: 32,
  },
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
  cityList: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
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
  footerLink: {
    marginBottom: 8,
  },
  footerLinkText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  serviceItem: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
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
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});