import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, 
  MessageSquare, 
  RefreshCw, 
  CheckCircle, 
  FileText, 
  Clock, 
  User,
  Heart,
  ChevronRight
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Role, cn } from '../lib/utils';
import Avatar from './Avatar';
import EmptyState from './EmptyState';

interface NotificationItem {
  id: string;
  user: string;
  action: string;
  target: string;
  createdAt: Date;
  type: 'comment' | 'status' | 'create' | 'like' | 'mention';
  avatar: string;
}

interface NotificationsStreamProps {
  userRole: Role;
  userProjectId: string | null;
  permittedProjects: string[];
  /** Caps how many items render — used by the Dashboard's "Actividad reciente"
   *  preview, which shares this same stream instead of duplicating the query. */
  limit?: number;
  onSeeAll?: () => void;
}

export default function NotificationsStream({ userRole, userProjectId, permittedProjects, limit, onSeeAll }: NotificationsStreamProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Scope to what this user is actually allowed to see: a client only their own
    // project's activity, an agency member with restricted access only their
    // permitted projects. Unrestricted agency members (empty permittedProjects,
    // same default as everywhere else) and admins see the full stream.
    const base = collection(db, 'notifications');
    const q = userRole === 'client'
      ? query(base, where('projectId', '==', userProjectId || 'none'), orderBy('createdAt', 'desc'))
      : permittedProjects.length > 0
        ? query(base, where('projectId', 'in', permittedProjects.slice(0, 30)), orderBy('createdAt', 'desc'))
        : query(base, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          user: data.user || 'Sistema',
          action: data.action || 'realizó una acción',
          target: data.target || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          type: data.type || 'status',
          avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user || 'Sistema')}`
        };
      }));
      setLoading(false);
    }, (error) => {
      console.warn("Firestore error loading notifications:", error);
      setNotifications([]);
      setLoading(false);
    });

    return () => unsub();
  }, [userRole, userProjectId, permittedProjects]);

  // Drives the visually-hidden aria-live region below — the "En Vivo" badge in
  // the header promises real-time updates, but new items arriving via
  // onSnapshot were silent to screen readers (nothing here used aria-live).
  // Keyed off the newest item's id specifically, not `notifications` as a
  // whole, so this fires once per genuinely new notification rather than on
  // every snapshot (e.g. a `done` toggle elsewhere touching an unrelated doc).
  const latestId = notifications[0]?.id;
  useEffect(() => {
    if (!latestId) return;
    const latest = notifications[0];
    setAnnouncement(`${latest.user} ${latest.action}${latest.target ? `: ${latest.target}` : ''}`);
  }, [latestId]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare size={14} className="text-blue-600" />;
      case 'mention':
        return <Bell size={14} className="text-amber-600 animate-bounce" />;
      case 'status':
        return <CheckCircle size={14} className="text-emerald-600" />;
      case 'create':
        return <FileText size={14} className="text-indigo-600" />;
      default:
        return <RefreshCw size={14} className="text-ink-secondary" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'comment':
        return 'bg-blue-50';
      case 'mention':
        return 'bg-amber-50';
      case 'status':
        return 'bg-emerald-50';
      case 'create':
        return 'bg-indigo-50';
      default:
        return 'bg-gray-50';
    }
  };

  const formatNotificationTime = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch (e) {
      return 'Hace un momento';
    }
  };

  const visibleNotifications = limit ? notifications.slice(0, limit) : notifications;

  return (
    <div className="flex-1 bg-white rounded-3xl border border-divider shadow-sm overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
      <div aria-live="polite" className="sr-only">{announcement}</div>
      <div className="p-6 border-b border-divider flex items-center justify-between">
        <h3 className="font-extrabold text-ink text-base flex items-center gap-2">
          <Bell size={18} className="text-app-accent animate-pulse" />
          {limit ? 'Actividad reciente' : 'Historial de Notificaciones y Actividad'}
        </h3>
        {limit && onSeeAll ? (
          <button onClick={onSeeAll} className="text-caption font-bold text-app-accent hover:text-app-accent-hover transition-colors">
            Ver todo →
          </button>
        ) : (
          <span className="text-[11px] bg-app-accent-subtle text-app-accent font-extrabold px-2.5 py-0.5 rounded-full uppercase">
            En Vivo
          </span>
        )}
      </div>

      <div className={cn("flex-1 divide-y divide-gray-100 p-4 space-y-2", !limit && "overflow-y-auto")}>
        {loading ? (
          <div className="flex justify-center items-center py-20" role="status" aria-label="Cargando notificaciones">
            <div className="w-8 h-8 bg-app-accent/20 rounded-xl animate-pulse"></div>
          </div>
        ) : visibleNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No hay actividad reciente"
            description="Las alertas automáticas y menciones aparecerán aquí en vivo."
            size={limit ? 'sm' : 'lg'}
          />
        ) : (
          visibleNotifications.map((notif, i) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4) }}
              key={notif.id}
              className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              {/* User Avatar with Type overlay */}
              <div className="relative shrink-0">
                <Avatar name={notif.user} src={notif.avatar} className="shadow-sm" />
                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white shadow-sm ${getBg(notif.type)}`}>
                  {getIcon(notif.type)}
                </div>
              </div>

              {/* Notification Text */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink">{notif.user}</span>
                  <span className="text-caption text-ink-muted flex items-center gap-1 shrink-0">
                    <Clock size={10} />
                    {formatNotificationTime(notif.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-ink-secondary font-medium leading-relaxed">
                  {notif.action} <span className="font-bold text-ink group-hover:text-app-accent transition-colors">"{notif.target}"</span>
                </p>
              </div>

              <ChevronRight size={14} className="text-ink-muted group-hover:text-ink-muted group-hover:translate-x-0.5 transition-all self-center shrink-0" />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
