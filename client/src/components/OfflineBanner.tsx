import { useOfflineStore } from '../store/offlineStore';

interface Props {
  boardId: string;
}

export function OfflineBanner({ boardId }: Props) {
  const online = useOfflineStore((s) => s.online);
  const pending = useOfflineStore((s) => s.queues[boardId]?.length ?? 0);

  if (online && pending === 0) return null;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-sm font-medium ${
        online ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'
      }`}
    >
      {online ? (
        <span>🔄 Đang đồng bộ {pending} thay đổi…</span>
      ) : (
        <span>
          ⚠️ Mất kết nối — đang làm việc offline
          {pending > 0 && <> · {pending} thay đổi chờ gửi</>}
        </span>
      )}
    </div>
  );
}
