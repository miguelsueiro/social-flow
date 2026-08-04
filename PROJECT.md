# PROJECT.md

> Documento de contexto permanente del proyecto **SocialFlow**. Generado como parte de un handoff para continuar el trabajo en una conversación nueva sin pérdida de contexto. Última actualización: tras el commit `50a4bbc` (rama `main`, working tree limpio).

---

## 1. Objetivo del proyecto

**SocialFlow: Creative Production Manager** es una herramienta multiusuario de producción de contenido para redes sociales, pensada para que una **agencia creativa** y sus **clientes** colaboren en el mismo espacio.

### Qué hace
- Calendario editorial y tablero Kanban para planificar posts de Instagram, LinkedIn y TikTok.
- Workflow de aprobación por fases (idea → copy → diseño → revisión del cliente → aprobado → publicado), con una fase adicional de "Cambios Solicitados" cuando el cliente rechaza.
- Versionado de copy y de diseño (historial de versiones restaurables).
- Sistema de comentarios internos (solo agencia) y feedback de cliente (separado, con checklist de "hecho/pendiente").
- Simuladores de feed realistas para Instagram, LinkedIn y TikTok — permiten ver cómo se vería un post ya publicado en cada red antes de publicarlo de verdad.
- Gestión de usuarios con roles diferenciados (agencia vs. cliente) y control de acceso por proyecto.
- Traducción asistida por IA (Gemini) del copy/caption a otros idiomas.

### Qué problema resuelve
Sustituye el flujo típico de agencias de "Excel + hilos de email interminables + Drive desordenado" por un espacio único donde: la agencia produce, versiona y discute internamente; el cliente revisa y aprueba sin ver el ruido interno (comentarios internos, fase de ideas); y todo el mundo ve el estado real de cada pieza de contenido en tiempo real (Firestore listeners).

### Objetivos principales (por orden de prioridad histórico en el proyecto)
1. Cerrar los agujeros de seguridad del prototipo inicial (registro abierto, fuga de datos entre clientes, escalado de rol) — **hecho**.
2. Pulir la experiencia de uso (UX) de los flujos existentes — **hecho**.
3. Añadir funcionalidades de producto que faltaban (responsable de post, filtros, fase de rechazo, feeds realistas) — **hecho**.
4. Modernizar visualmente toda la plataforma con un sistema de diseño coherente ("SaaS Premium") — **hecho**, con dos rondas de corrección de regresiones.
5. Añadir funcionalidades puntuales pedidas por el cliente final (portada de reel IG, enrutado de "Comentar", dimensiones de reel por plataforma) — **hecho**, excepto el envío de email al invitar usuarios (**pendiente**, requiere que el usuario elija y configure un proveedor de email).
6. Migrar a servidor propio + "base de datos top" — **NO iniciado**, es el motivo de este documento de handoff.

### Estado del proyecto
Según `CLAUDE.md`: **"Sin repo git"** — esto está **desactualizado**, el repo ya existe y está en GitHub (`https://github.com/miguelsueiro/social-flow`, rama `main`, historial de ~20 commits). Es un prototipo generado originalmente con **Google AI Studio**, en fase de **testeo interno de la empresa**, desplegado en Vercel. El propio usuario ha dejado explícito varias veces en esta conversación: *"aunque ahora mismo esté en producción, lo tenemos en testeo interno... una vez funcione todo correctamente añadiremos una base de datos con muchas menos limitaciones y puede ser que hasta cambiemos el server"* — es decir, la migración a servidor propio + BD "top" (el motivo de este handoff) es un movimiento **ya decidido y esperado**, no una idea especulativa.

---

## 2. Stack tecnológico

### Frontend
- **React 19.0.0** + **TypeScript** (`~5.8.2`, modo `strict`-ish vía `tsconfig.json`)
- **Vite 6.2.0** como bundler y dev server, con `@vitejs/plugin-react` (^5.0.4)
- **Tailwind CSS v4.1.14** — configuración **CSS-first** vía `@tailwindcss/vite`. **No existe `tailwind.config.js`**; todo el theme (colores, radios, sombras, tipografía) vive en un único bloque `@theme` dentro de `src/index.css`.
- **Motion** (`motion` ^12.23.24, es la librería "Framer Motion" renombrada) para animaciones de entrada/salida y transiciones de layout.
- **lucide-react** (^0.546.0) — única librería de iconos.
- **date-fns** (^4.1.0) — formateo de fechas.
- **react-hot-toast** (^2.6.0) — sistema de notificaciones toast.
- **clsx** (^2.1.1) + **tailwind-merge** (^3.5.0) — combinados en el helper `cn()` de `src/lib/utils.ts`, usado en *todo* el código para componer clases condicionales.
- **Sin router**: no hay `react-router` ni equivalente. Toda la navegación es estado de React (`sidebarTab`, `activeProjectId`, `view`) dentro de `App.tsx`.

### Backend
- **Express 4.21.2** (`server.ts`), ejecutado con **tsx** (^4.21.0) en desarrollo.
- Build de producción: `vite build` (frontend) + `esbuild` (^0.28.1) empaquetando `server.ts` a CommonJS (`dist/server.cjs`), ejecutado con `node`.
- **@vercel/node** (^5.8.27) para la variante serverless de la única ruta de API, usada cuando se despliega en Vercel.

### Base de datos / Auth
- **Firebase 12.12.1** (SDK cliente-only, no Admin SDK):
  - **Firestore** como única base de datos.
  - **Firebase Auth** con **Google Sign-In** (`GoogleAuthProvider` + `signInWithPopup`) como único método de login.
  - **No se usa Firebase Storage.** Los archivos multimedia se guardan como base64 inline en documentos de Firestore (ver sección 4, es la limitación más importante para la migración).

### IA
- **@google/genai** (^1.29.0) — SDK de Gemini, usado únicamente para traducir copy/caption (`gemini-3.5-flash`).

### Herramientas de desarrollo
- `tsc --noEmit` como único "lint" (`npm run lint`) — no hay ESLint ni Prettier configurados.
- Sin tests (ni unitarios ni e2e).
- `@types/node`, `@types/react`, `@types/react-dom`, `@types/express` para tipado.

### package.json — scripts
```json
"dev": "tsx server.ts",
"build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
"start": "node dist/server.cjs",
"clean": "rm -rf dist",
"lint": "tsc --noEmit"
```

---

## 3. Arquitectura

### Arquitectura general
Aplicación **SPA client-heavy sin backend de negocio propio**. El cliente React habla directamente con Firestore vía el SDK web (listeners `onSnapshot` en tiempo real para posts, comentarios, feedbacks, notificaciones, usuarios, settings). La única pieza de servidor real es una función de traducción vía Gemini. Toda la lógica de permisos, validación de datos y control de acceso vive en:
1. **Cliente** (React) — filtra qué se muestra, deshabilita acciones no permitidas, hace validaciones de UX.
2. **`firestore.rules`** — es el **único guardián real** de seguridad; el cliente nunca debe ser el punto de confianza, pero como no hay backend, las reglas de Firestore *son* el backend de autorización.

