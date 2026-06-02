import { useEffect } from 'react';
import { connectSocket, getSocket } from '../socket/socket';
import { registerSocketHandlers } from '../socket/handlers';
import { useOfflineStore } from '../store/offlineStore';
import { flushQueue } from '../offline/sync';

/**
 * Quản lý vòng đời socket cho 1 board:
 *  - connect + đăng ký listener + join room
 *  - khi connect/reconnect: gửi lại hàng đợi offline → reconcile snapshot mới nhất
 *  - cập nhật trạng thái online cho UI
 *  - cleanup: leave room + gỡ listener
 */
export function useBoardSocket(boardId: string | undefined, onReconcile: () => void) {
  useEffect(() => {
    if (!boardId) return;

    const socket = connectSocket();
    const cleanupHandlers = registerSocketHandlers(socket);
    const setOnline = useOfflineStore.getState().setOnline;

    // (re)connect: vào room → flush hàng đợi offline → reconcile.
    const onConnect = () => {
      setOnline(true);
      socket.emit('board:join', { boardId });
      flushQueue(boardId, socket).finally(() => onReconcile());
    };
    const onDisconnect = () => setOnline(false);

    if (socket.connected) onConnect();
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.emit('board:leave', { boardId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      cleanupHandlers();
    };
  }, [boardId, onReconcile]);

  return getSocket();
}
