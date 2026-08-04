import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  History as HistoryIcon, 
  MessageSquare, 
  Image as ImageIcon,
  CheckCircle,
  Lightbulb,
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
  Save,
  Copy
} from 'lucide-react';
import { cn, PHASES, Phase, Role, ROLES, compressImage, isVideoUrl } from '../lib/utils';
import { useModalA11y } from '../lib/useModalA11y';
import { PlatformBadge } from './SocialIcons';
import ConfirmInline from './ConfirmInline';
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
  authorId?: string;
  authorName: string;
  roleAtTime: string;
  createdAt: any;
  done: boolean;
  doneAt?: any;
  doneBy?: string;
}

type VersionType = 'caption' | 'creativity' | 'design';

interface Post {
  id: string;
  date: any;
  platform: 'instagram' | 'linkedin' | 'tiktok';
  phase: Phase;
  idea: string;
  references: string[];
  copyCreativity: string;
  copyCaption: string;
  translationEnabled?: boolean;
  copyCreativityTranslated?: string;
  copyCaptionTranslated?: string;
  currentDesignUrl: string;
  reelCoverUrl?: string;
  format?: 'estatico' | 'reel' | 'carrusel';
  carouselUrls?: string[];
  projectId?: string;
  captionVersions?: VersionItem[];
  creativityVersions?: VersionItem[];
  designVersions?: VersionItem[];
  videoUrl?: string;
  title?: string;
  language?: string;
  territory?: string;
  assigneeId?: string;
  assigneeName?: string;
  changesRequestedReason?: string;
  changesRequestedAt?: string;
  changesRequestedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
}

interface PostModalProps {
  post: Post | null;
  onClose: () => void;
  onUpdate: (updates: Partial<Post>) => void;
  onDelete?: (postId: string) => void;
  onDuplicate?: (post: Post) => void;
  userRole: Role;
  comments: Comment[];
  onAddComment: (text: string) => void;
  feedbacks: FeedbackItem[];
  onAddFeedback: (text: string) => void;
  onToggleFeedbackDone: (feedbackId: string, currentDone: boolean) => void;
  onUpdateFeedback?: (feedbackId: string, text: string) => void;
  onDeleteFeedback?: (feedbackId: string) => void;
  projects?: any[];
  initialTab?: 'comments' | 'feedback';
}

interface VersionFeedbackControlProps {
  type: VersionType;
  currentValue: string;
  versions: VersionItem[] | undefined;
  isAgencyMember: boolean;
  onUpdatePost: (updates: Partial<Post>) => void;
  localPost: Post;
}

const VERSION_FIELD_NAME: Record<VersionType, 'captionVersions' | 'creativityVersions' | 'designVersions'> = {
  caption: 'captionVersions',
  creativity: 'creativityVersions',
  design: 'designVersions'
};

// Design versions store full (compressed) image/video data inline on the post
// document, which counts against Firestore's 1MB per-document limit. Text
// versions are cheap, so only design needs a tight cap to stay safely under it.
const MAX_VERSIONS_BY_TYPE: Record<VersionType, number> = {
  design: 3,
  caption: 30,
  creativity: 30
};

function makeVersionSnapshot(value: string): VersionItem {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    value,
    createdAt: new Date().toISOString(),
    authorName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Miembro de Agencia',
    feedbacks: []
  };
}

/** Only responsible for capturing a snapshot of the current field into its version array. Viewing, restoring and commenting on versions all happen in the unified "Historial" tab. */
function SaveVersionButton({ type, currentValue, versions = [], isAgencyMember, onUpdatePost, localPost }: VersionFeedbackControlProps) {
  if (!isAgencyMember) return null;

  const fieldName = VERSION_FIELD_NAME[type];

  const handleSaveVersion = () => {
    if (!currentValue) {
      toast.error('No hay contenido para guardar en una versión');
      return;
    }
    if (versions.length > 0 && versions[0].value === currentValue) {
      toast.error('Esta versión ya se encuentra guardada en el historial');
      return;
    }
    // Keep the array bounded so a single post document never approaches
    // Firestore's 1MB limit, no matter how many versions get saved over time.
    const trimmedVersions = versions.slice(0, MAX_VERSIONS_BY_TYPE[type] - 1);
    onUpdatePost({
      ...localPost,
      [fieldName]: [makeVersionSnapshot(currentValue), ...trimmedVersions]
    });
    toast.success('Versión guardada correctamente');
  };

  return (
    <button
      type="button"
      onClick={handleSaveVersion}
      className="mt-2 text-xs bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
      title="Capturar el estado actual como una versión en el Historial"
    >
      💾 Guardar Versión
      {versions.length > 0 && (
        <span className="text-[11px] text-slate-400 font-semibold">({versions.length} guardada{versions.length !== 1 ? 's' : ''})</span>
      )}
    </button>
  );
}

interface HistoryEntry {
  type: VersionType;
  version: VersionItem;
  versionNumber: number;
}

const VERSION_TYPE_META: Record<VersionType, { label: string; badgeClass: string; dotClass: string }> = {
  creativity: { label: 'COPY', badgeClass: 'text-violet-700 bg-violet-50', dotClass: 'border-violet-600' },
  caption: { label: 'CAPTION', badgeClass: 'text-sky-700 bg-sky-50', dotClass: 'border-sky-600' },
  design: { label: 'DISEÑO', badgeClass: 'text-pink-700 bg-pink-50', dotClass: 'border-pink-600' }
};

interface HistoryEntryCardProps {
  entry: HistoryEntry;
  isAgencyMember: boolean;
  accessibleUsers: any[];
  isConfirmingRestore: boolean;
  onRequestRestore: () => void;
  onConfirmRestore: () => void;
  onCancelRestore: () => void;
  onAddFeedback: (type: VersionType, versionId: string, text: string) => void;
}

