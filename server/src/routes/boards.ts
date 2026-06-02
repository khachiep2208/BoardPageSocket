import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.use(requireAuth);

// GET /boards — danh sách board của user
router.get('/', async (req, res) => {
  const boards = await prisma.board.findMany({
    where: { ownerId: req.user!.id },
    select: { id: true, title: true, ownerId: true },
    orderBy: { title: 'asc' },
  });
  return res.json({ boards });
});

// POST /boards — tạo board mới (kèm 3 cột mặc định)
router.post('/', async (req, res) => {
  const { title } = req.body ?? {};
  if (!title) return res.status(400).json({ error: 'title là bắt buộc' });

  const board = await prisma.board.create({
    data: {
      title,
      ownerId: req.user!.id,
      columns: {
        create: [
          { title: 'To Do', position: 1000 },
          { title: 'In Progress', position: 2000 },
          { title: 'Done', position: 3000 },
        ],
      },
    },
    include: { columns: { include: { cards: true } } },
  });
  return res.status(201).json({ board });
});

// GET /boards/:id — load đầy đủ board (snapshot cho client + reconcile)
router.get('/:id', async (req, res) => {
  const board = await prisma.board.findUnique({
    where: { id: req.params.id },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: { cards: { orderBy: { position: 'asc' } } },
      },
    },
  });
  if (!board) return res.status(404).json({ error: 'Không tìm thấy board' });
  // MVP: chỉ owner xem được. (Mở rộng: bảng membership.)
  if (board.ownerId !== req.user!.id) {
    return res.status(403).json({ error: 'Không có quyền truy cập board này' });
  }
  return res.json({ board });
});

export default router;
