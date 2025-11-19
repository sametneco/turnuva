# FIFA Tournament Hub

FIFA turnuva organizasyonu için kapsamlı bir yönetim paneli.

## Özellikler

- Turnuva oluşturma ve yönetimi
- Oyuncu ekleme ve istatistik takibi
- Maç programlama ve skor güncelleme
- Puan durumu ve sıralama
- Admin paneli (PIN korumalı)

## Teknolojiler

- React
- Firebase (Firestore, Authentication)
- Tailwind CSS
- Lucide Icons

## Kurulum

1. Repoyu klonlayın:
   ```bash
   git clone <repo-url>
   cd fifa-tournament-hub
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. Firebase konfigürasyonunu ayarlayın:
   - `src/App.jsx` dosyasındaki firebaseConfig objesini kendi Firebase projenizin bilgileriyle güncelleyin

4. Uygulamayı başlatın:
   ```bash
   npm run dev
   ```

## Kullanım

1. Uygulama başladığında ana ekranda turnuvalar listelenecektir
2. Admin girişi için sağ üst köşedeki kilit simgesine tıklayın
3. PIN olarak `1234` girin (bu değeri kodda değiştirebilirsiniz)
4. Admin olarak giriş yaptıktan sonra yeni turnuva oluşturabilir, oyuncu ekleyebilir ve maç programlayabilirsiniz

## Firebase Kurulumu

Uygulamanın çalışması için bir Firebase projesi oluşturmanız gerekir:

1. [Firebase Console](https://console.firebase.google.com/) adresine gidin
2. Yeni bir proje oluşturun
3. Firestore Database oluşturun
4. Authentication bölümünden anonymous login'i etkinleştirin
5. Proje ayarlarından web uygulaması ekleyin
6. Aldığınız konfigürasyon bilgilerini `src/App.jsx` dosyasındaki firebaseConfig objesine yerleştirin

## Katkı

Projeye katkıda bulunmak isterseniz lütfen bir pull request gönderin.

## Lisans

MIT