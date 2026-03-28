#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/bootstrap.sh — One-command setup from a fresh clone
#
# Usage: bash scripts/bootstrap.sh
#
# This script:
#   1. Validates Node.js and npm versions
#   2. Generates package-lock.json (if missing or hollow)
#   3. Installs all dependencies via npm ci (or npm install for first run)
#   4. Generates the Prisma client
#   5. Builds the shared package
#   6. Validates the Prisma schema
#   7. Runs type-checking across all workspaces
#   8. Runs the test suite
#   9. Builds the Next.js app (production build)
#
# If every step passes, the repo is ready to push to GitHub and deploy.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

step=0
total_steps=9
pass_count=0
fail_count=0

header() {
  step=$((step + 1))
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}[$step/$total_steps] $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

pass() {
  pass_count=$((pass_count + 1))
  echo -e "${GREEN}✓ $1${NC}"
}

fail() {
  fail_count=$((fail_count + 1))
  echo -e "${RED}✗ $1${NC}"
}

# ── Step 1: Validate environment ──────────────────────────────────────────────
header "Validate environment"

NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/' || echo "0")
if [ "$NODE_MAJOR" -lt 20 ]; then
  fail "Node.js >= 20 required (found: $(node -v 2>/dev/null || echo 'not installed'))"
  echo "Install via: nvm install 20 && nvm use 20"
  exit 1
fi
pass "Node.js $(node -v)"

NPM_MAJOR=$(npm -v 2>/dev/null | sed 's/\([0-9]*\).*/\1/' || echo "0")
if [ "$NPM_MAJOR" -lt 10 ]; then
  fail "npm >= 10 required (found: $(npm -v 2>/dev/null || echo 'not installed'))"
  exit 1
fi
pass "npm $(npm -v)"

# ── Step 2: Generate lockfile ─────────────────────────────────────────────────
header "Generate package-lock.json"

LOCK_LINES=0
if [ -f package-lock.json ]; then
  LOCK_LINES=$(wc -l < package-lock.json)
fi

if [ "$LOCK_LINES" -lt 100 ]; then
  echo "Lockfile missing or incomplete ($LOCK_LINES lines). Generating..."
  rm -f package-lock.json
  npm install --package-lock-only --legacy-peer-deps
  NEW_LINES=$(wc -l < package-lock.json)
  pass "Generated package-lock.json ($NEW_LINES lines)"
else
  pass "package-lock.json exists ($LOCK_LINES lines)"
fi

# ── Step 3: Install dependencies ──────────────────────────────────────────────
header "Install dependencies"

if npm ci 2>/dev/null; then
  pass "npm ci succeeded (reproducible install)"
else
  echo "npm ci failed — falling back to npm install"
  npm install --legacy-peer-deps
  pass "npm install succeeded"
fi

# ── Step 4: Generate Prisma client ────────────────────────────────────────────
header "Generate Prisma client"

npx prisma generate --schema=packages/shared/prisma/schema.prisma
pass "Prisma client generated"

# ── Step 5: Build shared package ──────────────────────────────────────────────
header "Build @arkiol/shared"

npm run build --workspace=packages/shared
pass "@arkiol/shared built"

# ── Step 6: Validate Prisma schema ────────────────────────────────────────────
header "Validate Prisma schema"

npx prisma validate --schema=packages/shared/prisma/schema.prisma
pass "Schema valid"

# ── Step 7: Type-check ────────────────────────────────────────────────────────
header "Type-check all workspaces"

if npm run type-check --workspace=packages/shared; then
  pass "packages/shared type-check"
else
  fail "packages/shared type-check"
fi

if npm run type-check --workspace=apps/arkiol-core; then
  pass "apps/arkiol-core type-check"
else
  fail "apps/arkiol-core type-check"
fi

if npm run type-check --workspace=apps/animation-studio/backend; then
  pass "apps/animation-studio/backend type-check"
else
  fail "apps/animation-studio/backend type-check"
fi

# ── Step 8: Run tests ─────────────────────────────────────────────────────────
header "Run tests"

if npm test --workspaces --if-present 2>&1; then
  pass "All tests passed"
else
  fail "Some tests failed (check output above)"
fi

# ── Step 9: Production build ──────────────────────────────────────────────────
header "Production build"

# Set stub env vars for build (only if not already set)
export DATABASE_URL="${DATABASE_URL:-postgresql://build:build@localhost:5432/build}"
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-bootstrap-placeholder-secret-at-least-32-chars}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}"
export SKIP_DB_MIGRATE="${SKIP_DB_MIGRATE:-true}"

if npm run build --workspace=apps/arkiol-core; then
  pass "Next.js production build"
else
  fail "Next.js production build"
fi

if npm run build --workspace=apps/animation-studio/backend; then
  pass "Animation Studio backend build"
else
  fail "Animation Studio backend build"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}BOOTSTRAP COMPLETE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Passed: $pass_count${NC}"
if [ "$fail_count" -gt 0 ]; then
  echo -e "  ${RED}Failed: $fail_count${NC}"
fi
echo ""

if [ "$fail_count" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}ALL CHECKS PASSED — ready to push to GitHub and deploy to Vercel${NC}"
  echo ""
  echo "Next steps:"
  echo "  git add -A"
  echo "  git commit -m 'production-ready'"
  echo "  git push origin main"
  echo ""
  echo "  Then import in Vercel and add env vars (see DEPLOY.md)"
else
  echo -e "${YELLOW}${BOLD}SOME CHECKS FAILED — review the output above before deploying${NC}"
  exit 1
fi
