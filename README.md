# NOVA PoC Catalog

산업별 AI 서비스 배포 매트릭스 — 9개 산업군 × 밸류체인별 PoC 카탈로그

## Tech Stack
- **Backend**: Hono (Node.js) + better-sqlite3
- **Frontend**: Tailwind CSS + Vanilla JS (CDN)
- **Build**: esbuild
- **Deploy**: Railway (Docker) / 로컬 Node.js

## Quick Start (Local)
```bash
npm install
npm run build
npm start
# → http://localhost:3000
```

## Railway Deployment
1. GitHub 리포지토리에 push
2. Railway에서 "New Project → Deploy from GitHub repo" 선택
3. 환경변수 설정:
   - `PORT`: 3000 (자동 설정됨)
   - `DB_PATH`: /app/data/nova.db (Dockerfile 기본값)
4. ⚠️ 영속적 DB를 위해 Railway Volume 마운트 권장: `/app/data`

## Features
- 카드 조감도: 9개 산업 카드, PoC 상태 도트, 진행률 바
- 전체 매트릭스: X축(9개 산업) × Y축(개별 밸류체인), 히트맵 색상
- 셀 드릴다운: PoC 카드 상세 (상태, 기술스택, 링크)
- 서비스 등록: 기존 PoC 배포 / 새 PoC 등록 (링크 or ZIP)
- 배포 이력: 등록/배포/삭제 로그

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/industries | 산업군 목록 |
| GET | /api/industries/:code/value-chains | 밸류체인 목록 |
| GET | /api/matrix/summary | 매트릭스 요약 |
| GET | /api/matrix/:code | 산업별 매트릭스 |
| GET | /api/pocs | PoC 전체 목록 |
| POST | /api/pocs/upload | PoC 등록 (링크/ZIP) |
| POST | /api/matrix/deploy | PoC 배포 |
| DELETE | /api/matrix/deploy/:id | 배포 제거 |
| PATCH | /api/matrix/deploy/:id | 배포 상태 변경 |
| GET | /api/deployments | 배포 이력 |

## Project Structure
```
webapp/
├── src/
│   ├── index.tsx       # Hono 앱 (API + 프론트엔드)
│   ├── server.ts       # Node.js 서버 엔트리
│   └── db.ts           # better-sqlite3 DB 래퍼
├── migrations/
│   └── 0001_initial_schema.sql
├── seed.sql            # 시드 데이터 (9산업, 54밸류체인, 14 PoC)
├── build.mjs           # esbuild 빌드 스크립트
├── Dockerfile          # Railway 배포용
├── railway.json        # Railway 설정
├── ecosystem.config.cjs # PM2 설정
└── package.json
```
