import React, { useState, useEffect } from 'react';
import { 
  X, 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal,
  Volume2,
  VolumeX,
  Play,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn, PHASES, Phase, isVideoUrl, onActivateKey } from '../lib/utils';
import { Post, Comment } from '../types';
import { useModalA11y } from '../lib/useModalA11y';
import SocialCaption from './SocialCaption';
import IconButton from './IconButton';
import Avatar from './Avatar';
import Media from './Media';
import EmptyState from './EmptyState';

interface InstagramDetailModalProps {
  post: Post;
  comments: Comment[];
  onAddComment: (text: string) => void;
  onClose: () => void;
  userRole: string;
  onOpenEdit?: (initialTab?: 'comments' | 'feedback') => void;
}

export default function InstagramDetailModal({ 
  post, 
  comments, 
  onAddComment, 
  onClose,
  userRole,
  onOpenEdit
}: InstagramDetailModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  const modalContainerRef = useModalA11y(() => {
    if (!zoomedImageUrl) onClose();
  });

  useEffect(() => {
    if (!zoomedImageUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setZoomedImageUrl(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [zoomedImageUrl]);

  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Initialize random-like counts once based on ID
  useEffect(() => {
    const seed = post.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    setLikesCount((seed % 140) + 12);
  }, [post.id]);

  const slides = post.format === 'carrusel' 
    ? (post.carouselUrls && post.carouselUrls.length > 0 ? post.carouselUrls.filter(Boolean) : []) 
    : [];

  // Default simulated slide content if carousel is empty
  const defaultCarouselSlides = [
    post.currentDesignUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=800',
    'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=800'
  ];

  const activeSlides = slides.length > 0 ? slides : defaultCarouselSlides;

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
  };

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(commentText);
    setCommentText('');
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const mediaGradients = [
    'from-indigo-600 via-purple-600 to-pink-500',
    'from-pink-500 via-rose-500 to-amber-500',
    'from-teal-500 via-blue-600 to-indigo-700'
  ];
  const charSum = post.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mediaGradient = mediaGradients[charSum % mediaGradients.length];

  // Component to render the main media content based on format
  const renderMedia = () => {
    if (post.format === 'reel') {
      return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
          {/* Reel Container styled 9:16 inside */}
          <div className="relative w-full h-full max-w-[360px] aspect-[9/16] bg-[#111] flex flex-col justify-between p-6 text-white shadow-xl">
            {post.currentDesignUrl ? (
              isVideoUrl(post.currentDesignUrl) ? (
                <video 
                  ref={videoRef}
                  src={post.currentDesignUrl} 
                  className="absolute inset-0 w-full h-full object-cover opacity-80 cursor-pointer"
                  loop
                  playsInline
                  autoPlay={isPlaying}
                  muted={isMuted}
                  onClick={() => setIsPlaying(!isPlaying)}
                />
              ) : (
                <img
                  src={post.currentDesignUrl}
                  alt="Reel design"
                  role="button"
                  tabIndex={0}
                  className="absolute inset-0 w-full h-full object-cover opacity-80 cursor-zoom-in"
                  onClick={() => setZoomedImageUrl(post.currentDesignUrl)}
                  onKeyDown={onActivateKey(() => setZoomedImageUrl(post.currentDesignUrl))}
                />
              )
            ) : (
              <div className={cn("absolute inset-0 bg-gradient-to-tr", mediaGradient)} />
            )}
            
            {/* Reel overlay elements */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
            
            {/* Top info */}
            <div className="relative z-10 flex justify-between items-center text-xs">
              <span className="bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 font-medium">Reels</span>
              <IconButton
                icon={isMuted ? VolumeX : Volume2}
                variant="overlay"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                aria-label={isMuted ? "Activar sonido" : "Silenciar"}
              />
            </div>

            {/* Simulated Reel loop bar */}
            {isPlaying && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <motion.div 
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
                  className="h-full bg-blue-500"
                />
              </div>
            )}

            {/* Bottom info: caption, user, sound */}
            <div className="relative z-10 space-y-2 mt-auto text-left">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-xs font-bold text-white">S</div>
                <span className="font-bold text-xs text-white">socialflow_agency</span>
              </div>
              <p className="text-xs text-white/90 line-clamp-3 leading-relaxed drop-shadow-sm font-medium">
                {post.copyCaption || post.idea}
              </p>
              <p className="text-[11px] text-white/60 flex items-center gap-1">
                <span>🎵 Audio original - socialflow_agency</span>
              </p>
            </div>

            {/* Center play trigger overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/10">
              <IconButton
                icon={Play}
                variant="overlay"
                onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                aria-label={isPlaying ? "Pausar" : "Reproducir"}
                className={isPlaying ? '[&>svg]:fill-current [&>svg]:translate-x-[1px]' : undefined}
              />
            </div>
          </div>
        </div>
      );
    }

    if (post.format === 'carrusel') {
      return (
        <div className="relative w-full h-full bg-gray-900 flex items-center justify-center group overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex items-center justify-center"
            >
              {activeSlides[currentSlide] ? (
                <Media
                  src={activeSlides[currentSlide]}
                  alt={`Slide ${currentSlide + 1}`}
                  className="w-full h-full object-cover"
                  imgClassName="cursor-zoom-in"
                  videoProps={{ controls: true }}
                  imgProps={{ referrerPolicy: 'no-referrer', onClick: () => setZoomedImageUrl(activeSlides[currentSlide]) }}
                />
              ) : (
                <div className={cn("w-full h-full bg-gradient-to-tr flex flex-col justify-between p-6 text-white", mediaGradient)}>
                  <span className="text-xs font-semibold bg-black/20 px-2 py-0.5 rounded-full self-start">Slide {currentSlide + 1}</span>
                  <div className="space-y-2 text-center my-auto">
                    <p className="text-base font-bold px-4">{post.idea}</p>
                    <p className="text-xs text-white/85 px-4 italic">{post.copyCaption || 'Diseño de carrusel en producción...'}</p>
                  </div>
                  <div className="text-right text-[11px] opacity-50 font-mono">v{currentSlide + 1}</div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Carousel arrows */}
          {activeSlides.length > 1 && (
            <>
              <IconButton icon={ChevronLeft} variant="light" onClick={handlePrevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 z-10" aria-label="Imagen anterior" />
              <IconButton icon={ChevronRight} variant="light" onClick={handleNextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 z-10" aria-label="Imagen siguiente" />
            </>
          )}

          {/* Slide dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {activeSlides.map((_, idx) => (
              <span 
                key={idx} 
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  currentSlide === idx ? "bg-blue-600 scale-125" : "bg-white/60"
                )}
              />
            ))}
          </div>

          <span className="absolute top-4 right-4 bg-black/60 text-white text-[11px] font-bold px-2 py-0.5 rounded-full z-10">
            {currentSlide + 1}/{activeSlides.length}
          </span>
        </div>
      );
    }

    // Static/Default post layout
    return (
      <div className="w-full h-full bg-gray-50 flex items-center justify-center overflow-hidden">
        {post.currentDesignUrl ? (
          <Media
            src={post.currentDesignUrl}
            alt={post.idea}
            className="w-full h-full object-cover"
            imgClassName="cursor-zoom-in"
            videoProps={{ controls: true }}
            imgProps={{ referrerPolicy: 'no-referrer', onClick: () => setZoomedImageUrl(post.currentDesignUrl) }}
          />
        ) : (
          <div className={cn("w-full h-full bg-gradient-to-tr flex flex-col justify-between p-6 text-white", mediaGradient)}>
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-wider">
                {PHASES[post.phase].label.split(':')[0]}
              </span>
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center border border-white/10">✨</div>
            </div>
            
            <div className="space-y-2 text-left my-auto">
              <h4 className="text-base font-bold leading-snug">{post.idea}</h4>
              <p className="text-xs text-white/80 leading-relaxed italic">{post.copyCaption || 'El copy se está revisando'}</p>
            </div>
            
            <div className="flex justify-between items-center text-[11px] opacity-60 font-medium">
              <span>SocialFlow Simulator</span>
              <span>1080 x 1080 px (1:1)</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <div
        ref={modalContainerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de publicación de Instagram"
        tabIndex={-1}
        className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col md:flex-row overflow-y-auto md:overflow-hidden max-h-[95vh] md:max-h-[92vh] cursor-default outline-none"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Close Button on Top Right Corner */}
        <IconButton icon={X} variant="light" onClick={onClose} className="absolute top-4 right-4 z-50" aria-label="Cerrar" />

        {/* Left Column: Media Container */}
        <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-[500px] aspect-[4/5] relative select-none">
          {renderMedia()}
        </div>

        {/* Right Column: Details & Comments Area */}
        <div className="w-full md:w-[380px] flex flex-col border-l border-divider bg-white">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-divider flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                <div className="w-full h-full bg-white rounded-full p-[1px]">
                  <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-ink-secondary">S</div>
                </div>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-ink">socialflow_agency</span>
                  <span className="w-3 h-3 bg-blue-500 rounded-full text-white flex items-center justify-center text-[11px] font-bold">✓</span>
                </div>
                <p className="text-caption text-ink-muted capitalize">{PHASES[post.phase].label}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {onOpenEdit && userRole !== 'client' && (
                <button 
                  onClick={() => {
                    onClose();
                    onOpenEdit();
                  }}
                  className="px-2.5 py-1 bg-app-accent-subtle hover:bg-app-accent/20 text-app-accent rounded text-[11px] font-semibold transition-colors"
                >
                  Editar
                </button>
              )}
              {/* p-2 -m-2: grows the tap target without a visible chip — these action-bar
                  icons deliberately mimic real Instagram, which has no button background here. */}
              <button className="text-ink-muted hover:text-ink-secondary p-2 -m-2" aria-label="Más opciones">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* Comments & Caption scrollable list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs scrollbar-hide max-h-[220px] md:max-h-none">
            {/* The Post Caption acts as the first comment */}
            <div className="flex gap-3 text-left">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-ink-secondary text-[11px] shrink-0">S</div>
              <div className="flex-1">
                <SocialCaption
                  username="socialflow_agency"
                  text={post.copyCaption || post.idea}
                  maxChars={125}
                  highlightClass="font-semibold text-blue-600"
                  className="text-ink leading-relaxed whitespace-pre-wrap"
                />
                <div className="text-caption text-ink-muted mt-1 flex items-center gap-2">
                  <span>1 h</span>
                  {post.copyCreativity && <span className="text-app-accent font-semibold">Copy de diseño adjunto</span>}
                </div>
              </div>
            </div>

            {/* User comments list — internal agency discussion, never shown to clients */}
            {userRole !== 'client' && comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 text-left">
                <Avatar name={comment.authorName} size="sm" />
                <div className="flex-1">
                  <span className="font-bold text-ink mr-1.5">{comment.authorName}</span>
                  <span className="text-ink-secondary leading-relaxed">{comment.text}</span>
                  <div className="text-caption text-ink-muted mt-1 flex items-center gap-2">
                    <span>{format(comment.createdAt, 'HH:mm dd/MM')}</span>
                    <span className="capitalize text-caption text-ink-muted">{comment.roleAtTime}</span>
                  </div>
                </div>
              </div>
            ))}

            {userRole !== 'client' && comments.length === 0 && (
              <EmptyState title="Sin comentarios adicionales" description="Escribe abajo para dejar feedback" size="sm" />
            )}
          </div>

          {/* Action Engagement Bar */}
          <div className="p-3 border-t border-divider space-y-2 bg-gray-50/50">
            <div className="flex items-center justify-between">
              {/* p-2 -m-2 on each: grows the tap target without a visible chip, same
                  reasoning as the "Más opciones" button above — these mimic Instagram's
                  real action bar, which renders bare icons with no button background. */}
              <div className="flex items-center gap-3 text-ink-secondary">
                <button onClick={toggleLike} className="hover:scale-110 transition-transform p-2 -m-2" aria-label={isLiked ? "Quitar me gusta" : "Me gusta"}>
                  <Heart size={20} className={cn(isLiked ? "fill-red-500 text-red-500" : "text-ink-secondary")} />
                </button>
                <button
                  onClick={() => {
                    if (!onOpenEdit) return;
                    onClose();
                    onOpenEdit(userRole !== 'client' ? 'comments' : 'feedback');
                  }}
                  className="hover:scale-110 transition-transform p-2 -m-2"
                  aria-label="Comentar"
                >
                  <MessageCircle size={20} />
                </button>
                <button className="hover:scale-110 transition-transform p-2 -m-2" aria-label="Compartir">
                  <Share2 size={18} />
                </button>
              </div>
              <button className="text-ink-secondary hover:scale-110 transition-transform p-2 -m-2" aria-label="Guardar">
                <Bookmark size={18} />
              </button>
            </div>

            <div className="text-left font-semibold text-ink text-xs">
              {likesCount} Me gusta
            </div>
            
            <div className="text-caption text-ink-muted capitalize text-left">
              Fase: {PHASES[post.phase].label.split(': ')[1] || PHASES[post.phase].label}
            </div>
          </div>

          {/* Add Comment input — internal-only, hidden from clients (matches PostModal's
              Comments tab, which is agency-only). Clients give feedback from the Feedback tab. */}
          {userRole !== 'client' ? (
            <form onSubmit={handleSubmitComment} className="p-3 border-t border-divider bg-white flex items-center relative">
              <input
                type="text"
                aria-label="Añadir comentario"
                placeholder="Añade un comentario..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="w-full text-xs outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 pr-10 py-1.5 pl-1.5 focus:bg-gray-50/30 rounded"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="absolute right-4 text-xs font-bold text-app-accent disabled:opacity-40 hover:text-app-accent-hover transition-colors"
              >
                Publicar
              </button>
            </form>
          ) : (
            <div className="p-3 border-t border-divider bg-gray-50/50 text-center text-caption text-ink-muted">
              Para dar feedback sobre este post, ábrelo desde el calendario o el tablero.
            </div>
          )}
        </div>

      </div>
      <AnimatePresence>
        {zoomedImageUrl && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setZoomedImageUrl(null);
            }}
          >
            <IconButton
              icon={X}
              variant="overlay"
              className="absolute top-4 right-4 z-[110]"
              onClick={(e) => {
                e.stopPropagation();
                setZoomedImageUrl(null);
              }}
              aria-label="Cerrar imagen ampliada"
            />
            <Media
              src={zoomedImageUrl}
              alt="Zoomed Design"
              className="max-w-full max-h-full object-contain rounded shadow-2xl"
              videoProps={{ controls: true, autoPlay: true, onClick: (e) => e.stopPropagation() }}
              imgProps={{ onClick: (e) => e.stopPropagation() }}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
