import { Phase, Role } from './lib/utils';

export interface Project {
  id: string;
  name: string;
  clientName: string;
  color: string; // Tailwind color name like 'blue', 'indigo', 'emerald', 'rose', 'purple'
  logo?: string;
}

export type PostFormat = 'estatico' | 'reel' | 'carrusel';

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
  references?: string[];
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
}
