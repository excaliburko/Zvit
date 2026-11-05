FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json server.mjs ./
COPY dist ./dist
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
