-- ============================================================
-- Hertz & Bytes Technologies - Inventory Database Schema
-- Run this in your Supabase SQL Editor to set up all tables & RLS
-- ============================================================

-- 1. Create Brands Table
CREATE TABLE IF NOT EXISTS public.brands (
    name TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    name TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Units Table
CREATE TABLE IF NOT EXISTS public.units (
    name TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    unit TEXT DEFAULT 'Nos',
    purchase NUMERIC DEFAULT 0,
    sale NUMERIC DEFAULT 0,
    min INTEGER DEFAULT 5,
    bangalore INTEGER DEFAULT 0,
    hosur INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Movements Table
CREATE TABLE IF NOT EXISTS public.movements (
    id BIGINT PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    "productId" TEXT,
    product TEXT NOT NULL,
    branch TEXT NOT NULL,
    qty INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for the app (Anon Key)
CREATE POLICY "Allow public read-write for brands" ON public.brands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for units" ON public.units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for movements" ON public.movements FOR ALL USING (true) WITH CHECK (true);

-- Insert Default Master Data
INSERT INTO public.brands (name) VALUES 
    ('Dell'), ('HP'), ('Lenovo'), ('Logitech'), ('Cisco'), ('VCloud'), ('Clientronix'), ('Hertz & Bytes')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.categories (name) VALUES 
    ('Accessories'), ('Desktops'), ('Laptops'), ('Networking'), ('Thin Client'), ('Mini PC'), ('Servers')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.units (name) VALUES 
    ('Nos'), ('Pcs'), ('Sets'), ('Box'), ('Mtr')
ON CONFLICT (name) DO NOTHING;
