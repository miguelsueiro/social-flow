import { useEffect, useState } from 'react';
import {
  Target,
  ThumbsUp,
  ThumbsDown,
  BookMarked,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { Role } from '../lib/utils';
import { RepositoryItem, RepositoryCategory, GuidelineType } from '../types';
import { classifyReferenceFile, MAX_INLINE_BYTES, REFERENCE_ACCEPT } from '../lib/media';
import SegmentedControl from './SegmentedControl';
import EmptyState from './EmptyState';
import ConfirmInline from './ConfirmInline';
import Modal from './Modal';
import Media from './Media';

interface RepositoryViewProps {
  projectId: string;
  userRole: Role;
  userName?: string;
}

const CATEGORY_META: Record<RepositoryCategory, { label: string; icon: typeof Target }> = {
  strategy: { label: 'Estrategia de Marca', icon: Target },
  guidelines: { label: "Do's & Don'ts", icon: ThumbsUp },
  brandbook: { label: 'Brandbook', icon: BookMarked },
  assets: { label: 'Assets', icon: ImageIcon },
  links: { label: 'Enlaces', icon: LinkIcon },
};

const CATEGORY_ORDER: RepositoryCategory[] = ['strategy', 'guidelines', 'brandbook', 'assets', 'links'];

function RepositoryItemCard({ item, canEdit, onDelete }: { item: RepositoryItem; canEdit: boolean; onDelete: () => void }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isAsset = item.category === 'assets' && !!item.url;

  return (
    <div className="bg-white rounded-2xl border border-divider shadow-sm p-4 flex flex-col gap-2">
      {isAsset && (
        <div className="aspect-video bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center border border-divider/60">
          <Media src={item.url} alt={item.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-ink">{item.title}</p>
        {canEdit && (
          confirmingDelete ? (
            <ConfirmInline message="¿Eliminar?" onConfirm={onDelete} onCancel={() => setConfirmingDelete(false)} />
          ) : (
            <button type="button" onClick={() => setConfirmingDelete(true)} aria-label={`Eliminar ${item.title}`} className="p-1 text-ink-muted hover:text-red-600 shrink-0 transition-colors">
              <Trash2 size={14} />
            </button>
          )
        )}
      </div>
      {item.description && <p className="text-xs text-ink-secondary whitespace-pre-wrap">{item.description}</p>}
      {item.url && !isAsset && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-app-accent hover:underline w-fit">
          <ExternalLink size={12} /> Abrir enlace
        </a>
      )}
      {item.createdByName && <p className="text-[11px] text-ink-muted mt-1">Añadido por {item.createdByName}</p>}
    </div>
  );
}

interface AddItemFormState {
  category: RepositoryCategory;
  title: string;
  description: string;
  url: string;
  guidelineType: GuidelineType;
}

function AddItemModal({ category, onClose, onSubmit }: { category: RepositoryCategory; onClose: () => void; onSubmit: (data: Omit<RepositoryItem, 'id' | 'createdAt'>) => void }) {
  const [form, setForm] = useState<AddItemFormState>({ category, title: '', description: '', url: '', guidelineType: 'do' });
  const [uploading, setUploading] = useState(false);

  const handleFile = (file: File) => {
    const kind = classifyReferenceFile(file);
    const limit = MAX_INLINE_BYTES[kind];
    if (file.size > limit) {
      toast.error(`El archivo supera el límite de ${Math.round(limit / 1024)}KB. Sube el asset a Drive/Figma y pega el enlace en su lugar.`);
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(f => ({ ...f, url: reader.result as string }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!form.title.trim()) {
      toast.error('El título es obligatorio.');
      return;
    }
    onSubmit({
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      url: form.url.trim() || undefined,
      guidelineType: form.category === 'guidelines' ? form.guidelineType : undefined,
    });
  };

  return (
    <Modal onClose={onClose} title={`Añadir a ${CATEGORY_META[category].label}`} icon={CATEGORY_META[category].icon} size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="text-xs font-bold text-ink-secondary hover:text-ink px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">Cancelar</button>
          <button type="button" onClick={submit} disabled={uploading} className="bg-app-accent hover:bg-app-accent-hover disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm">Guardar</button>
        </div>
      }
    >
      <div className="space-y-3">
        {category === 'guidelines' && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm(f => ({ ...f, guidelineType: 'do' }))} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${form.guidelineType === 'do' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-divider text-ink-muted'}`}>✅ Do</button>
            <button type="button" onClick={() => setForm(f => ({ ...f, guidelineType: 'dont' }))} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${form.guidelineType === 'dont' ? 'bg-red-50 border-red-300 text-red-700' : 'border-divider text-ink-muted'}`}>🚫 Don't</button>
          </div>
        )}
        <input
          value={form.title}
          onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Título"
          aria-label="Título"
          autoFocus
          className="w-full bg-gray-50 border border-divider rounded-md py-2 px-3 text-sm outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent/20"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Descripción (opcional)"
          aria-label="Descripción"
          className="w-full bg-gray-50 border border-divider rounded-md py-2 px-3 text-sm outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent/20 resize-none h-20"
        />
        <input
          value={form.url}
          onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))}
          placeholder="URL (Drive, Figma, sitio de marca...)"
          aria-label="URL"
          type="url"
          className="w-full bg-gray-50 border border-divider rounded-md py-2 px-3 text-sm outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent/20"
        />
        {category === 'assets' && (
          <div>
            <input
              type="file"
              id="repository-asset-upload"
              accept={REFERENCE_ACCEPT}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <label htmlFor="repository-asset-upload" className="text-xs font-semibold text-app-accent hover:underline cursor-pointer">
              {uploading ? 'Procesando…' : form.url.startsWith('data:') ? 'Archivo cargado ✓ — cambiar archivo' : 'o sube un archivo pequeño (imagen/GIF/vídeo/PDF)'}
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Per-project reference library — brand strategy, agreed Do's & Don'ts,
 *  brandbook, small assets, and useful links. Backed by
 *  `projects/{id}/repository` (a subcollection, unlike hashtagGroups: this
 *  can grow without bound and doesn't need to load with every project doc
 *  read, so it gets its own lazily-mounted listener). Visible to clients
 *  (read-only) since it's exactly the material meant to be shared with
 *  them — only agency members can add or remove items. */
export default function RepositoryView({ projectId, userRole, userName }: RepositoryViewProps) {
  const [items, setItems] = useState<RepositoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<RepositoryCategory>('strategy');
  const [showAddModal, setShowAddModal] = useState(false);
  const canEdit = userRole !== 'client';

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'projects', projectId, 'repository'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RepositoryItem)));
      setLoading(false);
    }, (err) => {
      console.error('Error al cargar el repositorio de marca:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [projectId]);

  const handleAdd = async (data: Omit<RepositoryItem, 'id' | 'createdAt'>) => {
    try {
      // Firestore's addDoc rejects a payload containing a literal `undefined`
      // value (invalid-argument) — description/url/guidelineType are all
      // optional and arrive as `undefined` when left blank, so those keys
      // must be omitted entirely rather than written as undefined.
      const payload = Object.fromEntries(
        Object.entries({ ...data, createdByName: userName || 'Usuario', createdAt: new Date().toISOString() })
          .filter(([, value]) => value !== undefined)
      );
      await addDoc(collection(db, 'projects', projectId, 'repository'), payload);
      toast.success('Añadido al repositorio');
      setShowAddModal(false);
    } catch (err) {
      console.error('Error al guardar en el repositorio:', err);
      toast.error('No se pudo guardar. Revisa tus permisos.');
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'repository', itemId));
      toast.success('Eliminado del repositorio');
    } catch (err) {
      console.error('Error al eliminar del repositorio:', err);
      toast.error('No se pudo eliminar.');
    }
  };

  const categoryItems = items.filter(i => i.category === category);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-gray-200/60 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <BookMarked className="text-app-accent" size={20} />
            Repositorio de Marca
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">Estrategia, Do's & Don'ts, brandbook y assets de referencia para este proyecto.</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-app-accent hover:bg-app-accent-hover text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm shrink-0"
          >
            <Plus size={14} /> Añadir
          </button>
        )}
      </div>

      <SegmentedControl
        aria-label="Categoría del repositorio"
        fullWidth={false}
        className="flex-wrap"
        value={category}
        onChange={(v) => setCategory(v as RepositoryCategory)}
        options={CATEGORY_ORDER.map(c => ({ value: c, label: CATEGORY_META[c].label, icon: CATEGORY_META[c].icon }))}
      />

      {category === 'guidelines' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5"><ThumbsUp size={14} /> Do's</h3>
            {categoryItems.filter(i => i.guidelineType === 'do').length === 0 ? (
              <EmptyState title="Sin do's todavía" size="sm" />
            ) : (
              categoryItems.filter(i => i.guidelineType === 'do').map(item => (
                <RepositoryItemCard key={item.id} item={item} canEdit={canEdit} onDelete={() => handleDelete(item.id)} />
              ))
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5"><ThumbsDown size={14} /> Don'ts</h3>
            {categoryItems.filter(i => i.guidelineType === 'dont').length === 0 ? (
              <EmptyState title="Sin don'ts todavía" size="sm" />
            ) : (
              categoryItems.filter(i => i.guidelineType === 'dont').map(item => (
                <RepositoryItemCard key={item.id} item={item} canEdit={canEdit} onDelete={() => handleDelete(item.id)} />
              ))
            )}
          </div>
        </div>
      ) : categoryItems.length === 0 ? (
        <EmptyState
          icon={CATEGORY_META[category].icon}
          title={`Todavía no hay nada en ${CATEGORY_META[category].label}`}
          description={canEdit ? 'Usa "Añadir" para empezar a construir esta sección.' : undefined}
          bordered
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categoryItems.map(item => (
            <RepositoryItemCard key={item.id} item={item} canEdit={canEdit} onDelete={() => handleDelete(item.id)} />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddItemModal category={category} onClose={() => setShowAddModal(false)} onSubmit={handleAdd} />
      )}
    </div>
  );
}
