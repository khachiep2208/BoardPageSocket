import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBoard, fetchBoards } from '../api/boards';
import { useAuth } from '../hooks/useAuth';

export function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [title, setTitle] = useState('');

  const { data: boards, isLoading } = useQuery({ queryKey: ['boards'], queryFn: fetchBoards });

  const create = useMutation({
    mutationFn: (t: string) => createBoard(t),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      navigate(`/board/${board.id}`);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (t) create.mutate(t);
  };

  return (
    <div className="min-h-full bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <h1 className="text-lg font-bold text-slate-800">Realtime Kanban</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">{user?.name}</span>
          <button onClick={logout} className="text-indigo-600 hover:underline">
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-6">
        <form onSubmit={submit} className="mb-6 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tên board mới…"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Tạo board
          </button>
        </form>

        {isLoading ? (
          <p className="text-slate-400">Đang tải…</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {boards?.map((b) => (
              <li key={b.id}>
                <Link
                  to={`/board/${b.id}`}
                  className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-indigo-300"
                >
                  <span className="font-medium text-slate-800">{b.title}</span>
                </Link>
              </li>
            ))}
            {boards?.length === 0 && <p className="text-slate-400">Chưa có board nào.</p>}
          </ul>
        )}
      </main>
    </div>
  );
}
