FROM node:20-alpine
# ffmpeg: audio extraction for transcribe route (strips video, compresses to mp3)
RUN apk add --no-cache ffmpeg
WORKDIR /app

COPY package.json ./
RUN npm install --frozen-lockfile

COPY . .

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3001)+'/health',r=>{if(r.statusCode!==200)process.exit(1)}).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]
