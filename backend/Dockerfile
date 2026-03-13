FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install --frozen-lockfile

COPY . .

EXPOSE 3001

CMD ["node", "src/server.js"]
