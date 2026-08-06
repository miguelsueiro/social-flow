import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { KeyboardEvent } from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** For a non-<button> element carrying role="button" + tabIndex — a real
 *  <button> gets Enter/Space activation for free from the browser, but a
 *  <div>/<img> with an onClick doesn't. Needed at a handful of click targets
 *  that wrap other interactive children (a remove button, a link) and so
 *  can't themselves become a <button> (invalid HTML: buttons can't nest
 *  buttons or anchors). */
export function onActivateKey(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };
}

export function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  return url.startsWith('data:video/') || /\.(mp4|webm|ogg|mov|quicktime|m4v)($|\?)/i.test(url);
}

export type Role =
  | 'pending'
  | 'admin'
  | 'creative_director'
  | 'copy'
  | 'art_director'
  | 'designer'
  | 'account_manager'
  | 'community_manager'
  | 'client';

export const ROLES: Record<Role, string> = {
  pending: 'Pendiente de aprobación',
  admin: 'Admin',
  creative_director: 'Director Creativo',
  copy: 'Copy',
  art_director: 'Director de Arte',
  designer: 'Diseñador',
  account_manager: 'Directora de Cuentas',
  community_manager: 'Community Manager',
  client: 'Cliente (Marketing)'
};

/** Roles selectable from the admin's role simulator / user role picker — excludes the system-assigned 'pending' state. */
export const ASSIGNABLE_ROLES: Role[] = (Object.keys(ROLES) as Role[]).filter(r => r !== 'pending');

export type Phase =
  | 'idea_1'
  | 'idea_2'
  | 'copy'
  | 'design'
  | 'client_review'
  | 'changes_requested'
  | 'approved'
  | 'published';

interface PhaseInfo {
  label: string;
  /** Compact label for tight spaces (phase timeline nodes). */
  shortLabel: string;
  /** Compact badge treatment (PostModal header, search results, feed labels). */
  color: string;
  /** Fuller card treatment for Board/Calendar post cards. */
  cardClass: string;
  /** Solid dot used next to a phase name (Board column headers). */
  dotColor: string;
  clientVisible: boolean;
}

// Single source of truth for phase color — Board.tsx and Calendar.tsx used to
// each hardcode their own (different) phase→color mapping, so the same phase
// rendered in a different color depending on which screen you were looking at.
export const PHASES: Record<Phase, PhaseInfo> = {
  idea_1: { label: 'Fase 1: Ideas Iniciales', shortLabel: 'Idea', color: 'bg-slate-100 text-slate-700', cardClass: 'bg-slate-50 border-slate-200 text-slate-700', dotColor: 'bg-slate-400', clientVisible: false },
  idea_2: { label: 'Fase de Ideas Desarrolladas (Inactiva)', shortLabel: 'Ideas Dev.', color: 'bg-sky-100 text-sky-700', cardClass: 'bg-sky-50 border-sky-200 text-sky-700', dotColor: 'bg-sky-400', clientVisible: false },
  copy: { label: 'Fase 2: Copys & Captions', shortLabel: 'Copy', color: 'bg-violet-100 text-violet-700', cardClass: 'bg-violet-50 border-violet-200 text-violet-700', dotColor: 'bg-violet-400', clientVisible: true },
  design: { label: 'Fase 3: Diseño', shortLabel: 'Diseño', color: 'bg-amber-100 text-amber-700', cardClass: 'bg-amber-50 border-amber-200 text-amber-700', dotColor: 'bg-amber-400', clientVisible: true },
  client_review: { label: 'Fase 4: Feedback Cliente', shortLabel: 'Revisión Cliente', color: 'bg-rose-100 text-rose-700', cardClass: 'bg-rose-50 border-rose-200 text-rose-700', dotColor: 'bg-rose-400', clientVisible: true },
  changes_requested: { label: 'Cambios Solicitados', shortLabel: 'Cambios Solicitados', color: 'bg-orange-100 text-orange-700', cardClass: 'bg-orange-50 border-orange-200 text-orange-700', dotColor: 'bg-orange-400', clientVisible: true },
  approved: { label: 'Fase 5: Aprobado', shortLabel: 'Aprobado', color: 'bg-emerald-100 text-emerald-700', cardClass: 'bg-emerald-50 border-emerald-200 text-emerald-700', dotColor: 'bg-emerald-400', clientVisible: true },
  published: { label: 'Publicado', shortLabel: 'Publicado', color: 'bg-indigo-100 text-indigo-700', cardClass: 'bg-indigo-50 border-indigo-200 text-indigo-700', dotColor: 'bg-indigo-400', clientVisible: true }
};

// Linear backbone used by the phase timeline / prev-next controls. Deliberately
// excludes 'idea_2' (inactive) and 'changes_requested' (a temporary detour back
// to 'design', not a step of its own — see PostModal's handleResumeProduction).
export const PHASE_TIMELINE_ORDER: Phase[] = ['idea_1', 'copy', 'design', 'client_review', 'approved', 'published'];

// Shared Framer Motion curves — every modal/dialog and every tab-content swap
// previously defined its own initial/animate/transition ad hoc (a mix of x
// and y axes, some with an explicit duration, most without), so entrances felt
// like a different app depending which one happened to render. Two curves
// cover the app's two entrance shapes; NotificationsStream's manual stagger
// stays a one-off since spacing out list items arriving over time is a
// genuinely different animation, not a variant of either of these.
export const MODAL_MOTION = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

export const FADE_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

/** Shared by the Instagram/LinkedIn/TikTok feed views — each renders a wall of
 *  real creative previews, so a post only belongs there once it actually has
 *  a design uploaded (an empty placeholder isn't a preview of anything), and
 *  clients only see phases marked clientVisible. Newest first, like a real
 *  feed. */
