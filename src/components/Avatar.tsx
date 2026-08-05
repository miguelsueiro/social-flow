import { cn } from '../lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-10 h-10 text-sm',
  lg: 'w-11 h-11 text-base',
};

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
  /** Native title tooltip — several call sites use this on a dense chip
   *  (e.g. a post's assignee initial) where the name has no room to be
   *  shown as visible text. */
  title?: string;
}

/** Consolidates the app's ~11 inline avatar renders: some an <img> pointed at
 *  ui-avatars.com, some a plain colored circle with the first initial — both
 *  are legitimate (a real avatar vs. a lightweight "who wrote this" marker
 *  for comments/feedback), so Avatar picks between them based on whether
 *  `src` is given rather than forcing one visual language on both. */
export default function Avatar({ name, src, size = 'md', className, title }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        title={title}
        className={cn('rounded-full object-cover shrink-0 border border-gray-100', sizeClass, className)}
      />
    );
  }

  return (
    <div
      title={title}
      className={cn(
        'rounded-full bg-app-accent-subtle text-app-accent font-bold flex items-center justify-center shrink-0',
        sizeClass,
        className
      )}
    >
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}
