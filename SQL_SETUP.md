# SQL Adatbázis Beállítása

Ez a fájl lépésről lépésre ismerteti, hogyan kell létrehozni az EBV rendszerhez szükséges adatbázis táblákat.

## 📋 Tartalomjegyzék
1. [Lépés 1: Supabase Dashboard megnyitása](#lépés-1)
2. [Lépés 2: SQL Editor](#lépés-2)
3. [Lépés 3: Táblák létrehozása](#lépés-3)
4. [Lépés 4: Realtime engedélyezése](#lépés-4)
5. [Lépés 5: Tesztadatok beszúrása](#lépés-5)

---

## Lépés 1: Supabase Dashboard Megnyitása {#lépés-1}

1. Menj a [Supabase.com](https://supabase.com) oldalra
2. Kattints a **"Sign In"** gombra (vagy hozz létre új fiókot)
3. Válaszd ki a projektedet vagy hozz létre egy újat
4. Nyisd meg a Dashboard-ot

---

## Lépés 2: SQL Editor Megnyitása {#lépés-2}

1. A Supabase Dashboard bal oldali menüjében kattints az **"SQL Editor"** gombra
2. Kattints az **"New Query"** gombra
3. Megnyílik egy üres SQL szerkesztő

---

## Lépés 3: Táblák Létrehozása {#lépés-3}

Másold be az alábbi SQL kódot a szerkesztőbe és futtasd le a **"Run"** gombbal.

### 3.1 Tables (Asztalok) Tábla

```sql
-- Asztalok tábla
CREATE TABLE IF NOT EXISTS public.tables (
  id BIGSERIAL PRIMARY KEY,
  table_number INT UNIQUE NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'paying')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index létrehozása gyorsabb kereséshez
CREATE INDEX idx_tables_number ON public.tables(table_number);
CREATE INDEX idx_tables_qr ON public.tables(qr_code);
CREATE INDEX idx_tables_status ON public.tables(status);
```

### 3.2 Menu Items (Menü Tételek) Tábla

```sql
-- Menü tételek tábla
CREATE TABLE IF NOT EXISTS public.menu_items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT DEFAULT 'other',
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index létrehozása
CREATE INDEX idx_menu_items_category ON public.menu_items(category);
CREATE INDEX idx_menu_items_available ON public.menu_items(available);
```

### 3.3 Orders (Rendelések) Tábla

```sql
-- Rendelések tábla
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  table_id BIGINT NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  menu_item_id BIGINT NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(table_id, menu_item_id)
);

-- Index létrehozása
CREATE INDEX idx_orders_table ON public.orders(table_id);
CREATE INDEX idx_orders_menu_item ON public.orders(menu_item_id);
```

### 3.4 Payments (Fizetések) Tábla

```sql
-- Fizetések tábla
CREATE TABLE IF NOT EXISTS public.payments (
  id BIGSERIAL PRIMARY KEY,
  table_id BIGINT NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_method TEXT DEFAULT 'card',
  customer_name TEXT,
  customer_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Index létrehozása
CREATE INDEX idx_payments_table ON public.payments(table_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created ON public.payments(created_at);
```

---

## Lépés 4: Realtime Engedélyezése {#lépés-4}

Ahhoz, hogy a valós idejű frissítések működjenek, engedélyezd a Realtime publikációt:

```sql
-- Realtime publikáció engedélyezése
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
```

---

## Lépés 5: Tesztadatok Beszúrása {#lépés-5}

(Opcionális) Tesztadatok felöltéséhez használd az alábbi SQL kódot:

### 5.1 Asztalok Hozzáadása

```sql
-- Asztalok beszúrása (1-10)
INSERT INTO public.tables (table_number, qr_code, status) VALUES
  (1, 'TABLE_1_' || EXTRACT(EPOCH FROM NOW())::BIGINT, 'available'),
  (2, 'TABLE_2_' || EXTRACT(EPOCH FROM NOW())::BIGINT, 'available'),
  (3, 'TABLE_3_' || EXTRACT(EPOCH FROM NOW())::BIGINT, 'available'),
  (4, 'TABLE_4_' || EXTRACT(EPOCH FROM NOW())::BIGINT, 'occupied'),
  (5, 'TABLE_5_' || EXTRACT(EPOCH FROM NOW())::BIGINT, 'available'),
  (6, 'TABLE_6_' || EXTRACT(EPOCH FROM NOW())::BIGINT, 'available'),
  (7, 'TABLE_7_' || EXTRACT(EPOCH FROM NOW())::BIGINT, 'paying'),
  (8, 'TABLE_8_' || EXTRACT(EPOCH FROM NOW())::BIGINT, 'available');
```

### 5.2 Menü Tételek Hozzáadása

```sql
-- Menü tételek beszúrása
INSERT INTO public.menu_items (name, description, price, category, available) VALUES
  -- Előételek
  ('Bruschetta', 'Friss paradicsom, fokhagyma és olívaolaj', 1200, 'appetizer', true),
  ('Görög saláta', 'Saláta feta sajttal és olívával', 1500, 'appetizer', true),
  
  -- Főételek
  ('Margherita Pizza', 'Klasszikus pizza mozzarella és paradicsommal', 2200, 'main', true),
  ('Carbonara Spagetti', 'Spagetti füstölt sonkával és parmezán sajttal', 2500, 'main', true),
  ('Grillezett hal', 'Friss hal grillezve citrommal', 3200, 'main', true),
  ('Caesars szaláta', 'Saláta baconnal, parmezán sajttal, caesars öntettel', 1800, 'main', true),
  
  -- Desszertek
  ('Tiramisu', 'Olasz desszert mascarpone és kávéval', 1400, 'dessert', true),
  ('Csokis torta', 'Gazdag csokis desszert', 1300, 'dessert', true),
  
  -- Italok
  ('Espresso', 'Erős fekete kávé', 600, 'beverage', true),
  ('Cappuccino', 'Kávé tejhab és kakaóval', 800, 'beverage', true),
  ('Coca-Cola', 'Klasszikus üdítő ital', 500, 'beverage', true),
  ('Narancslé', 'Friss narancslé', 700, 'beverage', true),
  ('Ásványvíz', 'Hideg ásványvíz', 400, 'beverage', true);
```

### 5.3 Tesztfizetés Hozzáadása

```sql
-- Tesztfizetés beszúrása
INSERT INTO public.payments (table_id, total_amount, status, payment_method, customer_name, customer_email, completed_at) VALUES
  (1, 5200, 'completed', 'card', 'Nagy János', 'janos@example.com', NOW()),
  (2, 3800, 'completed', 'cash', 'Kiss Mária', 'maria@example.com', NOW() - INTERVAL '1 hour'),
  (3, 7600, 'pending', 'card', 'Szabó Péter', 'peter@example.com', NULL);
```

---

## ✅ Ellenőrzés

Hogy ellenőrizd, mindent helyesen csináltál-e, futtasd le az alábbi SQL-t:

```sql
-- Táblák meglétének ellenőrzése
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Táblák tartalmának ellenőrzése
SELECT COUNT(*) as table_count FROM public.tables;
SELECT COUNT(*) as menu_count FROM public.menu_items;
SELECT COUNT(*) as order_count FROM public.orders;
SELECT COUNT(*) as payment_count FROM public.payments;
```

---

## 🔒 Biztonsági Beállítások (Kötelező a demo apphoz)

Ez az alkalmazás a Supabase anon kulcsot használja a böngészőből, és nem használ Supabase Auth bejelentkezést. Ha RLS-t bekapcsolsz, akkor olyan policy-k kellenek, amelyek engedélyezik az olvasást és írást is a demo számára.

### Enable RLS on all tables

```sql
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
```

### Simple public read/write policy (development only)

```sql
-- Allow everyone to read
CREATE POLICY "Enable read access for all users" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.payments FOR SELECT USING (true);

-- Allow everyone to insert/update/delete for the demo frontend
CREATE POLICY "Enable insert for all users" ON public.tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON public.menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON public.payments FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.tables FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.menu_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.payments FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON public.tables FOR DELETE USING (true);
CREATE POLICY "Enable delete for all users" ON public.menu_items FOR DELETE USING (true);
CREATE POLICY "Enable delete for all users" ON public.orders FOR DELETE USING (true);
CREATE POLICY "Enable delete for all users" ON public.payments FOR DELETE USING (true);
```

---

## 🐛 Gyakori Hibák

### "Table already exists"
Ez normális, ha már létezik a tábla. Módosítsd a `CREATE TABLE` -t `CREATE TABLE IF NOT EXISTS` -re.

### "FOREIGN KEY constraint failed"
Győződj meg, hogy az asztal- és menüpontok már léteznek az adatbázisban.

### "Realtime nem működik"
Ellenőrizd, hogy engedélyezted-e az ALT PUBLICATION parancsot.

---

## 📚 További Referenciák

- [Supabase SQL Documentation](https://supabase.com/docs/guides/sql)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

**Sikeres beállítás után menj vissza a README.md-hez az alkalmazás futtatásához!**
