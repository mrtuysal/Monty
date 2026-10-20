# Google ve Apple İle Giriş (OAuth) Entegrasyon Kılavuzu

Bu belge, uygulamanıza "Google ile Giriş Yap" ve "Apple ile Giriş Yap" özelliklerini eklemek için gerekli API anahtarlarını ve kimlik bilgilerini nasıl alacağınızı adım adım anlatır.

---

## 1. Google ile Giriş (Google Sign-In)

Google hesabıyla giriş yapmak için **Google Cloud Platform** üzerinde bir proje oluşturmanız gerekir.

### Ücret Bilgisi
*   **Ücretsizdir.** Google Sign-In (Identity Services) kullanımı için Google sizden ücret talep etmez. Sadece çok yüksek hacimli API kullanımlarında (harita vb. servisler eklenirse) kota sınırları olabilir, ama sadece giriş işlemi için ücretsizdir.

### Kurulum Adımları

1.  **Google Cloud Console'a Gidin:**
    *   Link: [https://console.cloud.google.com/](https://console.cloud.google.com/) adresine gidin ve Google hesabınızla giriş yapın.

2.  **Yeni Proje Oluşturun:**
    *   Sol üstteki proje seçiciye tıklayın ve **"New Project" (Yeni Proje)** butonuna basın.
    *   Projenize bir isim verin (Örn: `Monty App`) ve **"Create"** diyerek oluşturun.

3.  **OAuth Onay Ekranını (Consent Screen) Ayarlayın:**
    *   Sol menüden **"APIs & Services" > "OAuth consent screen"** sekmesine gidin.
    *   **User Type:** "External" (Harici) seçeneğini seçin ve "Create"e basın.
    *   **App Information:**
        *   **App Name:** Uygulamanızın adı (Monty).
        *   **User Support Email:** Kendi e-posta adresiniz.
        *   **Developer Contact Information:** Yine kendi e-posta adresiniz.
    *   "Save and Continue" diyerek ilerleyin.
    *   **Scopes:** "Add or Remove Scopes" diyerek `userinfo.email` ve `userinfo.profile` izinlerini seçin. Bu, kullanıcının adını ve e-postasını almanızı sağlar.
    *   "Test Users" kısmını şimdilik geçebilirsiniz (Uygulama yayınlanmadan önce kendi e-postanızı eklemeniz gerekebilir).

4.  **Kimlik Bilgisi (Credentials) Oluşturun:**
    *   Sol menüden **"Credentials"** sekmesine gidin.
    *   **"+ CREATE CREDENTIALS"** butonuna basın ve **"OAuth client ID"**yi seçin.
    *   **Application Type:** Masaüstü uygulaması için **"Desktop App"** veya Web entegrasyonu yapacaksanız **"Web application"** seçin.
        *   *Not: Electron uygulamaları bazen Web Application gibi davranabilir, ancak masaüstü için Desktop App daha uygundur.*
    *   İsim verin (Örn: `Monty Desktop Client`).
    *   **"Create"** butonuna basın.

5.  **Sonuç:**
    *   Karşınıza **Client ID** ve **Client Secret** çıkacak. Bu iki kodu kopyalayıp güvenli bir yere kaydedin. Uygulamada kullanacağımız kodlar bunlardır.

---

## 2. Apple ile Giriş (Sign in with Apple)

Apple ile giriş özelliği, Apple'ın güvenlik standartları gereği biraz daha katı kurallara sahiptir ve ücretli bir geliştirici hesabı gerektirir.

### Ücret Bilgisi
*   **Ücretlidir.** Apple Developer Program üyeliği gerektirir. Yıllık ücreti **$99 USD** (ABD Doları). Eğer zaten bir hesabınız varsa ek ücret ödemezsiniz.

### Kurulum Adımları

1.  **Apple Developer Portal'a Gidin:**
    *   Link: [https://developer.apple.com/account/](https://developer.apple.com/account/) adresine gidin.

2.  **Identifier (App ID) Oluşturun:**
    *   Menüden **"Certificates, Identifiers & Profiles"** seçeneğine tıklayın.
    *   Sol menüden **"Identifiers"**a gidin ve mavi **(+)** butonuna basın.
    *   **"App IDs"** seçin ve devam edin.
    *   **Platform:** iOS, macOS, tvOS, watchOS (uygulamanızın çalışacağı platformları seçin).
    *   **Description:** `Monty App` yazın.
    *   **Bundle ID:** Explicit seçin ve benzersiz bir ID girin (Örn: `com.yourname.monty`).
    *   Aşağıdaki listeden **"Sign in with Apple"** özelliğini bulup yanındaki kutucuğu işaretleyin.
    *   "Continue" ve ardından "Register" diyerek kaydedin.

3.  **Service ID Oluşturun (Web/Electron için):**
    *   Tekrar **Identifiers** sayfasında (+) butonuna basın.
    *   Bu sefer **"Service IDs"** seçeneğini seçin.
    *   **Identifier:** `com.yourname.monty.client` gibi bir ID verin.
    *   "Sign in with Apple" seçeneğini işaretleyin ve **Configure** butonuna basın.
    *   Açılan pencerede **Primary App ID** olarak az önce oluşturduğunuz App ID'yi seçin.
    *   **Web Domain:** Uygulamanızın (varsa) web sitesi domainini girin.

4.  **Private Key (Anahtar) Oluşturun:**
    *   Sol menüden **"Keys"** sekmesine gidin ve (+) butonuna basın.
    *   Key Name: `Monty Auth Key`.
    *   **"Sign in with Apple"** seçeneğini işaretleyin.
    *   Yanındaki **Configure** butonuna basıp Primary App ID'nizi seçin.
    *   "Continue" ve "Register" diyerek oluşturun.
    *   **ÖNEMLİ:** Karşınıza çıkan **Download** butonuyla `.p8` uzantılı anahtar dosyasını indirin. Bu dosyayı **SADECE BİR KERE** indirebilirsiniz. Kaybetmeyin!
    *   Ayrıca bu sayfadaki **Key ID**'yi not edin.

5.  **Sonuç:**
    *   Apple entegrasyonu için elinizde şunlar olmalı:
        *   **Team ID** (Sağ üst köşede yazar, örn: A1B2C3D4).
        *   **Client ID (Service ID)** (Örn: com.yourname.monty.client).
        *   **Key ID** ve indirdiğiniz **.p8 Dosyası**.

---

## Özet: Hangi Kodlar Lazım?

Uygulamanın `Ayarlar` sayfasına veya `.env` dosyasına girmek için şu bilgilere ihtiyacımız olacak:

| Servis | Gerekli Bilgiler | Maliyet |
| :--- | :--- | :--- |
| **Google** | `Client ID`, `Client Secret` | Ücretsiz |
| **Apple** | `Team ID`, `Service ID`, `Key ID`, `Private Key (.p8)` | $99/Yıl |

Hazırladığınızda bu bilgileri uygulama koduna (güvenli bir şekilde) entegre edebiliriz.
