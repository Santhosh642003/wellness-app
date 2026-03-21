FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install --frozen-lockfile

COPY . .

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health',r=>{if(r.statusCode!==200)process.exit(1)}).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]
