-- ============================================================
-- NOVA PoC Catalog - Seed Data
-- 9 Industries, 54 Value Chains, 14 POCs, Mappings
-- ============================================================

-- ===== 1. Industries (9개 산업군) =====
INSERT OR IGNORE INTO industry (id, code, name_ko, name_en, description, icon, color, order_seq) VALUES
  ('ind-con', 'CON', '건설', 'Construction', 'APQC: 2.0 제품개발 · 4.0 서비스제공 · 4.8 EHS · 5.0 조달', '🏗️', '#F59E0B', 1),
  ('ind-hvy', 'HVY', '중공업/방산', 'Heavy Industry', 'APQC: 2.0 R&D · 4.0 생산 · 4.8 EHS · 5.0 조달 · 9.0 자산관리', '⚙️', '#6366F1', 2),
  ('ind-ene', 'ENE', '에너지', 'Energy', 'APQC: 4.0 운영 · 4.8 EHS · 9.0 자산관리 · 6.0 영업', '⚡', '#10B981', 3),
  ('ind-oil', 'OIL', '정유/화학', 'Oil & Chemical', 'APQC: 4.0 정제 · 4.8 EHS · 5.0 조달 · 9.0 자산관리', '🛢️', '#EF4444', 4),
  ('ind-tel', 'TEL', '텔레콤', 'Telecommunications', 'APQC: 2.0 서비스개발 · 4.0 네트워크운영 · 6.0 고객관리 · 7.0 IT', '📡', '#8B5CF6', 5),
  ('ind-fmc', 'FMC', 'FMCG', 'FMCG', 'APQC: 2.0 제품개발 · 4.0 생산 · 5.0 SCM · 6.0 마케팅', '🛒', '#EC4899', 6),
  ('ind-air', 'AIR', '에어모빌리티', 'Air Mobility', 'APQC: 2.0 기체개발 · 4.0 비행 · 4.8 EHS · 9.0 MRO', '✈️', '#06B6D4', 7),
  ('ind-gam', 'GAM', '게임', 'Gaming', 'APQC: 2.0 게임개발 · 4.0 라이브운영 · 6.0 마케팅/UA', '🎮', '#F97316', 8),
  ('ind-log', 'LOG', '물류/해운', 'Logistics', 'APQC: 4.0 운송 · 5.0 SCM · 6.0 고객서비스', '🚢', '#14B8A6', 9);

-- ===== 2. Value Chains (각 산업군 6단계) =====

-- CON 건설
INSERT OR IGNORE INTO value_chain (id, industry_id, code, name, pcf_category, order_seq) VALUES
  ('vc-con-1', 'ind-con', 'CON-VC1', '프로젝트 기획·수주', '2.0 제품/서비스 개발', 1),
  ('vc-con-2', 'ind-con', 'CON-VC2', '설계·엔지니어링', '2.0 제품/서비스 개발', 2),
  ('vc-con-3', 'ind-con', 'CON-VC3', '조달·구매', '5.0 조달관리', 3),
  ('vc-con-4', 'ind-con', 'CON-VC4', '시공·건설', '4.0 서비스 제공', 4),
  ('vc-con-5', 'ind-con', 'CON-VC5', 'EHS 관리', '4.8 EHS', 5),
  ('vc-con-6', 'ind-con', 'CON-VC6', '준공·인도', '4.0 서비스 제공', 6);

-- HVY 중공업/방산
INSERT OR IGNORE INTO value_chain (id, industry_id, code, name, pcf_category, order_seq) VALUES
  ('vc-hvy-1', 'ind-hvy', 'HVY-VC1', 'R&D·설계', '2.0 R&D', 1),
  ('vc-hvy-2', 'ind-hvy', 'HVY-VC2', '조달·공급망', '5.0 조달관리', 2),
  ('vc-hvy-3', 'ind-hvy', 'HVY-VC3', '생산·제조', '4.0 생산', 3),
  ('vc-hvy-4', 'ind-hvy', 'HVY-VC4', '품질관리', '4.0 생산', 4),
  ('vc-hvy-5', 'ind-hvy', 'HVY-VC5', 'EHS 관리', '4.8 EHS', 5),
  ('vc-hvy-6', 'ind-hvy', 'HVY-VC6', '납품·서비스', '4.0 생산', 6);

