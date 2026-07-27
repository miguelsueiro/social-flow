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
import { Role } from '../lib/utils';

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
}

export default function NotificationsStream({ userRole, userProjectId, permittedProjects }: NotificationsStreamProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        return <RefreshCw size={14} className="text-gray-600" />;
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

  return (
    <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between">
        <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
          <Bell size={18} className="text-blue-600 animate-pulse" />
          Historial de Notificaciones y Actividad
        </h3>
        <span className="text-[10px] bg-indigo-50 text-indigo-600 font-extrabold px-2.5 py-0.5 rounded-full uppercase">
          En Vivo
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <Bell size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-bold text-sm">No hay actividad reciente</p>
            <p className="text-xs">Las alertas automáticas y menciones aparecerán aquí en vivo.</p>
          </div>
        ) : (
          notifications.map((notif, i) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4) }}
              key={notif.id}
              className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              {/* User Avatar with Type overlay */}
              <div className="relative shrink-0">
                <img 
                  src={notif.avatar} 
                  alt={notif.user} 
                  className="w-10 h-10 rounded-full border border-gray-100 object-cover shadow-sm"
                />
                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white shadow-sm ${getBg(notif.type)}`}>
                  {getIcon(notif.type)}
                </div>
              </div>

              {/* Notification Text */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-900">{notif.user}</span>
                  <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 shrink-0">
                    <Clock size={10} />
                    {formatNotificationTime(notif.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 font-medium leading-relaxed">
                  {notif.action} <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">"{notif.target}"</span>
                </p>
              </div>

              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
