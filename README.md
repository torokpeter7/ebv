# 🏪 EBV - Asztalos Fizetési Rendszer

Egy modern webalkalmazás vendéglátóhelyek (kávézók, pubok, bárok, cukrászdák) számára. A rendszer lehetővé teszi, hogy a vendégek az asztalon lévő QR-kód beolvasásával online felületre jussanak, ahol egyszerűen bankkártyával vagy készpénzzel fizethetnek közvetlenül az asztalnál.

## 🎯 Főbb Funkciók

### 📱 Vendég Felület
- **QR-kód beolvasás** - Asztal azonosítása
- **Menü böngészés** - Étel és ital választása
- **Rendelés kezelés** - Tétel hozzáadás/eltávolítás
- **Biztonságos fizetés** - Bankkártya vagy készpénz
- **Valós idejű visszajelzés** - Sikeres fizetéskor értesítés

### 👨‍💼 Admin Panel
- **Asztal kezelés** - Asztalok felvétele, szerkesztése, törlése
- **QR-kód nyomtatás** - Könnyű asztal azonosítás
- **Menü kezelés** - Étel/ital tétel hozzáadás és szerkesztés
- **Ár kezelés** - Dinamikus árazás
- **Fizetés nyomkövetés** - Összes tranzakció naplózása
- **Statisztikák** - Mai bevétel, foglalt asztalok, stb.
- **Valós idejű frissítések** - WebSocket alapú live notifications

## 🛠️ Technológia Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Adatbázis:** Supabase (PostgreSQL)
- **API:** Supabase REST API
- **Valós idejű:** Supabase Realtime
- **QR-kód:** QRCode.js library

## 📋 Előfeltételek

- Aktív Supabase fiók
- Supabase projekt
- Modern böngésző (Chrome, Firefox, Safari, Edge)

## 🚀 Telepítés és Beállítás

### 1. Supabase Projekt Létrehozása

