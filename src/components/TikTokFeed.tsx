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
import { cn, PHASES, Phase } from '../lib/utils';

interface Post {
  id: string;
  date: Date;
  platform: 'instagram' | 'linkedin' | 'tiktok';
  phase: Phase;
  idea: string;
  format?: 'estatico' | 'reel' | 'carrusel';
  carouselUrls?: string[];
  references?: string[];
  copyCreativity?: string;
  copyCaption?: string;
  currentDesignUrl?: string;
  projectId?: string;
  title?: string;
}

interface TikTokFeedProps {
  posts: Post[];
  onSelectPost: (post: Post) => void;
  userRole: string;
  projects?: any[];
}

export default function TikTokFeed({ posts, onSelectPost, userRole, projects = [] }: TikTokFeedProps) {
  const [viewMode, setViewMode] = useState<'phone' | 'grid'>('phone');
  const [filterPhase, setFilterPhase] = useState<'all' | 'approved_only'>('all');
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});

  // Filter TikTok posts
  const tiktokPosts = posts.filter(p => p.platform === 'tiktok');

  // Filter based on roles and selection
  const visiblePosts = tiktokPosts.filter(p => {
    const isVisibleForRole = userRole !== 'client' || PHASES[p.phase].clientVisible;
    if (!isVisibleForRole) return false;

    if (filterPhase === 'approved_only') {
      return p.phase === 'approved' || p.phase === 'published';
    }
    return true;
  });

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

  const getSeedMetrics = (postId: string) => {
    const seed = postId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return {
      likes: (seed % 950) + 50,
      comments: (seed % 120) + 5,
      saves: (seed % 210) + 8,
      shares: (seed % 80) + 2
    };
  };

  const renderActivePhoneFeed = () => {
    if (!activePost) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-500 text-center p-8 rounded-[2.5rem]">
          <Music size={40} className="animate-bounce mb-3 text-zinc-700" />
          <p className="font-bold text-sm text-zinc-400">No hay posts de TikTok disponibles</p>
          <p className="text-xs mt-1 text-zinc-500 max-w-xs">Planifica posts eligiendo la plataforma TikTok o aprueba ideas pendientes.</p>
        </div>
      );
    }

    const proj = projects.find(p => p.id === activePost.projectId);
    const metrics = getSeedMetrics(activePost.id);
    const isLiked = likedPosts[activePost.id];
    const isSaved = savedPosts[activePost.id];

    return (
      <div 
        onClick={() => onSelectPost(activePost)}
        className="relative w-full h-full bg-black rounded-[2.5rem] overflow-hidden select-none cursor-pointer flex flex-col justify-between group"
      >
        {/* Visual Content (Creativity) */}
        <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-zinc-950">
          {activePost.currentDesignUrl ? (
            <img 
              src={activePost.currentDesignUrl} 
              alt={activePost.idea}
              className="w-full h-full object-cover opacity-90 filter brightness-95"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-zinc-900 via-neutral-950 to-zinc-900 flex flex-col items-center justify-center p-6 text-center">
              <span className="text-4xl mb-4">🎵</span>
              <p className="text-white font-extrabold text-sm line-clamp-2 leading-snug px-4">
                {activePost.title || activePost.idea}
              </p>
              <p className="text-zinc-500 text-[10px] mt-2 italic px-6 line-clamp-3">
                {activePost.idea}
              </p>
            </div>
          )}
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
          <span className="bg-cyan-500/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-black text-black uppercase tracking-wider shadow-sm">
            {PHASES[activePost.phase]?.label.split(': ').pop() || activePost.phase}
          </span>
        </div>

        {/* Right Side Overlay Actions */}
        <div className="absolute right-3 bottom-24 z-10 flex flex-col items-center gap-4 text-white">
          {/* Avatar Profile */}
          <div className="relative mb-2">
            <div 
              className="w-11 h-11 rounded-full border-2 border-white flex items-center justify-center font-bold text-xs shadow-lg overflow-hidden shrink-0"
              style={{ backgroundColor: proj?.color || '#2563EB' }}
            >
              {proj ? proj.name[0].toUpperCase() : 'T'}
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#FE2C55] flex items-center justify-center text-white text-[10px] font-bold">
              +
            </div>
          </div>

          {/* Like */}
          <button 
            onClick={(e) => toggleLike(activePost.id, e)}
            className="flex flex-col items-center gap-1 group/btn"
          >
            <div className="p-2 bg-black/40 rounded-full backdrop-blur-md hover:bg-black/60 transition-all active:scale-90">
              <Heart 
                size={22} 
                className={cn("transition-colors", isLiked ? "fill-[#FE2C55] text-[#FE2C55]" : "text-white")} 
              />
            </div>
            <span className="text-[10px] font-bold shadow-text">{metrics.likes + (isLiked ? 1 : 0)}</span>
          </button>

          {/* Comments */}
          <button className="flex flex-col items-center gap-1">
            <div className="p-2 bg-black/40 rounded-full backdrop-blur-md hover:bg-black/60 transition-all">
              <MessageSquare size={22} className="text-white" />
            </div>
            <span className="text-[10px] font-bold shadow-text">{metrics.comments}</span>
          </button>

          {/* Bookmark */}
          <button 
            onClick={(e) => toggleSave(activePost.id, e)}
            className="flex flex-col items-center gap-1"
          >
            <div className="p-2 bg-black/40 rounded-full backdrop-blur-md hover:bg-black/60 transition-all active:scale-90">
              <Bookmark 
                size={22} 
                className={cn("transition-colors", isSaved ? "fill-[#FAC917] text-[#FAC917]" : "text-white")} 
              />
            </div>
            <span className="text-[10px] font-bold shadow-text">{metrics.saves + (isSaved ? 1 : 0)}</span>
          </button>

          {/* Share */}
          <button className="flex flex-col items-center gap-1">
            <div className="p-2 bg-black/40 rounded-full backdrop-blur-md hover:bg-black/60 transition-all">
              <Share2 size={22} className="text-white" />
            </div>
            <span className="text-[10px] font-bold shadow-text">{metrics.shares}</span>
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
            <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded font-bold text-white uppercase tracking-widest shrink-0">OFICIAL</span>
          </div>
          
          <p className="text-xs leading-normal font-medium text-zinc-100 line-clamp-3">
            {activePost.copyCaption || activePost.idea}
          </p>

          <p className="text-[11px] font-bold text-cyan-400">
            #viral #socialflow #socialmedia #agency
          </p>

          {/* Sound bar */}
          <div className="flex items-center gap-1.5 overflow-hidden text-xs text-zinc-300">
            <Music size={12} className="shrink-0" />
            <div className="marquee overflow-hidden whitespace-nowrap text-[10px] font-semibold tracking-wide">
              <span>sonido original - {proj?.name || 'SocialFlow'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGridView = () => {
    if (visiblePosts.length === 0) {
      return (
        <div className="col-span-full py-20 text-center text-gray-400 bg-white border border-gray-100 rounded-3xl shadow-sm">
          <Music size={40} className="mx-auto text-gray-200 mb-3 animate-pulse" />
          <p className="font-bold text-sm text-gray-500">No hay posts planificados para TikTok</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">Crea un post en el calendario con la plataforma "TikTok" para comenzar.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {visiblePosts.map((post) => {
          const metrics = getSeedMetrics(post.id);
          return (
            <div 
              key={post.id}
              onClick={() => onSelectPost(post)}
              className="group aspect-[9/16] bg-zinc-950 rounded-2xl overflow-hidden relative border border-zinc-900 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
            >
              {post.currentDesignUrl ? (
                <img 
                  src={post.currentDesignUrl} 
                  alt={post.idea} 
                  className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-zinc-900 via-neutral-950 to-zinc-900 flex flex-col justify-between p-4">
                  <span className="text-2xl">🎵</span>
                  <p className="text-white text-xs font-extrabold line-clamp-3 leading-snug">{post.title || post.idea}</p>
                  <span className="text-[9px] text-zinc-500 tracking-wider">CREATIVITY PREVIEW</span>
                </div>
              )}

              {/* Grid Overlays */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-between z-10 text-white">
                <div className="flex items-center gap-1">
                  <Play size={11} className="fill-white" />
                  <span className="text-[10px] font-bold">{(metrics.likes * 12).toLocaleString()}</span>
                </div>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-500 text-black uppercase scale-90 origin-right">
                  {PHASES[post.phase]?.label.split(': ').pop() || post.phase}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h3 className="font-extrabold text-gray-900 text-sm">Feed TikTok</h3>
            </div>
            <p className="text-xs text-gray-400 leading-normal">Simula la visualización de tus vídeos y reels en TikTok.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filtrar Estado</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-150">
              <button 
                onClick={() => setFilterPhase('all')}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-lg transition-all",
                  filterPhase === 'all' ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterPhase('approved_only')}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-lg transition-all",
                  filterPhase === 'approved_only' ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                Aprobados
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Modo de Vista</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-150">
              <button 
                onClick={() => setViewMode('phone')}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                  viewMode === 'phone' ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Smartphone size={14} />
                Móvil
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                  viewMode === 'grid' ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <GridIcon size={14} />
                Cuadrícula
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'phone' && visiblePosts.length > 1 && (
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <button 
              disabled={currentPostIndex === 0}
              onClick={handlePrevPost}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-gray-700">
              Post {currentPostIndex + 1} de {visiblePosts.length}
            </span>
            <button 
              disabled={currentPostIndex === visiblePosts.length - 1}
              onClick={handleNextPost}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Primary Simulator Workspace */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto min-h-0 bg-gray-50/50 rounded-3xl border border-gray-100 p-4">
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
