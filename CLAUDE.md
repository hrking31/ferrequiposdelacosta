# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The git repository root is `FERREQUIPOS DE LA COSTA/`, but the entire application lives in the
`ferrequiposdelacosta/` subdirectory. **All npm and firebase commands must be run from
`ferrequiposdelacosta/`**, not the repo root.

The Cloud Functions are a nested npm project at `ferrequiposdelacosta/functions/` with their own
`package.json` and dependencies.

## Commands

Run from `ferrequiposdelacosta/`:

- `npm run dev` — Vite dev server, bound to `0.0.0.0` so phones/tablets on the LAN can load the PWA (and the service worker is enabled in dev via `devOptions`).
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve the built `dist/`.
- `npm run lint` — ESLint over `src` with `--max-warnings 0` (a warning fails the command). There is **no test framework** configured.
- `firebase deploy` — deploys hosting (`dist/`) + functions. `firebase deploy --only hosting` or `--only functions` to scope. Deploying functions runs `npm run lint` inside `functions/` as a predeploy hook, so a lint error there blocks the deploy.

Run from `ferrequiposdelacosta/functions/`:

- `npm run serve` — Functions emulator. `npm run logs` — production logs. Functions target Node 22 and use ESLint with `eslint-config-google`.

**`src/Components/Firebase/firebaseConfig.js` is gitignored.** A fresh clone will not build or run until this file is recreated (it exports a `firebaseConfig` object with the project's web API keys; see `Firebase.js` for the expected shape).

## Language & domain

This is the internal + public web app for **Ferrequipos de la Costa**, a construction-equipment
rental company on the Colombian Caribbean coast. Code identifiers, routes, and UI are in **Spanish**
— match that convention. Key domain terms:

- **equipos** — rentable equipment items (Firestore `equipos` collection).
- **cotización** — a quote/rental request. **cuenta de cobro** — an invoice/billing document.
- **cliente** — customer. **usuarios** — internal staff accounts with roles/permissions.

## Architecture

React 18 + Vite SPA, MUI (Emotion) for UI, Redux Toolkit for state, React Router v6, installable as a
PWA (`vite-plugin-pwa`, `registerType: autoUpdate`). Firebase is the entire backend.

### Provider stack (`src/main.jsx`)

`Provider` (Redux) → `BrowserRouter` → `CustomThemeProvider` → `AuthProvider` → `App`. Anything needing
auth, theme, or store must sit inside this stack.

### Firebase — three data stores used together (`src/Components/Firebase/Firebase.js`)

The app mixes Firestore, Realtime Database, and Storage deliberately — know which is which:

- **Firestore** (`db`): durable documents — `users/{uid}` (profile: name, role, permisos, photoURL) and the `equipos` collection.
- **Realtime Database** (`database`): live/ephemeral data — `cotizaciones` (incoming quote requests, streamed live) and `usuariosConectados/{uid}` (online presence).
- **Storage** (`storage`): equipment images.
- **Auth** (`auth`) and callable **Functions** (`functions`).

### Auth & presence (`src/Context/AuthContext.jsx`)

`AuthProvider` exposes `login`, `logout`, `user`, `loading` via `useAuth()`. On `onAuthStateChanged`
it loads the Firestore `users/{uid}` profile, merges it into a `fullUserData` object, pushes it to the
Redux `user` slice, and calls `registrarConexion(uid)` which writes presence to RTDB with an
`onDisconnect` handler (so a dropped tab auto-marks the user offline). `logout` explicitly writes
`online: false` before `signOut`.

### Authorization is client-side only

Role → permission mapping lives in `src/Components/RolesPermisos/RolesPermisos.jsx` (roles like
`administrador`, `gestorFacturacion`, `gestorEditor`, `gestorIntegral`; permissions like `cotizacion`,
`cuentaCombro`, `crearEquipos`, `crearUsuarios`, `solicitudesCotizaciones`). Two enforcement points:

- `ProtectedRoutes` wraps routes in `App.jsx` and checks `allowedRoles` against the current user's role's permission list.
- `AdminForms` conditionally renders each action button by checking `permisos.includes(...)`.

There is no server-side rule enforcement in this repo, so treat permission gating as UX, not security.
(Note: permission spelling is `cuentaCombro` — a typo baked into the data model, kept consistent across code.)

### Two front-ends in one app: Admin vs. Kiosk

The same SPA serves the internal admin tool and a public "Kiosk" catalog:

- **Admin flow**: `Home` (`/`) redirects logged-in users to `/adminforms`, the permission-gated hub linking to quote/invoice/equipment/user management views (`Vista*` under `src/Views/`).
- **Kiosk flow**: routes containing `kiosk` (`/kioskhome`, `/kioskdetail/:id`, `/kioskcart`). `CustomThemeProvider` **force-sets dark mode on any kiosk route** and restores the saved theme when leaving. `KioskHome` mounts a `KioskScreensaver` (idle timeout). `App.jsx` plays `/notification.mp3` when a new cotización arrives — but suppresses it on kiosk/`vistacart` routes.

### Cotización (quote) lifecycle

1. Customer builds a cart (`cartSlice`, persisted to `localStorage` under `cart`) and fills client data (`clienteSlice`, persisted under `datosCliente`).
2. `VistaCart` / `KioskCart` submit via the callable Cloud Function **`crearCotizacion`**, which pushes a record into RTDB `cotizaciones` with `status: "pendiente"` and a generated `cotizacionId`. `VistaCart` also opens a prefilled WhatsApp deep link.
3. `App.jsx` subscribes to RTDB `cotizaciones` with `onValue`, keeps `cotizacionSlice.listaCotizaciones` in sync in real time, and rings the notification sound for genuinely new entries (tracked via refs to avoid firing on the initial load).
4. Staff with `solicitudesCotizaciones` handle requests in `VistaCotizacionesAdmin` → `AdminCotizaciones`; the in-progress quote being edited lives in `cotizacionSlice.value` and is persisted to `localStorage` under `sesion_trabajo_cotizacion`.

### Cloud Functions (`functions/index.js`, callable/`onCall`)

- `createUser` / `deleteUser` — create/remove a Firebase Auth user **and** the matching Firestore `users/{uid}` document (used by the user-management views; client-side signup can't create Auth users with admin privileges).
- `crearCotizacion` — validates and writes a quote into RTDB `cotizaciones`.

### Redux store (`src/Store/Store.js`)

One slice per concern under `src/Store/Slices/`. Several slices persist to `localStorage` inside their
reducers (`cart`, `cliente`, `cotizacion`) — when adding fields to those, keep the persistence writes in
sync. `equiposSlice` loads the catalog once via a `createAsyncThunk` (`fetchEquiposData`) and views guard
the fetch with `if (equipos.length === 0)` so navigation doesn't re-query Firestore.

### Theming (`src/Theme/ThemeProvider.jsx`)

A single large `createTheme` wrapped in `responsiveFontSizes`, with light/dark mode persisted to
`localStorage` (`theme`) — except kiosk routes, which force dark. Beyond the standard palette it defines:

- A **`custom`** palette key (`theme.palette.custom.primary/secondary`).
- Custom MUI **Button variants**: `danger`, `success`, `whatsapp`, `call`, `adminSquare`, `quotationSquare`. Prefer these over ad-hoc `sx` colors when adding buttons, to stay consistent.

### PDF generation

Quotes and cuentas de cobro render to PDF client-side with `jspdf` + `jspdf-autotable` in the
`src/Components/VistaPdf/` components (`VistaCotPdf`, `VistaCcPdf`); `VistaWeb/` holds the on-screen
equivalents. `firebase` and `jspdf` are split into their own build chunks in `vite.config.js`.

## Notes

- `install.cmd` at the project root is the Claude Code Windows bootstrap script — unrelated to the app; do not treat it as source.
