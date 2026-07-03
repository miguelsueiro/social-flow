import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

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
}

export default function SettingsView({ projects, activeProjectId, setActiveProjectId, userRole }: SettingsViewProps) {
  const [agencyName, setAgencyName] = useState('Basetis Creative Studio');
  const [timezone, setTimezone] = useState('Europe/Madrid');
  const [notifySlack, setNotifySlack] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyClientApprove, setNotifyClientApprove] = useState(true);
  const [themeColor, setThemeColor] = useState('blue');

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

  const handleDeleteProject = async (projId: string) => {
    if (projects.length <= 1) {
      toast.error('No se puede eliminar el único proyecto existente');
      return;
    }
    if (!window.confirm('¿Estás seguro de que quieres eliminar este proyecto? Todos los posts asociados quedarán huérfanos.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'projects', projId));
      toast.success('Proyecto eliminado correctamente');
      if (activeProjectId === projId) {
        setActiveProjectId('all');
      }
    } catch (err) {
      toast.error('Error al eliminar el proyecto');
      console.error(err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full pb-12 space-y-6">
      
      {/* 1. Project switching panel (moved from sidebar/topbar) */}
      {userRole !== 'client' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6">
          <div className="flex items-center gap-3 mb-4">
            <Folder size={20} className="text-blue-600" />
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm">Cambiar de Proyecto de Trabajo Activo</h3>
              <p className="text-xs text-gray-400">Selecciona el espacio de trabajo que quieres planificar en el calendario y ver en el tablero.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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

            {projects.map((proj) => (
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
    </div>
  );
}
