import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { DB } from './db'

const app = new Hono()

app.use('/api/*', cors())

// ===== API Routes =====

// 산업군 목록 + 각 산업의 PoC 수
app.get('/api/industries', async (c) => {

  const industries = await DB.prepare(`
    SELECT i.*, 
      (SELECT COUNT(DISTINCT pvm.poc_id) FROM poc_value_chain_map pvm WHERE pvm.industry_id = i.id) as poc_count,
      (SELECT COUNT(*) FROM value_chain vc WHERE vc.industry_id = i.id) as vc_count
    FROM industry i WHERE i.is_active = 1 ORDER BY i.order_seq
  `).all()
  return c.json({ success: true, data: industries.results })
})

// 특정 산업의 밸류체인 + 각 체인의 PoC 수
app.get('/api/industries/:code/value-chains', async (c) => {
  const code = c.req.param('code')

  
  const industry = await DB.prepare('SELECT * FROM industry WHERE code = ?').bind(code).first()
  if (!industry) return c.json({ success: false, error: 'Industry not found' }, 404)

  const chains = await DB.prepare(`
    SELECT vc.*,
      (SELECT COUNT(*) FROM poc_value_chain_map pvm WHERE pvm.value_chain_id = vc.id) as poc_count
    FROM value_chain vc 
    WHERE vc.industry_id = ? AND vc.is_active = 1
    ORDER BY vc.order_seq
  `).bind((industry as any).id).all()

  return c.json({ success: true, data: { industry, value_chains: chains.results } })
})

// 전체 매트릭스 요약 (조감도용) — MUST be before :industryCode
app.get('/api/matrix/summary', async (c) => {

  
  const summary = await DB.prepare(`
    SELECT i.id as industry_id, i.code as industry_code, i.name_ko, i.icon, i.color,
           vc.id as vc_id, vc.name as vc_name, vc.order_seq,
           COUNT(pvm.id) as poc_count,
           SUM(CASE WHEN pvm.deploy_status = 'active' THEN 1 ELSE 0 END) as active_count,
           SUM(CASE WHEN pvm.deploy_status = 'testing' THEN 1 ELSE 0 END) as testing_count,
           SUM(CASE WHEN pvm.deploy_status = 'dev' THEN 1 ELSE 0 END) as dev_count,
           SUM(CASE WHEN pvm.deploy_status = 'registered' THEN 1 ELSE 0 END) as registered_count
    FROM industry i
    JOIN value_chain vc ON vc.industry_id = i.id
    LEFT JOIN poc_value_chain_map pvm ON pvm.value_chain_id = vc.id AND pvm.industry_id = i.id
    WHERE i.is_active = 1
    GROUP BY i.id, vc.id
    ORDER BY i.order_seq, vc.order_seq
  `).all()

  return c.json({ success: true, data: summary.results })
})

// 바둑판 매트릭스 데이터 — 특정 산업의 밸류체인별 PoC 전체
app.get('/api/matrix/:industryCode', async (c) => {
  const code = c.req.param('industryCode')


  const industry = await DB.prepare('SELECT * FROM industry WHERE code = ?').bind(code).first()
  if (!industry) return c.json({ success: false, error: 'Industry not found' }, 404)

  const chains = await DB.prepare(`
    SELECT * FROM value_chain WHERE industry_id = ? ORDER BY order_seq
  `).bind((industry as any).id).all()

  const mappings = await DB.prepare(`
    SELECT pvm.*, ap.poc_code, ap.name as poc_name, ap.category, ap.core_value,
           ap.tech_stack, ap.status as poc_status, ap.maturity_level, ap.description as poc_description,
           ap.demo_url, ap.config_schema as links_json,
           vc.name as vc_name, vc.code as vc_code
    FROM poc_value_chain_map pvm
    JOIN agent_poc ap ON pvm.poc_id = ap.id
    JOIN value_chain vc ON pvm.value_chain_id = vc.id
    WHERE pvm.industry_id = ?
    ORDER BY vc.order_seq, ap.poc_code
  `).bind((industry as any).id).all()

  // 밸류체인별로 그룹핑
  const matrix: Record<string, any> = {}
  for (const chain of chains.results as any[]) {
    matrix[chain.id] = {
      ...chain,
      pocs: (mappings.results as any[]).filter(m => m.value_chain_id === chain.id)
    }
  }

  return c.json({ success: true, data: { industry, matrix } })
})

// 전체 PoC 목록
app.get('/api/pocs', async (c) => {

  const pocs = await DB.prepare('SELECT * FROM agent_poc WHERE is_active = 1 ORDER BY poc_code').all()
  return c.json({ success: true, data: pocs.results })
})

// PoC 상세
app.get('/api/pocs/:code', async (c) => {
  const code = c.req.param('code')


  const poc = await DB.prepare('SELECT * FROM agent_poc WHERE poc_code = ?').bind(code).first()
  if (!poc) return c.json({ success: false, error: 'POC not found' }, 404)

  const steps = await DB.prepare('SELECT * FROM agent_step WHERE poc_id = ? ORDER BY step_seq').bind((poc as any).id).all()
  
  const industries = await DB.prepare(`
    SELECT i.*, pim.relevance 
    FROM poc_industry_map pim JOIN industry i ON pim.industry_id = i.id 
    WHERE pim.poc_id = ? ORDER BY pim.relevance DESC
  `).bind((poc as any).id).all()

  const deployments = await DB.prepare(`
    SELECT pvm.*, vc.name as vc_name, i.name_ko as industry_name, i.code as industry_code
    FROM poc_value_chain_map pvm
    JOIN value_chain vc ON pvm.value_chain_id = vc.id
    JOIN industry i ON pvm.industry_id = i.id
    WHERE pvm.poc_id = ?
  `).bind((poc as any).id).all()

  return c.json({ 
    success: true, 
    data: { ...poc, steps: steps.results, industries: industries.results, deployments: deployments.results }
  })
})

