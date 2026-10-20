---
description: Monty desktop uygulamasının yeni versiyonunu derle ve kurulum dosyası oluştur
---

// turbo-all

## Release Workflow

### Adım 1 — Çalışan dev/start süreçlerini durdur (gerekirse)
Mevcut `npm run start` sürecini sonlandır (Electron'u kapat). `npm run dev` devam edebilir.

### Adım 2 — Versiyon numarasını güncelle
`apps/desktop/package.json` içindeki `"version"` değerini bir üst patch versiyona çıkar (örn. 2.0.0 → 2.1.0).

### Adım 3 — Vite production build al
// turbo
Run: `npm run build`
Working directory: `c:\Users\mrt_u\Documents\Monty_app\apps\desktop`

### Adım 4 — Electron installer oluştur
// turbo
Run: `npx electron-builder --win --publish never`
Working directory: `c:\Users\mrt_u\Documents\Monty_app\apps\desktop`

### Adım 5 — Sonucu kontrol et
`release/` klasöründe `Monty Setup X.X.X.exe` dosyasının oluştuğunu doğrula.
