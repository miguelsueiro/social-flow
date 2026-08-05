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
import { cn, Role, ROLES, Phase, PHASES, deriveAccentPalette } from './lib/utils';
import { Post } from './types';
import NewProjectModal, { NewProjectData } from './components/NewProjectModal';
import Calendar from './components/Calendar';
import Board from './components/Board';
import PostModal from './components/PostModal';
import InstagramFeed from './components/InstagramFeed';
import LinkedInFeed from './components/LinkedInFeed';
import TikTokFeed from './components/TikTokFeed';
import NotificationsStream from './components/NotificationsStream';
import PublishHubView from './components/PublishHubView';
import IconButton from './components/IconButton';
import PhaseBadge from './components/PhaseBadge';
import Avatar from './components/Avatar';
import NavItems, { NavItem } from './components/NavItems';
import SegmentedControl from './components/SegmentedControl';
import SettingsView from './components/SettingsView';
import UserGuideModal from './components/UserGuideModal';
import { InstagramIcon, TikTokIcon, LinkedInIcon, PLATFORM_META } from './components/SocialIcons';
import { 
  LayoutDashboard,
  Clock, 
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
  X,
  BookOpen,
  Video,
  Grid,
  Info,
  Download,
  ChevronDown
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

// Phase changes were the one silent transition in the notifications stream —
// comments, mentions and feedback all wrote an activity entry, but agency→client
// handoffs (e.g. sending to review) and client→agency handoffs (approving,
// requesting changes) didn't. One phrase per meaningful transition reads more
// naturally in the shared activity feed than a generic "changed the phase to X".
function getPhaseChangeAction(oldPhase: Phase | undefined, newPhase: Phase): string {
  if (newPhase === 'client_review') return 'envió a revisión del cliente';
  if (newPhase === 'approved') return 'aprobó';
  if (newPhase === 'changes_requested') return 'solicitó cambios en';
  if (newPhase === 'published') return 'marcó como publicado';
  if (oldPhase === 'changes_requested' && newPhase === 'design') return 'reanudó la producción de';
  return `cambió la fase a "${PHASES[newPhase].shortLabel}" en`;
}

const defaultFallbackProjects = [
  { id: 'ecoglow', name: 'EcoGlow Cosmetics', clientName: 'EcoGlow S.L.', color: '#10B981', createdAt: new Date() },
  { id: 'nebula', name: 'Nebula SaaS Portal', clientName: 'Nebula Technologies', color: '#6366F1', createdAt: new Date() },
  { id: 'alpha', name: 'Alpha Fitness Club', clientName: 'GymFlow Corp', color: '#EF4444', createdAt: new Date() }
];

// Matches the real Post schema (src/types.ts) — a prior version used a legacy
// shape (channel/type/status/slides, and an invalid phase: 'planning') left
// over from before that schema was consolidated in Fase 8c. Every field the
// Calendar/Board/feed views actually read (platform, format, carouselUrls,
// phase) needs to be present and valid, or this fallback renders broken when
// Firestore is unreachable and the app falls back to it.
const defaultFallbackPosts: Post[] = [
  {
    id: 'post-1',
    projectId: 'ecoglow',
    title: 'Crema Hidratante Ecológica',
    idea: 'Lanzamiento de la nueva crema hidratante ecológica con ingredientes 100% naturales.',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    phase: 'published',
    platform: 'instagram',
    format: 'estatico',
    copyCaption: '¡Descubre la revolución del cuidado de la piel! 🌱 Presentamos nuestra nueva crema hidratante con extractos botánicos 100% orgánicos. Hidratación profunda y respetuosa con el planeta. #EcoBeauty #OrganicSkinCare #GreenLife',
    copyCreativity: 'Imagen minimalista de la crema rodeada de aloe vera y gotas de agua fresca.',
    currentDesignUrl: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&auto=format&fit=crop',
  },
  {
    id: 'post-2',
    projectId: 'ecoglow',
    title: 'Rutina de Noche 3 Pasos',
    idea: 'Carrusel de 3 pasos para una rutina de noche ecológica perfecta.',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    phase: 'client_review',
    platform: 'instagram',
    format: 'carrusel',
    copyCaption: 'La rutina de noche que tu piel y el planeta merecen. 🌙✨ Sigue estos 3 sencillos pasos para despertar con una piel radiante. #EcoFriendly #NourishYourSkin #BeautySleep',
    copyCreativity: 'Carrusel con fondo pastel verde. Slide 1: Limpieza. Slide 2: Tonificación. Slide 3: Hidratación con nuestro sérum de noche.',
    carouselUrls: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop'
    ],
  },
  {
    id: 'post-3',
    projectId: 'nebula',
    title: 'Nebula AI Integration',
    idea: 'Anuncio de la integración de inteligencia artificial para la automatización de flujos de trabajo.',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // in 2 days
    phase: 'design',
    platform: 'linkedin',
    format: 'estatico',
    copyCaption: 'La productividad del futuro ya está aquí. 🚀 Presentamos Nebula AI: automatiza tareas repetitivas y concéntrate en lo que de verdad importa. #SaaS #AI #ProductivityBoost',
    copyCreativity: 'Gráfico limpio mostrando un flujo de trabajo que se simplifica con un nodo de destellos brillantes.',
    currentDesignUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop',
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
  const [filterPhase, setFilterPhase] = useState<Phase | 'all'>('all');
  const [filterPlatform, setFilterPlatform] = useState<'instagram' | 'linkedin' | 'tiktok' | 'all'>('all');
  const [filterTerritory, setFilterTerritory] = useState<string>('all');
  const [filterAssignedToMe, setFilterAssignedToMe] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'calendario' | 'instagram_feed' | 'linkedin_feed' | 'tiktok_feed' | 'publicacion' | 'notificaciones' | 'configuracion'>('calendario');
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string>('dashboard');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostInitialTab, setSelectedPostInitialTab] = useState<'comments' | 'feedback' | undefined>(undefined);
  // Feeds' "Comentar" buttons call this so the modal opens straight on the
  // right conversation thread — Comentarios for the agency, Feedback
  // (Cliente) for clients — instead of always landing on Producción.
  const openPostModal = (post: any, initialTab?: 'comments' | 'feedback') => {
    setSelectedPostInitialTab(initialTab);
    setSelectedPost(post);
  };
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Guards against double-submit from rapid double-clicks: each ref flips true
  // for the duration of its handler's async work and ignores re-entrant calls.
  const creatingPostRef = useRef(false);
  const duplicatingPostRef = useRef(false);
  const deletingPostRef = useRef(false);
  const addingCommentRef = useRef(false);
  const addingFeedbackRef = useRef(false);
  const togglingFeedbackRef = useRef<Set<string>>(new Set());
  const updatingFeedbackRef = useRef<Set<string>>(new Set());
  const deletingFeedbackRef = useRef<Set<string>>(new Set());

  // Helper to check if a user has access to a specific project
  const hasProjectPermission = (projectId: string) => {
    if (userRole === 'pending') return false;
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

  // Shared by the desktop sidebar and mobile bottom bar — one source for nav
  // items, instead of two independently hand-copied arrays with two different
  // active-state languages. "Dashboard" plus the project-scoped items
  // (Calendario/Feeds/Publicación/Notificaciones/Configuración, hidden until a
  // project is actually selected) live on one unified list with one active id,
  // since exactly one of the two is ever "current" at a time. `short` swaps to
  // abbreviated labels for the mobile bar's tighter tap targets.
  const getNavItems = (short: boolean): NavItem[] => {
    const activeProj = projects.find(p => p.id === activeProjectId);
    const activePlatforms = activeProj && activeProj.platforms ? activeProj.platforms : ['instagram', 'linkedin', 'tiktok'];
    const dashboardItem: NavItem = { id: 'dashboard', label: 'Dashboard', icon: Grid };
    if (activeProjectId === 'dashboard') return [dashboardItem];
    const projectScoped = [
      { id: 'calendario', label: 'Calendario', icon: LayoutDashboard },
      { id: 'instagram_feed', label: short ? 'Instagram' : 'Feed Instagram', icon: InstagramIcon, iconColor: PLATFORM_META.instagram.color, platform: 'instagram' },
      { id: 'linkedin_feed', label: short ? 'LinkedIn' : 'Feed LinkedIn', icon: LinkedInIcon, iconColor: PLATFORM_META.linkedin.color, platform: 'linkedin' },
      { id: 'tiktok_feed', label: 'TikTok', icon: TikTokIcon, iconColor: PLATFORM_META.tiktok.color, platform: 'tiktok' },
      { id: 'publicacion', label: short ? 'Publicar' : 'Listo para Publicar', icon: Download, agencyOnly: true },
      { id: 'notificaciones', label: short ? 'Alertas' : 'Notificaciones', icon: Bell },
      { id: 'configuracion', label: short ? 'Config.' : 'Configuración', icon: Settings }
    ]
      .filter(item => !item.platform || activePlatforms.includes(item.platform))
      .filter(item => !item.agencyOnly || userRole !== 'client');
    return [dashboardItem, ...projectScoped];
  };

  const activeNavId = activeProjectId === 'dashboard' ? 'dashboard' : sidebarTab;
  const handleNavSelect = (id: string) => {
    if (id === 'dashboard') selectProject('dashboard');
    else setSidebarTab(id as any);
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
        // New user: honor a pending invite (by email) if one exists, otherwise
        // default to 'pending' with zero access. Never default to an agency role —
        // that would grant a stranger access to every client's projects.
        let initialRole: Role = 'pending';
        let initialProjectId = '';
        let initialPermittedProjects: string[] = [];

        const email = (currentUser.email || '').toLowerCase();
        if (email) {
          try {
            const inviteRef = doc(db, 'invites', email);
            const inviteSnap = await getDoc(inviteRef);
            if (inviteSnap.exists()) {
              const invite = inviteSnap.data();
              initialRole = invite.role || 'pending';
              initialProjectId = invite.projectId || '';
              initialPermittedProjects = invite.permittedProjects || [];
              await deleteDoc(inviteRef);
            }
          } catch (err) {
            console.warn('No se pudo resolver la invitación:', err);
          }
        }

        await setDoc(userDocRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          role: initialRole,
          name: currentUser.displayName || 'Usuario',
          projectId: initialProjectId,
          permittedProjects: initialPermittedProjects
        });
        setUserRole(initialRole);
        setUserProjectId(initialProjectId || null);
        setPermittedProjects(initialPermittedProjects);

        const urlParams = new URLSearchParams(window.location.search);
        const pathSegment = window.location.pathname.replace(/^\/|\/$/g, '');
        const hasProjectUrl = urlParams.get('project') || (pathSegment && pathSegment !== 'index.html' && pathSegment !== 'dashboard');

        if (!hasProjectUrl) {
          if (initialRole === 'client' && initialProjectId) {
            setActiveProjectId(initialProjectId);
            updateProjectUrl(initialProjectId);
          } else {
            setActiveProjectId('dashboard');
            updateProjectUrl('dashboard');
          }
        }
      }
    }, (err) => {
      console.error("Error subscribing to user doc:", err);
      // Fail gracefully: don't crash, but never assume an agency role in offline/demo mode.
      setUserRole('pending');
      setUserProjectId(null);
      setPermittedProjects([]);
      setIsOfflineMode(true);
    });

    return () => unsubUserDoc();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubProjects = onSnapshot(collection(db, 'projects'), async (snapshot) => {
      setProjectsLoading(false);
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
      setProjectsLoading(false);
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

  // Set the dynamic accent colors on documentElement based on the active project.
  // The project's raw brand color is never used directly as a surface color —
  // see deriveAccentPalette's module comment in lib/utils.ts for why (some
  // seeds give as little as 1.5:1 white-on-accent contrast). All three CSS
  // vars are re-derived from the same seed so they stay in hue lockstep —
  // previously only --app-accent and --app-accent-hover updated per project,
  // leaving --app-accent-subtle a fixed indigo tint regardless of the active
  // project's color.
  useEffect(() => {
    const activeProj = projects.find(p => p.id === activeProjectId);
    const seed = activeProj?.color || '#4F46E5'; // Fallback to the brand indigo
    const { primary, hover, subtle, ring } = deriveAccentPalette(seed);
    const root = document.documentElement.style;
    root.setProperty('--app-accent', primary);
    root.setProperty('--app-accent-hover', hover);
    root.setProperty('--app-accent-subtle', subtle);
    root.setProperty('--app-accent-ring', ring);
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
    if (userRole === 'pending') {
      // No role, no projects yet — never subscribe to posts for an unapproved account.
      setPosts([]);
      setPostsLoading(false);
      return;
    }

    // Scope the query itself to what this user is allowed to see, instead of
    // relying only on client-side filtering — a restricted user should never
    // download another client's material to their browser in the first place.
    const clientVisiblePhases = ['client_review', 'changes_requested', 'approved', 'published'];
    const scopedProjectIds = permittedProjects.slice(0, 30);

    const q = userRole === 'client'
      ? (scopedProjectIds.length > 0
          ? query(collection(db, 'posts'), where('projectId', 'in', scopedProjectIds), where('phase', 'in', clientVisiblePhases))
          : query(collection(db, 'posts'), where('projectId', '==', userProjectId || 'none'), where('phase', 'in', clientVisiblePhases)))
      : (scopedProjectIds.length > 0
          // Restricted agency member (freelancer, single-account access, etc.)
          ? query(collection(db, 'posts'), where('projectId', 'in', scopedProjectIds))
          // Unrestricted agency member/admin — same "full access by default" policy as hasProjectPermission.
          : query(collection(db, 'posts'), orderBy('date', 'asc')));

    const unsubPosts = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate()
      } as Post));
      // Sort in-memory to ensure proper chronological order without requiring composite indices
      postsData.sort((a, b) => a.date.getTime() - b.date.getTime());
      setPosts(postsData);
      setPostsLoading(false);
    }, (error) => {
      console.warn("Firestore error loading posts, falling back to local demo state:", error);
      setIsOfflineMode(true);
      setPosts(defaultFallbackPosts);
      setPostsLoading(false);
    });

    return () => unsubPosts();
  }, [currentUser, userRole, userProjectId, permittedProjects]);

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

    return () => {
      unsubComments();
      unsubFeedbacks();
    };
  }, [selectedPost]);

  const handleCreatePost = async (date: Date) => {
    if (creatingPostRef.current) return;
    creatingPostRef.current = true;
    try {
    if (isOfflineMode) {
      const assignedProjectId = activeProjectId === 'all' ? (projects[0]?.id || '') : activeProjectId;
      const newPost: Post = {
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
        projectId: assignedProjectId,
      };
      setPosts(prev => [...prev, newPost]);
      setSelectedPost(newPost);
      toast.success('Post creado (Modo Demo)');
      return;
    }
    try {
      const assignedProjectId = activeProjectId === 'all' ? (projects[0]?.id || '') : activeProjectId;
      const newPostData = {
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
      };
      const docRef = await addDoc(collection(db, 'posts'), newPostData);
      setSelectedPost({
        id: docRef.id,
        date,
        platform: 'instagram',
        phase: 'idea_1',
        title: 'Nuevo Post',
        idea: 'Nueva idea de post...',
        references: [],
        copyCreativity: '',
        copyCaption: '',
        currentDesignUrl: '',
        projectId: assignedProjectId,
      });
      toast.success('Post creado');
    } catch (err) {
      toast.error('Error al crear el post');
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    }
    } finally {
      creatingPostRef.current = false;
    }
  };

  const handleUpdatePost = async (updates: Partial<Post>) => {
    if (!selectedPost) return;
    if (isOfflineMode) {
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, ...updates } : p));
      setSelectedPost(prev => prev ? ({ ...prev, ...updates }) : null);
      return;
    }
    try {
      const { id, ...cleanUpdates } = updates;
      const postRef = doc(db, 'posts', selectedPost.id);

      let payload: any;
      if (userRole === 'client') {
        // Clients can only ever change the phase itself, plus the small set of
        // status fields tied to approving or requesting changes (matches what
        // firestore.rules allows for the client branch) — never post content.
        payload = { phase: cleanUpdates.phase, updatedAt: serverTimestamp() };
        for (const key of ['approvedBy', 'approvedAt', 'changesRequestedReason', 'changesRequestedAt', 'changesRequestedBy']) {
          if (cleanUpdates[key] !== undefined) payload[key] = cleanUpdates[key];
        }
      } else {
        payload = {
          ...cleanUpdates,
          updatedAt: serverTimestamp()
        };
      }

      await updateDoc(postRef, payload);
      setSelectedPost(prev => ({ ...prev, ...updates }));

      if (cleanUpdates.phase && cleanUpdates.phase !== selectedPost.phase && currentUser) {
        try {
          await addDoc(collection(db, 'notifications'), {
            user: currentUser.displayName || 'Usuario',
            action: getPhaseChangeAction(selectedPost.phase, cleanUpdates.phase),
            target: selectedPost.idea,
            projectId: selectedPost.projectId || '',
            createdAt: serverTimestamp(),
            type: 'status',
            avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Usuario')}`
          });
        } catch (notifErr) {
          // Best-effort — the phase update itself already succeeded, so a
          // failed activity-log write shouldn't surface as an error to the user.
          console.warn('Error al registrar la notificación de cambio de fase:', notifErr);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/longer than|maximum size|exceeds/i.test(message)) {
        toast.error('El post ha alcanzado el límite de tamaño de Firestore (1MB). Elimina alguna versión guardada del diseño o usa una imagen más ligera.', { duration: 6000 });
      } else {
        toast.error('Error al actualizar');
      }
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

      const previousPost = posts.find(p => p.id === postId);
      if (updates.phase && previousPost && updates.phase !== previousPost.phase && currentUser) {
        try {
          await addDoc(collection(db, 'notifications'), {
            user: currentUser.displayName || 'Usuario',
            action: getPhaseChangeAction(previousPost.phase, updates.phase),
            target: previousPost.idea,
            projectId: previousPost.projectId || '',
            createdAt: serverTimestamp(),
            type: 'status',
            avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Usuario')}`
          });
        } catch (notifErr) {
          console.warn('Error al registrar la notificación de cambio de fase:', notifErr);
        }
      }
    } catch (err) {
      toast.error('Error al actualizar');
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (deletingPostRef.current) return;
    deletingPostRef.current = true;
    try {
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
    } finally {
      deletingPostRef.current = false;
    }
  };

  const handleDuplicatePost = async (post: any) => {
    if (duplicatingPostRef.current) return;
    duplicatingPostRef.current = true;
    try {
    const titleCopy = post.title ? `${post.title} (copia)` : 'Nuevo Post (copia)';

    if (isOfflineMode) {
      const newPost = {
        ...post,
        id: `local-post-${Date.now()}`,
        title: titleCopy,
        phase: 'idea_1',
        captionVersions: [],
        creativityVersions: [],
        designVersions: [],
        updatedAt: new Date()
      };
      setPosts(prev => [...prev, newPost]);
      setSelectedPost(newPost);
      toast.success('Post duplicado (Modo Demo)');
      return;
    }

    try {
      const { id, ...rest } = post;
      const newPostData = {
        ...rest,
        date: post.date instanceof Date ? Timestamp.fromDate(post.date) : post.date,
        title: titleCopy,
        phase: 'idea_1',
        captionVersions: [],
        creativityVersions: [],
        designVersions: [],
        createdBy: currentUser?.uid,
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'posts'), newPostData);
      toast.success('Post duplicado correctamente');
      setSelectedPost({ ...post, id: docRef.id, title: titleCopy, phase: 'idea_1', captionVersions: [], creativityVersions: [], designVersions: [] });
    } catch (err) {
      toast.error('Error al duplicar el post');
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    }
    } finally {
      duplicatingPostRef.current = false;
    }
  };

  const handleAddComment = async (text: string) => {
    if (!selectedPost || !currentUser) return;
    if (addingCommentRef.current) return;
    addingCommentRef.current = true;
    try {
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
            toast.success(`@${mentionClean} verá tu mención en su stream de notificaciones`, { duration: 4000 });
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
        projectId: selectedPost.projectId || '',
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
            toast.success(`@${mentionClean} verá tu mención en su stream de notificaciones`, { duration: 4000 });
            
            // Add real mention notification to Firestore so it shows up in dynamic feed
            await addDoc(collection(db, 'notifications'), {
              user: currentUser.displayName || 'Usuario',
              action: `etiquetó a @${mentionClean} en`,
              target: selectedPost.idea,
              projectId: selectedPost.projectId || '',
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
    } finally {
      addingCommentRef.current = false;
    }
  };

  const handleAddFeedback = async (text: string) => {
    if (!selectedPost || !currentUser) return;
    if (addingFeedbackRef.current) return;
    addingFeedbackRef.current = true;
    try {
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
        projectId: selectedPost.projectId || '',
        createdAt: serverTimestamp(),
        type: 'comment',
        avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Usuario')}`
      });
    } catch (err) {
      toast.error('Error al enviar feedback');
      handleFirestoreError(err, OperationType.CREATE, pathFeedbacks);
    }
    } finally {
      addingFeedbackRef.current = false;
    }
  };

  const handleToggleFeedbackDone = async (feedbackId: string, currentDone: boolean) => {
    if (!selectedPost) return;
    if (togglingFeedbackRef.current.has(feedbackId)) return;
    togglingFeedbackRef.current.add(feedbackId);
    try {
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
        projectId: selectedPost.projectId || '',
        createdAt: serverTimestamp(),
        type: 'status',
        avatar: currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'Usuario')}`
      });
    } catch (err) {
      toast.error('Error al actualizar feedback');
      handleFirestoreError(err, OperationType.UPDATE, `${pathFeedbacks}/${feedbackId}`);
    }
    } finally {
      togglingFeedbackRef.current.delete(feedbackId);
    }
  };

  const handleUpdateFeedback = async (feedbackId: string, newText: string) => {
    if (!selectedPost) return;
    if (updatingFeedbackRef.current.has(feedbackId)) return;
    updatingFeedbackRef.current.add(feedbackId);
    try {
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
    } finally {
      updatingFeedbackRef.current.delete(feedbackId);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!selectedPost) return;
    if (deletingFeedbackRef.current.has(feedbackId)) return;
    deletingFeedbackRef.current.add(feedbackId);
    try {
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
    } finally {
      deletingFeedbackRef.current.delete(feedbackId);
    }
  };

  const handleCreateProject = async (data: NewProjectData) => {
    if (isOfflineMode) {
      const newProjId = `local-project-${Date.now()}`;
      const newProj = {
        id: newProjId,
        ...data,
        createdAt: new Date()
      };
      setProjects(prev => [...prev, newProj]);
      toast.success('¡Proyecto creado con éxito! (Modo Demo)');
      setActiveProjectId(newProjId);
      setShowNewProjectModal(false);
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        ...data,
        createdAt: new Date()
      });
      toast.success('¡Proyecto creado con éxito!');
      setActiveProjectId(docRef.id); // Auto select the brand new project!
      setShowNewProjectModal(false);
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
      (post.title || '').toLowerCase().includes(query) ||
      (post.idea || '').toLowerCase().includes(query) ||
      (post.copyCaption || '').toLowerCase().includes(query) ||
      (post.copyCreativity || '').toLowerCase().includes(query) ||
      (post.platform || '').toLowerCase().includes(query)
    );
  });

  // Extra filters (fase/plataforma/territorio/responsable) apply only to the
  // Calendar/Board view, not to the feed simulators — those already filter by
  // their own platform and would behave confusingly if these silently applied too.
  const calendarBoardPosts = filteredPosts.filter(post => {
    if (filterPhase !== 'all' && post.phase !== filterPhase) return false;
    if (filterPlatform !== 'all' && post.platform !== filterPlatform) return false;
    if (filterTerritory !== 'all' && (post.territory || '') !== filterTerritory) return false;
    if (filterAssignedToMe && post.assigneeId !== currentUser?.uid) return false;
    return true;
  });

  const approvedPosts = filteredPosts.filter(post => post.phase === 'approved');

  const matchingSuggestions = searchQuery.trim()
    ? posts.filter(post => {
        if (!hasProjectPermission(post.projectId)) return false;

        const matchesProject = activeProjectId === 'all' || post.projectId === activeProjectId;
        if (!matchesProject) return false;

        const query = searchQuery.toLowerCase();
        return (
          (post.title || '').toLowerCase().includes(query) ||
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
        <div className="w-12 h-12 bg-app-accent rounded-2xl animate-pulse shadow-lg shadow-app-accent/20" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-gradient-to-br from-app-accent-subtle/60 to-app-accent-subtle/20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-app-accent/20">
             <div className="w-20 h-20 bg-app-accent rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg shadow-app-accent/20 mb-6">
                <LayoutDashboard size={40} />
             </div>
             <h1 className="text-4xl font-black text-ink tracking-tight mb-2">SocialFlow</h1>
             <p className="text-ink-secondary font-medium mb-10 leading-relaxed text-sm">
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
          <p className="text-caption text-ink-muted tracking-wide">
            © 2026 SocialFlow Agency Tool
          </p>
        </motion.div>
      </div>
    );
  }

  if (userRole === 'pending' && !isOfflineMode) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-gradient-to-br from-app-accent-subtle/60 to-app-accent-subtle/20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-app-accent/20">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl mx-auto flex items-center justify-center mb-6">
              <Clock size={40} />
            </div>
            <h1 className="text-2xl font-black text-ink tracking-tight mb-2">Cuenta pendiente de aprobación</h1>
            <p className="text-ink-secondary font-medium mb-8 leading-relaxed text-sm">
              Tu cuenta <span className="font-semibold text-ink-secondary">{currentUser.email}</span> se ha creado, pero todavía no tiene un rol ni proyectos asignados. Pide a un administrador de la agencia que te dé acceso desde Configuración.
            </p>
            <button
              onClick={logOut}
              className="w-full bg-gray-100 hover:bg-gray-200 text-ink-secondary py-3 px-6 rounded-2xl font-bold transition-all active:scale-95"
            >
              Cerrar sesión
            </button>
          </div>
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
      <div className="min-h-screen bg-gray-50 flex flex-1">
        <Toaster position="bottom-right" />
      
      {/* Sidebar - Desktop Only with Fixed Height (h-screen, sticky, non-scrollable) —
          always rendered, including on the Dashboard, so the app's chrome (logo,
          nav, account footer) never swaps out for a separate screen. */}
        <aside className="w-64 bg-white border-r border-divider p-6 flex flex-col shrink-0 hidden lg:flex h-screen sticky top-0 overflow-hidden justify-between">
          <div className="flex flex-col overflow-hidden flex-1">
            {/* Logo / Header */}
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="w-10 h-10 bg-app-accent rounded-xl flex items-center justify-center text-white shadow-md shadow-app-accent/15 transition-all">
                <LayoutDashboard size={20} />
              </div>
              <span className="text-xl font-black text-ink font-sans tracking-tight">SocialFlow</span>
            </div>

            {/* Nav Tab List (scrollable if screen is extremely small, but self-contained) */}
            <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide">
              <NavItems
                orientation="vertical"
                items={getNavItems(false)}
                activeId={activeNavId}
                onSelect={handleNavSelect}
              />
            </div>
          </div>

          {/* Fixed Footer Elements */}
          <div className="shrink-0 pt-4 border-t border-divider space-y-4">
            {/* Project Label Display (Now at the bottom, above user) */}
            <div className="relative bg-slate-50 border border-divider/80 p-3.5 rounded-2xl shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-caption text-ink-muted">Proyecto seleccionado</label>
                
                {/* Information Icon Tooltip */}
                <div className="relative group leading-none flex items-center justify-center">
                  <Info size={14} className="text-ink-muted hover:text-ink-secondary cursor-pointer transition-colors" />
                  <div className="absolute right-0 bottom-full mb-2 w-52 bg-slate-800 text-white text-[11px] p-2.5 rounded-xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 leading-normal font-medium border border-slate-700">
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
                  style={{ backgroundColor: activeProjectId === 'dashboard' ? '#4F46E5' : (projects.find(p => p.id === activeProjectId)?.color || '#4F46E5') }}
                />
                <span className="text-xs font-bold text-ink truncate">
                  {activeProjectId === 'dashboard' ? '📂 Panel de Proyectos' : activeProjectId === 'all' ? '📁 Todos los Proyectos' : (projects.find(p => p.id === activeProjectId)?.name || 'Cargando...')}
                </span>
              </div>
              {activeProjectId !== 'dashboard' && (
                <button 
                  onClick={() => selectProject('dashboard')}
                  className="mt-3 w-full bg-white hover:bg-slate-100 border border-divider text-ink-secondary text-[11px] font-black py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  ← Volver al Dashboard
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Avatar name={currentUser.displayName || 'Usuario'} src={currentUser.photoURL || undefined} className="border-2 border-white shadow-sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink truncate">{currentUser.displayName}</p>
                <p className="text-[11px] font-semibold text-app-accent truncate">{ROLES[userRole]}</p>
              </div>
              <IconButton icon={LogOut} onClick={logOut} variant="danger" aria-label="Cerrar Sesión" title="Cerrar Sesión" className="shrink-0" />
            </div>
          </div>
        </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar — always rendered, including on the Dashboard */}
          <header className="h-20 bg-white border-b border-divider px-6 flex items-center justify-between shrink-0">
            <div ref={searchContainerRef} className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
              <input
                aria-label="Buscar posts, ideas, copys o plataformas"
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
                className="w-full bg-gray-50 border border-transparent rounded-md py-2.5 pl-12 pr-10 text-sm focus:bg-white focus:border-app-accent/20 focus:ring-4 focus:ring-app-accent/5 transition-all outline-none"
              />
              {searchQuery && (
                <IconButton
                  icon={X}
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-transparent hover:bg-gray-200"
                  title="Limpiar búsqueda"
                  aria-label="Limpiar búsqueda"
                />
              )}

              <AnimatePresence>
                {showSuggestions && searchQuery.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-divider rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100"
                  >
                    <div className="p-3 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-ink-muted uppercase tracking-wider">
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
                                    <Video size={13} className="text-ink shrink-0" />
                                  )}
                                  {proj && (
                                    <span 
                                      className="text-[11px] font-black px-1.5 py-0.5 rounded-md truncate shrink-0 max-w-[130px]"
                                      style={{ backgroundColor: `${proj.color}12`, color: proj.color }}
                                    >
                                      {proj.name}
                                    </span>
                                  )}
                                </div>
                                {/* Right side: Phase Badge */}
                                {phaseInfo && <PhaseBadge phase={post.phase as Phase} className="shrink-0" />}
                              </div>
                              
                              {/* Idea / content description */}
                              <p className="text-xs font-bold text-ink line-clamp-1 group-hover:text-app-accent transition-colors">
                                {post.idea}
                              </p>

                              {/* Caption preview if available */}
                              {post.copyCaption && (
                                <p className="text-caption text-ink-muted line-clamp-1 italic">
                                  "{post.copyCaption}"
                                </p>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center text-ink-muted text-xs flex flex-col items-center justify-center gap-2">
                          <span>🔍</span>
                          <p className="font-bold text-ink-muted">No se encontraron posts</p>
                          <p className="text-caption text-ink-muted">Prueba a buscar otra palabra clave, idea o plataforma.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-4">
              {/* Topbar Client/Project Label */}
              <div className="flex items-center gap-2 bg-gray-100/70 border border-divider/50 px-3.5 py-2 rounded-xl">
                <span className="text-caption text-ink-muted hidden sm:inline">Proyecto:</span>
                <span className="text-xs font-bold text-ink-secondary">
                  {activeProjectId === 'dashboard' ? 'Panel de Control' : activeProjectId === 'all' ? 'Todos los Proyectos' : (projects.find(p => p.id === activeProjectId)?.name || 'Cargando...')}
                </span>
              </div>


              <IconButton
                icon={BookOpen}
                onClick={() => setShowGuideModal(true)}
                className="bg-app-accent-subtle text-app-accent hover:bg-app-accent/20 hover:text-app-accent shrink-0"
                title="Abrir Guía de Uso"
                aria-label="Abrir Guía de Uso"
              />
              {/* On the Dashboard, "Configuración" isn't in the sidebar yet (it's
                  project-scoped and no project is selected) — this is the only
                  way an admin reaches it from here. */}
              {userRole === 'admin' && activeProjectId === 'dashboard' && (
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
                  className="bg-white hover:bg-slate-50 border border-divider text-ink-secondary px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Settings size={14} className="text-ink-secondary" />
                  Ajustes de Plataforma
                </button>
              )}
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

        {/* Content Area */}
        <div className={cn(
          "flex-1 flex flex-col gap-4 sm:gap-6",
          activeProjectId === 'dashboard' 
            ? "p-6 sm:p-10 max-w-6xl mx-auto w-full overflow-y-auto" 
            : "p-4 sm:p-6 pb-24 lg:pb-6 overflow-hidden"
        )}>
          {activeProjectId === 'dashboard' ? (
            <div className="space-y-8 animate-fade-in">
              {/* Welcome banner (Minimalist look) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-divider shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-app-accent/10 rounded-full translate-x-32 -translate-y-32 blur-3xl" />
                <div className="relative z-10 space-y-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-app-accent uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-app-accent animate-pulse" />
                    Panel de Control Global
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                    ¡Hola, {currentUser?.displayName?.split(' ')[0] || 'Usuario'}!
                  </h2>
                  <p className="text-xs sm:text-sm text-ink-secondary max-w-xl font-semibold leading-relaxed">
                    Bienvenido a SocialFlow. Selecciona un proyecto para planificar contenidos en el calendario, redactar copys, adjuntar diseños y ver feeds en vivo.
                  </p>
                </div>
              </div>

              {/* Projects list */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-ink flex items-center gap-2">
                    <Grid size={16} className="text-app-accent" />
                    Tus proyectos
                  </h3>
                  {userRole === 'admin' && (
                    <button
                      onClick={() => setShowNewProjectModal(true)}
                      className="bg-white hover:bg-gray-50 text-ink-secondary border border-divider shadow-sm px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Plus size={14} />
                      Nuevo Proyecto
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {projects.filter(p => hasProjectPermission(p.id)).length === 0 ? (
                    <div className="col-span-full bg-white rounded-[2.25rem] p-12 border border-divider shadow-sm text-center space-y-3">
                      <span className="text-3xl">📁</span>
                      <h4 className="font-extrabold text-ink text-sm">No tienes proyectos asignados</h4>
                      <p className="text-xs text-ink-muted max-w-sm mx-auto">
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
                        <button
                          type="button"
                          key={proj.id}
                          onClick={() => {
                            selectProject(proj.id);
                            setSidebarTab('calendario');
                          }}
                          className="bg-white rounded-[2.25rem] border border-divider/80 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden group animate-fade-in relative animate-fade-in text-left"
                        >
                          <div className="p-7 flex-1 flex flex-col justify-between space-y-6">
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5">
                                <h4 className="font-black text-ink text-lg sm:text-xl group-hover:text-app-accent transition-colors line-clamp-1 tracking-tight">
                                  {proj.name}
                                </h4>
                                <p className="text-xs text-ink-muted font-semibold">
                                  Cliente: <span className="text-ink-secondary font-normal">{proj.clientName}</span>
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
                            <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-divider/50">
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider leading-none">Total Posts</p>
                                <p className="text-xl sm:text-2xl font-black text-ink">{total}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider leading-none">En Producción</p>
                                <p className="text-xl sm:text-2xl font-black text-orange-600">{enProduccion}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider leading-none">Aprobados</p>
                                <p className="text-xl sm:text-2xl font-black text-emerald-600">{aprobados}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider leading-none">Publicados</p>
                                <p className="text-xl sm:text-2xl font-black text-app-accent">{publicados}</p>
                              </div>
                            </div>

                            {/* Was a nested <button> that duplicated the card's own onClick (no
                                separate action, always bubbled to the same handler) — now that
                                the card itself is a real <button>, this has to be a <span> or
                                the card would contain an invalid nested button. */}
                            <span
                              className="w-full bg-slate-50 group-hover:bg-app-accent group-hover:text-white text-ink-secondary font-extrabold text-xs py-3 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 border border-divider"
                            >
                              Entrar al Proyecto
                              <span className="text-ink-muted group-hover:text-white group-hover:translate-x-1 transition-transform">→</span>
                            </span>
                          </div>
                        </button>
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
                    { label: 'Aprobados', value: stats.approved, icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Publicados', value: stats.published, icon: ShieldCheck, color: 'text-app-accent', bg: 'bg-app-accent-subtle' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-divider shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02]">
                      <div className={cn("p-3 rounded-xl", stat.bg, stat.color)}>
                        <stat.icon size={20} />
                      </div>
                      <div>
                        <p className="text-caption text-ink-muted leading-none mb-1">{stat.label}</p>
                        <p className="text-xl font-black text-ink">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* View Switcher */}
              {sidebarTab === 'calendario' && (
                <div className="flex items-center justify-between shrink-0">
                  <SegmentedControl
                    aria-label="Vista de calendario"
                    fullWidth={false}
                    value={view}
                    onChange={(v) => setView(v as 'calendar' | 'board')}
                    options={[
                      { value: 'calendar', label: 'Calendario', icon: CalendarIcon },
                      { value: 'board', label: 'Producción (Board)', icon: Columns }
                    ]}
                  />

                  {(() => {
                    const activeProj = projects.find(p => p.id === activeProjectId);
                    const projectTerritories: string[] = activeProj?.territories || [];
                    const hasActiveFilters = filterPhase !== 'all' || filterPlatform !== 'all' || filterTerritory !== 'all' || filterAssignedToMe;
                    return (
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* Native <select>, styled as the same filter-chip pill used by
                            "Asignado a mí" — a real dropdown menu would need a Menu/Popover
                            primitive this app doesn't have yet; the native control already
                            gives keyboard support and correct semantics for free. */}
                        <div className={cn(
                          "relative rounded-full border transition-all",
                          filterPhase !== 'all' ? "bg-app-accent/10 border-app-accent" : "bg-white border-divider hover:border-outline"
                        )}>
                          <select
                            value={filterPhase}
                            onChange={e => setFilterPhase(e.target.value as Phase | 'all')}
                            aria-label="Filtrar por fase"
                            className={cn(
                              "appearance-none bg-transparent rounded-full py-1.5 pl-3 pr-7 text-xs font-bold outline-none cursor-pointer",
                              filterPhase !== 'all' ? "text-app-accent" : "text-ink-secondary"
                            )}
                          >
                            <option value="all">Todas las fases</option>
                            {(Object.keys(PHASES) as Phase[]).filter(p => p !== 'idea_2').map(p => (
                              <option key={p} value={p}>{PHASES[p].label}</option>
                            ))}
                          </select>
                          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted" />
                        </div>
                        <div className={cn(
                          "relative rounded-full border transition-all",
                          filterPlatform !== 'all' ? "bg-app-accent/10 border-app-accent" : "bg-white border-divider hover:border-outline"
                        )}>
                          <select
                            value={filterPlatform}
                            onChange={e => setFilterPlatform(e.target.value as any)}
                            aria-label="Filtrar por plataforma"
                            className={cn(
                              "appearance-none bg-transparent rounded-full py-1.5 pl-3 pr-7 text-xs font-bold outline-none cursor-pointer",
                              filterPlatform !== 'all' ? "text-app-accent" : "text-ink-secondary"
                            )}
                          >
                            <option value="all">Todas las plataformas</option>
                            <option value="instagram">Instagram</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="tiktok">TikTok</option>
                          </select>
                          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted" />
                        </div>
                        {projectTerritories.length > 0 && (
                          <div className={cn(
                            "relative rounded-full border transition-all",
                            filterTerritory !== 'all' ? "bg-app-accent/10 border-app-accent" : "bg-white border-divider hover:border-outline"
                          )}>
                            <select
                              value={filterTerritory}
                              onChange={e => setFilterTerritory(e.target.value)}
                              aria-label="Filtrar por territorio"
                              className={cn(
                                "appearance-none bg-transparent rounded-full py-1.5 pl-3 pr-7 text-xs font-bold outline-none cursor-pointer",
                                filterTerritory !== 'all' ? "text-app-accent" : "text-ink-secondary"
                              )}
                            >
                              <option value="all">Todos los territorios</option>
                              {projectTerritories.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted" />
                          </div>
                        )}
                        {userRole !== 'client' && (
                          <button
                            type="button"
                            onClick={() => setFilterAssignedToMe(!filterAssignedToMe)}
                            className={cn(
                              "text-xs font-bold px-3 py-1.5 rounded-full border transition-all",
                              filterAssignedToMe
                                ? "bg-app-accent/10 border-app-accent text-app-accent"
                                : "bg-white border-divider text-ink-secondary hover:border-outline"
                            )}
                          >
                            Asignado a mí
                          </button>
                        )}
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={() => {
                              setFilterPhase('all');
                              setFilterPlatform('all');
                              setFilterTerritory('all');
                              setFilterAssignedToMe(false);
                            }}
                            className="text-xs font-bold text-ink-muted hover:text-ink-secondary px-2 py-1.5"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex-1 overflow-y-auto flex flex-col">
                {sidebarTab === 'calendario' && (
                  view === 'calendar' ? (
                    <Calendar
                      posts={calendarBoardPosts}
                      userRole={userRole}
                      onAddPost={handleCreatePost}
                      onSelectPost={openPostModal}
                      onUpdatePost={handleUpdatePostDirectly}
                      loading={postsLoading || projectsLoading}
                    />
                  ) : (
                    <Board
                      posts={calendarBoardPosts}
                      userRole={userRole}
                      onSelectPost={openPostModal}
                      onUpdatePost={handleUpdatePostDirectly}
                      loading={postsLoading || projectsLoading}
                    />
                  )
                )}

                {sidebarTab === 'instagram_feed' && (
                  <InstagramFeed
                    posts={filteredPosts}
                    onSelectPost={openPostModal}
                    userRole={userRole}
                    loading={postsLoading}
                  />
                )}

                {sidebarTab === 'linkedin_feed' && (
                  <LinkedInFeed
                    posts={filteredPosts}
                    onSelectPost={openPostModal}
                    userRole={userRole}
                    projects={projects}
                    loading={postsLoading}
                  />
                )}

                {sidebarTab === 'tiktok_feed' && (
                  <TikTokFeed
                    posts={filteredPosts}
                    onSelectPost={openPostModal}
                    userRole={userRole}
                    projects={projects}
                    loading={postsLoading}
                  />
                )}

                {sidebarTab === 'publicacion' && (
                  <PublishHubView
                    posts={approvedPosts}
                    onSelectPost={openPostModal}
                    loading={postsLoading || projectsLoading}
                  />
                )}

                {sidebarTab === 'notificaciones' && (
                  <NotificationsStream
                    userRole={userRole}
                    userProjectId={userProjectId}
                    permittedProjects={permittedProjects}
                  />
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

      {/* Mobile Bottom Navigation Bar — always rendered, including on the Dashboard */}
        <NavItems
          orientation="horizontal"
          items={getNavItems(true)}
          activeId={activeNavId}
          onSelect={handleNavSelect}
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-divider h-16 px-2 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] shrink-0"
        />

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
            onClose={() => { setSelectedPost(null); setSelectedPostInitialTab(undefined); }}
            userRole={userRole}
            comments={comments}
            feedbacks={feedbacks}
            onAddComment={handleAddComment}
            onAddFeedback={handleAddFeedback}
            onToggleFeedbackDone={handleToggleFeedbackDone}
            onUpdateFeedback={handleUpdateFeedback}
            onDeleteFeedback={handleDeleteFeedback}
            onUpdate={handleUpdatePost}
            onDelete={handleDeletePost}
            onDuplicate={handleDuplicatePost}
            projects={projects}
            initialTab={selectedPostInitialTab}
          />
        )}

        {showNewProjectModal && (
          <NewProjectModal
            onClose={() => setShowNewProjectModal(false)}
            onSubmit={handleCreateProject}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
