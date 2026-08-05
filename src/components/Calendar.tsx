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
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn, PHASES } from '../lib/utils';
import { motion } from 'motion/react';
import { PlatformBadge } from './SocialIcons';
import IconButton from './IconButton';
import { Post } from '../types';

interface CalendarProps {
  posts: Post[];
  onAddPost: (date: Date) => void;
  onSelectPost: (post: Post) => void;
  userRole: string;
  onUpdatePost: (postId: string, updates: any) => void;
  loading?: boolean;
}

export default function Calendar({ posts, onAddPost, onSelectPost, userRole, onUpdatePost, loading = false }: CalendarProps) {
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

  const monthHasPosts = posts.some(p => isSameMonth(p.date, monthStart));

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
          <IconButton icon={ChevronLeft} onClick={prevMonth} aria-label="Mes anterior" size="sm" className="border border-gray-200" />
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 text-sm font-medium hover:bg-gray-50 rounded-lg border border-gray-200"
          >
            Hoy
          </button>
          <IconButton icon={ChevronRight} onClick={nextMonth} aria-label="Mes siguiente" size="sm" className="border border-gray-200" />
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/40">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
          <div key={day} className="p-3 text-center text-xs font-semibold text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {!loading && !monthHasPosts && (
        <div className="px-4 py-2.5 bg-gray-50/60 border-b border-gray-100 text-xs text-gray-400 font-medium text-center">
          No hay posts programados en {format(currentMonth, 'MMMM yyyy')}.
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-7 auto-rows-[120px] md:auto-rows-[160px]" role="status" aria-label="Cargando calendario">
          {calendarDays.map((day) => (
            <div key={day.toISOString()} className="p-2 border-r border-b border-gray-50 flex flex-col gap-1.5">
              <div className="w-7 h-7 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-10 rounded-lg bg-gray-100 animate-pulse mt-1" />
            </div>
          ))}
        </div>
      ) : (
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
                isToday && "bg-app-accent-subtle/20",
                isDraggedOver && "ring-2 ring-dashed ring-app-accent bg-app-accent/5 z-10 scale-[0.98] shadow-inner"
              )}
            >
              <div className="flex justify-between items-start">
                <span className={cn(
                  "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                  isToday ? "bg-app-accent text-white shadow-sm" : "text-gray-500",
                  !isCurrentMonth && "text-gray-300"
                )}>
                  {format(day, 'd')}
                </span>
                
                {userRole !== 'client' && isCurrentMonth && (
                  // Visible on keyboard focus as well as hover — the original
                  // opacity-0/group-hover-only version was reachable by Tab but
                  // stayed invisible the whole time you were on it (WCAG 2.4.7).
                  <IconButton
                    icon={Plus}
                    onClick={() => onAddPost(day)}
                    aria-label="Añadir publicación"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                  />
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
                      onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, post.id)}
                      className={cn(
                        "w-full text-left p-1.5 rounded-lg border text-xs leading-tight transition-all hover:scale-[1.02] shadow-sm flex flex-col font-medium",
                        userRole !== 'client' ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                        phaseInfo.cardClass
                      )}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <PlatformBadge platform={post.platform} size={9} showLabel className="font-semibold opacity-75 tracking-normal truncate" />
                        {post.assigneeName && (
                          <span
                            className="w-3.5 h-3.5 rounded-full bg-white/70 flex items-center justify-center text-[11px] font-bold shrink-0"
                            title={post.assigneeName}
                          >
                            {post.assigneeName[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="font-bold truncate text-xs text-gray-900">{post.title || "Post sin título"}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
