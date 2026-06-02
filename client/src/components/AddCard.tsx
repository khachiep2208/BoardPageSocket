import { useState } from 'react';

interface Props {
  onAdd: (title: string) => void;
}

export function AddCard({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const submit = () => {
    const t = title.trim();
    if (t) onAdd(t);
    setTitle('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-200/60"
      >
        + Thêm thẻ
      </button>
    );
  }

  return (
    <div className="mt-1">
      <textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={submit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') {
            setTitle('');
            setOpen(false);
          }
        }}
        placeholder="Nội dung thẻ…"
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );
}
