# Monty App Coding Standards & Best Practices

Bu doküman, projede karşılaşılan sorunların çözümünde başarıyla kullanılan ve **standart olarak kabul edilen** yöntemleri içerir. Yeni geliştirmeler yapılırken bu kurallara kesinlikle uyulmalıdır.

## 1. Responsive Form Tasarımı (Layout)

Form elemanlarının yan yana dizildiği durumlarda (Örn: Telefon ve Doğum Tarihi), öğelerin iç içe geçmesini veya yapışmasını önlemek için **CSS Grid** yapısı kullanılacaktır.

**Standart Kod Yapısı:**
```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
    <div>
        <label>Etiket 1</label>
        <input ... />
    </div>
    <div>
        <label>Etiket 2</label>
        <input ... />
    </div>
</div>
```
*   **`minmax(250px, 1fr)`:** Elemanlar en az 250px genişliğinde olur. Alan daralırsa otomatik olarak alt satıra geçerler.
*   **`gap: '20px'`:** Elemanlar arasına dikey ve yatayda sabit boşluk bırakır.

**Kullanılmayacaklar:**
*   ❌ `display: 'flex'` ile manuel `width` veya `margin` hesaplamaları (Hizalama sorunlarına yol açıyor).
*   ❌ Sabit piksel genişlikleri (Mobil uyumluluğu bozuyor).

---

## 2. Para Birimi ve Sayı Girişleri (Money Input)

Türk Lirası formatına uygun (`1.234,56`) sayı girişlerinde, nokta ve virgül karışıklığını önlemek için **DataContext** içinde tanımlanan merkezi fonksiyonlar kullanılacaktır.

**Kullanılacak Fonksiyonlar:**
*   `formatMoneyInput(value)`: Kullanıcı yazarken binlik ayracı (.) koyar.
*   `parseMoneyInput(formattedValue)`: Kaydederken string'i `float` (ondalıklı sayı) formatına çevirir.

**Standart Input Davranışı:**
```jsx
const handleChange = (e) => {
    // 1. Sadece sayı ve virgül girişine izin ver
    const rawValue = e.target.value;
    
    // 2. Formatla
    const formatted = formatMoneyInput(rawValue);
    
    // 3. State'i güncelle
    setAmount(formatted);
};
```

**Dikkat Edilecekler:**
*   Kullanıcı "." (nokta) tuşuna basarsa, bunu otomatik olarak "," (virgül) karakterine çevir (Telefon klavyeleri için kolaylık).
*   Input `type="text"` olmalıdır (`type="number"` formatlı gösterimi desteklemez).

---

## 3. Veri Yönetimi (State Persistence)

Uygulamanın veri tutarlılığı için tüm ana veriler (Hesaplar, Ödemeler, Profil) **localStorage** üzerinde tutulur ve **DataContext** üzerinden yönetilir.

*   Her yeni veri tipi eklendiğinde (`context/DataContext.jsx`) içine eklenmeli ve `useEffect` ile localStorage senkronizasyonu sağlanmalıdır.
