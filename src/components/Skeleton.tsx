import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
  /** 'text' rounds like a text line (rounded-md); 'circle' is fully round
   *  (avatars); 'block' is the default rounded-xl card/thumbnail treatment. */
  shape?: 'text' | 'circle' | 'block';
}

const SHAPE_CLASSES = {
  text: 'rounded-md',
  circle: 'rounded-full',
  block: 'rounded-xl',
};

/** Consolidates the app's 5 loading placeholders, which mixed bg-gray-100 and
 *  bg-gray-200 for what's meant to be the same "still loading" surface —
 *  standardized on gray-200, the more visible of the two against a white
 *  page background. Caller supplies size via className (e.g. "h-4 w-32"). */
export default function Skeleton({ className, shape = 'block' }: SkeletonProps) {
  return <div className={cn('animate-pulse bg-gray-200', SHAPE_CLASSES[shape], className)} />;
}
