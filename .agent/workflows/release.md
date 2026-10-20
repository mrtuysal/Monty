---
description: Monty desktop uygulamasının yeni versiyonunu derle ve kurulum dosyası oluştur
---

# Monty Release Workflow

Bu workflow yeni bir versiyon yayınlamak için kullanılır.

## Adımlar

1. `apps/desktop/package.json` dosyasında `version` alanını güncelle (ör: `"2.0.0"` → `"2.1.0"`)

2. Backup klasörüne yedek al:
```
xcopy "apps\desktop\src" "backups\TARIH_vX.X.X_ACIKLAMA\apps\desktop\src\" /E /I /Q
xcopy "apps\desktop\main.cjs" "backups\TARIH_vX.X.X_ACIKLAMA\apps\desktop\" /Q
xcopy "apps\desktop\preload.cjs" "backups\TARIH_vX.X.X_ACIKLAMA\apps\desktop\" /Q
xcopy "apps\desktop\package.json" "backups\TARIH_vX.X.X_ACIKLAMA\apps\desktop\" /Q
xcopy "packages" "backups\TARIH_vX.X.X_ACIKLAMA\packages\" /E /I /Q
```

3. Git commit ve tag oluştur:
```
git add apps/desktop/ packages/
git commit -m "vX.X.X - Değişiklik açıklaması"
git tag -a vX.X.X -m "Monty vX.X.X - Kısa açıklama"
```

// turbo
4. Frontend'i derle:
```
cd apps/desktop
npm run build
```

// turbo
5. Windows installer oluştur:
```
cd apps/desktop
npx electron-builder --win --x64
```

6. Installer dosyası şurada oluşur:
   `apps/desktop/release/Monty Setup X.X.X.exe`

7. Güncelleme için: Eski kurulumun üzerine yeni Setup dosyasını çalıştır.
   - Kullanıcı verileri Supabase'de olduğu için silinmez.
   - NSIS otomatik olarak eski versiyonun üzerine yazar.

## Notlar
- Windows SmartScreen uyarısı gösterebilir (imzasız uygulama). "Run anyway" ile geçilebilir.
- Electron versiyonu package.json'da sabit tutulmalı (^28.0.0 değil, 28.3.3 gibi).
- İleride otomatik güncelleme (auto-update) eklenebilir.
