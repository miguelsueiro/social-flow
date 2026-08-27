import type { HashtagGroup } from '../types';

/** Normalizes free-typed hashtag input into a canonical "#tag" form, or null
 *  when there's nothing left after stripping. Punctuation/spaces are removed
 *  rather than rejected outright — pasting "#un texto raro" should become
 *  "#untextoraro", matching what actually posts as a single tag on
 *  Instagram/LinkedIn/TikTok, instead of silently keeping a string that
 *  would break into multiple words once pasted into a real caption. */
export function normalizeHashtag(raw: string): string | null {
  const withoutHash = raw.trim().replace(/^#+/, '');
  const cleaned = withoutHash.replace(/[^\p{L}\p{N}_]/gu, '');
  if (!cleaned) return null;
  return `#${cleaned}`;
}

/** Every hashtag across a project's groups, deduplicated case-insensitively
 *  (first occurrence wins) — used by the picker's search and by "select all
 *  matching" style flows where group boundaries don't matter. */
export function allProjectHashtags(groups: HashtagGroup[] = []): string[] {
  const seen = new Set<string>();
  const all: string[] = [];
  for (const group of groups) {
    for (const tag of group.hashtags) {
      const key = tag.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        all.push(tag);
      }
    }
  }
  return all;
}
