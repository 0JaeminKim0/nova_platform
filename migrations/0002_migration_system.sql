-- ===================================================
-- Migration 0002: _nova_migrations tracking table
-- Nova Migration System 자체 추적 테이블은 migrate.ts에서 자동 생성
-- 이 파일은 마이그레이션 시스템 도입 기록용
-- ===================================================

-- 마이그레이션 시스템 v1.0 도입
-- - 버전별 SQL 파일 순서 실행
-- - 체크섬으로 무결성 확인
-- - 트랜잭션 기반 원자적 적용
-- - _nova_migrations 테이블로 이력 추적

SELECT 1; -- no-op marker (시스템 테이블은 migrate.ts가 생성)