1. Menj a [Supabase.com](https://supabase.com) oldalra
2. Kattints a "Start your project" gombra
3. Hozz létre egy új projektet (pl. "ebv-restaurant")
4. Válassz régiót és jelszót
5. Várd meg, amíg létrejön a projekt

### 2. Adatbázis Sémák Létrehozása

1. Nyisd meg a Supabase Dashboard-ot
2. Kattints az "SQL Editor" fülre
3. Kattints a "New Query" gombra
4. Másold be az alábbi SQL kódot:

```sql
-- Tables tábla
CREATE TABLE IF NOT EXISTS public.tables (
  id BIGSERIAL PRIMARY KEY,
  table_number INT UNIQUE NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'paying')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Menu items tábla
CREATE TABLE IF NOT EXISTS public.menu_items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT DEFAULT 'other',
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders tábla
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  table_id BIGINT NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  menu_item_id BIGINT NOT NULL REFERENCES public.menu_items(id),
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(table_id, menu_item_id)
);

-- Payments tábla
CREATE TABLE IF NOT EXISTS public.payments (
  id BIGSERIAL PRIMARY KEY,
  table_id BIGINT NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_method TEXT DEFAULT 'card',
  customer_name TEXT,
  customer_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables, public.menu_items, public.orders, public.payments;
```

5. Kattints a "Run" gombra

### 3. Supabase Adatok Lekérése

1. Menj a Settings → API Keys szekciót
2. Másold le az **Project URL**-t
3. Másold le az **Anon/Public API Key**-t

### 4. Projekt Konfigurálása

1. Nyisd meg a `config.js` fájlt
2. Cseréld ki a placeholder-eket:

```javascript
const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

3. Mentsd el a fájlt

### 5. Biztonsági Beállítások (RLS)

1. A Supabase Dashboard-ban menj az "Authentication" → "Policies" szekciót
2. Minden tábla esetén engedélyezd az alábbi políciákat:
   - **SELECT**: Everybody
   - **INSERT**: Everybody
   - **UPDATE**: Everybody
   - **DELETE**: Everybody

⚠️ **Megjegyzés:** Termelésben használj szigorúbb biztonsági политikákat!

### 6. Projekt Futtatása

1. Helyezd a fájlokat egy web szerveren vagy nyisd meg helyileg
2. Nyisd meg az `index.html` fájlt böngészőben
3. Az admin panelhez bejelentkezz az alapértelmezett adatokkal:
   - Email: `admin@example.com`
   - Jelszó: `password123`

## 📱 Alkalmazás Szerkezete

```
ebv/
├── index.html          # Főoldal (Admin + Guest)
├── config.js          # Supabase konfiguráció
├── app.js             # Alkalmazás logika
├── styles.css         # Stílusok
└── README.md          # Ez a fájl
```

## 🎮 Használat

### Admin Panel

1. **Bejelentkezés**
   - Nyisd meg az alkalmazást
   - Add meg az email-edet és jelszót
   - Kattints a "Bejelentkezés" gombra

2. **Asztalok Kezelése**
   - Kattints az "Asztalok" tabra
   - Kattints az "+ Új Asztal" gombra
   - Add meg az asztal számát
   - Kattints a "Hozzáadás" gombra
   - Megjelenítheted/nyomtathatod a QR-kódot

3. **Menü Kezelése**
   - Kattints a "Menü Kezelés" tabra
   - Kattints az "+ Új Tétel" gombra
   - Töltsd ki a tételt (név, leírás, ár, kategória)
   - Kattints a "Hozzáadás" gombra

4. **Fizetések Megtekintése**
   - Kattints a "Fizetések" tabra
   - Látod az összes fizetés történetét
   - Valós idejű értesítéseket kapsz új fizetésekről

5. **Statisztikák**
   - Az oldal tetején látod a főbb statisztikákat
   - Foglalt asztalok száma
   - Szabad asztalok száma
   - Fizető asztalok száma
   - Mai bevétel összesen

### Vendég Fizetési Felület

1. **QR-kód Beolvasása**
   - Vendég megnyitja az oldalt mobilon
   - Beírja az asztal számát vagy QR-kódot
   - Kattint az "Asztal Megnyitása" gombra

2. **Rendelés Összeállítása**
   - Böngészi a menüpontokat
   - Kattint a "🛒 Hozzáadás" gombra
   - Módosítja a mennyiséget (+ / -)
   - Látja a teljes összeget

3. **Fizetés**
   - Kattint a "Fizetés" gombra
   - Kiválaszt fizetési módot (bankkártya/készpénz)
   - Beírja a nevét és email-jét
   - Kattint a "Fizetés Megerősítése" gombra
   - Sikeres fizetés után megjeleník a nyugta

## 🎨 Dizájn

- **Modern, minimális design**
- **Teljes responsiv (mobilbarát)**
- **Gyors betöltés**
- **Intuítív felhasználói felület**
- **Sötét és világos témák támogatása**

## 📊 Adatbázis Séma

### tables (Asztalok)
| Mező | Típus | Leírás |
|------|-------|--------|
| id | BIGSERIAL | Elsődleges kulcs |
| table_number | INT | Asztal száma |
| qr_code | TEXT | Egyedi QR-kód |
| status | TEXT | available/occupied/paying |
| created_at | TIMESTAMP | Létrehozás ideje |
| updated_at | TIMESTAMP | Utolsó módosítás |

### menu_items (Menü Tételek)
| Mező | Típus | Leírás |
|------|-------|--------|
| id | BIGSERIAL | Elsődleges kulcs |
| name | TEXT | Tétel neve |
| description | TEXT | Leírás |
| price | DECIMAL | Ár (Ft) |
| category | TEXT | Kategória |
| available | BOOLEAN | Elérhető-e |
| created_at | TIMESTAMP | Létrehozás ideje |

### orders (Rendelések)
| Mező | Típus | Leírás |
|------|-------|--------|
| id | BIGSERIAL | Elsődleges kulcs |
| table_id | BIGINT | Asztal referencia |
| menu_item_id | BIGINT | Menüpont referencia |
| quantity | INT | Mennyiség |
| created_at | TIMESTAMP | Létrehozás ideje |

### payments (Fizetések)
| Mező | Típus | Leírás |
|------|-------|--------|
| id | BIGSERIAL | Elsődleges kulcs |
| table_id | BIGINT | Asztal referencia |
| total_amount | DECIMAL | Összeg (Ft) |
| status | TEXT | pending/completed/failed |
| payment_method | TEXT | Fizetési módszer |
| customer_name | TEXT | Ügyfél neve |
| customer_email | TEXT | Ügyfél email-je |
| created_at | TIMESTAMP | Fizetés ideje |
| completed_at | TIMESTAMP | Teljesítés ideje |

## 🔐 Biztonsági Megjegyzések

⚠️ **Ez egy demo alkalmazás!** Produkcióban:

1. Engedélyezz Row Level Security (RLS) politikákat
2. Valós fizetési gateway integrálása (Stripe, PayPal)
3. HTTPS használata
4. Jelszó hashing (bcrypt)
5. Rate limiting
6. Input validáció és sanitizáció
7. CSRF protection
8. Audit logging

## 🐛 Hibaelhárítás

### "Asztal nem található"
- Győződj meg, hogy az asztal szám helyesen van bevezetve
- Ellenőrizd, hogy az asztal valóban létezik az admin panelben

### "Supabase connection error"
- Ellenőrizd a config.js-ben lévő URL-t és API kulcsot
- Bizonyosodj meg, hogy a Supabase projekt aktív
- Ellenőrizd az internet kapcsolatot

### "Valós idejű frissítések nem működnek"
- Engedélyezd a Realtime-ot a Supabase Dashboard-ban
- Frissítsd az oldalt (F5)

### QR-kód nyomtatás nem működik
- Használj modern böngészőt
- Próbáld meg a „Print to PDF" opciót

## 📚 További Fejlesztések

Lehetséges jövőbeli funkciók:
- [ ] Valós fizetési integrációk
- [ ] Email számlaküldés
- [ ] SMS értesítések
- [ ] Felhasználói fiókok
- [ ] Kedvezmények és kuponok
- [ ] Analytics és riportok
- [ ] Többnyelvű támogatás
- [ ] Offline mód
- [ ] Dark mode

## 📄 Licenc

MIT License - Szabadon használható és módosítható

## 👥 Szerzők

Török Péter - Kezdeti fejlesztés

## 📧 Támogatás

Problémák, kérdések, vagy ötletek? Nyiss egy issue-t a GitHub-on!

---

**Készült 2026-ban** | **EBV - Asztalos Fizetési Rendszer v1.0**
