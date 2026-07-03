import React from 'react';
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

interface NotificationItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'comment' | 'status' | 'create' | 'like';
  avatar: string;
}

export default function NotificationsStream() {
  const notifications: NotificationItem[] = [
    {
      id: '1',
      user: 'Carlos Díaz',
      action: 'escribió la versión final del copy para el post',
      target: 'Campaña Primavera 2026',
      time: 'Hace 5 min',
      type: 'comment',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: '2',
      user: 'Laura Gómez',
      action: 'aprobó el diseño y movió a feedback de cliente el post',
      target: 'Sorteo Aniversario Instagram',
      time: 'Hace 45 min',
      type: 'status',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: '3',
      user: 'Sofía Martínez',
      action: 'subió un nuevo archivo de diseño gráfico para',
      target: 'Post: Tutorial Reels 03',
      time: 'Hace 2 horas',
      type: 'create',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: '4',
      user: 'Ana Belén (Cliente)',
      action: 'aprobó definitivamente el post',
      target: 'Infografía Consejos de Negocio',
      time: 'Hace 3 horas',
      type: 'status',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: '5',
      user: 'Lucas Rossi',
      action: 'escribió un comentario: "Quedó perfecto el ajuste de color..." en',
      target: 'Post: Presentación del Equipo',
      time: 'Hace 1 día',
      type: 'comment',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: '6',
      user: 'Miguel Sueiro',
      action: 'creó una idea inicial en el calendario para el post',
      target: 'Reel: Un día en las oficinas',
      time: 'Hace 2 días',
      type: 'create',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare size={14} className="text-blue-600" />;
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
      case 'status':
        return 'bg-emerald-50';
      case 'create':
        return 'bg-indigo-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between">
        <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
          <Bell size={18} className="text-blue-600" />
          Historial de Notificaciones y Actividad
        </h3>
        <span className="text-[10px] bg-indigo-50 text-indigo-600 font-extrabold px-2.5 py-0.5 rounded-full uppercase">
          En Vivo
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-4 space-y-2">
        {notifications.map((notif, i) => (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
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
                  {notif.time}
                </span>
              </div>
              <p className="text-xs text-gray-600 font-medium leading-relaxed">
                {notif.action} <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">"{notif.target}"</span>
              </p>
            </div>

            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