-- ENE 에너지
INSERT OR IGNORE INTO value_chain (id, industry_id, code, name, pcf_category, order_seq) VALUES
  ('vc-ene-1', 'ind-ene', 'ENE-VC1', '탐사·개발', '4.0 운영', 1),
  ('vc-ene-2', 'ind-ene', 'ENE-VC2', '생산·운영', '4.0 운영', 2),
  ('vc-ene-3', 'ind-ene', 'ENE-VC3', '송배전·인프라', '4.0 운영', 3),
  ('vc-ene-4', 'ind-ene', 'ENE-VC4', 'EHS·안전', '4.8 EHS', 4),
  ('vc-ene-5', 'ind-ene', 'ENE-VC5', '자산관리', '9.0 자산관리', 5),
  ('vc-ene-6', 'ind-ene', 'ENE-VC6', '고객·영업', '6.0 영업', 6);

-- OIL 정유/화학
INSERT OR IGNORE INTO value_chain (id, industry_id, code, name, pcf_category, order_seq) VALUES
  ('vc-oil-1', 'ind-oil', 'OIL-VC1', '원료조달', '5.0 조달관리', 1),
  ('vc-oil-2', 'ind-oil', 'OIL-VC2', '정제·프로세스', '4.0 정제', 2),
  ('vc-oil-3', 'ind-oil', 'OIL-VC3', '품질·Lab', '4.0 정제', 3),
  ('vc-oil-4', 'ind-oil', 'OIL-VC4', 'EHS·환경', '4.8 EHS', 4),
  ('vc-oil-5', 'ind-oil', 'OIL-VC5', '물류·유통', '5.0 조달관리', 5),
  ('vc-oil-6', 'ind-oil', 'OIL-VC6', '영업·마케팅', '6.0 영업', 6);

-- TEL 텔레콤
INSERT OR IGNORE INTO value_chain (id, industry_id, code, name, pcf_category, order_seq) VALUES
  ('vc-tel-1', 'ind-tel', 'TEL-VC1', '네트워크 기획', '2.0 서비스 개발', 1),
  ('vc-tel-2', 'ind-tel', 'TEL-VC2', '인프라 구축', '4.0 네트워크 운영', 2),
  ('vc-tel-3', 'ind-tel', 'TEL-VC3', '서비스 개발', '2.0 서비스 개발', 3),
  ('vc-tel-4', 'ind-tel', 'TEL-VC4', '고객관리', '6.0 고객관리', 4),
  ('vc-tel-5', 'ind-tel', 'TEL-VC5', '운영·유지보수', '4.0 네트워크 운영', 5),
  ('vc-tel-6', 'ind-tel', 'TEL-VC6', '마케팅·영업', '6.0 고객관리', 6);

-- FMC FMCG
INSERT OR IGNORE INTO value_chain (id, industry_id, code, name, pcf_category, order_seq) VALUES
  ('vc-fmc-1', 'ind-fmc', 'FMC-VC1', '제품 개발', '2.0 제품개발', 1),
  ('vc-fmc-2', 'ind-fmc', 'FMC-VC2', '원재료 조달', '5.0 SCM', 2),
  ('vc-fmc-3', 'ind-fmc', 'FMC-VC3', '생산·품질', '4.0 생산', 3),
  ('vc-fmc-4', 'ind-fmc', 'FMC-VC4', '물류·유통', '5.0 SCM', 4),
  ('vc-fmc-5', 'ind-fmc', 'FMC-VC5', '마케팅·영업', '6.0 마케팅', 5),
  ('vc-fmc-6', 'ind-fmc', 'FMC-VC6', '고객 서비스', '6.0 마케팅', 6);

-- AIR 에어모빌리티
INSERT OR IGNORE INTO value_chain (id, industry_id, code, name, pcf_category, order_seq) VALUES
  ('vc-air-1', 'ind-air', 'AIR-VC1', '기체 설계·개발', '2.0 기체개발', 1),
  ('vc-air-2', 'ind-air', 'AIR-VC2', '인증·규제', '2.0 기체개발', 2),
  ('vc-air-3', 'ind-air', 'AIR-VC3', '생산·조립', '4.0 비행', 3),
  ('vc-air-4', 'ind-air', 'AIR-VC4', '비행·운항', '4.0 비행', 4),
  ('vc-air-5', 'ind-air', 'AIR-VC5', 'MRO', '9.0 MRO', 5),
  ('vc-air-6', 'ind-air', 'AIR-VC6', '서비스·고객', '6.0 고객', 6);

