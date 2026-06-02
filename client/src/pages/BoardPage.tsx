import { useCallback, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBoard } from '../api/boards';
import { useBoardStore } from '../store/boardStore';
import { useBoardSocket } from '../hooks/useBoardSocket';
import { useAuth } from '../hooks/useAuth';
import { Board } from '../components/Board';
import { PresenceBar } from '../components/PresenceBar';
import { OfflineBanner } from '../components/OfflineBanner';

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const setBoard = useBoardStore((s) => s.setBoard);
  const reset = useBoardStore((s) => s.reset);
  const title = useBoardStore((s) => s.title);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['board', id],
    queryFn: () => fetchBoard(id!),
    enabled: !!id,
  });

  // Nạp snapshot REST vào store khi có dữ liệu / refetch (reconcile).
  useEffect(() => {
    if (data) setBoard(data);
  }, [data, setBoard]);

  useEffect(() => () => reset(), [reset]);

  // Reconcile khi reconnect: refetch snapshot mới nhất.
  const onReconcile = useCallback(() => {
    refetch();
  }, [refetch]);

  useBoardSocket(id, onReconcile);

  if (isLoading) return <div className="p-6 text-slate-400">Đang tải board…</div>;
  if (isError)
    return (
      <div className="p-6">
        <p className="text-red-500">Không tải được board.</p>
        <Link to="/" className="text-indigo-600 hover:underline">
          ← Về trang chủ
        </Link>
      </div>
    );

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-indigo-600 hover:underline">
            ← Boards
          </Link>
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
        </div>
        <div className="flex items-center gap-6">
          <PresenceBar />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{user?.name}</span>
            <button onClick={logout} className="text-indigo-600 hover:underline">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {id && <OfflineBanner boardId={id} />}

      <div className="min-h-0 flex-1">{id && <Board boardId={id} />}</div>
    </div>
  );
}
