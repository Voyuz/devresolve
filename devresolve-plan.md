# DevResolve — Implementation Plan
## IBM Bob 2.0 Hackathon

**One-liner:** "DevResolve turns a bug report into a validated fix by orchestrating the developer workflow and using IBM Bob as the engineering agent that investigates, fixes, and tests the real codebase."

**Workflow utama:**
```
Report → Triage → Project/Repo Mapping → IBM Bob Investigate → Fix → Test → Retry → Human Review → Resolved
```

---

## ⚡ PERHATIAN PENTING SEBELUM MULAI (Baca Semua Member)

### 1. Setup Akun IBM Bob — WAJIB Sebelum Mulai Coding
- Pastikan semua member sudah memiliki **IBMid** (gunakan email yang didaftarkan ke lablab.ai)
- Setelah dapat email invite dari IBM (`ibm-hackathon-lablab`), switch akun di Bob IDE:
  - `Settings → General` → pilih akun `ibm-hackathon-lablab`, region `us-east`
  - **JANGAN gunakan akun Bob personal** — Bobcoins pribadi akan terkuras
- Cek dan update versi Bob IDE ke **v2.0.2 atau lebih baru**
  - v1.0.3 dan v2.0.0 berhenti bekerja per 30 September

### 2. Bobcoins: 40 Koin Total untuk Seluruh Tim
Setiap interaksi AI di Bob membakar Bobcoins. Total alokasi **40 koin** untuk seluruh tim.

| Member | Alokasi | Task Bob yang Diprioritaskan |
|---|---|---|
| Member 1 | ~5 koin | Generate komponen UI, review layout |
| Member 2 | ~5 koin | Scaffold issue form, status logic |
| Member 3 | ~7 koin | Generate schema SQL, scaffold API routes |
| Member 4 | ~5 koin | Generate project UI, form components |
| Member 5 | ~10 koin | **INTI**: Investigate codebase, fix bug, test loop |
| Member 6 | ~8 koin | Demo repo investigation, bug scenario analysis |

**Aturan hemat Bobcoins:**
- Gunakan Bob untuk task yang butuh **agentic behavior** (explore codebase, investigate, fix, test)
- Jangan gunakan untuk task trivial: buat file kosong, rename variabel, copy-paste boilerplate
- Monitor usage di `Settings → General` secara berkala

### 3. bob_sessions — Screenshot Wajib, Jangan Ditunda!
**Cara screenshot yang benar (per sesi Bob):**
1. Bob IDE → buka panel **Tasks**
2. Pilih task yang selesai → klik **task header**
3. Lihat **Session Consumption Summary**
4. Screenshot → simpan sebagai PNG
5. Upload ke folder `bob_sessions/` dengan nama: `memberXX_taskXX_deskripsi_summary.png`

> ⚠️ Ini adalah **required deliverable** untuk eligibilitas judging. Lakukan segera setelah setiap sesi — jangan tunggu akhir hackathon!

### 4. Bob Harus Tampil sebagai Core Component (Bukan Asesoris)
Juri menilai seberapa central peran Bob dalam solusi. Yang harus **terlihat dalam demo**:
- **Agent mode** — Bob menjalankan tasks, bukan hanya Q&A
- **Document understanding** — Bob membaca dan memahami file kode
- **Parallel tasks / Subagents** — nilai lebih jika digunakan
- Measurable impact: "hours turned into minutes", "manual steps eliminated"

### 5. Data Compliance
- Semua data dalam demo dan seed harus **fiktif/dummy**
- Tidak boleh menggunakan data client, data perusahaan, atau data personal
- Demo repo mini-shop: gunakan nama produk, harga, user yang sepenuhnya fiktif

---

## Keputusan Desain

- **AI Triage**: Menggunakan IBM Bob (Agent mode) untuk mengklasifikasi issue — Bob membaca deskripsi issue dan mengembalikan category, severity, priority. Output Bob disubmit manual ke endpoint triage.
- **GitHub Integration**: Data repository (URL, branch, project mapping) disimpan manual di Supabase — tidak perlu GitHub API real untuk MVP.
- **Authentication**: Tidak diprioritaskan untuk MVP. Semua halaman dapat diakses tanpa login.
- **Self-resolution loop**: Maksimal 3 iterasi. Status issue berubah ke `needs_human_intervention` jika semua gagal.
- **Bob sebagai Agent**: Setiap task Bob harus menggunakan Agent mode (bukan Chat biasa) agar terlihat agentic behavior yang dinilai juri.