No hay capa de API REST/GraphQL propia para el dominio (posts, proyectos, usuarios) — todo pasa por el SDK de Firestore.

### Organización de carpetas
```
social-flow/
├── api/
│   └── translate.ts          # Función serverless Vercel (traducción vía Gemini)
├── src/
│   ├── App.tsx                # Shell principal: sidebar, header, dashboard, orquestación de estado (1913 líneas)
│   ├── main.tsx                # Entry point de React (createRoot)
│   ├── index.css               # Design tokens (@theme) + estilos base globales
│   ├── types.ts                 # Tipos de dominio: Post, Project, Comment, FeedbackItem, PostVersion
│   ├── lib/
│   │   ├── firebase.ts          # Inicialización de Firebase (app, auth, db, googleProvider)
│   │   ├── utils.ts             # cn(), isVideoUrl(), ROLES, PHASES, compressImage()
│   │   └── useModalA11y.ts      # Hook compartido de accesibilidad para modales
│   └── components/
│       ├── PostModal.tsx         # El componente más grande (2266 líneas) — edición completa de un post
│       ├── SettingsView.tsx      # Gestión de usuarios, proyectos, ajustes de agencia (1264 líneas)
│       ├── InstagramFeed.tsx     # Simulador de feed de Instagram (562 líneas)
│       ├── InstagramDetailModal.tsx # Vista de detalle de un post de Instagram (560 líneas)
│       ├── TikTokFeed.tsx        # Simulador de feed de TikTok (443 líneas)
│       ├── LinkedInFeed.tsx      # Simulador de feed de LinkedIn (374 líneas)
│       ├── UserGuideModal.tsx    # Tutorial/guía de onboarding en 6 pasos (321 líneas)
│       ├── Calendar.tsx          # Vista de calendario mensual (221 líneas)
│       ├── Board.tsx             # Vista de tablero Kanban por fases (223 líneas)
│       ├── NotificationsStream.tsx # Historial de notificaciones/actividad (178 líneas)
│       ├── NewProjectModal.tsx   # Modal de creación de proyecto (194 líneas)
│       ├── SocialIcons.tsx       # Iconos SVG de marca (IG/LinkedIn/TikTok) + PLATFORM_META
│       ├── SocialCaption.tsx     # Renderizado de captions con hashtags/menciones + truncado
│       ├── TagListEditor.tsx     # Editor de listas de tags (territorios)
│       ├── Button.tsx            # Botón compartido (variant/size)
│       └── ConfirmInline.tsx     # Confirmación inline para acciones destructivas
├── firestore.rules             # Reglas de seguridad de Firestore (única capa de autorización real)
├── firebase-applet-config.json # Config pública del cliente Firebase (no es secreto)
├── firebase-blueprint.json     # ⚠️ ESQUEMA INICIAL DESACTUALIZADO — no confiar en él, ver nota abajo
├── security_spec.md            # Spec de seguridad original (los "Dirty Dozen" casos de abuso), usado como checklist en la Fase 1
├── server.ts                   # Servidor Express (para self-host / servidor propio)
├── vite.config.ts
├── vercel.json                 # Rewrites de Vercel (SPA + /api)
├── tsconfig.json
└── CLAUDE.md                    # Instrucciones de proyecto para Claude Code — ⚠️ desactualizado en el punto "Sin repo git"
```

### Flujo de datos
1. `App.tsx` es el único componente con listeners `onSnapshot` para `projects`, `posts`, `users` (rol del usuario actual), y pasa datos hacia abajo por props.
2. `PostModal.tsx` abre listeners propios para las subcolecciones `posts/{id}/comments` y `posts/{id}/feedbacks` cuando se abre un post.
3. No hay Context API ni store global (Redux/Zustand/Jotai) — todo es prop drilling desde `App.tsx`.
4. Las escrituras van directas del componente al SDK de Firestore (`updateDoc`, `addDoc`, `setDoc`), sin pasar por ninguna capa intermedia. `firestore.rules` es lo único que puede rechazar una escritura inválida.
5. El campo `updatedAt` de un post se fuerza siempre a `serverTimestamp()`/`request.time` (nunca confiado del cliente) — esto está validado tanto en el cliente como en las reglas.

### Patrones utilizados
- **`cn()` (clsx + tailwind-merge)** para componer clases Tailwind condicionales en absolutamente todo el código.
- **Guards `useRef` para idempotencia** en handlers async críticos (crear/duplicar/borrar post, añadir comentario/feedback) — evita doble-submit sin necesitar wiring visual de `disabled`.
- **`useModalA11y` hook compartido** — da a cada modal: foco atrapado, cierre con Escape, devolución de foco al elemento que abrió el modal. Usado en `PostModal`, `InstagramDetailModal`, `NewProjectModal`, `SettingsView` (sus sub-modales), `UserGuideModal`.
- **Capa de filtro derivada separada** (`calendarBoardPosts` derivado de `filteredPosts` en `App.tsx`) — los filtros de fase/plataforma/territorio/"asignado a mí" del Calendario y Tablero están deliberadamente aislados en una capa propia para que **no** contaminen los feeds simulados (que consumen `filteredPosts` sin esos filtros extra).
- **Fuente única de verdad para color/label de fase** — `PHASES` en `src/lib/utils.ts`. Antes de la Fase 3, `Board.tsx` y `Calendar.tsx` tenían cada uno su propio mapeo de color por fase (inconsistentes entre sí); ahora todo el código lee de `PHASES`.
- **Patrón "invite-then-resolve"** para altas de usuario: un admin crea un doc en `invites/{email_en_minusculas}` con rol y proyecto(s) pre-asignados; cuando esa persona hace login por primera vez con Google, la app resuelve su invite antes de crear el doc en `users/{uid}` con el rol correcto. Si no hay invite, el usuario se crea con rol `'pending'` (cero acceso) — nunca hay auto-escalado de rol.
- **Registro de colores de marca como Tailwind theme colors reales** (`--color-app-accent`, etc., en `@theme`) en vez de solo variables CSS sueltas — así Tailwind genera automáticamente todas las variantes (`bg-`, `text-`, `border-`, `hover:`, modificadores de opacidad `/10`, etc.) sin trabajo manual.
- **Sobrescritura de namespaces de color de Tailwind** (`--color-gray-*`, `--color-slate-*` redefinidos a la escala Zinc) en vez de tocar cada clase `gray-*`/`slate-*` del código — permite unificar la paleta neutra sin editar decenas de archivos.

---

## 4. Base de datos

