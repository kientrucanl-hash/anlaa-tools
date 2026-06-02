/**
 * Migration script: SQLite (anlaa-tools) → PostgreSQL (anlaa-tools-next)
 *
 * Usage:
 *   1. Copy production anlaa.db to a local path
 *   2. Set DATABASE_URL in .env.local
 *   3. Run: npx prisma migrate deploy && npx tsx prisma/seed.ts
 *
 * Tables migrated (in dependency order):
 *   users → sessions → projects → project_collaborators → project_access_requests
 *   → project_comments → contractors → contractor_drafts → quotations
 *   → notifications → user_price_profiles → project_price_overrides
 *   → estimate_templates
 *
 * The script is IDEMPOTENT: run it multiple times safely — it skips
 * records that already exist (upsert pattern via skipDuplicates).
 */

import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'

// ── Config ─────────────────────────────────────────────────────────────────

const SQLITE_PATH =
  process.env.SQLITE_DB_PATH ??
  path.join(__dirname, '../../.anlaa-tools/server/db/anlaa.db')

const BATCH_SIZE = 100

// ── Init ───────────────────────────────────────────────────────────────────

if (!fs.existsSync(SQLITE_PATH)) {
  console.error(`SQLite database not found at: ${SQLITE_PATH}`)
  console.error('Set SQLITE_DB_PATH env variable to the correct path.')
  process.exit(1)
}

const sqlite = new Database(SQLITE_PATH, { readonly: true })
const prisma = new PrismaClient()

// ── Helpers ────────────────────────────────────────────────────────────────

function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}

function safeDate(value: string | null | undefined): Date {
  if (!value) return new Date()
  const d = new Date(value)
  return isNaN(d.getTime()) ? new Date() : d
}

function mapStatus(s: string): 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' {
  const map: Record<string, 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'> = {
    draft: 'DRAFT', pending: 'PENDING', approved: 'APPROVED', rejected: 'REJECTED',
  }
  return map[s?.toLowerCase()] ?? 'DRAFT'
}

function mapRole(r: string): 'USER' | 'ADMIN' {
  return r?.toLowerCase() === 'admin' ? 'ADMIN' : 'USER'
}

function mapCollabRole(r: string): 'EDITOR' | 'VIEWER' {
  return r?.toLowerCase() === 'editor' ? 'EDITOR' : 'VIEWER'
}

function mapCollabStatus(s: string): 'PENDING' | 'ACCEPTED' | 'DENIED' {
  const map: Record<string, 'PENDING' | 'ACCEPTED' | 'DENIED'> = {
    pending: 'PENDING', accepted: 'ACCEPTED', denied: 'DENIED',
  }
  return map[s?.toLowerCase()] ?? 'PENDING'
}

function mapContractorType(t: string): 'TEAM' | 'COMPANY' | 'INDIVIDUAL' {
  const map: Record<string, 'TEAM' | 'COMPANY' | 'INDIVIDUAL'> = {
    team: 'TEAM', company: 'COMPANY', individual: 'INDIVIDUAL',
  }
  return map[t?.toLowerCase()] ?? 'TEAM'
}

function mapContractorStatus(s: string): 'ACTIVE' | 'INACTIVE' | 'BLACKLIST' {
  const map: Record<string, 'ACTIVE' | 'INACTIVE' | 'BLACKLIST'> = {
    active: 'ACTIVE', inactive: 'INACTIVE', blacklist: 'BLACKLIST',
  }
  return map[s?.toLowerCase()] ?? 'ACTIVE'
}

function mapAccessStatus(s: string): 'PENDING' | 'APPROVED' | 'DENIED' {
  const map: Record<string, 'PENDING' | 'APPROVED' | 'DENIED'> = {
    pending: 'PENDING', approved: 'APPROVED', denied: 'DENIED',
  }
  return map[s?.toLowerCase()] ?? 'PENDING'
}

