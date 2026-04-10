#!/usr/bin/env node
/**
 * Aplica o módulo RH no Supabase do Petron:
 * 1. Roda a migration (hr_* tables, RLS, RPCs, bucket)
 * 2. Deploy da edge function rh-analyze-candidate (opcional — requer CLI)
 * 3. Verifica ANTHROPIC_API_KEY nas secrets
 *
 * Uso:
 *   export SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.soycalmbrudlhvcghavr.supabase.co:5432/postgres"
 *   node scripts/apply-rh-module.mjs
 *
 * OU, se tiver Personal Access Token da Supabase Management API:
 *   export SUPABASE_ACCESS_TOKEN="sbp_xxx"
 *   node scripts/apply-rh-module.mjs
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_FILE = join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260410112944_hr_recruitment_module.sql'
);
const PROJECT_REF = 'soycalmbrudlhvcghavr';

function log(msg) {
  console.log(`[apply-rh] ${msg}`);
}

function fail(msg) {
  console.error(`[apply-rh] ❌ ${msg}`);
  process.exit(1);
}

// ─── Método 1: DB URL direto via psql ────────────────────────────

async function applyViaDbUrl(dbUrl) {
  log('Aplicando migration via psql...');
  const sql = readFileSync(MIGRATION_FILE, 'utf-8');
  try {
    const psqlPath = '/opt/homebrew/opt/libpq/bin/psql';
    execSync(`${psqlPath} "${dbUrl}" -v ON_ERROR_STOP=1`, {
      input: sql,
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    log('✅ Migration aplicada com sucesso');
    return true;
  } catch (e) {
    fail(`psql falhou: ${e.message}`);
  }
}

// ─── Método 2: Supabase Management API ──────────────────────────

async function applyViaManagementApi(pat) {
  log('Aplicando via Supabase Management API...');
  const sql = readFileSync(MIGRATION_FILE, 'utf-8');

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    fail(`Management API falhou (${res.status}): ${errText}`);
  }

  const data = await res.json();
  log('✅ Migration aplicada com sucesso');
  log(`   Resposta: ${JSON.stringify(data).slice(0, 200)}`);
  return true;
}

// ─── Deploy da edge function (opcional) ──────────────────────────

async function deployEdgeFunction() {
  log('Tentando deploy da edge function rh-analyze-candidate...');
  try {
    execSync('supabase functions deploy rh-analyze-candidate --project-ref ' + PROJECT_REF, {
      stdio: 'inherit',
    });
    log('✅ Edge function deployada');
  } catch (e) {
    log('⚠️  Deploy da edge function falhou (precisa supabase login primeiro)');
    log('   Rode manualmente: supabase functions deploy rh-analyze-candidate');
  }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  log(`Arquivo de migration: ${MIGRATION_FILE}`);

  const dbUrl = process.env.SUPABASE_DB_URL;
  const pat = process.env.SUPABASE_ACCESS_TOKEN;

  if (dbUrl) {
    await applyViaDbUrl(dbUrl);
  } else if (pat) {
    await applyViaManagementApi(pat);
  } else {
    fail(
      'Forneça SUPABASE_DB_URL (postgresql://postgres:PASSWORD@db.soycalmbrudlhvcghavr.supabase.co:5432/postgres) ' +
        'OU SUPABASE_ACCESS_TOKEN (sbp_xxx de https://supabase.com/dashboard/account/tokens)'
    );
  }

  await deployEdgeFunction();

  log('');
  log('🎉 Módulo RH aplicado!');
  log('');
  log('Próximos passos:');
  log('  1. Verificar se ANTHROPIC_API_KEY está nas secrets do Supabase:');
  log('     https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/functions');
  log('  2. Acessar /rh no ERP e criar a primeira função');
  log('  3. Criar vaga e formulário, compartilhar link /vagas/<slug>');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
