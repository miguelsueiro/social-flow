/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  Timestamp, 
  getDoc,
  setDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, signIn, logOut } from './lib/firebase';
import { cn, Role, ROLES, Phase, PHASES } from './lib/utils';
import Calendar from './components/Calendar';
import Board from './components/Board';
import PostModal from './components/PostModal';
import InstagramFeed from './components/InstagramFeed';
import LinkedInFeed from './components/LinkedInFeed';
import TikTokFeed from './components/TikTokFeed';
import NotificationsStream from './components/NotificationsStream';
import SettingsView from './components/SettingsView';
import UserGuideModal from './components/UserGuideModal';
import { InstagramIcon, TikTokIcon, LinkedInIcon } from './components/SocialIcons';
import { 
  LayoutDashboard, 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  Bell, 
  Search,
  Users,
  Settings,
  Plus,
  Calendar as CalendarIcon,
  Columns,
  Trophy,
  Activity,
  FileText,
  Instagram,
  Globe,
  Linkedin,
  Palette,
  X,
  BookOpen,
  Video,
  Grid,
  Info
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
  operationType: OperationType;
  path: string | null;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to slugify text for friendly URLs
function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// Simple helper to calculate a slightly darker color for hover effects
function darkenColor(hex: string, percent: number): string {
  try {
    let num = parseInt(hex.replace("#",""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
  } catch (e) {
    return hex;
  }
}

const defaultFallbackProjects = [
  { id: 'ecoglow', name: 'EcoGlow Cosmetics', clientName: 'EcoGlow S.L.', color: '#10B981', createdAt: new Date() },
  { id: 'nebula', name: 'Nebula SaaS Portal', clientName: 'Nebula Technologies', color: '#6366F1', createdAt: new Date() },
  { id: 'alpha', name: 'Alpha Fitness Club', clientName: 'GymFlow Corp', color: '#EF4444', createdAt: new Date() }
];

const defaultFallbackPosts = [
  {
    id: 'post-1',
    projectId: 'ecoglow',
    title: 'Crema Hidratante Ecológica',
    idea: 'Lanzamiento de la nueva crema hidratante ecológica con ingredientes 100% naturales.',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    phase: 'published',
    copyCaption: '¡Descubre la revolución del cuidado de la piel! 🌱 Presentamos nuestra nueva crema hidratante con extractos botánicos 100% orgánicos. Hidratación profunda y respetuosa con el planeta. #EcoBeauty #OrganicSkinCare #GreenLife',
    copyCreativity: 'Imagen minimalista de la crema rodeada de aloe vera y gotas de agua fresca.',
    currentDesignUrl: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&auto=format&fit=crop',
    channel: 'instagram',
    type: 'feed',
    status: 'completed',
    feedbackCount: 0
  },
  {
    id: 'post-2',
    projectId: 'ecoglow',
    title: 'Rutina de Noche 3 Pasos',
    idea: 'Carrusel de 3 pasos para una rutina de noche ecológica perfecta.',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    phase: 'client_review',
    copyCaption: 'La rutina de noche que tu piel y el planeta merecen. 🌙✨ Sigue estos 3 sencillos pasos para despertar con una piel radiante. #EcoFriendly #NourishYourSkin #BeautySleep',
    copyCreativity: 'Carrusel con fondo pastel verde. Slide 1: Limpieza. Slide 2: Tonificación. Slide 3: Hidratación con nuestro sérum de noche.',
    currentDesignUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop',
    channel: 'instagram',
    type: 'carousel',
    slides: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop'
    ],
    status: 'pending',
    feedbackCount: 2
  },
  {
    id: 'post-3',
    projectId: 'nebula',
    title: 'Nebula AI Integration',
    idea: 'Anuncio de la integración de inteligencia artificial para la automatización de flujos de trabajo.',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // in 2 days
    phase: 'planning',
    copyCaption: 'La productividad del futuro ya está aquí. 🚀 Presentamos Nebula AI: automatiza tareas repetitivas y concéntrate en lo que de verdad importa. #SaaS #AI #ProductivityBoost',
    copyCreativity: 'Gráfico limpio mostrando un flujo de trabajo que se simplifica con un nodo de destellos brillantes.',
    currentDesignUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop',
    channel: 'linkedin',
    type: 'feed',
    status: 'pending',
    feedbackCount: 1
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  const [userRole, setUserRole] = useState<Role>('creative_director'); // Default for demo
  const [userProjectId, setUserProjectId] = useState<string | null>(null);
  const [permittedProjects, setPermittedProjects] = useState<string[]>([]);
  const [view, setView] = useState<'calendar' | 'board'>('calendar');
  const [sidebarTab, setSidebarTab] = useState<'calendario' | 'instagram_feed' | 'linkedin_feed' | 'tiktok_feed' | 'notificaciones' | 'configuracion'>('calendario');
  const [posts, setPosts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('dashboard');
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Helper to check if a user has access to a specific project
  const hasProjectPermission = (projectId: string) => {
    if (userRole === 'admin') return true;
    if (userRole === 'client') {
      if (permittedProjects && permittedProjects.length > 0) {
        return permittedProjects.includes(projectId);
      }
      return userProjectId === projectId;
    }
    if (permittedProjects && permittedProjects.length > 0) {
      return permittedProjects.includes(projectId);
    }
    return true; // Default for other agency roles if not explicitly restricted
  };

  // Helper to synchronize the URL with the active project
  const updateProjectUrl = (projectId: string) => {
    const url = new URL(window.location.href);
    if (projectId && projectId !== 'all' && projectId !== 'dashboard') {
      const proj = projects.find(p => p.id === projectId);
      const slug = proj ? slugify(proj.name) : projectId;
      url.pathname = `/${slug}`;
      url.searchParams.delete('project');
    } else {
      url.pathname = '/';
      url.searchParams.delete('project');
    }
    window.history.pushState({}, '', url.toString());
  };

  // Wrapper helper to select a project and update its URL
  const selectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    updateProjectUrl(projectId);
  };

  // Synchronize initial active project from URL param or pathname at startup
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projParam = urlParams.get('project');
    const pathSegment = window.location.pathname.replace(/^\/|\/$/g, '');
    
    if (projParam) {
      setActiveProjectId(projParam);
    } else if (pathSegment && pathSegment !== 'index.html' && pathSegment !== 'dashboard') {
      setActiveProjectId(pathSegment);
    } else {
      setActiveProjectId('dashboard');
    }
  }, []);

  // Close search suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Project modal states
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#2563EB'); // default elegant blue

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setUserRole('creative_director');
        setUserProjectId(null);
        setPermittedProjects([]);
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubUserDoc = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserRole(data.role || 'creative_director');
        setUserProjectId(data.projectId || null);
        setPermittedProjects(data.permittedProjects || []);
        
        // Sync active project if no query parameter or pathname is set
        const urlParams = new URLSearchParams(window.location.search);
        const pathSegment = window.location.pathname.replace(/^\/|\/$/g, '');
        const hasProjectUrl = urlParams.get('project') || (pathSegment && pathSegment !== 'index.html' && pathSegment !== 'dashboard');
        
        if (!hasProjectUrl) {
          if (data.role === 'client' && data.projectId) {
            setActiveProjectId(data.projectId);
            updateProjectUrl(data.projectId);
          } else {
            setActiveProjectId('dashboard');
            updateProjectUrl('dashboard');
          }
        }
      } else {
        // Set default role for new users
        const initialRole = 'creative_director';
        await setDoc(userDocRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          role: initialRole,
          name: currentUser.displayName || 'Usuario',
          projectId: '',
          permittedProjects: []
        });
        setUserRole(initialRole);
        setUserProjectId(null);
        setPermittedProjects([]);
        
        const urlParams = new URLSearchParams(window.location.search);
        const pathSegment = window.location.pathname.replace(/^\/|\/$/g, '');
        const hasProjectUrl = urlParams.get('project') || (pathSegment && pathSegment !== 'index.html' && pathSegment !== 'dashboard');
        
        if (!hasProjectUrl) {
          setActiveProjectId('dashboard');
          updateProjectUrl('dashboard');
        }
      }
    }, (err) => {
      console.error("Error subscribing to user doc:", err);
      // Fail gracefully: don't crash, assume default creative_director role in offline/demo mode
      setUserRole('creative_director');
      setUserProjectId(null);
      setPermittedProjects([]);
      setIsOfflineMode(true);
    });

    return () => unsubUserDoc();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubProjects = onSnapshot(collection(db, 'projects'), async (snapshot) => {
      if (snapshot.empty) {
        // Seed default projects
        const defaultProjects = [
          { name: 'EcoGlow Cosmetics', clientName: 'EcoGlow S.L.', color: '#10B981', createdAt: new Date() },
          { name: 'Nebula SaaS Portal', clientName: 'Nebula Technologies', color: '#6366F1', createdAt: new Date() },
          { name: 'Alpha Fitness Club', clientName: 'GymFlow Corp', color: '#EF4444', createdAt: new Date() }
        ];
        try {
          for (const p of defaultProjects) {
            await addDoc(collection(db, 'projects'), p);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'projects');
        }
      } else {
        const projList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProjects(projList);

        // Resolve activeProjectId if it was loaded as a slug from the URL or pathname
        const urlParams = new URLSearchParams(window.location.search);
        const projParam = urlParams.get('project');
        const pathSegment = window.location.pathname.replace(/^\/|\/$/g, '');
        const targetSlug = projParam || (pathSegment && pathSegment !== 'index.html' && pathSegment !== 'dashboard' ? pathSegment : null);
        
        if (targetSlug && targetSlug !== 'all' && targetSlug !== 'dashboard') {
          const found = projList.find((p: any) => p.id === targetSlug || slugify(p.name) === targetSlug);
          if (found) {
            setActiveProjectId(found.id);
          }
        }
      }
    }, (error) => {
      console.warn("Firestore error loading projects, falling back to local demo state:", error);
      setIsOfflineMode(true);
      setProjects(defaultFallbackProjects);
      
      const urlParams = new URLSearchParams(window.location.search);
      const projParam = urlParams.get('project');
      const pathSegment = window.location.pathname.replace(/^\/|\/$/g, '');
      const targetSlug = projParam || (pathSegment && pathSegment !== 'index.html' && pathSegment !== 'dashboard' ? pathSegment : null);
      if (targetSlug && targetSlug !== 'all' && targetSlug !== 'dashboard') {
        const found = defaultFallbackProjects.find((p: any) => p.id === targetSlug || slugify(p.name) === targetSlug);
        if (found) {
          setActiveProjectId(found.id);
        } else {
          setActiveProjectId('dashboard');
        }
      } else {
        setActiveProjectId('dashboard');
      }
    });

    return () => unsubProjects();
  }, [currentUser]);

  // Automatically synchronize URL query parameter with project slug when state changes
  useEffect(() => {
    if (projects.length > 0 && activeProjectId) {
      updateProjectUrl(activeProjectId);
    }
  }, [projects, activeProjectId]);

  // Set the dynamic accent colors on documentElement based on the active project
  useEffect(() => {
    const activeProj = projects.find(p => p.id === activeProjectId);
    const color = activeProj?.color || '#2563EB'; // Fallback to Royal Blue
    document.documentElement.style.setProperty('--app-accent', color);
    const hoverColor = darkenColor(color, -10);
    document.documentElement.style.setProperty('--app-accent-hover', hoverColor);
  }, [activeProjectId, projects]);

  // Dynamically switch sidebarTab if current active project doesn't support the active platform feed
  useEffect(() => {
    if (activeProjectId !== 'all' && activeProjectId !== 'dashboard') {
      const activeProj = projects.find(p => p.id === activeProjectId);
      if (activeProj) {
        const supportedPlatforms = activeProj.platforms || ['instagram', 'linkedin', 'tiktok'];
        if (sidebarTab === 'instagram_feed' && !supportedPlatforms.includes('instagram')) {
          setSidebarTab('calendario');
        } else if (sidebarTab === 'linkedin_feed' && !supportedPlatforms.includes('linkedin')) {
          setSidebarTab('calendario');
        } else if (sidebarTab === 'tiktok_feed' && !supportedPlatforms.includes('tiktok')) {
          setSidebarTab('calendario');
        }
      }
    }
  }, [activeProjectId, projects, sidebarTab]);

  useEffect(() => {
    if (!currentUser) return;

    // Filter posts for client: must belong to their assigned project AND be client-visible
    const q = userRole === 'client'
      ? query(
          collection(db, 'posts'),
          where('projectId', '==', userProjectId || 'none'),
          where('phase', 'in', ['client_review', 'approved', 'published'])
        )
      : query(collection(db, 'posts'), orderBy('date', 'asc'));

    const unsubPosts = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate()
      }));
      // Sort in-memory to ensure proper chronological order without requiring composite indices
      postsData.sort((a, b) => a.date.getTime() - b.date.getTime());
      setPosts(postsData);
    }, (error) => {
      console.warn("Firestore error loading posts, falling back to local demo state:", error);
      setIsOfflineMode(true);
      setPosts(defaultFallbackPosts);
    });

    return () => unsubPosts();
  }, [currentUser, userRole, userProjectId]);

  useEffect(() => {
    if (!selectedPost) return;

    const pathComments = `posts/${selectedPost.id}/comments`;
    const qC = query(
      collection(db, pathComments), 
      orderBy('createdAt', 'desc')
    );
    const unsubComments = onSnapshot(qC, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date()
      })));
    }, (error) => {
      console.warn("Firestore error loading comments, falling back to offline data:", error);
      setComments([
        { id: 'c1', text: 'Gran idea, me gusta el enfoque minimalista.', authorName: 'Carlos Díaz', createdAt: new Date(Date.now() - 3600000) }
      ]);
    });

    const pathFeedbacks = `posts/${selectedPost.id}/feedbacks`;
    const qF = query(
      collection(db, pathFeedbacks),
      orderBy('createdAt', 'desc')
    );
    const unsubFeedbacks = onSnapshot(qF, (snapshot) => {
      setFeedbacks(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
        done: doc.data().done || false,
        doneAt: doc.data().doneAt,
        doneBy: doc.data().doneBy
      })));
    }, (error) => {
      console.warn("Firestore error loading feedbacks, falling back to offline data:", error);
      setFeedbacks([
        { id: 'f1', text: 'Asegúrate de usar la tipografía corporativa correcta.', done: false, createdAt: new Date(Date.now() - 7200000) }
      ]);
    });

    // Seed post details into history for realistic audit tracking
    setHistory([
      { createdAt: new Date(), authorName: 'Carlos Díaz', copyCaption: selectedPost.copyCaption || 'Idea inicial', copyCreativity: selectedPost.copyCreativity || '', designUrl: selectedPost.currentDesignUrl || '' }
    ]);

    return () => {
      unsubComments();
      unsubFeedbacks();
    };
  }, [selectedPost]);

  const handleCreatePost = async (date: Date) => {
    if (isOfflineMode) {
      const assignedProjectId = activeProjectId === 'all' ? (projects[0]?.id || '') : activeProjectId;
      const newPost = {
        id: `local-post-${Date.now()}`,
        date: date,
        platform: 'instagram',
        phase: 'idea_1',
        title: 'Nuevo Post',
        idea: 'Nueva idea de post...',
        references: [],
        copyCreativity: '',
        copyCaption: '',
        currentDesignUrl: '',
        createdBy: currentUser?.uid || 'local-user',
        projectId: assignedProjectId,
        updatedAt: new Date(),
        feedbackCount: 0
      };
      setPosts(prev => [...prev, newPost]);
      toast.success('Post creado en el calendario (Modo Demo)');
      return;
    }
    try {
      const assignedProjectId = activeProjectId === 'all' ? (projects[0]?.id || '') : activeProjectId;
      await addDoc(collection(db, 'posts'), {
        date: Timestamp.fromDate(date),
        platform: 'instagram',
        phase: 'idea_1',
        title: 'Nuevo Post',
        idea: 'Nueva idea de post...',
        references: [],
        copyCreativity: '',
        copyCaption: '',
        currentDesignUrl: '',
        createdBy: currentUser?.uid,
        projectId: assignedProjectId,
        updatedAt: serverTimestamp()
      });
      toast.success('Post creado en el calendario');
    } catch (err) {
      toast.error('Error al crear el post');
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    }
  };

  const handleUpdatePost = async (updates: any) => {
    if (!selectedPost) return;
    if (isOfflineMode) {
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, ...updates } : p));
      setSelectedPost(prev => prev ? ({ ...prev, ...updates }) : null);
      toast.success('Actualizado correctamente (Modo Demo)');
      return;
    }
    try {
      const { id, ...cleanUpdates } = updates;
      const postRef = doc(db, 'posts', selectedPost.id);
      
      let payload: any;
      if (userRole === 'client') {
        payload = {
          phase: cleanUpdates.phase,
          updatedAt: serverTimestamp()
        };
      } else {
        payload = {
          ...cleanUpdates,
          updatedAt: serverTimestamp()
        };
      }

      await updateDoc(postRef, payload);
      setSelectedPost(prev => ({ ...prev, ...updates }));
      toast.success('Actualizado correctamente');
    } catch (err) {
      toast.error('Error al actualizar');
      handleFirestoreError(err, OperationType.UPDATE, `posts/${selectedPost.id}`);
    }
  };

  const handleUpdatePostDirectly = async (postId: string, updates: any) => {
    if (isOfflineMode) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(prev => prev ? ({ ...prev, ...updates }) : null);
      }
      toast.success('Fase de post actualizada (Modo Demo)');
      return;
    }
    try {
      const postRef = doc(db, 'posts', postId);
      let payload: any;
      if (userRole === 'client') {
        payload = {
          phase: updates.phase,
          updatedAt: serverTimestamp()
        };
      } else {
        payload = {
          ...updates,
          updatedAt: serverTimestamp()
        };
      }
      await updateDoc(postRef, payload);
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(prev => prev ? ({ ...prev, ...updates }) : null);
      }
      toast.success('Fase de post actualizada');
    } catch (err) {
      toast.error('Error al actualizar');
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (isOfflineMode) {
      setPosts(prev => prev.filter(p => p.id !== postId));
      setSelectedPost(null);
      toast.success('Post eliminado correctamente de la planificación (Modo Demo)');
      return;
    }
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setSelectedPost(null);
      toast.success('Post eliminado correctamente de la planificación');
    } catch (err) {
      toast.error('Error al eliminar el post');
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleAddComment = async (text: string) => {
    if (!selectedPost || !currentUser) return;
    if (isOfflineMode) {
      const newComment = {
        id: `local-comment-${Date.now()}`,
        text,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Usuario',
        roleAtTime: userRole,
        createdAt: new Date()
      };
      setComments(prev => [newComment, ...prev]);
      
      const words = text.split(/\s+/);
      const mentions = words.filter(w => w.startsWith('@')).map(w => w.substring(1));
      if (mentions.length > 0) {
        for (const mention of mentions) {
          const mentionClean = mention.replace(/[^a-zA-Z0-9_.-]/g, '');
          if (mentionClean) {
            toast.success(`📧 Correo enviado a ${mentionClean}@basetis.com notificando la etiqueta`, { duration: 6000 });
          }
        }
      }
      toast.success('Comentario añadido (Modo Demo)');
      return;
    }
    const pathComments = `posts/${selectedPost.id}/comments`;
    try {
      await addDoc(collection(db, pathComments), {
        text,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Usuario',
        roleAtTime: userRole,
        createdAt: serverTimestamp()
      });

      // Write activity notification to Firestore
      await addDoc(collection(db, 'notifications'), {
        user: currentUser.displayName || 'Usuario',
        action: 'escribió un comentario en',
        target: selectedPost.idea,
        createdAt: serverTimestamp(),
        type: 'comment',
        avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Usuario')}`
      });

      // Parse @ mentions
      const words = text.split(/\s+/);
      const mentions = words.filter(w => w.startsWith('@')).map(w => w.substring(1));
      if (mentions.length > 0) {
        for (const mention of mentions) {
          const mentionClean = mention.replace(/[^a-zA-Z0-9_.-]/g, '');
          if (mentionClean) {
            // Trigger beautiful simulated email alert
            toast.success(`📧 Correo enviado a ${mentionClean}@basetis.com notificando la etiqueta`, { duration: 6000 });
            
            // Add real mention notification to Firestore so it shows up in dynamic feed
            await addDoc(collection(db, 'notifications'), {
              user: currentUser.displayName || 'Usuario',
              action: `etiquetó a @${mentionClean} en`,
              target: selectedPost.idea,
              createdAt: serverTimestamp(),
              type: 'mention',
              avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Usuario')}`
            });
          }
        }
      }
    } catch (err) {
      toast.error('Error al enviar comentario');
      handleFirestoreError(err, OperationType.CREATE, pathComments);
    }
  };

  const handleAddFeedback = async (text: string) => {
    if (!selectedPost || !currentUser) return;
    if (isOfflineMode) {
      const newFeedback = {
        id: `local-feedback-${Date.now()}`,
        text,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Usuario',
        roleAtTime: userRole,
        done: false,
        createdAt: new Date()
      };
      setFeedbacks(prev => [newFeedback, ...prev]);
      toast.success('Feedback añadido (Modo Demo)');
      return;
    }
    const pathFeedbacks = `posts/${selectedPost.id}/feedbacks`;
    try {
      await addDoc(collection(db, pathFeedbacks), {
        text,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Usuario',
        roleAtTime: userRole,
        done: false,
        createdAt: serverTimestamp()
      });

      // Add notification for client feedback
      await addDoc(collection(db, 'notifications'), {
        user: currentUser.displayName || 'Usuario',
        action: 'añadió feedback de cliente en',
        target: selectedPost.idea,
        createdAt: serverTimestamp(),
        type: 'comment',
        avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Usuario')}`
      });
    } catch (err) {
      toast.error('Error al enviar feedback');
      handleFirestoreError(err, OperationType.CREATE, pathFeedbacks);
    }
  };

  const handleToggleFeedbackDone = async (feedbackId: string, currentDone: boolean) => {
    if (!selectedPost) return;
    if (isOfflineMode) {
      const nextDone = !currentDone;
      setFeedbacks(prev => prev.map(f => f.id === feedbackId ? {
        ...f,
        done: nextDone,
        doneAt: nextDone ? new Date() : null,
        doneBy: nextDone ? (currentUser?.displayName || 'Usuario') : null
      } : f));
      toast.success(nextDone ? 'Feedback marcado como resuelto (Modo Demo)' : 'Feedback reabierto (Modo Demo)');
      return;
    }
    const pathFeedbacks = `posts/${selectedPost.id}/feedbacks`;
    try {
      const nextDone = !currentDone;
      await updateDoc(doc(db, pathFeedbacks, feedbackId), {
        done: nextDone,
        doneAt: nextDone ? serverTimestamp() : null,
        doneBy: nextDone ? (currentUser?.displayName || 'Usuario') : null
      });

      toast.success(nextDone ? 'Feedback marcado como resuelto' : 'Feedback reabierto');

      // Add notification for feedback task completion status
      await addDoc(collection(db, 'notifications'), {
        user: currentUser?.displayName || 'Usuario',
        action: nextDone ? 'marcó como resuelto el feedback de' : 'reabrió el feedback de',
        target: selectedPost.idea,
        createdAt: serverTimestamp(),
        type: 'status',
        avatar: currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'Usuario')}`
      });
    } catch (err) {
      toast.error('Error al actualizar feedback');
      handleFirestoreError(err, OperationType.UPDATE, `${pathFeedbacks}/${feedbackId}`);
    }
  };

  const handleUpdateFeedback = async (feedbackId: string, newText: string) => {
    if (!selectedPost) return;
    if (isOfflineMode) {
      setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, text: newText } : f));
      toast.success('Feedback actualizado (Modo Demo)');
      return;
    }
    const pathFeedbacks = `posts/${selectedPost.id}/feedbacks`;
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, pathFeedbacks, feedbackId), {
        text: newText,
        updatedAt: serverTimestamp()
      });
      toast.success('Feedback actualizado correctamente');
    } catch (err) {
      toast.error('Error al actualizar feedback');
      handleFirestoreError(err, OperationType.UPDATE, `${pathFeedbacks}/${feedbackId}`);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!selectedPost) return;
    if (isOfflineMode) {
      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
      toast.success('Feedback eliminado (Modo Demo)');
      return;
    }
    const pathFeedbacks = `posts/${selectedPost.id}/feedbacks`;
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, pathFeedbacks, feedbackId));
      toast.success('Feedback eliminado correctamente');
    } catch (err) {
      toast.error('Error al eliminar feedback');
      handleFirestoreError(err, OperationType.DELETE, `${pathFeedbacks}/${feedbackId}`);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectClient.trim()) {
      toast.error('Por favor, rellena los campos requeridos.');
      return;
    }
    if (isOfflineMode) {
      const newProjId = `local-project-${Date.now()}`;
      const newProj = {
        id: newProjId,
        name: newProjectName.trim(),
        clientName: newProjectClient.trim(),
        color: newProjectColor,
        createdAt: new Date()
      };
      setProjects(prev => [...prev, newProj]);
      toast.success('¡Proyecto creado con éxito! (Modo Demo)');
      setActiveProjectId(newProjId);
      setShowNewProjectModal(false);
      setNewProjectName('');
      setNewProjectClient('');
      setNewProjectColor('#2563EB');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: newProjectName.trim(),
        clientName: newProjectClient.trim(),
        color: newProjectColor,
        createdAt: new Date()
      });
      toast.success('¡Proyecto creado con éxito!');
      setActiveProjectId(docRef.id); // Auto select the brand new project!
      setShowNewProjectModal(false);
      setNewProjectName('');
      setNewProjectClient('');
      setNewProjectColor('#2563EB');
    } catch (err) {
      toast.error('Error al crear el proyecto');
      handleFirestoreError(err, OperationType.CREATE, 'projects');
    }
  };

  const filteredPosts = posts.filter(post => {
    if (!hasProjectPermission(post.projectId)) return false;

    const matchesProject = activeProjectId === 'all' || post.projectId === activeProjectId;
    if (!matchesProject) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (post.idea || '').toLowerCase().includes(query) ||
      (post.copyCaption || '').toLowerCase().includes(query) ||
      (post.copyCreativity || '').toLowerCase().includes(query) ||
      (post.platform || '').toLowerCase().includes(query)
    );
  });

  const matchingSuggestions = searchQuery.trim()
    ? posts.filter(post => {
        if (!hasProjectPermission(post.projectId)) return false;

        const matchesProject = activeProjectId === 'all' || post.projectId === activeProjectId;
        if (!matchesProject) return false;

        const query = searchQuery.toLowerCase();
        return (
          (post.idea || '').toLowerCase().includes(query) ||
          (post.copyCaption || '').toLowerCase().includes(query) ||
          (post.copyCreativity || '').toLowerCase().includes(query) ||
          (post.platform || '').toLowerCase().includes(query)
        );
      })
    : [];

  const stats = {
    total: filteredPosts.length,
    approved: filteredPosts.filter(p => p.phase === 'approved').length,
    pending: filteredPosts.filter(p => p.phase !== 'approved' && p.phase !== 'published').length,
    published: filteredPosts.filter(p => p.phase === 'published').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50/50 to-blue-50/50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-indigo-100">
             <div className="w-20 h-20 bg-app-accent rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg shadow-app-accent/20 mb-6">
                <LayoutDashboard size={40} />
             </div>
             <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">SocialFlow</h1>
             <p className="text-gray-500 font-medium mb-10 leading-relaxed text-sm">
               Gestión de producción, seguimiento y control de redes sociales para agencias creativas y clientes.
             </p>
             <button 
                onClick={signIn}
                className="w-full bg-app-accent hover:bg-app-accent-hover text-white py-4 px-6 rounded-2xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="google" />
                Continuar con Google
             </button>
          </div>
          <p className="text-[11px] text-gray-400 font-medium tracking-wide">
            © 2026 SocialFlow Agency Tool
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {isOfflineMode && (
        <div className="bg-amber-500 text-amber-950 font-medium px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-amber-600/30 text-xs shadow-md z-50">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <div>
              <strong className="font-extrabold text-amber-950">Límite de Quota de Firestore superado para el día de hoy.</strong> El sistema ha entrado automáticamente en <span className="underline decoration-wavy font-bold">Modo de Demostración Offline</span>. Toda la interfaz es 100% interactiva utilizando un catálogo de simulación en memoria.
            </div>
          </div>
          <a
            href="https://console.firebase.google.com/project/gen-lang-client-0678644199/firestore/databases/ai-studio-963cf462-80fd-413c-a534-7008f0861a7a/data?openUpgradeDialog=true"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-amber-950 text-white font-bold px-4 py-1.5 rounded-lg hover:bg-amber-900 transition-all text-[11px] shadow-sm uppercase tracking-wider"
          >
            Habilitar Facturación / Consola Firebase
          </a>
        </div>
      )}
      <div className="min-h-screen bg-[#F8FAFC] flex flex-1">
        <Toaster position="bottom-right" />
      
      {/* Sidebar - Desktop Only with Fixed Height (h-screen, sticky, non-scrollable) */}
      {activeProjectId !== 'dashboard' && (
        <aside className="w-64 bg-white border-r border-gray-100 p-6 flex flex-col shrink-0 hidden lg:flex h-screen sticky top-0 overflow-hidden justify-between">
          <div className="flex flex-col overflow-hidden flex-1">
            {/* Logo / Header */}
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="w-10 h-10 bg-app-accent rounded-xl flex items-center justify-center text-white shadow-md shadow-app-accent/15 transition-all">
                <LayoutDashboard size={20} />
              </div>
              <span className="text-xl font-black text-gray-900 font-sans tracking-tight">SocialFlow</span>
            </div>

            {/* Nav Tab List (scrollable if screen is extremely small, but self-contained) */}
            <nav className="flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-hide">
              {(() => {
                const activeProj = projects.find(p => p.id === activeProjectId);
                const activePlatforms = activeProj && activeProj.platforms ? activeProj.platforms : ['instagram', 'linkedin', 'tiktok'];
                return [
                  { id: 'calendario', label: 'Calendario', icon: LayoutDashboard },
                  { id: 'instagram_feed', label: 'Feed Instagram', icon: InstagramIcon, platform: 'instagram', iconColor: 'text-[#E1306C]' },
                  { id: 'linkedin_feed', label: 'Feed LinkedIn', icon: LinkedInIcon, platform: 'linkedin', iconColor: 'text-[#0A66C2]' },
                  { id: 'tiktok_feed', label: 'Feed TikTok', icon: TikTokIcon, platform: 'tiktok', iconColor: 'text-zinc-900' },
                  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
                  { id: 'configuracion', label: 'Configuración', icon: Settings }
                ].filter(item => !item.platform || activePlatforms.includes(item.platform)).map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => setSidebarTab(item.id as any)}
                    className={cn(
                       "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group",
                       sidebarTab === item.id 
                         ? "bg-app-accent/10 text-app-accent" 
                         : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <item.icon size={18} className={cn("transition-all shrink-0", item.iconColor || (sidebarTab === item.id ? "text-app-accent" : "text-gray-400"))} />
                    {item.label}
                  </button>
                ));
              })()}
            </nav>
          </div>

          {/* Fixed Footer Elements */}
          <div className="shrink-0 pt-4 border-t border-gray-100 space-y-4">
            {/* Project Label Display (Now at the bottom, above user) */}
            <div className="relative bg-slate-50 border border-slate-100/80 p-3.5 rounded-2xl shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-slate-500">Proyecto seleccionado</label>
                
                {/* Information Icon Tooltip */}
                <div className="relative group leading-none flex items-center justify-center">
                  <Info size={14} className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors" />
                  <div className="absolute right-0 bottom-full mb-2 w-52 bg-slate-800 text-white text-[10px] p-2.5 rounded-xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 leading-normal font-medium border border-slate-700">
                    {userRole !== 'client' 
                      ? "Puedes cambiar de proyecto en el Dashboard o Configuración." 
                      : "Acceso exclusivo a tus proyectos autorizados."}
                    {/* Tooltip Arrow */}
                    <div className="absolute right-2 top-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-slate-800" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div 
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeProjectId === 'dashboard' ? '#6366F1' : (projects.find(p => p.id === activeProjectId)?.color || '#2563EB') }}
                />
                <span className="text-xs font-bold text-gray-800 truncate">
                  {activeProjectId === 'dashboard' ? '📂 Panel de Proyectos' : activeProjectId === 'all' ? '📁 Todos los Proyectos' : (projects.find(p => p.id === activeProjectId)?.name || 'Cargando...')}
                </span>
              </div>
              {activeProjectId !== 'dashboard' && (
                <button 
                  onClick={() => selectProject('dashboard')}
                  className="mt-3 w-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  ← Volver al Dashboard
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <img 
                 src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`} 
                 className="w-10 h-10 rounded-full border-2 border-white shadow-sm" 
                 alt="avatar" 
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{currentUser.displayName}</p>
                <p className="text-[11px] font-semibold text-app-accent truncate">{ROLES[userRole]}</p>
              </div>
              <button 
                onClick={logOut}
                className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all shrink-0"
                title="Cerrar Sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        {activeProjectId !== 'dashboard' && (
          <header className="h-20 bg-white border-b border-gray-100 px-6 flex items-center justify-between shrink-0">
            <div ref={searchContainerRef} className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                placeholder="Buscar posts, ideas, copys, plataformas..." 
                className="w-full bg-gray-50 border border-transparent rounded-2xl py-2.5 pl-12 pr-10 text-sm focus:bg-white focus:border-app-accent/20 focus:ring-4 focus:ring-app-accent/5 transition-all outline-none"
              />
              {searchQuery && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold text-xs"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}

              <AnimatePresence>
                {showSuggestions && searchQuery.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100"
                  >
                    <div className="p-3 bg-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Sugerencias predictivas</span>
                      <span>
                        {matchingSuggestions.length} {matchingSuggestions.length === 1 ? 'post' : 'posts'}
                      </span>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                      {matchingSuggestions.length > 0 ? (
                        matchingSuggestions.slice(0, 6).map((post) => {
                          const proj = projects.find(p => p.id === post.projectId);
                          const phaseInfo = PHASES[post.phase as Phase];
                          return (
                            <button
                              key={post.id}
                              type="button"
                              onClick={() => {
                                setSelectedPost(post);
                                setSearchQuery('');
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col gap-1.5 group"
                            >
                              <div className="flex items-center justify-between gap-2">
                                {/* Left side: Platform & Project */}
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {post.platform === 'instagram' ? (
                                    <Instagram size={13} className="text-pink-600 shrink-0" />
                                  ) : (
                                    <Video size={13} className="text-slate-800 shrink-0" />
                                  )}
                                  {proj && (
                                    <span 
                                      className="text-[9px] font-black px-1.5 py-0.5 rounded-md truncate shrink-0 max-w-[130px]"
                                      style={{ backgroundColor: `${proj.color}12`, color: proj.color }}
                                    >
                                      {proj.name}
                                    </span>
                                  )}
                                </div>
                                {/* Right side: Phase Badge */}
                                {phaseInfo && (
                                  <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0", phaseInfo.color)}>
                                    {phaseInfo.label.split(': ').pop()}
                                  </span>
                                )}
                              </div>
                              
                              {/* Idea / content description */}
                              <p className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-app-accent transition-colors">
                                {post.idea}
                              </p>

                              {/* Caption preview if available */}
                              {post.copyCaption && (
                                <p className="text-[10px] text-slate-400 line-clamp-1 italic">
                                  "{post.copyCaption}"
                                </p>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                          <span>🔍</span>
                          <p className="font-bold text-slate-400">No se encontraron posts</p>
                          <p className="text-[10px] text-slate-400 font-normal">Prueba a buscar otra palabra clave, idea o plataforma.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-4">
              {/* Topbar Client/Project Label */}
              <div className="flex items-center gap-2 bg-gray-100/70 border border-gray-200/50 px-3.5 py-2 rounded-xl">
                <span className="text-[11px] font-bold text-gray-400 hidden sm:inline">Proyecto:</span>
                <span className="text-xs font-bold text-gray-700">
                  {activeProjectId === 'dashboard' ? 'Panel de Control' : activeProjectId === 'all' ? 'Todos los Proyectos' : (projects.find(p => p.id === activeProjectId)?.name || 'Cargando...')}
                </span>
              </div>


              <button 
                onClick={() => setShowGuideModal(true)}
                className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all flex items-center justify-center shrink-0"
                title="Abrir Guía de Uso"
              >
                <BookOpen size={18} />
              </button>
              {userRole !== 'client' && activeProjectId !== 'dashboard' && (
                 <button 
                  onClick={() => handleCreatePost(new Date())}
                  className="bg-app-accent text-white hover:bg-app-accent-hover px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-app-accent/15 transition-all active:scale-95 flex items-center gap-2"
                 >
                   <Plus size={18} />
                   Nuevo Post
                 </button>
              )}
            </div>
          </header>
        )}

        {/* Content Area */}
        <div className={cn(
          "flex-1 flex flex-col gap-4 sm:gap-6",
          activeProjectId === 'dashboard' 
            ? "p-6 sm:p-10 max-w-6xl mx-auto w-full overflow-y-auto" 
            : "p-4 sm:p-6 pb-24 lg:pb-6 overflow-hidden"
        )}>
          {activeProjectId === 'dashboard' ? (
            <div className="space-y-8 animate-fade-in">
              {/* Dashboard top navigation bar (only inside dashboard itself) */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm">
                    <LayoutDashboard size={18} />
                  </div>
                  <span className="text-lg font-black text-slate-900 tracking-tight">SocialFlow</span>
                </div>
                <div className="flex items-center gap-3">
                  {userRole === 'admin' && (
                    <button
                      onClick={() => {
                        const firstProj = projects[0];
                        if (firstProj) {
                          selectProject(firstProj.id);
                          setSidebarTab('configuracion');
                        } else {
                          toast.error('No hay proyectos creados para configurar');
                        }
                      }}
                      className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Settings size={14} className="text-slate-500" />
                      Ajustes de Plataforma
                    </button>
                  )}
                  <button
                    onClick={logOut}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <LogOut size={14} />
                    Cerrar Sesión
                  </button>
                </div>
              </div>

              {/* Welcome banner (Minimalist look) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full translate-x-32 -translate-y-32 blur-3xl" />
                <div className="relative z-10 space-y-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    Panel de Control Global
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    ¡Hola, {currentUser?.displayName?.split(' ')[0] || 'Usuario'}!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-xl font-semibold leading-relaxed">
                    Bienvenido a SocialFlow. Selecciona un proyecto para planificar contenidos en el calendario, redactar copys, adjuntar diseños y ver feeds en vivo.
                  </p>
                </div>
              </div>

              {/* Projects list */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                    <Grid size={16} className="text-indigo-600" />
                    Tus proyectos
                  </h3>
                  {userRole === 'admin' && (
                    <button
                      onClick={() => setShowNewProjectModal(true)}
                      className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Plus size={14} />
                      Nuevo Proyecto
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {projects.filter(p => hasProjectPermission(p.id)).length === 0 ? (
                    <div className="col-span-full bg-white rounded-[2rem] p-12 border border-gray-100 shadow-sm text-center space-y-3">
                      <span className="text-3xl">📁</span>
                      <h4 className="font-extrabold text-gray-900 text-sm">No tienes proyectos asignados</h4>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto">
                        Pídele al Administrador de la plataforma que te asigne permisos para acceder a proyectos específicos.
                      </p>
                    </div>
                  ) : (
                    projects.filter(p => hasProjectPermission(p.id)).map((proj) => {
                      const projPosts = posts.filter(p => p.projectId === proj.id);
                      const total = projPosts.length;
                      const enProduccion = projPosts.filter(p => ['idea_1', 'copy', 'design', 'client_review'].includes(p.phase)).length;
                      const aprobados = projPosts.filter(p => p.phase === 'approved').length;
                      const publicados = projPosts.filter(p => p.phase === 'published').length;

                      return (
                        <div 
                          key={proj.id}
                          onClick={() => {
                            selectProject(proj.id);
                            setSidebarTab('calendario');
                          }}
                          className="bg-white rounded-[2.25rem] border border-slate-100/80 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden group animate-fade-in relative animate-fade-in"
                        >
                          <div className="p-7 flex-1 flex flex-col justify-between space-y-6">
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5">
                                <h4 className="font-black text-slate-900 text-lg sm:text-xl group-hover:text-indigo-600 transition-colors line-clamp-1 tracking-tight">
                                  {proj.name}
                                </h4>
                                <p className="text-xs text-slate-400 font-semibold">
                                  Cliente: <span className="text-slate-600 font-normal">{proj.clientName}</span>
                                </p>
                              </div>
                              <div 
                                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-md shadow-slate-100 transition-all group-hover:scale-105"
                                style={{ backgroundColor: proj.color }}
                              >
                                {proj.name[0].toUpperCase()}
                              </div>
                            </div>

                            {/* Stats Grid with larger numbers and titles */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100/50">
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">Total Posts</p>
                                <p className="text-xl sm:text-2xl font-black text-slate-900">{total}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">En Producción</p>
                                <p className="text-xl sm:text-2xl font-black text-orange-600">{enProduccion}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">Aprobados</p>
                                <p className="text-xl sm:text-2xl font-black text-green-600">{aprobados}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">Publicados</p>
                                <p className="text-xl sm:text-2xl font-black text-indigo-600">{publicados}</p>
                              </div>
                            </div>

                            {/* Access Button */}
                            <button
                              type="button"
                              className="w-full bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 font-extrabold text-xs py-3 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-100"
                            >
                              Entrar al Proyecto
                              <span className="text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-transform">→</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Bar */}
              {sidebarTab === 'calendario' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                  {[
                    { label: 'Total Posts', value: stats.total, icon: FileText, color: 'text-app-accent', bg: 'bg-app-accent/10' },
                    { label: 'En Producción', value: stats.pending, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Aprobados', value: stats.approved, icon: Trophy, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Publicados', value: stats.published, icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02]">
                      <div className={cn("p-3 rounded-xl", stat.bg, stat.color)}>
                        <stat.icon size={20} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 leading-none mb-1">{stat.label}</p>
                        <p className="text-xl font-black text-gray-900">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* View Switcher */}
              {sidebarTab === 'calendario' && (
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                    <button 
                      onClick={() => setView('calendar')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                        view === 'calendar' ? "bg-white text-app-accent shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <CalendarIcon size={14} />
                      Calendario
                    </button>
                    <button 
                      onClick={() => setView('board')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                        view === 'board' ? "bg-white text-app-accent shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <Columns size={14} />
                      Producción (Board)
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto flex flex-col">
                {sidebarTab === 'calendario' && (
                  view === 'calendar' ? (
                    <Calendar 
                      posts={filteredPosts} 
                      userRole={userRole} 
                      onAddPost={handleCreatePost}
                      onSelectPost={setSelectedPost}
                      onUpdatePost={handleUpdatePostDirectly}
                    />
                  ) : (
                    <Board 
                      posts={filteredPosts} 
                      userRole={userRole} 
                      onSelectPost={setSelectedPost}
                      onUpdatePost={handleUpdatePostDirectly}
                    />
                  )
                )}

                {sidebarTab === 'instagram_feed' && (
                  <InstagramFeed 
                    posts={filteredPosts} 
                    onSelectPost={setSelectedPost}
                    userRole={userRole}
                  />
                )}

                {sidebarTab === 'linkedin_feed' && (
                  <LinkedInFeed 
                    posts={filteredPosts} 
                    onSelectPost={setSelectedPost}
                    userRole={userRole}
                    projects={projects}
                  />
                )}

                {sidebarTab === 'tiktok_feed' && (
                  <TikTokFeed 
                    posts={filteredPosts} 
                    onSelectPost={setSelectedPost}
                    userRole={userRole}
                    projects={projects}
                  />
                )}

                {sidebarTab === 'notificaciones' && (
                  <NotificationsStream />
                )}

                {sidebarTab === 'configuracion' && (
                  <SettingsView 
                    projects={projects}
                    activeProjectId={activeProjectId}
                    setActiveProjectId={selectProject}
                    userRole={userRole}
                    permittedProjects={permittedProjects}
                    userProjectId={userProjectId}
                    onRoleChange={async (newRole) => {
                      setUserRole(newRole);
                      try {
                        if (currentUser) {
                          const { updateDoc, doc } = await import('firebase/firestore');
                          await updateDoc(doc(db, 'users', currentUser.uid), { role: newRole });
                        }
                      } catch (err) {
                        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser?.uid}`);
                      }
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {activeProjectId !== 'dashboard' && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-150 h-16 flex items-center justify-around px-2 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] shrink-0">
          {(() => {
            const activeProj = projects.find(p => p.id === activeProjectId);
            const activePlatforms = activeProj && activeProj.platforms ? activeProj.platforms : ['instagram', 'linkedin', 'tiktok'];
            return [
              { id: 'calendario', label: 'Calendario', icon: LayoutDashboard },
              { id: 'instagram_feed', label: 'Instagram', icon: InstagramIcon, platform: 'instagram', iconColor: 'text-[#E1306C]' },
              { id: 'linkedin_feed', label: 'LinkedIn', icon: LinkedInIcon, platform: 'linkedin', iconColor: 'text-[#0A66C2]' },
              { id: 'tiktok_feed', label: 'TikTok', icon: TikTokIcon, platform: 'tiktok', iconColor: 'text-zinc-900' },
              { id: 'notificaciones', label: 'Alertas', icon: Bell },
              { id: 'configuracion', label: 'Config.', icon: Settings }
            ].filter(item => !item.platform || activePlatforms.includes(item.platform)).map((item) => (
              <button
                key={item.id}
                onClick={() => setSidebarTab(item.id as any)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-extrabold transition-all",
                  sidebarTab === item.id 
                    ? "text-app-accent font-black" 
                    : "text-gray-400 hover:text-gray-500"
                )}
              >
                <item.icon size={18} className={cn("mb-1 transition-all", item.iconColor || (sidebarTab === item.id ? "text-app-accent" : "text-gray-400"))} />
                <span className="truncate">{item.label}</span>
              </button>
            ));
          })()}
        </nav>
      )}

      {/* Modals & Dialogs */}
      <AnimatePresence>
        {showGuideModal && (
          <UserGuideModal 
            isOpen={showGuideModal} 
            onClose={() => setShowGuideModal(false)} 
          />
        )}

        {selectedPost && (
          <PostModal 
            post={selectedPost} 
            onClose={() => setSelectedPost(null)}
            userRole={userRole}
            comments={comments}
            feedbacks={feedbacks}
            history={history}
            onAddComment={handleAddComment}
            onAddFeedback={handleAddFeedback}
            onToggleFeedbackDone={handleToggleFeedbackDone}
            onUpdateFeedback={handleUpdateFeedback}
            onDeleteFeedback={handleDeleteFeedback}
            onUpdate={handleUpdatePost}
            onDelete={handleDeletePost}
            projects={projects}
          />
        )}

        {showNewProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-app-accent/10 text-app-accent rounded-lg">
                    <Palette size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Crear Nuevo Proyecto</h3>
                </div>
                <button 
                  onClick={() => setShowNewProjectModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nombre del Proyecto</label>
                  <input 
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="E.g., Lanzamiento Primavera 2026"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nombre del Cliente / Empresa</label>
                  <input 
                    type="text"
                    required
                    value={newProjectClient}
                    onChange={(e) => setNewProjectClient(e.target.value)}
                    placeholder="E.g., EcoGlow Cosmetics S.L."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Color de Identidad (Personaliza la App)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color"
                      value={newProjectColor}
                      onChange={(e) => setNewProjectColor(e.target.value)}
                      className="w-12 h-12 bg-white border border-gray-200 rounded-xl cursor-pointer p-1"
                    />
                    <div className="flex-1">
                      <input 
                        type="text"
                        value={newProjectColor}
                        onChange={(e) => setNewProjectColor(e.target.value)}
                        placeholder="#2563EB"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-mono uppercase focus:bg-white focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent outline-none transition-all"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Este color se convertirá en el color de acento visual al seleccionar el proyecto.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3 justify-end">
                  <button 
                    type="button"
                    onClick={() => setShowNewProjectModal(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-app-accent hover:bg-app-accent-hover text-white rounded-xl text-xs font-bold shadow-md shadow-app-accent/15 transition-all"
                  >
                    Crear Proyecto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