**No hay tablas, ni relaciones SQL, ni claves foráneas, ni índices compuestos definidos, ni triggers, ni funciones, ni vistas, ni migraciones formales** — es Firestore (NoSQL documental), y el proyecto no usa Cloud Functions ni ningún trigger server-side. Todo lo que sigue es la estructura *de facto* tal como la usa el código y tal como la protege `firestore.rules`.

### Colecciones y su forma

#### `users/{uid}` (id = Firebase Auth UID)
```ts
{
  uid: string,
  email: string,
  name?: string,
  role: 'pending' | 'admin' | 'creative_director' | 'copy' | 'art_director' | 'designer' | 'account_manager' | 'community_manager' | 'client',
  projectId?: string,           // legacy: proyecto único de un cliente
  permittedProjects?: string[], // array de proyectos permitidos (agencia con acceso restringido, o cliente con varios proyectos)
  status?: 'active' | 'pending',
  avatar?: string
}
```
- **Decisión de diseño deliberada**: `projectId` (singular, legacy) y `permittedProjects` (array) coexisten. El primero es el que usan las reglas de Firestore para el scoping de cliente (`isOwnProjectAsClient`); el segundo es el que usa la UI de admin para asignar varios proyectos. Al guardar desde el panel de acceso a proyectos, `projectId` se sincroniza siempre al primer elemento de `permittedProjects`. Esto fue señalado como "confuso" por el usuario y se rediseñó la UI (chips + modal explícito) en la Fase 5, pero el **modelo de datos en sí no se cambió** — sigue habiendo dos campos representando conceptualmente lo mismo.

#### `invites/{email_lowercased}` (id = email en minúsculas)
```ts
{
  email: string,
  name: string,
  role: Role,
  projectId: string,           // solo si role === 'client'
  permittedProjects: string[], // [projectId] si es client, [] si no
  invitedBy: string | null,    // uid del admin que invitó
  invitedAt: Date
}
```
- Se resuelve en el primer login del invitado (antes de crear su doc en `users`).

#### `projects/{projectId}`
```ts
{
  id: string,
  name: string,
  clientName: string,
  color: string,       // hex, usado como acento visual del proyecto
  platforms?: string[], // ['instagram','linkedin','tiktok'] — cuáles redes tiene activas este proyecto
  territories?: string[] // tags libres (mercados/idiomas del proyecto)
}
```

#### `posts/{postId}`
```ts
{
  id: string,
  date: Date,
  platform: 'instagram' | 'linkedin' | 'tiktok',
  phase: 'idea_1' | 'idea_2' | 'copy' | 'design' | 'client_review' | 'changes_requested' | 'approved' | 'published',
  idea: string,
  format: 'estatico' | 'reel' | 'carrusel',
  projectId: string,
  title?: string,
  language?: string,
  territory?: string,
  references?: string[],
  copyCreativity?: string,
  copyCaption?: string,
  currentDesignUrl?: string,     // ⚠️ base64 inline, no es una URL real de storage
  reelCoverUrl?: string,         // NUEVO (última sesión): portada 1080x1350 para reels de Instagram, base64 inline
  carouselUrls?: string[],       // slides del carrusel, cada uno base64 inline
  videoUrl?: string,             // campo legacy, poco usado
  assigneeId?: string,
  assigneeName?: string,
  approvedBy?: string,
  approvedAt?: Date,
  changesRequestedReason?: string,
  changesRequestedAt?: Date,
  changesRequestedBy?: string,
  captionVersions?: PostVersion[],    // historial de versiones de copy/caption
  creativityVersions?: PostVersion[], // historial de versiones de copy de diseño
  designVersions?: PostVersion[],     // historial de versiones de diseño
  updatedAt: Timestamp                // SIEMPRE serverTimestamp(), nunca confiado del cliente
}
```
  - **Subcolección `posts/{postId}/comments/{commentId}`** — comentarios internos de agencia, nunca visibles para el cliente:
    ```ts
    { text: string, authorId: string, authorName: string, roleAtTime: string, createdAt: Timestamp }
    ```
  - **Subcolección `posts/{postId}/feedbacks/{feedbackId}`** — feedback bidireccional agencia↔cliente:
    ```ts
    { text: string, authorId: string, authorName: string, roleAtTime: string, createdAt: Timestamp, done: boolean, doneAt?: Timestamp, doneBy?: string }
    ```

#### `notifications/{notifId}`
```ts
{
  type: 'comment' | 'mention' | 'status' | 'create' | string,
  action: string,
  target: string,       // texto/idea del post referenciado
  projectId?: string,   // '' o ausente = notificación "legacy" visible para todos
  createdAt: Timestamp
}
```

#### `settings/agency` (documento único)
```ts
{
  agencyName: string,
  timezone: string,
  notifySlack: boolean,
  notifyEmail: boolean,
  notifyClientApprove: boolean
}
```

### "Índices" y restricciones
- No hay índices compuestos personalizados definidos explícitamente en el repo (no hay `firestore.indexes.json`). Si en producción real se necesitan queries compuestas (p. ej. `where('projectId','in',[...]) + orderBy('date')`), habrá que crear índices en la consola de Firebase — **no están versionados en el repo actual**.
- Restricciones de tamaño **auto-impuestas por el código, no por Firestore**: video ≤700KB antes de comprimir, imagen final comprimida ≤1MB (límite real de tamaño de documento de Firestore es 1MB). Esto es un parche, no una arquitectura de almacenamiento real.

