// ===== NOVA Migration System =====
// Alembic 패턴의 TypeScript 구현
// 번호별 SQL 파일을 순서대로 적용, 이미 적용된 버전은 스킵

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

export interface MigrationRecord {
  version: string
  name: string
  applied_at: string
}

export function runMigrations(db: Database.Database, migrationsDir: string) {
  // 1. 마이그레이션 추적 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS _nova_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // 2. 이미 적용된 마이그레이션 조회
  const applied = new Set(
    db.prepare('SELECT version FROM _nova_migrations ORDER BY version').all()
      .map((r: any) => r.version)
  )

  // 3. migrations/ 디렉토리에서 SQL 파일 검색 (번호순 정렬)
  if (!fs.existsSync(migrationsDir)) {
    console.log('⚠️  migrations/ 디렉토리가 없습니다.')
    return
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort() // 0001_xxx.sql, 0002_xxx.sql, ...

  if (files.length === 0) {
    console.log('ℹ️  적용할 마이그레이션이 없습니다.')
    return
  }

  // 4. 미적용 마이그레이션 순서대로 실행
  let appliedCount = 0

  for (const file of files) {
    const version = file.replace('.sql', '')
    
    if (applied.has(version)) {
      continue // 이미 적용됨
    }

    const filePath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(filePath, 'utf-8')
    
    // 체크섬 생성 (간단한 해시)
    const checksum = simpleHash(sql)

    console.log(`📦 Applying migration: ${file}`)
    
    try {
      // 트랜잭션으로 마이그레이션 + 기록을 원자적 실행
      db.transaction(() => {
        db.exec(sql)
        db.prepare(
          'INSERT INTO _nova_migrations (version, name, checksum) VALUES (?, ?, ?)'
        ).run(version, file, checksum)
      })()

      appliedCount++
      console.log(`  ✅ Applied: ${file}`)
    } catch (err: any) {
      console.error(`  ❌ Failed: ${file} — ${err.message}`)
      throw err // 실패 시 중단
    }
  }

  if (appliedCount === 0) {
    console.log('🗄️  모든 마이그레이션이 이미 적용되어 있습니다.')
  } else {
    console.log(`🗄️  ${appliedCount}개 마이그레이션 적용 완료`)
  }
}

export function getMigrationStatus(db: Database.Database): MigrationRecord[] {
  try {
    return db.prepare('SELECT version, name, applied_at FROM _nova_migrations ORDER BY version').all() as MigrationRecord[]
  } catch {
    return []
  }
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(16)
}
