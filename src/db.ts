// ===== NOVA Database Layer =====
// better-sqlite3 기반, D1 호환 인터페이스 + 마이그레이션 시스템

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { runMigrations, getMigrationStatus } from './migrate'

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'nova.db')

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ===== D1-compatible wrapper =====
export const DB = {
  prepare(sql: string) {
    const stmt = db.prepare(sql)
    let boundParams: any[] = []

    return {
      bind(...params: any[]) {
        boundParams = params
        return this
      },
      all() {
        const results = stmt.all(...boundParams)
        return { results }
      },
      first() {
        return stmt.get(...boundParams) || null
      },
      run() {
        const info = stmt.run(...boundParams)
        return { meta: { last_row_id: info.lastInsertRowid, changes: info.changes } }
      }
    }
  },

  exec(sql: string) {
    db.exec(sql)
  }
}

// ===== Initialize: Migrations + Seed =====
export function initializeDatabase() {
  const migrationsDir = path.join(process.cwd(), 'migrations')
  const seedPath = path.join(process.cwd(), 'seed.sql')

  // 마이그레이션 실행 (Alembic 패턴)
  console.log('🗄️  Running migrations...')
  runMigrations(db, migrationsDir)

  // 시드 데이터: industry 테이블이 비어있으면 적용
  const hasData = db.prepare('SELECT COUNT(*) as cnt FROM industry').get() as any
  if (hasData?.cnt === 0 && fs.existsSync(seedPath)) {
    console.log('🌱 Seeding initial data...')
    const seed = fs.readFileSync(seedPath, 'utf-8')
    db.exec(seed)
    console.log('✅ Seed data loaded')
  }

  // 마이그레이션 상태 출력
  const status = getMigrationStatus(db)
  console.log(`📋 Applied migrations: ${status.length}`)
  status.forEach(m => console.log(`   ✓ ${m.version} (${m.applied_at})`))
}
