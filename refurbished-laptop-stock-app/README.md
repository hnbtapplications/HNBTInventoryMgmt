# Hertz & Bytes — Refurbished Laptop Management

Production module for refurbished laptop receiving, inspection, stock control, Bangalore/Hosur transfers, sales, movement correction history, reporting and administrator-controlled user rights.

## Architecture
- React + Vite frontend
- Vercel serverless API under `/api`
- Supabase PostgreSQL as the system of record
- Supabase Auth for employee credentials
- Signed HttpOnly application session for branch/permission enforcement

## Production database
Tables: `refurb_laptops`, `refurb_stock_movements`, `refurb_movement_history`, `refurb_audit_log`.

## Operational rules
- Laptop master records require the mandatory fields enforced by the API.
- Branch employees can only modify records in their assigned branch; Administrator has Both-branch access.
- Movement records are retained; corrections create a history snapshot rather than silently overwriting history.
- Laptops with movement history are not hard-deleted; they should be marked Scrap when retired.
- User administration is restricted to Administrator.

## Deployment
The module is deployed through the existing `hnbt-inventory-mgmt` Vercel project and uses the production GitHub `main` branch.

## Development sequence
Receiving/import → inspection → repair/spares → ready-for-sale approval → sales handoff → warranty/service → operational reports → audit/management dashboards.
