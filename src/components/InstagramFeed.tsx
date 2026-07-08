import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Grid, 
  Tv, 
  Heart, 
  MessageCircle, 
  Camera, 
  CheckCircle, 
  Layers,
  Sparkles,
  Smartphone,
  Info,
  Edit2,
  Upload
} from 'lucide-react';
import { cn, PHASES, Phase } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import InstagramDetailModal from './InstagramDetailModal';
import { toast } from 'react-hot-toast';

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
  const [isPersonalizerExpanded, setIsPersonalizerExpanded] = useState(false);
  const [filterPhase, setFilterPhase] = useState<'all' | 'approved_only'>('all');
  const [selectedIgPost, setSelectedIgPost] = useState<any | null>(null);
  const [igComments, setIgComments] = useState<any[]>([]);

  // Customizable IG profile states
  const [profileUsername, setProfileUsername] = useState(() => localStorage.getItem('ig_profile_username') || 'socialflow_agency');
  const [profileBio, setProfileBio] = useState(() => localStorage.getItem('ig_profile_bio') || '✨ Planificación de parrilla en tiempo real. Revisa la estética de tu feed antes de publicar.');
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('ig_profile_image') || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80');

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

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setProfileImage(base64);
        localStorage.setItem('ig_profile_image', base64);
        toast.success('Foto de perfil de mockup actualizada');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUsernameChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setProfileUsername(sanitized);
    localStorage.setItem('ig_profile_username', sanitized);
  };

  const handleBioChange = (val: string) => {
    setProfileBio(val);
    localStorage.setItem('ig_profile_bio', val);
  };

  // Filter for Instagram platform posts
  const instagramPosts = posts.filter(p => p.platform === 'instagram');
  
  // Apply optional phase filter (clients may only see approved/published)
  const visiblePosts = instagramPosts.filter(p => {
    const isVisibleForRole = userRole !== 'client' || PHASES[p.phase].clientVisible;
    if (!isVisibleForRole) return false;

    if (filterPhase === 'approved_only') {
      return p.phase === 'approved' || p.phase === 'published';
    }
    return true;
  });

  const feedPosts = visiblePosts.filter(p => {
    if (activeTab === 'posts') return true;
    return p.idea.toLowerCase().includes('video') || p.idea.toLowerCase().includes('reels') || p.idea.toLowerCase().includes('reel');
  });

  // Helper to generate a clean gradient background or show the design URL (no technical info overlays!)
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

    // Elegant neutral/gradient matching the aspect-ratio
    const gradients = [
      'from-neutral-800 to-stone-950',
      'from-zinc-900 to-neutral-950',
      'from-stone-850 to-zinc-950',
      'from-neutral-900 to-stone-900'
    ];
    
    const charSum = post.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradient = gradients[charSum % gradients.length];

    return (
      <div className={cn("w-full h-full bg-gradient-to-tr flex flex-col justify-center items-center p-4 text-center text-white relative", gradient)}>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
        
        <div className="relative z-10 space-y-1">
          <p className="text-[10px] font-black uppercase text-app-accent tracking-widest">{post.format || 'Estático'}</p>
          <p className="text-xs font-semibold leading-normal line-clamp-4 text-white/95 px-2 drop-shadow-md">
            {post.idea}
          </p>
        </div>

        {/* Subtle format icon */}
        <div className="absolute bottom-2 right-2 opacity-35">
          <Layers size={13} className="text-white" />
        </div>
      </div>
    );
  };

  const postsCount = instagramPosts.length;
  const approvedCount = instagramPosts.filter(p => p.phase === 'approved' || p.phase === 'published').length;

  const renderProfileHeader = () => (
    <div className="border-b border-gray-100 pb-6 mb-4">
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
        {/* Profile Pic */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2.5px] shadow-sm">
            <div className="w-full h-full bg-white rounded-full p-[1.5px]">
              <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          <span className="absolute bottom-0 right-0 bg-blue-500 text-white p-0.5 rounded-full border border-white">
            <CheckCircle size={10} fill="currentColor" className="text-white" />
          </span>
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center md:text-left space-y-2.5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center md:justify-start">
            <h2 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-1 justify-center sm:justify-start truncate">
              {profileUsername}
              <span className="inline-block w-3.5 h-3.5 bg-blue-500 rounded-full text-white flex items-center justify-center p-0.5 text-[6px] font-bold shrink-0">✓</span>
            </h2>
          </div>

          {/* Stats count */}
          <div className="flex justify-center md:justify-start gap-4 text-xs">
            <div>
              <span className="font-bold text-gray-900">{postsCount}</span> <span className="text-gray-400">publicaciones</span>
            </div>
            <div>
              <span className="font-bold text-gray-900">18.4k</span> <span className="text-gray-400">seguidores</span>
            </div>
            <div>
              <span className="font-bold text-gray-900">485</span> <span className="text-gray-400">seguidos</span>
            </div>
          </div>

          {/* Bio */}
          <div className="text-[11px] text-gray-700 space-y-0.5 leading-normal max-w-md">
            <p className="font-bold text-gray-900">{profileUsername}</p>
            <p className="text-gray-500 whitespace-pre-wrap">{profileBio}</p>
            <div className="flex items-center gap-1 text-blue-600 font-semibold justify-center md:justify-start mt-1.5">
              <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
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
      <div className="grid grid-cols-3 gap-[1px] md:gap-0.5 bg-gray-200">
        {feedPosts.map((post) => {
          const seed = post.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const likes = (seed % 150) + 10;
          const commentsCount = (seed % 25) + 2;

          return (
            <motion.div
              layoutId={`feed-${post.id}`}
              key={post.id}
              onClick={() => setSelectedIgPost(post)}
              className="relative aspect-[4/5] bg-gray-100 overflow-hidden group cursor-pointer border border-transparent shadow-none transition-all rounded-none"
              whileHover={{ scale: 0.99 }}
            >
              {getPostMedia(post)}

              {/* Hover overlay with pure IG stats (strictly NO technical/phase labels on top of the image) */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-4 text-white text-xs font-bold z-20">
                <span className="flex items-center gap-1">
                  <Heart size={14} fill="currentColor" />
                  {likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={14} fill="currentColor" />
                  {commentsCount}
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
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
        
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Smartphone size={16} className="text-blue-600" />
              Vista Instagram
            </h3>
            <span className="bg-pink-50 text-pink-600 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase">
              1080x1350 Standard
            </span>
          </div>
          
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
            <label className="text-[10px] font-bold text-gray-400 uppercase block">Fases Incluidas</label>
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

        {/* Mockup Profile Customizer Panel (Folded under Vista Instagram) */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <button 
            onClick={() => setIsPersonalizerExpanded(!isPersonalizerExpanded)}
            className="w-full flex items-center justify-between text-xs font-bold text-gray-700 hover:text-gray-900 transition-colors uppercase tracking-wider text-left"
          >
            <div className="flex items-center gap-2">
              <Edit2 size={14} className="text-blue-600" />
              <span>Personalizar Cuenta IG</span>
            </div>
            <motion.span
              animate={{ rotate: isPersonalizerExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-gray-400 text-[10px]"
            >
              ▼
            </motion.span>
          </button>
          
          <AnimatePresence initial={false}>
            {isPersonalizerExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 text-xs overflow-hidden pt-2 border-t border-gray-100"
              >
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nombre de Usuario</label>
                  <input 
                    type="text" 
                    value={profileUsername}
                    onChange={e => handleUsernameChange(e.target.value)}
                    placeholder="usuario_marca"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 font-bold text-gray-700 outline-none focus:border-blue-500 focus:bg-white transition-all text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Biografía / Descripción</label>
                  <textarea 
                    rows={3}
                    value={profileBio}
                    onChange={e => handleBioChange(e.target.value)}
                    placeholder="Escribe la descripción de la marca..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 font-semibold text-gray-700 outline-none focus:border-blue-500 focus:bg-white transition-all text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Foto de Perfil</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="file" 
                      accept="image/*"
                      id="profile-pic-upload"
                      className="hidden"
                      onChange={handleProfileImageUpload}
                    />
                    <label 
                      htmlFor="profile-pic-upload"
                      className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg py-2 px-3 flex items-center gap-1.5 cursor-pointer font-bold text-gray-600 text-[10px] transition-colors"
                    >
                      <Upload size={12} />
                      Subir Foto
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const fallback = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
                        setProfileImage(fallback);
                        localStorage.setItem('ig_profile_image', fallback);
                      }}
                      className="text-gray-400 hover:text-red-500 text-[10px] font-semibold"
                    >
                      Resetear
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tip banner */}
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 text-xs text-blue-700 leading-normal shrink-0">
          <Info size={16} className="shrink-0 mt-0.5 text-blue-600" />
          <p>
            <strong>Vista de Instagram:</strong> Haz clic sobre cualquier creatividad para abrir la vista individual de Instagram, y utiliza el botón <strong>Editar</strong> para abrir la ficha técnica, redactar copy o gestionar el feedback.
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
                <span className="font-extrabold text-xs tracking-tight text-gray-900">{profileUsername}</span>
                <span className="text-gray-400">•</span>
              </div>

              {/* Profile Contents */}
              <div className="flex-1 overflow-y-auto px-1 py-4 scrollbar-hide text-xs bg-white">
                <div className="px-2">
                  {renderProfileHeader()}
                </div>

                {/* Simulated Tab Bar */}
                <div className="flex border-b border-gray-100 mb-2">
                  <button 
                    onClick={() => setActiveTab('posts')}
                    className={cn(
                      "flex-1 flex justify-center py-2 border-b-2 text-xs font-bold transition-all gap-1.5",
                      activeTab === 'posts' ? "border-black text-black" : "border-transparent text-gray-400"
                    )}
                  >
                    <Grid size={15} />
                    <span>Publicaciones</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('reels')}
                    className={cn(
                      "flex-1 flex justify-center py-2 border-b-2 text-xs font-bold transition-all gap-1.5",
                      activeTab === 'reels' ? "border-black text-black" : "border-transparent text-gray-400"
                    )}
                  >
                    <Tv size={15} />
                    <span>Reels</span>
                  </button>
                </div>

                {renderGridContent()}
              </div>
            </div>
          </div>
        ) : (
          /* Normal Expanded Web Layout */
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
            {renderProfileHeader()}

            {/* Normal Web Tab Bar */}
            <div className="flex justify-center border-t border-gray-100 gap-12 mb-4">
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
                Reels
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
