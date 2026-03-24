// ===== NOVA Zod Schemas =====
// Pydantic v2 패턴의 TypeScript 구현
// 모든 요청/응답 데이터는 런타임에 Zod로 검증됨

import { z } from 'zod'

// ===== Request Schemas =====

// POST /api/matrix/deploy — 셀에 PoC 배포
export const DeployRequestSchema = z.object({
  poc_id: z.string().min(1, 'poc_id는 필수입니다.'),
  industry_id: z.string().min(1, 'industry_id는 필수입니다.'),
  value_chain_id: z.string().min(1, 'value_chain_id는 필수입니다.'),
  deploy_status: z.enum(['registered', 'dev', 'testing', 'active']).default('registered'),
  deploy_note: z.string().optional().default('')
})
export type DeployRequest = z.infer<typeof DeployRequestSchema>

// PATCH /api/matrix/deploy/:id — 배포 상태 변경
export const DeployUpdateSchema = z.object({
  deploy_status: z.enum(['registered', 'dev', 'testing', 'active']),
  deploy_note: z.string().optional().default('')
})
export type DeployUpdate = z.infer<typeof DeployUpdateSchema>

// POST /api/pocs/upload (JSON body) — 링크 등록
export const PocLinkCreateSchema = z.object({
  name: z.string().min(1, 'PoC 이름은 필수입니다.').max(200),
  category: z.enum(['문서/지식 생성', '현장 실행 지원', '데이터 해석', '구조화', '의사결정'], {
    errorMap: () => ({ message: '유효한 카테고리를 선택해주세요.' })
  }),
  description: z.string().optional().default(''),
  core_value: z.string().optional().default(''),
  tech_stack: z.string().optional().default(''),
  industry_ids: z.string().optional().default(''),
  value_chain_ids: z.string().optional().default(''),
  deploy_status: z.enum(['registered', 'dev', 'testing', 'active']).default('registered'),
  demo_url: z.string().url('유효한 URL을 입력해주세요.').optional().or(z.literal('')).default(''),
  repo_url: z.string().url('유효한 URL을 입력해주세요.').optional().or(z.literal('')).default(''),
  doc_url: z.string().url('유효한 URL을 입력해주세요.').optional().or(z.literal('')).default('')
})
export type PocLinkCreate = z.infer<typeof PocLinkCreateSchema>

// ===== Entity Schemas (응답 데이터 형태 정의) =====

export const IndustrySchema = z.object({
  id: z.string(),
  code: z.string(),
  name_ko: z.string(),
  name_en: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string(),
  order_seq: z.number(),
  is_active: z.number(),
  created_at: z.string(),
  poc_count: z.number().optional(),
  vc_count: z.number().optional()
})
export type Industry = z.infer<typeof IndustrySchema>

export const ValueChainSchema = z.object({
  id: z.string(),
  industry_id: z.string(),
  code: z.string(),
  name: z.string(),
  pcf_category: z.string().nullable(),
  order_seq: z.number(),
  is_active: z.number(),
  poc_count: z.number().optional()
})
export type ValueChain = z.infer<typeof ValueChainSchema>

export const AgentPocSchema = z.object({
  id: z.string(),
  poc_code: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string().nullable(),
  core_value: z.string().nullable(),
  tech_stack: z.string().nullable(),
  status: z.string(),
  maturity_level: z.number(),
  demo_url: z.string().nullable(),
  config_schema: z.string().nullable(),
  is_active: z.number(),
  created_at: z.string(),
  updated_at: z.string()
})
export type AgentPoc = z.infer<typeof AgentPocSchema>

export const MatrixSummaryRowSchema = z.object({
  industry_id: z.string(),
  industry_code: z.string(),
  name_ko: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  vc_id: z.string(),
  vc_name: z.string(),
  order_seq: z.number(),
  poc_count: z.number(),
  active_count: z.number(),
  testing_count: z.number(),
  dev_count: z.number(),
  registered_count: z.number()
})
export type MatrixSummaryRow = z.infer<typeof MatrixSummaryRowSchema>
