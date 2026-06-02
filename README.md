# Realtime Kanban Board

Bảng công việc cộng tác real-time — nhiều người cùng kéo-thả thẻ, đồng bộ tức thì qua Socket.IO.

🔗 **Live demo:** _(điền link sau khi deploy)_ — tài khoản thử: `demo@demo.com` / `demo1234`
📺 **Demo GIF:** _(chèn ảnh/GIF kéo-thả đồng bộ giữa 2 cửa sổ ở đây)_

## Tính năng

- Real-time sync kéo-thả, tạo/sửa/xóa thẻ giữa nhiều người dùng (Socket.IO, room theo board).
- Optimistic UI + rollback khi server từ chối.
- Conflict resolution bằng `version` number (server là nguồn chân lý).
- Auth JWT + refresh token (httpOnly cookie), axios interceptor tự retry request 401.
- Presence: hiển thị người đang online trong board.
- Reconcile state khi reconnect (refetch snapshot mới nhất).
- **Offline queue**: mất mạng vẫn thao tác được — action xếp hàng (persist localStorage), tự gửi lại theo thứ tự khi online (kèm remap tempId→id thật & version).

## Tech stack

React 18 · TypeScript · Vite · Tailwind · Zustand · React Query · @dnd-kit · Socket.IO
Backend: Node · Express · Prisma · SQLite · JWT

## Kiến trúc

```
┌─────────────┐     REST (axios)      ┌──────────────────┐
│   Browser   │  ──login/load board─▶ │  Express server  │
│  React app  │                       │  ┌────────────┐  │
│  Zustand    │  WebSocket (socket.io)│  │ Socket.IO  │  │ ──▶ DB (Prisma/SQLite)
│  store ◀────┤  ──events 2 chiều───▶ │  │  gateway   │  │
└─────────────┘                       └──────────────────┘
      ▲                                        │
      └──── broadcast tới mọi client ──────────┘
            đang trong cùng "room" (board)
```

- **REST** lo dữ liệu nguội: auth, load board ban đầu (tận dụng cache React Query).
- **Socket** lo dữ liệu nóng: mọi thay đổi card/column được broadcast tới room.

## Chạy local

```bash
# 1. Backend
cd server
npm install
cp .env.example .env          # (Windows: copy .env.example .env)
npx prisma migrate dev --name init
npm run seed                  # tạo board mẫu + user demo@demo.com / demo1234
npm run dev                   # http://localhost:4000

# 2. Frontend (terminal khác)
cd client
npm install
cp .env.example .env          # (Windows: copy .env.example .env)
npm run dev                   # http://localhost:5173
```

Mở 2 tab trình duyệt, đăng nhập `demo@demo.com` / `demo1234`, vào cùng board → kéo-thả ở tab này thấy đổi ngay ở tab kia.

## Chạy bằng Docker (tùy chọn)

```bash
docker compose up --build
# Frontend: http://localhost:5173 · Backend: http://localhost:4000
# Tạo tài khoản demo (lần đầu):
docker compose exec api npm run seed
```

## Deploy (Render + Vercel)

> Tách 2 nơi vì Vercel serverless KHÔNG giữ WebSocket lâu dài — backend Socket.IO cần host hỗ trợ WS như Render.

**Backend → Render** (có sẵn [render.yaml](render.yaml)):
1. Push repo lên GitHub.
2. Render → **New → Blueprint** → chọn repo. Render đọc `render.yaml` tự tạo service.
3. Điền env `CLIENT_ORIGIN` = URL frontend Vercel (vd `https://your-app.vercel.app`). `JWT_*` secret được tạo tự động.
4. Deploy. (Tùy chọn) mở **Shell** chạy `npm run seed` để có tài khoản demo.
   - ⚠️ Free tier filesystem ephemeral → SQLite reset khi restart. Cần bền vững: nâng plan + bật khối `disk` trong `render.yaml`.

**Frontend → Vercel** (có sẵn [client/vercel.json](client/vercel.json)):
1. Vercel → **Import Project** → chọn repo, đặt **Root Directory = `client`**.
2. Thêm env `VITE_API_URL` = URL backend Render (vd `https://realtime-kanban-api.onrender.com`).
3. Deploy. Quay lại Render cập nhật `CLIENT_ORIGIN` cho khớp domain Vercel.

> Cookie refresh dùng `SameSite=None; Secure` khi `NODE_ENV=production` để gửi được cross-domain (Vercel ↔ Render, đều https).

## Điểm kỹ thuật đáng chú ý

- Cơ chế gộp request khi nhiều 401 xảy ra đồng thời (chỉ refresh 1 lần, hàng đợi retry).
- `position` kiểu Float để chèn thẻ giữa 2 thẻ mà không cần re-index cả cột.
- Conflict resolution bằng `version`: client gửi version đang giữ, server từ chối nếu lệch và trả về bản đúng.
- Reconcile state khi reconnect để tránh dữ liệu phân kỳ.
- Offline queue persist localStorage; khi reconnect: flush hàng đợi → reconcile, có remap `tempId→id` và `version` cho chuỗi action phụ thuộc (vd tạo rồi move cùng 1 card lúc offline).
- React.memo theo card id + Zustand selector để tránh re-render cả board khi 1 card đổi.

## Cấu trúc thư mục

```
realtime-kanban/
├── client/   # React + Vite + TS
├── server/   # Express + Socket.IO + Prisma
└── README.md
```

Mỗi bên có README/`.env.example` riêng. Event contract Socket.IO định nghĩa trong `*/src/types/events.ts` (đồng bộ 2 bên).
