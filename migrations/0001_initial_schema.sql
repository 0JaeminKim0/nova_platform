-- NOVA PoC Catalog - Initial Schema
-- 9 Industries × Value Chains × 14 POCs

-- 1. Industry (산업군 마스터)
CREATE TABLE IF NOT EXISTS industry (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  order_seq INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 2. ValueChain (밸류체인)
CREATE TABLE IF NOT EXISTS value_chain (
  id TEXT PRIMARY KEY,
  industry_id TEXT NOT NULL REFERENCES industry(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  pcf_category TEXT,
  pcf_code TEXT,
  description TEXT,
  order_seq INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_vc_industry ON value_chain(industry_id);

-- 3. Process (프로세스)
CREATE TABLE IF NOT EXISTS process (
  id TEXT PRIMARY KEY,
  value_chain_id TEXT NOT NULL REFERENCES value_chain(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  pcf_process_code TEXT,
  description TEXT,
  keywords TEXT, -- JSON array as text
  order_seq INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_proc_vc ON process(value_chain_id);

-- 4. AgentPOC (POC 카탈로그)
CREATE TABLE IF NOT EXISTS agent_poc (
  id TEXT PRIMARY KEY,
  poc_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  core_value TEXT,
  tech_stack TEXT, -- JSON array as text
  status TEXT DEFAULT 'registered',
  maturity_level INTEGER DEFAULT 3,
  demo_url TEXT,
  thumbnail_url TEXT,
  readme TEXT,
  input_schema TEXT, -- JSON as text
  output_schema TEXT, -- JSON as text
  config_schema TEXT, -- JSON as text
  is_runnable INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_poc_code ON agent_poc(poc_code);
CREATE INDEX IF NOT EXISTS idx_poc_category ON agent_poc(category);

-- 5. POCIndustryMap (POC ↔ 산업군 매핑)
CREATE TABLE IF NOT EXISTS poc_industry_map (
  poc_id TEXT NOT NULL REFERENCES agent_poc(id),
  industry_id TEXT NOT NULL REFERENCES industry(id),
  relevance INTEGER DEFAULT 3,
  PRIMARY KEY (poc_id, industry_id)
);

-- 6. POCValueChainMap (POC ↔ 밸류체인 매핑) - 바둑판 셀 핵심!
CREATE TABLE IF NOT EXISTS poc_value_chain_map (
  id TEXT PRIMARY KEY,
  poc_id TEXT NOT NULL REFERENCES agent_poc(id),
  industry_id TEXT NOT NULL REFERENCES industry(id),
  value_chain_id TEXT NOT NULL REFERENCES value_chain(id),
  deploy_status TEXT DEFAULT 'registered', -- registered, testing, active, inactive
  deploy_note TEXT,
  deployed_at TEXT DEFAULT (datetime('now')),
  UNIQUE(poc_id, industry_id, value_chain_id)
);
CREATE INDEX IF NOT EXISTS idx_pvcm_industry ON poc_value_chain_map(industry_id);
CREATE INDEX IF NOT EXISTS idx_pvcm_vc ON poc_value_chain_map(value_chain_id);

-- 7. AgentStep (에이전트 실행 단계)
CREATE TABLE IF NOT EXISTS agent_step (
  id TEXT PRIMARY KEY,
  poc_id TEXT NOT NULL REFERENCES agent_poc(id),
  step_seq INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  step_type TEXT DEFAULT 'llm',
  prompt_template TEXT,
  tool_config TEXT, -- JSON as text
  output_key TEXT
);
CREATE INDEX IF NOT EXISTS idx_step_poc ON agent_step(poc_id);

-- 8. DeploymentLog (배포 이력)
CREATE TABLE IF NOT EXISTS deployment_log (
  id TEXT PRIMARY KEY,
  poc_id TEXT NOT NULL REFERENCES agent_poc(id),
  industry_id TEXT NOT NULL REFERENCES industry(id),
  value_chain_id TEXT NOT NULL REFERENCES value_chain(id),
  action TEXT NOT NULL, -- 'deploy', 'undeploy', 'update', 'upload'
  file_name TEXT,
  file_size INTEGER,
  metadata TEXT, -- JSON as text
  user_note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dlog_poc ON deployment_log(poc_id);
