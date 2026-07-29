interface ConfirmInlineProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: 'danger' | 'success';
  size?: 'sm' | 'md';
}

const TONE_CLASSES = {
  danger: { wrap: 'bg-red-50 border-red-200', text: 'text-red-700', confirm: 'bg-red-600 hover:bg-red-700' },
  success: { wrap: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', confirm: 'bg-emerald-600 hover:bg-emerald-700' }
};

/** Single reusable inline "are you sure?" chip, used for same-severity confirm/cancel actions across the app. */
export default function ConfirmInline({
  message,
  confirmLabel = 'Sí, eliminar',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
  tone = 'danger',
  size = 'md'
}: ConfirmInlineProps) {
  const t = TONE_CLASSES[tone];
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-[11px]';
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-2.5 py-1';

  return (
    <div className={`flex items-center gap-1.5 border rounded-xl p-1 animate-fade-in ${t.wrap}`}>
      <span className={`${textSize} px-1.5 font-bold ${t.text}`}>{message}</span>
      <button
        type="button"
        onClick={onConfirm}
        className={`text-white font-bold ${textSize} ${padding} rounded-lg transition-all shadow-sm ${t.confirm}`}
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className={`bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold ${textSize} ${padding} rounded-lg transition-all shadow-sm`}
      >
        {cancelLabel}
      </button>
    </div>
  );
}
