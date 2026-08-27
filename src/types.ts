import { Phase, Role } from './lib/utils';

export interface Project {
  id: string;
  name: string;
  clientName: string;
  color: string; // Tailwind color name like 'blue', 'indigo', 'emerald', 'rose', 'purple'
  logo?: string;
  hashtagGroups?: HashtagGroup[];
}

/** A themed set of reusable hashtags for a project (e.g. "People" →
 *  #trabajadores, #testimonios). Stored directly on the project document,
 *  same as `platforms`/`territories` — small, edited as a whole list, and
 *  read on every post's Producción tab, so it doesn't earn its own
 *  subcollection the way posts or repository items do. */
export interface HashtagGroup {
  id: string;
  name: string;
  hashtags: string[];
}

export type PostFormat = 'estatico' | 'reel' | 'carrusel';

export type ReferenceKind = 'image' | 'gif' | 'video' | 'pdf' | 'embed' | 'link';

/** One item in Post.references. Replaces the original `string[]` (a bare URL
 *  per reference) so a reference can carry its own kind, a real poster
 *  thumbnail (extracted client-side for uploaded video/PDF, since there's no
 *  server to render one), and which external provider it embeds. `kind` is
 *  stored rather than re-derived on every render because provider embeds
 *  can't be classified from the URL alone reliably enough to skip storing it. */
export interface PostReference {
  id: string;
  url: string;
  kind: ReferenceKind;
  name?: string;
  poster?: string;
  provider?: string;
}

export interface Comment {
  id: string;
  text: string;
  authorName: string;
  roleAtTime: string;
  createdAt: Date;
}

export interface FeedbackItem {
  id: string;
  text: string;
  authorName: string;
  roleAtTime: string;
  createdAt: Date;
  done: boolean;
  doneAt?: Date;
  doneBy?: string;
}

export interface InternalFeedback {
  id: string;
  authorName: string;
  role: string;
  text: string;
  createdAt: string;
}

// A single field-level version-history entry (one caption, one creativity brief,
// or one design URL at a point in time), with its own feedback thread — not a
// combined per-field snapshot, since each field advances independently.
export interface VersionItem {
  id: string;
  value: string;
  createdAt: string;
  authorName: string;
  feedbacks: InternalFeedback[];
}

export interface Post {
  id: string;
  date: Date;
  platform: 'instagram' | 'linkedin' | 'tiktok';
  phase: Phase;
  idea: string;
  // Chosen by the user during Production, not at creation — a brand-new post
  // has no format yet (see App.tsx handleCreatePost).
  format?: PostFormat;
  projectId: string; // Associated project ID
  // Mixed array during the migration window: pre-existing posts hold bare
  // URL strings, new/edited ones hold PostReference objects. Always read
  // through normalizeReference() (lib/media.ts) rather than branching here.
  references?: (string | PostReference)[];
  copyCreativity?: string;
  copyCaption?: string;
  translationEnabled?: boolean;
  copyCreativityTranslated?: string;
  copyCaptionTranslated?: string;
  currentDesignUrl?: string;
  reelCoverUrl?: string; // Instagram reel cover thumbnail (1080x1350), shown in the feed grid instead of the video
  carouselUrls?: string[]; // Slide image URLs for Carousel format
  videoUrl?: string; // Video simulation for Reels format
  title?: string;
  language?: string;
  captionVersions?: VersionItem[];
  creativityVersions?: VersionItem[];
  designVersions?: VersionItem[];
  territory?: string;
  assigneeId?: string;
  assigneeName?: string;
  changesRequestedReason?: string;
  changesRequestedAt?: string;
  changesRequestedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  // Nevera: true while a post is parked with no publish date commitment.
  // `date` is deliberately kept (never cleared) — the posts query orders by
  // `date` server-side, and Firestore excludes documents missing an
  // orderBy field from the result entirely, so a null date would make a
  // frozen post vanish from every listener, not just the ones that filter
  // it out on purpose.
  frozen?: boolean;
  hashtags?: string[];
}

export type RepositoryCategory = 'strategy' | 'guidelines' | 'brandbook' | 'assets' | 'links';

export type GuidelineType = 'do' | 'dont';

/** One entry in a project's brand repository. `url` is either an external
 *  link (Drive/Figma/brand site) or a small inline data URL for a directly
 *  uploaded asset — same inline-vs-link split as Post.references, and for
 *  the same reason (no object storage backend yet). */
export interface RepositoryItem {
  id: string;
  category: RepositoryCategory;
  title: string;
  description?: string;
  url?: string;
  guidelineType?: GuidelineType; // only meaningful when category === 'guidelines'
  createdByName?: string;
  createdAt: string;
}
