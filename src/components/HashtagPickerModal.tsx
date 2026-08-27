import { useState } from 'react';
import { Hash, Search, Check } from 'lucide-react';
import Modal from './Modal';
import { HashtagGroup } from '../types';

interface HashtagPickerModalProps {
  groups: HashtagGroup[];
  selected: string[];
  onClose: () => void;
  onSave: (selected: string[]) => void;
}

/** Visual selector for a post's hashtags, opened from Producción — groups
 *  collapse into chip grids with a predictive search across every group's
 *  tags at once. Selection is local until "Guardar" so closing without
 *  saving (Escape, backdrop click) discards changes, same as every other
 *  modal in the app. */
export default function HashtagPickerModal({ groups, selected, onClose, onSave }: HashtagPickerModalProps) {
  const [query, setQuery] = useState('');
  // Keyed by lowercase (membership is case-insensitive) but valued by the
  // exact tag text to display/save — avoids reconstructing casing from a
  // Set<string> of keys at save time.
  const [localSelected, setLocalSelected] = useState<Map<string, string>>(() => new Map(selected.map(t => [t.toLowerCase(), t])));

  const toggle = (tag: string) => {
    const key = tag.toLowerCase();
    setLocalSelected(prev => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, tag);
      return next;
    });
  };

  const q = query.trim().toLowerCase();
  const visibleGroups = q
    ? groups
        .map(g => ({ ...g, hashtags: g.hashtags.filter(t => t.toLowerCase().includes(q)) }))
        .filter(g => g.hashtags.length > 0)
    : groups;

  // A tag selected on the post that no longer exists in any current group
  // (library was edited/pruned after this post picked it) — surfaced instead
  // of silently vanishing, since it's still part of the post's saved data.
  const groupedLower = new Set(groups.flatMap(g => g.hashtags.map(t => t.toLowerCase())));
  const orphanedSelected = selected.filter(t => !groupedLower.has(t.toLowerCase()));

  const selectedCount = localSelected.size;

  return (
    <Modal
      onClose={onClose}
      title="Seleccionar hashtags"
      icon={Hash}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-ink-secondary">
            {selectedCount} hashtag{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="text-xs font-bold text-ink-secondary hover:text-ink px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onSave(Array.from(localSelected.values()))}
              className="bg-app-accent hover:bg-app-accent-hover text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar hashtag..."
            aria-label="Buscar hashtag"
            className="w-full bg-gray-50 border border-divider rounded-full pl-9 pr-3 py-2.5 text-sm outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all"
          />
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-8">
            Este proyecto todavía no tiene hashtags guardados. Créalos desde el apartado "Hashtags" del menú lateral.
          </p>
        ) : visibleGroups.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-8">Ningún hashtag coincide con "{query}".</p>
        ) : (
          <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
            {visibleGroups.map(group => (
              <div key={group.id}>
                <h4 className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-2">{group.name}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {group.hashtags.map(tag => {
                    const isSelected = localSelected.has(tag.toLowerCase());
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggle(tag)}
                        aria-pressed={isSelected}
                        className={
                          isSelected
                            ? 'inline-flex items-center gap-1 bg-app-accent text-white rounded-full font-bold text-xs py-1.5 px-3 transition-colors'
                            : 'inline-flex items-center gap-1 bg-gray-50 hover:bg-gray-100 border border-divider text-ink-secondary rounded-full font-bold text-xs py-1.5 px-3 transition-colors'
                        }
                      >
                        {isSelected && <Check size={11} />}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {orphanedSelected.length > 0 && !q && (
          <div className="pt-4 border-t border-divider/60">
            <h4 className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">Ya no están en ningún grupo</h4>
            <div className="flex flex-wrap gap-1.5">
              {orphanedSelected.map(tag => {
                const isSelected = localSelected.has(tag.toLowerCase());
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle(tag)}
                    aria-pressed={isSelected}
                    className={
                      isSelected
                        ? 'inline-flex items-center gap-1 bg-app-accent text-white rounded-full font-bold text-xs py-1.5 px-3 transition-colors'
                        : 'inline-flex items-center gap-1 bg-gray-50 hover:bg-gray-100 border border-dashed border-divider text-ink-muted rounded-full font-bold text-xs py-1.5 px-3 transition-colors'
                    }
                  >
                    {isSelected && <Check size={11} />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
