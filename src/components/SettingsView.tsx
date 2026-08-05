import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Save, 
  Globe, 
  Bell,
  Trash2,
  Plus, 
  Folder, 
  User, 
  Grid,
  Check,
  ShieldCheck,
  AlertTriangle,
  X,
  Search,
  UserPlus,
  Mail,
  Users,
  CheckCircle,
  Edit2
} from 'lucide-react';
import { InstagramIcon, TikTokIcon, LinkedInIcon } from './SocialIcons';
import ConfirmInline from './ConfirmInline';
import NewProjectModal, { NewProjectData } from './NewProjectModal';
import TagListEditor from './TagListEditor';
import Button from './Button';
import Toggle from './Toggle';
import IconButton from './IconButton';
import Field from './Field';
import Modal from './Modal';
import Avatar from './Avatar';
import EmptyState from './EmptyState';
import { toast } from 'react-hot-toast';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { cn, ROLES, Role, ASSIGNABLE_ROLES } from '../lib/utils';
import { useModalA11y } from '../lib/useModalA11y';

interface Project {
  id: string;
  name: string;
  clientName: string;
  color: string;
  platforms?: string[];
  territories?: string[];
}

interface SettingsViewProps {
  projects: Project[];
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  userRole: string;
  onRoleChange: (role: Role) => void;
  permittedProjects?: string[];
  userProjectId?: string | null;
}

