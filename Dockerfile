FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && chown -R node:node /app
COPY --chown=node:node . .
USER node
ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000
CMD ["npm", "start"]
