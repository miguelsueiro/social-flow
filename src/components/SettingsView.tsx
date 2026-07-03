import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Save, 
  Smartphone, 
  Globe, 
  Bell, 
  Palette, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SettingsView() {
  const [agencyName, setAgencyName] = useState('Basetis Creative Studio');
  const [timezone, setTimezone] = useState('Europe/Madrid');
  const [notifySlack, setNotifySlack] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyClientApprove, setNotifyClientApprove] = useState(true);
  const [themeColor, setThemeColor] = useState('blue');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Configuración de la agencia guardada con éxito');
  };

  return (
    <div className="flex-1 overflow-y-auto max-w-3xl mx-auto w-full">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
            <Settings size={18} className="text-blue-600" />
            Configuración del Workspace
          </h3>
          <p className="text-xs text-gray-400 mt-1">Establece los parámetros generales y las preferencias de notificación de tu agencia.</p>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md shadow-blue-200 flex items-center gap-2 transition-all active:scale-95"
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