---

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Frontend | Next.js 16 + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| AI Engineering Agent | IBM Bob IDE |
| Repository Storage | Manual di Supabase (URL, branch) |
| Deployment | Vercel |

---

## Database Schema (Supabase)

### Tabel `projects`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
name text NOT NULL
description text
repo_url text
repo_branch text DEFAULT 'main'
live_url text
created_at timestamptz DEFAULT now()
```

### Tabel `issues`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
title text NOT NULL
description text
expected_behavior text
actual_behavior text
error_log text
status text DEFAULT 'open'
  -- open | triaged | in_progress | ready_for_review | resolved | needs_human_intervention
severity text DEFAULT 'medium'
  -- low | medium | high | critical
priority text DEFAULT 'medium'
  -- low | medium | high
category text
  -- frontend | backend | database | auth | performance | other
project_id uuid REFERENCES projects(id)
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```

### Tabel `bob_results`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
issue_id uuid REFERENCES issues(id)
root_cause text
affected_files text[]
fix_summary text
validation_output text
iteration_count int DEFAULT 1
status text DEFAULT 'pending'
  -- pending | pass | fail | needs_human_intervention
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```

### Tabel `reviews`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
issue_id uuid REFERENCES issues(id)
decision text
  -- approved | request_changes
notes text
reviewed_at timestamptz DEFAULT now()
```

---

## Status Issue Lifecycle

```
open → triaged → in_progress → ready_for_review → resolved
                                                 ↓ (reject)
                              needs_human_intervention
```

---

## Sub-Tasks per Member

---

## Member 0 — Supabase Sync + Authentication (Login Page)

**Status: [ ] pending**

### Intent
Menyinkronkan konfigurasi Supabase dari teman yang sudah setup database, lalu membangun halaman login agar developer bisa mengakses DevResolve dengan autentikasi email/password. Ini adalah prerequisite agar session management berjalan di seluruh aplikasi.

### Expected Outcomes
- `lib/supabase/client.ts` dan `lib/supabase/server.ts` terkonfigurasi penuh dengan env vars Supabase
- `middleware.ts` me-refresh session Supabase di setiap request secara otomatis
- `/auth/login` menampilkan form login email + password yang berfungsi
- Setelah login berhasil, user di-redirect ke `/dashboard`
- Setelah logout, user di-redirect ke `/auth/login`
- Halaman `/dashboard`, `/issues`, `/projects` hanya bisa diakses setelah login

