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
import { cn, PHASES, Phase, isVideoUrl } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import SocialCaption from './SocialCaption';

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
}

interface LinkedInFeedProps {
  posts: Post[];
  onSelectPost: (post: Post) => void;
  userRole: string;
  projects?: any[];
}

export default function LinkedInFeed({ posts, onSelectPost, userRole, projects = [] }: LinkedInFeedProps) {
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
  const visiblePosts = linkedInPosts
    .filter(p => {
      const hasCreativity = p.format === 'carrusel'
        ? (p.carouselUrls && p.carouselUrls.some(Boolean))
        : !!p.currentDesignUrl;
      if (!hasCreativity) return false;

      const isVisibleForRole = userRole !== 'client' || PHASES[p.phase].clientVisible;
      if (!isVisibleForRole) return false;

      if (filterPhase === 'approved_only') {
        return p.phase === 'approved' || p.phase === 'published';
      }
      return true;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

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
        <div className="relative bg-slate-50 border-y border-gray-100 overflow-hidden group">
          {isVideoUrl(post.carouselUrls[activeIdx]) ? (
            <video
              src={post.carouselUrls[activeIdx]}
              className={cn("w-full h-auto block max-h-[500px] mx-auto bg-black", isGray && "grayscale")}
              controls
              muted
              playsInline
            />
          ) : (
            <img
              src={post.carouselUrls[activeIdx]}
              alt={`Slide ${activeIdx + 1}`}
              className={cn("w-full h-auto block", isGray && "grayscale")}
              referrerPolicy="no-referrer"
            />
          )}
          {post.carouselUrls.length > 1 && (
            <>
              <button
                onClick={(e) => handleCarouselPrev(post.id, post.carouselUrls!.length, e)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                aria-label="Diapositiva anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={(e) => handleCarouselNext(post.id, post.carouselUrls!.length, e)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                aria-label="Diapositiva siguiente"
              >
                <ChevronRight size={16} />
              </button>
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
      <div className="relative bg-slate-50 border-y border-gray-100 overflow-hidden">
        {isVideoUrl(post.currentDesignUrl!) ? (
          <video
            src={post.currentDesignUrl}
            className={cn("w-full h-auto block max-h-[500px] mx-auto bg-black", isGray && "grayscale")}
            controls
            muted
            playsInline
          />
        ) : (
          <img
            src={post.currentDesignUrl}
            alt={post.idea}
            className={cn("w-full h-auto block", isGray && "grayscale")}
            referrerPolicy="no-referrer"
          />
        )}
        {isReel && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[11px] font-bold">
            🎥 Reel Vertical
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
      {/* Controls panel */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Feed LinkedIn</h3>
            <p className="text-xs text-gray-400 mt-1">Simulador de feed corporativo.</p>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-600">Publicados en B/N</span>
            <button
              role="switch"
              aria-checked={grayscalePublished}
              aria-label="Poner en blanco y negro los posts publicados"
              onClick={() => setGrayscalePublished(!grayscalePublished)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                grayscalePublished ? "bg-app-accent" : "bg-gray-200"
              )}
            >
              <span className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                grayscalePublished ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Filtrar Estado</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100">
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
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Modo de Vista</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100">
              <button 
                onClick={() => setDeviceMode('desktop')}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                  deviceMode === 'desktop' ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Laptop size={14} />
                Desktop
              </button>
              <button 
                onClick={() => setDeviceMode('mobile')}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                  deviceMode === 'mobile' ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Smartphone size={14} />
                Móvil
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs text-blue-700 leading-relaxed">
          💡 <strong>Tip de Previsualización:</strong> Haz clic en cualquier publicación para abrir la ventana de producción, editar el caption, cambiar diseños o aprobar el post.
        </div>
      </div>

      {/* Live Stream Simulator */}
      <div className="flex-1 flex justify-center items-start overflow-y-auto pr-2 pb-12">
        {visiblePosts.length === 0 ? (
          <div className="w-full max-w-xl text-center py-20 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <Globe size={48} className="text-gray-300 mx-auto mb-3" />
            <h4 className="font-bold text-gray-800 text-sm">No hay posts de LinkedIn</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Configura posts con plataforma "LinkedIn" en el calendario para visualizarlos aquí en tiempo real.
            </p>
          </div>
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
                    className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden text-left"
                  >
                    {/* User Profile Info */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0"
                          style={{ backgroundColor: project?.color || '#0077B5' }}
                        >
                          {project?.name?.[0] || 'L'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <h4 className="font-bold text-gray-900 text-xs sm:text-sm">
                              {project?.name || 'Cliente Corporativo'}
                            </h4>
                            <span className="text-[11px] bg-app-accent-subtle text-app-accent px-1.5 py-0.5 rounded-full font-bold">
                              {PHASES[post.phase].label.split(':')[1] || PHASES[post.phase].label}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 font-medium leading-none mt-0.5">
                            {project?.clientName ? `Socio en ${project.clientName}` : 'Planificación de LinkedIn'} • 1h • <Globe size={10} className="inline ml-0.5" />
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onSelectPost(post)}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Más opciones"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>

                    {/* Post Text Description */}
                    <div className="px-4 pb-3">
                      <SocialCaption
                        text={post.copyCaption || post.idea}
                        lineClamp={3}
                        highlightClass="font-semibold text-blue-600"
                        className="text-gray-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed"
                      />
                    </div>

                    {/* Post Media Rendering */}
                    <div className="cursor-pointer" onClick={() => onSelectPost(post)}>
                      {getPostMedia(post, grayscalePublished)}
                    </div>

                    {/* Engagement Buttons */}
                    <div className="grid grid-cols-4 px-2 py-1 text-gray-500 font-semibold text-xs sm:text-sm">
                      <button 
                        onClick={() => toggleLike(post.id)}
                        className={cn(
                          "py-2 flex items-center justify-center gap-1.5 hover:bg-gray-50 rounded-lg transition-colors",
                          isLiked ? "text-blue-600 font-bold" : "hover:text-gray-700"
                        )}
                      >
                        <ThumbsUp size={14} fill={isLiked ? "currentColor" : "none"} />
                        <span>Reaccionar</span>
                      </button>
                      <button 
                        onClick={() => onSelectPost(post)}
                        className="py-2 flex items-center justify-center gap-1.5 hover:bg-gray-50 rounded-lg transition-colors hover:text-gray-700"
                      >
                        <MessageSquare size={14} />
                        <span>Comentar</span>
                      </button>
                      <button 
                        className="py-2 flex items-center justify-center gap-1.5 hover:bg-gray-50 rounded-lg transition-colors hover:text-gray-700"
                        onClick={() => alert('¡Simulación de compartir enlace de previsualización copiado!')}
                      >
                        <Share2 size={14} />
                        <span>Compartir</span>
                      </button>
                      <button 
                        className="py-2 flex items-center justify-center gap-1.5 hover:bg-gray-50 rounded-lg transition-colors hover:text-gray-700"
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
