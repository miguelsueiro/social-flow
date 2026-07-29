import React from 'react';
import { PHASES, Phase, cn, isVideoUrl } from '../lib/utils';
import { motion } from 'motion/react';
import { Clock, MessageSquare, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { PlatformBadge, SocialPlatform } from './SocialIcons';

interface Post {
  id: string;
  date: Date;
  platform: SocialPlatform;
  phase: Phase;
  idea: string;
  title?: string;
  currentDesignUrl?: string;
  carouselUrls?: string[];
  assigneeName?: string;
}

interface BoardProps {
  posts: Post[];
  onSelectPost: (post: Post) => void;
  onUpdatePost: (postId: string, updates: any) => void;
  userRole: string;
  loading?: boolean;
}

export default function Board({ posts, onSelectPost, onUpdatePost, userRole, loading = false }: BoardProps) {
  const phaseKeys = (Object.keys(PHASES) as Phase[]).filter(p => p !== 'idea_2');
  const [draggedPost, setDraggedPost] = React.useState<Post | null>(null);
  const [activeDropColumn, setActiveDropColumn] = React.useState<Phase | null>(null);

  const handleDragStart = (e: React.DragEvent, post: Post) => {
    if (userRole === 'client') {
      e.preventDefault();
      return;
    }
    setDraggedPost(post);
    e.dataTransfer.setData('text/plain', post.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedPost(null);
    setActiveDropColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, phase: Phase) => {
    e.preventDefault();
    if (userRole === 'client') return;
    setActiveDropColumn(phase);
  };

  const handleDragLeave = () => {
    setActiveDropColumn(null);
  };

  const handleDrop = (e: React.DragEvent, phase: Phase) => {
    e.preventDefault();
    setActiveDropColumn(null);
    if (userRole === 'client' || !draggedPost) return;
    
    if (draggedPost.phase !== phase) {
      onUpdatePost(draggedPost.id, { phase });
    }
  };
  
  // Filter phases for clients: only the phases they actually interact with
  const visiblePhases = phaseKeys.filter(phase => {
    if (userRole === 'client') {
      return phase === 'client_review' || phase === 'changes_requested' || phase === 'approved';
    }
    return true;
  });

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 pt-2 min-h-[calc(100vh-250px)] w-full">
      {visiblePhases.map((phase) => {
        const phaseInfo = PHASES[phase];
        const phasePosts = posts.filter(p => p.phase === phase);

        return (
          <div key={phase} className="flex-shrink-0 w-80 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", phaseInfo.dotColor)} />
                <h3 className="font-semibold text-gray-700 text-sm">{phaseInfo.label}</h3>
              </div>
              <span className="bg-gray-200 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">
                {phasePosts.length}
              </span>
            </div>

            <div 
              onDragOver={(e) => handleDragOver(e, phase)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, phase)}
              className={cn(
                "flex-1 rounded-2xl p-3 space-y-3 min-h-[200px] border transition-all duration-200",
                activeDropColumn === phase 
                  ? "bg-app-accent-subtle/70 border-solid border-app-accent/40 shadow-inner" 
                  : "bg-gray-100/50 border-dashed border-gray-200"
              )}
            >
              {loading ? (
                <div className="space-y-3" role="status" aria-label="Cargando tablero">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-24 rounded-xl bg-gray-200/60 animate-pulse" />
                  ))}
                </div>
              ) : (
              <>
              {phasePosts.map((post) => (
                <motion.div
                  layoutId={post.id}
                  key={post.id}
                  draggable={userRole !== 'client'}
                  onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, post)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectPost(post)}
                  className={cn(
                    "p-3 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group",
                    userRole !== 'client' ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                    PHASES[post.phase].cardClass
                  )}
                  whileHover={{ y: -2 }}
                >
                  <div className="flex gap-3 items-start mb-2.5">
                    {/* Miniature Design Thumbnail Preview */}
                    <div className="w-14 h-14 rounded-lg bg-gray-200/80 border border-gray-300/30 overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm">
                      {post.currentDesignUrl ? (
                        isVideoUrl(post.currentDesignUrl) ? (
                          <video 
                            src={post.currentDesignUrl} 
                            className="w-full h-full object-cover animate-fade-in" 
                            muted
                            playsInline
                          />
                        ) : (
                          <img 
                            src={post.currentDesignUrl} 
                            className="w-full h-full object-cover animate-fade-in" 
                            alt="preview"
                            referrerPolicy="no-referrer"
                          />
                        )
                      ) : post.carouselUrls && post.carouselUrls.length > 0 ? (
                        isVideoUrl(post.carouselUrls[0]) ? (
                          <video 
                            src={post.carouselUrls[0]} 
                            className="w-full h-full object-cover animate-fade-in" 
                            muted
                            playsInline
                          />
                        ) : (
                          <img 
                            src={post.carouselUrls[0]} 
                            className="w-full h-full object-cover animate-fade-in" 
                            alt="preview"
                            referrerPolicy="no-referrer"
                          />
                        )
                      ) : (
                        <span className="text-base opacity-75">🎨</span>
                      )}
                    </div>

                    {/* Card details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <PlatformBadge platform={post.platform} size={12} showLabel className="text-[11px] font-extrabold text-gray-500 uppercase truncate tracking-wider" />
                        </div>
                        <span className="text-[11px] font-semibold text-gray-400 shrink-0">{format(post.date, 'dd MMM')}</span>
                      </div>
                      
                      <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 line-clamp-1 leading-tight mb-0.5">
                        {post.title || "Post sin título"}
                      </h4>
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-snug">
                        {post.idea}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/40">
                    {post.assigneeName ? (
                      <div
                        className="w-5 h-5 rounded-full bg-app-accent/10 text-app-accent flex items-center justify-center text-[11px] font-bold shrink-0"
                        title={post.assigneeName}
                      >
                        {post.assigneeName[0].toUpperCase()}
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-300 font-semibold">Sin asignar</span>
                    )}
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="flex items-center gap-0.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-500 transition-colors">
                        <MessageSquare size={11} />
                        Detalles
                      </div>
                      <div className="p-1 rounded bg-gray-50 group-hover:bg-app-accent-subtle group-hover:text-app-accent transition-colors">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {phasePosts.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 py-10">
                  <Clock size={32} strokeWidth={1} className="mb-2 opacity-50" />
                  <p className="text-xs font-medium text-gray-400">Sin contenido</p>
                </div>
              )}
              </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