-- GAM 게임
INSERT OR IGNORE INTO value_chain (id, industry_id, code, name, pcf_category, order_seq) VALUES
  ('vc-gam-1', 'ind-gam', 'GAM-VC1', '게임 기획', '2.0 게임개발', 1),
  ('vc-gam-2', 'ind-gam', 'GAM-VC2', '개발·QA', '2.0 게임개발', 2),
  ('vc-gam-3', 'ind-gam', 'GAM-VC3', '퍼블리싱·런칭', '4.0 라이브운영', 3),
  ('vc-gam-4', 'ind-gam', 'GAM-VC4', '라이브 운영', '4.0 라이브운영', 4),
  ('vc-gam-5', 'ind-gam', 'GAM-VC5', '마케팅·UA', '6.0 마케팅', 5),
  ('vc-gam-6', 'ind-gam', 'GAM-VC6', '커뮤니티·CS', '6.0 마케팅', 6);

-- LOG 물류/해운
INSERT OR IGNORE INTO value_chain (id, industry_id, code, name, pcf_category, order_seq) VALUES
  ('vc-log-1', 'ind-log', 'LOG-VC1', '수요예측·계획', '5.0 SCM', 1),
  ('vc-log-2', 'ind-log', 'LOG-VC2', '화물 집하', '4.0 운송', 2),
  ('vc-log-3', 'ind-log', 'LOG-VC3', '운송·배송', '4.0 운송', 3),
  ('vc-log-4', 'ind-log', 'LOG-VC4', '통관·서류', '4.0 운송', 4),
  ('vc-log-5', 'ind-log', 'LOG-VC5', '창고·보관', '5.0 SCM', 5),
  ('vc-log-6', 'ind-log', 'LOG-VC6', '고객 서비스', '6.0 고객서비스', 6);

-- ===== 3. POCs (14개 AI PoC) =====
INSERT OR IGNORE INTO agent_poc (id, poc_code, name, category, description, core_value, tech_stack, status, maturity_level) VALUES
  ('poc-001', 'POC-001', 'Proposal Copilot Agent', '문서/지식 생성', '사람 머리속 구조를 문서로 바로 변환하는 에이전트', '문서 구조 변환', '["LLM","RAG","Document Parser"]', 'active', 4),
  ('poc-002', 'POC-002', 'Slide Super-Agent', '문서/지식 생성', '자료를 표준 슬라이드로 변환하는 에이전트', '슬라이드 변환', '["LLM","Template Engine","PPT Generator"]', 'active', 4),
  ('poc-003', 'POC-003', 'PI Interview → BPMN Agent', '문서/지식 생성', '비정형 인터뷰를 프로세스 데이터로 변환', '인터뷰→프로세스 변환', '["LLM","NLP","BPMN.js"]', 'active', 3),
  ('poc-004', 'POC-004', 'Process Mapping 자동화 Agent', '문서/지식 생성', '비정형 데이터를 표준 프로세스로 정규화', '프로세스 정규화', '["LLM","Process Mining","APQC PCF"]', 'testing', 3),
  ('poc-005', 'POC-005', 'SafeAssist (EHS 지식검색)', '현장 실행 지원', 'EHS 관련 질문에 대한 즉시 답변 생성', 'EHS 지식 검색', '["RAG","Vector DB","Safety DB"]', 'active', 5),
  ('poc-006', 'POC-006', 'TBM 조언자 Agent', '현장 실행 지원', '현장 리더를 위한 실시간 AI 어시스턴트', '실시간 AI 조언', '["LLM","Streaming","Mobile"]', 'active', 4),
  ('poc-007', 'POC-007', 'TBM 스크립트 생성 Agent', '현장 실행 지원', '현장 리더 노하우를 자동화', '리더 노하우 자동화', '["LLM","Template","Knowledge Base"]', 'testing', 3),
  ('poc-008', 'POC-008', 'Risk Assessment Copilot', '현장 실행 지원', '실시간 AI 위험성 평가', '실시간 위험 평가', '["LLM","Risk Matrix","Real-time"]', 'active', 4),
  ('poc-009', 'POC-009', 'IoT 연계 위험 감지 Agent', '현장 실행 지원', 'IoT 센서 연계 예측적 위험 대응', '예측적 위험 감지', '["IoT","ML","Time Series","Alert"]', 'dev', 2),
  ('poc-010', 'POC-010', '이미지 기반 위험 인식 Agent', '데이터 해석', 'VLM 기반 현장 데이터 변환', '현장 이미지 분석', '["VLM","Object Detection","Safety"]', 'testing', 3),
  ('poc-011', 'POC-011', 'P&ID / 도면 인식 Agent', '데이터 해석', '도면/설계도 디지털화', '도면 디지털화', '["OCR","VLM","CAD Parser"]', 'dev', 2),
  ('poc-012', 'POC-012', 'Firm Ontology / Knowledge Agent', '구조화', '데이터를 시맨틱 구조로 변환', '시맨틱 구조 변환', '["Knowledge Graph","Ontology","NLP"]', 'active', 4),
  ('poc-013', 'POC-013', 'Dynamic Pricing / RM Agent', '의사결정', '컨텍스트 기반 동적 의사결정', '동적 프라이싱', '["ML","Optimization","Real-time"]', 'testing', 3),
  ('poc-014', 'POC-014', '분양 상담 / 금융 설계 Agent', '의사결정', '상담사 사고 구조 자동화', '상담 로직 자동화', '["LLM","Financial Model","Chat"]', 'dev', 2);