export default function SettingsView({ 
  projects, 
  activeProjectId, 
  setActiveProjectId, 
  userRole, 
  onRoleChange,
  permittedProjects = [],
  userProjectId = null
}: SettingsViewProps) {
  const [agencyName, setAgencyName] = useState('Basetis Creative Studio');
  const [timezone, setTimezone] = useState('Europe/Madrid');
  const [notifySlack, setNotifySlack] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyClientApprove, setNotifyClientApprove] = useState(true);
  const [isSavingAgencySettings, setIsSavingAgencySettings] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'agency'), (snap) => {
      const data = snap.data();
      if (!data) return;
      if (data.agencyName) setAgencyName(data.agencyName);
      if (data.timezone) setTimezone(data.timezone);
      if (typeof data.notifySlack === 'boolean') setNotifySlack(data.notifySlack);
      if (typeof data.notifyEmail === 'boolean') setNotifyEmail(data.notifyEmail);
      if (typeof data.notifyClientApprove === 'boolean') setNotifyClientApprove(data.notifyClientApprove);
    }, (err) => {
      console.warn('No se pudo cargar la configuración de la agencia:', err);
    });
    return () => unsub();
  }, []);

  const [usersList, setUsersList] = useState<any[]>([]);
  const [projectAccessUserId, setProjectAccessUserId] = useState<string | null>(null);
  const [projectAccessDraft, setProjectAccessDraft] = useState<string[]>([]);
  const [projectAccessSearch, setProjectAccessSearch] = useState('');
  const [isSavingProjectAccess, setIsSavingProjectAccess] = useState(false);

  const openProjectAccessModal = (usr: any) => {
    const current = usr.permittedProjects || (usr.projectId ? [usr.projectId] : []);
    setProjectAccessUserId(usr.id);
    setProjectAccessDraft(current);
    setProjectAccessSearch('');
  };

  const closeProjectAccessModal = () => {
    setProjectAccessUserId(null);
    setProjectAccessDraft([]);
    setProjectAccessSearch('');
  };

  const handleSaveProjectAccess = async () => {
    if (!projectAccessUserId) return;
    const targetUser = usersList.find(u => u.id === projectAccessUserId);
    setIsSavingProjectAccess(true);
    try {
      await updateDoc(doc(db, 'users', projectAccessUserId), {
        permittedProjects: projectAccessDraft,
        // Kept for the client-scoping rule in firestore.rules, which still
        // reads the single `projectId` field — always the first assigned one.
        projectId: projectAccessDraft[0] || ''
      });
      toast.success(`Acceso a proyectos actualizado para ${targetUser?.name || 'el usuario'}`);
      closeProjectAccessModal();
    } catch (err) {
      toast.error('Error al actualizar el acceso a proyectos');
      console.error(err);
    } finally {
      setIsSavingProjectAccess(false);
    }
  };

  const projectAccessModalRef = useModalA11y(closeProjectAccessModal, projectAccessUserId !== null);
  const projectAccessUser = usersList.find(u => u.id === projectAccessUserId) || null;

  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('client');
  const [inviteName, setInviteName] = useState('');
  const [inviteProjectId, setInviteProjectId] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;
    if (inviteRole === 'client' && !inviteProjectId) {
      toast.error('Selecciona a qué proyecto pertenece este cliente');
      return;
    }

    try {
      const email = inviteEmail.trim().toLowerCase();
      await setDoc(doc(db, 'invites', email), {
        email,
        name: inviteName.trim(),
        role: inviteRole,
        projectId: inviteRole === 'client' ? inviteProjectId : '',
        permittedProjects: inviteRole === 'client' ? [inviteProjectId] : [],
        invitedBy: auth.currentUser?.uid || null,
        invitedAt: new Date()
      });
      toast.success('Invitación creada. Comparte con esa persona el enlace de la app para que entre con su cuenta de Google.', { duration: 6000 });
      setInviteEmail('');
      setInviteName('');
      setInviteProjectId('');
      setShowInviteModal(false);
    } catch (err) {
      toast.error('Error al crear la invitación');
      console.error(err);
    }
  };

  const handleRoleChangeInDb = async (userId: string, newRole: Role) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success('Rol de usuario actualizado');
    } catch (err) {
      toast.error('Error al actualizar rol');
      console.error(err);
    }
  };

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserStatus, setEditUserStatus] = useState('active');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const startEditingUser = (usr: any) => {
    setEditingUserId(usr.id);
    setEditUserName(usr.name || '');
    setEditUserEmail(usr.email || '');
    setEditUserStatus(usr.status || 'active');
  };

  const handleSaveUser = async (userId: string) => {
    if (!editUserName.trim() || !editUserEmail.trim()) {
      toast.error('Nombre y correo son obligatorios');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), {
        name: editUserName.trim(),
        email: editUserEmail.trim(),
        status: editUserStatus
      });
      toast.success('Usuario actualizado correctamente');
      setEditingUserId(null);
    } catch (err) {
      toast.error('Error al actualizar usuario');
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('Usuario eliminado correctamente');
      setUserToDelete(null);
    } catch (err) {
      toast.error('Error al eliminar usuario');
      console.error(err);
    }
  };

  useEffect(() => {
    if (userRole !== 'admin') return;
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsersList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [userRole]);

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

  // New project modal open flag
  const [isAdding, setIsAdding] = useState(false);

  // Edit states for projects
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editPlatforms, setEditPlatforms] = useState<string[]>(['instagram', 'linkedin', 'tiktok']);
  const [editTerritories, setEditTerritories] = useState<string[]>([]);

  const handleSaveAgencySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAgencySettings(true);
    try {
      await setDoc(doc(db, 'settings', 'agency'), {
        agencyName: agencyName.trim(),
        timezone,
        notifySlack,
        notifyEmail,
        notifyClientApprove
      });
      toast.success('Configuración general guardada con éxito');
    } catch (err) {
      toast.error('Error al guardar la configuración');
      console.error(err);
    } finally {
      setIsSavingAgencySettings(false);
    }
  };

  const handleCreateProject = async (data: NewProjectData) => {
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        ...data,
        createdAt: new Date()
      });
      toast.success('¡Proyecto creado con éxito!');
      setActiveProjectId(docRef.id);
      setIsAdding(false);
    } catch (err) {
      toast.error('Error al crear el proyecto');
      console.error(err);
    }
  };

  const startEditProject = (proj: Project) => {
    setEditingProjId(proj.id);
    setEditName(proj.name);
    setEditClient(proj.clientName);
    setEditColor(proj.color);
    setEditPlatforms(proj.platforms || ['instagram', 'linkedin', 'tiktok']);
    setEditTerritories(proj.territories || []);
  };

  const handleUpdateProject = async (projId: string) => {
    if (!editName.trim() || !editClient.trim()) {
      toast.error('Por favor, introduce nombre y cliente');
      return;
    }

    try {
      await updateDoc(doc(db, 'projects', projId), {
        name: editName.trim(),
        clientName: editClient.trim(),
        color: editColor,
        platforms: editPlatforms,
        territories: editTerritories
      });
      toast.success('Proyecto actualizado correctamente');
      setEditingProjId(null);
    } catch (err) {
      toast.error('Error al actualizar el proyecto');
      console.error(err);
    }
  };

  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const handleDeleteProject = (projId: string) => {
    if (projects.length <= 1) {
      toast.error('No se puede eliminar el único proyecto existente');
      return;
    }
    setProjectToDelete(projId);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await deleteDoc(doc(db, 'projects', projectToDelete));
      toast.success('Proyecto eliminado correctamente');
      if (activeProjectId === projectToDelete) {
        setActiveProjectId('all');
      }
      setProjectToDelete(null);
    } catch (err) {
      toast.error('Error al eliminar el proyecto');
      console.error(err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full pb-12 space-y-6">
      
      {/* Role Selection Simulator Panel — admin only: it writes the real role to Firestore,
          it's not a preview. Firestore rules also enforce this independently of the UI. */}
      {userRole === 'admin' && (
      <div className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-app-accent/10 text-app-accent rounded-2xl">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-ink text-sm">Modo de Rol de Usuario (Avanzado)</h3>
            <p className="text-xs text-ink-muted">Cambia tu rol real en Firestore para probar permisos y vistas. No es una vista previa.</p>
          </div>
        </div>
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 font-medium">
          ⚠️ Si te cambias a un rol distinto de Admin, perderás tus permisos de administrador hasta que otro admin te los devuelva. Úsalo solo para pruebas.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {ASSIGNABLE_ROLES.map((key) => {
            const label = ROLES[key];
            const isSelected = userRole === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onRoleChange(key as Role)}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all relative ${
                  isSelected
                    ? 'border-app-accent bg-app-accent/10 ring-2 ring-app-accent/10'
                    : 'border-divider hover:border-outline hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[11px] font-black uppercase tracking-wider ${isSelected ? 'text-app-accent' : 'text-ink-muted'}`}>
                    {key === 'client' ? 'Externo' : 'Agencia'}
                  </span>
                  {isSelected && (
                    <div className="bg-app-accent text-white rounded-full p-0.5">
                      <Check size={10} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-ink leading-snug">{label}</p>
                  <p className="text-caption text-ink-muted mt-0.5 truncate">Permisos de {key === 'client' ? 'revisión' : 'edición'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* 1. Project switching panel (moved from sidebar/topbar) */}
      <div className="bg-white rounded-3xl border border-divider shadow-sm overflow-hidden p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Folder size={20} className="text-app-accent" />
          <div>
            <h3 className="font-extrabold text-ink text-sm">Cambiar de Proyecto de Trabajo Activo</h3>
            <p className="text-xs text-ink-muted">Selecciona el espacio de trabajo que quieres planificar en el calendario y ver en el tablero.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveProjectId('all')}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                activeProjectId === 'all'
                  ? 'border-app-accent bg-app-accent/10 ring-2 ring-app-accent/10'
                  : 'border-divider hover:border-outline hover:bg-gray-50'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-ink-secondary">
                <Grid size={16} />
              </div>
              <div>
                <p className="text-xs font-black text-ink">Todos los Proyectos</p>
                <p className="text-caption text-ink-muted mt-0.5">Vea la parrilla global consolidada</p>
              </div>
            </button>
          )}

          {projects.filter(p => hasProjectPermission(p.id)).map((proj) => (
            <button
              key={proj.id}
              onClick={() => setActiveProjectId(proj.id)}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all relative group ${
                activeProjectId === proj.id
                  ? 'border-transparent ring-2'
                  : 'border-divider hover:border-outline hover:bg-gray-50'
              }`}
              style={{
                boxShadow: activeProjectId === proj.id ? `0 0 0 2px ${proj.color}` : 'none',
                backgroundColor: activeProjectId === proj.id ? `${proj.color}08` : 'transparent'
              }}
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: proj.color }}
              >
                {proj.name[0]}
              </div>
              <div>
                <p className="text-xs font-black text-ink line-clamp-1">{proj.name}</p>
                <p className="text-caption text-ink-muted mt-0.5 line-clamp-1">Cliente: {proj.clientName}</p>
              </div>
              {activeProjectId === proj.id && (
                <div className="absolute top-3 right-3 text-white rounded-full p-0.5" style={{ backgroundColor: proj.color }}>
                  <Check size={10} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 1.5. Permissions panel for Admin */}
      {userRole === 'admin' && (
        <div className="bg-white rounded-3xl border border-divider shadow-sm overflow-hidden animate-fade-in">
          <div className="p-4 sm:p-6 border-b border-divider flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-ink text-sm flex items-center gap-2">
                <Users size={18} className="text-app-accent" />
                Gestión de Usuarios y Permisos de Proyectos
              </h3>
              <p className="text-xs text-ink-muted mt-1">Como administrador, puedes invitar colaboradores, asignar roles de la agencia y habilitar o deshabilitar el acceso a proyectos específicos.</p>
            </div>
            <Button variant="primary" onClick={() => setShowInviteModal(true)} className="py-2 self-start md:self-auto shrink-0 animate-fade-in">
              <UserPlus size={14} />
              Invitar Usuario
            </Button>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" size={15} />
              <input
                aria-label="Buscar usuarios por nombre o correo"
                placeholder="Buscar usuarios por nombre o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-divider rounded-md py-2 pl-10 pr-4 text-xs focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 outline-none transition-all"
              />
            </div>

            {usersList.length === 0 ? (
              <div className="text-center text-xs text-ink-muted py-6">Cargando usuarios...</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {usersList
                  .filter(usr => {
                    const query = searchTerm.toLowerCase();
                    return (
                      (usr.name || '').toLowerCase().includes(query) ||
                      (usr.email || '').toLowerCase().includes(query) ||
                      (ROLES[usr.role as Role] || '').toLowerCase().includes(query)
                    );
                  })
                  .map((usr) => {
                    const isUserAdmin = usr.role === 'admin';
                    // Handle backward compatibility for permittedProjects
                    const userPermitted = usr.permittedProjects || (usr.projectId ? [usr.projectId] : []);
                    const isEditing = editingUserId === usr.id;

                    return (
                      <div key={usr.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-divider/50 pb-4">
                        <div className="flex-1 flex items-center gap-3">
                          <Avatar name={usr.name || ''} src={usr.avatar} />
                          
                          {isEditing ? (
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <Field label="Nombre" id={`edit-user-name-${usr.id}`} className="[&>label]:text-[11px] [&>label]:font-bold [&>label]:text-ink-muted [&>label]:uppercase [&>label]:tracking-wider">
                                <input
                                  type="text"
                                  value={editUserName}
                                  onChange={(e) => setEditUserName(e.target.value)}
                                  className="w-full bg-gray-50 border border-divider rounded-md px-3 py-2 text-xs font-bold text-ink-secondary outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all"
                                  placeholder="Nombre completo"
                                />
                              </Field>
                              <Field label="Correo" id={`edit-user-email-${usr.id}`} className="[&>label]:text-[11px] [&>label]:font-bold [&>label]:text-ink-muted [&>label]:uppercase [&>label]:tracking-wider">
                                <input
                                  type="email"
                                  value={editUserEmail}
                                  onChange={(e) => setEditUserEmail(e.target.value)}
                                  className="w-full bg-gray-50 border border-divider rounded-md px-3 py-2 text-xs font-bold text-ink-secondary outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all"
                                  placeholder="correo@ejemplo.com"
                                />
                              </Field>
                              <Field label="Estado" id={`edit-user-status-${usr.id}`} className="[&>label]:text-[11px] [&>label]:font-bold [&>label]:text-ink-muted [&>label]:uppercase [&>label]:tracking-wider">
                                <select
                                  value={editUserStatus}
                                  onChange={(e) => setEditUserStatus(e.target.value)}
                                  className="w-full bg-gray-50 border border-divider rounded-md px-3 py-2 text-xs font-bold text-ink-secondary outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all cursor-pointer"
                                >
                                  <option value="active">Activo</option>
                                  <option value="pending">Pendiente</option>
                                </select>
                              </Field>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-ink text-xs">{usr.name}</p>
                                {usr.status === 'pending' ? (
                                  <span className="bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider animate-pulse">Pendiente</span>
                                ) : (
                                  <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider">Activo</span>
                                )}
                              </div>
                              <p className="text-caption text-ink-muted">{usr.email}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 shrink-0 relative">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 pt-4 md:pt-0">
                              <button
                                onClick={() => handleSaveUser(usr.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl transition-all shadow-sm"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="bg-white hover:bg-gray-100 border border-divider text-ink-secondary font-bold text-[11px] px-3 py-1.5 rounded-xl transition-all"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              {/* Role Selector */}
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">Rol / Permisos</span>
                                {isUserAdmin ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-app-accent/10 text-app-accent font-bold rounded-xl text-xs">
                                    {ROLES.admin}
                                  </span>
                                ) : (
                                  <select
                                    aria-label={`Rol de ${usr.name}`}
                                    value={usr.role || 'client'}
                                    onChange={(e) => handleRoleChangeInDb(usr.id, e.target.value as Role)}
                                    className="bg-gray-50 hover:bg-gray-100 border border-divider rounded-md px-3 py-2 text-xs font-bold text-ink-secondary outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all cursor-pointer"
                                  >
                                    {Object.entries(ROLES).map(([key, label]) => (
                                      <option key={key} value={key}>{label}</option>
                                    ))}
                                  </select>
                                )}
                              </div>

                              {/* Projects Selector */}
                              <div className="flex flex-col items-end max-w-[260px]">
                                <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">Acceso a Proyectos</span>
                                {isUserAdmin ? (
                                  <span className="inline-flex items-center px-3 py-1.5 bg-gray-50 border border-divider rounded-xl text-xs text-ink-muted italic">
                                    Acceso Total (Admin)
                                  </span>
                                ) : (
                                  <div className="flex flex-col items-end gap-1.5">
                                    <div className="flex flex-wrap gap-1 justify-end">
                                      {userPermitted.length === 0 ? (
                                        <span className="text-xs text-ink-muted italic">Sin proyectos asignados</span>
                                      ) : (
                                        userPermitted.map((projId: string) => {
                                          const pObj = projects.find(p => p.id === projId);
                                          if (!pObj) return null;
                                          return (
                                            <span key={projId} className="inline-flex items-center gap-1 bg-gray-50 border border-divider px-2 py-1 rounded-lg text-xs text-ink-secondary max-w-[160px]">
                                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pObj.color }} />
                                              <span className="truncate">{pObj.name}</span>
                                            </span>
                                          );
                                        })
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => openProjectAccessModal(usr)}
                                      className="flex items-center gap-1 text-[11px] font-bold text-app-accent hover:text-app-accent-hover transition-colors"
                                    >
                                      <Edit2 size={11} />
                                      Editar accesos
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Action buttons (Edit & Delete) */}
                              <div className="flex items-center gap-1 pl-2 border-l border-divider h-9 self-end">
                                <IconButton icon={Edit2} size="sm" onClick={() => startEditingUser(usr)} aria-label="Editar usuario" title="Editar usuario" />

                                {userToDelete === usr.id ? (
                                  <div className="ml-1">
                                    <ConfirmInline
                                      message="¿Seguro?"
                                      size="sm"
                                      confirmLabel="Sí"
                                      cancelLabel="No"
                                      onConfirm={() => handleDeleteUser(usr.id)}
                                      onCancel={() => setUserToDelete(null)}
                                    />
                                  </div>
                                ) : (
                                  <IconButton icon={Trash2} size="sm" variant="danger" onClick={() => setUserToDelete(usr.id)} aria-label="Eliminar usuario" title="Eliminar usuario" />
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Global Project & Client Admin CRUD Panel */}
      {userRole !== 'client' && (
        <div className="bg-white rounded-3xl border border-divider shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-divider flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-ink text-sm flex items-center gap-2">
                <Folder size={18} className="text-app-accent" />
                Administración de Proyectos y Clientes
              </h3>
              <p className="text-xs text-ink-muted mt-1">Crea, modifica y elimina tus cuentas de clientes o marcas activas en el sistema.</p>
            </div>
            {!isAdding && (
              <Button variant="primary" onClick={() => setIsAdding(true)} className="py-2">
                <Plus size={14} />
                Nuevo Proyecto
              </Button>
            )}
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {isAdding && (
              <NewProjectModal
                onClose={() => setIsAdding(false)}
                onSubmit={handleCreateProject}
              />
            )}

            {/* List Table */}
            <div className="overflow-x-auto rounded-xl border border-divider">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-divider bg-gray-50 text-[11px] font-semibold text-ink-secondary uppercase tracking-wider">
                    <th className="px-4 py-4">Color</th>
                    <th className="px-4 py-4">Nombre del Proyecto</th>
                    <th className="px-4 py-4">Cliente Legal</th>
                    <th className="px-4 py-4">Redes Activas</th>
                    <th className="px-4 py-4">Territorios</th>
                    <th className="px-4 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {projects.map((proj) => {
                    const isEditing = editingProjId === proj.id;
                    return (
                      <tr key={proj.id} className="hover:bg-gray-50/40">
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <input
                              type="color"
                              aria-label={`Color de marca de ${editName || proj.name}`}
                              value={editColor}
                              onChange={e => setEditColor(e.target.value)}
                              className="w-8 h-8 rounded border p-0.5 cursor-pointer bg-white"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-divider" style={{ backgroundColor: proj.color }} />
                          )}
                        </td>
                        <td className="px-4 py-4 font-bold text-ink">
                          {isEditing ? (
                            <input
                              type="text"
                              aria-label="Nombre del proyecto"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="bg-white border border-divider rounded px-3 py-2 text-xs w-full font-bold"
                            />
                          ) : (
                            proj.name
                          )}
                        </td>
                        <td className="px-4 py-4 text-ink-secondary font-medium">
                          {isEditing ? (
                            <input
                              type="text"
                              aria-label="Cliente legal del proyecto"
                              value={editClient}
                              onChange={e => setEditClient(e.target.value)}
                              className="bg-white border border-divider rounded px-3 py-2 text-xs w-full"
                            />
                          ) : (
                            proj.clientName
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <div className="flex gap-2 flex-wrap items-center">
                              {[
                                { id: 'instagram', label: 'Instagram', icon: InstagramIcon, color: 'text-[#E1306C] border-[#E1306C]/30 bg-[#E1306C]/5' },
                                { id: 'linkedin', label: 'LinkedIn', icon: LinkedInIcon, color: 'text-[#0A66C2] border-[#0A66C2]/30 bg-[#0A66C2]/5' },
                                { id: 'tiktok', label: 'TikTok', icon: TikTokIcon, color: 'text-ink border-zinc-900/30 bg-zinc-900/5' }
                              ].map(platform => {
                                const isActive = editPlatforms.includes(platform.id);
                                return (
                                  <IconButton
                                    key={platform.id}
                                    icon={platform.icon}
                                    size="sm"
                                    aria-pressed={isActive}
                                    aria-label={`${platform.label}${isActive ? ' (activo, quitar)' : ' (inactivo, activar)'}`}
                                    title={platform.label}
                                    onClick={() => {
                                      if (isActive) {
                                        if (editPlatforms.length > 1) {
                                          setEditPlatforms(editPlatforms.filter(p => p !== platform.id));
                                        } else {
                                          toast.error('Debe quedar al menos una red.');
                                        }
                                      } else {
                                        setEditPlatforms([...editPlatforms, platform.id]);
                                      }
                                    }}
                                    className={cn(
                                      'rounded-xl border',
                                      isActive ? platform.color : 'bg-gray-50 border-divider text-ink-muted opacity-60 hover:bg-gray-50 hover:text-ink-muted'
                                    )}
                                  />
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex gap-1.5 flex-wrap">
                              {(proj.platforms || ['instagram', 'linkedin', 'tiktok']).map(p => {
                                return (
                                  <span key={p} className={`px-1.5 py-0.5 rounded-md font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1 ${
                                    p === 'instagram' ? 'bg-[#E1306C]/10 text-[#E1306C]' : p === 'linkedin' ? 'bg-[#0A66C2]/10 text-[#0A66C2]' : 'bg-zinc-900/10 text-ink'
                                  }`}>
                                    {p === 'instagram' && <InstagramIcon size={10} />}
                                    {p === 'linkedin' && <LinkedInIcon size={10} />}
                                    {p === 'tiktok' && <TikTokIcon size={10} />}
                                    {p === 'instagram' ? 'IG' : p === 'linkedin' ? 'IN' : 'TT'}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 max-w-[220px]">
                          {isEditing ? (
                            <TagListEditor
                              tags={editTerritories}
                              onChange={setEditTerritories}
                              placeholder="Añadir tema..."
                              label="Añadir territorio"
                              size="sm"
                            />
                          ) : (
                            proj.territories && proj.territories.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {proj.territories.map(t => (
                                  <span key={t} className="px-1.5 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-ink-secondary">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-ink-muted text-[11px]">—</span>
                            )
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setEditingProjId(null)}
                                className="text-caption text-ink-muted hover:text-ink-secondary px-2 py-1"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleUpdateProject(proj.id)}
                                className="text-[11px] font-bold bg-app-accent text-white rounded px-2.5 py-1 hover:bg-app-accent-hover"
                              >
                                Guardar
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2.5">
                              <button
                                onClick={() => startEditProject(proj)}
                                className="text-[11px] font-bold text-app-accent hover:underline"
                              >
                                Modificar
                              </button>
                              <IconButton icon={Trash2} size="sm" variant="danger" onClick={() => handleDeleteProject(proj.id)} aria-label="Eliminar proyecto" />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Original agency/workspace settings — agency name, timezone and
          notification toggles are internal operational config, not something
          a client account has any use for or Firestore permission to save
          (firestore.rules only grants isAgencyRole() write access on
          settings/agency, so a client submitting this got a raw
          permission-denied toast instead of never seeing the form at all). */}
      {userRole !== 'client' && (
      <div className="bg-white rounded-3xl border border-divider shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-divider">
          <h3 className="font-extrabold text-ink text-base flex items-center gap-2">
            <Settings size={18} className="text-app-accent" />
            Configuración del Workspace
          </h3>
          <p className="text-xs text-ink-muted mt-1">Establece los parámetros generales y las preferencias de notificación de tu agencia.</p>
        </div>

        <form onSubmit={handleSaveAgencySettings} className="p-4 sm:p-6 space-y-6">
          {/* General Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-ink-muted uppercase tracking-widest">
              <Globe size={14} />
              <span>General</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre de la Agencia" id="agency-name" className="[&>label]:text-[11px] [&>label]:font-bold [&>label]:text-ink-muted [&>label]:uppercase [&>label]:tracking-wider">
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full bg-gray-50 border border-divider rounded-md py-2.5 px-3 text-xs font-bold text-ink-secondary outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 focus:bg-white transition-all"
                  required
                />
              </Field>

              <Field label="Zona Horaria Predeterminada" id="agency-timezone" className="[&>label]:text-[11px] [&>label]:font-bold [&>label]:text-ink-muted [&>label]:uppercase [&>label]:tracking-wider">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-gray-50 border border-divider rounded-md py-2.5 px-3 text-xs font-bold text-ink-secondary outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 focus:bg-white transition-all"
                >
                  <option value="Europe/Madrid">Madrid (CET) - Europe/Madrid</option>
                  <option value="America/New_York">New York (EST) - America/New_York</option>
                  <option value="America/Mexico_City">Mexico City (CST) - America/Mexico_City</option>
                  <option value="America/Bogota">Bogotá (EST) - America/Bogota</option>
                </select>
              </Field>
            </div>
          </div>

          <hr className="border-divider" />

          {/* Notifications Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-ink-muted uppercase tracking-widest">
              <Bell size={14} />
              <span>Notificaciones Automáticas</span>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ink">Alertas por Correo</p>
                  <p className="text-caption text-ink-muted">Recibe resúmenes diarios con los comentarios y cambios de estado.</p>
                </div>
                <Toggle checked={notifyEmail} onChange={setNotifyEmail} label="Alertas por correo" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ink">Notificaciones en Slack</p>
                  <p className="text-caption text-ink-muted">Notifica automáticamente al canal #social-media cuando haya un nuevo post.</p>
                </div>
                <Toggle checked={notifySlack} onChange={setNotifySlack} label="Notificaciones en Slack" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ink">Flujo Aprobación de Cliente</p>
                  <p className="text-caption text-ink-muted">Recibe una alerta inmediata cuando el cliente apruebe un post final.</p>
                </div>
                <Toggle checked={notifyClientApprove} onChange={setNotifyClientApprove} label="Flujo de aprobación de cliente" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-divider flex justify-end">
            <Button type="submit" variant="primary" disabled={isSavingAgencySettings} className="gap-2 px-6 py-2.5">
              <Save size={16} />
              {isSavingAgencySettings ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </form>
      </div>
      )}

      {/* Confirmation Modal — previously a hand-built overlay with no
          role="dialog", no focus trap and no Escape handling (unlike the
          Project Access modal right below it, which already had all three).
          <Modal> wires that in by construction. */}
      {projectToDelete && (
        <Modal
          onClose={() => setProjectToDelete(null)}
          title="¿Eliminar proyecto definitivamente?"
          icon={AlertTriangle}
          tone="danger"
          size="sm"
          footer={
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setProjectToDelete(null)} className="flex-1">
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmDeleteProject} className="flex-1">
                Sí, eliminar
              </Button>
            </div>
          }
        >
          <p className="text-xs text-ink-secondary leading-relaxed">
            Esta acción es irreversible. Se eliminará el proyecto seleccionado y todas las publicaciones asociadas podrían quedar huérfanas o sin clasificar.
          </p>
        </Modal>
      )}

      {/* Project Access Modal — batches every checkbox toggle into local
          state; nothing is written to Firestore until "Guardar". */}
      {projectAccessUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            ref={projectAccessModalRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Acceso a proyectos de ${projectAccessUser.name}`}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl border border-divider outline-none"
          >
            <div className="flex justify-between items-start mb-1">
              <div>
                <h4 className="text-base font-extrabold text-ink">Acceso a proyectos</h4>
                <p className="text-xs text-ink-secondary mt-0.5">{projectAccessUser.name} · {projectAccessUser.email}</p>
              </div>
              <IconButton icon={X} onClick={closeProjectAccessModal} aria-label="Cerrar" className="shrink-0" />
            </div>

            <p className="text-xs text-ink-muted leading-relaxed mt-3 mb-3">
              Marca los proyectos a los que {projectAccessUser.role === 'client' ? 'este cliente' : 'esta persona'} puede acceder. Los cambios no se guardan hasta que pulses "Guardar".
            </p>

            {projects.length > 4 && (
              <div className="relative flex items-center mb-2">
                <Search size={13} className="absolute left-3 text-ink-muted" />
                <input
                  type="text"
                  aria-label="Buscar proyecto"
                  placeholder="Buscar proyecto..."
                  value={projectAccessSearch}
                  onChange={(e) => setProjectAccessSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-divider rounded-md py-2 pl-8 pr-3 text-xs outline-none focus:bg-white focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all text-ink"
                />
              </div>
            )}

            <div className="max-h-72 overflow-y-auto space-y-1 pr-1 custom-scrollbar -mx-1 px-1">
              {projects
                .filter(p => !projectAccessSearch || p.name.toLowerCase().includes(projectAccessSearch.toLowerCase()) || p.clientName.toLowerCase().includes(projectAccessSearch.toLowerCase()))
                .map((proj) => {
                  const hasPerm = projectAccessDraft.includes(proj.id);
                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        setProjectAccessDraft(prev =>
                          prev.includes(proj.id) ? prev.filter(id => id !== proj.id) : [...prev, proj.id]
                        );
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all text-xs border",
                        hasPerm ? "bg-app-accent/5 border-app-accent/20" : "bg-white border-divider hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full border border-white shrink-0" style={{ backgroundColor: proj.color }} />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-ink">{proj.name}</p>
                          <p className="text-caption text-ink-muted truncate">Cliente: {proj.clientName}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0",
                        hasPerm ? "bg-app-accent border-app-accent text-white" : "border-divider bg-white"
                      )}>
                        {hasPerm && <Check size={10} className="stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              {projects.filter(p => !projectAccessSearch || p.name.toLowerCase().includes(projectAccessSearch.toLowerCase())).length === 0 && (
                <EmptyState title="No se encontraron proyectos" size="sm" className="py-3" />
              )}
            </div>

            <div className="flex gap-3 pt-5">
              <Button
                type="button"
                variant="secondary"
                onClick={closeProjectAccessModal}
                className="flex-1 border-transparent bg-gray-100 hover:bg-gray-200"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveProjectAccess}
                disabled={isSavingProjectAccess}
                className="flex-1"
              >
                {isSavingProjectAccess ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Invite User Modal */}
      {/* Previously a hand-built overlay with no role="dialog", no focus trap
          and no Escape handling. The submit button has to stay inside the
          <form> for native submission, so it's part of Modal's children
          rather than its separate `footer` slot — that slot renders outside
          the form element. */}
      {showInviteModal && (
        <Modal
          onClose={() => setShowInviteModal(false)}
          title="Invitar colaborador o cliente"
          icon={UserPlus}
        >
          <p className="text-xs text-ink-secondary leading-relaxed mb-6">
            Se crea una invitación pendiente. Debes compartir tú mismo el enlace de la app con esta persona — todavía no enviamos el correo automáticamente.
          </p>

          <form onSubmit={handleInvite} className="space-y-4">
              <Field label="Nombre completo" id="invite-name">
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ej. Ana Belén"
                  className="w-full bg-gray-50 border border-divider rounded-md py-2 px-3 text-xs outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 focus:bg-white transition-all text-ink"
                  required
                />
              </Field>

              <Field label="Correo electrónico" id="invite-email">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Ej. ana.client@basetis.com"
                  className="w-full bg-gray-50 border border-divider rounded-md py-2 px-3 text-xs outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 focus:bg-white transition-all text-ink"
                  required
                />
              </Field>

              <Field label="Rol en SocialFlow" id="invite-role">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full bg-gray-50 border border-divider rounded-md py-2 px-3 text-xs outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 focus:bg-white transition-all font-bold text-ink-secondary cursor-pointer"
                >
                  {ASSIGNABLE_ROLES.map((key) => (
                    <option key={key} value={key}>{ROLES[key]}</option>
                  ))}
                </select>
              </Field>

              {inviteRole === 'client' && (
                <Field label="Proyecto del cliente" id="invite-project">
                  <select
                    value={inviteProjectId}
                    onChange={(e) => setInviteProjectId(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-divider rounded-md py-2 px-3 text-xs outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 focus:bg-white transition-all font-bold text-ink-secondary cursor-pointer"
                  >
                    <option value="">Selecciona un proyecto...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 border-transparent bg-gray-100 hover:bg-gray-200"
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" className="flex-1">
                  Enviar invitación
                </Button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