### Relevant Context
- [`lib/supabase/client.ts`](lib/supabase/client.ts) — kosong, perlu `createBrowserClient`
- [`lib/supabase/server.ts`](lib/supabase/server.ts) — kosong, perlu `createServerClient` dengan cookies
- [`app/auth/login/page.tsx`](app/auth/login/page.tsx) — kosong, perlu form login
- [`app/auth/register/page.tsx`](app/auth/register/page.tsx) — kosong (opsional MVP)
- [`components/ui/input.tsx`](components/ui/input.tsx) — sudah ada, pakai untuk form fields
- [`components/ui/button.tsx`](components/ui/button.tsx) — sudah ada, pakai untuk submit
- [`components/ui/card.tsx`](components/ui/card.tsx) — sudah ada, pakai sebagai wrapper form
- [`.env.example`](.env.example) — template env vars sudah ada (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- Package yang dibutuhkan: `@supabase/ssr` — **BELUM DIINSTALL**, wajib install sebelum mulai

### Langkah Sinkronisasi dengan Teman
Sebelum coding, minta teman yang setup Supabase untuk memberikan:
1. `NEXT_PUBLIC_SUPABASE_URL` — URL project Supabase
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
3. `SUPABASE_SERVICE_ROLE_KEY` — service role key (untuk server-side saja, **JANGAN** prefix `NEXT_PUBLIC_`)
Masukkan ke file `.env.local` (sudah ada, tidak perlu dibuat baru, tidak perlu dicommit).

### Todo List
- [ ] Dapatkan env vars dari teman (URL, anon key, service role key) → isi ke `.env.local`
- [ ] Install package: `npm install @supabase/ssr`
- [ ] Implementasi `lib/supabase/client.ts` — `createBrowserClient` dengan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Implementasi `lib/supabase/server.ts` — `createServerClient` dengan cookies dari `next/headers`
- [ ] Buat `middleware.ts` di root project — gunakan `createServerClient` untuk refresh session Supabase di setiap request; redirect ke `/auth/login` jika tidak ada session dan route bukan `/auth/*` atau `/`
- [ ] Buat `app/api/auth/callback/route.ts` — handle auth code exchange setelah magic link atau OAuth (diperlukan untuk Supabase auth flow)
- [ ] Buat `components/ui/label.tsx` — komponen label sederhana untuk form fields (belum ada di codebase)
- [ ] Implementasi `app/auth/login/page.tsx`:
  - Form dengan field: email (Input), password (Input type="password")
  - Tombol "Sign In" (Button)
  - Handle error state (tampilkan pesan jika login gagal)
  - Setelah berhasil: `router.push('/dashboard')` atau gunakan Server Action redirect
  - Link ke `/auth/register` untuk pendaftaran baru (opsional)
- [ ] Verifikasi: akses `/dashboard` tanpa login harus redirect ke `/auth/login`
- [ ] Verifikasi: login dengan credentials valid → masuk ke `/dashboard`
- [ ] Verifikasi: login dengan credentials salah → tampilkan pesan error yang jelas

### Catatan Implementasi
- Gunakan `@supabase/ssr` (bukan `@supabase/auth-helpers-nextjs` yang deprecated)
- Method auth: `supabase.auth.signInWithPassword({ email, password })`
- Method logout: `supabase.auth.signOut()` — tambahkan tombol logout di layout nanti
- Untuk MVP: autentikasi tidak harus blocking semua route, tapi idealnya `/dashboard`, `/issues`, `/projects` dijaga middleware
- Server Action lebih direkomendasikan daripada API route untuk form submit di Next.js App Router

---

## Member 1 — Frontend (Dashboard, Issue List, Issue Detail, Theme)

**Status: [ ] pending**

### Intent
Membangun semua tampilan frontend yang bisa dilihat user: dashboard dengan statistik, daftar issue, detail issue, dan dark/light mode yang sudah terpasang.

### Expected Outcomes
- Dashboard `/dashboard` menampilkan: total issues, critical/high count, in progress count, resolved count
- `/issues` menampilkan daftar issue dalam bentuk tabel dengan badge status/severity/priority
- `/issues/[id]` menampilkan detail issue termasuk Bob result dan review jika ada
- Dark/light mode berfungsi di semua halaman

### Relevant Context
- [`app/dashboard/page.tsx`](app/dashboard/page.tsx) — saat ini stub, ganti dengan dashboard real
- [`app/issues/page.tsx`](app/issues/page.tsx) — saat ini stub, ganti dengan tabel issues
- [`app/issues/[id]/page.tsx`](app/issues/[id]/page.tsx) — saat ini stub, ganti dengan detail view
- [`components/layout/placeholder-page.tsx`](components/layout/placeholder-page.tsx) — hapus pemakaian ini
- [`components/ui/`](components/ui/) — gunakan Button, Card, Table, Badge yang sudah ada
- [`components/theme-toggle.tsx`](components/theme-toggle.tsx) — sudah siap pakai

### Todo List
- [ ] Buat komponen `components/dashboard/StatsCard.tsx` — card untuk menampilkan 1 metrik (total, critical, in_progress, resolved)
- [ ] Buat komponen `components/dashboard/IssuesByStatus.tsx` — ringkasan issue per status
- [ ] Implementasi `app/dashboard/page.tsx` — fetch stats dari `/api/dashboard/stats`, tampilkan 4 StatsCard
- [ ] Buat komponen `components/issues/IssueTable.tsx` — tabel issues dengan kolom: title, status badge, severity badge, priority badge, project, created_at
- [ ] Buat komponen `components/issues/StatusBadge.tsx` dan `SeverityBadge.tsx` — badge dengan warna sesuai nilai
- [ ] Implementasi `app/issues/page.tsx` — fetch list dari `/api/issues`, tampilkan IssueTable, tambah tombol "New Issue"
- [ ] Buat komponen `components/issues/IssueDetail.tsx` — section info utama issue
- [ ] Buat komponen `components/issues/BobResultCard.tsx` — tampilkan root_cause, affected_files, fix_summary, validation_output, iteration_count
- [ ] Buat komponen `components/issues/ReviewCard.tsx` — tampilkan keputusan review jika ada
- [ ] Implementasi `app/issues/[id]/page.tsx` — fetch issue + bob_result + review, tampilkan semua komponen
- [ ] Pastikan semua halaman menggunakan `components/layout/` untuk konsistensi nav
- [ ] Verifikasi dark/light mode bekerja di semua halaman baru

---

## Member 2 — Issue Workflow (Create Issue, Status Management)

**Status: [ ] pending**

### Intent
Membangun form pembuatan issue dan logika perubahan status issue sesuai workflow probis.

### Expected Outcomes
- `/issues/new` memiliki form lengkap dengan semua field
- Form submit berhasil membuat issue baru di database dengan status `open`
- Tombol "Triage Now" di issue detail men-trigger AI triage
- Developer dapat mengubah status issue secara manual jika diperlukan

### Relevant Context
- [`app/issues/new/page.tsx`](app/issues/new/page.tsx) — saat ini stub, ganti dengan form
- [`components/ui/input.tsx`](components/ui/input.tsx) — gunakan untuk form fields
- [`components/ui/textarea.tsx`](components/ui/textarea.tsx) — untuk description, error_log
- [`app/api/issues/route.ts`](app/api/issues/route.ts) — POST endpoint perlu diimplementasikan
- Types akan didefinisikan di [`types/issues.ts`](types/issues.ts) oleh Member 3

### Todo List
- [ ] Tunggu Member 3 selesai mendefinisikan types di `types/issues.ts` dan `types/project.ts`
- [ ] Buat komponen `components/issues/IssueForm.tsx` — form dengan fields: title, description, expected_behavior, actual_behavior, error_log, project_id (dropdown)
- [ ] Buat client-side validation di IssueForm — title wajib diisi, description minimal 10 karakter
- [ ] Implementasi `app/issues/new/page.tsx` — render IssueForm, handle submit ke POST `/api/issues`
- [ ] Setelah submit berhasil, redirect ke `/issues/[id]` issue yang baru dibuat
- [ ] Buat komponen `components/issues/StatusActions.tsx` — tombol aksi sesuai status saat ini:
  - Status `open`: tampilkan tombol "Run AI Triage"
  - Status `triaged`: tampilkan tombol "Start Investigation" (set ke `in_progress`)
  - Status `in_progress`: tampilkan info "Bob is working..."
  - Status `ready_for_review`: tampilkan panel Human Review
- [ ] Hubungkan tombol "Run AI Triage" ke endpoint `/api/issues/[id]/triage`
- [ ] Tambah tombol "Edit Issue" di issue detail untuk update title/description

---

## Member 3 — Backend / Supabase (Database, API, Types)

**Status: [ ] pending**

### Intent
Ini adalah fondasi seluruh sistem. Member 3 membangun schema database Supabase, mendefinisikan TypeScript types, dan mengimplementasikan semua API routes agar fitur lain dapat berjalan.

### Expected Outcomes
- Semua tabel terbuat di Supabase dengan schema yang benar
- `types/issues.ts` dan `types/project.ts` memiliki semua type yang dibutuhkan
- `lib/supabase/client.ts` dan `lib/supabase/server.ts` terkonfigurasi penuh
- Semua API routes mengembalikan data real dari database

### Relevant Context
- [`lib/supabase/client.ts`](lib/supabase/client.ts) — stub, perlu diimplementasikan
- [`lib/supabase/server.ts`](lib/supabase/server.ts) — stub, perlu diimplementasikan
- [`types/issues.ts`](types/issues.ts) — file kosong
- [`types/project.ts`](types/project.ts) — file kosong
- [`app/api/issues/route.ts`](app/api/issues/route.ts) — return 501, perlu implementasi
- [`app/api/projects/route.ts`](app/api/projects/route.ts) — return 501, perlu implementasi
- [`.env.example`](.env.example) — template env vars Supabase sudah ada

### Todo List
- [ ] Buat SQL schema di Supabase dashboard atau file `docs/schema.sql`:
  - Tabel `projects` (id, name, description, repo_url, repo_branch, live_url, created_at)
  - Tabel `issues` (id, title, description, expected_behavior, actual_behavior, error_log, status, severity, priority, category, project_id, created_at, updated_at)
  - Tabel `bob_results` (id, issue_id, root_cause, affected_files[], fix_summary, validation_output, iteration_count, status, created_at, updated_at)
  - Tabel `reviews` (id, issue_id, decision, notes, reviewed_at)
- [ ] Implementasi `lib/supabase/client.ts` — createBrowserClient dengan env vars
- [ ] Implementasi `lib/supabase/server.ts` — createServerClient dengan cookies
- [ ] Definisikan semua types di `types/issues.ts`:
  - `IssueStatus` enum/type
  - `IssueSeverity` enum/type
  - `IssuePriority` enum/type
  - `IssueCategory` enum/type
  - `Issue` interface (semua field tabel issues)
  - `BobResult` interface (semua field tabel bob_results)
  - `Review` interface (semua field tabel reviews)
- [ ] Definisikan types di `types/project.ts`:
  - `Project` interface (semua field tabel projects)
- [ ] Implementasi `app/api/issues/route.ts`:
  - GET: list semua issues, support query param `?project_id=`, `?status=`
  - POST: create issue baru, set status=`open`
- [ ] Buat `app/api/issues/[id]/route.ts`:
  - GET: fetch single issue dengan join bob_results dan reviews
  - PATCH: update issue (status, severity, priority, category)
- [ ] Buat `app/api/issues/[id]/triage/route.ts` — endpoint POST untuk trigger AI triage (implementasi logikanya kolaborasi dengan Member 5)
- [ ] Implementasi `app/api/projects/route.ts`:
  - GET: list semua projects
  - POST: create project baru
- [ ] Buat `app/api/projects/[id]/route.ts`:
  - GET: fetch single project
  - PATCH: update project
- [ ] Buat `app/api/dashboard/stats/route.ts` — GET: return counts per status
- [ ] Buat `app/api/issues/[id]/review/route.ts` — POST: simpan keputusan review (approved/request_changes + notes)

---

## Member 4 — GitHub / Repository (Project Management UI, Repo Mapping)

**Status: [ ] pending**

### Intent
Membangun halaman manajemen project dan form untuk mendaftarkan repository. Data repo (URL, branch) disimpan manual di Supabase — tidak perlu integrasi GitHub API.

### Expected Outcomes
- `/projects` menampilkan daftar project yang sudah terdaftar
- Form untuk membuat project baru dengan repo URL dan branch
- Issue detail menampilkan project terkait dan link ke repository
- Data project tersimpan di Supabase

### Relevant Context
- [`app/projects/page.tsx`](app/projects/page.tsx) — saat ini stub
- [`app/api/projects/route.ts`](app/api/projects/route.ts) — akan diimplementasikan Member 3
- [`types/project.ts`](types/project.ts) — types akan didefinisikan Member 3
- [`lib/github/`](lib/github/) — folder kosong; untuk MVP tidak perlu GitHub API

### Todo List
- [ ] Tunggu Member 3 selesai `app/api/projects/route.ts` dan `types/project.ts`
- [ ] Buat komponen `components/projects/ProjectCard.tsx` — kartu project: name, description, repo_url, branch, live_url, link ke issues project tersebut
- [ ] Buat komponen `components/projects/ProjectForm.tsx` — form fields: name, description, repo_url, repo_branch (default: main), live_url (opsional)
- [ ] Implementasi `app/projects/page.tsx` — fetch list projects dari `/api/projects`, tampilkan ProjectCard grid, tambah tombol "New Project"
- [ ] Buat `app/projects/new/page.tsx` — render ProjectForm, submit ke POST `/api/projects`
- [ ] Buat `app/projects/[id]/page.tsx` — detail project: info repo, list issues yang terkait project ini
- [ ] Tambahkan link "View Repository" di ProjectCard yang membuka repo_url di tab baru
- [ ] Pastikan dropdown project di IssueForm (Member 2) sudah terhubung ke data real dari `/api/projects`
- [ ] Catat di `lib/github/index.ts` comment bahwa GitHub API integration direncanakan post-MVP

---

## Member 5 — IBM Bob / Agent Workflow (Triage, Investigation, Fix, Retry Loop)

**Status: [ ] pending**

### Intent
Ini adalah inti dari DevResolve yang membedakannya dari chatbot biasa. Member 5 membangun integrasi IBM Bob sebagai engineering agent: AI Triage menggunakan Bob untuk klasifikasi issue, dan Bob Resolution View yang menyimpan output investigasi Bob ke database.

### Expected Outcomes
- Endpoint `/api/issues/[id]/triage` memanggil Bob dan mengembalikan category/severity/priority
- Issue di-update otomatis dengan hasil triage dari Bob
- `bob_sessions/` terisi screenshot Task Session Summary dari setiap sesi Bob
- `lib/bob/` memiliki helper functions untuk menyusun task prompt Bob
- Bob Resolution View di issue detail menampilkan hasil kerja Bob (root_cause, affected_files, fix_summary, validation_output, iterations)
- Status issue berubah sesuai hasil: `ready_for_review` jika pass, `needs_human_intervention` jika semua retry gagal

### Relevant Context
- [`lib/bob/`](lib/bob/) — folder kosong, perlu dibuat helper
- [`app/api/issues/[id]/triage/route.ts`](app/api/issues/[id]/triage/route.ts) — akan dibuat Member 3, diisi logikanya oleh Member 5
- [`bob_sessions/README.md`](bob_sessions/README.md) — naming convention screenshots sudah didefinisikan
- Tabel `bob_results` di Supabase — menyimpan output Bob
- [`types/issues.ts`](types/issues.ts) — `BobResult` type akan didefinisikan Member 3

### Todo List

#### Setup Bob Integration
- [ ] Buat `lib/bob/prompts.ts` — fungsi untuk generate prompt terstruktur:
  - `buildTriagePrompt(issue: Issue): string` — prompt ke Bob untuk klasifikasi category/severity/priority
  - `buildInvestigationPrompt(issue: Issue, project: Project): string` — prompt ke Bob untuk investigate root cause
- [ ] Buat `lib/bob/parser.ts` — fungsi untuk parse response Bob:
  - `parseTriageResponse(response: string): TriageResult` — ekstrak JSON dari response Bob
  - `parseBobResult(response: string): Partial<BobResult>` — ekstrak root_cause, affected_files, fix_summary

#### AI Triage
- [ ] Implementasi logika di `app/api/issues/[id]/triage/route.ts`:
  - Fetch issue dari database
  - Gunakan `buildTriagePrompt` untuk generate task description
  - **Catatan untuk demo**: Karena Bob IDE adalah tool agentic yang dijalankan secara interaktif, triage dapat dilakukan secara manual melalui Bob IDE, lalu hasilnya di-POST ke endpoint ini
  - Endpoint menerima POST body: `{ category, severity, priority }` dari hasil Bob
  - Update issue di database dengan nilai tersebut + set status ke `triaged`

#### Bob Resolution (Manual Trigger via Bob IDE)
- [ ] Buat `lib/bob/session.ts` — helper untuk format dan simpan sesi Bob:
  - `saveBobSession(issueId: string, result: Partial<BobResult>): Promise<void>` — simpan ke tabel `bob_results`
- [ ] Buat `app/api/issues/[id]/bob-result/route.ts`:
  - POST: menerima hasil Bob (root_cause, affected_files, fix_summary, validation_output, iteration_count, status)
  - Simpan ke tabel `bob_results`
  - Update status issue sesuai: jika status=`pass` → issue status jadi `ready_for_review`; jika status=`fail` dan iteration_count >= 3 → issue status jadi `needs_human_intervention`
- [ ] Dokumentasikan di `docs/bob-workflow.md` cara menggunakan Bob IDE untuk investigate dan fix issue, lalu submit hasilnya ke DevResolve

#### Evidence
- [ ] Kumpulkan screenshot Task Session Summary dari setiap sesi Bob ke `bob_sessions/`
- [ ] Nama file sesuai konvensi: `memberXX_taskXX_description_summary.png`
- [ ] Pastikan ada minimal 1 screenshot per member yang menggunakan Bob

---

## Member 6 — Testing + Demo (Demo Repo, Bug Scenarios, Demo Script)

**Status: [ ] pending**

### Intent
Memastikan DevResolve dapat didemokan dengan skenario bug yang realistis. Member 6 menyiapkan demo repository mini-shop dengan bug yang sudah diketahui, membuat test cases, dan menyusun skrip demo.

### Expected Outcomes
- Demo repository "mini-shop" dengan bug yang jelas dan dapat direproduksi
- Skenario demo yang sudah teruji end-to-end: dari report issue sampai resolved
- Demo script yang terstruktur untuk presentasi
- Semua fitur MVP sudah diverifikasi berfungsi sebelum presentasi

### Relevant Context
- [`docs/demo-flow.md`](docs/demo-flow.md) — dokumen awal demo flow sudah ada
- [`bob_sessions/`](bob_sessions/) — perlu screenshot dari sesi demo
- Skenario utama dari ProBis: "Produk dengan stock = 0 masih dapat dibeli"

### Todo List

#### Demo Repository
- [ ] Buat repository GitHub baru: `devresolve-demo-minishop` — aplikasi mini-shop sederhana (Node.js atau Python)
- [ ] Implementasi bug skenario 1: **"Out-of-stock product can still be purchased"** — validasi stock hanya di frontend, backend tidak memvalidasi
- [ ] Tambah bug skenario 2 (cadangan): misalnya "Price calculation doesn't apply discount correctly"
- [ ] Pastikan README demo repo menjelaskan struktur kode dan cara menjalankan

#### Data Seed
- [ ] Buat script seed data Supabase: `docs/seed.sql` atau file TypeScript
  - 2-3 sample projects (termasuk mini-shop)
  - 5-10 sample issues dengan berbagai status untuk menampilkan dashboard yang informatif
  - 2-3 sample bob_results untuk menampilkan Bob Resolution View
  - 1-2 sample reviews

#### Test Cases
- [ ] Buat `docs/test-cases.md` dengan test cases manual:
  - Create issue → verifikasi muncul di list
  - Triage issue → verifikasi category/severity/priority ter-update
  - Bob result submitted → verifikasi status berubah ke `ready_for_review`
  - Human review approve → verifikasi status berubah ke `resolved`
  - Human review request_changes → verifikasi developer bisa update
- [ ] Jalankan semua test cases dan catat hasilnya

#### Demo Script
- [ ] Update `docs/demo-flow.md` dengan skrip demo lengkap 5-7 menit:
  1. Buka DevResolve, tunjukkan dashboard (statistik issues)
  2. Buat issue baru: "Out-of-stock product can still be purchased"
  3. Run AI Triage → tunjukkan category=Backend, severity=High, priority=High
  4. Tunjukkan Project mapping ke mini-shop repo
  5. Buka Bob IDE, beri task investigation ke Bob, tunjukkan Bob bekerja
  6. Submit Bob result ke DevResolve, tunjukkan Bob Resolution View
  7. Developer review hasil, klik Approve
  8. Tunjukkan issue berubah ke Resolved di dashboard
- [ ] Verifikasi `typecheck` dan `build` lulus: `npm run typecheck && npm run build`
- [ ] Rekam video demo atau siapkan live demo

---

## Urutan Implementasi yang Disarankan

```
Member 3 (Types + Schema + API) ← MULAI DULUAN, semua bergantung pada ini
    ↓
Member 1 (Frontend UI) + Member 2 (Issue Form) + Member 4 (Projects UI)
    ↓
Member 5 (Bob Integration)
    ↓
Member 6 (Demo + Testing)
```

**Member 3 harus menyelesaikan paling tidak:**
1. `types/issues.ts` dan `types/project.ts`
2. `lib/supabase/client.ts` dan `lib/supabase/server.ts`
3. `app/api/issues/route.ts` (GET + POST)
4. `app/api/projects/route.ts` (GET + POST)

...sebelum Member 1, 2, 4 bisa memulai integrasi dengan data real.

---

## Bobcoins Usage Guide (Member 5 & 6 terutama)

- **Gunakan Bob untuk task yang menunjukkan agentic behavior**: investigate codebase, find root cause, implement fix
- **Jangan habiskan untuk task trivial**: setup file, rename variabel
- **Screenshot setiap sesi Bob**: simpan di `bob_sessions/` sebelum sesi berakhir
- **Naming**: `memberXX_taskXX_deskripsi-singkat_summary.png`
- Setiap member idealnya memiliki minimal 1 screenshot Bob session yang relevan dengan peran mereka

---

## Checklist Final Sebelum Submission

- [ ] `npm run typecheck` — tidak ada error TypeScript
- [ ] `npm run build` — build berhasil
- [ ] Dashboard menampilkan data real dari Supabase
- [ ] Issue lifecycle lengkap: open → triaged → in_progress → ready_for_review → resolved
- [ ] Bob Resolution View menampilkan root_cause, affected_files, fix_summary
- [ ] Human Review (Approve / Request Changes) berfungsi
- [ ] `bob_sessions/` memiliki screenshot dari semua member
- [ ] `AGENTS.md` dan `bob_sessions/` ada di repository (artifact wajib hackathon)
- [ ] README.md diupdate dengan cara menjalankan project
- [ ] Demo script sudah ditest end-to-end
