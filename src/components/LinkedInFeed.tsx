import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Send, 
  CheckCircle, 
  MoreHorizontal, 
  ThumbsUp, 
  Globe, 
  ChevronLeft, 
  ChevronRight,
  Bookmark,
  ExternalLink,
  Laptop,
  Smartphone
} from 'lucide-react';
import { cn, deriveAccentPalette, getVisibleFeedPosts } from '../lib/utils';
import { Post } from '../types';
import Toggle from './Toggle';
import SegmentedControl from './SegmentedControl';
import PhaseBadge from './PhaseBadge';
import IconButton from './IconButton';
import Media from './Media';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import SocialCaption from './SocialCaption';

interface LinkedInFeedProps {
  posts: Post[];
  onSelectPost: (post: Post, initialTab?: 'comments' | 'feedback') => void;
  userRole: string;
  projects?: any[];
  loading?: boolean;
}

export default function LinkedInFeed({ posts, onSelectPost, userRole, projects = [], loading = false }: LinkedInFeedProps) {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [filterPhase, setFilterPhase] = useState<'all' | 'approved_only'>('all');
  const [activeCarouselSlides, setActiveCarouselSlides] = useState<Record<string, number>>({});
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [grayscalePublished, setGrayscalePublished] = useState(false);

  // Filter posts for LinkedIn platform
  const linkedInPosts = posts.filter(p => p.platform === 'linkedin');

  // Filter based on roles and selection — most recent first, like a real feed.
  // Only posts with a creativity actually uploaded show up here; an empty
  // placeholder isn't a real preview of anything.
  const visiblePosts = getVisibleFeedPosts(linkedInPosts, userRole, filterPhase);

  const toggleLike = (postId: string) => {
    setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCarouselNext = (postId: string, totalSlides: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCarouselSlides(prev => {
      const current = prev[postId] || 0;
      return { ...prev, [postId]: (current + 1) % totalSlides };
    });
  };

  const handleCarouselPrev = (postId: string, totalSlides: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCarouselSlides(prev => {
      const current = prev[postId] || 0;
      return { ...prev, [postId]: (current - 1 + totalSlides) % totalSlides };
    });
  };

  const getPostMedia = (post: Post, grayscale: boolean) => {
    const isGray = grayscale && post.phase === 'published';

    if (post.format === 'carrusel' && post.carouselUrls && post.carouselUrls.length > 0) {
      const activeIdx = activeCarouselSlides[post.id] || 0;
      return (
        <div className="relative bg-slate-50 border-y border-divider overflow-hidden group">
          <Media
            src={post.carouselUrls[activeIdx]}
            alt={`Slide ${activeIdx + 1}`}
            className={cn("w-full h-auto block", isGray && "grayscale")}
            videoClassName="max-h-[500px] mx-auto bg-black"
            videoProps={{ controls: true }}
            imgProps={{ referrerPolicy: 'no-referrer' }}
          />
          {post.carouselUrls.length > 1 && (
            <>
              <IconButton icon={ChevronLeft} variant="overlay" size="sm" onClick={(e) => handleCarouselPrev(post.id, post.carouselUrls!.length, e)} className="absolute left-2 top-1/2 -translate-y-1/2" aria-label="Diapositiva anterior" />
              <IconButton icon={ChevronRight} variant="overlay" size="sm" onClick={(e) => handleCarouselNext(post.id, post.carouselUrls!.length, e)} className="absolute right-2 top-1/2 -translate-y-1/2" aria-label="Diapositiva siguiente" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-2 py-0.5 rounded text-[11px] font-bold text-white tracking-widest">
                {activeIdx + 1} / {post.carouselUrls.length}
              </div>
            </>
          )}
        </div>
      );
    }

    // Every post reaching this view already has a creativity uploaded
    // (filtered in visiblePosts), so a plain design/video is always here.
    const isReel = post.format === 'reel';
    return (
      <div className="relative bg-slate-50 border-y border-divider overflow-hidden">
        <Media
          src={post.currentDesignUrl}
          alt={post.idea}
          className={cn("w-full h-auto block", isGray && "grayscale")}
          videoClassName="max-h-[500px] mx-auto bg-black"
          videoProps={{ controls: true }}
          imgProps={{ referrerPolicy: 'no-referrer' }}
        />
        {isReel && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[11px] font-bold">
            🎥 Reel Horizontal (1920x1080)
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
      {/* Controls panel */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-divider shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-ink text-sm">Feed LinkedIn</h3>
            <p className="text-xs text-ink-muted mt-1">Simulador de feed corporativo.</p>
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
              value={deviceMode}
              onChange={(v) => setDeviceMode(v as 'desktop' | 'mobile')}
              options={[
                { value: 'desktop', label: 'Desktop', icon: Laptop },
                { value: 'mobile', label: 'Móvil', icon: Smartphone }
              ]}
            />
          </div>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs text-blue-700 leading-relaxed">
          💡 <strong>Tip de Previsualización:</strong> Haz clic en cualquier publicación para abrir la ventana de producción, editar el caption, cambiar diseños o aprobar el post.
        </div>
      </div>

      {/* Live Stream Simulator */}
      <div className="flex-1 flex justify-center items-start overflow-y-auto pr-2 pb-12">
        {loading ? (
          <div className="w-full max-w-xl space-y-4" role="status" aria-label="Cargando publicaciones">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white border border-divider rounded-lg shadow-sm overflow-hidden p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton shape="circle" className="w-10 h-10" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton shape="text" className="h-3 w-32" />
                    <Skeleton shape="text" className="h-2.5 w-20" />
                  </div>
                </div>
                <Skeleton shape="block" className="h-48 w-full" />
              </div>
            ))}
          </div>
        ) : visiblePosts.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No hay posts de LinkedIn"
            description='Configura posts con plataforma "LinkedIn" en el calendario para visualizarlos aquí en tiempo real.'
            bordered
            className="w-full max-w-xl"
          />
        ) : (
          <div className={cn(
            "w-full transition-all duration-300",
            deviceMode === 'mobile' ? "max-w-sm border-[10px] border-slate-900 rounded-[32px] overflow-hidden bg-gray-100 shadow-2xl p-2.5 aspect-[9/19] h-[720px]" : "max-w-xl"
          )}>
            <div className={cn("space-y-4", deviceMode === 'mobile' && "overflow-y-auto h-full scrollbar-hide")}>
              {visiblePosts.map((post) => {
                const isLiked = likedPosts[post.id];
                const project = projects.find(p => p.id === post.projectId);

                return (
                  <div 
                    key={post.id} 
                    className="bg-white border border-divider rounded-lg shadow-sm overflow-hidden text-left"
                  >
                    {/* User Profile Info */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* deriveAccentPalette: the project's raw color has no guaranteed
                            contrast against the white initial painted on top of it — same
                            fix as the dynamic --app-accent and PostModal's project badge.
                            Fallback color corrected to LinkedIn's current brand blue
                            (#0A66C2, matching SocialIcons.tsx) — #0077B5 is LinkedIn's blue
                            from before their 2019 rebrand. */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0"
                          style={{ backgroundColor: deriveAccentPalette(project?.color || '#0A66C2').primary }}
                        >
                          {project?.name?.[0] || 'L'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <h4 className="font-bold text-ink text-xs sm:text-sm">
                              {project?.name || 'Cliente Corporativo'}
                            </h4>
                            {/* Was always accent-tinted regardless of phase — PhaseBadge
                                restores the categorical color PHASES defines per phase
                                (design=amber, approved=emerald, etc), same as every other
                                phase badge in the app already shows. */}
                            <PhaseBadge phase={post.phase} />
                          </div>
                          <p className="text-caption text-ink-muted leading-none mt-0.5">
                            {project?.clientName ? `Socio en ${project.clientName}` : 'Planificación de LinkedIn'} • 1h • <Globe size={10} className="inline ml-0.5" />
                          </p>
                        </div>
                      </div>
                      <IconButton
                        icon={MoreHorizontal}
                        size="sm"
                        onClick={() => onSelectPost(post)}
                        className="rounded-full"
                        aria-label="Más opciones"
                      />
                    </div>

                    {/* Post Text Description */}
                    <div className="px-4 pb-3">
                      <SocialCaption
                        text={post.copyCaption || post.idea}
                        lineClamp={3}
                        highlightClass="font-semibold text-blue-600"
                        className="text-ink text-xs sm:text-sm whitespace-pre-wrap leading-relaxed"
                      />
                    </div>

                    {/* Post Media Rendering */}
                    <button type="button" className="w-full block cursor-pointer" onClick={() => onSelectPost(post)}>
                      {getPostMedia(post, grayscalePublished)}
                    </button>

                    {/* Engagement Buttons */}
                    <div className="grid grid-cols-4 px-2 py-1 text-ink-secondary font-semibold text-xs sm:text-sm">
                      <button 
                        onClick={() => toggleLike(post.id)}
                        className={cn(
                          "py-2 flex items-center justify-center gap-1.5 hover:bg-gray-50 rounded-lg transition-colors",
                          isLiked ? "text-blue-600 font-bold" : "hover:text-ink-secondary"
                        )}
                      >
                        <ThumbsUp size={14} fill={isLiked ? "currentColor" : "none"} />
                        <span>Reaccionar</span>
                      </button>
                      <button
                        onClick={() => onSelectPost(post, userRole !== 'client' ? 'comments' : 'feedback')}
                        className="py-2 flex items-center justify-center gap-1.5 hover:bg-gray-50 rounded-lg transition-colors hover:text-ink-secondary"
                      >
                        <MessageSquare size={14} />
                        <span>Comentar</span>
                      </button>
                      <button 
                        className="py-2 flex items-center justify-center gap-1.5 hover:bg-gray-50 rounded-lg transition-colors hover:text-ink-secondary"
                        onClick={() => alert('¡Simulación de compartir enlace de previsualización copiado!')}
                      >
                        <Share2 size={14} />
                        <span>Compartir</span>
                      </button>
                      <button 
                        className="py-2 flex items-center justify-center gap-1.5 hover:bg-gray-50 rounded-lg transition-colors hover:text-ink-secondary"
                        onClick={() => onSelectPost(post)}
                      >
                        <Send size={14} />
                        <span>Enviar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
