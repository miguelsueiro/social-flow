import { cloneElement, ReactElement } from 'react';
import { cn } from '../lib/utils';

interface FieldProps {
  label: string;
  /** Becomes the control's id and the label's htmlFor — the association the
   *  audit found missing on 32 of 51 form controls in the app (a visual
   *  <label> with no htmlFor, relying on a placeholder that disappears once
   *  the user types). Field wires it structurally instead of leaving it to
   *  each call site to remember. */
  id: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** A single input/select/textarea. Field clones it to inject id,
   *  aria-describedby and aria-invalid — the control itself still owns its
   *  value, onChange, disabled, etc. Typed `any` deliberately: this accepts
   *  whichever native or custom control the caller passes (input, select,
   *  textarea, a future custom Select...), and cloneElement has no way to
   *  know that prop shape ahead of time. */
  children: ReactElement<any>;
}

/** Label + control + hint/error, with the accessible wiring built in rather
 *  than left to each call site. Doesn't render its own input — every form
 *  control in this app is different enough (dates, colors, drag-and-drop
 *  URL fields, textareas with an attached "save version" button) that
 *  Field wrapping an arbitrary child is more honest than pretending there's
 *  one universal <input>. */
export default function Field({ label, id, hint, error, required, className, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const control = cloneElement(children, {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
  });

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-label text-ink-secondary flex items-center gap-1">
        {label}
        {required && <span className="text-red-600" aria-hidden="true">*</span>}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-caption text-ink-muted">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-caption text-red-600 font-semibold">{error}</p>
      )}
    </div>
  );
}
