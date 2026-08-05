import { ReactNode, ComponentType } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useModalA11y } from '../lib/useModalA11y';
import IconButton from './IconButton';

type ModalTone = 'default' | 'accent' | 'danger' | 'success';
type ModalSize = 'sm' | 'md' | 'lg';

const TONE_CLASSES: Record<ModalTone, string> = {
  default: 'bg-gray-100 text-ink-secondary',
  accent: 'bg-app-accent/10 text-app-accent',
  danger: 'bg-red-50 text-red-600',
  success: 'bg-emerald-50 text-emerald-600',
};

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

interface ModalProps {
  onClose: () => void;
  title: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  tone?: ModalTone;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Consolidates the app's 9 hand-built dialog overlays. 4 of them (2 in
 *  SettingsView, InstagramDetailModal's outer wrapper predates this too)
 *  had no useModalA11y wiring at all — no role="dialog", no focus trap, no
 *  Escape, no focus return to the trigger on close. Modal wires all of that
 *  once, in one place, so a new dialog gets it by construction rather than
 *  by whoever writes it remembering the pattern. Backdrop click closes, same
 *  as every existing modal in the app that had an onClick handler on it. */
export default function Modal({ onClose, title, icon: Icon, tone = 'accent', size = 'md', children, footer, className }: ModalProps) {
  const modalRef = useModalA11y(onClose);
  const titleId = `modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'bg-white rounded-3xl border border-divider shadow-2xl w-full overflow-hidden outline-none flex flex-col max-h-[90vh]',
          SIZE_CLASSES[size],
          className
        )}
      >
        <div className="p-4 sm:p-6 border-b border-divider flex items-center justify-between bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className={cn('p-2 rounded-lg shrink-0', TONE_CLASSES[tone])}>
                <Icon size={18} />
              </div>
            )}
            <h3 id={titleId} className="font-extrabold text-ink text-sm truncate">{title}</h3>
          </div>
          <IconButton icon={X} onClick={onClose} aria-label="Cerrar" className="shrink-0" />
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {footer && (
          <div className="p-4 sm:p-6 border-t border-divider shrink-0">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}