// 셀에 PoC 배포 (바둑판 칸에 서비스 등록)
app.post('/api/matrix/deploy', async (c) => {

  const body = await c.req.json()
  const { poc_id, industry_id, value_chain_id, deploy_status, deploy_note } = body

  const id = `map-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  
  try {
    await DB.prepare(`
      INSERT INTO poc_value_chain_map (id, poc_id, industry_id, value_chain_id, deploy_status, deploy_note)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, poc_id, industry_id, value_chain_id, deploy_status || 'registered', deploy_note || '').run()

    // 배포 로그 기록
    const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await DB.prepare(`
      INSERT INTO deployment_log (id, poc_id, industry_id, value_chain_id, action, user_note)
      VALUES (?, ?, ?, ?, 'deploy', ?)
    `).bind(logId, poc_id, industry_id, value_chain_id, deploy_note || '').run()

    return c.json({ success: true, data: { id } })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return c.json({ success: false, error: '이미 해당 셀에 등록된 PoC입니다.' }, 409)
    }
    throw e
  }
})

// 셀에서 PoC 제거
app.delete('/api/matrix/deploy/:id', async (c) => {

  const id = c.req.param('id')

  const existing = await DB.prepare('SELECT * FROM poc_value_chain_map WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ success: false, error: 'Not found' }, 404)

  await DB.prepare('DELETE FROM poc_value_chain_map WHERE id = ?').bind(id).run()

  const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  await DB.prepare(`
    INSERT INTO deployment_log (id, poc_id, industry_id, value_chain_id, action, user_note)
    VALUES (?, ?, ?, ?, 'undeploy', 'Removed from matrix')
  `).bind(logId, (existing as any).poc_id, (existing as any).industry_id, (existing as any).value_chain_id).run()

  return c.json({ success: true })
})

// 배포 상태 업데이트
app.patch('/api/matrix/deploy/:id', async (c) => {

  const id = c.req.param('id')
  const { deploy_status, deploy_note } = await c.req.json()

  await DB.prepare(`
    UPDATE poc_value_chain_map SET deploy_status = ?, deploy_note = ?, deployed_at = datetime('now') WHERE id = ?
  `).bind(deploy_status, deploy_note || '', id).run()

  return c.json({ success: true })
})

// ZIP 업로드 또는 링크로 새 PoC 등록
app.post('/api/pocs/upload', async (c) => {

  const contentType = c.req.header('content-type') || ''
  
  let name: string, category: string, description: string, core_value: string
  let tech_stack: string, industry_ids: string, value_chain_ids: string
  let deploy_status: string, demo_url: string, repo_url: string, doc_url: string
  let file: File | null = null

  if (contentType.includes('application/json')) {
    // JSON body (링크 등록)
    const body = await c.req.json()
    name = body.name
    category = body.category
    description = body.description || ''
    core_value = body.core_value || ''
    tech_stack = body.tech_stack || ''
    industry_ids = body.industry_ids || ''
    value_chain_ids = body.value_chain_ids || ''
    deploy_status = body.deploy_status || 'registered'
    demo_url = body.demo_url || ''
    repo_url = body.repo_url || ''
    doc_url = body.doc_url || ''
  } else {
    // FormData (ZIP 업로드)
    const formData = await c.req.formData()
    file = formData.get('file') as File | null
    name = formData.get('name') as string
    category = formData.get('category') as string
    description = (formData.get('description') as string) || ''
    core_value = (formData.get('core_value') as string) || ''
    tech_stack = (formData.get('tech_stack') as string) || ''
    industry_ids = (formData.get('industry_ids') as string) || ''
    value_chain_ids = (formData.get('value_chain_ids') as string) || ''
    deploy_status = (formData.get('deploy_status') as string) || 'registered'
    demo_url = (formData.get('demo_url') as string) || ''
    repo_url = (formData.get('repo_url') as string) || ''
    doc_url = (formData.get('doc_url') as string) || ''
  }

  if (!name || !category) {
    return c.json({ success: false, error: 'name과 category는 필수입니다.' }, 400)
  }

  // Generate poc_code
  const countResult = await DB.prepare('SELECT COUNT(*) as cnt FROM agent_poc').first() as any
  const nextNum = (countResult?.cnt || 14) + 1
  const pocCode = `POC-${String(nextNum).padStart(3, '0')}`
  const pocId = `poc-${String(nextNum).padStart(3, '0')}`

  const techStackJson = tech_stack 
    ? JSON.stringify(tech_stack.split(',').map((s: string) => s.trim()))
    : '[]'

  // 링크 정보를 config_schema에 저장
  const linksJson = JSON.stringify({ demo_url, repo_url, doc_url })

  // Insert PoC
  await DB.prepare(`
    INSERT INTO agent_poc (id, poc_code, name, category, description, core_value, tech_stack, status, maturity_level, demo_url, config_schema, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 1)
  `).bind(pocId, pocCode, name, category, description, core_value, techStackJson, deploy_status, demo_url, linksJson).run()

  // Insert industry mappings
  if (industry_ids) {
    const ids = industry_ids.split(',').map(s => s.trim())
    for (const indId of ids) {
      await DB.prepare(`
        INSERT OR IGNORE INTO poc_industry_map (poc_id, industry_id, relevance) VALUES (?, ?, 3)
      `).bind(pocId, indId).run()
    }
  }

  // Insert value chain mappings (deploy to matrix cells)
  if (value_chain_ids && industry_ids) {
    const vcIds = value_chain_ids.split(',').map(s => s.trim())
    const indIds = industry_ids.split(',').map(s => s.trim())
    for (const indId of indIds) {
      for (const vcId of vcIds) {
        const vc = await DB.prepare('SELECT id FROM value_chain WHERE id = ? AND industry_id = ?').bind(vcId, indId).first()
        if (vc) {
          const mapId = `map-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          await DB.prepare(`
            INSERT OR IGNORE INTO poc_value_chain_map (id, poc_id, industry_id, value_chain_id, deploy_status)
            VALUES (?, ?, ?, ?, ?)
          `).bind(mapId, pocId, indId, vcId, deploy_status).run()
        }
      }
    }
  }

  // Log
  let fileInfo = null
  const logAction = file ? 'upload' : (demo_url || repo_url || doc_url) ? 'link' : 'register'
  if (file) {
    fileInfo = { name: file.name, size: file.size, type: file.type }
  }
  const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const logMeta = JSON.stringify({ file: fileInfo, demo_url, repo_url, doc_url })
  await DB.prepare(`
    INSERT INTO deployment_log (id, poc_id, industry_id, value_chain_id, action, file_name, file_size, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(logId, pocId, industry_ids?.split(',')[0] || '', value_chain_ids?.split(',')[0] || '',
    logAction, file?.name || demo_url || '', file?.size || 0, logMeta).run()

  return c.json({ 
    success: true, 
    data: { poc_id: pocId, poc_code: pocCode, file: fileInfo, links: { demo_url, repo_url, doc_url } }
  })
})

// 배포 이력 조회
app.get('/api/deployments', async (c) => {

  const logs = await DB.prepare(`
    SELECT dl.*, ap.poc_code, ap.name as poc_name, i.name_ko as industry_name, vc.name as vc_name
    FROM deployment_log dl
    LEFT JOIN agent_poc ap ON dl.poc_id = ap.id
    LEFT JOIN industry i ON dl.industry_id = i.id
    LEFT JOIN value_chain vc ON dl.value_chain_id = vc.id
    ORDER BY dl.created_at DESC LIMIT 50
  `).all()
  return c.json({ success: true, data: logs.results })
})

// ===== HTML 페이지 =====
app.get('/', (c) => {
  return c.html(getMainHTML())
})

app.get('/assets/app.js', (c) => {
  return c.text(getAppJS(), 200, { 'Content-Type': 'application/javascript; charset=utf-8' })
})
app.get('/assets/style.css', (c) => {
  return c.text(getStyleCSS(), 200, { 'Content-Type': 'text/css; charset=utf-8' })
})

export default app

// ===== Inline HTML =====
function getMainHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NOVA PoC Catalog — 산업별 AI 서비스 배포 매트릭스</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="/assets/style.css" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            nova: { 50:'#eff6ff', 100:'#dbeafe', 200:'#bfdbfe', 500:'#3b82f6', 600:'#2563eb', 700:'#1d4ed8', 800:'#1e3a5f', 900:'#0f172a' }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-nova-900 text-white min-h-screen">
  
  <!-- Header -->
  <header class="border-b border-white/10 bg-nova-900/80 backdrop-blur-sm sticky top-0 z-50">
    <div class="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg">N</div>
        <div>
          <h1 class="text-xl font-bold tracking-tight">NOVA PoC Catalog</h1>
          <p class="text-xs text-white/50">산업별 AI 서비스 배포 매트릭스</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button onclick="app.showUploadModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition flex items-center gap-2">
          <i class="fas fa-cloud-upload-alt"></i> PoC 업로드
        </button>
        <button onclick="app.showDeployLog()" class="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition">
          <i class="fas fa-history"></i>
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-[1600px] mx-auto px-6 py-6">
    
    <!-- Stats Bar -->
    <div id="stats-bar" class="grid grid-cols-4 gap-4 mb-6"></div>

    <!-- View Toggle -->
    <div class="flex items-center gap-4 mb-6">
      <div class="flex bg-white/5 rounded-lg p-1">
        <button id="btn-grid" onclick="app.setView('grid')" class="px-4 py-2 rounded-md text-sm font-medium transition view-btn active">
          <i class="fas fa-th-large mr-1"></i> 카드 조감도
        </button>
        <button id="btn-matrix" onclick="app.setView('matrix')" class="px-4 py-2 rounded-md text-sm font-medium transition view-btn">
          <i class="fas fa-border-all mr-1"></i> 전체 매트릭스
        </button>
      </div>
      <div class="flex-1"></div>
      <div class="flex items-center gap-2 text-xs text-white/50">
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 운영중</span>
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 테스트</span>
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> 개발중</span>
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> 등록됨</span>
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-white/20"></span> 빈칸</span>
      </div>
    </div>

    <!-- Card Grid View -->
    <div id="view-grid" class="grid grid-cols-3 gap-4"></div>

    <!-- Matrix View -->
    <div id="view-matrix" class="hidden overflow-x-auto"></div>

    <!-- Industry Drilldown -->
    <div id="drilldown-panel" class="hidden mt-6"></div>

  </main>

  <!-- Modals -->
  <div id="modal-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-4">
    <div id="modal-content" class="bg-[#1a2332] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"></div>
  </div>

  <script src="/assets/app.js"></script>
</body>
</html>`
}

function getStyleCSS(): string {
  return `
/* NOVA PoC Catalog Styles */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }

.view-btn { color: rgba(255,255,255,0.5); }
.view-btn.active { background: rgba(59,130,246,0.3); color: white; }

.upload-tab { color: rgba(255,255,255,0.4); }
.upload-tab.active { background: rgba(59,130,246,0.3); color: white; }

.industry-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s;
  cursor: pointer;
}
.industry-card:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.15);
  transform: translateY(-2px);
}

.vc-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.vc-row:last-child { border-bottom: none; }

.poc-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.15s;
}
.poc-dot:hover { transform: scale(1.5); }
.poc-dot.active { background: #10b981; }
.poc-dot.testing { background: #f59e0b; }
.poc-dot.dev { background: #ef4444; }
.poc-dot.registered { background: #3b82f6; }

.progress-bar {
  height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,0.08);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

/* Matrix table */
.matrix-table { border-collapse: separate; border-spacing: 3px; width: 100%; }
.matrix-table th { 
  padding: 8px 10px; 
  font-size: 12px; 
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  text-align: center;
  white-space: nowrap;
}
.matrix-table .vc-header {
  text-align: left;
  min-width: 140px;
  color: rgba(255,255,255,0.8);
}
.matrix-cell {
  padding: 8px;
  border-radius: 8px;
  min-width: 90px;
  min-height: 50px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.matrix-cell:hover {
  transform: scale(1.05);
  z-index: 10;
}
.matrix-cell.empty {
  background: rgba(255,255,255,0.02);
  border: 1px dashed rgba(255,255,255,0.08);
}

/* Drilldown */
.drilldown-card {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}
.drilldown-card:hover {
  border-color: rgba(255,255,255,0.2);
}

.deploy-btn {
  border: 2px dashed rgba(255,255,255,0.15);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(255,255,255,0.3);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.deploy-btn:hover {
  border-color: rgba(59,130,246,0.5);
  color: rgba(59,130,246,0.8);
  background: rgba(59,130,246,0.05);
}

/* Tooltip */
.tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 50;
  opacity: 0;
  transition: opacity 0.15s;
}
.matrix-cell:hover .tooltip { opacity: 1; }

/* Upload area */
.drop-zone {
  border: 2px dashed rgba(255,255,255,0.15);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  transition: all 0.2s;
}
.drop-zone.dragover {
  border-color: #3b82f6;
  background: rgba(59,130,246,0.05);
}

/* Animation */
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.fade-in { animation: fadeIn 0.3s ease; }

/* Badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
}

/* Select dropdown - option 검은 글씨 */
.select-dark option {
  background: #1e293b;
  color: #111;
}
.select-dark option:checked {
  background: #2563eb;
  color: #fff;
}
`
}

function getAppJS(): string {
  return `// NOVA PoC Catalog - Frontend Application
const app = {
  currentView: 'grid',
  industries: [],
  matrixSummary: [],
  allPocs: [],
  expandedIndustry: null,

  async init() {
    await Promise.all([
      this.loadIndustries(),
      this.loadMatrixSummary(),
      this.loadPocs()
    ]);
    this.renderStats();
    this.renderGrid();
  },

  async loadIndustries() {
    const res = await fetch('/api/industries');
    const json = await res.json();
    this.industries = json.data || [];
  },

  async loadMatrixSummary() {
    const res = await fetch('/api/matrix/summary');
    const json = await res.json();
    this.matrixSummary = json.data || [];
  },

  async loadPocs() {
    const res = await fetch('/api/pocs');
    const json = await res.json();
    this.allPocs = json.data || [];
  },

  // ===== Stats Bar =====
  renderStats() {
    const totalPocs = this.allPocs.length;
    const totalMappings = this.matrixSummary.reduce((s, r) => s + (r.poc_count || 0), 0);
    const activeMappings = this.matrixSummary.reduce((s, r) => s + (r.active_count || 0), 0);
    const emptyCells = this.matrixSummary.filter(r => r.poc_count === 0).length;
    
    document.getElementById('stats-bar').innerHTML = [
      { icon: 'fa-microchip', label: '등록 PoC', value: totalPocs, color: 'blue' },
      { icon: 'fa-layer-group', label: '배포된 서비스', value: totalMappings, color: 'emerald' },
      { icon: 'fa-check-circle', label: '운영중', value: activeMappings, color: 'green' },
      { icon: 'fa-square', label: '빈 셀', value: emptyCells, color: 'gray' },
    ].map(s => \`
      <div class="bg-white/5 border border-white/8 rounded-xl p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-\${s.color}-500/20 flex items-center justify-center">
            <i class="fas \${s.icon} text-\${s.color}-400"></i>
          </div>
          <div>
            <div class="text-2xl font-bold">\${s.value}</div>
            <div class="text-xs text-white/50">\${s.label}</div>
          </div>
        </div>
      </div>
    \`).join('');
  },

  // ===== View Toggle =====
  setView(view) {
    this.currentView = view;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + view).classList.add('active');
    
    if (view === 'grid') {
      document.getElementById('view-grid').classList.remove('hidden');
      document.getElementById('view-matrix').classList.add('hidden');
      this.renderGrid();
    } else {
      document.getElementById('view-grid').classList.add('hidden');
      document.getElementById('view-matrix').classList.remove('hidden');
      this.renderMatrix();
    }
    document.getElementById('drilldown-panel').classList.add('hidden');
  },

  // ===== Card Grid (조감도) =====
  renderGrid() {
    const container = document.getElementById('view-grid');
    
    container.innerHTML = this.industries.map(ind => {
      const vcData = this.matrixSummary.filter(r => r.industry_id === ind.id);
      const totalPocs = vcData.reduce((s, r) => s + (r.poc_count || 0), 0);
      const maxPocs = Math.max(...vcData.map(r => r.poc_count || 0), 1);
      
      return \`
        <div class="industry-card fade-in" onclick="app.drilldown('\${ind.code}')">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <span class="text-2xl">\${ind.icon}</span>
              <div>
                <div class="font-bold text-base">\${ind.name_ko}</div>
                <div class="text-xs text-white/40">\${ind.code} · \${ind.name_en}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold" style="color:\${ind.color}">\${totalPocs}</div>
              <div class="text-[10px] text-white/40">PoC 배포</div>
            </div>
          </div>
          
          <div class="space-y-0">
            \${vcData.map(vc => \`
              <div class="vc-row">
                <span class="text-xs text-white/50 w-[120px] truncate">\${vc.vc_name}</span>
                <div class="flex gap-1 flex-1">
                  \${this.renderDots(vc)}
                </div>
                <span class="text-[10px] text-white/30 w-6 text-right">\${vc.poc_count || 0}</span>
              </div>
            \`).join('')}
          </div>
          
          <div class="mt-3 progress-bar">
            <div class="progress-fill bg-gradient-to-r from-blue-500 to-emerald-500" style="width:\${Math.min(100, (totalPocs / 15) * 100)}%"></div>
          </div>
        </div>
      \`;
    }).join('');
  },

  renderDots(vc) {
    let dots = '';
    for (let i = 0; i < (vc.active_count || 0); i++) dots += '<span class="poc-dot active" title="운영중"></span>';
    for (let i = 0; i < (vc.testing_count || 0); i++) dots += '<span class="poc-dot testing" title="테스트"></span>';
    for (let i = 0; i < (vc.dev_count || 0); i++) dots += '<span class="poc-dot dev" title="개발중"></span>';
    for (let i = 0; i < (vc.registered_count || 0); i++) dots += '<span class="poc-dot registered" title="등록됨"></span>';
    return dots;
  },

  // ===== Full Matrix View =====
  renderMatrix() {
    const container = document.getElementById('view-matrix');
    
    // 각 산업별 밸류체인 목록을 미리 그룹핑
    const industryVcs = {};
    this.industries.forEach(ind => {
      industryVcs[ind.id] = this.matrixSummary.filter(r => r.industry_id === ind.id);
    });
    const maxRows = Math.max(...Object.values(industryVcs).map(vcs => vcs.length), 1);
    
    let html = '<table class="matrix-table"><thead><tr>';
    this.industries.forEach(ind => {
      const totalPocs = (industryVcs[ind.id] || []).reduce((s, r) => s + (r.poc_count || 0), 0);
      html += \`<th>
        <span class="text-lg">\${ind.icon}</span><br>
        <span class="text-white/80">\${ind.name_ko}</span><br>
        <span class="text-[10px] text-white/30">\${ind.code} · \${totalPocs} PoC</span>
      </th>\`;
    });
    html += '</tr></thead><tbody>';

    for (let row = 0; row < maxRows; row++) {
      html += '<tr>';
      this.industries.forEach(ind => {
        const vcs = industryVcs[ind.id] || [];
        const vcForRow = vcs[row];
        
        if (vcForRow) {
          const count = vcForRow.poc_count || 0;
          const intensity = Math.min(count / 5, 1);
          const bg = count > 0 
            ? \`rgba(\${this.hexToRgb(ind.color)}, \${0.1 + intensity * 0.4})\`
            : '';
          const cellClass = count > 0 ? '' : 'empty';
          
          html += \`<td class="matrix-cell \${cellClass}" style="background:\${bg}" 
                       onclick="app.drilldownCell('\${ind.code}', '\${vcForRow.vc_id}')">
            <div class="tooltip">\${vcForRow.vc_name}: \${count}개 PoC</div>
            <div class="text-[11px] text-white/70 mb-1 font-medium">\${vcForRow.vc_name}</div>
            \${count > 0 
              ? \`<div class="text-lg font-bold">\${count}</div><div class="flex justify-center gap-0.5 mt-1">\${this.renderDots(vcForRow)}</div>\`
              : '<div class="text-white/15 text-xs mt-1">—</div>'
            }
          </td>\`;
        } else {
          html += '<td class="matrix-cell empty"><div class="text-white/15 text-xs">—</div></td>';
        }
      });
      html += '</tr>';
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  },

  hexToRgb(hex) {
    if (!hex) return '59,130,246';
    hex = hex.replace('#', '');
    return [parseInt(hex.substring(0,2),16), parseInt(hex.substring(2,4),16), parseInt(hex.substring(4,6),16)].join(',');
  },

  // ===== Drilldown (카드 클릭 시 상세) =====
  async drilldown(industryCode) {
    this.expandedIndustry = industryCode;
    const panel = document.getElementById('drilldown-panel');
    panel.classList.remove('hidden');
    panel.innerHTML = '<div class="text-center py-8 text-white/40"><i class="fas fa-spinner fa-spin mr-2"></i>로딩중...</div>';

    const res = await fetch('/api/matrix/' + industryCode);
    const json = await res.json();
    const { industry, matrix } = json.data;

    let html = \`
      <div class="fade-in">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <span class="text-3xl">\${industry.icon}</span>
            <div>
              <h2 class="text-xl font-bold">\${industry.name_ko} — 밸류체인별 PoC 배포 현황</h2>
              <p class="text-sm text-white/40">\${industry.code} · \${industry.name_en} · \${industry.description || ''}</p>
            </div>
          </div>
          <button onclick="document.getElementById('drilldown-panel').classList.add('hidden')" class="p-2 hover:bg-white/10 rounded-lg">
            <i class="fas fa-times text-white/40"></i>
          </button>
        </div>
    \`;

    for (const [vcId, vcData] of Object.entries(matrix)) {
      const vc = vcData;
      html += \`
        <div class="mb-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-bold px-2 py-0.5 rounded bg-white/10">Step \${vc.order_seq}</span>
            <h3 class="font-semibold text-sm">\${vc.name}</h3>
            <span class="text-xs text-white/30">\${vc.pcf_category || ''}</span>
            <span class="text-xs text-white/40 ml-auto">\${vc.pocs.length}개 PoC</span>
          </div>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            \${vc.pocs.map(p => {
              const links = (() => { try { return JSON.parse(p.links_json || '{}'); } catch { return {}; } })();
              return \`
              <div class="drilldown-card">
                <div class="flex items-start justify-between mb-2">
                  <span class="status-badge \${this.statusClass(p.deploy_status)}">\${this.statusIcon(p.deploy_status)} \${this.statusLabel(p.deploy_status)}</span>
                  <button onclick="event.stopPropagation(); app.removeDeploy('\${p.id}', '\${industry.code}')" class="text-white/20 hover:text-red-400 text-xs" title="제거"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div class="font-medium text-sm mb-1">\${p.poc_name}</div>
                <div class="text-[10px] text-white/40 mb-2">\${p.poc_code} · \${p.category}</div>
                <div class="text-xs text-white/50 mb-2">\${p.core_value || ''}</div>
                \${(p.demo_url || links.repo_url || links.doc_url) ? \`
                  <div class="flex gap-1.5 mb-2 flex-wrap">
                    \${p.demo_url ? \`<a href="\${p.demo_url}" target="_blank" onclick="event.stopPropagation()" class="text-[10px] px-2 py-1 rounded-md bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition flex items-center gap-1"><i class="fas fa-external-link-alt"></i> Demo</a>\` : ''}
                    \${links.repo_url ? \`<a href="\${links.repo_url}" target="_blank" onclick="event.stopPropagation()" class="text-[10px] px-2 py-1 rounded-md bg-white/5 text-white/50 hover:bg-white/10 transition flex items-center gap-1"><i class="fab fa-github"></i> Repo</a>\` : ''}
                    \${links.doc_url ? \`<a href="\${links.doc_url}" target="_blank" onclick="event.stopPropagation()" class="text-[10px] px-2 py-1 rounded-md bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition flex items-center gap-1"><i class="fas fa-book"></i> Docs</a>\` : ''}
                  </div>
                \` : ''}
                <div class="flex gap-1 mt-1 flex-wrap">
                  \${(JSON.parse(p.tech_stack || '[]')).map(t => \`<span class="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">\${t}</span>\`).join('')}
                </div>
              </div>
            \`; }).join('')}
            
            <div class="deploy-btn" onclick="app.showDeployModal('\${industry.id}', '\${vcId}', '\${industry.code}')">
              <i class="fas fa-plus"></i> 서비스 등록
            </div>
          </div>
        </div>
      \`;
    }

    html += '</div>';
    panel.innerHTML = html;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  async drilldownCell(industryCode, vcId) {
    await this.drilldown(industryCode);
  },

  statusClass(status) {
    const map = { active: 'bg-emerald-500/20 text-emerald-400', testing: 'bg-amber-500/20 text-amber-400', dev: 'bg-rose-500/20 text-rose-400', registered: 'bg-blue-500/20 text-blue-400' };
    return map[status] || map.registered;
  },
  statusIcon(status) {
    const map = { active: '●', testing: '◐', dev: '○', registered: '◎' };
    return map[status] || '◎';
  },
  statusLabel(status) {
    const map = { active: '운영중', testing: '테스트', dev: '개발중', registered: '등록됨' };
    return map[status] || '등록됨';
  },

  // ===== Deploy Modal (셀에 서비스 등록) =====
  async showDeployModal(industryId, vcId, industryCode) {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    content.innerHTML = \`
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold"><i class="fas fa-plus-circle text-blue-400 mr-2"></i>서비스 등록</h3>
          <button onclick="app.closeModal()" class="p-1 hover:bg-white/10 rounded"><i class="fas fa-times"></i></button>
        </div>
        
        <div class="mb-4">
          <label class="text-sm text-white/60 mb-2 block">기존 PoC 선택</label>
          <select id="deploy-poc-select" class="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm select-dark">
            <option value="">— PoC를 선택하세요 —</option>
            \${app.allPocs.map(p => \`<option value="\${p.id}">\${p.poc_code} — \${p.name} (\${p.category})</option>\`).join('')}
          </select>
        </div>

        <div class="mb-4">
          <label class="text-sm text-white/60 mb-2 block">배포 상태</label>
          <div class="flex gap-2">
            \${['registered','dev','testing','active'].map(s => \`
              <label class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 text-sm">
                <input type="radio" name="deploy-status" value="\${s}" \${s === 'registered' ? 'checked' : ''}>
                \${app.statusLabel(s)}
              </label>
            \`).join('')}
          </div>
        </div>

        <div class="mb-4">
          <label class="text-sm text-white/60 mb-2 block">메모 (선택)</label>
          <input id="deploy-note" class="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm" placeholder="배포 관련 메모...">
        </div>

        <div class="border-t border-white/10 pt-4 mt-4">
          <p class="text-xs text-white/40 mb-3">또는 새 PoC를 등록 (링크 또는 ZIP)</p>
          <button onclick="app.closeModal(); app.showUploadModal('\${industryId}', '\${vcId}')" class="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/60 border border-dashed border-white/15">
            <i class="fas fa-plus-circle mr-1"></i> 새 PoC 등록 (링크 / ZIP)
          </button>
        </div>

        <button onclick="app.submitDeploy('\${industryId}', '\${vcId}', '\${industryCode}')" class="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition">
          <i class="fas fa-rocket mr-1"></i> 배포하기
        </button>
      </div>
    \`;
  },

  async submitDeploy(industryId, vcId, industryCode) {
    const pocId = document.getElementById('deploy-poc-select').value;
    if (!pocId) return alert('PoC를 선택해주세요.');
    
    const status = document.querySelector('input[name="deploy-status"]:checked')?.value || 'registered';
    const note = document.getElementById('deploy-note')?.value || '';

    const res = await fetch('/api/matrix/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poc_id: pocId, industry_id: industryId, value_chain_id: vcId, deploy_status: status, deploy_note: note })
    });
    const json = await res.json();
    
    if (json.success) {
      this.closeModal();
      await this.loadMatrixSummary();
      this.renderStats();
      if (this.currentView === 'grid') this.renderGrid();
      else this.renderMatrix();
      if (industryCode) await this.drilldown(industryCode);
    } else {
      alert(json.error || '등록 실패');
    }
  },

  async removeDeploy(mapId, industryCode) {
    if (!confirm('이 PoC 배포를 제거하시겠습니까?')) return;
    await fetch('/api/matrix/deploy/' + mapId, { method: 'DELETE' });
    await this.loadMatrixSummary();
    this.renderStats();
    if (this.currentView === 'grid') this.renderGrid();
    else this.renderMatrix();
    if (industryCode) await this.drilldown(industryCode);
  },

  // ===== Upload Modal (ZIP 업로드 + 링크 등록) =====
  uploadMode: 'link', // 'zip' or 'link'

  showUploadModal(preIndustryId, preVcId) {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    this.uploadMode = 'link';

    content.innerHTML = \`
      <div class="p-6">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-bold"><i class="fas fa-plus-circle text-blue-400 mr-2"></i>새 PoC 등록</h3>
          <button onclick="app.closeModal()" class="p-1 hover:bg-white/10 rounded"><i class="fas fa-times"></i></button>
        </div>

        <!-- 탭 전환: 링크 / ZIP -->
        <div class="flex bg-white/5 rounded-lg p-1 mb-5">
          <button id="tab-link" onclick="app.switchUploadTab('link')" class="flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 upload-tab active">
            <i class="fas fa-link"></i> 링크로 등록
          </button>
          <button id="tab-zip" onclick="app.switchUploadTab('zip')" class="flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 upload-tab">
            <i class="fas fa-file-archive"></i> ZIP 업로드
          </button>
        </div>

        <!-- 링크 입력 영역 -->
        <div id="section-link" class="mb-4">
          <div class="space-y-3 p-4 bg-white/3 rounded-xl border border-white/8">
            <div>
              <label class="text-xs text-white/60 mb-1 flex items-center gap-1.5"><i class="fas fa-globe text-blue-400"></i> 데모 URL / 서비스 링크</label>
              <input id="up-demo-url" class="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm" placeholder="https://my-poc-demo.example.com">
            </div>
            <div>
              <label class="text-xs text-white/60 mb-1 flex items-center gap-1.5"><i class="fab fa-github text-white/60"></i> Git Repository URL</label>
              <input id="up-repo-url" class="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm" placeholder="https://github.com/org/repo">
            </div>
            <div>
              <label class="text-xs text-white/60 mb-1 flex items-center gap-1.5"><i class="fas fa-book text-amber-400"></i> 문서 / API Docs URL</label>
              <input id="up-doc-url" class="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm" placeholder="https://docs.example.com/api">
            </div>
          </div>
        </div>

        <!-- ZIP 업로드 영역 (기본 숨김) -->
        <div id="section-zip" class="mb-4 hidden">
          <div class="drop-zone" id="drop-zone" ondrop="app.handleDrop(event)" ondragover="app.handleDragOver(event)" ondragleave="app.handleDragLeave(event)">
            <i class="fas fa-file-archive text-3xl text-white/20 mb-3"></i>
            <p class="text-sm text-white/40 mb-2">ZIP 파일을 드래그하거나 클릭하여 선택</p>
            <input type="file" id="upload-file" accept=".zip" onchange="app.handleFileSelect(event)" class="hidden">
            <button onclick="document.getElementById('upload-file').click()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm">파일 선택</button>
            <div id="file-info" class="mt-2 text-xs text-white/40 hidden"></div>
          </div>
        </div>

        <!-- 공통 필드 -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="text-xs text-white/60 mb-1 block">PoC 이름 *</label>
            <input id="up-name" class="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm" placeholder="예: 새 AI 에이전트">
          </div>
          <div>
            <label class="text-xs text-white/60 mb-1 block">카테고리 *</label>
            <select id="up-category" class="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm select-dark">
              <option value="문서/지식 생성">문서/지식 생성</option>
              <option value="현장 실행 지원">현장 실행 지원</option>
              <option value="데이터 해석">데이터 해석</option>
              <option value="구조화">구조화</option>
              <option value="의사결정">의사결정</option>
            </select>
          </div>
        </div>

        <div class="mb-3">
          <label class="text-xs text-white/60 mb-1 block">설명</label>
          <textarea id="up-desc" rows="2" class="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm" placeholder="PoC 설명..."></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="text-xs text-white/60 mb-1 block">핵심 가치</label>
            <input id="up-corevalue" class="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm" placeholder="예: 실시간 데이터 분석">
          </div>
          <div>
            <label class="text-xs text-white/60 mb-1 block">기술 스택 (쉼표 구분)</label>
            <input id="up-tech" class="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm" placeholder="예: LLM, RAG, Python">
          </div>
        </div>

        <div class="mb-3">
          <label class="text-xs text-white/60 mb-1 block">대상 산업군 (복수 선택)</label>
          <div class="flex flex-wrap gap-2" id="up-industries">
            \${app.industries.map(i => \`
              <label class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 text-xs">
                <input type="checkbox" value="\${i.id}" class="ind-check" \${preIndustryId === i.id ? 'checked' : ''}> \${i.icon} \${i.name_ko}
              </label>
            \`).join('')}
          </div>
        </div>

        <div class="mb-3" id="up-vc-container">
          <label class="text-xs text-white/60 mb-1 block">대상 밸류체인 (산업군 선택 후 표시)</label>
          <div id="up-vc-list" class="flex flex-wrap gap-2 text-xs text-white/30">산업군을 먼저 선택해주세요</div>
        </div>

        <div class="mb-4">
          <label class="text-xs text-white/60 mb-1 block">배포 상태</label>
          <div class="flex gap-2">
            \${['registered','dev','testing','active'].map(s => \`
              <label class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 text-sm">
                <input type="radio" name="up-status" value="\${s}" \${s === 'registered' ? 'checked' : ''}>
                \${app.statusLabel(s)}
              </label>
            \`).join('')}
          </div>
        </div>

        <button onclick="app.submitUpload()" class="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition">
          <i class="fas fa-rocket mr-1"></i> PoC 등록 & 배포
        </button>
      </div>
    \`;

    // Setup industry checkbox change -> load value chains
    setTimeout(() => {
      document.querySelectorAll('.ind-check').forEach(cb => {
        cb.addEventListener('change', () => app.updateVcList());
      });
      if (preIndustryId) this.updateVcList(preVcId);
    }, 100);
  },

  switchUploadTab(mode) {
    this.uploadMode = mode;
    document.getElementById('section-link').classList.toggle('hidden', mode !== 'link');
    document.getElementById('section-zip').classList.toggle('hidden', mode !== 'zip');
    document.querySelectorAll('.upload-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + mode).classList.add('active');
  },

  async updateVcList(preVcId) {
    const checked = [...document.querySelectorAll('.ind-check:checked')].map(c => c.value);
    const container = document.getElementById('up-vc-list');
    
    if (checked.length === 0) {
      container.innerHTML = '<span class="text-white/30">산업군을 먼저 선택해주세요</span>';
      return;
    }

    let allVcs = [];
    for (const indId of checked) {
      const ind = app.industries.find(i => i.id === indId);
      if (!ind) continue;
      const res = await fetch('/api/industries/' + ind.code + '/value-chains');
      const json = await res.json();
      if (json.data?.value_chains) {
        allVcs = allVcs.concat(json.data.value_chains.map(vc => ({...vc, industry_name: ind.name_ko, industry_icon: ind.icon})));
      }
    }

    container.innerHTML = allVcs.map(vc => \`
      <label class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 text-xs">
        <input type="checkbox" value="\${vc.id}" class="vc-check" \${preVcId === vc.id ? 'checked' : ''}> \${vc.industry_icon} \${vc.name}
      </label>
    \`).join('');
  },

  selectedFile: null,

  handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      this.selectedFile = e.dataTransfer.files[0];
      this.showFileInfo();
    }
  },
  handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('dragover'); },
  handleDragLeave(e) { e.currentTarget.classList.remove('dragover'); },
  handleFileSelect(e) { 
    this.selectedFile = e.target.files[0]; 
    this.showFileInfo(); 
  },
  showFileInfo() {
    const el = document.getElementById('file-info');
    if (this.selectedFile) {
      el.classList.remove('hidden');
      el.innerHTML = \`<i class="fas fa-check-circle text-emerald-400 mr-1"></i>\${this.selectedFile.name} (\${(this.selectedFile.size / 1024).toFixed(1)} KB)\`;
    }
  },

  async submitUpload() {
    const name = document.getElementById('up-name').value.trim();
    const category = document.getElementById('up-category').value;
    if (!name) return alert('PoC 이름을 입력해주세요.');

    const indIds = [...document.querySelectorAll('.ind-check:checked')].map(c => c.value).join(',');
    const vcIds = [...document.querySelectorAll('.vc-check:checked')].map(c => c.value).join(',');
    const deployStatus = document.querySelector('input[name="up-status"]:checked')?.value || 'registered';
    const description = document.getElementById('up-desc').value.trim();
    const coreValue = document.getElementById('up-corevalue').value.trim();
    const techStack = document.getElementById('up-tech').value.trim();

    let res;

    if (this.uploadMode === 'link') {
      // 링크 등록 — JSON body
      const body = {
        name, category, description, core_value: coreValue, tech_stack: techStack,
        industry_ids: indIds, value_chain_ids: vcIds, deploy_status: deployStatus,
        demo_url: document.getElementById('up-demo-url')?.value.trim() || '',
        repo_url: document.getElementById('up-repo-url')?.value.trim() || '',
        doc_url: document.getElementById('up-doc-url')?.value.trim() || ''
      };
      res = await fetch('/api/pocs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } else {
      // ZIP 업로드 — FormData
      const fd = new FormData();
      if (this.selectedFile) fd.append('file', this.selectedFile);
      fd.append('name', name);
      fd.append('category', category);
      fd.append('description', description);
      fd.append('core_value', coreValue);
      fd.append('tech_stack', techStack);
      fd.append('industry_ids', indIds);
      fd.append('value_chain_ids', vcIds);
      fd.append('deploy_status', deployStatus);
      res = await fetch('/api/pocs/upload', { method: 'POST', body: fd });
    }

    const json = await res.json();

    if (json.success) {
      this.closeModal();
      this.selectedFile = null;
      await Promise.all([this.loadPocs(), this.loadMatrixSummary()]);
      this.renderStats();
      if (this.currentView === 'grid') this.renderGrid();
      else this.renderMatrix();
      if (this.expandedIndustry) await this.drilldown(this.expandedIndustry);
      alert(\`\\u2705 \${json.data.poc_code} 등록 완료!\`);
    } else {
      alert(json.error || '등록 실패');
    }
  },

  // ===== Deploy Log =====
  async showDeployLog() {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    const res = await fetch('/api/deployments');
    const json = await res.json();
    const logs = json.data || [];

    content.innerHTML = \`
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold"><i class="fas fa-history text-blue-400 mr-2"></i>배포 이력</h3>
          <button onclick="app.closeModal()" class="p-1 hover:bg-white/10 rounded"><i class="fas fa-times"></i></button>
        </div>
        <div class="space-y-2 max-h-[60vh] overflow-y-auto">
          \${logs.length === 0 ? '<p class="text-white/40 text-sm text-center py-4">이력이 없습니다.</p>' :
            logs.map(l => \`
              <div class="flex items-center gap-3 p-3 bg-white/3 rounded-lg text-sm">
                <span class="text-xs px-2 py-0.5 rounded \${l.action === 'deploy' ? 'bg-emerald-500/20 text-emerald-400' : l.action === 'upload' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}">\${l.action}</span>
                <span class="font-medium">\${l.poc_code || ''} \${l.poc_name || ''}</span>
                <span class="text-white/30">→</span>
                <span class="text-white/50">\${l.industry_name || ''} / \${l.vc_name || ''}</span>
                \${l.file_name ? \`<span class="text-[10px] text-white/30"><i class="fas fa-file-archive mr-1"></i>\${l.file_name}</span>\` : ''}
                <span class="text-[10px] text-white/30 ml-auto">\${l.created_at || ''}</span>
              </div>
            \`).join('')
          }
        </div>
      </div>
    \`;
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }
};

// Close modal on overlay click
document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) app.closeModal();
});

// Init
app.init();
`
}