### RLS (reglas de seguridad) — `firestore.rules`
Firestore no tiene RLS en el sentido de Postgres, pero el archivo `firestore.rules` (217 líneas) cumple el mismo rol. Puntos clave:
- **Deny-by-default global** (`match /{document=**} { allow read, write: if false; }`) antes de cualquier regla específica.
- Helpers: `isSignedIn()`, `isRole(role)`, `isAgencyRole()` (cualquiera de los 6 roles de agencia + admin), `isAdmin()`, `canAccessProjectAsAgency(projectId)`, `isOwnProjectAsClient(projectId)`, `isValidUser/Project/Post(data)`.
- **`users`**: cualquiera autenticado puede leer todos los perfiles (necesario para mostrar nombres/avatares). Auto-registro solo como `role:'pending'` sin permisos; cambiar de rol o de `permittedProjects`/`projectId` de uno mismo está bloqueado — solo un admin puede hacerlo (evita self-escalation).
- **`invites`**: solo admin puede crear/editar/listar; el propio invitado solo puede leer su propia invitación (comparando `request.auth.token.email.lower()` con el id del doc).
- **`projects`**: lectura abierta a cualquier autenticado; escritura solo agencia; borrado solo admin.
- **`posts`**: el `list`/`get` de agencia está acotado por `canAccessProjectAsAgency` (si el usuario tiene `permittedProjects` no vacío, solo ve esos proyectos); el de cliente está acotado por `isOwnProjectAsClient` **y** por `isClientVisible(phase)` (un cliente nunca ve fases `idea_1`/`idea_2`). La actualización de un cliente está restringida a un `diff().affectedKeys().hasOnly([...])` muy concreto (solo puede tocar `phase`, `updatedAt`, `approvedBy/At`, `changesRequestedReason/At/By`, y solo para transicionar a `client_review`/`changes_requested`/`approved`) — nunca puede editar contenido ni saltar a cualquier fase.
- **`posts/{id}/comments`**: solo agencia, nunca cliente (ni lectura ni escritura).
- **`posts/{id}/feedbacks`**: agencia siempre; cliente solo si la fase actual del post es "client visible". Edición de texto solo por el autor; agencia puede tocar `done/doneAt/doneBy` sin tocar el texto.
- **`notifications`**: acotadas por proyecto igual que `posts`, con fallback a "visible para todos" si el doc no tiene `projectId` (compatibilidad con notificaciones antiguas).
- **`settings`**: lectura abierta a autenticados, escritura solo agencia.
- **Estado del deploy**: la última modificación real de `firestore.rules` en el repo es del commit `277022f` (Fase 4, soporte de `changes_requested`). El usuario **ya la desplegó manualmente** en la consola de Firebase (confirmado explícitamente: *"YA ESTÁ"* + verificación de que no se auto-bloqueó como admin). Firestore no tiene deploy automático desde git — **cualquier cambio futuro a `firestore.rules` requiere que el usuario lo pegue a mano en la consola de Firebase** ("Firestore Database" → pestaña "Seguridad", en su UI concreta) y pulse publicar.

### Decisiones de diseño sobre la BD (para tener en cuenta en la migración)
1. **No hay Storage** — toda imagen/vídeo va en base64 dentro del propio documento Firestore. Es la limitación #1 a resolver al migrar: cualquier BD nueva debería ir acompañada de un bucket de objetos (S3, R2, GCS, etc.) y los campos `currentDesignUrl`/`reelCoverUrl`/`carouselUrls` deberían pasar a contener URLs reales, no base64.
2. **Sin paginación** — las queries de posts traen todo el proyecto activo de una vez. No es un problema con volúmenes de prueba, sí lo será en producción real.
3. **Denormalización deliberada de `authorName`/`roleAtTime`** en comentarios y feedbacks — se guarda el nombre/rol *en el momento de escribir*, no se resuelve por join en cada lectura. Si el usuario cambia de nombre después, los comentarios viejos no se actualizan (esto es una decisión consciente de simplicidad, no un bug).
4. **`firebase-blueprint.json` está desactualizado y no debe usarse como referencia** — es el esquema inicial generado por AI Studio antes de toda esta sesión de trabajo. Le faltan: la plataforma `linkedin`, la fase `changes_requested`, los campos `reelCoverUrl`/`assigneeId`/`assigneeName`/`approvedBy`/`changesRequestedReason`/etc., y las colecciones `invites`/`notifications`/`settings`. La fuente de verdad real es `src/types.ts` + `firestore.rules` + el uso real en los componentes.

---

## 5. APIs y servicios externos

### Firebase (Auth + Firestore)
- **Auth**: Google Sign-In únicamente (`signInWithPopup` + `GoogleAuthProvider`). No hay email/password, ni otros proveedores OAuth.
- **Firestore**: SDK cliente web (`firebase/firestore`), no Admin SDK, no Cloud Functions.
- **Configuración**: `firebase-applet-config.json` en la raíz del repo, importado directamente por `src/lib/firebase.ts`. Contiene `projectId`, `appId`, `apiKey`, `authDomain`, `firestoreDatabaseId` (nombre de base de datos Firestore no-default: `ai-studio-963cf462-...`), `storageBucket` (sin usar), `messagingSenderId`. **Esto es la config pública del cliente web de Firebase — no es un secreto** y está (correctamente) commiteado al repo. No confundir con credenciales de servidor/Admin SDK, que no existen en este proyecto.
- **Rate limits**: los de la capa gratuita de Firebase (Spark) o la de pago (Blaze) que tenga contratada el proyecto `gen-lang-client-0678644199` — no gestionado por el código.

### Gemini API (`@google/genai`)
- Modelo usado: `gemini-3.5-flash`.
- Único uso: traducir el copy/caption de un post a otro idioma, vía prompt en español que pide traducción literal conservando tono/hashtags/emojis/saltos de línea.
- **Autenticación**: `GEMINI_API_KEY` como variable de entorno (ver sección 6).
- **Fallback sin API key**: si `GEMINI_API_KEY` no está configurada, el endpoint devuelve una traducción "mock" (`[Traducción al {idioma}]: {texto}`) en vez de fallar — así la app sigue siendo usable sin la clave.
- **Rate limits**: los de la cuenta de Gemini API que se use — no gestionado por el código, no hay retry/backoff implementado.
- **Dos implementaciones duplicadas de la misma lógica**:
  - `server.ts` → ruta Express `POST /api/translate` (para cuando se corre con `npm run dev`/`npm run start`, o si se despliega en un servidor propio).
  - `api/translate.ts` → función serverless `@vercel/node` (para cuando se despliega en Vercel). Es prácticamente idéntica, duplicada a mano.

### No hay ningún otro servicio externo
Sin Stripe, sin servicio de email (ver "funcionalidades pendientes"), sin analytics, sin Sentry/monitoring, sin CDN de imágenes, sin servicio de colas/webhooks.

---

## 6. Variables de entorno

| Variable | Para qué sirve | Dónde se usa | Obligatoria |
|---|---|---|---|
| `GEMINI_API_KEY` | Autenticación contra la API de Gemini para la función de traducción | `server.ts`, `api/translate.ts`, inyectada también en el cliente vía `vite.config.ts` (`define: {'process.env.GEMINI_API_KEY': ...}`) | Recomendada; si falta, cae a traducción "mock" sin romper la app |
| `APP_URL` | Heredada de AI Studio — URL donde AI Studio despliega el "applet" (Cloud Run). No se usa activamente en la lógica del código actual, es vestigial. | — | No |
| `DISABLE_HMR` | Si es `'true'`, desactiva Hot Module Reload de Vite (usado dentro del entorno de AI Studio para evitar parpadeos mientras un agente edita) | `vite.config.ts` | No (solo relevante en AI Studio) |
| `NODE_ENV` | Estándar de Node — si es `'production'`, `server.ts` sirve el build estático de `dist/` en vez de montar el middleware de Vite | `server.ts` | Gestionada automáticamente por el proceso de build/deploy |

