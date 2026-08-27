import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, RemoveFormatting, Check, X as XIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { sanitizeHtml, toEditableHtml } from '../lib/richText';

interface RichTextFieldProps {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  /** Fired on blur with the latest value — every caller today autosaves
   *  on blur (`onBlur={handleUpdate}` on the old textareas), so this mirrors
   *  that contract instead of introducing a different save trigger. */
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Applied to the contentEditable itself (not the outer toolbar+border
   *  wrapper) — the old textareas set their height directly on the field
   *  (h-40/h-24/h-64), and that has to land on the editable area, not
   *  around the toolbar too. */
  editorClassName?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

type FormatCommand = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList';

const TOOLBAR_BUTTONS: { command: FormatCommand; icon: typeof Bold; label: string }[] = [
  { command: 'bold', icon: Bold, label: 'Negrita' },
  { command: 'italic', icon: Italic, label: 'Cursiva' },
  { command: 'underline', icon: Underline, label: 'Subrayado' },
  { command: 'insertUnorderedList', icon: List, label: 'Lista' },
  { command: 'insertOrderedList', icon: ListOrdered, label: 'Lista numerada' },
];

/** Lightweight rich text editor for the copy fields (La Idea, Producción) —
 *  a contentEditable div with a small formatting toolbar and a paste handler
 *  that preserves (sanitized) formatting from the clipboard instead of
 *  dumping a wall of Google-Docs-flavored inline styles. Deliberately not a
 *  full editor library: the supported format set is exactly what an
 *  Instagram/LinkedIn/TikTok caption can preserve (bold/italic/underline,
 *  links, lists) — see lib/richText.ts for why storage stays a plain string
 *  that's either legacy plain text or sanitized HTML. */
export default function RichTextField({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  placeholder,
  className,
  editorClassName,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: RichTextFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeCommands, setActiveCommands] = useState<Set<string>>(new Set());
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const savedSelectionRef = useRef<Range | null>(null);

  // Force execCommand to emit semantic tags (<b>/<i>/<u>) instead of the
  // <span style="..."> some browsers default to — without this, sanitizeHtml
  // would strip the very formatting the toolbar just applied, since inline
  // styles aren't in the allowlist.
  useEffect(() => {
    try { document.execCommand('styleWithCSS', false, 'false'); } catch { /* no-op: unsupported in some browsers, safe to ignore */ }
  }, []);

  // Only re-sync innerHTML from `value` when the editor isn't the source of
  // the change (e.g. switching between posts) — syncing on every keystroke
  // would fight the caret position out from under the user as they type.
  const lastEmittedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!editorRef.current) return;
    if (value === lastEmittedRef.current) return;
    editorRef.current.innerHTML = toEditableHtml(value);
    lastEmittedRef.current = null;
  }, [value]);

  const emitChange = () => {
    if (!editorRef.current) return;
    const html = sanitizeHtml(editorRef.current.innerHTML);
    lastEmittedRef.current = html;
    onChange(html);
  };

  const refreshActiveCommands = () => {
    const next = new Set<string>();
    for (const { command } of TOOLBAR_BUTTONS) {
      try { if (document.queryCommandState(command)) next.add(command); } catch { /* ignore */ }
    }
    setActiveCommands(next);
  };

  const runCommand = (command: FormatCommand) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command);
    emitChange();
    refreshActiveCommands();
  };

  const openLinkPopover = () => {
    if (disabled) return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
    // Pre-fill with the href of a link the selection is already inside, so
    // reopening the popover on existing link text edits it instead of
    // starting blank.
    const anchor = selection?.anchorNode;
    const parentLink = anchor instanceof HTMLElement ? anchor.closest('a') : anchor?.parentElement?.closest('a');
    setLinkValue(parentLink?.getAttribute('href') || '');
    setLinkPopoverOpen(true);
  };

  const applyLink = () => {
    const url = linkValue.trim();
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (savedSelectionRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedSelectionRef.current);
    }
    if (url) {
      const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      document.execCommand('createLink', false, normalized);
    } else {
      document.execCommand('unlink');
    }
    emitChange();
    setLinkPopoverOpen(false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const html = e.clipboardData.getData('text/html');
    if (!html) return; // No HTML on the clipboard — let the browser's default plain-text paste happen.
    e.preventDefault();
    document.execCommand('insertHTML', false, sanitizeHtml(html));
    emitChange();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const key = e.key.toLowerCase();
    if (key === 'b') { e.preventDefault(); runCommand('bold'); }
    else if (key === 'i') { e.preventDefault(); runCommand('italic'); }
    else if (key === 'u') { e.preventDefault(); runCommand('underline'); }
  };

  return (
    <div className={cn('border border-divider rounded-md bg-gray-50 focus-within:ring-2 focus-within:ring-app-accent/20 focus-within:border-app-accent transition-all overflow-hidden', className)}>
      {!disabled && (
        <div className="flex items-center gap-0.5 border-b border-divider bg-white px-1.5 py-1 flex-wrap">
          {TOOLBAR_BUTTONS.map(({ command, icon: Icon, label }) => (
            <button
              key={command}
              type="button"
              // Mousedown (not click) + preventDefault keeps focus/selection
              // in the editor — a click would blur it first, collapsing the
              // selection execCommand needs to act on.
              onMouseDown={(e) => { e.preventDefault(); runCommand(command); }}
              aria-label={label}
              aria-pressed={activeCommands.has(command)}
              title={label}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-md transition-colors',
                activeCommands.has(command) ? 'bg-app-accent/15 text-app-accent' : 'text-ink-secondary hover:bg-gray-100'
              )}
            >
              <Icon size={14} />
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); openLinkPopover(); }}
            aria-label="Insertar enlace"
            title="Insertar enlace"
            className="w-7 h-7 flex items-center justify-center rounded-md text-ink-secondary hover:bg-gray-100 transition-colors"
          >
            <LinkIcon size={14} />
          </button>
          <div className="w-px h-4 bg-divider mx-1" />
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editorRef.current?.focus(); document.execCommand('removeFormat'); document.execCommand('unlink'); emitChange(); }}
            aria-label="Limpiar formato"
            title="Limpiar formato"
            className="w-7 h-7 flex items-center justify-center rounded-md text-ink-secondary hover:bg-gray-100 transition-colors"
          >
            <RemoveFormatting size={14} />
          </button>

          {linkPopoverOpen && (
            <div className="flex items-center gap-1 ml-1">
              <input
                autoFocus
                type="url"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                  if (e.key === 'Escape') { e.preventDefault(); setLinkPopoverOpen(false); }
                }}
                placeholder="https://..."
                className="text-xs border border-divider rounded px-2 py-1 w-40 outline-none focus:border-app-accent"
              />
              <button type="button" onMouseDown={(e) => { e.preventDefault(); applyLink(); }} aria-label="Aplicar enlace" className="w-6 h-6 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-50">
                <Check size={14} />
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); setLinkPopoverOpen(false); }} aria-label="Cancelar" className="w-6 h-6 flex items-center justify-center rounded text-ink-muted hover:bg-gray-100">
                <XIcon size={14} />
              </button>
            </div>
          )}
        </div>
      )}
      <div
        ref={editorRef}
        id={id}
        role="textbox"
        aria-multiline="true"
        aria-describedby={describedBy}
        aria-invalid={invalid}
        aria-placeholder={placeholder}
        data-placeholder={placeholder}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={() => { emitChange(); onBlur?.(); }}
        onPaste={handlePaste}
        onKeyUp={refreshActiveCommands}
        onMouseUp={refreshActiveCommands}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full p-4 text-ink text-sm outline-none overflow-y-auto [&_a]:text-app-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
          'empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400',
          disabled && 'cursor-not-allowed opacity-70',
          editorClassName
        )}
      />
    </div>
  );
}
