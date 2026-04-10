-- ═══════════════════════════════════════════════════════════════════
-- MÓDULO RH: Banco de Talentos
-- Adiciona status "talent_pool" pra marcar candidatos válidos que não
-- foram contratados mas podem ser chamados em processos futuros.
-- ═══════════════════════════════════════════════════════════════════

ALTER TYPE hr_application_status ADD VALUE IF NOT EXISTS 'talent_pool';
