import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  History as HistoryIcon, 
  MessageSquare, 
  Image as ImageIcon, 
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Plus,
  Trash2,
  Layers,
  Video,
  Film
} from 'lucide-react';
import { cn, PHASES, Phase, Role, ROLES, compressImage } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface Comment {
  id: string;
  text: string;
  authorName: string;
  roleAtTime: string;
  createdAt: any;
}

interface PostVersion {
  createdAt: any;
  copyCaption: string;
  copyCreativity: string;
  designUrl: string;
  authorName: string;
}

interface Post {
  id: string;
  date: any;
  platform: 'instagram' | 'linkedin' | 'tiktok';
  phase: Phase;
  idea: string;
  references: string[];
  copyCreativity: string;
  copyCaption: string;
  currentDesignUrl: string;
  format?: 'estatico' | 'reel' | 'carrusel';
  carouselUrls?: string[];
  projectId?: string;
}

interface PostModalProps {
  post: Post | null;
  onClose: () => void;
  onUpdate: (updates: Partial<Post>) => void;
  onDelete?: (postId: string) => void;
  userRole: Role;
  comments: Comment[];
  onAddComment: (text: string) => void;
  history: PostVersion[];
  projects?: any[];
}

export default function PostModal({ 
  post, 
  onClose, 
  onUpdate, 
  onDelete,
  userRole, 
  comments, 
  onAddComment,
  history,
  projects = []
}: PostModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'comments'>('details');
  const [commentText, setCommentText] = useState('');
  const [localPost, setLocalPost] = useState<Post | null>(post);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // Drag over states
  const [isDragOverReferences, setIsDragOverReferences] = useState(false);
  const [isDragOverCreativity, setIsDragOverCreativity] = useState(false);

  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  if (!localPost) return null;

  const isClient = userRole === 'client';
  const canEditIdea = ['admin', 'creative_director'].includes(userRole);
  const canEditCopy = ['admin', 'creative_director', 'copy'].includes(userRole);
  const canEditDesign = ['admin', 'art_director', 'designer'].includes(userRole);
  const isAgencyMember = userRole !== 'client';
  const canAdvancePhase = isAgencyMember || (userRole === 'client' && localPost.phase === 'client_review');

  const handleUpdate = () => {
    if (localPost) onUpdate(localPost);
  };

  const nextPhase = () => {
    const phaseOrder: Phase[] = ['idea_1', 'idea_2', 'copy', 'design', 'client_review', 'approved', 'published'];
    const currentIndex = phaseOrder.indexOf(localPost.phase);
    if (currentIndex < phaseOrder.length - 1) {
      const nextPh = phaseOrder[currentIndex + 1];
      const updated = { ...localPost, phase: nextPh };
      setLocalPost(updated);
      onUpdate(updated);
    }
  };

  const projectInfo = projects.find(p => p.id === localPost.projectId);

  // --- Drag & Drop Handlers ---
  const handleReferencesDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isClient) setIsDragOverReferences(true);
  };

  const handleReferencesDragLeave = () => {
    setIsDragOverReferences(false);
  };

  const handleReferencesDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverReferences(false);
    if (isClient) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processAndAppendReferences(files);
    }
  };

  const handleCreativityDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canEditDesign) setIsDragOverCreativity(true);
  };

  const handleCreativityDragLeave = () => {
    setIsDragOverCreativity(false);
  };

  const handleCreativityDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCreativity(false);
    if (!canEditDesign) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (localPost.format === 'carrusel') {
        processAndAppendCarousel(files);
      } else {
        processAndSetSingleDesign(files[0]);
      }
    }
  };

  // --- File Processing Helpers ---
  const processAndAppendReferences = (files: FileList) => {
    const promises = (Array.from(files) as File[]).map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          compressImage(reader.result as string).then(resolve);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64Urls => {
      const currentRefs = localPost.references || [];
      const updatedRefs = [...currentRefs, ...base64Urls];
      const updated = { ...localPost, references: updatedRefs };
      setLocalPost(updated);
      onUpdate(updated);
    });
  };

  const processAndSetSingleDesign = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      compressImage(reader.result as string).then(compressedUrl => {
        const updated = { ...localPost, currentDesignUrl: compressedUrl };
        setLocalPost(updated);
        onUpdate(updated);
      });
    };
    reader.readAsDataURL(file);
  };

  const processAndAppendCarousel = (files: FileList) => {
    const promises = (Array.from(files) as File[]).map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          compressImage(reader.result as string).then(resolve);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64Urls => {
      const currentUrls = localPost.carouselUrls || [];
      const updatedUrls = [...currentUrls, ...base64Urls];
      const updated = { ...localPost, carouselUrls: updatedUrls };
      setLocalPost(updated);
      onUpdate(updated);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4 flex-wrap">
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm",
              PHASES[localPost.phase].color
            )}>
              <Clock size={12} />
              {PHASES[localPost.phase].label}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
              <span className="capitalize">{localPost.platform} — {format(localPost.date, 'dd/MM/yyyy')}</span>
              {projectInfo && (
                <span 
                  className="px-2.5 py-0.5 text-white border rounded-full text-xs font-semibold shadow-sm"
                  style={{ backgroundColor: projectInfo.color || '#3b82f6', borderColor: 'transparent' }}
                >
                  💼 {projectInfo.name}
                </span>
              )}
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {isAgencyMember && onDelete && (
              <button 
                onClick={() => {
                  if (window.confirm('¿Estás seguro de que quieres eliminar permanentemente este post de la planificación?')) {
                    onDelete(localPost.id);
                  }
                }}
                className="p-2 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                title="Eliminar post"
              >
                <Trash2 size={18} />
                <span className="hidden sm:inline">Eliminar Post</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 bg-white shrink-0">
          {[
            { id: 'details', label: 'Producción', icon: CheckCircle },
            { id: 'comments', label: 'Comentarios', icon: MessageSquare, count: comments.length },
            { id: 'history', label: 'Historial', icon: HistoryIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "py-4 px-4 border-b-2 transition-all flex items-center gap-2 text-sm font-semibold",
                activeTab === tab.id 
                  ? "border-app-accent text-app-accent" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.count !== undefined && (
                <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <AnimatePresence mode="wait">
            {activeTab === 'details' && (
              <motion.div 
                key="details"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                {/* Workflow Tracker */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <section>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">La Idea (Fase 1/2)</label>
                      <textarea
                        disabled={!canEditIdea}
                        value={localPost.idea}
                        onChange={e => setLocalPost({...localPost, idea: e.target.value})}
                        onBlur={handleUpdate}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all resize-none h-28 text-sm"
                        placeholder="Describe la idea central del post..."
                      />
                    </section>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <section>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Plataforma</label>
                        <select
                          value={localPost.platform}
                          onChange={e => {
                            const updated = { ...localPost, platform: e.target.value as any };
                            setLocalPost(updated);
                            onUpdate(updated);
                          }}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all"
                        >
                          <option value="instagram">📸 Instagram</option>
                          <option value="linkedin">💼 LinkedIn</option>
                        </select>
                      </section>

                      <section>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Formato</label>
                        <select
                          value={localPost.format || 'estatico'}
                          onChange={e => {
                            const updated = { ...localPost, format: e.target.value as any };
                            setLocalPost(updated);
                            onUpdate(updated);
                          }}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all"
                        >
                          <option value="estatico">Estático (Imagen única)</option>
                          <option value="reel">Reel / Video (Vertical)</option>
                          <option value="carrusel">Carrusel (Múltiples Diapositivas)</option>
                        </select>
                      </section>
                    </div>

                    {/* Drag and Drop References Section */}
                    <section>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Referencias Visuales (Arrastra o sube imágenes)
                      </label>
                      
                      <div 
                        onDragOver={handleReferencesDragOver}
                        onDragLeave={handleReferencesDragLeave}
                        onDrop={handleReferencesDrop}
                        className={cn(
                          "border-2 border-dashed rounded-xl p-4 transition-all duration-200 bg-gray-50/50 flex flex-col gap-3 min-h-[100px]",
                          isDragOverReferences ? "border-app-accent bg-app-accent/5" : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex flex-wrap gap-2">
                          {localPost.references?.map((ref, i) => (
                            <div 
                              key={i} 
                              onClick={() => setZoomedImageUrl(ref)}
                              className="group relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-zoom-in transition-transform hover:scale-105"
                            >
                               <img src={ref} alt="ref" className="w-full h-full object-cover" />
                               {!isClient && (
                                 <button 
                                   type="button"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     const newRefs = [...(localPost.references || [])];
                                     newRefs.splice(i, 1);
                                     const updated = { ...localPost, references: newRefs };
                                     setLocalPost(updated);
                                     onUpdate(updated);
                                   }}
                                   className="absolute top-1 right-1 bg-white/95 hover:bg-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                   <X size={10} className="text-red-500" />
                                 </button>
                               )}
                            </div>
                          ))}

                          {!isClient && (
                            <div className="relative">
                              <input 
                                type="file"
                                multiple
                                accept="image/*"
                                id="references-upload"
                                className="hidden"
                                onChange={(e) => {
                                  const files = e.target.files;
                                  if (files && files.length > 0) processAndAppendReferences(files);
                                }}
                              />
                              <label 
                                htmlFor="references-upload"
                                className="w-16 h-16 border-2 border-dashed border-gray-200 hover:border-app-accent text-gray-400 hover:text-app-accent rounded-lg flex flex-col items-center justify-center transition-all bg-gray-50 cursor-pointer"
                              >
                                <Plus size={16} />
                                <span className="text-[9px] font-semibold">Subir</span>
                              </label>
                            </div>
                          )}
                        </div>

                        {(!localPost.references || localPost.references.length === 0) && (
                          <div className="text-center py-2 text-xs text-gray-400">
                            Arrastra tus imágenes de referencia aquí o haz clic en Subir
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Copy en la Creatividad (Diseños)</label>
                      <textarea
                        disabled={!canEditCopy}
                        value={localPost.copyCreativity}
                        onChange={e => setLocalPost({...localPost, copyCreativity: e.target.value})}
                        onBlur={handleUpdate}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all resize-none h-24 text-sm"
                        placeholder="Texto que aparecerá dentro del diseño..."
                      />
                    </section>

                    <section>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Post Caption (Texto de Publicación)</label>
                      <textarea
                        disabled={!canEditCopy}
                        value={localPost.copyCaption}
                        onChange={e => setLocalPost({...localPost, copyCaption: e.target.value})}
                        onBlur={handleUpdate}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all resize-none h-36 text-sm"
                        placeholder="Escribe el caption definitivo..."
                      />
                    </section>
                  </div>
                </div>

                {/* Creatividades Section (Interactive and Drag & Drop enabled) */}
                <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                       <ImageIcon size={18} />
                       Creatividad / Diseño Final (Fase 4/5)
                    </label>
                    {localPost.currentDesignUrl && (
                      <button 
                        onClick={() => setZoomedImageUrl(localPost.currentDesignUrl)}
                        className="text-app-accent hover:underline text-xs font-semibold flex items-center gap-1"
                      >
                        Ver Ampliado <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                  
                  {/* Outer Drag Zone */}
                  <div 
                    onDragOver={handleCreativityDragOver}
                    onDragLeave={handleCreativityDragLeave}
                    onDrop={handleCreativityDrop}
                    className={cn(
                      "grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border-2 border-dashed rounded-xl transition-all duration-200",
                      isDragOverCreativity ? "border-app-accent bg-app-accent/5" : "border-transparent"
                    )}
                  >
                    {/* Visual Preview Frame */}
                    <div>
                      {localPost.format === 'carrusel' ? (
                        <div className="space-y-4">
                          <span className="text-xs font-semibold text-gray-500 block">Carrusel Slides:</span>
                          {localPost.carouselUrls && localPost.carouselUrls.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                              {localPost.carouselUrls.map((url, idx) => (
                                <div 
                                  key={idx} 
                                  onClick={() => setZoomedImageUrl(url)}
                                  className="group relative aspect-square bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-zoom-in hover:scale-105 transition-transform"
                                >
                                  <img src={url} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                                  <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-bold text-white">
                                    {idx + 1}
                                  </div>
                                  {canEditDesign && (
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newUrls = [...(localPost.carouselUrls || [])];
                                        newUrls.splice(idx, 1);
                                        const updated = { ...localPost, carouselUrls: newUrls };
                                        setLocalPost(updated);
                                        onUpdate(updated);
                                      }}
                                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X size={10} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-200">
                              <p className="text-xs text-gray-400 font-medium">Sin diapositivas creadas todavía</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div 
                          onClick={() => localPost.currentDesignUrl && setZoomedImageUrl(localPost.currentDesignUrl)}
                          className={cn(
                            "aspect-video bg-white rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden shadow-inner group",
                            localPost.currentDesignUrl ? "cursor-zoom-in" : ""
                          )}
                        >
                          {localPost.currentDesignUrl ? (
                            <img src={localPost.currentDesignUrl} alt="Design" className="w-full h-full object-contain hover:scale-102 transition-transform duration-300" />
                          ) : (
                            <div className="text-center px-4">
                              <ImageIcon className="mx-auto text-gray-200 mb-2 animate-pulse" size={48} />
                              <p className="text-xs text-gray-400 font-medium tracking-tight">Suelta el diseño aquí o haz clic para subir</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Upload controls & Phase Action */}
                    <div className="flex flex-col justify-center gap-4">
                      {canEditDesign && (
                        <div className="w-full">
                          <input 
                            type="file"
                            multiple={localPost.format === 'carrusel'}
                            accept="image/*"
                            id="design-file-upload"
                            className="hidden"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (!files || files.length === 0) return;
                              
                              if (localPost.format === 'carrusel') {
                                processAndAppendCarousel(files);
                              } else {
                                processAndSetSingleDesign(files[0]);
                              }
                            }}
                          />
                          <label 
                            htmlFor="design-file-upload"
                            className="w-full bg-white text-app-accent border border-app-accent hover:bg-app-accent/5 px-6 py-4 rounded-xl font-semibold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm"
                          >
                            <Plus size={20} />
                            {localPost.format === 'carrusel' ? 'Añadir Diapositivas (Batch)' : 'Subir Nueva Creatividad'}
                          </label>
                        </div>
                      )}
                      
                      <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3 shadow-sm">
                         <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                           <span>Control de Proceso</span>
                           <span className="text-app-accent font-medium">Fase actual: {PHASES[localPost.phase].label}</span>
                         </div>
                         <button 
                            disabled={!canAdvancePhase}
                            onClick={nextPhase}
                            className="w-full bg-app-accent text-white hover:bg-app-accent-hover disabled:opacity-50 disabled:cursor-not-allowed px-6 py-4 rounded-xl font-semibold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-sm"
                          >
                           Avanzar a Siguiente Fase
                           <ChevronRight size={20} />
                         </button>
                         {localPost.phase === 'approved' && (
                           <p className="text-[10px] text-green-600 font-semibold text-center">✓ Post aprobado por el cliente</p>
                         )}
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'comments' && (
              <motion.div 
                key="comments"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col h-full max-h-[500px]"
              >
                <div className="flex-1 space-y-4 overflow-y-auto pr-2 mb-4 scrollbar-hide">
                  {comments.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                      <MessageSquare className="mx-auto mb-2 opacity-20" size={48} />
                      <p className="font-medium text-sm">Sin comentarios aún</p>
                      <p className="text-xs">Inicia el feedback aquí</p>
                    </div>
                  )}
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-app-accent/10 flex items-center justify-center text-app-accent font-bold text-xs shrink-0">
                        {comment.authorName[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900">{comment.authorName}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{comment.roleAtTime}</span>
                          <span className="text-[10px] text-gray-400">{format(comment.createdAt, 'HH:mm dd/MM')}</span>
                        </div>
                        <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none text-xs sm:text-sm text-gray-700">
                          {comment.text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100">
                  <div className="relative">
                    <input
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && commentText && (onAddComment(commentText), setCommentText(''))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-4 pr-12 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent"
                      placeholder="Escribe un comentario o feedback..."
                    />
                    <button 
                      onClick={() => commentText && (onAddComment(commentText), setCommentText(''))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-app-accent text-white rounded-xl hover:bg-app-accent-hover transition-all shadow-sm"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400 italic">Los clientes solo podrán ver comentarios públicos marcados para fase 5.</p>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {history.length === 0 && (
                   <div className="text-center py-20 text-gray-400">
                    <HistoryIcon className="mx-auto mb-2 opacity-20" size={48} />
                    <p className="font-medium text-sm">No hay versiones guardadas</p>
                  </div>
                )}
                {history.map((h, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-app-accent shadow-sm">
                        v{history.length - i}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Versión del {format(h.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                        <p className="text-xs text-gray-500">Editado por {h.authorName}</p>
                      </div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-2 text-app-accent font-bold text-xs hover:underline flex items-center gap-1 transition-opacity">
                      Restaurar Versión <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Expandable Lightbox Modal View */}
      <AnimatePresence>
        {zoomedImageUrl && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setZoomedImageUrl(null)}
          >
            <button 
              className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
              onClick={() => setZoomedImageUrl(null)}
            >
              <X size={32} />
            </button>
            <img 
              src={zoomedImageUrl} 
              alt="Ampliado" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
