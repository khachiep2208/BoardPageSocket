# Backend: Express + Socket.IO + Prisma/SQLite
FROM node:20-alpine
WORKDIR /app

# Cài deps (gồm devDeps: cần typescript + prisma CLI để build & migrate)
COPY package*.json ./
RUN npm install

# Prisma client + biên dịch TS
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# NODE_ENV đặt SAU npm install để không bỏ qua devDeps lúc cài.
ENV NODE_ENV=production
# SQLite file — mount volume vào /app/data để giữ dữ liệu qua các lần restart.
ENV DATABASE_URL="file:/app/data/prod.db"
EXPOSE 4000

# Apply migration rồi start server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
