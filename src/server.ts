import { serve } from '@hono/node-server'
import app from './index'
import { initializeDatabase } from './db'

// Initialize DB (schema + seed)
initializeDatabase()

const port = parseInt(process.env.PORT || '3000', 10)

console.log(`🚀 NOVA PoC Catalog starting on port ${port}`)

serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`✅ Server running at http://localhost:${info.port}`)
})
