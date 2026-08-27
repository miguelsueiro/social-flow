import { useState } from 'react';
import { Snowflake, Search, CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Post } from '../types';
import { htmlToPlainText } from '../lib/richText';
import { PlatformBadge } from './SocialIcons';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';
import Media from './Media';

interface NeveraViewProps {
  posts: Post[];
  onSelectPost: (post: Post) => void;
  /** Assigns a real publish date and clears `frozen` — the only way a post
   *  leaves Nevera, per the spec (freezing happens from PostModal's header
   *  button; unfreezing happens here, next to what the post actually is). */
  onUnfreeze: (postId: string, newDate: Date) => void;
  loading?: boolean;
}

/** One frozen post's card, with its own local date-picker state — kept
 *  per-card (not lifted to NeveraView) since only one card's picker is ever
 *  open-with-a-pending-date at a time and nothing else in the view needs it. */
function FrozenPostCard({ post, onSelectPost, onUnfreeze }: { post: Post; onSelectPost: (post: Post) => void; onUnfreeze: (postId: string, newDate: Date) => void }) {
  const [pickingDate, setPickingDate] = useState(false);
  const [dateValue, setDateValue] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const confirmUnfreeze = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dateValue) return;
    // yyyy-MM-dd parses as UTC midnight in some engines — construct from parts
    // instead, so the chosen day doesn't shift a day back in negative-UTC
    // timezones.
    const [y, m, d] = dateValue.split('-').map(Number);
    onUnfreeze(post.id, new Date(y, m - 1, d));
  };

  return (
    <div className="bg-white rounded-2xl border border-divider shadow-sm overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={() => onSelectPost(post)}
        className="aspect-video bg-gray-50 flex items-center justify-center overflow-hidden relative group text-left"
        aria-label={`Abrir ${post.title || post.idea}`}
      >
        {post.currentDesignUrl ? (
          <Media src={post.currentDesignUrl} alt={post.title || 'Post'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" videoProps={{ muted: true }} />
        ) : (
          <Snowflake className="text-sky-200" size={32} />
        )}
      </button>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <PlatformBadge platform={post.platform} size={16} showLabel />
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
            <Snowflake size={11} /> En Nevera
          </span>
        </div>
        <button type="button" onClick={() => onSelectPost(post)} className="text-left">
          <p className="text-sm font-semibold text-ink line-clamp-1">{post.title || 'Post sin título'}</p>
          <p className="text-xs text-ink-muted line-clamp-2 mt-0.5">{htmlToPlainText(post.idea)}</p>
        </button>

        <div className="mt-auto pt-2">
          {pickingDate ? (
            <form onSubmit={confirmUnfreeze} className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                aria-label="Nueva fecha de publicación"
                autoFocus
                className="flex-1 min-w-0 bg-white border border-divider rounded-md py-1.5 px-2 text-xs outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent/20"
              />
              <button type="submit" className="bg-app-accent hover:bg-app-accent-hover text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors shrink-0">
                Sacar
              </button>
              <button type="button" onClick={() => setPickingDate(false)} className="text-ink-muted hover:text-ink text-[11px] font-bold px-1.5 shrink-0">
                Cancelar
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setPickingDate(true)}
              className="w-full flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-ink-secondary text-xs font-bold py-2 rounded-lg transition-colors"
            >
              <CalendarPlus size={13} /> Sacar de la nevera
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Per-project parking lot for posts with no committed publish date yet —
 *  work that's ready-ish but shouldn't clutter the Calendar/Board with a
 *  placeholder date. See Post.frozen in types.ts for why `date` is kept
 *  as-is rather than cleared. */
export default function NeveraView({ posts, onSelectPost, onUnfreeze, loading = false }: NeveraViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const visiblePosts = searchQuery.trim()
    ? posts.filter(post => {
        const q = searchQuery.toLowerCase();
        return (post.title || '').toLowerCase().includes(q) || htmlToPlainText(post.idea).toLowerCase().includes(q);
      })
    : posts;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Snowflake className="text-sky-500" size={20} />
            Nevera
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">Posts guardados sin fecha de publicación comprometida, listos para retomar cuando toque.</p>
        </div>
        {posts.length > 0 && (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en la nevera..."
              aria-label="Buscar en la nevera"
              className="bg-white border border-divider rounded-full pl-8 pr-3 py-2 text-xs outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 w-56"
            />
          </div>
        )}
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={Snowflake}
          title="La nevera está vacía"
          description='Desde la ficha de un post, usa el botón "Enviar a la nevera" para guardarlo aquí sin fecha de publicación.'
          bordered
        />
      ) : visiblePosts.length === 0 ? (
        <EmptyState icon={Search} title="Sin resultados" description="Ningún post en la nevera coincide con tu búsqueda." size="sm" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePosts.map(post => (
            <FrozenPostCard key={post.id} post={post} onSelectPost={onSelectPost} onUnfreeze={onUnfreeze} />
          ))}
        </div>
      )}
    </div>
  );
}
