import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Grid, 
  Tv, 
  BookOpen, 
  Heart, 
  MessageCircle, 
  Camera, 
  CheckCircle, 
  Layers,
  Sparkles,
  Smartphone,
  Eye,
  Info,
  Layers as CarouselIcon,
  Video as VideoIcon
} from 'lucide-react';
import { cn, PHASES, Phase } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import InstagramDetailModal from './InstagramDetailModal';

interface Post {
  id: string;
  date: Date;
  platform: 'instagram' | 'tiktok';
  phase: Phase;
  idea: string;
  format?: 'estatico' | 'reel' | 'carrusel';
  carouselUrls?: string[];
  references?: string[];
  copyCreativity?: string;
  copyCaption?: string;
  currentDesignUrl?: string;
}

interface InstagramFeedProps {
  posts: Post[];
  onSelectPost: (post: Post) => void;
  userRole: string;
}

export default function InstagramFeed({ posts, onSelectPost, userRole }: InstagramFeedProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
  const [showDeviceFrame, setShowDeviceFrame] = useState(true);
  const [filterPhase, setFilterPhase] = useState<'all' | 'approved_only'>('all');
  const [selectedIgPost, setSelectedIgPost] = useState<any | null>(null);
  const [igComments, setIgComments] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedIgPost) {
      setIgComments([]);
      return;
    }

    const q = query(
      collection(db, `posts/${selectedIgPost.id}/comments`),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setIgComments(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date()
      })));
    }, (err) => {
      console.error("Error loading IG comments:", err);
    });

    return () => unsub();
  }, [selectedIgPost]);

  const handleAddIgComment = async (text: string) => {
    if (!selectedIgPost) return;
    try {
      const currentUser = auth.currentUser;
      await addDoc(collection(db, `posts/${selectedIgPost.id}/comments`), {
        text,
        authorId: currentUser?.uid || 'anonymous',
        authorName: currentUser?.displayName || 'Usuario',
        roleAtTime: userRole,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error adding IG comment:", err);
    }
  };

  // Filter for Instagram platform posts
  const instagramPosts = posts.filter(p => p.platform === 'instagram');
  
  // Apply optional phase filter (clients may only see approved/published, but let team preview draft state too)
  const visiblePosts = instagramPosts.filter(p => {
    // Role level check
    const isVisibleForRole = userRole !== 'client' || PHASES[p.phase].clientVisible;
    if (!isVisibleForRole) return false;

    if (filterPhase === 'approved_only') {
      return p.phase === 'approved' || p.phase === 'published';
    }
    return true;
  });

  const feedPosts = visiblePosts.filter(p => {
    if (activeTab === 'posts') return true; // Show all in general grid
    // For reels tab, show posts that have "video" or "reel" keywords, or just everything for demo
    return p.idea.toLowerCase().includes('video') || p.idea.toLowerCase().includes('reels') || p.idea.toLowerCase().includes('reel');
  });

  // Helper to generate a reliable elegant background or use design URL
  const getPostMedia = (post: Post) => {
    if (post.currentDesignUrl) {
      return (
        <img 
          src={post.currentDesignUrl} 
          alt={post.idea} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
      );
    }

    // Elegant gradient matching the phase
    const gradients = [
      'from-indigo-500 via-purple-500 to-pink-500',
      'from-pink-500 via-red-500 to-yellow-500',
      'from-blue-600 via-indigo-500 to-purple-600',
      'from-teal-400 via-blue-500 to-indigo-600',
      'from-emerald-400 to-teal-600',
      'from-amber-400 to-orange-600'
    ];
    
    // Choose gradient pseudo-randomly based on post ID
    const charSum = post.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradient = gradients[charSum % gradients.length];

    return (
      <div className={cn("w-full h-full bg-gradient-to-tr flex flex-col justify-between p-4 text-white relative", gradient)}>
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
        
        <div className="relative z-10 flex justify-between items-start">
          <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-semibold">
            {PHASES[post.phase].label.split(':')[0]}
          </span>
          <div className="w-6 h-6 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Sparkles size={11} className="text-white animate-pulse" />
          </div>
        </div>

        <div className="relative z-10 space-y-1.5">
          <p className="text-xs font-medium leading-snug line-clamp-3 text-white drop-shadow-md">
            {post.idea}
          </p>
          <p className="text-[9px] text-white/85 font-normal line-clamp-2 drop-shadow-sm italic">
            {post.copyCaption || 'Diseño de copy en producción...'}
          </p>
        </div>

        {/* Decorative corner wireframes */}
        <div className="absolute bottom-2 right-2 opacity-30">
          <Layers size={14} className="text-white" />
        </div>
      </div>
    );
  };

  // Profile Mock Stats
  const postsCount = instagramPosts.length;
  const approvedCount = instagramPosts.filter(p => p.phase === 'approved' || p.phase === 'published').length;

  const renderProfileHeader = () => (
    <div className="border-b border-gray-100 pb-8 mb-6">
      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
        {/* Profile Pic */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[3px] shadow-md">
            <div className="w-full h-full bg-white rounded-full p-[2px]">
              <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80" 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          <span className="absolute bottom-1 right-1 bg-blue-500 text-white p-0.5 rounded-full border-2 border-white">
            <CheckCircle size={12} fill="currentColor" className="text-white" />
          </span>
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center md:text-left space-y-3.5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center md:justify-start">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-1.5 justify-center sm:justify-start">
              socialflow_agency
              <span className="inline-block w-4 h-4 bg-blue-500 rounded-full text-white flex items-center justify-center p-0.5 text-[8px] font-bold">✓</span>
            </h2>
            <div className="flex justify-center gap-2">
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all">
                Editar Perfil
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-all shadow-sm">
                Seguir
              </button>
            </div>
          </div>

          {/* Stats count */}
          <div className="flex justify-center md:justify-start gap-6 text-sm">
            <div>
              <span className="font-semibold text-gray-900">{postsCount}</span> <span className="text-gray-500">publicaciones</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">14.8k</span> <span className="text-gray-500">seguidores</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">421</span> <span className="text-gray-500">seguidos</span>
            </div>
          </div>

          {/* Bio */}
          <div className="text-xs text-gray-700 space-y-1">
            <p className="font-semibold text-gray-900">SocialFlow Hub</p>
            <p className="text-gray-500">
              ✨ Planificación de parrilla en tiempo real. Revisa la estética de tu feed antes de publicar.
            </p>
            <div className="flex items-center gap-1 text-blue-600 font-semibold justify-center md:justify-start mt-1">
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                Aprobados: {approvedCount}/{postsCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGridContent = () => {
    if (feedPosts.length === 0) {
      return (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <Camera size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-600">No hay posts para esta vista</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            Crea nuevos posts con plataforma "instagram" en el calendario para verlos en esta parrilla.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-1 md:gap-4">
        {feedPosts.map((post) => {
          // Fake mock comments and likes count based on ID
          const seed = post.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const likes = (seed % 150) + 10;
          const commentsCount = (seed % 25) + 2;

          return (
            <motion.div
              layoutId={`feed-${post.id}`}
              key={post.id}
              onClick={() => setSelectedIgPost(post)}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer border border-gray-100 shadow-sm transition-all"
              whileHover={{ scale: 1.01 }}
            >
              {getPostMedia(post)}

              {/* Hover overlay with IG engagement numbers */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 md:gap-6 text-white text-xs md:text-sm font-extrabold z-20">
                <span className="flex items-center gap-1.5 hover:scale-110 transition-transform">
                  <Heart size={16} fill="currentColor" />
                  {likes}
                </span>
                <span className="flex items-center gap-1.5 hover:scale-110 transition-transform">
                  <MessageCircle size={16} fill="currentColor" />
                  {commentsCount}
                </span>
                <span className="absolute bottom-2 left-2 right-2 text-center text-[8px] bg-black/40 backdrop-blur-md py-1 rounded text-white/90 uppercase tracking-wider line-clamp-1 border border-white/10">
                  {PHASES[post.phase].label.split(':')[1] || PHASES[post.phase].label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
      
      {/* Settings / Controls Sidebar Panel */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Smartphone size={16} className="text-blue-600" />
              Vista Instagram
            </h3>
            <span className="bg-pink-50 text-pink-600 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase">
              Mockup Feed
            </span>
          </div>
          
          <p className="text-xs text-gray-500 leading-relaxed">
            Esta vista simula cómo quedará la cuadrícula visual de tu cuenta de Instagram. Ideal para que tu cliente valide la estética general y la paleta de color.
          </p>

          <hr className="border-gray-100" />

          {/* Toggle Mobile Frame */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-600">Simulador de Móvil</span>
            <button 
              onClick={() => setShowDeviceFrame(!showDeviceFrame)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                showDeviceFrame ? "bg-blue-600" : "bg-gray-200"
              )}
            >
              <span className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                showDeviceFrame ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
          </div>

          {/* Filter Phases */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Fases Incluidas</label>
            <div className="grid grid-cols-2 gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setFilterPhase('all')}
                className={cn(
                  "py-1.5 text-[10px] font-bold rounded-lg transition-all",
                  filterPhase === 'all' ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterPhase('approved_only')}
                className={cn(
                  "py-1.5 text-[10px] font-bold rounded-lg transition-all",
                  filterPhase === 'approved_only' ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                Aprobados / Publ.
              </button>
            </div>
          </div>
        </div>

        {/* Tip banner */}
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 text-xs text-blue-700 leading-normal">
          <Info size={16} className="shrink-0 mt-0.5 text-blue-600" />
          <p>
            <strong>Tip de Agencia:</strong> Haz clic en cualquier post dentro de la parrilla para ver el modal con la versión actual del copy y del diseño, dejar feedback o cambiar el estado directamente.
          </p>
        </div>
      </div>

      {/* Main Feed Display Area */}
      <div className="flex-1 overflow-y-auto pr-1">
        {showDeviceFrame ? (
          /* Mobile Mockup Frame wrapper */
          <div className="max-w-[420px] mx-auto bg-gray-900 p-4 rounded-[3rem] shadow-2xl border-4 border-gray-800 relative">
            {/* Speaker & Camera notches */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-gray-900 rounded-b-2xl z-30 flex items-center justify-center gap-2">
              <div className="w-12 h-1 bg-gray-800 rounded-full" />
              <div className="w-2.5 h-2.5 bg-gray-800 rounded-full" />
            </div>

            {/* Simulated Phone Screen */}
            <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-950/20 pt-4 pb-2 min-h-[640px] flex flex-col">
              {/* Phone Status bar */}
              <div className="flex justify-between items-center px-6 text-[10px] font-bold text-gray-500 select-none">
                <span>09:41</span>
                <div className="flex items-center gap-1">
                  <span>5G</span>
                  <div className="w-5 h-2.5 bg-gray-400 rounded-sm" />
                </div>
              </div>

              {/* Instagram App Top Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                <span className="font-extrabold text-sm tracking-tight text-gray-900">socialflow_agency</span>
                <span className="text-gray-400">•</span>
              </div>

              {/* Profile Contents */}
              <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide text-xs">
                {renderProfileHeader()}

                {/* Simulated Tab Bar */}
                <div className="flex border-b border-gray-100 mb-4">
                  <button 
                    onClick={() => setActiveTab('posts')}
                    className={cn(
                      "flex-1 flex justify-center py-2 border-b-2 text-xs font-bold transition-all gap-1.5",
                      activeTab === 'posts' ? "border-black text-black" : "border-transparent text-gray-400"
                    )}
                  >
                    <Grid size={16} />
                    <span>Posteos</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('reels')}
                    className={cn(
                      "flex-1 flex justify-center py-2 border-b-2 text-xs font-bold transition-all gap-1.5",
                      activeTab === 'reels' ? "border-black text-black" : "border-transparent text-gray-400"
                    )}
                  >
                    <Tv size={16} />
                    <span>Reels</span>
                  </button>
                </div>

                {renderGridContent()}
              </div>
            </div>
          </div>
        ) : (
          /* Normal Expanded Web Layout */
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
            {renderProfileHeader()}

            {/* Normal Web Tab Bar */}
            <div className="flex justify-center border-t border-gray-100 gap-12 mb-6">
              <button 
                onClick={() => setActiveTab('posts')}
                className={cn(
                  "flex items-center gap-2 py-3 border-t-2 text-xs font-bold uppercase tracking-widest transition-all",
                  activeTab === 'posts' ? "border-black text-black" : "border-transparent text-gray-400"
                )}
              >
                <Grid size={14} />
                Publicaciones
              </button>
              <button 
                onClick={() => setActiveTab('reels')}
                className={cn(
                  "flex items-center gap-2 py-3 border-t-2 text-xs font-bold uppercase tracking-widest transition-all",
                  activeTab === 'reels' ? "border-black text-black" : "border-transparent text-gray-400"
                )}
              >
                <Tv size={14} />
                Reels / Videos
              </button>
            </div>

            {renderGridContent()}
          </div>
        )}
      </div>

      {selectedIgPost && (
        <InstagramDetailModal
          post={selectedIgPost}
          comments={igComments}
          onAddComment={handleAddIgComment}
          onClose={() => setSelectedIgPost(null)}
          userRole={userRole}
          onOpenEdit={() => onSelectPost(selectedIgPost)}
        />
      )}
    </div>
  );
}
