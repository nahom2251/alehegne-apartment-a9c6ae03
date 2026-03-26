# AS Apt. — Alehegne Sewnet Apartment Management System

A full-stack apartment management system built with React, Vite, TypeScript, and Lovable Cloud (Supabase).

## Features

- **Authentication** — Email/password login with "Remember Me" and password reset
- **Apartment Management** — Track tenants, units, occupancy, and move-in dates across floors 2–5
- **Billing System** — Electricity (kWh-based formula), water, and rent billing with month/year filters
- **PDF Generation** — Downloadable invoices (pending) and receipts (paid) via jsPDF with payment instructions
- **Revenue Dashboard** — Recharts-powered bar/pie charts with PDF export
- **Notification System** — Real-time alerts for overdue rent, pending bills, and user approvals
- **Role-Based Access** — Super Admin, Admin, and User roles with approval workflow
- **Bilingual UI** — English and Amharic (አማርኛ) language toggle
- **PWA** — Installable with offline caching via service worker
- **Mobile-First** — Responsive sidebar with close button, optimized for all screen sizes

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Lovable Cloud (Supabase) — Auth, PostgreSQL, Row Level Security
- **Charts:** Recharts
- **PDF:** jsPDF
- **Routing:** React Router v6

## Payment Configuration

| Bill Type | Method | Account Name | Account Number |
|-----------|--------|-------------|----------------|
| Rent | CBE Bank Transfer | Bayush Kassa | 1000499143072 |
| Water & Electricity | Telebirr | Alehegne | 0911238816 |

## Electricity Formula

```
Total = (kWh × rate) + 16 (service) + 15% tax + 10 (TV tax) + 0.5% control tax
```

## Getting Started

```bash
npm install
npm run dev
```

## Project Structure

```
src/
├── components/     # UI components (AppLayout, Sidebar, NotificationBell, etc.)
├── contexts/       # AuthContext, LanguageContext
├── hooks/          # useNotifications, use-mobile
├── integrations/   # Supabase client & types
├── lib/            # PDF generator utilities
├── pages/          # Route pages (Dashboard, Apartments, Bills, Revenue, Auth)
public/
├── manifest.json   # PWA manifest
├── sw.js           # Service worker
```

---

Powered by **NUN Tech**
