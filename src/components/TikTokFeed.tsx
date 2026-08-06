import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight,
  Music,
  Smartphone,
  Grid as GridIcon,
  Play,
  Volume2
} from 'lucide-react';
import { cn, PHASES, deriveAccentPalette, onActivateKey, getVisibleFeedPosts } from '../lib/utils';
import { Post } from '../types';
import SocialCaption from './SocialCaption';
import Toggle from './Toggle';
import SegmentedControl from './SegmentedControl';
import IconButton from './IconButton';
import Media from './Media';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';

interface TikTokFeedProps {
  posts: Post[];
  onSelectPost: (post: Post, initialTab?: 'comments' | 'feedback') => void;
  userRole: string;
  projects?: any[];
  loading?: boolean;
}

export default function TikTokFeed({ posts, onSelectPost, userRole, projects = [], loading = false }: TikTokFeedProps) {
  const [viewMode, setViewMode] = useState<'phone' | 'grid'>('phone');
  const [filterPhase, setFilterPhase] = useState<'all' | 'approved_only'>('all');
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  const [grayscalePublished, setGrayscalePublished] = useState(false);

  // Filter TikTok posts
  const tiktokPosts = posts.filter(p => p.platform === 'tiktok');

  // Filter based on roles and selection — most recent first, like a real feed.
  // Only posts with a creativity actually uploaded show up here; an empty
  // placeholder isn't a real preview of anything.
  const visiblePosts = getVisibleFeedPosts(tiktokPosts, userRole, filterPhase);

  const activePost = visiblePosts[currentPostIndex] || null;

  const toggleLike = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const toggleSave = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleNextPost = () => {
    if (currentPostIndex < visiblePosts.length - 1) {
      setCurrentPostIndex(prev => prev + 1);
    }
  };

  const handlePrevPost = () => {
    if (currentPostIndex > 0) {
      setCurrentPostIndex(prev => prev - 1);
    }
  };


  const renderActivePhoneFeed = () => {
    if (loading) {
      return (
        <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative bg-zinc-900" role="status" aria-label="Cargando publicaciones">
          <Skeleton shape="block" className="absolute inset-0 rounded-none bg-gray-800" />
        </div>
      );
    }

    if (!activePost) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-ink-secondary text-center p-8 rounded-[2.5rem]">
          <Music size={40} className="animate-bounce mb-3 text-ink-secondary" />
          <p className="font-bold text-sm text-ink-muted">No hay posts de TikTok disponibles</p>
          <p className="text-xs mt-1 text-ink-secondary max-w-xs">Planifica posts eligiendo la plataforma TikTok o aprueba ideas pendientes.</p>
        </div>
      );
    }

    const proj = projects.find(p => p.id === activePost.projectId);
    const isLiked = likedPosts[activePost.id];
    const isSaved = savedPosts[activePost.id];

    // role="button", not a real <button> — this wraps the like/comment/save/share
    // action rail below, each a real <button> of its own, so the outer element
    // can't be a <button> itself (invalid: buttons can't nest buttons).
    return (
      <div
        onClick={() => onSelectPost(activePost)}
        role="button"
        tabIndex={0}
        onKeyDown={onActivateKey(() => onSelectPost(activePost))}
        className="relative w-full h-full bg-black rounded-[2.5rem] overflow-hidden select-none cursor-pointer flex flex-col justify-between group"
      >
        {/* Visual Content (Creativity) — every post reaching this view already
            has a creativity uploaded (filtered in visiblePosts). */}
        <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-zinc-950">
          <Media
            src={activePost.currentDesignUrl}
            alt={activePost.idea}
            className={cn(
              "w-full h-full object-cover opacity-90 filter brightness-95",
              grayscalePublished && activePost.phase === 'published' && "grayscale"
            )}
            videoProps={{ autoPlay: true, loop: true }}
            imgProps={{ referrerPolicy: 'no-referrer' }}
          />
          {/* Ambient lighting gradient overlay for TikTok UI elements readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-1" />
        </div>

        {/* Top Header - Tabs */}
        <div className="relative z-10 pt-4 flex justify-center gap-4 text-xs font-bold text-white/60">
          <button className="hover:text-white transition-colors">Siguiendo</button>
          <button className="text-white border-b-2 border-white pb-1 font-extrabold">Para ti</button>
        </div>

        {/* Floating process indicator badge */}
        <div className="absolute top-4 left-6 z-10">
          <span className="bg-cyan-500/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-black text-black uppercase tracking-wider shadow-sm">
            {PHASES[activePost.phase]?.label.split(': ').pop() || activePost.phase}
          </span>
        </div>

        {/* Right Side Overlay Actions */}
        <div className="absolute right-3 bottom-24 z-10 flex flex-col items-center gap-4 text-white">
          {/* Avatar Profile */}
          <div className="relative mb-2">
            {/* deriveAccentPalette: same contrast fix as the dynamic --app-accent —
                the project's raw color has no guaranteed contrast against the white
                initial painted on top of it. */}
            <div
              className="w-11 h-11 rounded-full border-2 border-white flex items-center justify-center font-bold text-xs shadow-lg overflow-hidden shrink-0"
              style={{ backgroundColor: deriveAccentPalette(proj?.color || '#4F46E5').primary }}
            >
              {proj ? proj.name[0].toUpperCase() : 'T'}
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#FE2C55] flex items-center justify-center text-white text-[11px] font-bold">
              +
            </div>
          </div>

          {/* Like */}
          <button
            onClick={(e) => toggleLike(activePost.id, e)}
            className="flex flex-col items-center gap-1 group/btn"
            aria-label="Me gusta"
          >
            <div className="p-2 bg-black/40 rounded-full backdrop-blur-md hover:bg-black/60 transition-all active:scale-95">
              <Heart 
                size={22} 
                className={cn("transition-colors", isLiked ? "fill-[#FE2C55] text-[#FE2C55]" : "text-white")} 
              />
            </div>
          </button>

          {/* Comments */}
          <button
            onClick={(e) => { e.stopPropagation(); onSelectPost(activePost, userRole !== 'client' ? 'comments' : 'feedback'); }}
            className="flex flex-col items-center gap-1"
            aria-label="Comentarios"
          >
            <div className="p-2 bg-black/40 rounded-full backdrop-blur-md hover:bg-black/60 transition-all">
              <MessageSquare size={22} className="text-white" />
            </div>
          </button>

          {/* Bookmark */}
          <button
            onClick={(e) => toggleSave(activePost.id, e)}
            className="flex flex-col items-center gap-1"
            aria-label="Guardar"
          >
            <div className="p-2 bg-black/40 rounded-full backdrop-blur-md hover:bg-black/60 transition-all active:scale-95">
              <Bookmark
                size={22}
                className={cn("transition-colors", isSaved ? "fill-[#FAC917] text-[#FAC917]" : "text-white")}
              />
            </div>
          </button>

          {/* Share */}
          <button className="flex flex-col items-center gap-1" aria-label="Compartir">
            <div className="p-2 bg-black/40 rounded-full backdrop-blur-md hover:bg-black/60 transition-all">
              <Share2 size={22} className="text-white" />
            </div>
          </button>

          {/* Spinning Vinyl Record Disc */}
          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 p-1 animate-spin mt-2 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <Music size={10} className="text-white" />
            </div>
          </div>
        </div>

        {/* Bottom Left Captions / Details */}
        <div className="relative z-10 p-6 pt-0 text-white space-y-2 max-w-[80%]">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm truncate">@{proj?.name?.toLowerCase().replace(/\s+/g, '') || 'brand_tiktok'}</span>
            <span className="text-[11px] bg-white/20 px-1 py-0.5 rounded font-bold text-white uppercase tracking-widest shrink-0">OFICIAL</span>
          </div>
          
          <SocialCaption
            text={activePost.copyCaption || activePost.idea}
            lineClamp={3}
            highlightClass="font-bold text-cyan-400"
            className="text-xs leading-normal font-medium text-zinc-100"
            moreClassName="font-semibold text-ink-muted hover:text-white"
          />

          {/* Sound bar */}
          <div className="flex items-center gap-1.5 overflow-hidden text-xs text-ink-muted">
            <Music size={12} className="shrink-0" />
            <div className="truncate text-[11px] font-semibold tracking-wide">
              <span>sonido original - {proj?.name || 'SocialFlow'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGridView = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3" role="status" aria-label="Cargando publicaciones">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} shape="block" className="aspect-[9/16] rounded-2xl" />
          ))}
        </div>
      );
    }

    if (visiblePosts.length === 0) {
      return (
        <EmptyState
          icon={Music}
          title="No hay posts planificados para TikTok"
          description='Crea un post en el calendario con la plataforma "TikTok" para comenzar.'
          bordered
          className="col-span-full"
        />
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {visiblePosts.map((post) => {
          return (
            <button
              type="button"
              key={post.id}
              onClick={() => onSelectPost(post)}
              className="group text-left aspect-[9/16] bg-zinc-950 rounded-2xl overflow-hidden relative border border-zinc-900 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
            >
              <Media
                src={post.currentDesignUrl}
                alt={post.idea}
                className={cn(
                  "w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105",
                  grayscalePublished && post.phase === 'published' && "grayscale"
                )}
                imgProps={{ referrerPolicy: 'no-referrer' }}
              />

              {/* Grid Overlays */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-between z-10 text-white">
                <div className="flex items-center gap-1">
                  <Play size={11} className="fill-white" />
                </div>
                <span className="text-[11px] font-black px-1.5 py-0.5 rounded bg-cyan-500 text-black uppercase scale-90 origin-right">
                  {PHASES[post.phase]?.label.split(': ').pop() || post.phase}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-divider shadow-sm space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h3 className="font-extrabold text-ink text-sm">Feed TikTok</h3>
            </div>
            <p className="text-xs text-ink-muted leading-normal">Simula la visualización de tus vídeos y reels en TikTok.</p>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink-secondary">Publicados en B/N</span>
            <Toggle checked={grayscalePublished} onChange={setGrayscalePublished} label="Poner en blanco y negro los posts publicados" />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">Filtrar Estado</label>
            <SegmentedControl
              aria-label="Filtrar estado"
              value={filterPhase}
              onChange={(v) => setFilterPhase(v as 'all' | 'approved_only')}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'approved_only', label: 'Aprobados' }
              ]}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">Modo de Vista</label>
            <SegmentedControl
              aria-label="Modo de vista"
              value={viewMode}
              onChange={(v) => setViewMode(v as 'phone' | 'grid')}
              options={[
                { value: 'phone', label: 'Móvil', icon: Smartphone },
                { value: 'grid', label: 'Cuadrícula', icon: GridIcon }
              ]}
            />
          </div>
        </div>

        {viewMode === 'phone' && visiblePosts.length > 1 && (
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-divider shadow-sm flex items-center justify-between">
            <IconButton icon={ChevronLeft} disabled={currentPostIndex === 0} onClick={handlePrevPost} className="border border-divider" aria-label="Post anterior" />
            <span className="text-xs font-bold text-ink-secondary">
              Post {currentPostIndex + 1} de {visiblePosts.length}
            </span>
            <IconButton icon={ChevronRight} disabled={currentPostIndex === visiblePosts.length - 1} onClick={handleNextPost} className="border border-divider" aria-label="Post siguiente" />
          </div>
        )}
      </div>

      {/* Primary Simulator Workspace */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto min-h-0 bg-gray-50/50 rounded-3xl border border-divider p-4">
        {viewMode === 'phone' ? (
          <div className="relative w-[340px] h-[650px] bg-zinc-950 rounded-[3.2rem] p-3 border-[10px] border-zinc-900 shadow-2xl flex-shrink-0">
            {/* Speaker & camera mockup dots */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-28 bg-zinc-900 rounded-b-2xl z-50 flex items-center justify-center gap-2">
              <div className="w-12 h-1 bg-zinc-800 rounded-full" />
              <div className="w-2.5 h-2.5 bg-zinc-800 rounded-full" />
            </div>

            {/* Inner Feed Simulator */}
            <div className="w-full h-full rounded-[2.5rem] overflow-hidden bg-black">
              {renderActivePhoneFeed()}
            </div>
          </div>
        ) : (
          <div className="w-full max-h-full overflow-y-auto pr-1">
            {renderGridView()}
          </div>
        )}
      </div>
    </div>
  );
}
