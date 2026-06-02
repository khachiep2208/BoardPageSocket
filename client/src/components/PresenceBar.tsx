import { useBoardStore } from '../store/boardStore';

const COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-fuchsia-500'];

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function PresenceBar() {
  const presence = useBoardStore((s) => s.presence);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500">Đang online:</span>
      <div className="flex -space-x-2">
        {presence.length === 0 && <span className="text-sm text-slate-400">—</span>}
        {presence.map((u, i) => (
          <div
            key={u.id}
            title={u.name}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-white ${
              COLORS[i % COLORS.length]
            }`}
          >
            {initials(u.name)}
          </div>
        ))}
      </div>
    </div>
  );
}
