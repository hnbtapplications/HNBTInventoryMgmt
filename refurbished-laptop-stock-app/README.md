# Hertz & Bytes Refurbished Laptop Management

This application is connected to Supabase PostgreSQL and Supabase Auth. The Vercel project is the HNBT Inventory Management deployment, with this application isolated under `refurbished-laptop-stock-app/`.

## Cloud
- Supabase project: HNBTInventoryMgmt
- Tables: refurb_laptops, refurb_stock_movements, refurb_movement_history, refurb_audit_log
- Authentication: Supabase Auth
- Access: active employee_profiles only
- Vercel: HNBT Inventory Management team deployment

## Features
Laptop master, refurbishment condition checks, Bangalore/Hosur locations, transfers, sales, movement correction history, audit trail, search, reports and CSV export.

## Run
npm install
npm run dev

The client reads VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY when supplied; otherwise it uses the configured HNBTInventoryMgmt Supabase endpoint and publishable client key.