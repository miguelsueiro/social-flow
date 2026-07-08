import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Role = 
  | 'admin' 
  | 'creative_director' 
  | 'copy' 
  | 'art_director' 
  | 'designer' 
  | 'account_manager' 
  | 'community_manager' 
  | 'client';

export const ROLES: Record<Role, string> = {
  admin: 'Admin',
  creative_director: 'Director Creativo',
  copy: 'Copy',
  art_director: 'Director de Arte',
  designer: 'Diseñador',
  account_manager: 'Directora de Cuentas',
  community_manager: 'Community Manager',
  client: 'Cliente (Marketing)'
};

export type Phase = 
  | 'idea_1' 
  | 'idea_2' 
  | 'copy' 
  | 'design' 
  | 'client_review' 
  | 'approved' 
  | 'published';

export const PHASES: Record<Phase, { label: string; color: string; clientVisible: boolean }> = {
  idea_1: { label: 'Fase 1: Ideas Iniciales', color: 'bg-gray-100 text-gray-700', clientVisible: false },
  idea_2: { label: 'Fase de Ideas Desarrolladas (Inactiva)', color: 'bg-blue-100 text-blue-700', clientVisible: false },
  copy: { label: 'Fase 2: Copys & Captions', color: 'bg-purple-100 text-purple-700', clientVisible: true },
  design: { label: 'Fase 3: Diseño', color: 'bg-orange-100 text-orange-700', clientVisible: true },
  client_review: { label: 'Fase 4: Feedback Cliente', color: 'bg-yellow-100 text-yellow-700', clientVisible: true },
  approved: { label: 'Fase 5: Aprobado', color: 'bg-green-100 text-green-700', clientVisible: true },
  published: { label: 'Publicado', color: 'bg-indigo-100 text-indigo-700', clientVisible: true }
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

