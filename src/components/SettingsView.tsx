import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Save, 
  Globe, 
  Bell, 
  Palette, 
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
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ROLES, Role } from '../lib/utils';

interface Project {
  id: string;
  name: string;
  clientName: string;
  color: string;
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
  const [themeColor, setThemeColor] = useState('blue');

  const [usersList, setUsersList] = useState<any[]>([]);
  const [activeUserPopover, setActiveUserPopover] = useState<string | null>(null);
  const [popoverSearch, setPopoverSearch] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('client');
  const [inviteName, setInviteName] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    try {
      const id = doc(collection(db, 'users')).id;
      const newUser = {
        uid: id,
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        status: 'pending',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(inviteName)}&background=random`,
        projectId: ''
      };

      await setDoc(doc(db, 'users', id), newUser);
      toast.success('Usuario invitado con éxito');
      setInviteEmail('');
      setInviteName('');
      setShowInviteModal(false);
    } catch (err) {
      toast.error('Error al invitar usuario');
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

  // New project inline form states
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newColor, setNewColor] = useState('#2563EB');

  // Edit states for projects
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleSaveAgencySettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Configuración general guardada con éxito');
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newClient.trim()) {
      toast.error('Por favor introduce nombre y cliente');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: newName.trim(),
        clientName: newClient.trim(),
        color: newColor,
        createdAt: new Date()
      });
      toast.success('¡Proyecto creado con éxito!');
      setActiveProjectId(docRef.id);
      setNewName('');
      setNewClient('');
      setNewColor('#2563EB');
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
        color: editColor
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
      
      {/* Role Selection Simulator Panel */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 text-sm">Modo de Rol de Usuario (Simulador de Entorno)</h3>
            <p className="text-xs text-gray-400">Cambia de rol para simular la interfaz, permisos y vistas específicas de la agencia o del cliente.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(ROLES).map(([key, label]) => {
            const isSelected = userRole === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onRoleChange(key as Role)}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all relative ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-500/10'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {key === 'client' ? 'Externo' : 'Agencia'}
                  </span>
                  {isSelected && (
                    <div className="bg-indigo-600 text-white rounded-full p-0.5">
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
      
      {/* 1. Project switching panel (moved from sidebar/topbar) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6">
        <div className="flex items-center gap-3 mb-4">
          <Folder size={20} className="text-blue-600" />
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
                  ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/10'
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
                <Users size={18} className="text-indigo-600" />
                Gestión de Usuarios y Permisos de Proyectos
              </h3>
              <p className="text-xs text-gray-400 mt-1">Como administrador, puedes invitar colaboradores, asignar roles de la agencia y habilitar o deshabilitar el acceso a proyectos específicos.</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md flex items-center gap-1.5 transition-all self-start md:self-auto shrink-0 animate-fade-in"
            >
              <UserPlus size={14} />
              Invitar Usuario
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                placeholder="Buscar usuarios por nombre o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-2 pl-10 pr-4 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
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

                    return (
                      <div key={usr.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={usr.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(usr.name || '')}`} 
                            alt={usr.name} 
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100"
                          />
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
                        </div>

