import { AlertCircle } from 'lucide-react';

export function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss?: () => void }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span className="flex items-center gap-2">
        <AlertCircle size={16} /> {message}
      </span>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-500 hover:text-red-800" aria-label="关闭">
          ✕
        </button>
      )}
    </div>
  );
}
