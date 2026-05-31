// Supabase Configuration
// Előbb be kell állítanod a saját Supabase URL-t és API kulcsot
const SUPABASE_URL = 'https://qkvfmedgnnrnlgavzakv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdmZtZWRnbm5ybmxnYXZ6YWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDEyNTgsImV4cCI6MjA5NTgxNzI1OH0.HlEvZmAoG12W--5GLj43RjF602Zs445uRgAzy3iWSwQ';

// Ha lokálisan tesztelted, kommenteld ki a fenti sorokat és használd ezt:
// const SUPABASE_URL = '';
// const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdmZtZWRnbm5ybmxnYXZ6YWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDEyNTgsImV4cCI6MjA5NTgxNzI1OH0.HlEvZmAoG12W--5GLj43RjF602Zs445uRgAzy3iWSwQ';

// Supabase client inicializálása
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Adatbázis séma létrehozásához szükséges SQL (Supabase SQL Editor-ban futtasd le):
/*
-- Tables tábla
CREATE TABLE IF NOT EXISTS tables (
  id BIGSERIAL PRIMARY KEY,
  table_number INT UNIQUE NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'paying')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Menu items tábla
CREATE TABLE IF NOT EXISTS menu_items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT DEFAULT 'other',
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders tábla
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  table_id BIGINT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  menu_item_id BIGINT NOT NULL REFERENCES menu_items(id),
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(table_id, menu_item_id)
);

-- Payments tábla
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  table_id BIGINT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_method TEXT DEFAULT 'card',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Realtime subscriptions engedélyezése
ALTER PUBLICATION supabase_realtime ADD TABLE tables, menu_items, orders, payments;
*/
