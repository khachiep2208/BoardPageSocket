import jwt, { SignOptions } from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';
const ACCESS_TTL = (process.env.ACCESS_TOKEN_TTL || '15m') as SignOptions['expiresIn'];
const REFRESH_TTL = (process.env.REFRESH_TOKEN_TTL || '7d') as SignOptions['expiresIn'];

export interface JwtUser {
  id: string;
  name: string;
  email: string;
}

export function signAccessToken(user: JwtUser): string {
  return jwt.sign(user, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(user: JwtUser): string {
  return jwt.sign(user, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): JwtUser {
  const decoded = jwt.verify(token, ACCESS_SECRET) as jwt.JwtPayload;
  return { id: decoded.id, name: decoded.name, email: decoded.email };
}

export function verifyRefreshToken(token: string): JwtUser {
  const decoded = jwt.verify(token, REFRESH_SECRET) as jwt.JwtPayload;
  return { id: decoded.id, name: decoded.name, email: decoded.email };
}
