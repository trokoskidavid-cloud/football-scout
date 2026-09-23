# ---------- 1) build the React SPA ----------
FROM node:20-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ---------- 2) production image: Express API + static files ----------
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev
COPY server/ ./server/
COPY mockups/ ./mockups/
COPY --from=client /app/client/dist ./client/dist
EXPOSE 3000
CMD ["node", "server/server.js"]
