import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

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
// Wraps better-sqlite3 to mimic the D1 .prepare().bind().all/first/run pattern

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

// ===== Initialize schema & seed =====
export function initializeDatabase() {
  const migrationPath = path.join(process.cwd(), 'migrations', '0001_initial_schema.sql')
  const seedPath = path.join(process.cwd(), 'seed.sql')

  // Check if tables exist
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='industry'").get()
  
  if (!tableCheck) {
    console.log('🗄️  Initializing database schema...')
    if (fs.existsSync(migrationPath)) {
      const migration = fs.readFileSync(migrationPath, 'utf-8')
      db.exec(migration)
      console.log('✅ Schema created')
    }

    if (fs.existsSync(seedPath)) {
      const seed = fs.readFileSync(seedPath, 'utf-8')
      db.exec(seed)
      console.log('✅ Seed data loaded')
    }
  } else {
    console.log('🗄️  Database already initialized')
  }
}