function HistoryEntryCard({
  entry,
  isAgencyMember,
  accessibleUsers,
  isConfirmingRestore,
  onRequestRestore,
  onConfirmRestore,
  onCancelRestore,
  onAddFeedback
}: HistoryEntryCardProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const { type, version, versionNumber } = entry;
  const meta = VERSION_TYPE_META[type];

  const getMentionHandle = (user: any) => {
    if (user.email) return user.email.split('@')[0];
    return user.name.replace(/\s+/g, '').toLowerCase();
  };

  const handleInputChange = (text: string) => {
    setFeedbackText(text);
    const lastWord = text.split(/\s+/).pop() || '';
    setMentionQuery(lastWord.startsWith('@') ? lastWord.substring(1) : null);
  };

  const selectMentionUser = (user: any) => {
    const words = feedbackText.split(/\s+/);
    words.pop();
    words.push(`@${getMentionHandle(user)} `);
    setFeedbackText(words.join(' '));
    setMentionQuery(null);
  };

  const filteredMentionUsers = mentionQuery !== null
    ? accessibleUsers.filter(u =>
        u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        getMentionHandle(u).toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : [];

  const submitFeedback = () => {
    const text = feedbackText.trim();
    if (!text) return;
    onAddFeedback(type, version.id, text);
    setFeedbackText('');
    setMentionQuery(null);
  };

  const renderContent = () => {
    if (type === 'design') {
      let urls: string[] = [];
      let isCarousel = false;
      try {
        if (version.value.startsWith('[')) {
          urls = JSON.parse(version.value);
          isCarousel = true;
        } else if (version.value) {
          urls = [version.value];
        }
      } catch (e) {
        if (version.value) urls = [version.value];
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
          <span className="text-[11px] text-slate-400 font-semibold">
            {isCarousel ? `📊 Carrusel (${urls.length} diapositivas)` : '🖼️ Diseño'}
          </span>
        </div>
      );
    }
    return <p className="whitespace-pre-line text-[11px] text-slate-600 font-medium leading-relaxed">{version.value}</p>;
  };

  return (
    <div className="relative pl-5">
      <span className={cn("absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-white border-2", meta.dotClass)} />
      <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-xs space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("text-[11px] font-black px-2 py-0.5 rounded-md", meta.badgeClass)}>{meta.label}</span>
            <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">v{versionNumber}</span>
            <span className="text-[11px] font-bold text-slate-500">
              {version.authorName} • {format(new Date(version.createdAt), 'dd/MM HH:mm')}
            </span>
          </div>
          {isAgencyMember && !isConfirmingRestore && (
            <button
              type="button"
              onClick={onRequestRestore}
              className="text-[11px] text-app-accent hover:text-app-accent-hover font-extrabold flex items-center gap-0.5 shrink-0"
            >
              Restaurar ↩
            </button>
          )}
        </div>

        <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-h-28 overflow-y-auto">
          {renderContent()}
        </div>

        {isConfirmingRestore && (
          <ConfirmInline
            message="Restaurar sustituirá el contenido actual (tu borrador sin guardar se guardará antes, automáticamente)."
            confirmLabel="Restaurar"
            cancelLabel="Cancelar"
            tone="danger"
            onConfirm={onConfirmRestore}
            onCancel={onCancelRestore}
          />
        )}

        {isAgencyMember && (
          <div className="space-y-1.5 pl-2 border-l-2 border-slate-200">
            {version.feedbacks?.length > 0 && (
              <span className="text-[11px] font-bold text-slate-500 block mb-1">Comentarios internos:</span>
            )}
            {version.feedbacks?.map((fb) => (
              <div key={fb.id} className="text-[11px] leading-relaxed bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                <div className="flex items-baseline gap-1">
                  <span className="font-extrabold text-slate-800">{fb.authorName}</span>
                  <span className="text-[11px] text-slate-400 font-bold">({format(new Date(fb.createdAt), 'dd/MM HH:mm')})</span>
                </div>
                <p className="text-slate-600 mt-0.5 font-medium">{fb.text}</p>
              </div>
            ))}

            <div className="flex gap-1.5 mt-2 relative">
              {mentionQuery !== null && filteredMentionUsers.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-36 overflow-y-auto divide-y divide-slate-100">
                  <div className="p-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500">Mencionar usuario:</div>
                  {filteredMentionUsers.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => selectMentionUser(user)}
                      className="w-full text-left p-2 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <div className="w-5 h-5 rounded-full bg-app-accent-subtle flex items-center justify-center font-bold text-app-accent text-[11px]">
                        {user.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-gray-800 truncate">{user.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">@{getMentionHandle(user)} • {user.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <input
                type="text"
                placeholder="Escribir feedback o nota interna..."
                value={feedbackText}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitFeedback();
                  }
                }}
                className="flex-1 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1.5 text-xs outline-none focus:bg-white focus:border-app-accent transition-all"
              />
              <button
                type="button"
                onClick={submitFeedback}
                className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[11px] px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostModal({ 
  post, 
  onClose, 
  onUpdate,
  onDelete,
  onDuplicate,
  userRole,
  comments, 
  onAddComment,
  feedbacks = [],
  onAddFeedback,
  onToggleFeedbackDone,
  onUpdateFeedback,
  onDeleteFeedback,
  projects = [],
  initialTab
}: PostModalProps) {
  const [activeTab, setActiveTab] = useState<'idea' | 'production' | 'history' | 'comments' | 'feedback'>(
    initialTab || (userRole !== 'client' && post && post.phase === 'idea_1' ? 'idea' : 'production')
  );
  const [commentText, setCommentText] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [confirmingDeleteFeedbackId, setConfirmingDeleteFeedbackId] = useState<string | null>(null);
  const [editingFeedbackText, setEditingFeedbackText] = useState('');
  const [localPost, setLocalPost] = useState<Post | null>(post);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRequestChangesForm, setShowRequestChangesForm] = useState(false);
  const [changesRequestReason, setChangesRequestReason] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | VersionType>('all');
  const [confirmingRestoreKey, setConfirmingRestoreKey] = useState<string | null>(null);
  const modalContainerRef = useModalA11y(() => {
    // Escape doesn't blur the focused field, so title/idea/copy/caption
    // (which only autosave onBlur) would otherwise lose an unsaved draft.
    if (!zoomedImageUrl) handleCloseModal();
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

  // Only agency members can be the responsible/assignee for a post — clients
  // review and approve, they aren't the ones producing the content.
  const agencyUsers = allUsers.filter(u => u.role !== 'client' && u.role !== 'pending');

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
  const isClientApprovalAction = userRole === 'client' && localPost.phase === 'client_review';
  const isAgencyResumeAction = isAgencyMember && localPost.phase === 'changes_requested';

  const handleApprove = () => {
    const updated = {
      ...localPost,
      phase: 'approved' as Phase,
      approvedBy: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Cliente',
      approvedAt: new Date().toISOString()
    };
    setLocalPost(updated);
    onUpdate(updated);
  };

  const handleRequestChanges = () => {
    if (!changesRequestReason.trim()) {
      toast.error('Describe qué cambios necesitas antes de enviar');
      return;
    }
    const updated = {
      ...localPost,
      phase: 'changes_requested' as Phase,
      changesRequestedReason: changesRequestReason.trim(),
      changesRequestedAt: new Date().toISOString(),
      changesRequestedBy: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Cliente'
    };
    setLocalPost(updated);
    onUpdate(updated);
    setShowRequestChangesForm(false);
    setChangesRequestReason('');
    toast.success('Cambios solicitados a la agencia');
  };

  const handleResumeProduction = () => {
    const updated = { ...localPost, phase: 'design' as Phase };
    setLocalPost(updated);
    onUpdate(updated);
    toast.success('Post reanudado en Diseño');
  };

  const buildHistoryEntries = (arr: VersionItem[] | undefined, type: VersionType): HistoryEntry[] =>
    (arr || []).map((version, i) => ({ type, version, versionNumber: (arr || []).length - i }));

  const historyEntries: HistoryEntry[] = [
    ...buildHistoryEntries(localPost.creativityVersions, 'creativity'),
    ...buildHistoryEntries(localPost.captionVersions, 'caption'),
    ...buildHistoryEntries(localPost.designVersions, 'design')
  ].sort((a, b) => new Date(b.version.createdAt).getTime() - new Date(a.version.createdAt).getTime());

  const filteredHistoryEntries = historyFilter === 'all'
    ? historyEntries
    : historyEntries.filter(e => e.type === historyFilter);

  const getCurrentValueForType = (type: VersionType): string => {
    if (type === 'caption') return localPost.copyCaption;
    if (type === 'creativity') return localPost.copyCreativity;
    return localPost.format === 'carrusel' ? JSON.stringify(localPost.carouselUrls || []) : (localPost.currentDesignUrl || '');
  };

  const handleAddVersionFeedback = (type: VersionType, versionId: string, text: string) => {
    const fieldName = VERSION_FIELD_NAME[type];
    const versions = (localPost[fieldName] || []) as VersionItem[];
    const newFeedback: InternalFeedback = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      authorName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Miembro de Agencia',
      role: 'Agencia',
      text,
      createdAt: new Date().toISOString()
    };
    const updatedVersions = versions.map(v => v.id === versionId ? { ...v, feedbacks: [...(v.feedbacks || []), newFeedback] } : v);
    const updated = { ...localPost, [fieldName]: updatedVersions };
    setLocalPost(updated);
    onUpdate(updated);
    toast.success('Feedback interno registrado');
  };

  const handleRestoreEntry = (entry: HistoryEntry) => {
    const { type, version } = entry;
    const fieldName = VERSION_FIELD_NAME[type];
    const existingVersions = (localPost[fieldName] || []) as VersionItem[];
    const currentValue = getCurrentValueForType(type);

    const updates: Partial<Post> = {};

    // Safety net: snapshot the unsaved draft before overwriting it, unless it's empty or already saved.
    if (currentValue && currentValue !== existingVersions[0]?.value) {
      const trimmedVersions = existingVersions.slice(0, MAX_VERSIONS_BY_TYPE[type] - 1);
      (updates as any)[fieldName] = [makeVersionSnapshot(currentValue), ...trimmedVersions];
    }

    if (type === 'design') {
      if (localPost.format === 'carrusel') {
        let urls: string[] = [];
        try {
          urls = version.value.startsWith('[') ? JSON.parse(version.value) : (version.value ? [version.value] : []);
        } catch (e) {
          if (version.value) urls = [version.value];
        }
        updates.carouselUrls = urls;
      } else {
        updates.currentDesignUrl = version.value;
      }
    } else if (type === 'caption') {
      updates.copyCaption = version.value;
    } else {
      updates.copyCreativity = version.value;
    }

    const updated = { ...localPost, ...updates };
    setLocalPost(updated);
    onUpdate(updated);
    toast.success('Versión restaurada');
    setConfirmingRestoreKey(null);
  };

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

  const handleCloseModal = () => {
    handleUpdate();
    onClose();
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
  const projectTerritories: string[] = projectInfo?.territories || [];
  const hasTerritories = projectTerritories.length > 0;

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
      return new Promise<string>((resolve, reject) => {
        if (file.size > 700 * 1024) {
          toast.error(`El archivo de referencia "${file.name}" supera el límite de 700KB. No se puede guardar en la base de datos.`);
          reject(new Error("File too large"));
          return;
        }
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
    }).catch(() => {
      // Error already shown in toast
    });
  };

  const processAndSetSingleDesign = (file: File) => {
    const isVideo = file.type.startsWith('video/') || isVideoUrl(file.name);
    if (isVideo && file.size > 700 * 1024) {
      toast.error('El video supera el límite de 700KB. Por favor, usa un video de menor tamaño/duración o pégalo como una URL externa (Google Drive, etc.).');
      return;
    }
    if (!isVideo && file.size > 15 * 1024 * 1024) {
      toast.error('La imagen original es demasiado grande (máximo 15MB).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      compressImage(reader.result as string).then(compressedUrl => {
        if (compressedUrl.length > 1000000) {
          toast.error('El diseño comprimido es demasiado grande para Firestore (>1MB). Intenta con una imagen de menor resolución.');
          return;
        }
        const updated = { ...localPost, currentDesignUrl: compressedUrl };
        setLocalPost(updated);
        onUpdate(updated);
      });
    };
    reader.readAsDataURL(file);
  };

  const processAndSetReelCover = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('La portada del reel debe ser una imagen.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('La imagen de portada es demasiado grande (máximo 15MB).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      // 1080x1350 (4:5) is Instagram's own recommended reel cover size.
      compressImage(reader.result as string, 1080, 1350).then(compressedUrl => {
        if (compressedUrl.length > 1000000) {
          toast.error('La portada comprimida es demasiado grande para Firestore (>1MB). Intenta con una imagen de menor resolución.');
          return;
        }
        const updated = { ...localPost, reelCoverUrl: compressedUrl };
        setLocalPost(updated);
        onUpdate(updated);
      });
    };
    reader.readAsDataURL(file);
  };

  const processAndAppendCarousel = (files: FileList) => {
    const promises = (Array.from(files) as File[]).map(file => {
      return new Promise<string>((resolve, reject) => {
        const isVideo = file.type.startsWith('video/') || isVideoUrl(file.name);
        if (isVideo && file.size > 700 * 1024) {
          toast.error(`El archivo "${file.name}" supera el límite de 700KB para carruseles de Firestore.`);
          reject(new Error("File too large"));
          return;
        }
        if (!isVideo && file.size > 15 * 1024 * 1024) {
          toast.error(`La imagen "${file.name}" supera el límite de 15MB.`);
          reject(new Error("File too large"));
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          compressImage(reader.result as string).then(compressedUrl => {
            if (compressedUrl.length > 1000000) {
              toast.error(`El archivo "${file.name}" sigue siendo muy grande después de comprimir.`);
              reject(new Error("File too large"));
              return;
            }
            resolve(compressedUrl);
          });
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
    }).catch(() => {
      // Error already shown in toast
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer"
      onClick={handleCloseModal}
    >
      <motion.div
        ref={modalContainerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-modal-title"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden cursor-default outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4 flex-wrap">
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm",
              PHASES[localPost.phase].color
            )}>
              <Clock size={12} />
              {PHASES[localPost.phase].label}
            </div>
            <h3 id="post-modal-title" className="text-xl font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
              <PlatformBadge platform={localPost.platform} size={20} showLabel className="font-extrabold" />
              <span className="text-gray-300 font-normal mx-0.5">|</span>
              <span className="text-gray-600 font-medium text-lg">{format(displayDate, 'dd/MM/yyyy')}</span>
              {projectInfo && (
                <span 
                  className="px-2.5 py-0.5 text-white border rounded-full text-xs font-semibold shadow-sm ml-1.5"
                  style={{ backgroundColor: projectInfo.color || '#4F46E5', borderColor: 'transparent' }}
                >
                  {projectInfo.name}
                </span>
              )}
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {isAgencyMember && onDuplicate && (
              <button
                onClick={() => localPost && onDuplicate(localPost)}
                className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-700 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                title="Duplicar post"
                aria-label="Duplicar post"
              >
                <Copy size={18} />
                <span className="hidden sm:inline">Duplicar</span>
              </button>
            )}
            {isAgencyMember && onDelete && (
              showDeleteConfirm ? (
                <ConfirmInline
                  message="¿Seguro?"
                  onConfirm={() => {
                    if (localPost) {
                      onDelete(localPost.id);
                    }
                    setShowDeleteConfirm(false);
                  }}
                  onCancel={() => setShowDeleteConfirm(false)}
                />
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold animate-fade-in"
                  title="Eliminar post"
                  aria-label="Eliminar post"
                >
                  <Trash2 size={18} />
                  <span className="hidden sm:inline">Eliminar Post</span>
                </button>
              )
            )}
            <button
              onClick={handleCloseModal}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              aria-label="Cerrar"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Generic fields: apply to the post as a whole, independent of the active tab */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 shrink-0 space-y-3">
          <section>
            <label htmlFor="post-title-input" className="block text-xs font-semibold text-gray-500 mb-1">Título del Post</label>
            <input
              id="post-title-input"
              type="text"
              disabled={!canEditIdea}
              value={localPost.title || ''}
              onChange={e => setLocalPost({ ...localPost, title: e.target.value })}
              onBlur={handleUpdate}
              className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all text-sm font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
              placeholder="Introduce un título descriptivo para la card..."
            />
          </section>

          <div className={cn(
            "grid grid-cols-2 gap-3",
            (hasTerritories && isAgencyMember) ? "sm:grid-cols-6" : (hasTerritories || isAgencyMember) ? "sm:grid-cols-5" : "sm:grid-cols-4"
          )}>
            <section>
              <label htmlFor="post-platform-select" className="block text-xs font-semibold text-gray-500 mb-1">Plataforma</label>
              {(() => {
                const postProject = projects?.find(p => p.id === localPost?.projectId);
                const activePlatforms = postProject && postProject.platforms ? postProject.platforms : ['instagram', 'linkedin', 'tiktok'];
                const platformsToDisplay = Array.from(new Set(
                  localPost?.platform ? [localPost.platform, ...activePlatforms] : activePlatforms
                ));
                return (
                  <select
                    id="post-platform-select"
                    value={localPost?.platform}
                    onChange={e => {
                      if (localPost) {
                        const updated = { ...localPost, platform: e.target.value as any };
                        setLocalPost(updated);
                        onUpdate(updated);
                      }
                    }}
                    className="w-full bg-white border border-gray-200 rounded-md p-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all"
                  >
                    {platformsToDisplay.includes('instagram') && <option value="instagram">Instagram</option>}
                    {platformsToDisplay.includes('linkedin') && <option value="linkedin">LinkedIn</option>}
                    {platformsToDisplay.includes('tiktok') && <option value="tiktok">TikTok</option>}
                  </select>
                );
              })()}
            </section>

            <section>
              <label htmlFor="post-format-select" className="block text-xs font-semibold text-gray-500 mb-1">Formato</label>
              <select
                id="post-format-select"
                value={localPost.format || 'estatico'}
                onChange={e => {
                  const updated = { ...localPost, format: e.target.value as any };
                  setLocalPost(updated);
                  onUpdate(updated);
                }}
                className="w-full bg-white border border-gray-200 rounded-md p-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all"
              >
                <option value="estatico">Estático (Imagen única)</option>
                <option value="reel">{localPost.platform === 'linkedin' ? 'Reel / Video (Horizontal)' : 'Reel / Video (Vertical)'}</option>
                <option value="carrusel">Carrusel (Múltiples Diapositivas)</option>
              </select>
              {localPost.format === 'reel' && (
                <p className="text-[11px] text-gray-400 mt-1">
                  {localPost.platform === 'linkedin'
                    ? 'Tamaño recomendado: 1920x1080 (horizontal).'
                    : 'Tamaño recomendado: 1080x1920 (vertical).'}
                </p>
              )}
            </section>

            <section>
              <label htmlFor="post-date-input" className="block text-xs font-semibold text-gray-500 mb-1">Fecha Programada</label>
              <input
                id="post-date-input"
                type="date"
                disabled={!isAgencyMember}
                value={getFormattedDateForInput(localPost.date)}
                onChange={handleDateChange}
                className="w-full bg-white border border-gray-200 rounded-md p-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed"
              />
            </section>

            <section>
              <label htmlFor="post-language-select" className="block text-xs font-semibold text-gray-500 mb-1">Idioma del Post</label>
              <select
                id="post-language-select"
                value={localPost.language || 'es'}
                onChange={e => {
                  const updated = { ...localPost, language: e.target.value };
                  setLocalPost(updated);
                  onUpdate(updated);
                }}
                className="w-full bg-white border border-gray-200 rounded-md p-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all cursor-pointer"
              >
                <option value="es">🇪🇸 Castellano</option>
                <option value="en">🇬🇧 Inglés</option>
                <option value="ca">🟨 Catalán</option>
                <option value="fr">🇫🇷 Francés</option>
                <option value="pt">🇵🇹 Portugués</option>
              </select>
            </section>

            {hasTerritories && (
              <section>
                <label htmlFor="post-territory-select" className="block text-xs font-semibold text-gray-500 mb-1">Territorio</label>
                <select
                  id="post-territory-select"
                  value={localPost.territory || ''}
                  onChange={e => {
                    const updated = { ...localPost, territory: e.target.value };
                    setLocalPost(updated);
                    onUpdate(updated);
                  }}
                  className="w-full bg-white border border-gray-200 rounded-md p-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all"
                >
                  <option value="">Sin especificar</option>
                  {projectTerritories.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </section>
            )}

            {isAgencyMember && (
              <section>
                <label htmlFor="post-assignee-select" className="block text-xs font-semibold text-gray-500 mb-1">Responsable</label>
                <select
                  id="post-assignee-select"
                  value={localPost.assigneeId || ''}
                  onChange={e => {
                    const selected = agencyUsers.find(u => u.id === e.target.value);
                    const updated = { ...localPost, assigneeId: selected?.id || '', assigneeName: selected?.name || '' };
                    setLocalPost(updated);
                    onUpdate(updated);
                  }}
                  className="w-full bg-white border border-gray-200 rounded-md p-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all"
                >
                  <option value="">Sin asignar</option>
                  {agencyUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </section>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4 pt-2 bg-gray-50/60 gap-1 shrink-0">
          {[
            // La Idea and Historial expose internal drafts, versions and rationale that
            // the client is never meant to see — only agency roles get these two tabs.
            ...(userRole !== 'client' ? [{ id: 'idea', label: 'La Idea', icon: Lightbulb }] : []),
            { id: 'production', label: 'Producción', icon: CheckCircle },
            ...(userRole !== 'client' ? [{ id: 'comments', label: 'Comentarios', icon: MessageSquare, count: comments.length }] : []),
            { id: 'feedback', label: 'Feedback (Cliente)', icon: MessageSquare, count: feedbacks.length },
            ...(userRole !== 'client' ? [{ id: 'history', label: 'Historial', icon: HistoryIcon, count: historyEntries.length }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "py-3 px-4 border-b-[3px] transition-all flex items-center gap-2 text-sm rounded-t-lg",
                activeTab === tab.id
                  ? "border-app-accent text-app-accent font-bold bg-white shadow-[0_-1px_4px_rgba(24,24,27,0.04)]"
                  : "border-transparent text-gray-500 font-semibold hover:text-gray-700 hover:bg-white/60"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.count !== undefined && (
                <span className="bg-gray-100 text-gray-600 text-[11px] px-1.5 py-0.5 rounded-full ml-1">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
          <AnimatePresence mode="wait">
            {activeTab === 'idea' && (
              <motion.div
                key="idea"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6 max-w-3xl"
              >
                <section>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">La Idea</label>
                  <textarea
                    disabled={!canEditIdea}
                    value={localPost.idea}
                    onChange={e => setLocalPost({...localPost, idea: e.target.value})}
                    onBlur={handleUpdate}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md p-4 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all resize-none h-40 text-sm"
                    placeholder="Describe la idea central del post..."
                  />
                </section>

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
                               aria-label="Quitar referencia"
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
                            <span className="text-[11px] font-semibold">Subir</span>
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
                      <div className="mt-2 pt-2 border-t border-gray-100/40 flex gap-2">
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
                          className="flex-1 bg-white border border-gray-200 rounded-md py-1.5 px-3 text-xs outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent/20 transition-all"
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
              </motion.div>
            )}

            {activeTab === 'production' && (
              <motion.div
                key="production"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Traducción</p>
                    <p className="text-[11px] text-gray-400">Activa campos aparte para el copy y el caption traducidos manualmente.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!localPost.translationEnabled}
                    aria-label="Traducción"
                    disabled={!canEditCopy}
                    onClick={() => {
                      const updated = { ...localPost, translationEnabled: !localPost.translationEnabled };
                      setLocalPost(updated);
                      onUpdate(updated);
                    }}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                      localPost.translationEnabled ? "bg-app-accent" : "bg-gray-200"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      localPost.translationEnabled ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <section>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Copy en la Creatividad (Diseños)</label>
                    <textarea
                      disabled={!canEditCopy}
                      value={localPost.copyCreativity}
                      onChange={e => setLocalPost({...localPost, copyCreativity: e.target.value})}
                      onBlur={handleUpdate}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md p-4 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all resize-none h-24 text-sm"
                      placeholder="Texto que aparecerá dentro del diseño..."
                    />
                    <SaveVersionButton
                      type="creativity"
                      currentValue={localPost.copyCreativity}
                      versions={localPost.creativityVersions}
                      isAgencyMember={userRole !== 'client'}
                      onUpdatePost={onUpdate}
                      localPost={localPost}
                    />
                    {localPost.translationEnabled && (
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Copy en la Creatividad (Traducido)</label>
                        <textarea
                          disabled={!canEditCopy}
                          value={localPost.copyCreativityTranslated || ''}
                          onChange={e => setLocalPost({...localPost, copyCreativityTranslated: e.target.value})}
                          onBlur={handleUpdate}
                          className="w-full bg-gray-50 border border-gray-200 rounded-md p-4 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all resize-none h-24 text-sm"
                          placeholder="Traducción manual del texto de la creatividad..."
                        />
                      </div>
                    )}
                  </section>

                  <section>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Post Caption (Texto de Publicación)</label>
                    <textarea
                      disabled={!canEditCopy}
                      value={localPost.copyCaption}
                      onChange={e => setLocalPost({...localPost, copyCaption: e.target.value})}
                      onBlur={handleUpdate}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md p-4 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all resize-none h-36 text-sm"
                      placeholder="Escribe el caption definitivo..."
                    />
                    <SaveVersionButton
                      type="caption"
                      currentValue={localPost.copyCaption}
                      versions={localPost.captionVersions}
                      isAgencyMember={userRole !== 'client'}
                      onUpdatePost={onUpdate}
                      localPost={localPost}
                    />
                    {localPost.translationEnabled && (
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Post Caption (Traducido)</label>
                        <textarea
                          disabled={!canEditCopy}
                          value={localPost.copyCaptionTranslated || ''}
                          onChange={e => setLocalPost({...localPost, copyCaptionTranslated: e.target.value})}
                          onBlur={handleUpdate}
                          className="w-full bg-gray-50 border border-gray-200 rounded-md p-4 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all resize-none h-36 text-sm"
                          placeholder="Traducción manual del caption..."
                        />
                      </div>
                    )}
                  </section>
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
                              <span className="text-[11px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full animate-pulse shrink-0">
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
                                  <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[11px] font-bold text-white select-none">
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
                                      aria-label="Quitar diapositiva"
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
                          onClick={() => localPost.currentDesignUrl && !isVideoUrl(localPost.currentDesignUrl) && setZoomedImageUrl(localPost.currentDesignUrl)}
                          className={cn(
                            "aspect-video bg-white rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden shadow-inner group",
                            localPost.currentDesignUrl ? (isVideoUrl(localPost.currentDesignUrl) ? "" : "cursor-zoom-in") : ""
                          )}
                        >
                          {localPost.currentDesignUrl ? (
                            isVideoUrl(localPost.currentDesignUrl) ? (
                              <video 
                                src={localPost.currentDesignUrl} 
                                className="w-full h-full object-contain" 
                                controls
                                muted
                                playsInline
                              />
                            ) : (
                              <img src={localPost.currentDesignUrl} alt="Design" className="w-full h-full object-contain hover:scale-102 transition-transform duration-300" />
                            )
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
                            accept="image/*,video/*"
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

                          {localPost.format !== 'carrusel' && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1.5 text-left">
                              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                                O pegar URL del archivo (Imagen/Video)
                              </label>
                              <div className="flex gap-1.5">
                                <input 
                                  type="text"
                                  placeholder="https://ejemplo.com/archivo.mp4 o link de Drive..."
                                  value={localPost.currentDesignUrl || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updated = { ...localPost, currentDesignUrl: val };
                                    setLocalPost(updated);
                                    onUpdate(updated);
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none focus:ring-1 focus:ring-app-accent focus:border-app-accent transition-all text-gray-800"
                                />
                                {localPost.currentDesignUrl && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = { ...localPost, currentDesignUrl: '' };
                                      setLocalPost(updated);
                                      onUpdate(updated);
                                    }}
                                    className="px-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                                  >
                                    Borrar
                                  </button>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400">
                                Recomendado para videos de más de 700KB para evitar el límite de base de datos de 1MB de Firestore.
                              </p>
                            </div>
                          )}

                          {localPost.platform === 'instagram' && localPost.format === 'reel' && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2 text-left">
                              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                                Portada del Reel (1080x1350)
                              </label>
                              <p className="text-[11px] text-gray-400">
                                Instagram muestra esta imagen como miniatura en la parrilla del feed en vez del vídeo.
                              </p>
                              {localPost.reelCoverUrl && (
                                <img
                                  src={localPost.reelCoverUrl}
                                  alt="Portada del reel"
                                  className="w-16 aspect-[4/5] object-cover rounded-md border border-gray-200"
                                />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                id="reel-cover-upload"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) processAndSetReelCover(file);
                                }}
                              />
                              <div className="flex gap-1.5">
                                <label
                                  htmlFor="reel-cover-upload"
                                  className="flex-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
                                >
                                  {localPost.reelCoverUrl ? 'Cambiar portada' : 'Subir portada'}
                                </label>
                                {localPost.reelCoverUrl && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = { ...localPost, reelCoverUrl: '' };
                                      setLocalPost(updated);
                                      onUpdate(updated);
                                    }}
                                    className="px-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                                  >
                                    Borrar
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3 shadow-sm">
                         <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                           <span>Control de Proceso</span>
                           <span className="text-app-accent font-medium">Fase actual: {PHASES[localPost.phase]?.label || localPost.phase}</span>
                         </div>
                         {isClientApprovalAction ? (
                           showApproveConfirm ? (
                             <ConfirmInline
                               message="¿Aprobar este post para publicación?"
                               confirmLabel="Sí, aprobar"
                               cancelLabel="Cancelar"
                               tone="success"
                               onConfirm={() => { handleApprove(); setShowApproveConfirm(false); }}
                               onCancel={() => setShowApproveConfirm(false)}
                             />
                           ) : showRequestChangesForm ? (
                             <div className="space-y-2">
                               <textarea
                                 autoFocus
                                 value={changesRequestReason}
                                 onChange={e => setChangesRequestReason(e.target.value)}
                                 placeholder="¿Qué hay que cambiar? Sé específico para que la agencia no tenga que preguntar."
                                 className="w-full bg-orange-50/50 border border-orange-200 rounded-md p-2.5 text-xs text-gray-800 outline-none focus:border-orange-400 resize-none h-20"
                               />
                               <div className="flex gap-2">
                                 <button
                                   onClick={() => { setShowRequestChangesForm(false); setChangesRequestReason(''); }}
                                   className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-xl font-semibold transition-all text-xs"
                                 >
                                   Cancelar
                                 </button>
                                 <button
                                   onClick={handleRequestChanges}
                                   className="flex-1 bg-orange-600 text-white hover:bg-orange-700 px-3 py-2 rounded-xl font-semibold transition-all shadow-md text-xs"
                                 >
                                   Enviar solicitud
                                 </button>
                               </div>
                             </div>
                           ) : (
                             <div className="flex gap-2">
                               <button
                                 onClick={() => setShowRequestChangesForm(true)}
                                 className="flex-1 bg-white border border-orange-300 text-orange-700 hover:bg-orange-50 px-3 py-2.5 rounded-xl font-semibold transition-all text-xs flex items-center justify-center gap-1.5"
                               >
                                 Solicitar Cambios
                               </button>
                               <button
                                 onClick={() => setShowApproveConfirm(true)}
                                 className="flex-[1.5] bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2.5 rounded-xl font-semibold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 text-xs"
                               >
                                 <CheckCircle size={16} />
                                 Aprobar Post
                               </button>
                             </div>
                           )
                         ) : (isClient && localPost.phase === 'changes_requested') ? (
                           <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-2.5 text-center">
                             <p className="text-xs text-orange-900 font-semibold">Has solicitado cambios en este post.</p>
                             <p className="text-[11px] text-orange-700 mt-0.5">La agencia lo está revisando y volverá a enviártelo cuando esté listo.</p>
                           </div>
                         ) : isAgencyResumeAction ? (
                           <div className="space-y-2">
                             <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-2.5">
                               <p className="text-[11px] font-bold text-orange-800 mb-1">
                                 Cambios solicitados por {localPost.changesRequestedBy || 'el cliente'}
                                 {localPost.changesRequestedAt && ` · ${format(new Date(localPost.changesRequestedAt), 'dd/MM HH:mm')}`}
                               </p>
                               <p className="text-xs text-orange-900 leading-relaxed">{localPost.changesRequestedReason}</p>
                             </div>
                             <button
                               onClick={handleResumeProduction}
                               className="w-full bg-app-accent text-white hover:bg-app-accent-hover px-3 py-2.5 rounded-xl font-semibold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 text-xs"
                             >
                               Reanudar en Diseño
                               <ChevronRight size={16} />
                             </button>
                           </div>
                         ) : (
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
                         )}
                         {localPost.phase === 'approved' && (
                           <p className="text-[11px] text-emerald-600 font-semibold text-center">
                             ✓ Post aprobado{localPost.approvedBy ? ` por ${localPost.approvedBy}` : ''}
                           </p>
                         )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <SaveVersionButton
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
                          <span className="text-[11px] text-gray-400">{format(comment.createdAt, 'HH:mm dd/MM')}</span>
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
                              <p className="text-[11px] text-gray-400 font-medium truncate">@{getMentionHandle(user)} • {user.role}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <input
                      value={commentText}
                      onChange={e => handleInputChange(e.target.value, 'comment')}
                      onKeyDown={e => e.key === 'Enter' && commentText && (onAddComment(commentText), setCommentText(''), setActiveMentionInput(null))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md py-4 pl-4 pr-12 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent"
                      placeholder="Escribe un comentario o feedback..."
                    />
                    <button
                      onClick={() => commentText && (onAddComment(commentText), setCommentText(''), setActiveMentionInput(null))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-app-accent text-white rounded-xl hover:bg-app-accent-hover transition-all shadow-sm"
                      aria-label="Enviar comentario"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-gray-400 italic">Los clientes solo podrán ver comentarios públicos marcados para fase 5.</p>
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
                        className="p-1 rounded-lg text-gray-400 hover:text-app-accent transition-colors shrink-0 self-start"
                        title={f.done ? "Marcar como pendiente" : "Marcar como hecho"}
                        aria-label={f.done ? "Marcar como pendiente" : "Marcar como hecho"}
                      >
                        {f.done ? (
                          <CheckSquare className="text-emerald-600" size={20} />
                        ) : (
                          <Square size={20} className="text-gray-300 hover:text-gray-500" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-900">{f.authorName}</span>
                            <span className="text-[11px] bg-app-accent-subtle text-app-accent font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">{f.roleAtTime}</span>
                            <span className="text-[11px] text-gray-400">
                              {f.createdAt instanceof Date ? format(f.createdAt, 'HH:mm dd/MM') : 'Ahora'}
                            </span>
                          </div>
                          
                          {/* Edit / Delete Buttons on Hover / Action — editing text is author-only;
                              deleting is author or admin, matching firestore.rules exactly. */}
                          {editingFeedbackId !== f.id && (() => {
                            const isAuthor = !!f.authorId && f.authorId === auth.currentUser?.uid;
                            const canDelete = isAuthor || userRole === 'admin';
                            if (!isAuthor && !canDelete) return null;
                            return confirmingDeleteFeedbackId === f.id ? (
                              <ConfirmInline
                                message="¿Eliminar?"
                                size="sm"
                                onConfirm={() => {
                                  onDeleteFeedback && onDeleteFeedback(f.id);
                                  setConfirmingDeleteFeedbackId(null);
                                }}
                                onCancel={() => setConfirmingDeleteFeedbackId(null)}
                              />
                            ) : (
                              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isAuthor && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingFeedbackId(f.id);
                                      setEditingFeedbackText(f.text);
                                    }}
                                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                    title="Editar feedback"
                                    aria-label="Editar feedback"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingDeleteFeedbackId(f.id)}
                                    className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Eliminar feedback"
                                    aria-label="Eliminar feedback"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {editingFeedbackId === f.id ? (
                          <div className="mt-1 space-y-2">
                            <textarea
                              value={editingFeedbackText}
                              onChange={(e) => setEditingFeedbackText(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-md p-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent resize-y"
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
                          <p className="text-[11px] text-emerald-600 font-extrabold mt-1.5 flex items-center gap-1">
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
                              <p className="text-[11px] text-gray-400 font-medium truncate">@{getMentionHandle(user)} • {user.role}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <input
                      value={feedbackText}
                      onChange={e => handleInputChange(e.target.value, 'feedback')}
                      onKeyDown={e => e.key === 'Enter' && feedbackText && (onAddFeedback(feedbackText), setFeedbackText(''), setActiveMentionInput(null))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md py-4 pl-4 pr-12 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent"
                      placeholder="Escribe una solicitud de feedback para el cliente..."
                    />
                    <button
                      onClick={() => feedbackText && (onAddFeedback(feedbackText), setFeedbackText(''), setActiveMentionInput(null))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-app-accent text-white rounded-xl hover:bg-app-accent-hover transition-all shadow-sm"
                      aria-label="Enviar solicitud de feedback"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-gray-400">Los elementos de feedback tienen checkboxes interactivos para marcar tareas como resueltas.</p>
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
                {historyEntries.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    <HistoryIcon className="mx-auto mb-2 opacity-20" size={48} />
                    <p className="font-medium text-sm">No hay versiones guardadas</p>
                    <p className="text-xs text-gray-400 mt-1">Usa "💾 Guardar Versión" junto al copy, caption o diseño en la tab Producción.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {([
                        { id: 'all', label: 'Todo' },
                        { id: 'creativity', label: 'Copy' },
                        { id: 'caption', label: 'Caption' },
                        { id: 'design', label: 'Diseño' }
                      ] as const).map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setHistoryFilter(f.id)}
                          className={cn(
                            "text-xs font-bold px-3 py-1.5 rounded-full border transition-all",
                            historyFilter === f.id
                              ? "bg-app-accent/10 border-app-accent text-app-accent"
                              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative pl-2 space-y-4">
                      <div className="absolute left-[9px] top-1.5 bottom-1.5 w-px bg-gray-100" />
                      {filteredHistoryEntries.map((entry) => {
                        const key = `${entry.type}-${entry.version.id}`;
                        return (
                          <HistoryEntryCard
                            key={key}
                            entry={entry}
                            isAgencyMember={isAgencyMember}
                            accessibleUsers={accessibleUsers}
                            isConfirmingRestore={confirmingRestoreKey === key}
                            onRequestRestore={() => setConfirmingRestoreKey(key)}
                            onConfirmRestore={() => handleRestoreEntry(entry)}
                            onCancelRestore={() => setConfirmingRestoreKey(null)}
                            onAddFeedback={handleAddVersionFeedback}
                          />
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Expandable Lightbox Modal View */}
      <AnimatePresence>
        {zoomedImageUrl && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-default"
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
              aria-label="Cerrar imagen ampliada"
            >
              <X size={32} />
            </button>
            {isVideoUrl(zoomedImageUrl) ? (
              <video 
                src={zoomedImageUrl} 
                controls
                autoPlay
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img 
                src={zoomedImageUrl} 
                alt="Ampliado" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
