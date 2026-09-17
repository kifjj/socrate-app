import { useEffect, useRef } from 'react';

type NotesDrawerProps = {
  open: boolean;
  sourceNotes: string;
  onChange: (val: string) => void;
  onClose: () => void;
};

export function NotesDrawer({ open, sourceNotes, onChange, onClose }: NotesDrawerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      textareaRef.current.selectionEnd = textareaRef.current.value.length;
    }
  }, [open]);

  if (!open) return null;

  return (
    <aside className="notes-drawer" aria-label="Source notes">
      <div className="notes-drawer__header">
        <strong>Notes</strong>
        <button type="button" className="ghost" onClick={onClose} aria-label="Close notes (Esc)">
          Close
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="notes-drawer__textarea"
        placeholder="Paste or type your notes here…"
        value={sourceNotes}
        onChange={(e) => onChange(e.target.value)}
      />
    </aside>
  );
}