-- ===== 4. POC ↔ Industry 매핑 =====
-- POC-001~003: 전 산업 공통
INSERT OR IGNORE INTO poc_industry_map (poc_id, industry_id, relevance) VALUES
  ('poc-001','ind-con',5), ('poc-001','ind-hvy',5), ('poc-001','ind-ene',4), ('poc-001','ind-oil',4),
  ('poc-001','ind-tel',3), ('poc-001','ind-fmc',3), ('poc-001','ind-air',3), ('poc-001','ind-gam',3), ('poc-001','ind-log',3),
  ('poc-002','ind-con',5), ('poc-002','ind-hvy',5), ('poc-002','ind-ene',4), ('poc-002','ind-oil',4),
  ('poc-002','ind-tel',3), ('poc-002','ind-fmc',3), ('poc-002','ind-air',3), ('poc-002','ind-gam',3), ('poc-002','ind-log',3),
  ('poc-003','ind-con',5), ('poc-003','ind-hvy',5), ('poc-003','ind-ene',4), ('poc-003','ind-oil',4),
  ('poc-003','ind-tel',3), ('poc-003','ind-fmc',3), ('poc-003','ind-air',3), ('poc-003','ind-gam',3), ('poc-003','ind-log',3),
  -- POC-004: CON HVY ENE OIL TEL FMC
  ('poc-004','ind-con',5), ('poc-004','ind-hvy',4), ('poc-004','ind-ene',4), ('poc-004','ind-oil',4),
  ('poc-004','ind-tel',3), ('poc-004','ind-fmc',3),
  -- POC-005: CON HVY ENE OIL AIR
  ('poc-005','ind-con',5), ('poc-005','ind-hvy',5), ('poc-005','ind-ene',5), ('poc-005','ind-oil',5), ('poc-005','ind-air',4),
  -- POC-006~009: CON HVY ENE OIL
  ('poc-006','ind-con',5), ('poc-006','ind-hvy',4), ('poc-006','ind-ene',4), ('poc-006','ind-oil',4),
  ('poc-007','ind-con',5), ('poc-007','ind-hvy',4), ('poc-007','ind-ene',4), ('poc-007','ind-oil',4),
  ('poc-008','ind-con',5), ('poc-008','ind-hvy',5), ('poc-008','ind-ene',5), ('poc-008','ind-oil',5), ('poc-008','ind-air',4),
  ('poc-009','ind-con',4), ('poc-009','ind-hvy',4), ('poc-009','ind-ene',5), ('poc-009','ind-oil',5),
  -- POC-010: CON HVY ENE OIL
  ('poc-010','ind-con',5), ('poc-010','ind-hvy',4), ('poc-010','ind-ene',4), ('poc-010','ind-oil',4),
  -- POC-011: ENE OIL HVY
  ('poc-011','ind-ene',5), ('poc-011','ind-oil',5), ('poc-011','ind-hvy',4),
  -- POC-012: 전 산업 공통
  ('poc-012','ind-con',4), ('poc-012','ind-hvy',4), ('poc-012','ind-ene',4), ('poc-012','ind-oil',4),
  ('poc-012','ind-tel',3), ('poc-012','ind-fmc',3), ('poc-012','ind-air',3), ('poc-012','ind-gam',3), ('poc-012','ind-log',3),
  -- POC-013: AIR LOG
  ('poc-013','ind-air',5), ('poc-013','ind-log',5),
  -- POC-014: CON FMC
  ('poc-014','ind-con',5), ('poc-014','ind-fmc',4);