function mapNotifType(t: string): string {
  const map: Record<string, string> = {
    collab_invite: 'COLLAB_INVITE',
    collab_responded: 'COLLAB_RESPONDED',
    access_request: 'ACCESS_REQUEST',
    access_approved: 'ACCESS_APPROVED',
    access_denied: 'ACCESS_DENIED',
    project_approved: 'PROJECT_APPROVED',
    project_rejected: 'PROJECT_REJECTED',
    role_changed: 'ROLE_CHANGED',
    system: 'SYSTEM',
    contractor_draft_submitted: 'SYSTEM',
    contractor_draft_approved: 'SYSTEM',
    contractor_draft_rejected: 'SYSTEM',
  }
  return map[t?.toLowerCase()] ?? 'SYSTEM'
}

async function runBatch<T>(
  label: string,
  items: T[],
  fn: (batch: T[]) => Promise<{ count: number }>
) {
  if (items.length === 0) { console.log(`  ${label}: 0 rows (skipped)`); return }
  let total = 0
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const result = await fn(batch)
    total += result.count
  }
  console.log(`  ${label}: ${total} / ${items.length} rows migrated`)
}

// ── Migration steps ────────────────────────────────────────────────────────

async function migrateUsers() {
  type SqlUser = {
    id: number; username: string; password_hash: string
    role: string; max_sessions: number; created_at: string
  }
  const rows = sqlite.prepare('SELECT * FROM users ORDER BY id').all() as SqlUser[]

  await runBatch('users', rows, (batch) =>
    prisma.user.createMany({
      data: batch.map((u) => ({
        id: u.id,
        username: u.username,
        passwordHash: u.password_hash,
        role: mapRole(u.role),
        maxSessions: u.max_sessions ?? 2,
        createdAt: safeDate(u.created_at),
      })),
      skipDuplicates: true,
    })
  )
}

async function migrateSessions() {
  type SqlSession = {
    id: number; user_id: number; session_token: string
    ip: string | null; user_agent: string | null
    created_at: string; last_seen: string
  }
  const rows = sqlite.prepare('SELECT * FROM user_sessions ORDER BY id').all() as SqlSession[]

  await runBatch('sessions', rows, (batch) =>
    prisma.session.createMany({
      data: batch.map((s) => ({
        id: s.id,
        userId: s.user_id,
        sessionToken: s.session_token,
        ip: s.ip,
        userAgent: s.user_agent,
        createdAt: safeDate(s.created_at),
        lastSeen: safeDate(s.last_seen),
      })),
      skipDuplicates: true,
    })
  )
}

async function migrateProjects() {
  type SqlProject = {
    id: number; user_id: number; name: string; address: string
    data: string; status: string; admin_note: string | null
    estimate_snapshot: string | null; created_at: string; updated_at: string
  }
  const rows = sqlite.prepare('SELECT * FROM projects ORDER BY id').all() as SqlProject[]

  await runBatch('projects', rows, (batch) =>
    prisma.project.createMany({
      data: batch.map((p) => ({
        id: p.id,
        userId: p.user_id,
        name: p.name,
        address: p.address ?? '',
        data: safeJson(p.data, []),
        status: mapStatus(p.status),
        adminNote: p.admin_note,
        estimateSnapshot: p.estimate_snapshot,
        createdAt: safeDate(p.created_at),
        updatedAt: safeDate(p.updated_at),
      })),
      skipDuplicates: true,
    })
  )
}

async function migrateCollaborators() {
  type SqlCollab = {
    id: number; project_id: number; owner_id: number; invitee_id: number
    role: string; status: string; created_at: string
  }
  const rows = sqlite.prepare('SELECT * FROM project_collaborators ORDER BY id').all() as SqlCollab[]

  await runBatch('project_collaborators', rows, (batch) =>
    prisma.projectCollaborator.createMany({
      data: batch.map((c) => ({
        id: c.id,
        projectId: c.project_id,
        ownerId: c.owner_id,
        inviteeId: c.invitee_id,
        role: mapCollabRole(c.role),
        status: mapCollabStatus(c.status),
        createdAt: safeDate(c.created_at),
      })),
      skipDuplicates: true,
    })
  )
}

