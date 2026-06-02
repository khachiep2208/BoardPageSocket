import { api } from './axios';
import type { Board } from '../types/events';

export interface BoardSummary {
  id: string;
  title: string;
  ownerId: string;
}

export async function fetchBoards(): Promise<BoardSummary[]> {
  const res = await api.get('/boards');
  return res.data.boards;
}

export async function fetchBoard(id: string): Promise<Board> {
  const res = await api.get(`/boards/${id}`);
  return res.data.board;
}

export async function createBoard(title: string): Promise<Board> {
  const res = await api.post('/boards', { title });
  return res.data.board;
}
