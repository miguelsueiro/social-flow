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
import { collection, onSnapshot, query, orderBy, setDoc, doc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationItem {
  id: string;
  user: string;
  action: string;
  target: string;
  createdAt: Date;
  type: 'comment' | 'status' | 'create' | 'like' | 'mention';
  avatar: string;
}

export default function NotificationsStream() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const defaultNotifications: NotificationItem[] = [
      {
        id: '1',
        user: 'Carlos Díaz',
        action: 'escribió la versión final del copy para el post',
        target: 'Campaña Primavera 2026',
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
        type: 'comment',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80'
      },
      {
        id: '2',
        user: 'Laura Gómez',
        action: 'aprobó el diseño y movió a feedback de cliente el post',
        target: 'Sorteo Aniversario Instagram',
        createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
        type: 'status',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
      },
      {
        id: '3',
        user: 'Sofía Martínez',
        action: 'subió un nuevo archivo de diseño gráfico para',
        target: 'Post: Tutorial Reels 03',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        type: 'create',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
      },
      {
        id: '4',
        user: 'Ana Belén (Cliente)',
        action: 'aprobó definitivamente el post',
        target: 'Infografía Consejos de Negocio',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        type: 'status',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80'
      }
    ];

    const unsub = onSnapshot(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')), (snapshot) => {
      if (snapshot.empty) {
        // Seed default notifications
        defaultNotifications.forEach(async (notif) => {
          try {
            await setDoc(doc(db, 'notifications', notif.id), {
              ...notif,
              createdAt: notif.createdAt
            });
          } catch (e) {
            console.warn("Could not seed notification on cloud DB:", e);
          }
        });
        setNotifications(defaultNotifications);
      } else {
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
      }
      setLoading(false);
    }, (error) => {
      console.warn("Firestore error loading notifications, falling back to local activity feed:", error);
      setNotifications(defaultNotifications);
      setLoading(false);
    });

    return () => unsub();
  }, []);

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
