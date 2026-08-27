/** Classifies a reference's media type from its URL and/or MIME type, and
 *  recognizes a handful of external providers (YouTube, Vimeo, Drive, Loom,
 *  Figma) so their links can render an embeddable preview and a real
 *  thumbnail instead of the app's old fallback: treat everything as an
 *  <img>, and silently swap in a generic stock photo when that <img> 404s. */
import type { PostReference, ReferenceKind } from '../types';

export interface ProviderInfo {
  id: 'youtube' | 'vimeo' | 'drive' | 'loom' | 'figma';
  label: string;
  /** URL suitable for an <iframe src>. */
  embedUrl: string;
  /** A real thumbnail image the provider itself serves, when it publishes a
   *  stable one from the URL alone (YouTube, Vimeo). Absent for providers
   *  whose thumbnail requires an authenticated API call (Drive, Figma). */
  thumbnailUrl?: string;
}

const PROVIDER_MATCHERS: Array<{ id: ProviderInfo['id']; label: string; re: RegExp; build: (m: RegExpMatchArray) => Omit<ProviderInfo, 'id' | 'label'> }> = [
  {
    id: 'youtube',
    label: 'YouTube',
    re: /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{6,})/,
    build: (m) => ({
      embedUrl: `https://www.youtube.com/embed/${m[1]}`,
      thumbnailUrl: `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`,
    }),
  },
  {
    id: 'vimeo',
    label: 'Vimeo',
    re: /vimeo\.com\/(?:video\/)?(\d+)/,
    build: (m) => ({ embedUrl: `https://player.vimeo.com/video/${m[1]}` }),
  },
  {
    id: 'drive',
    label: 'Google Drive',
    re: /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    build: (m) => ({ embedUrl: `https://drive.google.com/file/d/${m[1]}/preview` }),
  },
  {
    id: 'loom',
    label: 'Loom',
    re: /loom\.com\/share\/([a-zA-Z0-9]+)/,
    build: (m) => ({ embedUrl: `https://www.loom.com/embed/${m[1]}` }),
  },
  {
    id: 'figma',
    label: 'Figma',
    re: /figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9]+)/,
    build: () => ({ embedUrl: `https://www.figma.com/embed?embed_host=socialflow&url=PLACEHOLDER` }),
  },
];

export function detectProvider(url: string): ProviderInfo | null {
  for (const matcher of PROVIDER_MATCHERS) {
    const m = url.match(matcher.re);
    if (m) {
      const built = matcher.build(m);
      // Figma's embed API wants the *full* source URL query-encoded, not just
      // the file id extracted above — patch it in now that we have `url`.
      const embedUrl = matcher.id === 'figma'
        ? `https://www.figma.com/embed?embed_host=socialflow&url=${encodeURIComponent(url)}`
        : built.embedUrl;
      return { id: matcher.id, label: matcher.label, ...built, embedUrl };
    }
  }
  return null;
}

const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov|quicktime|m4v)($|\?)/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|svg|avif|bmp)($|\?)/i;
const GIF_EXT_RE = /\.gif($|\?)/i;
const PDF_EXT_RE = /\.pdf($|\?)/i;

/** Best-effort classification of a URL alone (no MIME type available) — used
 *  for pasted external links and for legacy reference strings that predate
 *  the PostReference model. */
export function classifyReferenceUrl(url: string): ReferenceKind {
  if (url.startsWith('data:image/gif')) return 'gif';
  if (url.startsWith('data:video/')) return 'video';
  if (url.startsWith('data:application/pdf')) return 'pdf';
  if (url.startsWith('data:image/')) return 'image';
  if (detectProvider(url)) return 'embed';
  if (GIF_EXT_RE.test(url)) return 'gif';
  if (VIDEO_EXT_RE.test(url)) return 'video';
  if (PDF_EXT_RE.test(url)) return 'pdf';
  if (IMAGE_EXT_RE.test(url)) return 'image';
  // An external URL with no recognized extension and no known provider — still
  // previewable as a link card, just not inline.
  return 'link';
}

export function classifyReferenceFile(file: File): ReferenceKind {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'image/gif') return 'gif';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('image/')) return 'image';
  // Fall back to the filename when the browser didn't populate `file.type`
  // (happens for some drag-and-drop sources).
  return classifyReferenceUrl(file.name);
}

export const REFERENCE_ACCEPT = 'image/*,video/*,application/pdf';

/** Firestore's own hard cap is 1 MiB per document, shared across every field
 *  on the post — these per-file ceilings leave headroom for the rest of the
 *  post's content and keep a single reference from dominating the budget. */
export const MAX_INLINE_BYTES: Record<ReferenceKind, number> = {
  image: 700 * 1024,
  gif: 700 * 1024,
  video: 700 * 1024,
  pdf: 500 * 1024,
  embed: Infinity, // embeds store a URL, not the asset itself
  link: Infinity,
};

/** Grabs a single video frame as a JPEG data URL, for use as a poster image —
 *  the same "render into an offscreen canvas" trick compressImage() uses for
 *  stills, applied to a <video> element instead of an <img>. Without this the
 *  only way to preview an uploaded video was the tiny reference chip itself
 *  (which can't play video), so it silently fell back to a generic stock photo. */
export function extractVideoPoster(fileOrUrl: File | string, seekTo = 0.1): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';

    const objectUrl = fileOrUrl instanceof File ? URL.createObjectURL(fileOrUrl) : null;
    video.src = objectUrl || (fileOrUrl as string);

    const cleanup = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(seekTo, Math.max(video.duration - 0.1, 0));
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) { cleanup(); resolve(null); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        cleanup();
        resolve(dataUrl);
      } catch {
        cleanup();
        resolve(null);
      }
    };
    video.onerror = () => { cleanup(); resolve(null); };
    // Some browsers need an explicit load() before seeking will fire.
    video.load();
  });
}

let refIdCounter = 0;
/** Stable enough within one session — references are keyed by array position
 *  today, this only needs to be unique among references added in this tab. */
export function makeReferenceId(): string {
  refIdCounter += 1;
  return `ref-${Date.now()}-${refIdCounter}`;
}

/** Reads a Post.references entry regardless of which shape it's in — a bare
 *  URL string (every reference before this migration) or a full
 *  PostReference object (every reference from now on). Call this at read
 *  time instead of migrating stored data, so existing posts keep working
 *  without a write-touch-every-document backfill.
 *
 *  `index` seeds the id for legacy string entries so it stays stable across
 *  re-renders (position in the array, not a fresh id every call) — a fresh id
 *  per render would remount every thumbnail and drop the React key each time
 *  localPost updates. */
export function normalizeReference(ref: string | PostReference, index: number): PostReference {
  if (typeof ref !== 'string') return ref;
  const provider = detectProvider(ref);
  return {
    id: `legacy-${index}`,
    url: ref,
    kind: provider ? 'embed' : classifyReferenceUrl(ref),
    // Omitted (not undefined) for the same reason as the write paths in
    // PostModal — this value is display-only today, but a PostReference
    // should never carry a literal undefined field regardless.
    ...(provider ? { provider: provider.id } : {}),
  };
}
