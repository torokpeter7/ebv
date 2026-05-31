// =====================================
// EBV - Supabase Konfigurációs Fájl
// =====================================

const SUPABASE_URL = 'https://qkvfmedgnnrnlgavzakv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdmZtZWRnbm5ybmxnYXZ6YWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDEyNTgsImV4cCI6MjA5NTgxNzI1OH0.HlEvZmAoG12W--5GLj43RjF602Zs445uRgAzy3iWSwQ';

// Supabase kliens inicializálása (csak ha még nem egy kliens van a globálon)
if (!window.supabase || typeof window.supabase.from !== 'function') {
  const { createClient } = window.supabase;
  window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

console.log('✅ Supabase konfigurálva');
console.log('URL:', SUPABASE_URL);