async function migrateAccessRequests() {
  type SqlAR = {
    id: number; project_id: number; requester_id: number
    role_requested: string; message: string | null; status: string; created_at: string
  }
  const rows = sqlite.prepare('SELECT * FROM project_access_requests ORDER BY id').all() as SqlAR[]

  await runBatch('project_access_requests', rows, (batch) =>
    prisma.projectAccessRequest.createMany({
      data: batch.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        requesterId: r.requester_id,
        roleRequested: mapCollabRole(r.role_requested),
        message: r.message,
        status: mapAccessStatus(r.status),
        createdAt: safeDate(r.created_at),
      })),
      skipDuplicates: true,
    })
  )
}

async function migrateComments() {
  type SqlComment = {
    id: number; project_id: number; user_id: number
    row_ref: string | null; content: string; resolved: number; created_at: string
  }
  const rows = sqlite.prepare('SELECT * FROM project_comments ORDER BY id').all() as SqlComment[]

  await runBatch('project_comments', rows, (batch) =>
    prisma.projectComment.createMany({
      data: batch.map((c) => ({
        id: c.id,
        projectId: c.project_id,
        userId: c.user_id,
        rowRef: c.row_ref,
        content: c.content,
        resolved: Boolean(c.resolved),
        createdAt: safeDate(c.created_at),
      })),
      skipDuplicates: true,
    })
  )
}

async function migrateContractors() {
  type SqlContractor = {
    id: number; type: string; name: string; contact_name: string | null
    phone: string | null; phone2: string | null; email: string | null
    address: string | null; district: string | null; city: string
    specialty: string | null; work_scope: string | null; tax_code: string | null
    bank_account: string | null; bank_name: string | null; rating: number
    rating_note: string | null; project_count: number; total_value: number
    last_project_at: string | null; price_notes: string | null
    status: string; note: string | null; created_by: number | null
    created_at: string; updated_at: string
  }
  const rows = sqlite.prepare('SELECT * FROM contractors ORDER BY id').all() as SqlContractor[]

  await runBatch('contractors', rows, (batch) =>
    prisma.contractor.createMany({
      data: batch.map((c) => ({
        id: c.id,
        type: mapContractorType(c.type),
        name: c.name,
        contactName: c.contact_name,
        phone: c.phone,
        phone2: c.phone2,
        email: c.email,
        address: c.address,
        district: c.district,
        city: c.city ?? 'Hà Nội',
        // specialty stored as JSON string in SQLite
        specialty: c.specialty ? safeJson<string[]>(c.specialty, []) : null,
        workScope: c.work_scope,
        taxCode: c.tax_code,
        bankAccount: c.bank_account,
        bankName: c.bank_name,
        rating: c.rating ?? 3,
        ratingNote: c.rating_note,
        projectCount: c.project_count ?? 0,
        totalValue: c.total_value ?? 0,
        lastProjectAt: c.last_project_at ? safeDate(c.last_project_at) : null,
        priceNotes: c.price_notes ? safeJson(c.price_notes, null) : null,
        status: mapContractorStatus(c.status),
        note: c.note,
        createdById: c.created_by,
        createdAt: safeDate(c.created_at),
        updatedAt: safeDate(c.updated_at),
      })),
      skipDuplicates: true,
    })
  )
}

async function migrateContractorDrafts() {
  type SqlDraft = {
    id: number; contractor_id: number | null; submitted_by: number
    reviewed_by: number | null; payload: string; status: string
    admin_note: string | null; created_at: string; updated_at: string
    submitted_at: string | null; reviewed_at: string | null
  }
  const rows = sqlite.prepare('SELECT * FROM contractor_drafts ORDER BY id').all() as SqlDraft[]

  await runBatch('contractor_drafts', rows, (batch) =>
    prisma.contractorDraft.createMany({
      data: batch.map((d) => ({
        id: d.id,
        contractorId: d.contractor_id,
        submittedBy: d.submitted_by,
        reviewedBy: d.reviewed_by,
        payload: safeJson(d.payload, {}),
        status: mapStatus(d.status),
        adminNote: d.admin_note,
        createdAt: safeDate(d.created_at),
        updatedAt: safeDate(d.updated_at),
        submittedAt: d.submitted_at ? safeDate(d.submitted_at) : null,
        reviewedAt: d.reviewed_at ? safeDate(d.reviewed_at) : null,
      })),
      skipDuplicates: true,
    })
  )
}

