import { VideoHTMLAttributes, ImgHTMLAttributes, IframeHTMLAttributes } from 'react';
import { FileText, Link as LinkIcon } from 'lucide-react';
import { isVideoUrl, cn } from '../lib/utils';
import type { ReferenceKind } from '../types';

interface MediaProps {
  src?: string;
  alt: string;
  className?: string;
  /** Overrides the auto-detection from `src` — needed for reference kinds
   *  (pdf/embed/link) that can't be told apart from the URL shape alone
   *  (e.g. a Drive link is 'embed', not 'link', only because a provider
   *  matched it; Media has no reason to re-run that match). */
  kind?: ReferenceKind;
  /** Merged on top of `className` for the <video> branch only — a couple of
   *  call sites cap video height (e.g. max-h-[500px]) or add a black letterbox
   *  backdrop that a still image doesn't need. */
  videoClassName?: string;
  /** Merged on top of `className` for the <img> branch only — e.g. a
   *  cursor-zoom-in affordance that wouldn't make sense on a <video>, which
   *  already has its own click target (native controls / play-pause). */
  imgClassName?: string;
  /** Passed through to <video> only — a still <img> has no playback controls. */
  videoProps?: Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'className'>;
  imgProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'className'>;
  iframeProps?: Omit<IframeHTMLAttributes<HTMLIFrameElement>, 'src' | 'className'>;
}

/** Consolidates the app's `isVideoUrl(x) ? <video> : <img>` call sites — post
 *  creativity is stored as either an image or a video behind the same
 *  URL-shaped field (currentDesignUrl, carouselUrls[n]), so every place that
 *  renders one has to branch on the URL to know which tag to use. Now also
 *  handles PDF (an <iframe>, since browsers render PDFs natively there) and
 *  embed (a provider <iframe> — YouTube/Vimeo/Drive/Loom/Figma). Doesn't own
 *  sizing/fit — those vary legitimately by context (cover in a grid
 *  thumbnail, contain in a lightbox) and are passed in via className. */
export default function Media({ src, alt, className, kind, videoClassName, imgClassName, videoProps, imgProps, iframeProps }: MediaProps) {
  if (!src) return null;

  const resolvedKind: ReferenceKind = kind || (isVideoUrl(src) ? 'video' : 'image');

  if (resolvedKind === 'pdf') {
    return (
      <iframe
        src={src}
        title={alt}
        className={cn(className)}
        {...iframeProps}
      />
    );
  }

  if (resolvedKind === 'embed') {
    return (
      <iframe
        src={src}
        title={alt}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className={cn(className)}
        {...iframeProps}
      />
    );
  }

  if (resolvedKind === 'link') {
    // A plain external link with no recognized provider and no file
    // extension — nothing to embed, so render an affordance instead of
    // guessing with an <img> that will just 404.
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('flex flex-col items-center justify-center gap-2 bg-gray-100 text-ink-secondary hover:text-app-accent transition-colors', className)}
      >
        <LinkIcon size={24} />
        <span className="text-xs font-semibold truncate max-w-full px-2">{alt}</span>
      </a>
    );
  }

  if (resolvedKind === 'video' || resolvedKind === 'gif' && isVideoUrl(src)) {
    return (
      <video
        src={src}
        className={cn(className, videoClassName)}
        muted
        playsInline
        {...videoProps}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(className, imgClassName)}
      {...imgProps}
    />
  );
}

/** A non-interactive stand-in for a kind Media can't (or shouldn't yet)
 *  render inline — used for PDF/link reference chips, where a 64px thumbnail
 *  showing a live iframe would be both illegible and expensive to mount N
 *  times in a grid. */
export function MediaKindIcon({ kind, className }: { kind: ReferenceKind; className?: string }) {
  const Icon = kind === 'pdf' ? FileText : LinkIcon;
  return <Icon className={className} aria-hidden="true" />;
}