export function getVisibleFeedPosts<T extends { format?: string; carouselUrls?: string[]; currentDesignUrl?: string; phase: Phase; date: Date }>(
  posts: T[],
  userRole: string,
  filterPhase: 'all' | 'approved_only'
): T[] {
  return posts
    .filter(p => {
      const hasCreativity = p.format === 'carrusel'
        ? !!(p.carouselUrls && p.carouselUrls.some(Boolean))
        : !!p.currentDesignUrl;
      if (!hasCreativity) return false;

      const isVisibleForRole = userRole !== 'client' || PHASES[p.phase].clientVisible;
      if (!isVisibleForRole) return false;

      if (filterPhase === 'approved_only') {
        return p.phase === 'approved' || p.phase === 'published';
      }
      return true;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

// --- Dynamic accent derivation ---
// Each project picks its own brand color, which becomes the app's --app-accent
// for the duration of that session (sidebar, buttons, focus rings, etc). Used
// as-is, an arbitrary color has no guaranteed contrast against white text —
// verified examples: EcoGlow's seed green #10B981 gives white-on-accent only
// 2.54:1, a saturated yellow gives 1.53:1. Both fail WCAG 1.4.3 outright.
//
// Fix (MD3's tonal palette method): never render the seed directly as a
// surface color. Convert it to CIELAB, keep its hue and chroma, and force
// L* (perceptual lightness) to a fixed tone for each role. A tone-40 color
// clears ~6.4:1 against white for any hue — verified against 5 seeds
// spanning the visible spectrum (script + computed contrast ratios), see
// PROJECT.md's design-system notes. If a hue+chroma pair falls outside the
// sRGB gamut at that tone (common for saturated yellows/greens at low L*),
// chroma is reduced by bisection until it fits — this shifts hue by <0.5° in
// every case tested, imperceptible, and far preferable to clipping the RGB
// channels directly (which does shift hue, sometimes badly).
const D65 = [0.95047, 1.0, 1.08883];
const XYZ_FROM_LINEAR_RGB = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.0721750],
  [0.0193339, 0.1191920, 0.9503041],
];
const LINEAR_RGB_FROM_XYZ = [
  [3.2404542, -1.5371385, -0.4985314],
  [-0.9692660, 1.8760108, 0.0415560],
  [0.0556434, -0.2040259, 1.0572252],
];

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function linearToSrgb(v: number): number {
  const c = Math.min(1, Math.max(0, v));
  return Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
}
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(clean.slice(i, i + 2), 16)) as [number, number, number];
}
function rgbToHex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}
function labF(t: number): number {
  return t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29;
}
function labFInv(t: number): number {
  return t ** 3 > 216 / 24389 ? t ** 3 : (t - 4 / 29) * (108 / 841);
}
function hexToLab(hex: string): [number, number, number] {
  const lin = hexToRgb(hex).map(srgbToLinear);
  const xyz = XYZ_FROM_LINEAR_RGB.map(row => row.reduce((s, m, i) => s + m * lin[i], 0)).map((v, i) => v / D65[i]);
  const [fx, fy, fz] = xyz.map(labF);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function labToLinearRgb([L, a, b]: [number, number, number]): number[] {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const xyz = [labFInv(fx) * D65[0], labFInv(fy) * D65[1], labFInv(fz) * D65[2]];
  return LINEAR_RGB_FROM_XYZ.map(row => row.reduce((s, m, i) => s + m * xyz[i], 0));
}
function isInGamut(lin: number[]): boolean {
  return lin.every(v => v >= -0.0001 && v <= 1.0001);
}

/** Re-renders `seedHex` at CIELAB lightness `tone` (0-100), preserving hue exactly and
 *  chroma as closely as the sRGB gamut allows (chroma is reduced by bisection, never
 *  the raw RGB channels clamped, which is what would shift the hue). */
function atTone(seedHex: string, tone: number): string {
  const [, a, b] = hexToLab(seedHex);
  if (isInGamut(labToLinearRgb([tone, a, b]))) {
    return rgbToHex(labToLinearRgb([tone, a, b]).map(linearToSrgb));
  }
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (isInGamut(labToLinearRgb([tone, a * mid, b * mid]))) lo = mid; else hi = mid;
  }
  return rgbToHex(labToLinearRgb([tone, a * lo, b * lo]).map(linearToSrgb));
}

export interface AccentPalette {
  /** Tone 40 — verified ~6.4:1+ white-on-accent for any hue. Buttons, active nav, focus rings. */
  primary: string;
  /** Tone 32 — a visibly darker step of the same hue, for :hover/:active on primary. */
  hover: string;
  /** Tone 92 — a light tint of the same hue, safe as a background under `primary`-colored text/icons. */
  subtle: string;
  /** `primary` at 15% alpha, for focus-ring box-shadows. */
  ring: string;
}

/** Derives an accessible, hue-matched palette from a project's arbitrary brand color.
 *  See the module comment above for why the seed itself is never used as a surface color. */
export function deriveAccentPalette(seedHex: string): AccentPalette {
  const primary = atTone(seedHex, 40);
  const hover = atTone(seedHex, 32);
  const subtle = atTone(seedHex, 92);
  const [r, g, bl] = hexToRgb(primary);
  return { primary, hover, subtle, ring: `rgba(${r}, ${g}, ${bl}, 0.15)` };
}

export function compressImage(base64Str: string, maxWidth = 1920, maxHeight = 1920, quality = 0.88): Promise<string> {
  return new Promise((resolve) => {
    // Check if it's already a very small base64 or not an image
    if (!base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      // Configure high-quality image smoothing for crisp, pixel-perfect scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

