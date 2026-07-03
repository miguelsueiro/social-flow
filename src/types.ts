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

export interface PostVersion {
  createdAt: Date;
  copyCaption: string;
  copyCreativity: string;
  designUrl: string;
  authorName: string;
}

export interface Post {
  id: string;
  date: Date;
  platform: 'instagram' | 'linkedin' | 'tiktok';
  phase: Phase;
  idea: string;
  format: PostFormat;
  projectId: string; // Associated project ID
  references?: string[];
  copyCreativity?: string;
  copyCaption?: string;
  currentDesignUrl?: string;
  carouselUrls?: string[]; // Slide image URLs for Carousel format
  videoUrl?: string; // Video simulation for Reels format
}
