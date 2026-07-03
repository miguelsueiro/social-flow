/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { cn, Role, ROLES, Phase } from './lib/utils';
import Calendar from './components/Calendar';
import Board from './components/Board';
import PostModal from './components/PostModal';
import InstagramFeed from './components/InstagramFeed';
import LinkedInFeed from './components/LinkedInFeed';
import UsersList from './components/UsersList';
import NotificationsStream from './components/NotificationsStream';
import SettingsView from './components/SettingsView';
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
  Palette,
  X
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

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<Role>('creative_director'); // Default for demo
  const [userProjectId, setUserProjectId] = useState<string | null>(null);
  const [view, setView] = useState<'calendar' | 'board'>('calendar');
  const [sidebarTab, setSidebarTab] = useState<'calendario' | 'instagram_feed' | 'linkedin_feed' | 'usuarios' | 'notificaciones' | 'configuracion'>('calendario');
  const [posts, setPosts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('all');
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

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
        if (data.role === 'client' && data.projectId) {
          setActiveProjectId(data.projectId);
        }
      } else {
        // Set default role for new users
        const initialRole = 'creative_director';
        await setDoc(userDocRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          role: initialRole,
          name: currentUser.displayName || 'Usuario',
          projectId: ''
        });
        setUserRole(initialRole);
        setUserProjectId(null);
      }
    }, (err) => {
      console.error("Error subscribing to user doc:", err);
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
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return () => unsubProjects();
  }, [currentUser]);

  // Set the dynamic accent colors on documentElement based on the active project
  useEffect(() => {
    const activeProj = projects.find(p => p.id === activeProjectId);
    const color = activeProj?.color || '#2563EB'; // Fallback to Royal Blue
    document.documentElement.style.setProperty('--app-accent', color);
    const hoverColor = darkenColor(color, -10);
    document.documentElement.style.setProperty('--app-accent-hover', hoverColor);
  }, [activeProjectId, projects]);

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
      handleFirestoreError(error, OperationType.LIST, 'posts');
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
      handleFirestoreError(error, OperationType.LIST, pathComments);
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
      handleFirestoreError(error, OperationType.LIST, pathFeedbacks);
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
    try {
      const assignedProjectId = activeProjectId === 'all' ? (projects[0]?.id || '') : activeProjectId;
      await addDoc(collection(db, 'posts'), {
        date: Timestamp.fromDate(date),
        platform: 'instagram',
        phase: 'idea_1',
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectClient.trim()) {
      toast.error('Por favor, rellena los campos requeridos.');
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
    if (activeProjectId === 'all') return true;
    return post.projectId === activeProjectId;
  });

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
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            © 2026 SocialFlow Agency Tool
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      <Toaster position="bottom-right" />
      
      {/* Sidebar - Desktop Only with Fixed Height (h-screen, sticky, non-scrollable) */}
      <aside className="w-64 bg-white border-r border-gray-100 p-6 flex flex-col shrink-0 hidden lg:flex h-screen sticky top-0 overflow-hidden justify-between">
        <div className="flex flex-col overflow-hidden flex-1">
          {/* Logo / Header */}
          <div className="flex items-center gap-3 mb-6 shrink-0">
            <div className="w-10 h-10 bg-app-accent rounded-xl flex items-center justify-center text-white shadow-md shadow-app-accent/15 transition-all">
              <LayoutDashboard size={20} />
            </div>
            <span className="text-xl font-black text-gray-900 font-sans tracking-tight">SocialFlow</span>
          </div>

          {/* Project Label Display */}
          <div className="mb-6 bg-slate-50 border border-slate-100/80 p-3.5 rounded-2xl shrink-0">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Proyecto Seleccionado</label>
            <div className="flex items-center gap-2">
              <div 
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: projects.find(p => p.id === activeProjectId)?.color || '#2563EB' }}
              />
              <span className="text-xs font-bold text-gray-800 truncate">
                {activeProjectId === 'all' ? '📁 Todos los Proyectos' : (projects.find(p => p.id === activeProjectId)?.name || 'Cargando...')}
              </span>
            </div>
            {userRole !== 'client' ? (
              <p className="text-[9px] text-gray-400 mt-2">
                Puedes cambiar de proyecto en la pestaña <strong className="text-app-accent">Configuración</strong>.
              </p>
            ) : (
              <p className="text-[9px] text-gray-400 mt-2">
                Acceso exclusivo al proyecto asignado.
              </p>
            )}
          </div>

          {/* Nav Tab List (scrollable if screen is extremely small, but self-contained) */}
          <nav className="flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-hide">
            {[
              { id: 'calendario', label: 'Calendario', icon: LayoutDashboard },
              { id: 'instagram_feed', label: 'Feed Instagram', icon: Instagram },
              { id: 'linkedin_feed', label: 'Feed LinkedIn', icon: Globe },
              { id: 'usuarios', label: 'Usuarios', icon: Users },
              { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
              { id: 'configuracion', label: 'Configuración', icon: Settings }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setSidebarTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  sidebarTab === item.id 
                    ? "bg-app-accent/10 text-app-accent" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Fixed Footer Elements */}
        <div className="shrink-0 pt-4 border-t border-gray-100 space-y-4">
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-app-accent" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Modo de Rol</span>
            </div>
            <select 
              value={userRole}
              onChange={async (e) => {
                const newRole = e.target.value as Role;
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
              className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-app-accent/20"
            >
              {Object.entries(ROLES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <img 
               src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`} 
               className="w-10 h-10 rounded-full border-2 border-white shadow-sm" 
               alt="avatar" 
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate">{currentUser.displayName}</p>
              <p className="text-[10px] font-bold text-app-accent uppercase tracking-wider truncate">{ROLES[userRole]}</p>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-20 bg-white border-b border-gray-100 px-6 flex items-center justify-between shrink-0">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              placeholder="Buscar posts, ideas, copys..." 
              className="w-full bg-gray-50 border border-transparent rounded-2xl py-2.5 pl-12 pr-4 text-sm focus:bg-white focus:border-app-accent/20 focus:ring-4 focus:ring-app-accent/5 transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            {/* Topbar Client/Project Label */}
            <div className="flex items-center gap-2 bg-gray-100/70 border border-gray-200/50 px-3.5 py-2 rounded-xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider hidden sm:inline">PROYECTO:</span>
              <span className="text-xs font-bold text-gray-700">
                {activeProjectId === 'all' ? 'Todos los Proyectos' : (projects.find(p => p.id === activeProjectId)?.name || 'Cargando...')}
              </span>
            </div>

            <div className="flex flex-col items-end mr-2 hidden md:flex">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest leading-none mb-1">PRODUCCIÓN</span>
              <span className="text-xs font-semibold text-gray-800">Q2 2026 PLAN</span>
            </div>
            {userRole !== 'client' && (
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
        <div className="p-6 flex-1 overflow-hidden flex flex-col gap-6">
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
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
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

            {sidebarTab === 'usuarios' && (
              <UsersList 
                currentUserRole={userRole}
                onRoleChange={setUserRole}
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
                setActiveProjectId={setActiveProjectId}
                userRole={userRole}
              />
            )}
          </div>
        </div>
      </main>

      {/* Modals & Dialogs */}
      <AnimatePresence>
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
  );
}
