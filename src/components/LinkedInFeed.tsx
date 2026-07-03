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
import { cn, PHASES, Phase } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

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

  // Filter posts for LinkedIn platform
  const linkedInPosts = posts.filter(p => p.platform === 'linkedin');

  // Filter based on roles and selection
  const visiblePosts = linkedInPosts.filter(p => {
    const isVisibleForRole = userRole !== 'client' || PHASES[p.phase].clientVisible;
    if (!isVisibleForRole) return false;

    if (filterPhase === 'approved_only') {
      return p.phase === 'approved' || p.phase === 'published';
    }
    return true;
  });

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

  const getPostMedia = (post: Post) => {
    if (post.format === 'carrusel' && post.carouselUrls && post.carouselUrls.length > 0) {
      const activeIdx = activeCarouselSlides[post.id] || 0;
      return (
        <div className="relative aspect-square bg-slate-50 border-y border-gray-150 overflow-hidden group">
          <img 
            src={post.carouselUrls[activeIdx]} 
            alt={`Slide ${activeIdx + 1}`} 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
          {post.carouselUrls.length > 1 && (
            <>
              <button 
                onClick={(e) => handleCarouselPrev(post.id, post.carouselUrls!.length, e)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={(e) => handleCarouselNext(post.id, post.carouselUrls!.length, e)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-widest">
                {activeIdx + 1} / {post.carouselUrls.length}
              </div>
            </>
          )}
        </div>
      );
    }

    if (post.currentDesignUrl) {
      const isReel = post.format === 'reel';
      return (
        <div className={cn(
          "relative bg-slate-50 border-y border-gray-150 overflow-hidden",
          isReel ? "aspect-[9/16] max-h-[480px]" : "aspect-square"
        )}>
          <img 
            src={post.currentDesignUrl} 
            alt={post.idea} 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
          {isReel && (
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-bold">
              🎥 Reel Vertical
            </div>
          )}
        </div>
      );
    }

    // Default beautiful fallback gradient card
    const gradients = [
      'from-slate-700 via-indigo-900 to-slate-800',
      'from-blue-900 to-indigo-950',
      'from-emerald-900 to-teal-950'
    ];
    const charSum = post.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradient = gradients[charSum % gradients.length];

    return (
      <div className={cn("aspect-square w-full bg-gradient-to-tr flex flex-col justify-between p-6 text-white relative border-y border-gray-150", gradient)}>
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
        <div className="relative z-10 flex justify-between items-start">
          <span className="bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold border border-white/10 uppercase tracking-wider">
            {PHASES[post.phase].label}
          </span>
          <span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-200 border border-indigo-500/30 font-medium">
            Creative Draft
          </span>
        </div>
        <div className="relative z-10 space-y-2">
          <p className="text-sm font-bold leading-relaxed line-clamp-4">
            {post.idea}
          </p>
          <p className="text-xs text-slate-300 font-normal line-clamp-2 italic">
            {post.copyCaption || 'Sin caption redactado aún.'}
          </p>
        </div>
        <div className="relative z-10 flex justify-end text-[10px] text-white/50 font-semibold tracking-wider">
          SOCIALFLOW PREVIEW
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
      {/* Controls panel */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Feed LinkedIn</h3>
            <p className="text-xs text-gray-400 mt-1">Simulador de feed corporativo.</p>
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
          <div className="w-full max-w-xl text-center py-20 bg-white border border-gray-150 rounded-2xl shadow-sm">
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
                const seed = post.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                const baseLikes = (seed % 45) + 3;
                const likesCount = isLiked ? baseLikes + 1 : baseLikes;
                const commentsCount = (seed % 12) + 1;
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
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">
                              {PHASES[post.phase].label.split(':')[1] || PHASES[post.phase].label}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">
                            {project?.clientName ? `Socio en ${project.clientName}` : 'Planificación de LinkedIn'} • 1h • <Globe size={10} className="inline ml-0.5" />
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onSelectPost(post)}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>

                    {/* Post Text Description */}
                    <div className="px-4 pb-3">
                      <p className="text-gray-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed line-clamp-5">
                        {post.copyCaption || post.idea}
                      </p>
                    </div>

                    {/* Post Media Rendering */}
                    <div className="cursor-pointer" onClick={() => onSelectPost(post)}>
                      {getPostMedia(post)}
                    </div>

                    {/* Engagement Counts Bar */}
                    <div className="px-4 py-2 border-b border-gray-100 flex justify-between text-[10px] text-gray-400">
                      <div className="flex items-center gap-1">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600">
                          <ThumbsUp size={10} fill="currentColor" />
                        </span>
                        <span>{likesCount} • {commentsCount} comentarios</span>
                      </div>
                      <div>
                        <span>{seed % 5} compartidos</span>
                      </div>
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
