# Auditoría de Rediseño — Bloque A

**Alcance:** Layout, Grid, Navegación, Menús, Dashboards, Tablas, Responsive, Microinteracciones.
**Fuera de alcance (ya resuelto en Fases 1-9):** Tipografía, color/tokens, elevación, accesibilidad, formularios, estados vacíos.
**Dirección de diseño:** MD3 como metodología (tokens semánticos, state layers, escala tipográfica) + identidad Zinc/índigo/Inter propia, con la densidad y sobriedad de Linear/Stripe/Vercel — no el aspecto tonal expresivo de Google Photos/Wallet/Tasks (decisión registrada el 2026-08-05).

---

## 1. Problemas encontrados

### 1.1 Layout y Grid

| # | Problema | Evidencia |
|---|---|---|
| L1 | El Dashboard (`activeProjectId === 'dashboard'`) usa un shell completamente distinto al resto de vistas: sin sidebar ni topbar, con su propio logo/logout duplicados a mano | `App.tsx:1273,1377,1529-1562` |
| L2 | Solo el Dashboard limita el ancho de contenido (`max-w-6xl mx-auto`); Calendar/Board/Feeds/PublishHub se estiran a ancho completo sin tope | `App.tsx:1520-1524` |
| L3 | `SettingsView` se autolimita el ancho (`max-w-4xl`) en vez de que el shell lo haga — cada vista decide su propio criterio de ancho o ninguno | `SettingsView.tsx:349` |
| L4 | Las tarjetas de proyecto del Dashboard usan `rounded-[2.25rem]` (36px) y `p-7`, muy por encima del resto de tarjetas de la app (`rounded-2xl`/`rounded-xl`, `p-4 sm:p-6`) | `App.tsx:1601,1624` |
| L5 | 4 sistemas de grid de tarjetas distintos, cada uno con su propio criterio de breakpoints (`sm`/`md`/`lg`/`xl` usados indistintamente para el mismo salto 1→2/3/4 columnas) | `App.tsx:1599,1687`, `PublishHubView.tsx:140,174`, `SettingsView.tsx:368,414` |
| L6 | No hay patrón de cabecera de página compartido: PublishHub tiene título+descripción+filtro, Settings no tiene título, Calendar solo tiene navegación de mes, Board no tiene cabecera propia | `PublishHubView.tsx:151-160`, `SettingsView.tsx:348`, `Calendar.tsx:76-79`, `Board.tsx:68` |

### 1.2 Navegación y Menús

| # | Problema | Evidencia |
|---|---|---|
| N1 | La navegación de sidebar (desktop) y la barra inferior (móvil) son markup 100% duplicado — mismo array de items, mismo filtro, ya con deriva visible (etiquetas completas vs. abreviadas) | `App.tsx:1285-1320` vs `1901-1936` |
| N2 | El estado "activo" es visualmente distinto entre sidebar (pastilla con fondo) y barra inferior (solo color de texto) | `App.tsx:1304-1309` vs `1920-1925` |
| N3 | Una misma barra de filtros (fase/plataforma/territorio/asignado a mí) mezcla 4 afordancias distintas: segmented control, 3 `<select>` nativos, y un botón pastilla — para el mismo concepto de "filtro" | `App.tsx:1739-1802` |
| N4 | El patrón "segmented control" se reimplementa 3 veces (una por feed) con un desajuste de tono (`bg-gray-50` vs `bg-gray-100`) en vez de un componente compartido | `LinkedInFeed.tsx:139-184`, `InstagramFeed.tsx:278-296`, `TikTokFeed.tsx:301-319` |
| N5 | No existe ningún componente `Menu`/`Dropdown`. Los 2 botones "más opciones" (ellipsis) prometen un menú que no existe: uno abre el modal completo, el otro no tiene `onClick` | `LinkedInFeed.tsx:249-255`, `InstagramDetailModal.tsx:379-381` |
| N6 | 4 tratamientos visuales distintos para "identidad de proyecto" (punto de color, pastilla sólida, chip con tinte, avatar-cuadrado) sin ningún componente compartido | `App.tsx:1326-1360,1449-1456`, `PostModal.tsx:982-993`, `SettingsView.tsx:414-464` |

### 1.3 Dashboards y Tablas

| # | Problema | Evidencia |
|---|---|---|
| D1 | El Dashboard es un selector de proyectos con 4 contadores estáticos — sin actividad reciente, sin "qué necesita tu atención", sin tendencias/deltas | `App.tsx:1526-1682` |
| D2 | 2 sistemas visuales distintos para tarjetas de estadística (proyecto vs. calendario) con la misma información conceptual — el segundo duplica la codificación de color entre icono y número | `App.tsx:1646-1663` vs `1687-1704` |
| D3 | La única tabla real (Settings → proyectos) tiene una densidad de fila muy espaciosa (`py-4` en cada celda) para contenido de una sola línea, sin fila de estado vacío propia | `SettingsView.tsx:704-867` |
| D4 | El hover de fila de la tabla es casi imperceptible (`hover:bg-gray-50/40`) | `SettingsView.tsx:719` |

