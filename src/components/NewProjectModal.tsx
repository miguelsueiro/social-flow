import { useState, FormEvent } from 'react';
import { X, Check, Palette } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { useModalA11y } from '../lib/useModalA11y';
import { InstagramIcon, TikTokIcon, LinkedInIcon } from './SocialIcons';
import TagListEditor from './TagListEditor';

const PLATFORM_OPTIONS = [
  { id: 'instagram', label: 'Instagram', icon: InstagramIcon, color: 'text-[#E1306C] border-[#E1306C]/20 bg-[#E1306C]/5' },
  { id: 'linkedin', label: 'LinkedIn', icon: LinkedInIcon, color: 'text-[#0A66C2] border-[#0A66C2]/20 bg-[#0A66C2]/5' },
  { id: 'tiktok', label: 'TikTok', icon: TikTokIcon, color: 'text-zinc-900 border-zinc-900/20 bg-zinc-900/5' }
];

export interface NewProjectData {
  name: string;
  clientName: string;
  color: string;
  platforms: string[];
  territories: string[];
}

interface NewProjectModalProps {
  onClose: () => void;
  onSubmit: (data: NewProjectData) => Promise<void> | void;
}

export default function NewProjectModal({ onClose, onSubmit }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [platforms, setPlatforms] = useState<string[]>(['instagram', 'linkedin', 'tiktok']);
  const [territories, setTerritories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useModalA11y(onClose);

  const togglePlatform = (id: string) => {
    if (platforms.includes(id)) {
      if (platforms.length > 1) {
        setPlatforms(platforms.filter(p => p !== id));
      } else {
        toast.error('El proyecto debe usar al menos una red social.');
      }
    } else {
      setPlatforms([...platforms, id]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientName.trim()) {
      toast.error('Por favor introduce nombre y cliente');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), clientName: clientName.trim(), color, platforms, territories });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-modal-title"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-lg overflow-hidden outline-none"
      >
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-app-accent/10 text-app-accent rounded-lg">
              <Palette size={18} />
            </div>
            <div>
              <h3 id="new-project-modal-title" className="font-extrabold text-gray-900 text-sm">Crear Nuevo Proyecto</h3>
              <p className="text-xs text-gray-400 mt-0.5">Configura los datos del nuevo cliente o marca.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-all"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label htmlFor="new-project-name" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nombre del Proyecto / Marca</label>
              <input
                id="new-project-name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. EcoGlow S.L."
                className="w-full bg-gray-50 border border-gray-200 focus:bg-white rounded-xl py-2.5 px-3 text-xs font-bold text-gray-700 outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all"
              />
            </div>
            <div>
              <label htmlFor="new-project-client" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Nombre del Cliente Legal</label>
              <input
                id="new-project-client"
                type="text"
                required
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Ej. EcoGlow Cosmetics S.L."
                className="w-full bg-gray-50 border border-gray-200 focus:bg-white rounded-xl py-2.5 px-3 text-xs font-bold text-gray-700 outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all"
              />
            </div>
            <div>
              <label htmlFor="new-project-color" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Color de Marca (Identidad)</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-11 h-9 bg-white border border-gray-200 rounded-xl cursor-pointer p-0.5 shrink-0"
                  aria-label="Selector de color de marca"
                />
                <input
                  id="new-project-color"
                  type="text"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  placeholder="#2563EB"
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white rounded-xl py-2 px-3 text-xs font-mono outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all uppercase font-bold text-gray-700"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Este color se convertirá en el color de acento visual al seleccionar el proyecto.</p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Redes Sociales Activas</label>
            <div className="flex gap-3 flex-wrap">
              {PLATFORM_OPTIONS.map(platform => {
                const isActive = platforms.includes(platform.id);
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                      isActive
                        ? platform.color
                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span>{platform.label}</span>
                    {isActive && <Check size={12} className="stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Territorios (temáticas del proyecto)</label>
            <TagListEditor
              tags={territories}
              onChange={setTerritories}
              placeholder="Ej. Producto, Sostenibilidad, Lifestyle..."
            />
            <p className="text-[10px] text-gray-400 mt-1.5">Opcional. Si añades alguno, aparecerá como desplegable al editar los posts de este proyecto.</p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-gray-700 font-bold px-4 py-2 hover:bg-gray-50 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-app-accent text-white hover:bg-app-accent-hover disabled:opacity-60 disabled:cursor-not-allowed text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all"
            >
              {isSubmitting ? 'Creando...' : 'Crear Proyecto'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
