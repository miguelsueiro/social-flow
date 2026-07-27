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
  ChevronDown,
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
import { toast } from 'react-hot-toast';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ROLES, Role, ASSIGNABLE_ROLES } from '../lib/utils';

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
  const [activeUserPopover, setActiveUserPopover] = useState<string | null>(null);
  const [popoverSearch, setPopoverSearch] = useState('');

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
      <div className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-app-accent/10 text-app-accent rounded-2xl">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 text-sm">Modo de Rol de Usuario (Avanzado)</h3>
            <p className="text-xs text-gray-400">Cambia tu rol real en Firestore para probar permisos y vistas. No es una vista previa.</p>
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
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-app-accent' : 'text-gray-400'}`}>
                    {key === 'client' ? 'Externo' : 'Agencia'}
                  </span>
                  {isSelected && (
                    <div className="bg-app-accent text-white rounded-full p-0.5">
                      <Check size={10} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900 leading-snug">{label}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5 truncate">Permisos de {key === 'client' ? 'revisión' : 'edición'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* 1. Project switching panel (moved from sidebar/topbar) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6">
        <div className="flex items-center gap-3 mb-4">
          <Folder size={20} className="text-app-accent" />
          <div>
            <h3 className="font-extrabold text-gray-900 text-sm">Cambiar de Proyecto de Trabajo Activo</h3>
            <p className="text-xs text-gray-400">Selecciona el espacio de trabajo que quieres planificar en el calendario y ver en el tablero.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveProjectId('all')}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                activeProjectId === 'all'
                  ? 'border-app-accent bg-app-accent/10 ring-2 ring-app-accent/10'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                <Grid size={16} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-900">Todos los Proyectos</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Vea la parrilla global consolidada</p>
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
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                <p className="text-xs font-black text-gray-900 line-clamp-1">{proj.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">Cliente: {proj.clientName}</p>
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
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                <Users size={18} className="text-app-accent" />
                Gestión de Usuarios y Permisos de Proyectos
              </h3>
              <p className="text-xs text-gray-400 mt-1">Como administrador, puedes invitar colaboradores, asignar roles de la agencia y habilitar o deshabilitar el acceso a proyectos específicos.</p>
            </div>
            <Button variant="primary" onClick={() => setShowInviteModal(true)} className="py-2 self-start md:self-auto shrink-0 animate-fade-in">
              <UserPlus size={14} />
              Invitar Usuario
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                placeholder="Buscar usuarios por nombre o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-2 pl-10 pr-4 text-xs focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 outline-none transition-all"
              />
            </div>

            {usersList.length === 0 ? (
              <div className="text-center text-xs text-gray-400 py-6">Cargando usuarios...</div>
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
                      <div key={usr.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50/50 pb-4">
                        <div className="flex-1 flex items-center gap-3">
                          <img 
                            src={usr.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(usr.name || '')}`} 
                            alt={usr.name} 
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100"
                          />
                          
                          {isEditing ? (
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Nombre</label>
                                <input
                                  type="text"
                                  value={editUserName}
                                  onChange={(e) => setEditUserName(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-app-accent transition-all"
                                  placeholder="Nombre completo"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Correo</label>
                                <input
                                  type="email"
                                  value={editUserEmail}
                                  onChange={(e) => setEditUserEmail(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-app-accent transition-all"
                                  placeholder="correo@ejemplo.com"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Estado</label>
                                <select
                                  value={editUserStatus}
                                  onChange={(e) => setEditUserStatus(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-app-accent transition-all cursor-pointer"
                                >
                                  <option value="active">Activo</option>
                                  <option value="pending">Pendiente</option>
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900 text-xs">{usr.name}</p>
                                {usr.status === 'pending' ? (
                                  <span className="bg-amber-50 text-amber-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider animate-pulse">Pendiente</span>
                                ) : (
                                  <span className="bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">Activo</span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400">{usr.email}</p>
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
                                className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-[11px] px-3 py-1.5 rounded-xl transition-all"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              {/* Role Selector */}
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rol / Permisos</span>
                                {isUserAdmin ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-app-accent/10 text-app-accent font-bold rounded-xl text-xs">
                                    {ROLES.admin}
                                  </span>
                                ) : (
                                  <select
                                    value={usr.role || 'client'}
                                    onChange={(e) => handleRoleChangeInDb(usr.id, e.target.value as Role)}
                                    className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-app-accent transition-all cursor-pointer"
                                  >
                                    {Object.entries(ROLES).map(([key, label]) => (
                                      <option key={key} value={key}>{label}</option>
                                    ))}
                                  </select>
                                )}
                              </div>

                              {/* Projects Selector */}
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Acceso a Proyectos</span>
                                {isUserAdmin ? (
                                  <span className="inline-flex items-center px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-400 italic">
                                    Acceso Total (Admin)
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div className="flex flex-wrap gap-1 max-w-[200px] justify-end items-center">
                                      {userPermitted.length === 0 ? (
                                        <span className="text-xs text-gray-400">Sin acceso</span>
                                      ) : (
                                        <>
                                          {userPermitted.slice(0, 1).map((projId: string) => {
                                            const pObj = projects.find(p => p.id === projId);
                                            if (!pObj) return null;
                                            return (
                                              <span key={projId} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 px-2 py-1 rounded-xl text-xs text-gray-600 max-w-[110px] truncate">
                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pObj.color }} />
                                                <span className="truncate">{pObj.name}</span>
                                              </span>
                                            );
                                          })}
                                          {userPermitted.length > 1 && (
                                            <span className="inline-flex items-center bg-app-accent/10 border border-app-accent/20 px-2 py-1 rounded-xl text-[10px] text-app-accent font-bold shrink-0">
                                              +{userPermitted.length - 1}
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </div>

                                    {/* Popover trigger */}
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (activeUserPopover === usr.id) {
                                            setActiveUserPopover(null);
                                            setPopoverSearch('');
                                          } else {
                                            setActiveUserPopover(usr.id);
                                            setPopoverSearch('');
                                          }
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 text-xs transition-all font-bold shadow-sm"
                                      >
                                        <span>Asignar</span>
                                        <ChevronDown size={13} className={`text-gray-400 transition-transform ${activeUserPopover === usr.id ? 'rotate-180' : ''}`} />
                                      </button>

                                      {activeUserPopover === usr.id && (
                                        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-100 shadow-2xl rounded-2xl p-3.5 z-50 space-y-2">
                                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Permisos para {usr.name}</p>
                                          
                                          {projects.length > 4 && (
                                            <div className="relative flex items-center">
                                              <Search size={13} className="absolute left-2.5 text-gray-400" />
                                              <input
                                                type="text"
                                                placeholder="Buscar proyecto..."
                                                value={popoverSearch}
                                                onChange={(e) => setPopoverSearch(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-1 pl-7 pr-3 text-xs outline-none focus:bg-white focus:border-app-accent transition-all text-gray-800"
                                              />
                                            </div>
                                          )}

                                          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                                            {projects
                                              .filter(p => !popoverSearch || p.name.toLowerCase().includes(popoverSearch.toLowerCase()) || p.clientName.toLowerCase().includes(popoverSearch.toLowerCase()))
                                              .map((proj) => {
                                                const hasPerm = userPermitted.includes(proj.id);
                                                return (
                                                  <button
                                                    key={proj.id}
                                                    type="button"
                                                    onClick={async () => {
                                                      try {
                                                        let nextPermitted = [...userPermitted];
                                                        if (nextPermitted.includes(proj.id)) {
                                                          nextPermitted = nextPermitted.filter(id => id !== proj.id);
                                                        } else {
                                                          nextPermitted.push(proj.id);
                                                        }
                                                        
                                                        const { updateDoc, doc } = await import('firebase/firestore');
                                                        await updateDoc(doc(db, 'users', usr.id), { 
                                                          permittedProjects: nextPermitted,
                                                          projectId: nextPermitted[0] || ''
                                                        });
                                                        toast.success(`Permisos actualizados para ${usr.name}`);
                                                      } catch (err) {
                                                        console.error(err);
                                                        toast.error('Error al actualizar permisos');
                                                      }
                                                    }}
                                                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all text-xs hover:bg-gray-50 ${
                                                      hasPerm ? 'text-app-accent font-bold' : 'text-gray-600'
                                                    }`}
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <div className="w-2.5 h-2.5 rounded-full border border-white shrink-0" style={{ backgroundColor: proj.color }} />
                                                      <div className="truncate">
                                                        <p className="truncate font-bold text-gray-800">{proj.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-normal truncate">Cliente: {proj.clientName}</p>
                                                      </div>
                                                    </div>
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                                                      hasPerm ? 'bg-app-accent border-app-accent text-white' : 'border-gray-200 bg-white'
                                                    }`}>
                                                      {hasPerm && <Check size={10} className="stroke-[3]" />}
                                                    </div>
                                                  </button>
                                                );
                                              })}
                                            {projects.filter(p => !popoverSearch || p.name.toLowerCase().includes(popoverSearch.toLowerCase())).length === 0 && (
                                              <p className="text-center text-xs text-gray-400 py-3">No se encontraron proyectos</p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Action buttons (Edit & Delete) */}
                              <div className="flex items-center gap-1 pl-2 border-l border-gray-100 h-8 self-end">
                                <button
                                  type="button"
                                  onClick={() => startEditingUser(usr)}
                                  className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-lg transition-colors"
                                  title="Editar usuario"
                                  aria-label="Editar usuario"
                                >
                                  <Edit2 size={14} />
                                </button>
                                
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
                                  <button
                                    type="button"
                                    onClick={() => setUserToDelete(usr.id)}
                                    className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors"
                                    title="Eliminar usuario"
                                    aria-label="Eliminar usuario"
                                  >
                                    <Trash2 size={14} />
                                  </button>
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
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                <Folder size={18} className="text-app-accent" />
                Administración de Proyectos y Clientes
              </h3>
              <p className="text-xs text-gray-400 mt-1">Crea, modifica y elimina tus cuentas de clientes o marcas activas en el sistema.</p>
            </div>
            {!isAdding && (
              <Button variant="primary" onClick={() => setIsAdding(true)} className="py-2">
                <Plus size={14} />
                Nuevo Proyecto
              </Button>
            )}
          </div>

          <div className="p-6 space-y-4">
            {isAdding && (
              <NewProjectModal
                onClose={() => setIsAdding(false)}
                onSubmit={handleCreateProject}
              />
            )}

            {/* List Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Color</th>
                    <th className="px-4 py-3">Nombre del Proyecto</th>
                    <th className="px-4 py-3">Cliente Legal</th>
                    <th className="px-4 py-3">Redes Activas</th>
                    <th className="px-4 py-3">Territorios</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {projects.map((proj) => {
                    const isEditing = editingProjId === proj.id;
                    return (
                      <tr key={proj.id} className="hover:bg-gray-50/40">
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input 
                              type="color" 
                              value={editColor}
                              onChange={e => setEditColor(e.target.value)}
                              className="w-8 h-8 rounded border p-0.5 cursor-pointer bg-white"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-gray-100" style={{ backgroundColor: proj.color }} />
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {isEditing ? (
                            <input 
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="bg-white border border-gray-200 rounded px-2 py-1 text-xs w-full font-bold"
                            />
                          ) : (
                            proj.name
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-medium">
                          {isEditing ? (
                            <input 
                              type="text"
                              value={editClient}
                              onChange={e => setEditClient(e.target.value)}
                              className="bg-white border border-gray-200 rounded px-2 py-1 text-xs w-full"
                            />
                          ) : (
                            proj.clientName
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex gap-2 flex-wrap items-center">
                              {[
                                { id: 'instagram', icon: InstagramIcon, color: 'text-[#E1306C] border-[#E1306C]/30 bg-[#E1306C]/5' },
                                { id: 'linkedin', icon: LinkedInIcon, color: 'text-[#0A66C2] border-[#0A66C2]/30 bg-[#0A66C2]/5' },
                                { id: 'tiktok', icon: TikTokIcon, color: 'text-zinc-900 border-zinc-900/30 bg-zinc-900/5' }
                              ].map(platform => {
                                const isActive = editPlatforms.includes(platform.id);
                                const Icon = platform.icon;
                                return (
                                  <button
                                    key={platform.id}
                                    type="button"
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
                                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                                      isActive ? platform.color : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'
                                    }`}
                                    title={platform.id}
                                  >
                                    <Icon size={14} />
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex gap-1.5 flex-wrap">
                              {(proj.platforms || ['instagram', 'linkedin', 'tiktok']).map(p => {
                                return (
                                  <span key={p} className={`px-1.5 py-0.5 rounded-md font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1 ${
                                    p === 'instagram' ? 'bg-[#E1306C]/10 text-[#E1306C]' : p === 'linkedin' ? 'bg-[#0A66C2]/10 text-[#0A66C2]' : 'bg-zinc-900/10 text-zinc-900'
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
                        <td className="px-4 py-3 max-w-[220px]">
                          {isEditing ? (
                            <TagListEditor
                              tags={editTerritories}
                              onChange={setEditTerritories}
                              placeholder="Añadir tema..."
                              size="sm"
                            />
                          ) : (
                            proj.territories && proj.territories.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {proj.territories.map(t => (
                                  <span key={t} className="px-1.5 py-0.5 rounded-md font-bold text-[9px] bg-slate-100 text-slate-600">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-300 text-[10px]">—</span>
                            )
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setEditingProjId(null)}
                                className="text-[10px] font-bold text-gray-400 hover:text-gray-600 px-2 py-1"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleUpdateProject(proj.id)}
                                className="text-[10px] font-bold bg-app-accent text-white rounded px-2.5 py-1 hover:bg-app-accent-hover"
                              >
                                Guardar
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2.5">
                              <button
                                onClick={() => startEditProject(proj)}
                                className="text-[10px] font-bold text-app-accent hover:underline"
                              >
                                Modificar
                              </button>
                              <button
                                onClick={() => handleDeleteProject(proj.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                                aria-label="Eliminar proyecto"
                              >
                                <Trash2 size={13} />
                              </button>
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

      {/* 3. Original agency/workspace settings */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
            <Settings size={18} className="text-app-accent" />
            Configuración del Workspace
          </h3>
          <p className="text-xs text-gray-400 mt-1">Establece los parámetros generales y las preferencias de notificación de tu agencia.</p>
        </div>

        <form onSubmit={handleSaveAgencySettings} className="p-6 space-y-6">
          {/* General Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
              <Globe size={14} />
              <span>General</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nombre de la Agencia</label>
                <input 
                  type="text" 
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-700 outline-none focus:border-app-accent focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Zona Horaria Predeterminada</label>
                <select 
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-700 outline-none focus:border-app-accent focus:bg-white transition-all"
                >
                  <option value="Europe/Madrid">Madrid (CET) - Europe/Madrid</option>
                  <option value="America/New_York">New York (EST) - America/New_York</option>
                  <option value="America/Mexico_City">Mexico City (CST) - America/Mexico_City</option>
                  <option value="America/Bogota">Bogotá (EST) - America/Bogota</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Notifications Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
              <Bell size={14} />
              <span>Notificaciones Automáticas</span>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">Alertas por Correo</p>
                  <p className="text-[10px] text-gray-400">Recibe resúmenes diarios con los comentarios y cambios de estado.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifyEmail}
                  aria-label="Alertas por correo"
                  onClick={() => setNotifyEmail(!notifyEmail)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifyEmail ? 'bg-app-accent' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifyEmail ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">Notificaciones en Slack</p>
                  <p className="text-[10px] text-gray-400">Notifica automáticamente al canal #social-media cuando haya un nuevo post.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifySlack}
                  aria-label="Notificaciones en Slack"
                  onClick={() => setNotifySlack(!notifySlack)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifySlack ? 'bg-app-accent' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifySlack ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">Flujo Aprobación de Cliente</p>
                  <p className="text-[10px] text-gray-400">Recibe una alerta inmediata cuando el cliente apruebe un post final.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifyClientApprove}
                  aria-label="Flujo de aprobación de cliente"
                  onClick={() => setNotifyClientApprove(!notifyClientApprove)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifyClientApprove ? 'bg-app-accent' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifyClientApprove ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <Button type="submit" variant="primary" disabled={isSavingAgencySettings} className="gap-2 px-6 py-2.5">
              <Save size={16} />
              {isSavingAgencySettings ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </form>
      </div>

      {/* Custom Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-gray-100"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                <AlertTriangle size={24} />
              </div>
              <button
                onClick={() => setProjectToDelete(null)}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <h4 className="text-base font-extrabold text-gray-900 mb-2">
              ¿Eliminar proyecto definitivamente?
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Esta acción es irreversible. Se eliminará el proyecto seleccionado y todas las publicaciones asociadas podrían quedar huérfanas o sin clasificar.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setProjectToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteProject}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/10"
              >
                Sí, eliminar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-app-accent/10 text-app-accent rounded-2xl">
                <UserPlus size={24} />
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <h4 className="text-base font-extrabold text-gray-900 mb-1">
              Invitar colaborador o cliente
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Se crea una invitación pendiente. Debes compartir tú mismo el enlace de la app con esta persona — todavía no enviamos el correo automáticamente.
            </p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Nombre completo</label>
                <input 
                  type="text" 
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ej. Ana Belén"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-app-accent focus:bg-white transition-all text-gray-800"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Correo electrónico</label>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Ej. ana.client@basetis.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-app-accent focus:bg-white transition-all text-gray-800"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Rol en SocialFlow</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-app-accent focus:bg-white transition-all font-bold text-gray-700 cursor-pointer"
                >
                  {ASSIGNABLE_ROLES.map((key) => (
                    <option key={key} value={key}>{ROLES[key]}</option>
                  ))}
                </select>
              </div>

              {inviteRole === 'client' && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Proyecto del cliente</label>
                  <select
                    value={inviteProjectId}
                    onChange={(e) => setInviteProjectId(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-app-accent focus:bg-white transition-all font-bold text-gray-700 cursor-pointer"
                  >
                    <option value="">Selecciona un proyecto...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
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
          </motion.div>
        </div>
      )}
    </div>
  );
}