-- ===== 5. POC ↔ ValueChain 매핑 (바둑판 배치) =====
-- CON 건설: 기획~EHS에 PoC 배치
INSERT OR IGNORE INTO poc_value_chain_map (id, poc_id, industry_id, value_chain_id, deploy_status) VALUES
  ('map-con-1-001','poc-001','ind-con','vc-con-1','active'),
  ('map-con-1-002','poc-002','ind-con','vc-con-1','active'),
  ('map-con-1-003','poc-003','ind-con','vc-con-1','active'),
  ('map-con-2-004','poc-004','ind-con','vc-con-2','testing'),
  ('map-con-2-011','poc-011','ind-con','vc-con-2','dev'),
  ('map-con-3-001','poc-001','ind-con','vc-con-3','active'),
  ('map-con-4-006','poc-006','ind-con','vc-con-4','active'),
  ('map-con-4-007','poc-007','ind-con','vc-con-4','testing'),
  ('map-con-4-010','poc-010','ind-con','vc-con-4','testing'),
  ('map-con-5-005','poc-005','ind-con','vc-con-5','active'),
  ('map-con-5-006','poc-006','ind-con','vc-con-5','active'),
  ('map-con-5-007','poc-007','ind-con','vc-con-5','active'),
  ('map-con-5-008','poc-008','ind-con','vc-con-5','active'),
  ('map-con-5-009','poc-009','ind-con','vc-con-5','dev'),
  ('map-con-6-014','poc-014','ind-con','vc-con-6','dev');

-- HVY 중공업
INSERT OR IGNORE INTO poc_value_chain_map (id, poc_id, industry_id, value_chain_id, deploy_status) VALUES
  ('map-hvy-1-001','poc-001','ind-hvy','vc-hvy-1','active'),
  ('map-hvy-1-003','poc-003','ind-hvy','vc-hvy-1','active'),
  ('map-hvy-1-011','poc-011','ind-hvy','vc-hvy-1','dev'),
  ('map-hvy-2-001','poc-001','ind-hvy','vc-hvy-2','active'),
  ('map-hvy-3-004','poc-004','ind-hvy','vc-hvy-3','testing'),
  ('map-hvy-3-010','poc-010','ind-hvy','vc-hvy-3','testing'),
  ('map-hvy-4-008','poc-008','ind-hvy','vc-hvy-4','active'),
  ('map-hvy-5-005','poc-005','ind-hvy','vc-hvy-5','active'),
  ('map-hvy-5-006','poc-006','ind-hvy','vc-hvy-5','active'),
  ('map-hvy-5-007','poc-007','ind-hvy','vc-hvy-5','testing'),
  ('map-hvy-5-008','poc-008','ind-hvy','vc-hvy-5','active'),
  ('map-hvy-5-009','poc-009','ind-hvy','vc-hvy-5','dev'),
  ('map-hvy-6-012','poc-012','ind-hvy','vc-hvy-6','active');

-- ENE 에너지
INSERT OR IGNORE INTO poc_value_chain_map (id, poc_id, industry_id, value_chain_id, deploy_status) VALUES
  ('map-ene-1-001','poc-001','ind-ene','vc-ene-1','active'),
  ('map-ene-2-004','poc-004','ind-ene','vc-ene-2','testing'),
  ('map-ene-2-011','poc-011','ind-ene','vc-ene-2','dev'),
  ('map-ene-3-011','poc-011','ind-ene','vc-ene-3','dev'),
  ('map-ene-4-005','poc-005','ind-ene','vc-ene-4','active'),
  ('map-ene-4-006','poc-006','ind-ene','vc-ene-4','active'),
  ('map-ene-4-008','poc-008','ind-ene','vc-ene-4','active'),
  ('map-ene-4-009','poc-009','ind-ene','vc-ene-4','testing'),
  ('map-ene-5-012','poc-012','ind-ene','vc-ene-5','active');

