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
  ChevronLeft,
  Plus,
  Trash2,
  Layers,
  Video,
  Film,
  Square,
  CheckSquare,
  Edit2,
  Save
} from 'lucide-react';
import { cn, PHASES, Phase, Role, ROLES, compressImage } from '../lib/utils';
import { InstagramIcon, TikTokIcon, LinkedInIcon } from './SocialIcons';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface InternalFeedback {
  id: string;
  authorName: string;
  role: string;
  text: string;
  createdAt: string;
}

interface VersionItem {
  id: string;
  value: string;
  createdAt: string;
  authorName: string;
  feedbacks: InternalFeedback[];
}

interface Comment {
  id: string;
  text: string;
  authorName: string;
  roleAtTime: string;
  createdAt: any;
}

interface FeedbackItem {
  id: string;
  text: string;
  authorName: string;
  roleAtTime: string;
  createdAt: any;
  done: boolean;
  doneAt?: any;
  doneBy?: string;
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
  captionVersions?: VersionItem[];
  creativityVersions?: VersionItem[];
  designVersions?: VersionItem[];
  videoUrl?: string;
  title?: string;
  language?: string;
}

interface PostModalProps {
  post: Post | null;
  onClose: () => void;
  onUpdate: (updates: Partial<Post>) => void;
  onDelete?: (postId: string) => void;
  userRole: Role;
  comments: Comment[];
  onAddComment: (text: string) => void;
  feedbacks: FeedbackItem[];
  onAddFeedback: (text: string) => void;
  onToggleFeedbackDone: (feedbackId: string, currentDone: boolean) => void;
  onUpdateFeedback?: (feedbackId: string, text: string) => void;
  onDeleteFeedback?: (feedbackId: string) => void;
  history: PostVersion[];
  projects?: any[];
}

interface VersionFeedbackControlProps {
  title: string;
  type: 'caption' | 'creativity' | 'design';
  currentValue: string;
  versions: VersionItem[] | undefined;
  isAgencyMember: boolean;
  onUpdatePost: (updates: Partial<Post>) => void;
  localPost: Post;
  accessibleUsers: any[];
}