### 1.4 Responsive

| # | Problema | Evidencia |
|---|---|---|
| R1 | **Calendar no tiene ninguna adaptación móvil real**: el grid de 7 columnas es fijo en todos los tamaños; a 375px cada celda mide ~45-50px, insuficiente para mostrar contenido | `Calendar.tsx:92,107,116` — **hallazgo de mayor severidad de todo el bloque A** |
| R2 | Zona muerta de navegación entre 640-1023px: la barra inferior de móvil (pensada para 375px) se estira a un tablet de 900px con 7 botones dispersos | `App.tsx:1274,1901` |
| R3 | El grid de miniaturas de carrusel es `grid-cols-3` fijo sin adaptación — en un modal ya estrecho en móvil, las miniaturas quedan diminutas | `PostModal.tsx:1647` |
| R4 | Board (Kanban) hace scroll horizontal en móvil pero sin ninguna afordancia visual (sin sombra de borde, sin indicador) que avise que hay más columnas | `Board.tsx:68,74` |
| R5 | Las tarjetas de estadística del Dashboard saltan de 1 a 4 columnas sin paso intermedio en `sm:`, desperdiciando espacio horizontal entre 640-767px | `App.tsx:1687` |
| R6 | No hay un breakpoint "móvil→tablet" único y consistente — distintos componentes saltan en `sm:` o en `md:` para el mismo tipo de transición | `Calendar.tsx` (solo `md:`) vs `InstagramFeed.tsx`/`LinkedInFeed.tsx`/`TikTokFeed.tsx` (mezcla `sm:`/`md:`) |

### 1.5 Microinteracciones

| # | Problema | Evidencia |
|---|---|---|
| M1 | Sin escala de duración/easing compartida: `transition-all` indiscriminado junto a duraciones explícitas dispares (150/200/300ms) sin criterio documentado | 169 usos de `transition-*` repartidos sin patrón |
| M2 | Intensidad de hover/press inconsistente: `hover:scale-110` en algunos iconos, `hover:-translate-y-1` en unas tarjetas, `hover:scale-[1.02]` en otras, y tarjetas de Board sin ninguna | `InstagramDetailModal.tsx:432-450`, `App.tsx:1624,1694`, `Calendar.tsx:175`, `Board.tsx:114-118` |
| M3 | `IconButton` (primitivo) no tiene `active:scale-`, a diferencia de `Button` que sí lo tiene — inconsistencia entre los dos primitivos compartidos | `IconButton.tsx` vs `Button.tsx:49` |
| M4 | Cada componente define su propia curva de entrada/salida de Framer Motion sin constantes compartidas (ejes distintos, duraciones implícitas o explícitas sin criterio) | `PostModal.tsx:1350,1517,1871,1946,2117`, `App.tsx:1414`, `NotificationsStream.tsx:159`, `InstagramDetailModal.tsx:234` |
| M5 | Feedback de drag-and-drop incompleto en ambas implementaciones, cada una la mitad que le falta a la otra: Board no resalta la tarjeta que se arrastra (solo la columna destino); el carrusel resalta el slide que se arrastra pero no la zona de destino | `Board.tsx:21,29,89-93` vs `PostModal.tsx:544-547,1660-1662` |
| M6 | Loading inconsistente para la misma espera: Calendar/Board/PublishHub muestran skeleton `animate-pulse`; los 3 feeds (Instagram/LinkedIn/TikTok) no reciben `loading` y no muestran nada mientras cargan los mismos datos | `App.tsx:1817-1854` |
| M7 | Botones de acción con async (`onUpdate`/`onDelete`) sin indicador de carga porque están hechos a mano en vez de usar el primitivo `Button` (que sí tiene spinner/`aria-busy`) | `PostModal.tsx:1077,1093,1120` |

---

## 2. Oportunidades de mejora (resumen priorizado)

**Alto impacto, bajo riesgo** (candidatas para Bloque B):
- Unificar el shell del Dashboard con el del resto de vistas (una sola implementación de sidebar/topbar/logout).
- Definir un tope de ancho de contenido único a nivel de shell, no por vista.
- Corregir el grid de Calendar en móvil (agenda/lista como fallback, o reducir densidad de celda).
- Añadir loading skeleton a los 3 feeds (mismo estado que Calendar/Board ya tienen).
- Añadir `active:scale-` a `IconButton` para igualar el contrato de `Button`.

**Medio impacto** (candidatas para Bloque C):
- Extraer `NavItems`, `SegmentedControl`, `ProjectTag` y un primitivo `Menu`/`Dropdown` compartidos.
- Rediseñar el Dashboard como panel de actividad ("qué necesita tu atención") en vez de solo contadores.
- Unificar cabecera de página en todas las vistas.
- Definir una escala de duración/easing única para transiciones y Framer Motion.

**Bajo impacto / pulido fino:**
- Densidad de fila de la tabla de Settings.
- Afordancia de scroll horizontal en Board.
- Feedback simétrico en ambas implementaciones de drag-and-drop.

---

## 3. Justificación UX

