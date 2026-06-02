import type { AppSocket } from '../socket/socket';
import type { AckResult, Card } from '../types/events';
import type { QueuedAction } from '../types/offline';
import { useBoardStore } from '../store/boardStore';
import { useOfflineStore } from '../store/offlineStore';

// Promisify một emit có ack. Timeout để không treo flush nếu server không trả lời.
function emitAck(
  socket: AppSocket,
  boardId: string,
  action: QueuedAction
): Promise<AckResult<{ card?: Card; cardId?: string; tempId?: string }>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('ack_timeout')), 8000);
    const done = (res: AckResult<any>) => {
      clearTimeout(timeout);
      resolve(res);
    };
    switch (action.kind) {
      case 'create':
        socket.emit('card:create', { boardId, columnId: action.columnId, title: action.title, tempId: action.tempId }, done);
        break;
      case 'update':
        socket.emit('card:update', { boardId, cardId: action.cardId, patch: action.patch, version: action.version }, done);
        break;
      case 'move':
        socket.emit('card:move', { boardId, cardId: action.cardId, toColumnId: action.toColumnId, newPosition: action.newPosition, version: action.version }, done);
        break;
      case 'delete':
        socket.emit('card:delete', { boardId, cardId: action.cardId }, done);
        break;
      case 'rename':
        socket.emit('column:rename', { boardId, columnId: action.columnId, title: action.title }, done);
        break;
    }
  });
}

// Áp tempId→realId và version mới nhất cho action trước khi gửi.
// Xử lý chuỗi offline kiểu: tạo card (tempId) → move/update/delete chính card đó.
function remap(
  action: QueuedAction,
  idMap: Map<string, string>,
  verMap: Map<string, number>
): QueuedAction {
  const realId = (id: string) => idMap.get(id) ?? id;
  switch (action.kind) {
    case 'update': {
      const cardId = realId(action.cardId);
      return { ...action, cardId, version: verMap.get(cardId) ?? action.version };
    }
    case 'move': {
      const cardId = realId(action.cardId);
      return { ...action, cardId, version: verMap.get(cardId) ?? action.version };
    }
    case 'delete':
      return { ...action, cardId: realId(action.cardId) };
    default:
      return action;
  }
}

/**
 * Gửi lại toàn bộ action đã xếp hàng cho 1 board, theo đúng thứ tự.
 * - create thành công → ghi nhớ tempId→realId + version để remap action sau.
 * - thất bại tạm thời (timeout) → dừng, giữ phần còn lại để thử lần sau.
 */
export async function flushQueue(boardId: string, socket: AppSocket): Promise<void> {
  const offline = useOfflineStore.getState();
  const board = useBoardStore.getState();

  const idMap = new Map<string, string>();
  const verMap = new Map<string, number>();

  let queue = [...(offline.queues[boardId] ?? [])];
  while (queue.length > 0) {
    const action = remap(queue[0], idMap, verMap);
    try {
      const res = await emitAck(socket, boardId, action);
      if (res.ok) {
        if (action.kind === 'create' && res.data.card && res.data.tempId) {
          idMap.set(res.data.tempId, res.data.card.id);
          verMap.set(res.data.card.id, res.data.card.version);
          board.replaceTempCard(res.data.tempId, res.data.card);
        } else if (res.data.card) {
          verMap.set(res.data.card.id, res.data.card.version);
          board.upsertCard(res.data.card);
        }
      } else if (res.conflict) {
        // Server thắng — ghi đè bằng bản đúng, action coi như đã xử lý.
        verMap.set(res.conflict.serverCard.id, res.conflict.serverCard.version);
        board.upsertCard(res.conflict.serverCard);
      }
      // ok hoặc conflict đều coi là đã xử lý → bỏ khỏi queue.
    } catch {
      // Lỗi tạm thời (timeout/mất kết nối lại) → dừng, để lần reconnect sau thử tiếp.
      break;
    }
    queue = queue.slice(1);
    useOfflineStore.getState().setQueue(boardId, queue);
  }

  if (queue.length === 0) useOfflineStore.getState().clearQueue(boardId);
}