                        <div className="flex items-center gap-5 shrink-0 relative">
                          {/* Role Selector */}
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rol / Permisos</span>
                            {isUserAdmin ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs">
                                {ROLES.admin}
                              </span>
                            ) : (
                              <select
                                value={usr.role || 'client'}
                                onChange={(e) => handleRoleChangeInDb(usr.id, e.target.value as Role)}
                                className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
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
                                        <span className="inline-flex items-center bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-xl text-[10px] text-indigo-600 font-bold shrink-0">
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
                                    <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-150 shadow-2xl rounded-2xl p-3.5 z-50 space-y-2">
                                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Permisos para {usr.name}</p>
                                      
                                      {projects.length > 4 && (
                                        <div className="relative flex items-center">
                                          <Search size={13} className="absolute left-2.5 text-gray-400" />
                                          <input
                                            type="text"
                                            placeholder="Buscar proyecto..."
                                            value={popoverSearch}
                                            onChange={(e) => setPopoverSearch(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-150 rounded-xl py-1 pl-7 pr-3 text-xs outline-none focus:bg-white focus:border-indigo-500 transition-all text-gray-800"
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
                                                  hasPerm ? 'text-indigo-700 font-bold' : 'text-gray-600'
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
                                                  hasPerm ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 bg-white'
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
                <Folder size={18} className="text-blue-600" />
                Administración de Proyectos y Clientes
              </h3>
              <p className="text-xs text-gray-400 mt-1">Crea, modifica y elimina tus cuentas de clientes o marcas activas en el sistema.</p>
            </div>
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md flex items-center gap-1.5 transition-all"
              >
                <Plus size={14} />
                Nuevo Proyecto
              </button>
            )}
          </div>

          <div className="p-6 space-y-4">
            {/* Project Creation Form */}
            {isAdding && (
              <form onSubmit={handleCreateProject} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                <div className="text-xs font-bold text-gray-700">Agregar Nueva Cuenta</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nombre del Proyecto / Marca</label>
                    <input 
                      type="text" 
                      required
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Ej. EcoGlow S.L."
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-gray-700 outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nombre del Cliente Legal</label>
                    <input 
                      type="text" 
                      required
                      value={newClient}
                      onChange={e => setNewClient(e.target.value)}
                      placeholder="Ej. EcoGlow Cosmetics S.L."
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-gray-700 outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Color de Marca (Identidad)</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={newColor}
                        onChange={e => setNewColor(e.target.value)}
                        className="w-10 h-8 bg-white border border-gray-200 rounded cursor-pointer p-0.5"
                      />
                      <input 
                        type="text" 
                        value={newColor}
                        onChange={e => setNewColor(e.target.value)}
                        placeholder="#2563EB"
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-mono outline-none focus:border-blue-500 transition-all uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-4 py-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Crear Proyecto
                  </button>
                </div>
              </form>
            )}

            {/* List Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Color</th>
                    <th className="px-4 py-3">Nombre del Proyecto</th>
                    <th className="px-4 py-3">Cliente Legal</th>
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
                                className="text-[10px] font-bold bg-green-500 text-white rounded px-2.5 py-1 hover:bg-green-600"
                              >
                                Guardar
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2.5">
                              <button
                                onClick={() => startEditProject(proj)}
                                className="text-[10px] font-bold text-blue-600 hover:underline"
                              >
                                Modificar
                              </button>
                              <button
                                onClick={() => handleDeleteProject(proj.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
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
            <Settings size={18} className="text-blue-600" />
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
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Zona Horaria Predeterminada</label>
                <select 
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
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

          {/* Color Palettes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
              <Palette size={14} />
              <span>Personalización Visual</span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Color de Énfasis de la Agencia</label>
              <div className="flex gap-3">
                {[
                  { name: 'blue', class: 'bg-blue-600 ring-blue-200' },
                  { name: 'indigo', class: 'bg-indigo-600 ring-indigo-200' },
                  { name: 'purple', class: 'bg-purple-600 ring-purple-200' },
                  { name: 'pink', class: 'bg-pink-600 ring-pink-200' },
                  { name: 'emerald', class: 'bg-emerald-600 ring-emerald-200' }
                ].map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setThemeColor(color.name)}
                    className={`w-7 h-7 rounded-full ${color.class} ${themeColor === color.name ? 'ring-4' : ''} transition-all`}
                  />
                ))}
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
                  onClick={() => setNotifyEmail(!notifyEmail)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifyEmail ? 'bg-blue-600' : 'bg-gray-200'}`}
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
                  onClick={() => setNotifySlack(!notifySlack)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifySlack ? 'bg-blue-600' : 'bg-gray-200'}`}
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
                  onClick={() => setNotifyClientApprove(!notifyClientApprove)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifyClientApprove ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifyClientApprove ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95"
            >
              <Save size={16} />
              Guardar Configuración
            </button>
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
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <UserPlus size={24} />
              </div>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <h4 className="text-base font-extrabold text-gray-900 mb-1">
              Invitar colaborador o cliente
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              El usuario recibirá un correo con el enlace para acceder con su cuenta de Google.
            </p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Nombre completo</label>
                <input 
                  type="text" 
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ej. Ana Belén"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-gray-800"
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
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-gray-800"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Rol en SocialFlow</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold text-gray-700 cursor-pointer"
                >
                  {Object.entries(ROLES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
                >
                  Enviar invitación
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
