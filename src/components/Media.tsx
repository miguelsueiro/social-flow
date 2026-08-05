import { VideoHTMLAttributes, ImgHTMLAttributes } from 'react';
import { isVideoUrl, cn } from '../lib/utils';

interface MediaProps {
  src?: string;
  alt: string;
  className?: string;
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
}

/** Consolidates the app's ~19 `isVideoUrl(x) ? <video> : <img>` call sites —
 *  post creativity is stored as either an image or a video behind the same
 *  URL-shaped field (currentDesignUrl, carouselUrls[n]), so every place that
 *  renders one has to branch on the URL to know which tag to use. Doesn't
 *  own sizing/fit — those vary legitimately by context (cover in a grid
 *  thumbnail, contain in a lightbox) and are passed in via className. */
export default function Media({ src, alt, className, videoClassName, imgClassName, videoProps, imgProps }: MediaProps) {
  if (!src) return null;

  if (isVideoUrl(src)) {
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
