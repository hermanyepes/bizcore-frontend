# BizCore Frontend

Angular frontend for **BizCore** — a generic business management platform that covers users, products, inventory, suppliers, orders, and a real-time dashboard.

---

## Stack

| Technology | Version | Purpose |
|---|---|---|
| Angular | 21.2 | SPA framework |
| TypeScript | 5.x | Language |
| Vitest | via `@angular/build` | Unit testing |
| Chart.js | 4.x | Dashboard donut chart |
| SCSS | — | Styling (dark theme) |

---

## Prerequisites

- Node.js ≥ 20
- npm ≥ 11
- Angular CLI 21: `npm install -g @angular/cli@21`
- BizCore backend running locally (see [backend README](../../backend/README.md))

---

## Running locally

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
ng serve
```

Open `http://localhost:4200` in your browser.

The app expects the backend at `http://localhost:8000/api/v1` (configured in `src/environments/environment.ts`).

---

## Running tests

```bash
ng test --watch=false
```

Current test count: **478 tests passing**.

---

## Production build

```bash
ng build
```

Output goes to `dist/bizcore-frontend/`. No environment variables are needed at build time — the API URL is baked in via `environment.prod.ts`.

---

## Environment configuration

There are two environment files under `src/environments/`:

| File | Used when |
|---|---|
| `environment.ts` | `ng serve` (development) |
| `environment.prod.ts` | `ng build` (production) |

To point the app at a different backend, edit `apiUrl` in the relevant file:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api/v1',
};
```

---

## Folder structure

```
src/app/
├── core/                     # Singleton services, models, interceptors, layout
│   ├── auth/                 # AuthService, AuthGuard, token refresh logic
│   ├── interceptors/         # HTTP interceptors (auth token, loading spinner)
│   ├── layout/               # Shell layout, navbar, sidebar drawer
│   │   ├── confirm-dialog/   # Reusable confirmation dialog
│   │   ├── loading-spinner/  # Global loading overlay
│   │   └── snackbar/         # Global toast notifications
│   ├── models/               # TypeScript interfaces (User, Product, Supplier…)
│   └── services/             # Shared services (LoadingService, SnackbarService…)
│
└── features/                 # Lazy-loaded feature modules
    ├── login/                # Login page
    ├── dashboard/            # KPI summary + Chart.js donut
    ├── users/                # User list, detail, create/edit form
    ├── products/             # Product list, detail, create/edit form
    ├── inventory/            # Inventory list, stock adjustment form
    ├── suppliers/            # Supplier list, detail, create/edit form
    └── orders/               # Order list, detail, create form
```

---

## Features

- **JWT authentication** with automatic token refresh (access token + refresh token)
- **Role-based UI** — Admin vs. Employee views
- **Global loading spinner** on every HTTP request
- **Snackbar notifications** for success / error feedback
- **Confirmation dialogs** before destructive actions (delete, cancel order)
- **Responsive layout** — collapsible sidebar drawer on mobile, scrollable tables, single-column forms on small screens
- **Dark theme** — slate + amber palette, Syne / DM Sans / JetBrains Mono fonts

---

## Screenshots

> Screenshots will be added after the final polish pass.

---

## Backend

The REST API is built with **FastAPI + PostgreSQL**. See the [backend repository](https://github.com/hermanyepes/bizcore) for setup instructions.