async function migrateQuotations() {
  type SqlQuotation = {
    id: number; user_id: number; name: string; contractors: string
    rows: string; status: string; admin_note: string | null
    created_at: string; updated_at: string
  }
  const items = sqlite.prepare('SELECT * FROM quotations ORDER BY id').all() as SqlQuotation[]

  await runBatch('quotations', items, (batch) =>
    prisma.quotation.createMany({
      data: batch.map((q) => ({
        id: q.id,
        userId: q.user_id,
        name: q.name,
        contractors: safeJson(q.contractors, ['', '', '']),
        rows: safeJson(q.rows, []),
        status: mapStatus(q.status),
        adminNote: q.admin_note,
        createdAt: safeDate(q.created_at),
        updatedAt: safeDate(q.updated_at),
      })),
      skipDuplicates: true,
    })
  )
}

async function migrateNotifications() {
  type SqlNotif = {
    id: number; user_id: number; type: string; title: string; body: string
    link: string | null; meta: string; is_read: number; created_at: string
  }
  const rows = sqlite.prepare('SELECT * FROM notifications ORDER BY id').all() as SqlNotif[]

  await runBatch('notifications', rows, (batch) =>
    prisma.notification.createMany({
      data: batch.map((n) => ({
        id: n.id,
        userId: n.user_id,
        type: mapNotifType(n.type) as never,
        title: n.title,
        body: n.body,
        link: n.link,
        meta: safeJson(n.meta, {}),
        isRead: Boolean(n.is_read),
        createdAt: safeDate(n.created_at),
      })),
      skipDuplicates: true,
    })
  )
}

async function migratePriceProfiles() {
  type SqlProfile = {
    id: number; user_id: number; region: string; prices: string; updated_at: string
  }
  const rows = sqlite.prepare('SELECT * FROM user_price_profiles ORDER BY id').all() as SqlProfile[]

  await runBatch('user_price_profiles', rows, (batch) =>
    prisma.userPriceProfile.createMany({
      data: batch.map((p) => ({
        id: p.id,
        userId: p.user_id,
        region: p.region ?? 'hanoi',
        prices: safeJson(p.prices, {}),
        updatedAt: safeDate(p.updated_at),
      })),
      skipDuplicates: true,
    })
  )
}

async function migratePriceOverrides() {
  type SqlOverride = {
    id: number; project_id: number; prices: string; updated_at: string
  }
  const rows = sqlite.prepare('SELECT * FROM project_price_overrides ORDER BY id').all() as SqlOverride[]

  await runBatch('project_price_overrides', rows, (batch) =>
    prisma.projectPriceOverride.createMany({
      data: batch.map((o) => ({
        id: o.id,
        projectId: o.project_id,
        prices: safeJson(o.prices, {}),
        updatedAt: safeDate(o.updated_at),
      })),
      skipDuplicates: true,
    })
  )
}

async function migrateEstimateTemplates() {
  type SqlTemplate = {
    id: number; name: string; category: string; description: string | null
    snapshot: string; is_active: number; created_by: number | null
    created_at: string; updated_at: string
  }
  // Check if table exists
  const tableExists = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='estimate_templates'")
    .get()
  if (!tableExists) { console.log('  estimate_templates: table not found in SQLite (skipped)'); return }

  const rows = sqlite.prepare('SELECT * FROM estimate_templates ORDER BY id').all() as SqlTemplate[]

  await runBatch('estimate_templates', rows, (batch) =>
    prisma.estimateTemplate.createMany({
      data: batch.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category ?? 'nha-pho',
        description: t.description,
        snapshot: t.snapshot,
        isActive: Boolean(t.is_active),
        createdById: t.created_by,
        createdAt: safeDate(t.created_at),
        updatedAt: safeDate(t.updated_at),
      })),
      skipDuplicates: true,
    })
  )
}

