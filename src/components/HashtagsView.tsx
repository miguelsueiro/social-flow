import { useState, KeyboardEvent } from 'react';
import { Hash, Plus, X, Trash2, Search } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { normalizeHashtag } from '../lib/hashtags';
import { Project, HashtagGroup } from '../types';
import EmptyState from './EmptyState';
import ConfirmInline from './ConfirmInline';

interface HashtagsViewProps {
  project: Project | undefined;
  loading?: boolean;
}

let localIdCounter = 0;
function makeGroupId() {
  localIdCounter += 1;
  return `group-${Date.now()}-${localIdCounter}`;
}

async function saveGroups(projectId: string, groups: HashtagGroup[]) {
  try {
    await updateDoc(doc(db, 'projects', projectId), { hashtagGroups: groups });
  } catch (err) {
    console.error('Error al guardar los hashtags:', err);
    toast.error('No se pudieron guardar los hashtags.');
  }
}

function HashtagGroupCard({ group, onChange, onDelete }: { group: HashtagGroup; onChange: (group: HashtagGroup) => void; onDelete: () => void }) {
  const [nameDraft, setNameDraft] = useState(group.name);
  const [tagDraft, setTagDraft] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== group.name) onChange({ ...group, name: trimmed });
    else setNameDraft(group.name);
  };

  const addTag = () => {
    const normalized = normalizeHashtag(tagDraft);
    setTagDraft('');
    if (!normalized) return;
    if (group.hashtags.some(t => t.toLowerCase() === normalized.toLowerCase())) return;
    onChange({ ...group, hashtags: [...group.hashtags, normalized] });
  };

  const removeTag = (tag: string) => {
    onChange({ ...group, hashtags: group.hashtags.filter(t => t !== tag) });
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  };

  return (
    <div className="bg-white rounded-2xl border border-divider shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          aria-label="Nombre del grupo"
          className="font-bold text-sm text-ink bg-transparent border border-transparent hover:border-divider focus:border-app-accent rounded-md -ml-2 px-2 py-1 outline-none focus:ring-2 focus:ring-app-accent/20 transition-all"
        />
        {confirmingDelete ? (
          <ConfirmInline message="¿Eliminar grupo?" onConfirm={onDelete} onCancel={() => setConfirmingDelete(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Eliminar grupo ${group.name}`}
            className="p-1.5 text-ink-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {group.hashtags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 bg-app-accent/5 border border-app-accent/15 text-app-accent rounded-full font-bold text-xs py-1 px-2.5">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} aria-label={`Quitar ${tag}`} className="p-1 -m-1 text-app-accent/60 hover:text-red-600 transition-colors">
              <X size={10} />
            </button>
          </span>
        ))}
        {group.hashtags.length === 0 && (
          <span className="text-xs text-ink-muted italic">Sin hashtags todavía.</span>
        )}
      </div>

      <div className="flex gap-1.5 pt-1">
        <input
          type="text"
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={handleTagKeyDown}
          placeholder="Añadir hashtag..."
          aria-label={`Añadir hashtag al grupo ${group.name}`}
          className="flex-1 bg-gray-50 border border-divider rounded-md py-1.5 px-3 text-xs outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent/20 transition-all"
        />
        <button type="button" onClick={addTag} aria-label="Añadir hashtag" className="shrink-0 bg-gray-100 hover:bg-gray-200 text-ink-secondary rounded-lg px-2.5 flex items-center justify-center transition-colors">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

/** Per-project library of reusable hashtags, grouped by theme (People,
 *  Producto, Campaña...) — written straight to `projects/{id}.hashtagGroups`
 *  (same direct-Firestore-write pattern SettingsView already uses for
 *  `platforms`/`territories`, not routed through a central App.tsx handler).
 *  Consumed from PostModal's Producción tab via HashtagPickerModal. */
export default function HashtagsView({ project, loading = false }: HashtagsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const groups = project?.hashtagGroups || [];

  const persist = (nextGroups: HashtagGroup[]) => {
    if (!project) return;
    saveGroups(project.id, nextGroups);
  };

  const addGroup = () => {
    if (!project) return;
    persist([...groups, { id: makeGroupId(), name: 'Nuevo grupo', hashtags: [] }]);
  };

  const updateGroup = (updated: HashtagGroup) => {
    persist(groups.map(g => g.id === updated.id ? updated : g));
  };

  const deleteGroup = (groupId: string) => {
    persist(groups.filter(g => g.id !== groupId));
  };

  const query = searchQuery.trim().toLowerCase();
  // Filters which GROUPS show, never which hashtags show within a group —
  // truncating a group's own hashtags array here would mean an edit made
  // while a search filter is active (add/remove tag) writes back only the
  // filtered subset, silently deleting every non-matching tag in that group.
  const visibleGroups = query
    ? groups.filter(g => g.name.toLowerCase().includes(query) || g.hashtags.some(t => t.toLowerCase().includes(query)))
    : groups;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-gray-200/60 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Hash className="text-app-accent" size={20} />
            Hashtags
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">Biblioteca de hashtags reutilizables del proyecto, agrupados por temática. Se seleccionan desde Producción en cada post.</p>
        </div>
        <div className="flex items-center gap-2">
          {groups.length > 0 && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar hashtag o grupo..."
                aria-label="Buscar hashtag o grupo"
                className="bg-white border border-divider rounded-full pl-8 pr-3 py-2 text-xs outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 w-56"
              />
            </div>
          )}
          <button
            type="button"
            onClick={addGroup}
            className="flex items-center gap-1.5 bg-app-accent hover:bg-app-accent-hover text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm shrink-0"
          >
            <Plus size={14} /> Nuevo grupo
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={Hash} title="Todavía no hay grupos de hashtags" description='Crea un grupo (por ejemplo "People" o "Producto") y añade los hashtags que se reutilizan en los posts.' bordered />
      ) : visibleGroups.length === 0 ? (
        <EmptyState icon={Search} title="Sin resultados" description="Ningún grupo o hashtag coincide con tu búsqueda." size="sm" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleGroups.map(group => (
            <HashtagGroupCard
              key={group.id}
              group={group}
              onChange={updateGroup}
              onDelete={() => deleteGroup(group.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
