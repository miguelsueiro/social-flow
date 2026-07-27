import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  idea_1: { label: 'Fase 1: Ideas Iniciales', color: 'bg-slate-100 text-slate-700', cardClass: 'bg-slate-50 border-slate-200 text-slate-700', dotColor: 'bg-slate-400', clientVisible: false },
  idea_2: { label: 'Fase de Ideas Desarrolladas (Inactiva)', color: 'bg-sky-100 text-sky-700', cardClass: 'bg-sky-50 border-sky-200 text-sky-700', dotColor: 'bg-sky-400', clientVisible: false },
  copy: { label: 'Fase 2: Copys & Captions', color: 'bg-violet-100 text-violet-700', cardClass: 'bg-violet-50 border-violet-200 text-violet-700', dotColor: 'bg-violet-400', clientVisible: true },
  design: { label: 'Fase 3: Diseño', color: 'bg-amber-100 text-amber-700', cardClass: 'bg-amber-50 border-amber-200 text-amber-700', dotColor: 'bg-amber-400', clientVisible: true },
  client_review: { label: 'Fase 4: Feedback Cliente', color: 'bg-rose-100 text-rose-700', cardClass: 'bg-rose-50 border-rose-200 text-rose-700', dotColor: 'bg-rose-400', clientVisible: true },
  changes_requested: { label: 'Cambios Solicitados', color: 'bg-orange-100 text-orange-700', cardClass: 'bg-orange-50 border-orange-200 text-orange-700', dotColor: 'bg-orange-400', clientVisible: true },
  approved: { label: 'Fase 5: Aprobado', color: 'bg-emerald-100 text-emerald-700', cardClass: 'bg-emerald-50 border-emerald-200 text-emerald-700', dotColor: 'bg-emerald-400', clientVisible: true },
  published: { label: 'Publicado', color: 'bg-indigo-100 text-indigo-700', cardClass: 'bg-indigo-50 border-indigo-200 text-indigo-700', dotColor: 'bg-indigo-400', clientVisible: true }
};

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

