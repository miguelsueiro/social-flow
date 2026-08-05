import React, { useState } from 'react';
import { cn } from '../lib/utils';

const TOKEN_RE = /(#[\p{L}0-9_]+|@[\p{L}0-9_.]+)/gu;

function renderRichText(text: string, highlightClass: string) {
  return text.split(TOKEN_RE).map((part, i) => {
    if (/^[#@]/.test(part)) {
      return <span key={i} className={highlightClass}>{part}</span>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

const LINE_CLAMP_CLASS: Record<number, string> = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
};

interface SocialCaptionProps {
  username?: string;
  text: string;
  highlightClass?: string;
  className?: string;
  /** Instagram-style: collapse by character count, expand inline with "más". */
  maxChars?: number;
  /** LinkedIn/TikTok-style: collapse by line count, expand/collapse with a "ver más" toggle below. */
  lineClamp?: number;
  moreLabel?: string;
  lessLabel?: string;
  moreClassName?: string;
}

export default function SocialCaption({
  username,
  text,
  highlightClass = 'font-semibold text-blue-600',
  className,
  maxChars,
  lineClamp,
  moreLabel = 'más',
  lessLabel = 'ver menos',
  moreClassName = 'font-semibold text-ink-muted hover:text-ink-secondary',
}: SocialCaptionProps) {
  const [expanded, setExpanded] = useState(false);

  if (maxChars && !expanded && text.length > maxChars) {
    const truncated = text.slice(0, maxChars).trimEnd();
    return (
      <span className={className}>
        {username && <span className="font-semibold text-inherit mr-1">{username}</span>}
        {renderRichText(truncated, highlightClass)}
        <span className="text-ink-muted">... </span>
        <button type="button" onClick={() => setExpanded(true)} className={moreClassName}>
          {moreLabel}
        </button>
      </span>
    );
  }

  const clampClass = lineClamp ? LINE_CLAMP_CLASS[lineClamp] : undefined;
  const isLikelyClamped = lineClamp ? text.length > lineClamp * 45 : false;

  return (
    <span className={className}>
      {username && <span className="font-semibold text-inherit mr-1">{username}</span>}
      <span className={cn(clampClass && !expanded && clampClass)}>
        {renderRichText(text, highlightClass)}
      </span>
      {lineClamp && isLikelyClamped && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          className={cn(moreClassName, 'block mt-0.5')}
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </span>
  );
}