- **Consistencia primero** (prioridad #1 del proceso de trabajo): un mismo concepto — tarjeta de estadística, filtro, identidad de proyecto, cabecera de vista — se resuelve hoy de 2 a 4 formas distintas según el archivo. Cada resolución adicional es carga cognitiva extra para quien usa la app a diario.
- **Jerarquía y escaneabilidad**: el Dashboard actual pesa igual los 4 contadores; ningún dato se prioriza sobre otro, cuando lo que un usuario de agencia necesita al abrir la app es saber qué requiere su atención ahora (posts en revisión, cambios solicitados, fechas próximas).
- **Percepción de calidad/pulido**: microinteracciones inconsistentes (distintas duraciones, distintas intensidades de hover) es precisamente lo que separa una app que "se siente Linear/Stripe" de una que no — son detalles acumulativos, no un único bug.
- **Responsive es el hallazgo más grave**: Calendar sin ninguna adaptación móvil es un problema funcional de uso real, no solo estético, si algún usuario accede desde el móvil.

---

## 4. Componentes afectados (mapa de impacto)

| Componente | Layout/Grid | Nav/Menús | Dashboard/Tablas | Responsive | Microint. |
|---|---|---|---|---|---|
| `App.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `Board.tsx` | | | ✅ | ✅ | ✅ |
| `Calendar.tsx` | | | ✅ | ✅ (crítico) | ✅ |
| `PostModal.tsx` | | ✅ | | ✅ | ✅ |
| `SettingsView.tsx` | ✅ | ✅ | ✅ | | |
| `InstagramFeed/LinkedInFeed/TikTokFeed.tsx` | ✅ | ✅ | | ✅ | ✅ |
| `PublishHubView.tsx` | ✅ | | ✅ | | |
| `Button.tsx` / `IconButton.tsx` | | | | | ✅ |
| `InstagramDetailModal.tsx` | | ✅ | | | ✅ |
| `NotificationsStream.tsx` | | | | | ✅ |

---

## 5. Sistema visual propuesto (primitivos nuevos a crear)

1. **`PageHeader`** — título + descripción + acciones + filtros, con un slot de ancho consistente. Sustituye las 4 implementaciones actuales.
2. **`NavItems`** — lista de navegación con orientación vertical (sidebar) u horizontal (barra móvil), un único array de items, un único criterio de estado activo (pastilla, siempre).
3. **`SegmentedControl`** — sustituye las 3 reimplementaciones de toggle de vista/dispositivo en los feeds y el selector de vista de Calendar.
4. **`ProjectTag`** — una sola forma (a decidir: punto, pastilla o chip) con nivel de énfasis configurable, sustituye las 4 variantes actuales de "identidad de proyecto".
5. **`Menu`/`Dropdown`** — primitivo de menú contextual con click-fuera y posicionamiento, para dar vida a los botones "más opciones" ya existentes pero muertos.
6. **`StatTile`** — una sola variante de tarjeta de estadística (valor/etiqueta, con o sin icono como opción explícita, no ambos "gritando" a la vez).
7. Constantes de motion compartidas (`MOTION.modal`, `MOTION.tab`, `MOTION.listItem`) para Framer Motion, y una escala de `transition-` (duración+easing) en `index.css` o `utils.ts`.

---

## 6. Plan de implementación propuesto

Este documento es solo el Bloque A (auditoría). Los Bloques B y C **no están autorizados todavía** — se decidirán con este documento en la mano. Desglose orientativo si se aprueban:

**Bloque B — Deuda diferida** (prerrequisito de C):
1. Migrar los ~732 usos de color en bruto a los tokens `ink`/`outline`/`divider`.
2. Portar `PostModal.tsx`, `InstagramDetailModal.tsx` y `UserGuideModal.tsx` al primitivo `Modal`.
3. Adoptar `Skeleton`/`Chip` donde ya se necesitan (feeds sin loading, badges).

**Bloque C — Rediseño de pantallas** (una fase por punto, con aprobación entre cada una, seg el proceso ya establecido):
1. Shell unificado (Dashboard + resto de vistas, un solo `PageHeader`).
2. `NavItems` compartido (sidebar + barra móvil) + rediseño del estado activo.
3. `SegmentedControl` compartido, migrar los 3 feeds + Calendar.
4. `ProjectTag` compartido, migrar las 4 superficies.
5. Rediseño del Dashboard (actividad/atención, no solo contadores) + `StatTile` unificado.
6. Responsive de Calendar (el hallazgo crítico) — agenda/lista en móvil.
7. Responsive de la zona muerta 640-1023px (nav de tablet).
8. `Menu`/`Dropdown` primitivo + activar los botones "más opciones".
9. Escala de motion/transición compartida, aplicada de forma incremental.
10. Simetría de feedback en ambos drags (Board y carrusel).
11. Tabla de Settings: densidad + estado vacío.
12. Barrido final de responsive (breakpoints intermedios, `grid-cols-3` del carrusel, etc.).

Estimación total previa (Bloques B+C): ~1,1-2M tokens, 12-24h repartidas en varias sesiones — a confirmar con el usuario antes de empezar cualquiera de los dos bloques.
