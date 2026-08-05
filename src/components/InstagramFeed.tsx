import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Grid,
  Tv,
  Camera,
  CheckCircle,
  Sparkles,
  Smartphone,
  Info,
  Edit2,
  Upload
} from 'lucide-react';
import { cn, getVisibleFeedPosts } from '../lib/utils';
import { Post } from '../types';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import InstagramDetailModal from './InstagramDetailModal';
import Toggle from './Toggle';
import Media from './Media';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';
import Field from './Field';
import { toast } from 'react-hot-toast';

interface InstagramFeedProps {
  posts: Post[];
  onSelectPost: (post: Post, initialTab?: 'comments' | 'feedback') => void;
  userRole: string;
  loading?: boolean;
}

export default function InstagramFeed({ posts, onSelectPost, userRole, loading = false }: InstagramFeedProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
  const [showDeviceFrame, setShowDeviceFrame] = useState(true);
  const [isPersonalizerExpanded, setIsPersonalizerExpanded] = useState(false);
  const [filterPhase, setFilterPhase] = useState<'all' | 'approved_only'>('all');
  const [grayscalePublished, setGrayscalePublished] = useState(false);
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
  // and only show posts that actually have a creativity uploaded — an
  // empty gradient placeholder isn't a real preview of anything.
  const visiblePosts = getVisibleFeedPosts(instagramPosts, userRole, filterPhase);

  const feedPosts = visiblePosts
    .filter(p => {
      if (activeTab === 'posts') return true;
      return p.idea.toLowerCase().includes('video') || p.idea.toLowerCase().includes('reels') || p.idea.toLowerCase().includes('reel');
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  // Every post reaching this point already has a creativity uploaded
  // (filtered in visiblePosts), so this only ever renders real media.
  const getPostMedia = (post: Post, grayscale: boolean) => {
    // Reels show their uploaded cover image in the grid, just like real
    // Instagram — the grid is a static thumbnail wall, not a video player.
    const mediaUrl = (post.format === 'reel' && post.reelCoverUrl)
      || post.currentDesignUrl
      || (post.carouselUrls || []).find(Boolean);
    if (!mediaUrl) return null;

    const mediaClass = cn(
      "w-full h-full object-cover transition-all duration-500 group-hover:scale-105",
      grayscale && post.phase === 'published' && "grayscale"
    );

    return <Media src={mediaUrl} alt={post.idea} className={mediaClass} imgProps={{ referrerPolicy: 'no-referrer' }} />;
  };

  const postsCount = instagramPosts.length;
  const approvedCount = instagramPosts.filter(p => p.phase === 'approved' || p.phase === 'published').length;

  const renderProfileHeader = () => (
    <div className="border-b border-divider pb-6 mb-4">
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
            <h2 className="text-base md:text-lg font-bold text-ink flex items-center gap-1 justify-center sm:justify-start truncate">
              {profileUsername}
              <span className="inline-block w-3.5 h-3.5 bg-blue-500 rounded-full text-white flex items-center justify-center p-0.5 text-[11px] font-bold shrink-0">✓</span>
            </h2>
          </div>

          {/* Stats count — only real numbers derived from actual posts; no
              fabricated followers/following, this is a planning mockup, not
              a live account. */}
          <div className="flex justify-center md:justify-start gap-4 text-xs">
            <div>
              <span className="font-bold text-ink">{postsCount}</span> <span className="text-ink-muted">publicaciones</span>
            </div>
          </div>

          {/* Bio */}
          <div className="text-[11px] text-ink-secondary space-y-0.5 leading-normal max-w-md">
            <p className="font-bold text-ink">{profileUsername}</p>
            <p className="text-ink-secondary whitespace-pre-wrap">{profileBio}</p>
            <div className="flex items-center gap-1 text-app-accent font-semibold justify-center md:justify-start mt-1.5">
              <span className="text-[11px] bg-app-accent-subtle text-app-accent px-2 py-0.5 rounded-full font-bold">
                Aprobados: {approvedCount}/{postsCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGridContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-3 gap-[0.5px] md:gap-0.5 bg-gray-200/60" role="status" aria-label="Cargando publicaciones">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} shape="block" className="aspect-[4/5] rounded-none" />
          ))}
        </div>
      );
    }

    if (feedPosts.length === 0) {
      return (
        <EmptyState
          icon={Camera}
          title="No hay posts para esta vista"
          description='Crea nuevos posts con plataforma "instagram" en el calendario para verlos en esta parrilla.'
          bordered
        />
      );
    }

    return (
      <div className="grid grid-cols-3 gap-[0.5px] md:gap-0.5 bg-gray-200/60">
        {feedPosts.map((post) => (
          <motion.button
            type="button"
            layoutId={`feed-${post.id}`}
            key={post.id}
            onClick={() => setSelectedIgPost(post)}
            className="relative aspect-[4/5] bg-gray-100 overflow-hidden group cursor-pointer border border-transparent shadow-none transition-all rounded-none block"
            whileHover={{ scale: 0.99 }}
          >
            {getPostMedia(post, grayscalePublished)}

            {/* Hover overlay — no engagement numbers, this is a planning
                mockup and doesn't have real likes/comments to show. */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center text-white text-xs font-bold z-20">
              <span className="flex items-center gap-1.5">
                <Camera size={14} />
                Ver publicación
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
      
      {/* Settings / Controls Sidebar Panel */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-divider shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink text-sm flex items-center gap-2">
              <Smartphone size={16} className="text-app-accent" />
              Vista Instagram
            </h3>
            <span className="bg-pink-50 text-pink-600 font-bold text-[11px] px-2 py-0.5 rounded-full uppercase">
              1080x1350 Standard
            </span>
          </div>
          
          <hr className="border-divider" />

          {/* Toggle Mobile Frame */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink-secondary">Simulador de Móvil</span>
            <Toggle checked={showDeviceFrame} onChange={setShowDeviceFrame} label="Simulador de móvil" />
          </div>

          {/* Toggle B&W for published posts */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink-secondary">Publicados en B/N</span>
            <Toggle checked={grayscalePublished} onChange={setGrayscalePublished} label="Poner en blanco y negro los posts publicados" />
          </div>

          {/* Filter Phases */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ink-muted uppercase block">Fases Incluidas</label>
            <div className="grid grid-cols-2 gap-1.5 bg-gray-50 p-1 rounded-xl border border-divider">
              <button
                onClick={() => setFilterPhase('all')}
                className={cn(
                  "py-1.5 text-[11px] font-bold rounded-lg transition-all",
                  filterPhase === 'all' ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary"
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterPhase('approved_only')}
                className={cn(
                  "py-1.5 text-[11px] font-bold rounded-lg transition-all",
                  filterPhase === 'approved_only' ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink-secondary"
                )}
              >
                Aprobados / Publ.
              </button>
            </div>
          </div>
        </div>

        {/* Mockup Profile Customizer Panel (Folded under Vista Instagram) */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-divider shadow-sm space-y-3">
          <button 
            onClick={() => setIsPersonalizerExpanded(!isPersonalizerExpanded)}
            className="w-full flex items-center justify-between text-xs font-bold text-ink-secondary hover:text-ink transition-colors uppercase tracking-wider text-left"
          >
            <div className="flex items-center gap-2">
              <Edit2 size={14} className="text-app-accent" />
              <span>Personalizar Cuenta IG</span>
            </div>
            <motion.span
              animate={{ rotate: isPersonalizerExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-ink-muted text-[11px]"
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
                className="space-y-3 text-xs overflow-hidden pt-2 border-t border-divider"
              >
                <Field label="Nombre de Usuario" id="ig-profile-username" className="[&>label]:text-[11px] [&>label]:font-bold [&>label]:text-ink-muted [&>label]:uppercase">
                  <input
                    type="text"
                    value={profileUsername}
                    onChange={e => handleUsernameChange(e.target.value)}
                    placeholder="usuario_marca"
                    className="w-full bg-gray-50 border border-divider rounded-md px-3 py-2 font-bold text-ink-secondary outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 focus:bg-white transition-all text-xs"
                  />
                </Field>

                <Field label="Biografía / Descripción" id="ig-profile-bio" className="[&>label]:text-[11px] [&>label]:font-bold [&>label]:text-ink-muted [&>label]:uppercase">
                  <textarea
                    rows={3}
                    value={profileBio}
                    onChange={e => handleBioChange(e.target.value)}
                    placeholder="Escribe la descripción de la marca..."
                    className="w-full bg-gray-50 border border-divider rounded-md px-3 py-2 font-semibold text-ink-secondary outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 focus:bg-white transition-all text-xs resize-none"
                  />
                </Field>

                <div>
                  <label className="text-[11px] font-bold text-ink-muted uppercase block mb-1">Foto de Perfil</label>
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
                      className="bg-gray-50 hover:bg-gray-100 border border-divider rounded-lg py-2 px-3 flex items-center gap-1.5 cursor-pointer font-bold text-ink-secondary text-[11px] transition-colors"
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
                      className="text-ink-muted hover:text-red-500 text-[11px] font-semibold"
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
              <div className="flex justify-between items-center px-6 text-caption text-ink-muted select-none">
                <span>09:41</span>
                <div className="flex items-center gap-1">
                  <span>5G</span>
                  <div className="w-5 h-2.5 bg-gray-400 rounded-sm" />
                </div>
              </div>

              {/* Instagram App Top Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-divider">
                <span className="font-extrabold text-xs tracking-tight text-ink">{profileUsername}</span>
                <span className="text-ink-muted">•</span>
              </div>

              {/* Profile Contents */}
              <div className="flex-1 overflow-y-auto px-1 py-4 scrollbar-hide text-xs bg-white">
                <div className="px-2">
                  {renderProfileHeader()}
                </div>

                {/* Simulated Tab Bar */}
                <div className="flex border-b border-divider mb-2">
                  <button 
                    onClick={() => setActiveTab('posts')}
                    className={cn(
                      "flex-1 flex justify-center py-2 border-b-2 text-xs font-bold transition-all gap-1.5",
                      activeTab === 'posts' ? "border-gray-900 text-ink" : "border-transparent text-ink-muted"
                    )}
                  >
                    <Grid size={15} />
                    <span>Publicaciones</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('reels')}
                    className={cn(
                      "flex-1 flex justify-center py-2 border-b-2 text-xs font-bold transition-all gap-1.5",
                      activeTab === 'reels' ? "border-gray-900 text-ink" : "border-transparent text-ink-muted"
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
          <div className="bg-white p-6 rounded-3xl border border-divider shadow-sm max-w-4xl mx-auto">
            {renderProfileHeader()}

            {/* Normal Web Tab Bar */}
            <div className="flex justify-center border-t border-divider gap-12 mb-4">
              <button 
                onClick={() => setActiveTab('posts')}
                className={cn(
                  "flex items-center gap-2 py-3 border-t-2 text-xs font-bold uppercase tracking-widest transition-all",
                  activeTab === 'posts' ? "border-gray-900 text-ink" : "border-transparent text-ink-muted"
                )}
              >
                <Grid size={14} />
                Publicaciones
              </button>
              <button 
                onClick={() => setActiveTab('reels')}
                className={cn(
                  "flex items-center gap-2 py-3 border-t-2 text-xs font-bold uppercase tracking-widest transition-all",
                  activeTab === 'reels' ? "border-gray-900 text-ink" : "border-transparent text-ink-muted"
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
          onOpenEdit={(tab) => onSelectPost(selectedIgPost, tab)}
        />
      )}
    </div>
  );
}