**Notas importantes:**
- No hay variable de entorno para la config de Firebase — esa config vive hardcodeada (pero pública) en `firebase-applet-config.json`, no en `.env`.
- El fichero real de secretos es `.env.local` (gitignored). `.env.example` documenta las dos variables (`GEMINI_API_KEY`, `APP_URL`) con placeholders.
- En Vercel, `GEMINI_API_KEY` debe configurarse en el dashboard de Vercel (Project Settings → Environment Variables) para que `api/translate.ts` funcione en producción — **no se ha confirmado en esta sesión si ya está configurada ahí**; el usuario debería verificarlo.

---

## 7. Estructura del código

No hay "páginas" en el sentido de un router — hay **vistas condicionalmente renderizadas** dentro de `App.tsx` según `sidebarTab`/`activeProjectId`. No hay hooks personalizados aparte de `useModalA11y`. No hay stores, no hay contexts, no hay middleware, no hay carpeta `services/`.

### Componentes (`src/components/`)

| Archivo | Qué hace |
|---|---|
| `PostModal.tsx` (2266 líneas, el más grande) | Modal de edición completa de un post: pestañas "La Idea" / "Producción" / "Comentarios" / "Feedback (Cliente)" / "Historial". Maneja subida y compresión de creatividad (imagen/vídeo/carrusel/portada de reel), versionado, aprobación/rechazo de cliente, comentarios internos, feedback de cliente, traducción IA, menciones `@usuario`. |
| `SettingsView.tsx` (1264 líneas) | Gestión de usuarios (rol, acceso a proyectos vía modal con checkboxes), gestión de proyectos (tabla con colores/plataformas/territorios), ajustes generales de agencia, simulador de rol (solo admin), modal de invitación de usuario. |
| `InstagramFeed.tsx` (562) | Simulador de perfil/feed de Instagram — grid de posts (con o sin marco de móvil), pestañas Publicaciones/Reels, personalización de cuenta (usuario/bio/foto, solo local vía `localStorage`), toggle blanco y negro para posts publicados. |
| `InstagramDetailModal.tsx` (560) | Vista de detalle de un post individual de Instagram al estilo real de la app (estático/reel/carrusel), con caption estilo Instagram real (truncado + hashtags en azul), comentarios internos, y accesos rápidos a "Editar" y "Comentar" (este último enruta a Comentarios o Feedback según rol). |
| `TikTokFeed.tsx` (443) | Simulador de feed de TikTok — vista tipo "para ti" con vídeo a pantalla completa, o grid de miniaturas. Toggle blanco y negro para publicados. |
| `LinkedInFeed.tsx` (374) | Simulador de feed de LinkedIn — tarjetas de post estilo LinkedIn real, con reacciones/comentar/compartir. |
| `UserGuideModal.tsx` (321) | Onboarding en 6 pasos con paleta de color distinta por paso (deliberado, no es "acento fuera de sitio") y tips diferenciados por rol (agencia vs. cliente). |
| `Calendar.tsx` (221) | Vista de calendario mensual con drag&drop de posts entre días, estados de carga con skeleton. |
| `Board.tsx` (223) | Vista de tablero Kanban, una columna por fase, con drag&drop entre fases. |
| `NotificationsStream.tsx` (178) | Historial de notificaciones/actividad en tiempo real, con iconos y colores por tipo de evento (comentario/mención/cambio de estado/creación). |
| `NewProjectModal.tsx` (194) | Alta de nuevo proyecto (nombre, cliente, color, plataformas). |
| `SocialIcons.tsx` (89) | Iconos SVG oficiales de Instagram/LinkedIn/TikTok + `PLATFORM_META` (colores de marca por plataforma). |
| `SocialCaption.tsx` (84) | Componente compartido para renderizar captions con hashtags/menciones resaltados y truncado (por caracteres estilo Instagram o por líneas estilo LinkedIn/TikTok). |
| `TagListEditor.tsx` (82) | Editor genérico de listas de tags (usado para territorios de proyecto). |
| `Button.tsx` (40) | Botón compartido con `variant` (primary/secondary/danger/ghost) y `size` (sm/md) — no todos los botones de la app lo usan aún, es el patrón a seguir para nuevos botones. |
| `ConfirmInline.tsx` (49) | Confirmación inline de dos botones (Sí/No) para reemplazar los `window.confirm()` nativos en acciones destructivas. |

### `src/lib/`

| Archivo | Qué hace |
|---|---|
| `firebase.ts` | Inicializa Firebase app, exporta `auth`, `db`, `googleProvider`, `signIn()`, `logOut()`. |
| `utils.ts` | `cn()` (helper de clases), `isVideoUrl()`, tipos `Role`/`Phase`, constantes `ROLES`/`ASSIGNABLE_ROLES`/`PHASES` (fuente única de verdad de fases), `compressImage()` (compresión/redimensionado de imágenes en canvas antes de guardarlas en Firestore). |
| `useModalA11y.ts` | Hook: atrapa el foco dentro de un modal, cierra con Escape, devuelve el foco al elemento que lo abrió al desmontar. |

### `src/App.tsx` — inventario de estado y handlers relevantes
Estado principal: `activeProjectId`, `selectedPost` + `selectedPostInitialTab` (para abrir el modal directo en una pestaña), `posts`/`projects`/`comments`/`feedbacks` (listeners Firestore), `userRole`/`userProjectId`/`permittedProjects`, `sidebarTab`, `view` ('calendar'|'board'), filtros (`filterPhase`/`filterPlatform`/`filterTerritory`/`filterAssignedToMe`), `searchQuery`.

Handlers: `handleCreatePost`, `handleUpdatePost`/`handleUpdatePostDirectly`, `handleDeletePost`, `handleDuplicatePost`, `handleAddComment`, `handleAddFeedback`, `handleToggleFeedbackDone`, `handleUpdateFeedback`, `handleDeleteFeedback`, `handleCreateProject`, `openPostModal` (wrapper que además fija la pestaña inicial del modal), `hasProjectPermission`.

Derivados clave: `filteredPosts` (aplica búsqueda + filtros de plataforma del proyecto activo), `calendarBoardPosts` (filtro adicional de fase/territorio/asignado — **solo** para Calendario/Tablero, no para los feeds).

### Scripts
No hay carpeta `scripts/`. El único "script" es la config de build en `package.json` (ver sección 2).

---

## 8. Funcionalidades implementadas