-- OIL 정유/화학
INSERT OR IGNORE INTO poc_value_chain_map (id, poc_id, industry_id, value_chain_id, deploy_status) VALUES
  ('map-oil-1-001','poc-001','ind-oil','vc-oil-1','active'),
  ('map-oil-2-004','poc-004','ind-oil','vc-oil-2','testing'),
  ('map-oil-2-011','poc-011','ind-oil','vc-oil-2','active'),
  ('map-oil-3-010','poc-010','ind-oil','vc-oil-3','testing'),
  ('map-oil-4-005','poc-005','ind-oil','vc-oil-4','active'),
  ('map-oil-4-006','poc-006','ind-oil','vc-oil-4','active'),
  ('map-oil-4-008','poc-008','ind-oil','vc-oil-4','active'),
  ('map-oil-4-009','poc-009','ind-oil','vc-oil-4','dev'),
  ('map-oil-5-012','poc-012','ind-oil','vc-oil-5','active');

-- TEL 텔레콤
INSERT OR IGNORE INTO poc_value_chain_map (id, poc_id, industry_id, value_chain_id, deploy_status) VALUES
  ('map-tel-1-001','poc-001','ind-tel','vc-tel-1','active'),
  ('map-tel-3-002','poc-002','ind-tel','vc-tel-3','active'),
  ('map-tel-3-004','poc-004','ind-tel','vc-tel-3','testing'),
  ('map-tel-4-012','poc-012','ind-tel','vc-tel-4','active'),
  ('map-tel-5-003','poc-003','ind-tel','vc-tel-5','active');

-- FMC FMCG
INSERT OR IGNORE INTO poc_value_chain_map (id, poc_id, industry_id, value_chain_id, deploy_status) VALUES
  ('map-fmc-1-001','poc-001','ind-fmc','vc-fmc-1','active'),
  ('map-fmc-1-004','poc-004','ind-fmc','vc-fmc-1','testing'),
  ('map-fmc-3-003','poc-003','ind-fmc','vc-fmc-3','active'),
  ('map-fmc-5-013','poc-013','ind-fmc','vc-fmc-5','dev'),
  ('map-fmc-6-014','poc-014','ind-fmc','vc-fmc-6','dev');

-- AIR 에어모빌리티
INSERT OR IGNORE INTO poc_value_chain_map (id, poc_id, industry_id, value_chain_id, deploy_status) VALUES
  ('map-air-1-001','poc-001','ind-air','vc-air-1','active'),
  ('map-air-1-011','poc-011','ind-air','vc-air-1','dev'),
  ('map-air-3-008','poc-008','ind-air','vc-air-3','active'),
  ('map-air-4-005','poc-005','ind-air','vc-air-4','active'),
  ('map-air-5-012','poc-012','ind-air','vc-air-5','active'),
  ('map-air-4-013','poc-013','ind-air','vc-air-4','testing');

-- GAM 게임
INSERT OR IGNORE INTO poc_value_chain_map (id, poc_id, industry_id, value_chain_id, deploy_status) VALUES
  ('map-gam-1-001','poc-001','ind-gam','vc-gam-1','active'),
  ('map-gam-2-002','poc-002','ind-gam','vc-gam-2','active'),
  ('map-gam-2-003','poc-003','ind-gam','vc-gam-2','testing'),
  ('map-gam-4-012','poc-012','ind-gam','vc-gam-4','active');

-- LOG 물류
INSERT OR IGNORE INTO poc_value_chain_map (id, poc_id, industry_id, value_chain_id, deploy_status) VALUES
  ('map-log-1-001','poc-001','ind-log','vc-log-1','active'),
  ('map-log-1-013','poc-013','ind-log','vc-log-1','testing'),
  ('map-log-3-003','poc-003','ind-log','vc-log-3','active'),
  ('map-log-4-012','poc-012','ind-log','vc-log-4','active'),
  ('map-log-6-002','poc-002','ind-log','vc-log-6','active');
