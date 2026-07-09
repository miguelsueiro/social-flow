import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Instagram, Video } from 'lucide-react';
import { cn, PHASES, Phase } from '../lib/utils';
import { motion } from 'motion/react';

interface Post {
  id: string;
  date: Date;
  platform: 'instagram' | 'tiktok';
  phase: Phase;
  idea: string;
  title?: string;
}

interface CalendarProps {
  posts: Post[];
  onAddPost: (date: Date) => void;
  onSelectPost: (post: Post) => void;
  userRole: string;
  onUpdatePost: (postId: string, updates: any) => void;
}

export default function Calendar({ posts, onAddPost, onSelectPost, userRole, onUpdatePost }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggedOverDay, setDraggedOverDay] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleDragStart = (e: React.DragEvent, postId: string) => {
    e.dataTransfer.setData('text/plain', postId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dayStr: string) => {
    if (userRole === 'client') return;
    e.preventDefault();
    setDraggedOverDay(dayStr);
  };

  const handleDragLeave = () => {
    setDraggedOverDay(null);
  };

  const handleDrop = (e: React.DragEvent, targetDay: Date) => {
    if (userRole === 'client') return;
    e.preventDefault();
    setDraggedOverDay(null);
    const postId = e.dataTransfer.getData('text/plain');
    if (postId) {
      onUpdatePost(postId, { date: targetDay });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 capitalize">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 text-sm font-medium hover:bg-gray-50 rounded-lg border border-gray-200"
          >
            Hoy
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/40">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
          <div key={day} className="p-3 text-center text-xs font-semibold text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[120px] md:auto-rows-[160px]">
        {calendarDays.map((day, idx) => {
          const dayPosts = posts.filter(p => isSameDay(p.date, day));
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          const dayStr = day.toISOString();
          const isDraggedOver = draggedOverDay === dayStr;

          return (
            <div 
              key={dayStr} 
              onDragOver={(e) => handleDragOver(e, dayStr)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
              className={cn(
                "p-2 border-r border-b border-gray-50 flex flex-col gap-1 relative group transition-all duration-150",
                !isCurrentMonth && "bg-gray-50/50",
                isToday && "bg-blue-50/20",
                isDraggedOver && "ring-2 ring-dashed ring-app-accent bg-app-accent/5 z-10 scale-[0.98] shadow-inner"
              )}
            >
              <div className="flex justify-between items-start">
                <span className={cn(
                  "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                  isToday ? "bg-blue-600 text-white shadow-sm" : "text-gray-500",
                  !isCurrentMonth && "text-gray-300"
                )}>
                  {format(day, 'd')}
                </span>
                
                {userRole !== 'client' && isCurrentMonth && (
                  <button 
                    onClick={() => onAddPost(day)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded text-gray-400 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 mt-1 scrollbar-hide">
                {dayPosts.map(post => {
                  const phaseInfo = PHASES[post.phase];
                  const isVisibleForClient = userRole !== 'client' || phaseInfo.clientVisible;

                  if (!isVisibleForClient) return null;

                  return (
                    <motion.button
                      layoutId={post.id}
                      key={post.id}
                      onClick={() => onSelectPost(post)}
                      draggable={userRole !== 'client'}
                      onDragStart={(e) => handleDragStart(e, post.id)}
                      className={cn(
                        "w-full text-left p-1.5 rounded-lg border text-xs leading-tight transition-all hover:scale-[1.02] shadow-sm flex flex-col font-medium",
                        userRole !== 'client' ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                        post.phase === 'idea_1' && "bg-slate-100/90 border-slate-200/80 text-slate-700",
                        post.phase === 'idea_2' && "bg-sky-100/90 border-sky-200/80 text-sky-800",
                        post.phase === 'copy' && "bg-purple-100/90 border-purple-200/80 text-purple-800",
                        post.phase === 'design' && "bg-amber-100/90 border-amber-200/80 text-amber-800",
                        post.phase === 'client_review' && "bg-rose-100/90 border-rose-200/80 text-rose-800",
                        post.phase === 'approved' && "bg-emerald-100/90 border-emerald-200/80 text-emerald-800",
                        post.phase === 'published' && "bg-indigo-100/90 border-indigo-200/80 text-indigo-800"
                      )}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        {post.platform === 'instagram' ? <Instagram size={9} /> : <Video size={9} />}
                        <span className="font-semibold capitalize opacity-75 tracking-normal truncate">{post.platform}</span>
                      </div>
                      <p className="font-bold truncate text-[11px] text-gray-900">{post.title || "Post sin título"}</p>
                      <p className="line-clamp-1 opacity-75 text-[10px] leading-tight text-gray-500 mt-0.5">{post.idea}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