- Login con Google, auto-registro como rol `pending` sin acceso.
- Sistema de invitaciones (`invites/{email}`) resuelto en el primer login.
- 8 roles: `admin`, `creative_director`, `copy`, `art_director`, `designer`, `account_manager`, `community_manager`, `client`, más el estado transitorio `pending`.
- Gestión completa de usuarios: cambio de rol, gestión de acceso a proyectos (modal con checkboxes, guardado explícito), edición/borrado de usuario.
- Gestión completa de proyectos: crear/editar/borrar, color de marca, plataformas activas, territorios (tags).
- Calendario mensual con drag&drop de posts entre días.
- Tablero Kanban por fases con drag&drop entre fases.
- Filtros combinables: fase, plataforma, territorio, "asignado a mí" (Calendario/Tablero).
- Búsqueda de posts por idea, copy, caption, plataforma y título.
- Ficha completa de post: idea, formato (estático/reel/carrusel), plataforma, fecha, idioma, territorio, responsable asignado.
- Subida de creatividad (imagen/vídeo) con compresión automática, o pegado de URL externa (para vídeos grandes que no entran en el límite de Firestore).
- **Portada de reel de Instagram** (1080x1350) — subida independiente del vídeo, usada en el grid del feed simulado.
- Carrusel multi-imagen con reordenación.
- Historial de versiones (copy, copy de creatividad, caption, diseño) con restauración.
- Traducción IA del copy/caption a otro idioma (Gemini).
- Flujo de fases: idea → copy → diseño → revisión cliente → (aprobado | cambios solicitados → vuelve a diseño) → publicado.
- Aprobación/rechazo por parte del cliente con motivo de rechazo.
- Comentarios internos de agencia (nunca visibles para cliente) con menciones `@usuario`.
- Feedback de cliente (visible para ambos) con checklist hecho/pendiente, edición restringida al autor.
- Menciones `@usuario` en comentarios/feedback generan notificación.
- Stream de notificaciones en tiempo real, acotado por proyecto.
- 3 simuladores de feed realistas (Instagram, LinkedIn, TikTok) con: orden cronológico correcto, ocultación de posts sin creatividad subida, toggle blanco y negro para posts publicados, captions con formato real de cada red (hashtags/menciones resaltados, truncado "ver más").
- Botón "Comentar" en los 3 feeds enruta al modal directamente a la pestaña correcta según si el usuario es interno (Comentarios) o cliente (Feedback).
- Guía de usuario en 6 pasos con contenido diferenciado por rol.
- Sistema de diseño ("design tokens") propio: paleta Zinc + acento índigo, tipografía Inter, radios/sombras/tipografía consistentes en toda la app (ver sección 10).
- Accesibilidad básica en modales (foco atrapado, cierre con Escape, `role="dialog"`, `aria-label` en iconos, `role="switch"` en toggles).

## 9. Funcionalidades pendientes

- **Envío de email automático al invitar un usuario** — explícitamente pedido y explícitamente diferido por decisión del usuario. Requiere: elegir un proveedor de email transaccional (se propusieron Resend o SendGrid), que el usuario cree la cuenta y proporcione la API key, y entonces implementar una función serverless (`api/send-invite-email.ts`, análoga a `api/translate.ts`) que se llame tras crear el doc en `invites/`.
- **Migración a servidor propio + base de datos "de verdad"** — es el motivo de este documento. No se ha empezado ningún trabajo de migración; todo el código sigue apuntando a Firebase/Firestore/Vercel.
- **Migración de medios a almacenamiento de objetos** (fuera de Firestore) — actualmente todo va en base64 inline. Ver sección 4 y 12.
- Link público de solo lectura para compartir un calendario/proyecto sin login (mencionado en el análisis de producto, no implementado).
- Exportación a PDF/CSV (mencionado, no implementado).
- Deadlines internos + alertas de retraso (mencionado, no implementado).
- Planificación en bloque / bulk scheduling (mencionado, no implementado).
- Funcionalidades de IA adicionales más allá de traducción: variantes de caption, conversión de feedback en checklist, QA pre-publicación (mencionadas como ideas en el análisis inicial, no implementadas).
- `firestore.indexes.json` — no existe; si se necesitan índices compuestos en producción, hay que crearlos (en Firebase o en el equivalente que se elija tras la migración).
- Tests automatizados — no existen, ni unitarios ni e2e.

## 10. Decisiones de arquitectura

1. **Mantener Firebase/Vercel hasta v0.1**, decisión explícita del usuario: *"por ahora seguiremos trabajando con firebase y vercel hasta que la plataforma llegue a una v.01"*. Todo el trabajo de esta sesión (excepto este documento de handoff) se hizo respetando esa restricción — no se tocó Storage, no se propuso otro backend, no se cambió de proveedor de auth.
2. **Firestore rules como única capa de autorización real**, en vez de construir un backend propio, porque no hay backend propio. Se reforzó exhaustivamente en la Fase 1 de esta sesión (registro abierto → auto-registro solo como `pending`; fuga de datos entre clientes → scoping por `projectId`/`permittedProjects` tanto en query del cliente como en las reglas — defensa en profundidad).
3. **Consolidar el sistema de color neutro sobrescribiendo los namespaces `gray`/`slate` de Tailwind** (en vez de reemplazar cada clase `gray-*`/`slate-*` del código uno a uno) — elegido explícitamente por ser de altísimo apalancamiento (cero ediciones de componentes) y bajo riesgo (los valores nuevos son casi idénticos visualmente a los defaults de Tailwind).
4. **No inventar un sistema de colores semánticos "info/success/warning/danger" nuevo** — se consideró (estaba en la propuesta original de design tokens) pero se decidió **no** migrar los banners informativos existentes (azules, con icono `Info`) a un token nuevo, porque ya son un patrón "info" reconocible y distinto del acento de marca; se prefirió no sobre-ingenieriar. Sí se hizo la limpieza inversa: todo lo que era **accidentalmente** azul/índigo (imitando al antiguo acento `#2563eb`/parecido al nuevo `#4f46e5`) se migró al token `app-accent`.
5. **Preservar deliberadamente los colores que imitan la marca real de Instagram/LinkedIn** en los simuladores de feed (check azul verificado de Instagram, "me gusta" azul de LinkedIn, color de hashtags) — no se tocaron al hacer la limpieza de colores hardcodeados, porque cambiarlos rompería la autenticidad del mockup, que es una feature explícita del producto.
6. **Preservar las paletas categóricas deliberadas** (colores por tipo de notificación en `NotificationsStream`, colores por paso del tutorial en `UserGuideModal`, colores por fase en `PHASES`) — no se unificaron al acento de marca porque su función es precisamente diferenciar categorías visualmente, no representar "la marca".
7. **Base-layer CSS como fallback, nunca como repintado** — la regla de diseño seguida en `index.css` es que los estilos en `@layer base` (para `button`, `input`, `select`, etc.) solo deben rellenar huecos en elementos sin clases propias, nunca deben competir con clases Tailwind explícitas (que siempre ganan por estar en `@layer utilities`, de mayor prioridad que `@layer base` independientemente de especificidad). Esta regla se aprendió "a la fuerza": la regla base de `button` original incluía `border-radius` y sombra en `:hover`, lo cual **rompió visualmente** los toggles (`role="switch"`) y las pestañas subrayadas de `PostModal` (que no tienen clases propias de radio/sombra y por tanto heredaban ese estilo, pareciendo botones rellenos). Se corrigió quitando esas dos propiedades de la regla base de `button` — ver sección 13 para detalle completo del bug.
8. **Radio máximo del sistema de diseño fijado en 12px**, no 16px — se probó primero con 16px, el usuario lo vio "excesivamente redondeado" tras verlo en la app real, se bajó a 12px como ajuste fino.
9. **No forzar `width: 100%` en todos los `<select>` por defecto** — se probó, rompió los desplegables de filtro (fase/plataforma/territorio) que dependen de ancho automático dentro de una fila flex, forzándolos a apilarse verticalmente. Se quitó la regla; el criterio ahora es "todo campo que necesite ancho completo ya lleva su propia clase `w-full`".
10. **Portada de reel de Instagram como campo opcional independiente** (`reelCoverUrl`), no como sustituto de `currentDesignUrl` — así el vídeo real del reel sigue existiendo para la vista de detalle, y solo el grid usa la portada, replicando el comportamiento real de Instagram.
11. **Enrutado de "Comentar" decidido en el punto de llamada, no en `PostModal`** — cada feed decide `userRole !== 'client' ? 'comments' : 'feedback'` antes de llamar a `onSelectPost(post, tab)`; `PostModal` solo recibe un `initialTab` opcional y lo usa como valor inicial de su propio estado. Se eligió así porque la decisión depende del rol del usuario actual en el contexto del feed, no de nada que el modal necesite saber por sí mismo.

