import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import boardRoutes from './routes/boards';
import { attachSocket } from './socket';

const PORT = Number(process.env.PORT || 4000);
// CLIENT_ORIGIN có thể là danh sách phân tách bằng dấu phẩy (vd nhiều domain Vercel).
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const allowedOrigins = CLIENT_ORIGIN.split(',').map((s) => s.trim());

const corsOptions = {
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/auth', authRoutes);
app.use('/boards', boardRoutes);

const server = http.createServer(app);
attachSocket(server, corsOptions.origin);

server.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
  console.log(`   CORS origin: ${CLIENT_ORIGIN}`);
});
