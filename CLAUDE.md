# CLAUDE.md

## Qué es esto
"SocialFlow: Creative Production Manager" — herramienta multiusuario de producción de contenido para redes sociales (agencias/clientes): calendario editorial, workflow de aprobación por roles, versionado de copy/diseño y feedback. Generado con Google AI Studio.

## Stack
- Vite + React + TypeScript
- Backend ligero con Express (`server.ts`) servido con `tsx`
- Firebase (Firestore) como base de datos — reglas en `firestore.rules`
- Gemini API (`@google/genai`) — requiere `GEMINI_API_KEY`
- Tailwind (`@tailwindcss/vite`), `motion`, `lucide-react`, `react-hot-toast`

## Comandos
```
npm install
npm run dev      # tsx server.ts
npm run build    # vite build + bundle del server con esbuild
npm run start    # node dist/server.cjs
npm run lint     # tsc --noEmit
npm run clean    # rm -rf dist
```

## Configuración necesaria
1. Copiar `.env.example` a `.env.local`.
2. Rellenar `GEMINI_API_KEY` con una clave válida de Gemini.
3. Revisar `firebase-blueprint.json` / `firebase-applet-config.json` para la config de Firebase.

## Estructura
- `src/components/` — `Calendar.tsx`, `Board.tsx`, `PostModal.tsx`, feeds por red (`InstagramFeed.tsx`, `TikTokFeed.tsx`, `LinkedInFeed.tsx`), `SettingsView.tsx`, `NotificationsStream.tsx`
- `src/lib/firebase.ts` — cliente de Firebase
- `src/types.ts` — tipos del dominio (Post, fases, roles)
- `security_spec.md` — especificación detallada de reglas de seguridad Firestore (invariantes de datos, casos de abuso a bloquear: escalado de fase, spoofing de timestamp, hijacking de rol, etc.) — usar como referencia al tocar `firestore.rules`.

## Estado
- Sin repo git.

## Pendiente
1. Configurar `GEMINI_API_KEY` para poder arrancarlo.
2. Inicializar git.
3. Validar `firestore.rules` contra los casos listados en `security_spec.md`.