## 11. Convenciones del proyecto

- **Idioma**: todo el código de UI (labels, mensajes, toasts) está en **español**. Los nombres de variables/funciones/componentes están en **inglés**. Los comentarios de código están en **inglés** (excepto algunos comentarios legacy en español de fases muy tempranas).
- **`cn()` para toda clase condicional** — nunca concatenar strings de clases a mano si hay alguna condición involucrada.
- **Comentarios que explican el "por qué", no el "qué"** — el código de esta sesión sigue la convención de comentar solo decisiones no obvias, restricciones ocultas o el motivo de un workaround; nunca describir literalmente lo que la siguiente línea ya deja claro.
- **Tokens de diseño centralizados en `@theme` (`index.css`)** — nunca hardcodear un color de marca, radio o sombra directamente en un componente; usar las clases Tailwind que resuelven a los tokens (`bg-app-accent`, `rounded-2xl`, `shadow-sm`, etc.).
- **Un solo componente de badge de fase** (`PHASES` en `utils.ts`) — cualquier UI nueva que muestre una fase debe leer de ahí, nunca definir su propio mapeo color↔fase.
- **`useModalA11y` obligatorio en cualquier modal nuevo** — para mantener consistencia de accesibilidad (foco, Escape, devolución de foco).
- **Guards `useRef` en handlers async con riesgo de doble-submit** — patrón ya aplicado en 11 handlers de `App.tsx`/`PostModal.tsx`; seguirlo en cualquier nuevo handler de creación/borrado/toggle.
- **Overlay de modal estandarizado**: `bg-black/60 backdrop-blur-sm`, contenedor `bg-white` con radio (ahora 12px vía el token) y sombra elevada (`shadow-xl`/`shadow-2xl`, nunca `shadow-sm` en un modal flotante — esos son solo para cards en el flujo normal de la página).
- **Botones de acción real usan o el componente `Button.tsx`, o replican su mismo patrón** (radio 8px, padding `px-4 py-2`, transición 0.2s) — no crear un cuarto estilo de botón distinto.
- **Padding mínimo de card**: 24px (`p-6`) en desktop, con variante responsive `p-4 sm:p-6` en cualquier panel/modal que sea visible en móvil.
- **Nunca texto por debajo de 11px** (`text-[11px]` es el mínimo permitido tras la auditoría de legibilidad de esta sesión) salvo excepción justificada y documentada.

## 12. Cosas que NO deben modificarse

- **No cambiar de proveedor de Auth ni añadir email/password** sin que el usuario lo pida explícitamente — todo el modelo de invitación (`invites/{email}`) depende de que el email de Google coincida exactamente con el email invitado.
- **No tocar `firestore.rules` sin recordarle al usuario que tiene que pegarlo a mano en la consola de Firebase** — no hay CI/CD que lo despliegue solo. Si se edita este archivo, decirlo explícitamente al final de la tarea.
- **No añadir Firebase Storage "de paso"** como solución rápida a los límites de tamaño de Firestore sin que el usuario lo apruebe — está explícitamente fuera de alcance hasta v0.1 (aunque es precisamente el tipo de cambio que la migración a "servidor propio + BD top" debería resolver de raíz).
- **No sobrescribir `--color-gray-*`/`--color-slate-*` de vuelta a los valores default de Tailwind** — rompería la unificación de la paleta neutra en decenas de archivos que dependen de esos valores ahora siendo Zinc.
- **No volver a añadir `border-radius` ni `box-shadow`/`filter` en `:hover` a la regla base de `button`/`.btn` en `@layer base`** — ya se demostró que rompe toggles y pestañas subrayadas (ver sección 10, punto 7, y sección 13).
- **No volver a poner `width: 100%` por defecto en la regla base de `select`** — rompe los filtros compactos inline (ver sección 10, punto 9).
- **No tocar los colores que imitan Instagram/LinkedIn reales en los simuladores de feed** (checks verificados azules, "me gusta" de LinkedIn, color de hashtags) pensando que son "acento mal aplicado" — son intencionales.
- **No tocar las paletas categóricas de `PHASES`, `NotificationsStream` (tipo de notificación) ni `UserGuideModal` (paso del tutorial)** pensando que hay que unificarlas al acento de marca — son intencionalmente multicolor para diferenciar categorías.
- **No eliminar el doble campo `projectId`/`permittedProjects` en `users`** sin actualizar simultáneamente `firestore.rules` (que lee ambos) y la UI de `SettingsView` — están acoplados a propósito por retrocompatibilidad.
- **No mezclar de vuelta los filtros de fase/plataforma/territorio/asignado dentro de `filteredPosts`** — deben quedarse en la capa derivada separada `calendarBoardPosts`, para no filtrar accidentalmente los feeds simulados.

## 13. Problemas conocidos

