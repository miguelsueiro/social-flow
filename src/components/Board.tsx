import React from 'react';
import { PHASES, Phase, cn, isVideoUrl } from '../lib/utils';
import { motion } from 'motion/react';
import { Clock, MessageSquare, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { InstagramIcon, TikTokIcon, LinkedInIcon } from './SocialIcons';

interface Post {
  id: string;
  date: Date;
  platform: 'instagram' | 'tiktok' | 'linkedin';
  phase: Phase;
  idea: string;
  title?: string;
  currentDesignUrl?: string;
  carouselUrls?: string[];
}

interface BoardProps {
  posts: Post[];
  onSelectPost: (post: Post) => void;
  onUpdatePost: (postId: string, updates: any) => void;
  userRole: string;
}

export default function Board({ posts, onSelectPost, onUpdatePost, userRole }: BoardProps) {
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
  
  // Filter phases for clients: only Fase 4 and Fase 5
  const visiblePhases = phaseKeys.filter(phase => {
    if (userRole === 'client') {
      return phase === 'client_review' || phase === 'approved';
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
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  phase === 'idea_1' && "bg-slate-400",
                  phase === 'copy' && "bg-purple-400",
                  phase === 'design' && "bg-amber-400",
                  phase === 'client_review' && "bg-rose-400",
                  phase === 'approved' && "bg-emerald-400",
                  phase === 'published' && "bg-indigo-400"
                )} />
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
                  ? "bg-blue-50/70 border-solid border-blue-300 shadow-inner" 
                  : "bg-gray-100/50 border-dashed border-gray-200"
              )}
            >
              {phasePosts.map((post) => (
                <motion.div
                  layoutId={post.id}
                  key={post.id}
                  draggable={userRole !== 'client'}
                  onDragStart={(e) => handleDragStart(e, post)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectPost(post)}
                  className={cn(
                    "p-3 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group",
                    userRole !== 'client' ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                    post.phase === 'idea_1' && "bg-slate-50/95 border-slate-200/60 text-slate-800",
                    post.phase === 'idea_2' && "bg-sky-50/95 border-sky-200/60 text-sky-800",
                    post.phase === 'copy' && "bg-purple-50/95 border-purple-200/60 text-purple-800",
                    post.phase === 'design' && "bg-amber-50/95 border-amber-200/60 text-amber-800",
                    post.phase === 'client_review' && "bg-rose-50/95 border-rose-200/60 text-rose-800",
                    post.phase === 'approved' && "bg-emerald-50/95 border-emerald-200/60 text-emerald-800",
                    post.phase === 'published' && "bg-indigo-50/95 border-indigo-200/60 text-indigo-800"
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
                          {post.platform === 'instagram' && <InstagramIcon size={12} className="text-[#E1306C] shrink-0" />}
                          {post.platform === 'linkedin' && <LinkedInIcon size={12} className="text-[#0A66C2] shrink-0" />}
                          {post.platform === 'tiktok' && <TikTokIcon size={12} className="text-zinc-900 shrink-0" />}
                          <span className="text-[9px] font-extrabold text-gray-500 uppercase truncate tracking-wider">{post.platform}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400 shrink-0">{format(post.date, 'dd MMM')}</span>
                      </div>
                      
                      <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 line-clamp-1 leading-tight mb-0.5">
                        {post.title || "Post sin título"}
                      </h4>
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-snug">
                        {post.idea}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-gray-200/40">
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-500 transition-colors">
                        <MessageSquare size={11} />
                        Detalles
                      </div>
                      <div className="p-1 rounded bg-gray-50 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
