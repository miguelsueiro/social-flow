import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface TagListEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  size?: 'sm' | 'md';
}

/** Freeform list of short text tags (e.g. per-project territories/themes) — not a fixed enum like platforms, so it's an add/remove text editor rather than a toggle group. */
export default function TagListEditor({ tags, onChange, placeholder = 'Añadir...', size = 'md' }: TagListEditorProps) {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const value = draft.trim();
    if (!value) return;
    if (tags.some(t => t.toLowerCase() === value.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...tags, value]);
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const chipSize = size === 'sm' ? 'text-[10px] py-0.5 px-2' : 'text-xs py-1 px-2.5';
  const inputSize = size === 'sm' ? 'text-[11px] py-1 px-2' : 'text-xs py-1.5 px-3';

  return (
    <div className="space-y-1.5">
      {tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {tags.map(tag => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-full font-bold text-slate-600 ${chipSize}`}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Quitar ${tag}`}
                className="text-slate-400 hover:text-red-600 transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`flex-1 bg-white border border-gray-200 rounded-lg outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all ${inputSize}`}
        />
        <button
          type="button"
          onClick={addTag}
          aria-label="Añadir"
          className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg px-2 flex items-center justify-center transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
