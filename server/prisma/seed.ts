import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@demo.com';
  const password = await bcrypt.hash('demo1234', 10);

  // User demo (idempotent)
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password, name: 'Demo User' },
  });

  // Nếu đã có board của user thì bỏ qua seed
  const existing = await prisma.board.findFirst({ where: { ownerId: user.id } });
  if (existing) {
    console.log('Seed: board đã tồn tại, bỏ qua. Board id =', existing.id);
    return;
  }

  const board = await prisma.board.create({
    data: {
      title: 'My First Board',
      ownerId: user.id,
      columns: {
        create: [
          {
            title: 'To Do',
            position: 1000,
            cards: {
              create: [
                { title: 'Thiết lập repo & môi trường', position: 1000, description: 'Vite + Express + Prisma' },
                { title: 'Đọc kỹ event contract Socket.IO', position: 2000 },
              ],
            },
          },
          {
            title: 'In Progress',
            position: 2000,
            cards: {
              create: [{ title: 'Cài đặt kéo-thả với @dnd-kit', position: 1000 }],
            },
          },
          {
            title: 'Done',
            position: 3000,
            cards: {
              create: [{ title: 'Khởi tạo project 🎉', position: 1000 }],
            },
          },
        ],
      },
    },
  });

  console.log('Seed xong.');
  console.log('  Tài khoản demo: demo@demo.com / demo1234');
  console.log('  Board id      :', board.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
