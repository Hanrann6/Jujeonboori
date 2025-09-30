# Node.js 경량 이미지 사용
FROM node:22-alpine

# 컨테이너 안의 작업 디렉토리
WORKDIR /app

# 패키지 관련 파일 복사 후 설치
COPY package*.json ./
RUN npm install --production

# 전체 소스 복사
COPY . .

# 앱이 실행할 포트 (server.js 안에서 3000 쓴다고 가정)
EXPOSE 3000

# 서버 실행
CMD ["node", "server.js"]