function VersionFeedbackControl({
  title,
  type,
  currentValue,
  versions = [],
  isAgencyMember,
  onUpdatePost,
  localPost,
  accessibleUsers = []
}: VersionFeedbackControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
  const [activeMentionVersionId, setActiveMentionVersionId] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  
  if (!isAgencyMember) return null;

  const getMentionHandle = (user: any) => {
    if (user.email) {
      return user.email.split('@')[0];
    }
    return user.name.replace(/\s+/g, '').toLowerCase();
  };

  const handleInputChange = (text: string, versionId: string) => {
    setFeedbackInputs(prev => ({ ...prev, [versionId]: text }));

    const lastWord = text.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      const q = lastWord.substring(1);
      setMentionQuery(q);
      setActiveMentionVersionId(versionId);
    } else {
      setMentionQuery(null);
      setActiveMentionVersionId(null);
    }
  };

  const selectMentionUser = (user: any, versionId: string) => {
    const handle = getMentionHandle(user);
    const textState = feedbackInputs[versionId] || '';
    const words = textState.split(/\s+/);
    words.pop();
    words.push(`@${handle} `);
    const newText = words.join(' ');
    
    setFeedbackInputs(prev => ({ ...prev, [versionId]: newText }));
    setMentionQuery(null);
    setActiveMentionVersionId(null);
  };

  const filteredMentionUsers = mentionQuery !== null
    ? accessibleUsers.filter(u => 
        u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        getMentionHandle(u).toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : [];

  const fieldNameMap = {
    caption: 'captionVersions',
    creativity: 'creativityVersions',
    design: 'designVersions'
  } as const;

  const valueFieldNameMap = {
    caption: 'copyCaption',
    creativity: 'copyCreativity',
    design: 'currentDesignUrl'
  } as const;

  const fieldName = fieldNameMap[type];
  const valueFieldName = valueFieldNameMap[type];

  const handleSaveVersion = () => {
    if (!currentValue) {
      toast.error('No hay contenido para guardar en una versión');
      return;
    }
    
    // Check if already most recent version
    if (versions.length > 0 && versions[0].value === currentValue) {
      toast.error('Esta versión ya se encuentra guardada en el historial');
      return;
    }

    const newVersion: VersionItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      value: currentValue,
      createdAt: new Date().toISOString(),
      authorName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Miembro de Agencia',
      feedbacks: []
    };

    const updatedVersions = [newVersion, ...versions];
    onUpdatePost({
      ...localPost,
      [fieldName]: updatedVersions
    });
    toast.success('Versión guardada correctamente');
  };

  const handleRestoreVersion = (version: VersionItem) => {
    if (type === 'design') {
      if (localPost.format === 'carrusel') {
        let urls: string[] = [];
        try {
          if (version.value.startsWith('[')) {
            urls = JSON.parse(version.value);
          } else if (version.value) {
            urls = [version.value];
          }
        } catch (e) {
          if (version.value) urls = [version.value];
        }
        onUpdatePost({
          ...localPost,
          carouselUrls: urls
        });
      } else {
        onUpdatePost({
          ...localPost,
          currentDesignUrl: version.value
        });
      }
    } else {
      onUpdatePost({
        ...localPost,
        [valueFieldName]: version.value
      });
    }
    toast.success('Versión restaurada');
  };

  const handleAddFeedback = (versionId: string) => {
    const text = feedbackInputs[versionId]?.trim();
    if (!text) return;

    const newFeedback: InternalFeedback = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      authorName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Miembro de Agencia',
      role: 'Agencia',
      text,
      createdAt: new Date().toISOString()
    };

    const updatedVersions = versions.map(v => {
      if (v.id === versionId) {
        return {
          ...v,
          feedbacks: [...(v.feedbacks || []), newFeedback]
        };
      }
      return v;
    });

    onUpdatePost({
      ...localPost,
      [fieldName]: updatedVersions
    });

    setFeedbackInputs(prev => ({ ...prev, [versionId]: '' }));
    setActiveMentionVersionId(null);
    setMentionQuery(null);
    toast.success('Feedback interno registrado');
  };

  return (
    <div className="mt-2.5 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/50 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
          <span>🔒 Versiones y feedback interno ({versions.length})</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveVersion}
            className="whitespace-nowrap text-xs bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold px-3 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1 shrink-0"
            title="Capturar el estado actual en una versión"
          >
            💾 Guardar Versión
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="whitespace-nowrap text-xs text-app-accent hover:underline font-extrabold flex items-center gap-1 shrink-0"
          >
            {isOpen ? 'Ocultar Historial ▲' : 'Ver Historial ▼'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-slate-200 space-y-3 max-h-64 overflow-y-auto pr-1">
          {versions.length === 0 ? (
            <p className="text-center py-4 text-[11px] text-slate-400 italic">No hay versiones guardadas aún. Haz clic en "Guardar Versión" para registrar el estado actual.</p>
          ) : (
            versions.map((ver, idx) => {
              const displayIndex = versions.length - idx;
              return (
                <div key={ver.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-xs space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md mr-1.5">
                        v{displayIndex}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {ver.authorName} • {format(new Date(ver.createdAt), 'dd/MM HH:mm')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(ver)}
                      className="text-[10px] text-app-accent hover:text-app-accent-hover font-extrabold flex items-center gap-0.5"
                    >
                      Restaurar ↩
                    </button>
                  </div>

                  {/* Content Preview */}
                  <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-h-28 overflow-y-auto">
                    {type === 'design' ? (() => {
                      let urls: string[] = [];
                      let isCarousel = false;
                      try {
                        if (ver.value.startsWith('[')) {
                          urls = JSON.parse(ver.value);
                          isCarousel = true;
                        } else if (ver.value) {
                          urls = [ver.value];
                        }
                      } catch (e) {
                        if (ver.value) urls = [ver.value];
                      }

                      return (
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {urls.map((url, i) => (
                              <img 
                                key={i}
                                src={url} 
                                alt={`preview-${i}`} 
                                className="w-10 h-10 object-cover rounded border border-slate-200 shadow-xs" 
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {isCarousel ? `📊 Carrusel (${urls.length} diapositivas)` : '🖼️ Diseño'}
                          </span>
                        </div>
                      );
                    })() : (
                      <p className="whitespace-pre-line text-[11px] text-slate-600 font-medium leading-relaxed">{ver.value}</p>
                    )}
                  </div>

                  {/* Internal feedbacks on this version */}
                  <div className="space-y-1.5 pl-2 border-l-2 border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Comentarios internos:</span>
                    {ver.feedbacks?.map((fb) => (
                      <div key={fb.id} className="text-[11px] leading-relaxed bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                        <div className="flex items-baseline gap-1">
                          <span className="font-extrabold text-slate-800">{fb.authorName}</span>
                          <span className="text-[9px] text-slate-400 font-bold">({format(new Date(fb.createdAt), 'dd/MM HH:mm')})</span>
                        </div>
                        <p className="text-slate-600 mt-0.5 font-medium">{fb.text}</p>
                      </div>
                    ))}

                    {/* Add feedback input */}
                    <div className="flex gap-1.5 mt-2 relative">
                      {activeMentionVersionId === ver.id && filteredMentionUsers.length > 0 && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-36 overflow-y-auto divide-y divide-slate-100">
                          <div className="p-1.5 bg-slate-50 text-[10px] font-semibold text-slate-500">
                            Mencionar usuario:
                          </div>
                          {filteredMentionUsers.map(user => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => selectMentionUser(user, ver.id)}
                              className="w-full text-left p-2 hover:bg-slate-50 transition-colors flex items-center gap-2"
                            >
                              <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 text-[10px]">
                                {user.name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-gray-800 truncate">{user.name}</p>
                                <p className="text-[9px] text-gray-400 truncate">@{getMentionHandle(user)} • {user.role}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      <input
                        type="text"
                        placeholder="Escribir feedback o nota interna..."
                        value={feedbackInputs[ver.id] || ''}
                        onChange={(e) => handleInputChange(e.target.value, ver.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddFeedback(ver.id);
                          }
                        }}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:bg-white focus:border-app-accent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddFeedback(ver.id)}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function PostModal({ 
  post, 
  onClose, 
  onUpdate, 
  onDelete,
  userRole, 
  comments, 
  onAddComment,
  feedbacks = [],
  onAddFeedback,
  onToggleFeedbackDone,
  onUpdateFeedback,
  onDeleteFeedback,
  history,
  projects = []
}: PostModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'comments' | 'feedback'>('details');
  const [commentText, setCommentText] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [editingFeedbackText, setEditingFeedbackText] = useState('');
  const [localPost, setLocalPost] = useState<Post | null>(post);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTranslatingCopy, setIsTranslatingCopy] = useState(false);
  const [isTranslatingCaption, setIsTranslatingCaption] = useState(false);

  const handleTranslate = async (fieldType: 'copy' | 'caption') => {
    if (!localPost) return;
    
    const textToTranslate = fieldType === 'copy' ? localPost.copyCreativity : localPost.copyCaption;
    if (!textToTranslate || !textToTranslate.trim()) {
      toast.error('Por favor escribe un texto primero antes de traducir.');
      return;
    }

    const targetLangCode = localPost.language || 'es';
    const langNames: Record<string, string> = {
      es: 'castellano',
      en: 'inglés',
      ca: 'catalán',
      fr: 'francés',
      pt: 'portugués'
    };
    const targetLangName = langNames[targetLangCode] || 'castellano';

    if (fieldType === 'copy') {
      setIsTranslatingCopy(true);
    } else {
      setIsTranslatingCaption(true);
    }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToTranslate,
          targetLanguage: targetLangName,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor de traducción');
      }

      const data = await response.json();
      if (data.translatedText) {
        const updated = {
          ...localPost,
          [fieldType === 'copy' ? 'copyCreativity' : 'copyCaption']: data.translatedText,
        };
        setLocalPost(updated);
        onUpdate(updated);
        toast.success(`Traducido al ${targetLangName} con éxito ✨`);
      } else {
        throw new Error('Respuesta inválida del servidor de traducción');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Ocurrió un error al traducir el contenido');
    } finally {
      if (fieldType === 'copy') {
        setIsTranslatingCopy(false);
      } else {
        setIsTranslatingCaption(false);
      }
    }
  };

  const getFormattedDateForInput = (d: any) => {
    if (!d) return '';
    const dateObj = d instanceof Date ? d : (d?.toDate ? d.toDate() : new Date(d));
    if (isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && localPost) {
      const parts = val.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const newDate = new Date(year, month, day, 12, 0, 0);
      const updated = { ...localPost, date: newDate };
      setLocalPost(updated);
      onUpdate(updated);
      toast.success('Fecha del post actualizada correctamente');
    }
  };

  const displayDate = localPost?.date instanceof Date 
    ? localPost.date 
    : (localPost?.date?.toDate ? localPost.date.toDate() : (localPost?.date ? new Date(localPost.date) : new Date()));

  // User Mentions autocomplete state
  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    projectId?: string;
  }
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeMentionInput, setActiveMentionInput] = useState<'comment' | 'feedback' | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as User));
    });
    return () => unsub();
  }, []);

  const accessibleUsers = allUsers.filter(u => {
    if (!localPost || !localPost.projectId) return true;
    if (u.role !== 'client') return true;
    return u.projectId === localPost.projectId;
  });

  const getMentionHandle = (user: User) => {
    if (user.email) {
      return user.email.split('@')[0];
    }
    return user.name.replace(/\s+/g, '').toLowerCase();
  };

  const handleInputChange = (text: string, type: 'comment' | 'feedback') => {
    if (type === 'comment') {
      setCommentText(text);
    } else {
      setFeedbackText(text);
    }

    const lastWord = text.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      const q = lastWord.substring(1);
      setMentionQuery(q);
      setActiveMentionInput(type);
    } else {
      setMentionQuery(null);
      setActiveMentionInput(null);
    }
  };

  const selectMentionUser = (user: User) => {
    const handle = getMentionHandle(user);
    const textState = activeMentionInput === 'comment' ? commentText : feedbackText;
    const words = textState.split(/\s+/);
    words.pop();
    words.push(`@${handle} `);
    const newText = words.join(' ');
    
    if (activeMentionInput === 'comment') {
      setCommentText(newText);
    } else {
      setFeedbackText(newText);
    }
    setMentionQuery(null);
    setActiveMentionInput(null);
  };

  const filteredMentionUsers = mentionQuery !== null
    ? accessibleUsers.filter(u => 
        u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        getMentionHandle(u).toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : [];

  // Drag over states
  const [isDragOverReferences, setIsDragOverReferences] = useState(false);
  const [isDragOverCreativity, setIsDragOverCreativity] = useState(false);
  const [draggingSlideIdx, setDraggingSlideIdx] = useState<number | null>(null);

  const handleSlideDragStart = (e: React.DragEvent, index: number) => {
    if (!canEditDesign) return;
    setDraggingSlideIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleSlideDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!canEditDesign || draggingSlideIdx === null || draggingSlideIdx === index) return;
  };

  const handleSlideDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!canEditDesign || draggingSlideIdx === null || draggingSlideIdx === targetIndex) return;

    const urls = [...(localPost.carouselUrls || [])];
    const draggedUrl = urls[draggingSlideIdx];
    
    // Remove the dragged URL and insert it at the targetIndex
    urls.splice(draggingSlideIdx, 1);
    urls.splice(targetIndex, 0, draggedUrl);

    const updated = { ...localPost, carouselUrls: urls };
    setLocalPost(updated);
    onUpdate(updated);
    setDraggingSlideIdx(null);
    toast.success('Orden del carrusel actualizado');
  };

  const handleSlideDragEnd = () => {
    setDraggingSlideIdx(null);
  };

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
  const canGoBackPhase = isAgencyMember && localPost.phase !== 'idea_1';

  const handleUpdate = () => {
    if (!localPost) return;

    const hasChanged = 
      (localPost.title || '') !== (post.title || '') ||
      (localPost.language || '') !== (post.language || '') ||
      (localPost.idea || '') !== (post.idea || '') ||
      (localPost.copyCreativity || '') !== (post.copyCreativity || '') ||
      (localPost.copyCaption || '') !== (post.copyCaption || '') ||
      (localPost.currentDesignUrl || '') !== (post.currentDesignUrl || '') ||
      localPost.format !== post.format ||
      localPost.platform !== post.platform ||
      localPost.projectId !== post.projectId ||
      localPost.phase !== post.phase ||
      localPost.date?.toString() !== post.date?.toString() ||
      JSON.stringify(localPost.carouselUrls || []) !== JSON.stringify(post.carouselUrls || []) ||
      localPost.videoUrl !== post.videoUrl;

    if (hasChanged) {
      onUpdate(localPost);
    }
  };

  const nextPhase = () => {
    const phaseOrder: Phase[] = ['idea_1', 'copy', 'design', 'client_review', 'approved', 'published'];
    let currentIndex = phaseOrder.indexOf(localPost.phase);
    if (currentIndex === -1 && localPost.phase === 'idea_2') {
      currentIndex = 0;
    }
    if (currentIndex !== -1 && currentIndex < phaseOrder.length - 1) {
      const nextPh = phaseOrder[currentIndex + 1];
      const updated = { ...localPost, phase: nextPh };
      setLocalPost(updated);
      onUpdate(updated);
    }
  };

  const prevPhase = () => {
    const phaseOrder: Phase[] = ['idea_1', 'copy', 'design', 'client_review', 'approved', 'published'];
    let currentIndex = phaseOrder.indexOf(localPost.phase);
    if (currentIndex === -1 && localPost.phase === 'idea_2') {
      currentIndex = 1;
    }
    if (currentIndex > 0) {
      const prevPh = phaseOrder[currentIndex - 1];
      const updated = { ...localPost, phase: prevPh };
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
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
              <span className="flex items-center gap-1.5 font-extrabold">
                {localPost.platform === 'instagram' && <InstagramIcon size={20} className="text-[#E1306C]" />}
                {localPost.platform === 'linkedin' && <LinkedInIcon size={20} className="text-[#0A66C2]" />}
                {localPost.platform === 'tiktok' && <TikTokIcon size={20} className="text-zinc-900" />}
                <span className="capitalize">{localPost.platform}</span>
              </span>
              <span className="text-gray-350 font-normal mx-0.5">|</span>
              <span className="text-gray-600 font-medium text-lg">{format(displayDate, 'dd/MM/yyyy')}</span>
              {projectInfo && (
                <span 
                  className="px-2.5 py-0.5 text-white border rounded-full text-xs font-semibold shadow-sm ml-1.5"
                  style={{ backgroundColor: projectInfo.color || '#3b82f6', borderColor: 'transparent' }}
                >
                  {projectInfo.name}
                </span>
              )}
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {isAgencyMember && onDelete && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl p-1 animate-fade-in">
                  <span className="text-[11px] text-red-700 px-1.5 font-bold">¿Seguro?</span>
                  <button
                    onClick={() => {
                      if (localPost) {
                        onDelete(localPost.id);
                      }
                      setShowDeleteConfirm(false);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition-all"
                  >
                    Sí, eliminar
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-[11px] px-2.5 py-1 rounded-lg transition-all"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold animate-fade-in"
                  title="Eliminar post"
                >
                  <Trash2 size={18} />
                  <span className="hidden sm:inline">Eliminar Post</span>
                </button>
              )
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
            ...(userRole !== 'client' ? [{ id: 'comments', label: 'Comentarios', icon: MessageSquare, count: comments.length }] : []),
            { id: 'feedback', label: 'Feedback (Cliente)', icon: MessageSquare, count: feedbacks.length },
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Título del Post</label>
                      <input
                        type="text"
                        disabled={!canEditIdea}
                        value={localPost.title || ''}
                        onChange={e => {
                          const updated = { ...localPost, title: e.target.value };
                          setLocalPost(updated);
                        }}
                        onBlur={handleUpdate}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all text-sm font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
                        placeholder="Introduce un título descriptivo para la card..."
                      />
                    </section>

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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <section>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Plataforma</label>
                        {(() => {
                          const postProject = projects?.find(p => p.id === localPost?.projectId);
                          const activePlatforms = postProject && postProject.platforms ? postProject.platforms : ['instagram', 'linkedin', 'tiktok'];
                          const platformsToDisplay = Array.from(new Set(
                            localPost?.platform ? [localPost.platform, ...activePlatforms] : activePlatforms
                          ));
                          return (
                            <select
                              value={localPost?.platform}
                              onChange={e => {
                                if (localPost) {
                                  const updated = { ...localPost, platform: e.target.value as any };
                                  setLocalPost(updated);
                                  onUpdate(updated);
                                }
                              }}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all"
                            >
                              {platformsToDisplay.includes('instagram') && <option value="instagram">Instagram</option>}
                              {platformsToDisplay.includes('linkedin') && <option value="linkedin">LinkedIn</option>}
                              {platformsToDisplay.includes('tiktok') && <option value="tiktok">TikTok</option>}
                            </select>
                          );
                        })()}
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

                      <section>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha Programada</label>
                        <input
                          type="date"
                          disabled={!isAgencyMember}
                          value={getFormattedDateForInput(localPost.date)}
                          onChange={handleDateChange}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </section>
                    </div>

                    {/* Drag and Drop References Section */}
                    <section>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Referencias Visuales (Arrastra imágenes o añade URLs externas)
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
                               <img 
                                 src={ref} 
                                 alt="ref" 
                                 className="w-full h-full object-cover" 
                                 onError={(e) => {
                                   e.currentTarget.onerror = null;
                                   e.currentTarget.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
                                 }}
                               />
                               {ref.startsWith('http') && (
                                 <a 
                                   href={ref} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   onClick={(e) => e.stopPropagation()}
                                   className="absolute bottom-1 left-1 bg-black/60 text-white p-1 rounded hover:bg-black/85 transition-colors z-10"
                                   title="Abrir referencia en pestaña nueva"
                                 >
                                   <ExternalLink size={8} />
                                 </a>
                               )}
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
                                   className="absolute top-1 right-1 bg-white/95 hover:bg-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
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

                        {/* Direct URL Reference input */}
                        {!isClient && (
                          <div className="mt-2 pt-2 border-t border-gray-150/40 flex gap-2">
                            <input 
                              type="url"
                              placeholder="Pegar enlace de referencia externa..."
                              id="ref-url-input"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const target = e.currentTarget;
                                  const val = target.value.trim();
                                  if (val) {
                                    const currentRefs = localPost.references || [];
                                    const updated = { ...localPost, references: [...currentRefs, val] };
                                    setLocalPost(updated);
                                    onUpdate(updated);
                                    target.value = '';
                                  }
                                }
                              }}
                              className="flex-1 bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent/20 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById('ref-url-input') as HTMLInputElement;
                                const val = el?.value.trim();
                                if (val) {
                                  const currentRefs = localPost.references || [];
                                  const updated = { ...localPost, references: [...currentRefs, val] };
                                  setLocalPost(updated);
                                  onUpdate(updated);
                                  el.value = '';
                                }
                              }}
                              className="bg-app-accent hover:bg-app-accent-hover text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                            >
                              Añadir URL
                            </button>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    {/* Idioma de Trabajo / Traducción */}
                    <section className="bg-gray-50 border border-gray-200/60 rounded-xl p-3 flex items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🌎</span>
                        <div>
                          <label className="block text-xs font-bold text-gray-800">Idioma del Post</label>
                          <span className="block text-[10px] text-gray-500 font-medium">Selecciona el idioma objetivo</span>
                        </div>
                      </div>
                      <select
                        value={localPost.language || 'es'}
                        onChange={e => {
                          const updated = { ...localPost, language: e.target.value };
                          setLocalPost(updated);
                          onUpdate(updated);
                        }}
                        className="bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all cursor-pointer shadow-sm"
                      >
                        <option value="es">🇪🇸 Castellano</option>
                        <option value="en">🇬🇧 Inglés</option>
                        <option value="ca">🟨 Catalán</option>
                        <option value="fr">🇫🇷 Francés</option>
                        <option value="pt">🇵🇹 Portugués</option>
                      </select>
                    </section>

                    <section>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-gray-700">Copy en la Creatividad (Diseños)</label>
                        <button
                          type="button"
                          onClick={() => handleTranslate('copy')}
                          disabled={isTranslatingCopy || !localPost.copyCreativity}
                          className="text-[11px] font-bold text-app-accent hover:text-app-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all bg-app-accent/5 hover:bg-app-accent/10 px-2 py-1 rounded-lg"
                          title="Traducir el texto de la creatividad al idioma seleccionado"
                        >
                          {isTranslatingCopy ? 'Traduciendo...' : '🪄 Traducir'}
                        </button>
                      </div>
                      <textarea
                        disabled={!canEditCopy}
                        value={localPost.copyCreativity}
                        onChange={e => setLocalPost({...localPost, copyCreativity: e.target.value})}
                        onBlur={handleUpdate}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all resize-none h-24 text-sm"
                        placeholder="Texto que aparecerá dentro del diseño..."
                      />
                      <VersionFeedbackControl
                        title="Copy de la Creatividad"
                        type="creativity"
                        currentValue={localPost.copyCreativity}
                        versions={localPost.creativityVersions}
                        isAgencyMember={userRole !== 'client'}
                        onUpdatePost={onUpdate}
                        localPost={localPost}
                        accessibleUsers={accessibleUsers}
                      />
                    </section>

                    <section>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-gray-700">Post Caption (Texto de Publicación)</label>
                        <button
                          type="button"
                          onClick={() => handleTranslate('caption')}
                          disabled={isTranslatingCaption || !localPost.copyCaption}
                          className="text-[11px] font-bold text-app-accent hover:text-app-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all bg-app-accent/5 hover:bg-app-accent/10 px-2 py-1 rounded-lg"
                          title="Traducir el pie de publicación al idioma seleccionado"
                        >
                          {isTranslatingCaption ? 'Traduciendo...' : '🪄 Traducir'}
                        </button>
                      </div>
                      <textarea
                        disabled={!canEditCopy}
                        value={localPost.copyCaption}
                        onChange={e => setLocalPost({...localPost, copyCaption: e.target.value})}
                        onBlur={handleUpdate}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all resize-none h-36 text-sm"
                        placeholder="Escribe el caption definitivo..."
                      />
                      <VersionFeedbackControl
                        title="Post Caption"
                        type="caption"
                        currentValue={localPost.copyCaption}
                        versions={localPost.captionVersions}
                        isAgencyMember={userRole !== 'client'}
                        onUpdatePost={onUpdate}
                        localPost={localPost}
                        accessibleUsers={accessibleUsers}
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
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-500 block">Carrusel Slides:</span>
                            {canEditDesign && localPost.carouselUrls && localPost.carouselUrls.length > 1 && (
                              <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full animate-pulse shrink-0">
                                ↔ Arrastra para reordenar
                              </span>
                            )}
                          </div>
                          {localPost.carouselUrls && localPost.carouselUrls.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                              {localPost.carouselUrls.map((url, idx) => (
                                <div 
                                  key={idx} 
                                  draggable={canEditDesign}
                                  onDragStart={(e) => handleSlideDragStart(e, idx)}
                                  onDragOver={(e) => handleSlideDragOver(e, idx)}
                                  onDrop={(e) => handleSlideDrop(e, idx)}
                                  onDragEnd={handleSlideDragEnd}
                                  onClick={() => setZoomedImageUrl(url)}
                                  className={cn(
                                    "group relative aspect-square bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-zoom-in hover:scale-105 transition-all duration-200",
                                    draggingSlideIdx === idx ? "opacity-30 border-app-accent border-2 scale-95" : "cursor-grab active:cursor-grabbing",
                                    canEditDesign ? "hover:border-app-accent/50" : ""
                                  )}
                                >
                                  <img src={url} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover select-none pointer-events-none" />
                                  <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-bold text-white select-none">
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
                           <span className="text-app-accent font-medium">Fase actual: {PHASES[localPost.phase]?.label || localPost.phase}</span>
                         </div>
                         <div className="flex gap-2">
                           <button 
                              disabled={!canGoBackPhase}
                              onClick={prevPhase}
                              className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2.5 rounded-xl font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 text-xs"
                            >
                             <ChevronLeft size={16} />
                             Fase Anterior
                           </button>
                           <button 
                              disabled={!canAdvancePhase}
                              onClick={nextPhase}
                              className="flex-[1.5] bg-app-accent text-white hover:bg-app-accent-hover disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2.5 rounded-xl font-semibold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 text-xs"
                            >
                             Siguiente Fase
                             <ChevronRight size={16} />
                           </button>
                         </div>
                         {localPost.phase === 'approved' && (
                           <p className="text-[10px] text-green-600 font-semibold text-center">✓ Post aprobado por el cliente</p>
                         )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <VersionFeedbackControl
                      title="Creatividad Visual"
                      type="design"
                      currentValue={
                        localPost.format === 'carrusel'
                          ? JSON.stringify(localPost.carouselUrls || [])
                          : (localPost.currentDesignUrl || '')
                      }
                      versions={localPost.designVersions}
                      isAgencyMember={userRole !== 'client'}
                      onUpdatePost={onUpdate}
                      localPost={localPost}
                      accessibleUsers={accessibleUsers}
                    />
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
                          <span className="text-[11px] font-semibold text-gray-400">{comment.roleAtTime}</span>
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
                    {/* Autocomplete Suggestion Dropdown */}
                    {activeMentionInput === 'comment' && filteredMentionUsers.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-gray-100">
                        <div className="p-2 bg-gray-50 text-[11px] font-bold text-gray-400">
                          Mencionar usuario del proyecto:
                        </div>
                        {filteredMentionUsers.map(user => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => selectMentionUser(user)}
                            className="w-full text-left p-2.5 hover:bg-gray-50 transition-colors flex items-center gap-2.5"
                          >
                            <div className="w-6 h-6 rounded-full bg-app-accent/10 flex items-center justify-center font-bold text-app-accent text-xs">
                              {user.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-800 truncate">{user.name}</p>
                              <p className="text-[10px] text-gray-400 font-medium truncate">@{getMentionHandle(user)} • {user.role}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <input
                      value={commentText}
                      onChange={e => handleInputChange(e.target.value, 'comment')}
                      onKeyDown={e => e.key === 'Enter' && commentText && (onAddComment(commentText), setCommentText(''), setActiveMentionInput(null))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-4 pr-12 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent"
                      placeholder="Escribe un comentario o feedback..."
                    />
                    <button 
                      onClick={() => commentText && (onAddComment(commentText), setCommentText(''), setActiveMentionInput(null))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-app-accent text-white rounded-xl hover:bg-app-accent-hover transition-all shadow-sm"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400 italic">Los clientes solo podrán ver comentarios públicos marcados para fase 5.</p>
                </div>
              </motion.div>
            )}

            {activeTab === 'feedback' && (
              <motion.div 
                key="feedback"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col h-full max-h-[500px]"
              >
                <div className="flex-1 space-y-4 overflow-y-auto pr-2 mb-4 scrollbar-hide">
                  {feedbacks.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                      <MessageSquare className="mx-auto mb-2 opacity-20" size={48} />
                      <p className="font-medium text-sm">Sin feedback del cliente aún</p>
                      <p className="text-xs">Los comentarios del cliente se registran aquí para su seguimiento</p>
                    </div>
                  )}
                  {feedbacks.map((f) => (
                    <div key={f.id} className={cn("flex gap-3 p-3 rounded-2xl border transition-all relative group", f.done ? "bg-gray-50/50 border-gray-100 opacity-60" : "bg-white border-gray-100 shadow-sm")}>
                      <button 
                        onClick={() => onToggleFeedbackDone(f.id, f.done)}
                        className="p-1 rounded-lg text-gray-400 hover:text-blue-600 transition-colors shrink-0 self-start"
                        title={f.done ? "Marcar como pendiente" : "Marcar como hecho"}
                      >
                        {f.done ? (
                          <CheckSquare className="text-green-600" size={20} />
                        ) : (
                          <Square size={20} className="text-gray-300 hover:text-gray-500" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-900">{f.authorName}</span>
                            <span className="text-[9px] bg-blue-50 text-blue-600 font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">{f.roleAtTime}</span>
                            <span className="text-[10px] text-gray-400">
                              {f.createdAt instanceof Date ? format(f.createdAt, 'HH:mm dd/MM') : 'Ahora'}
                            </span>
                          </div>
                          
                          {/* Edit / Delete Buttons on Hover / Action */}
                          {editingFeedbackId !== f.id && (
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFeedbackId(f.id);
                                  setEditingFeedbackText(f.text);
                                }}
                                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                title="Editar feedback"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('¿Estás seguro de que deseas eliminar este feedback?') && onDeleteFeedback) {
                                    onDeleteFeedback(f.id);
                                  }
                                }}
                                className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Eliminar feedback"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>

                        {editingFeedbackId === f.id ? (
                          <div className="mt-1 space-y-2">
                            <textarea
                              value={editingFeedbackText}
                              onChange={(e) => setEditingFeedbackText(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent resize-y"
                              rows={2}
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingFeedbackId(null)}
                                className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingFeedbackText.trim() && onUpdateFeedback) {
                                    onUpdateFeedback(f.id, editingFeedbackText.trim());
                                    setEditingFeedbackId(null);
                                  }
                                }}
                                className="px-3 py-1 bg-app-accent text-white rounded-lg text-xs font-semibold hover:bg-app-accent-hover transition-colors flex items-center gap-1"
                              >
                                <Save size={12} />
                                Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={cn("text-xs sm:text-sm text-gray-700", f.done && "line-through text-gray-400 font-medium")}>
                            {f.text}
                          </div>
                        )}

                        {f.done && f.doneBy && (
                          <p className="text-[10px] text-green-600 font-extrabold mt-1.5 flex items-center gap-1">
                            ✓ Hecho por {f.doneBy}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100">
                  <div className="relative">
                    {/* Autocomplete Suggestion Dropdown */}
                    {activeMentionInput === 'feedback' && filteredMentionUsers.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-gray-100">
                        <div className="p-2 bg-gray-50 text-[11px] font-bold text-gray-400">
                          Mencionar usuario del proyecto:
                        </div>
                        {filteredMentionUsers.map(user => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => selectMentionUser(user)}
                            className="w-full text-left p-2.5 hover:bg-gray-50 transition-colors flex items-center gap-2.5"
                          >
                            <div className="w-6 h-6 rounded-full bg-app-accent/10 flex items-center justify-center font-bold text-app-accent text-xs">
                              {user.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-800 truncate">{user.name}</p>
                              <p className="text-[10px] text-gray-400 font-medium truncate">@{getMentionHandle(user)} • {user.role}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <input
                      value={feedbackText}
                      onChange={e => handleInputChange(e.target.value, 'feedback')}
                      onKeyDown={e => e.key === 'Enter' && feedbackText && (onAddFeedback(feedbackText), setFeedbackText(''), setActiveMentionInput(null))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-4 pr-12 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent"
                      placeholder="Escribe una solicitud de feedback para el cliente..."
                    />
                    <button 
                      onClick={() => feedbackText && (onAddFeedback(feedbackText), setFeedbackText(''), setActiveMentionInput(null))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-app-accent text-white rounded-xl hover:bg-app-accent-hover transition-all shadow-sm"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400">Los elementos de feedback tienen checkboxes interactivos para marcar tareas como resueltas.</p>
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setZoomedImageUrl(null);
            }}
          >
            <button 
              className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
              onClick={(e) => {
                e.stopPropagation();
                setZoomedImageUrl(null);
              }}
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
