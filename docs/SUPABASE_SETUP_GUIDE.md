s# Supabase Entegrasyonu ve Güvenlik Talimatları

Bu proje için veritabanı ve kimlik doğrulama altyapısı olarak **Supabase** kullanılacaktır. Aşağıdaki adımları takip ederek projenizi oluşturun ve gerekli anahtarları alın.

## 1. Proje Oluşturma

1.  [Supabase Dashboard](https://supabase.com/dashboard) adresine gidin.
2.  **"New Project"** butonuna tıklayın.
3.  **Organization:** Kendinize ait bir organizasyon seçin.
4.  **Name:** `Monty App`
5.  **Database Password:** Güçlü bir şifre belirleyin ve **mutlaka bir yere not edin**.
6.  **Region:** Size en yakın bölgeyi seçin (Örn: Frankfurt - eu-central-1).
7.  "Create new project" diyerek oluşturun. (Kurulum birkaç dakika sürebilir).

## 2. API Anahtarlarını Alma

Proje oluştuktan sonra sol menüden **Settings (Ayarlar) > API** sekmesine gidin. Aşağıdaki iki değeri kopyalayın:

1.  **Project URL:** `https://xyz.supabase.co` formatındadır.
2.  **anon public key:** `eyJh...` ile başlayan uzun bir koddur.
    *   *Dikkat: `service_role` key'i asla kullanmayın! Sadece `anon` key yeterlidir.*

bu iki değeri projenin `.env` dosyasına ekleyeceğiz.

## 3. Veritabanı Tablolarını Oluşturma (SQL Editor)

Supabase sol menüsünden **SQL Editor** sekmesine gidin, **"New Query"** deyin ve aşağıdaki SQL kodlarını yapıştırıp **RUN** butonuna basın. Bu işlem veritabanı yapısını ve güvenliğini (Row Level Security - RLS) kuracaktır.

```sql
-- 1. PROFILES Table
create table public.profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  phone text,
  dob date,
  backup_config jsonb,
  linked_accounts jsonb,

  constraint full_name_length check (char_length(full_name) >= 3)
);

-- RLS (Güvenlik) - Herkes sadece kendi profilini görebilir/düzenleyebilir
alter table public.profiles enable row level security;

create policy "Users can view own profile" on profiles for select
using ( auth.uid() = id );

create policy "Users can update own profile" on profiles for update
using ( auth.uid() = id );

-- Yeni kullanıcı kaydolduğunda otomatik profil oluşturma tetikçisi
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, updated_at)
  values (new.id, new.raw_user_meta_data->>'full_name', now());
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. ACCOUNTS Table
create table public.accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default now(),
  name text not null,
  type text not null, -- 'BANK', 'CREDIT_CARD', 'CASH'
  balance numeric default 0,
  currency text default 'TRY',
  color text,
  icon text
);

-- RLS
alter table public.accounts enable row level security;

create policy "Users can CRUD own accounts" on accounts for all
using ( auth.uid() = user_id );


-- 3. PAYMENTS Table
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  account_id uuid references public.accounts(id) on delete set null,
  created_at timestamp with time zone default now(),
  type text not null, -- 'CREDIT_CARD', 'BILL', 'OTHER'
  description text,
  amount numeric not null,
  currency text default 'TRY',
  due_date timestamp with time zone,
  status text default 'PENDING', -- 'PAID', 'PENDING'
  is_recurring boolean default false,
  recurring_frequency text,
  file_url text, -- Fatura/Fiş görseli için link

  updated_at timestamp with time zone default now()
);

-- RLS
alter table public.payments enable row level security;

create policy "Users can CRUD own payments" on payments for all
using ( auth.uid() = user_id );

-- Ekstra Güvenlik: Storage (Dosya Depolama)
-- Storage kısmından 'receipts' adında bir Public Bucket oluşturun.
-- Policies kısmından sadece Authenticated users (giriş yapmış kullanıcılar) için upload/select izni verin.
```

## 4. Google & Apple Girişi (Authentication)

Supabase sol menüsünden **Authentication > Providers** sekmesine gidin.

*   **Google:** "Enabled" yapın. Daha önce aldığımız `Client ID` ve `Client Secret` değerlerini buraya girin.
*   **Apple:** "Enabled" yapın. `Service ID`, `Team ID`, `Key ID` ve `.p8` dosya içeriğini buraya girin.

---

Bu adımları tamamladıktan sonra bana **Project URL** ve **Anon Key** bilgilerini iletirseniz, kod tarafındaki bağlantıyı hemen yapabilirim.
