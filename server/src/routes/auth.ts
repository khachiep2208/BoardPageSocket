import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken, JwtUser } from '../lib/jwt';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const REFRESH_COOKIE = 'refreshToken';
const isProd = process.env.NODE_ENV === 'production';
// Prod: frontend (Vercel) và backend (Render) khác domain → cookie cross-site
// phải dùng SameSite=None + Secure thì trình duyệt mới gửi kèm /auth/refresh.
const cookieOpts = {
  httpOnly: true,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  secure: isProd,
  path: '/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
};

function toJwtUser(u: { id: string; name: string; email: string }): JwtUser {
  return { id: u.id, name: u.name, email: u.email };
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, name là bắt buộc' });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email đã tồn tại' });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hash, name } });

  const payload = toJwtUser(user);
  res.cookie(REFRESH_COOKIE, signRefreshToken(payload), cookieOpts);
  return res.status(201).json({ accessToken: signAccessToken(payload), user: payload });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'email và password là bắt buộc' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
  }

  const payload = toJwtUser(user);
  res.cookie(REFRESH_COOKIE, signRefreshToken(payload), cookieOpts);
  return res.json({ accessToken: signAccessToken(payload), user: payload });
});

// POST /auth/refresh — dùng refresh cookie để lấy access token mới
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ error: 'Không có refresh token' });
  try {
    const payload = verifyRefreshToken(token);
    // Rotation: cấp refresh token mới mỗi lần refresh.
    res.cookie(REFRESH_COOKIE, signRefreshToken(payload), cookieOpts);
    return res.json({ accessToken: signAccessToken(payload), user: payload });
  } catch {
    res.clearCookie(REFRESH_COOKIE, { ...cookieOpts, maxAge: undefined });
    return res.status(401).json({ error: 'Refresh token không hợp lệ' });
  }
});

// POST /auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie(REFRESH_COOKIE, { ...cookieOpts, maxAge: undefined });
  return res.json({ ok: true });
});

// GET /auth/me
router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

export default router;
