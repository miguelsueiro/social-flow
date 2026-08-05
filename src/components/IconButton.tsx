import { ButtonHTMLAttributes, ComponentType } from 'react';
import { cn } from '../lib/utils';

// 'overlay' and 'light' cover controls that float directly on top of a
// photo/video (reel mute/play, TikTok's like/comment/save/share rail,
// carousel arrows, lightbox close) — the app already had two different
// hand-built treatments for this ('dark glass' pill and a white pill), plus
// a third spot (the two lightbox close buttons) with no chip at all, just a
// bare icon on a near-black backdrop. That third one reads as an omission
// rather than a deliberate third style, so it's folded into 'overlay' here
// rather than kept as a one-off.
type IconButtonVariant = 'default' | 'danger' | 'overlay' | 'light' | 'primary';
type IconButtonSize = 'sm' | 'md';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: ComponentType<{ size?: number; className?: string }>;
  /** Required, not optional — an icon-only button has no other accessible name.
   *  The audit found 2 icon-only buttons with none at all (SettingsView's
   *  platform toggles, PublishHubView's no-thumbnail card), plus 6 more
   *  reachable only via a `title` attribute, which isn't exposed by keyboard
   *  or touch. Making this required in the type signature is what stops a
   *  new one from being added the same way. */
  'aria-label': string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  default: 'text-ink-muted hover:text-ink hover:bg-gray-100',
  danger: 'text-red-500 hover:text-red-700 hover:bg-red-50',
  overlay: 'rounded-full text-white bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60',
  light: 'rounded-full text-ink-secondary bg-white/80 shadow-md border border-gray-100 hover:bg-white hover:text-ink',
  primary: 'text-white bg-app-accent hover:bg-app-accent-hover shadow-sm',
};

// 36px (sm) / 40px (md) — both clear the 24px WCAG 2.5.8 floor with room to
// spare. The audit's worst offenders (12-21px, several hidden until hover)
// were icon buttons built by hand with p-0.5/p-1; this is the replacement.
const SIZE_CLASSES: Record<IconButtonSize, { button: string; icon: number }> = {
  sm: { button: 'h-9 w-9 rounded-md', icon: 16 },
  md: { button: 'h-10 w-10 rounded-lg', icon: 18 },
};

/** Icon-only button — consolidates the app's ~30 hand-built `<button className="p-*">
 *  <Icon /></button>` call sites (close, duplicate, delete, carousel/reference
 *  removal...) into one control with a guaranteed touch target and accessible
 *  name. Keyboard focus is handled globally (index.css's button:focus-visible). */
export default function IconButton({ icon: Icon, variant = 'default', size = 'md', disabled, className, ...props }: IconButtonProps) {
  const { button, icon } = SIZE_CLASSES[size];
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center shrink-0 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        button,
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    >
      <Icon size={icon} className="pointer-events-none" />
    </button>
  );
}
