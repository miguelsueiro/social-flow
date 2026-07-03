import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  UserCheck, 
  Lock, 
  CheckCircle,
  Eye,
  Info,
  ChevronRight,
  Search
} from 'lucide-react';
import { ROLES, Role } from '../lib/utils';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'pending';
  avatar: string;
}

interface UsersListProps {
  currentUserRole: Role;
  onRoleChange: (newRole: Role) => void;
}

export default function UsersList({ currentUserRole, onRoleChange }: UsersListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('client');
  const [inviteName, setInviteName] = useState('');

  // Mock initial users
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([
    { id: '1', name: 'Laura Gómez', email: 'laura.gomez@basetis.com', role: 'creative_director', status: 'active', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
    { id: '2', name: 'Miguel Sueiro', email: 'miguel.sueiro@basetis.com', role: 'creative_director', status: 'active', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
    { id: '3', name: 'Carlos Díaz', email: 'carlos.copywriter@basetis.com', role: 'copy', status: 'active', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80' },
    { id: '4', name: 'Sofía Martínez', email: 'sofia.artdirector@basetis.com', role: 'art_director', status: 'active', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' },
    { id: '5', name: 'Lucas Rossi', email: 'lucas.designer@basetis.com', role: 'designer', status: 'active', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    { id: '6', name: 'Ana Belén', email: 'ana.client@basetis.com', role: 'client', status: 'active', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80' }
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    const newUser: UserProfile = {
      id: String(teamMembers.length + 1),
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      status: 'pending',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(inviteName)}&background=random`
    };

    setTeamMembers(prev => [...prev, newUser]);
    setInviteEmail('');
    setInviteName('');
    setShowInviteModal(false);
  };

  const filteredMembers = teamMembers.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ROLES[member.role].toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
      
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            placeholder="Buscar por nombre, correo o rol..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl py-2.5 pl-12 pr-4 text-sm focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
          />
        </div>

        <button 
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 self-stretch sm:self-auto justify-center"
        >
          <UserPlus size={18} />
          Invitar Colaborador o Cliente
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {/* Table/List */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              Equipo y Clientes
            </h3>
            <span className="text-[11px] bg-blue-50 text-blue-600 font-extrabold px-2.5 py-0.5 rounded-full uppercase">
              {filteredMembers.length} Usuarios
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Correo Electrónico</th>
                  <th className="px-6 py-4">Permisos / Rol</th>
                  <th className="px-6 py-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={member.avatar} 
                          alt={member.name} 
                          className="w-8 h-8 rounded-full border-2 border-white shadow-sm shrink-0"
                        />
                        <div>
                          <p className="font-bold text-gray-900">{member.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium">ID: {member.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium">
                      {member.email}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Shield size={14} className="text-blue-500 shrink-0" />
                        <span className="font-bold text-gray-700">{ROLES[member.role]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {member.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          <CheckCircle size={10} /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                          Pendiente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Roles information and simulator card */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
              <Shield size={16} className="text-blue-600" />
              Matriz de Permisos
            </h3>
            
            <p className="text-xs text-gray-500 leading-relaxed">
              El flujo de SocialFlow está regulado por roles para simular el ciclo de vida de aprobación real de una agencia de marketing:
            </p>

            <div className="space-y-3 pt-2">
              {[
                { title: 'Director Creativo', desc: 'Control total de la parrilla, aprueba copys, imágenes y sube ideas.' },
                { title: 'Copywriter', desc: 'Escribe y modifica descripciones en fase de Copys.' },
                { title: 'Art / Diseñador', desc: 'Sube enlaces de diseño final o imágenes de mockup.' },
                { title: 'Cliente final', desc: 'Solo ve posts aprobados o en revisión. Aprueba o comenta.' }
              ].map((roleInfo, i) => (
                <div key={i} className="flex gap-2.5 items-start text-xs border-l-2 border-blue-500/20 pl-3">
                  <div>
                    <p className="font-bold text-gray-800">{roleInfo.title}</p>
                    <p className="text-gray-400 text-[10px] leading-relaxed mt-0.5">{roleInfo.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <hr className="border-gray-100" />

            <div className="bg-yellow-50/50 border border-yellow-100 p-3.5 rounded-2xl flex gap-2.5 text-[11px] text-amber-800 leading-relaxed">
              <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <p>
                <strong>Simulador:</strong> Puedes usar el selector inferior del menú para cambiar tu rol activo de inmediato y validar las diferentes experiencias.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal Dialog */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative"
          >
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Invitar Colaborador</h3>
            <p className="text-xs text-gray-500 mb-4">El usuario recibirá un correo con el enlace del proyecto para acceder con su cuenta de Google.</p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ej. Ana Belén"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Ej. ana.client@basetis.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Rol en SocialFlow</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-700"
                >
                  {Object.entries(ROLES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2 justify-end">
                <button 
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="text-xs font-bold text-gray-500 hover:text-gray-700 px-4 py-2"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-200"
                >
                  Enviar Invitación
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