- **Deuda técnica arquitectural principal**: multimedia en base64 inline dentro de Firestore, con límites de tamaño artificiales (700KB vídeo / 1MB imagen comprimida) impuestos a mano en el código en vez de por una arquitectura de almacenamiento real. Es el problema #1 a resolver en la migración a "BD top".
- **Doble campo `projectId`/`permittedProjects`** en `users` — funciona, pero es conceptualmente confuso y fuente de bugs futuros si alguien edita uno sin el otro fuera de los flujos ya blindados en `SettingsView.tsx`.
- **`firebase-blueprint.json` desactualizado** — no debe usarse como referencia de esquema, ver sección 4.
- **Sin backend real, sin tests, sin CI/CD, sin paginación de queries** — ver sección 1 y 9.
- **Bug ya corregido pero instructivo — regla base de `button` demasiado agresiva**: en la Fase 6 (rediseño de design tokens), se añadió una regla `@layer base { button { border-radius: ...; } button:hover { box-shadow: ...; filter: ...; } }` pensada como "fallback para botones sin estilo propio". En la práctica, **casi ningún** botón de la app carece de sus propias clases de radio/padding, así que la regla base no aportaba nada visible en el 95% de los casos — pero sí rompía visualmente los dos tipos de control que genuinamente no llevan esas clases: los toggles (`role="switch"`, tamaño fijo `h-6 w-11`, sin padding propio → el padding base los descuadraba) y las pestañas subrayadas de `PostModal` (`border-b-2`, sin `rounded-*` propio → heredaban el radio y la sombra de hover, pareciendo botones rellenos en vez de pestañas planas). Se corrigió en dos commits (`382c5d1`, `36da562`): se añadió `button[role="switch"] { padding: 0; }` y se quitaron por completo `border-radius` y el hover `box-shadow`/`filter` de la regla base de `button`. **Lección para el futuro**: cualquier regla `@layer base` nueva debe verificarse contra los pocos elementos reales que *no* tienen clases Tailwind propias, no solo asumir que es un "fallback inofensivo".
- **Bug ya corregido pero instructivo — colisión de comentarios CSS**: durante la Fase 6, un comentario CSS que contenía literalmente la subcadena `gray-*/slate-*` cerraba el comentario a mitad de frase (`*/` es cierre de comentario en CSS, sin importar el contexto), corrompiendo el resto del fichero `index.css` y tumbando el compilador de Tailwind con un error "Missing opening (" muy difícil de diagnosticar (llevó una sesión de bisección completa del archivo para encontrarlo). **Lección para el futuro**: nunca escribir `algo-*/algo-*` (con espacio o guion inmediatamente antes de la barra) dentro de un comentario `/* ... */` en CSS.
- **`api/translate.ts` y `server.ts` duplican la misma lógica de traducción a mano** — si se cambia el prompt o el modelo de Gemini en uno, hay que recordar cambiarlo también en el otro.
- **No se ha verificado en esta sesión si `GEMINI_API_KEY` está configurada en el dashboard de Vercel** — sin ella, la traducción en producción cae al modo "mock" silenciosamente (no es un error visible, solo un texto de traducción falso).
- **Limitación de verificación durante esta sesión**: no fue posible iniciar sesión con Google en el navegador de pruebas en ningún momento, así que buena parte del trabajo visual (especialmente todo lo posterior a la pantalla de login: Calendario, Tablero, Settings, los 3 feeds, todos los modales) se verificó por lectura de código + `tsc --noEmit` + comprobación de estilos computados inyectando elementos de prueba vía JavaScript en la página de login, **no** por inspección visual real de esas pantallas. Se lo dijo así al usuario en cada ronda. Cualquier regresión visual sutil en esas pantallas podría no haberse detectado.

## 14. Archivos especialmente importantes

- **`src/index.css`** — todo el sistema de diseño (colores, tipografía, radios, sombras, estilos base de formularios/tablas/botones) vive aquí. Cualquier cambio visual "global" empieza y probablemente termina en este archivo.
- **`firestore.rules`** — única capa de seguridad real de toda la aplicación. Cualquier cambio de modelo de datos, de rol o de permisos debe revisar y probablemente tocar este archivo, y **recordar que hay que desplegarlo a mano**.
- **`src/lib/utils.ts`** — fuente única de verdad de `PHASES` (fases de producción) y `ROLES`. Cualquier fase o rol nuevo se añade aquí primero.
- **`src/types.ts`** — contrato de datos del dominio (`Post`, `Project`, `Comment`, `FeedbackItem`, `PostVersion`). Cualquier campo nuevo en un post empieza aquí.
- **`src/App.tsx`** — el "orquestador" central; conoce todo el estado global y pasa props a todo lo demás. Cualquier feature que toque más de un componente probablemente necesita pasar por aquí.
- **`src/components/PostModal.tsx`** — el componente más grande y más denso en lógica de negocio (fases, versionado, subida de medios, aprobación). Cambios aquí requieren especial cuidado por su tamaño (2266 líneas).
- **`firebase-applet-config.json`** — config pública del cliente Firebase. Si se migra de proyecto Firebase, este archivo es el primero a actualizar.
- **`CLAUDE.md`** — instrucciones de proyecto para Claude Code. Contiene información **desactualizada** (dice "sin repo git"), debería corregirse en algún momento.
- **`security_spec.md`** — checklist original de casos de abuso ("Dirty Dozen") usado como referencia durante el hardening de seguridad de la Fase 1. Sigue siendo útil como checklist de regresión si se vuelve a tocar `firestore.rules`.

## 15. Otro contexto relevante

- **El usuario (Miguel Sueiro) no es técnico en el sentido de escribir código él mismo** — pide cambios en lenguaje natural, en español, y espera explicaciones claras de qué se hizo y por qué, sin jerga innecesaria. Prefiere confirmaciones explícitas antes de acciones irreversibles (commits, deploys, cambios de arquitectura grandes) — este patrón se repitió durante toda la sesión (pausas para "adelante"/"continúa", una interrupción explícita de un `git commit` para pedir más cambios antes de subir).
- **El proyecto vive en un contexto de agencia real (Basetis)** — el nombre "Basetis Creative Studio" aparece como valor por defecto de `agencyName` en `SettingsView.tsx`. El email del usuario es `miguel.sueiro@basetis.com`.
- **Todos los cambios de esta sesión están commiteados y pusheados a `origin/main`** — el working tree está limpio a fecha de este documento. Vercel debería haber auto-desplegado cada push (no verificado explícitamente en esta sesión si el deploy de Vercel tuvo éxito cada vez).
- **El repo es privado** (contiene `firebase-applet-config.json` con datos del proyecto real, aunque sean "públicos" en el sentido de Firebase) — para compartirlo con el arquitecto/desarrollador senior, el usuario debe añadirlo como colaborador en GitHub (`Settings → Access → Add people`) o pasarle la URL si decide hacerlo público. Esto se le explicó en el turno anterior a este documento; no se ha confirmado si ya lo hizo.
- **Motivo de este documento**: el usuario va a compartir el proyecto con un desarrollador/arquitecto senior para planificar la migración a servidor propio + "una base de datos top" con "muchas menos limitaciones" que Firestore. La prioridad #1 que ese arquitecto debería atacar, según todo lo aprendido en esta sesión, es el almacenamiento de medios (sacar los archivos de Firestore/base64 a un storage de objetos real) — es la limitación que más ha condicionado el código actual (límites de tamaño, compresión agresiva, imposibilidad de subir vídeos grandes).
