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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'quote_request' | 'login' | 'register' | 'dashboard' | 'forgot_password' | 'reset_password'>('welcome');
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
        // Set dummy user for demo
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
        setCurrentScreen('dashboard');
        showSuccess('Başarıyla giriş yapıldı!');
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
        body: JSON.stringify({ email: resetEmail }),
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

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setCurrentScreen('welcome');
    setLoginForm({ email: '', password: '' });
    setRegisterForm({ name: '', email: '', phone: '', password: '', company_name: '', company_description: '' });
    clearMessages();
  };

  const renderWelcomeScreen = () => (
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
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );

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
            <Text style={styles.authSubtitle}>Email adresinizi girin, size şifre sıfırlama kodu gönderelim</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Adresiniz</Text>
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
    case 'welcome':
      return renderWelcomeScreen();
    case 'quote_request':
      return renderQuoteRequestScreen();
    case 'login':
      return renderLoginScreen();
    case 'register':
      return renderRegisterScreen();
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
});