// ── Reset PostgreSQL sequences after bulk insert with explicit IDs ─────────

async function resetSequences() {
  const tables = [
    { seq: 'users_id_seq',                        table: 'users' },
    { seq: 'sessions_id_seq',                     table: 'sessions' },
    { seq: 'projects_id_seq',                     table: 'projects' },
    { seq: 'project_collaborators_id_seq',        table: 'project_collaborators' },
    { seq: '"ProjectAccessRequest_id_seq"',       table: '"ProjectAccessRequest"' },
    { seq: '"ProjectComment_id_seq"',             table: '"ProjectComment"' },
    { seq: 'contractors_id_seq',                  table: 'contractors' },
    { seq: '"ContractorDraft_id_seq"',            table: '"ContractorDraft"' },
    { seq: 'quotations_id_seq',                   table: 'quotations' },
    { seq: 'notifications_id_seq',                table: 'notifications' },
    { seq: '"UserPriceProfile_id_seq"',           table: '"UserPriceProfile"' },
    { seq: '"ProjectPriceOverride_id_seq"',       table: '"ProjectPriceOverride"' },
    { seq: '"EstimateTemplate_id_seq"',           table: '"EstimateTemplate"' },
  ]

  for (const { seq, table } of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM ${table}), 1))`
      )
    } catch {
      // Ignore — sequence name may differ based on Prisma migration
    }
  }
  console.log('  Sequences reset')
}

// ── Seed default users if DB was empty ────────────────────────────────────

async function seedDefaultUsersIfEmpty() {
  const count = await prisma.user.count()
  if (count > 0) return

  console.log('  No users found — seeding default dev accounts...')
  const bcrypt = await import('bcryptjs')
  await prisma.user.createMany({
    data: [
      {
        username: 'admin',
        passwordHash: bcrypt.hashSync('Admin@2024', 10),
        role: 'ADMIN',
        maxSessions: 5,
      },
      {
        username: 'user1',
        passwordHash: bcrypt.hashSync('User1@2024', 10),
        role: 'USER',
        maxSessions: 2,
      },
    ],
  })
  console.log('  Seeded: admin / Admin@2024, user1 / User1@2024')
  console.log('  ⚠  Change these passwords immediately after first login!')
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== MECALC Migration: SQLite → PostgreSQL ===')
  console.log(`SQLite source: ${SQLITE_PATH}`)
  console.log(`PostgreSQL target: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`)
  console.log()

  // Check if SQLite has data
  const userCount = (sqlite.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c
  if (userCount === 0) {
    console.log('SQLite database is empty — seeding default users into PostgreSQL.')
    await seedDefaultUsersIfEmpty()
    return
  }

  console.log(`Found ${userCount} users in SQLite. Starting migration...`)
  console.log()

  // Run in dependency order
  await migrateUsers()
  await migrateSessions()
  await migrateProjects()
  await migrateCollaborators()
  await migrateAccessRequests()
  await migrateComments()
  await migrateContractors()
  await migrateContractorDrafts()
  await migrateQuotations()
  await migrateNotifications()
  await migratePriceProfiles()
  await migratePriceOverrides()
  await migrateEstimateTemplates()

  console.log()
  console.log('Resetting PostgreSQL auto-increment sequences...')
  await resetSequences()

  console.log()
  console.log('✓ Migration complete!')
  console.log()
  console.log('Next steps:')
  console.log('  1. Verify data: psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"')
  console.log('  2. Test login on new Next.js app')
  console.log('  3. Decommission old SQLite server')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    sqlite.close()
    await prisma.$disconnect()
  })
