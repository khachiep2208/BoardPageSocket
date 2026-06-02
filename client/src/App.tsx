import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { bootstrapSession } from './api/auth';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { BoardPage } from './pages/BoardPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuthStore((s) => s.accessToken);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [ready, setReady] = useState(false);

  // Bootstrap phiên từ refresh cookie khi load app.
  useEffect(() => {
    bootstrapSession().then((res) => {
      if (res) setAuth(res.accessToken, res.user);
      setReady(true);
    });
  }, [setAuth]);

  if (!ready) {
    return <div className="flex min-h-full items-center justify-center text-slate-400">Đang tải…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/board/:id"
        element={
          <RequireAuth>
            <BoardPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
