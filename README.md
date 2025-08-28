# 🚚 Nakliyat Platformu - Moving Services Platform

Evini taşıtacaklar ile profesyonel nakliyecileri buluşturan modern web platformu.

## ✨ Özellikler

### 🔐 Güvenli Kullanıcı Sistemi
- **Müşteri**, **Nakliyeci** ve **Admin** rol sistemi
- Email ve telefon doğrulaması
- JWT tabanlı güvenlik
- Nakliyeciler için admin onay sistemi

### 📱 Modern Arayüz
- **Mobil-uyumlu responsive tasarım**
- **Gradient ve modern UI bileşenleri**
- **Ücretsiz teklif alma** (üye olmadan)
- Kolay kullanım ve profesyonel görünüm

### 🚚 Nakliyat Özellikleri
- Detaylı taşınma talep formu
- Kat bilgileri, asansör durumu
- Mobil asansör gereksinimi
- Kamyon yanaşma mesafesi
- Paketleme seçenekleri

### 🔒 Gizlilik ve Güvenlik
- Nakliyeciler müşteri iletişim bilgilerini göremez
- Sadece onaylanan teklif sahipleri müşteri bilgilerine erişir
- Rol tabanlı erişim kontrolü

## 🏗️ Teknik Yapı

### Backend
- **FastAPI** - Modern, hızlı Python web framework
- **MongoDB** - Esnek NoSQL veritabanı
- **JWT Authentication** - Güvenli token sistemi
- **Pydantic** - Veri validasyonu
- **Uvicorn** - ASGI server

### Frontend
- **React Native (Expo)** - Cross-platform mobil uygulama
- **TypeScript** - Tip güvenli JavaScript
- **Expo Router** - Dosya tabanlı routing
- **Linear Gradient** - Modern gradient efektleri
- **Ionicons** - Professional ikonlar

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy ve load balancer
- **SSL/HTTPS** - Güvenli bağlantı desteği

## 🚀 Linux Kurulumu

### Gereksinimler
- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Git** (isteğe bağlı)
- **2GB RAM** minimum
- **5GB disk** alanı

### Hızlı Kurulum

```bash
# 1. Projeyi klonlayın (veya dosyaları indirin)
git clone <repository-url>
cd nakliyat-platform

# 2. Tek komutla deploy edin
./deploy.sh

# Platform hazır! http://localhost adresinden erişin
```

### Manuel Kurulum

```bash
# 1. Bağımlılıkları kontrol edin
docker --version
docker-compose --version

# 2. Environment dosyalarını oluşturun
./deploy.sh deploy

# 3. Servisleri başlatın
docker-compose up -d

# 4. Servis durumunu kontrol edin
docker-compose ps
```

## 📋 Kullanım

### Erişim URL'leri
- **Web Uygulaması**: http://localhost
- **API Dokümantasyonu**: http://localhost/api/docs
- **MongoDB**: localhost:27017

### Varsayılan Bilgiler
- **MongoDB Admin**: admin / nakliyat123!
- **API Base URL**: http://localhost/api

### Yönetim Komutları

```bash
# Servisleri durdur
./deploy.sh stop

# Servisleri yeniden başlat
./deploy.sh restart

# Logları görüntüle
./deploy.sh logs           # Tüm servislerin logları
./deploy.sh logs backend   # Sadece backend logları
./deploy.sh logs frontend  # Sadece frontend logları

# Veri yedekleme
./deploy.sh backup

# Yardım
./deploy.sh help
```

## 🔧 Konfigürasyon

### Environment Değişkenleri

#### Backend (.env)
```env
MONGO_URL=mongodb://admin:nakliyat123!@mongodb:27017/
DB_NAME=moving_platform
SECRET_KEY=your-super-secret-key-change-in-production
```

#### Frontend (.env)
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
EXPO_USE_FAST_RESOLVER=1
```

### Port Yapılandırması
- **Frontend**: 3000
- **Backend API**: 8001  
- **MongoDB**: 27017
- **Nginx**: 80, 443

## 🔐 Güvenlik

### Üretim Ortamı için Önemli Notlar

1. **MongoDB şifresini değiştirin**:
   ```bash
   # docker-compose.yml içinde MONGO_INITDB_ROOT_PASSWORD değiştirin
   ```

2. **Backend SECRET_KEY güncelleyin**:
   ```bash
   # backend/.env dosyasında SECRET_KEY değiştirin
   openssl rand -hex 32
   ```

3. **SSL sertifikaları ekleyin**:
   ```bash
   # SSL sertifikalarınızı nginx/ssl/ klasörüne koyun
   # nginx.conf içinde HTTPS bloğunu aktif edin
   ```

4. **Firewall kuralları**:
   ```bash
   # Sadece gerekli portları açık tutun
   ufw allow 80
   ufw allow 443
   ufw deny 27017  # MongoDB'ye dış erişimi kapat
   ```

## 🆘 Sorun Giderme

### Yaygın Sorunlar

**Port zaten kullanımda**:
```bash
# Portları kontrol edin
netstat -tuln | grep -E ':(80|443|3000|8001|27017)'

# Gerekirse portları docker-compose.yml'de değiştirin
```

**Servis başlamıyor**:
```bash
# Servis durumunu kontrol edin
docker-compose ps

# Hata loglarını inceleyin
docker-compose logs [service-name]

# Servisleri yeniden başlatın
docker-compose restart
```

---

## 🎯 Platform Özellikleri

✅ **Tamamlanan Özellikler:**
- Profesyonel ve modern UI tasarımı
- Üye olmadan teklif isteme sistemi
- Kullanıcı kayıt ve doğrulama sistemi
- Backend API'leri (19/19 test başarılı)
- Docker ile Linux deployment
- Nginx reverse proxy
- MongoDB veritabanı
- Güvenlik önlemleri

**🌐 Erişim Linkleri:**
- Web: https://ev-tasima-pro.preview.emergentagent.com
- Mobil: exp://ev-tasima-pro.preview.emergentagent.com

**🚚 Kolay taşınmalar dileriz!**