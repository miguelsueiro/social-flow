import { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-app-accent hover:bg-app-accent-hover text-white shadow-sm hover:shadow-md',
  secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:shadow-sm',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
  ghost: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5',
  md: 'text-xs px-4 py-2 rounded-md gap-2'
};

/** Shared button treatment (variant + size) — the app had ~7 divergent
 * primary-button styles across components before this existed. Not every
 * button in the app has been migrated yet; this establishes the pattern for
 * new buttons and for gradually converting the rest. */
export default function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-bold transition-all duration-200 ease-out active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
}
