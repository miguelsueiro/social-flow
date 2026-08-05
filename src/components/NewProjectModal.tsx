import { useState, FormEvent } from 'react';
import { Check, Palette } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { InstagramIcon, TikTokIcon, LinkedInIcon } from './SocialIcons';
import TagListEditor from './TagListEditor';
import Button from './Button';
import Modal from './Modal';

const PLATFORM_OPTIONS = [
  { id: 'instagram', label: 'Instagram', icon: InstagramIcon, color: 'text-[#E1306C] border-[#E1306C]/20 bg-[#E1306C]/5' },
  { id: 'linkedin', label: 'LinkedIn', icon: LinkedInIcon, color: 'text-[#0A66C2] border-[#0A66C2]/20 bg-[#0A66C2]/5' },
  { id: 'tiktok', label: 'TikTok', icon: TikTokIcon, color: 'text-ink border-zinc-900/20 bg-zinc-900/5' }
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
  const [color, setColor] = useState('#4F46E5');
  const [platforms, setPlatforms] = useState<string[]>(['instagram', 'linkedin', 'tiktok']);
  const [territories, setTerritories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <Modal onClose={onClose} title="Crear Nuevo Proyecto" icon={Palette} size="md">
      <p className="text-xs text-ink-muted -mt-2 mb-4">Configura los datos del nuevo cliente o marca.</p>

      {/* The submit button has to stay inside this <form> for native
          submission, so the buttons live here rather than in Modal's
          separate `footer` slot, which renders outside the form element. */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <div>
            <label htmlFor="new-project-name" className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Nombre del Proyecto / Marca</label>
            <input
              id="new-project-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. EcoGlow S.L."
              className="w-full bg-gray-50 border border-divider focus:bg-white rounded-md py-2.5 px-3 text-xs font-bold text-ink-secondary outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all"
            />
          </div>
          <div>
            <label htmlFor="new-project-client" className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Nombre del Cliente Legal</label>
            <input
              id="new-project-client"
              type="text"
              required
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Ej. EcoGlow Cosmetics S.L."
              className="w-full bg-gray-50 border border-divider focus:bg-white rounded-md py-2.5 px-3 text-xs font-bold text-ink-secondary outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all"
            />
          </div>
          <div>
            <label htmlFor="new-project-color" className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Color de Marca (Identidad)</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-11 h-9 bg-white border border-divider rounded-md cursor-pointer p-0.5 shrink-0 outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
                aria-label="Selector de color de marca"
              />
              <input
                id="new-project-color"
                type="text"
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="#4F46E5"
                className="w-full bg-gray-50 border border-divider focus:bg-white rounded-md py-2 px-3 text-xs font-mono outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all uppercase font-bold text-ink-secondary"
              />
            </div>
            <p className="text-caption text-ink-muted mt-1">Este color se convertirá en el color de acento visual al seleccionar el proyecto.</p>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mb-2">Redes Sociales Activas</label>
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
                      : 'bg-white border-divider text-ink-muted hover:border-outline hover:text-ink-secondary'
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
          <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mb-2">Territorios (temáticas del proyecto)</label>
          <TagListEditor
            tags={territories}
            onChange={setTerritories}
            placeholder="Ej. Producto, Sostenibilidad, Lifestyle..."
            label="Añadir territorio"
          />
          <p className="text-caption text-ink-muted mt-1.5">Opcional. Si añades alguno, aparecerá como desplegable al editar los posts de este proyecto.</p>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-divider">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear Proyecto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
