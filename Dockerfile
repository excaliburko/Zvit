FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json server.mjs auth.mjs fuel-seed.json ./
COPY dist ./dist
ENV DATA_DIR=/data
EXPOSE 8080
CMD ["node", "server.mjs"]
