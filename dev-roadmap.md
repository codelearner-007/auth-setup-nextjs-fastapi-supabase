# BookVault — Development Roadmap
# Current Phase Continuation Guide

> **Purpose:** Single source of truth for continuing development from the current state.
> Cross-reference with `project-claude.md` (full spec) and `realproject.md` (Manager.io behavior docs).
> **Never recreate tables or columns listed under "Already Built".**

---

## Established Patterns (Follow These, Don't Deviate)

| Concern | Pattern |
|---|---|
| Line items | **JSONB `lines` column** on the parent table (not separate `_lines` tables). Already set in `receipts`. Keep consistent. |
| Primary keys | `uuid_generate_v7()` |
| Timestamps | `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ` + `handle_updated_at()` trigger |
| Soft delete | `deleted_at TIMESTAMPTZ NULL` on transactional tables |
| Monetary values | `NUMERIC(15, 2)` (project uses 2 dp in practice, spec says 4 — keep 2 for consistency with existing tables) |
| RLS | `service_role_all` policy only — backend accesses via service_role |
| Migration naming | `YYYYMMDDNNNNNN_description.sql` — always `ls supabase/migrations/` first to get next seq |

---

## Double-Entry Accounting Rules (Journal Posting — REQUIRED for every module)

Every transactional save (create/edit/delete) MUST call a shared `post_journal_entry()` service function.
The Summary tab reads directly from `journal_lines` — there is no separate balance calculation.

### System Accounts (auto-created when first record of that type is added)

| Trigger | System Account Created | Type |
|---|---|---|
| First bank/cash account added | Cash & Cash Equivalents | Asset |
| First bank/cash account added | Inter Account Transfers | Equity |
| First customer added | Accounts Receivable | Asset |
| First supplier added | Accounts Payable | Liability |
| First tax code added | Tax Payable | Liability |
| First employee added | Employee Clearing Account | Liability |
| First inventory item added | Inventory on Hand | Asset |
| First fixed asset added | Fixed Assets at Cost | Asset |
| First fixed asset added | Fixed Assets - Accumulated Depreciation | Asset (contra) |

### Journal Entry Rules Per Module

#### Receipts
```
DEBIT  Bank Account (asset ↑)
CREDIT Income account(s) on receipt lines (revenue ↑)
CREDIT Tax Payable — tax portion (liability ↑)
```
If receipt clears a sales invoice:
```
DEBIT  Bank Account (asset ↑)
CREDIT Accounts Receivable (asset ↓)   ← clears the invoice
```

#### Payments
```
DEBIT  Expense account(s) on payment lines (expense ↑)
DEBIT  Tax Payable — reclaimable tax (liability ↓)
CREDIT Bank Account (asset ↓)
```
If payment clears a purchase invoice:
```
DEBIT  Accounts Payable (liability ↓)  ← clears the invoice
CREDIT Bank Account (asset ↓)
```

#### Sales Invoice Created
```
DEBIT  Accounts Receivable (asset ↑)   ← full invoice total
CREDIT Income account(s) on lines (revenue ↑)
CREDIT Tax Payable — tax portion (liability ↑)
```
→ Accounts Receivable appears under Assets on Summary tab automatically.

#### Sales Invoice Paid (via Receipt)
```
DEBIT  Bank Account (asset ↑)
CREDIT Accounts Receivable (asset ↓)   ← balance clears from Summary
```

#### Purchase Invoice Created
```
DEBIT  Expense / Inventory account(s) on lines (expense/asset ↑)
CREDIT Accounts Payable (liability ↑)  ← appears under Liabilities on Summary
```
→ Accounts Payable balance shows automatically in Summary tab under Liabilities.

#### Purchase Invoice Paid (via Payment)
```
DEBIT  Accounts Payable (liability ↓)  ← clears from Summary
CREDIT Bank Account (asset ↓)
```

#### Inter-Account Transfer
```
DEBIT  Destination bank account COA (asset ↑)
CREDIT Source bank account COA (asset ↓)
Via:   Inter Account Transfers account (nets to zero — no P&L impact)
```

#### Payslip
```
DEBIT  Salary Expense accounts (expense ↑)
CREDIT Employee Clearing Account (liability ↑)
```
When payment made to employee:
```
DEBIT  Employee Clearing Account (liability ↓)
CREDIT Bank Account (asset ↓)
```

#### Depreciation Entry
```
DEBIT  Depreciation Expense account (expense ↑)
CREDIT Fixed Assets - Accumulated Depreciation (asset contra ↑)
```
→ Book value decreases on Balance Sheet automatically.

#### Credit Note (Sales)
```
DEBIT  Income account(s) (revenue ↓)
CREDIT Accounts Receivable (asset ↓)  ← or Bank if refund paid directly
```

#### Debit Note (Purchase)
```
DEBIT  Accounts Payable (liability ↓)
CREDIT Expense account(s) (expense ↓)
```

### Implementation Pattern (Backend)

Every service's `create()`, `update()`, `delete()` must:
1. Write/update the main record
2. Call `journal_service.post_entry(source_type, source_id, lines)` in the same DB transaction
3. Update any cached balance columns (`customers.cached_balance`, `bank_accounts.current_balance`, etc.)
4. If delete/void: reverse the original journal entry (post equal and opposite lines)

```python
# Every module service follows this pattern:
async def create_purchase_invoice(data, db):
    async with db.begin():
        invoice = await invoice_repo.create(data, db)
        await journal_service.post_entry(
            source_type='purchase_invoice',
            source_id=invoice.id,
            lines=[
                {'account_id': expense_account_id, 'debit': amount},
                {'account_id': accounts_payable_id, 'credit': amount},
            ],
            db=db
        )
        await supplier_repo.update_cached_balance(supplier_id, +amount, db)
    return invoice
```
| API routing | Frontend → `/api/v1/*` → FastAPI (never `localhost:8000` in frontend) |
| Backend pattern | Router → Service → Repository → DB |
| Frontend files | `.jsx` only, no `.ts`/`.tsx` |

---

## What Is Already Built (DO NOT recreate)

### Database Tables (exist in Supabase)

| Table | Key Columns Already Present |
|---|---|
| `businesses` | id, name, address, city, state, country, phone, email, tax_number, logo_path, currency, date_format, is_active, created_at, updated_at, deleted_at, ui_preferences |
| `coa_accounts` | id, business_id, code, name, type (asset/liability/equity/income/expense/total), parent_id, is_system, description, is_active, sort_order, created_at, updated_at |
| `coa_groups` | id, business_id, name, type, parent_group_id, sort_order, created_at, updated_at |
| `bank_accounts` | id, business_id, coa_account_id, name, account_type (bank/cash), opening_balance, current_balance, description, created_at, updated_at |
| `customers` | id, business_id, name, code, billing_address, delivery_address, email, created_at, updated_at |
| `suppliers` | id, business_id, name, code, billing_address, delivery_address, email, created_at, updated_at |
| `receipts` | id, business_id, date, reference, paid_by_type, paid_by_contact_id, paid_by_contact_type, paid_by_other, received_in_account_id, description, lines (JSONB), show_line_number, show_description, show_qty, show_discount, image_url, created_at, updated_at |
| `admin_tabs` | id, key, label, icon, sort_order, is_active |
| `business_tab_columns` | id, business_id, tab_key, column_key, is_visible, sort_order |
| `roles` | id, name, hierarchy, is_system |
| `permissions` | id, module, action, description |
| `role_permissions` | role_id, permission_id |
| `user_roles` | user_id, role_id, business_id |

### Backend Files (exist — do not recreate)

**Models:** admin_tab, audit_log, bank_account, business, business_details, business_format, business_tab, business_tab_column, coa_account, coa_group, customer, permission, receipt, role, role_permission, supplier, user_profile, user_role

**Services:** audit, bank_account, business, coa, customer, dashboard, permission, profile, receipt, role, supplier, tab_columns, user_role, user

**Repositories:** audit, bank_account, base, business, coa, customer, dashboard, permission, profile, receipt, role, supplier, tab_columns, user, user_role

**API Routes (`/api/v1/`):** admin_tabs, audit, auth, bank_accounts, businesses, coa, customers, dashboard, modules, permissions, profile, receipts, roles, suppliers, suspense, tab_columns, user_roles, users

**Frontend Services:** api-client, api-utils, audit.service, auth.service, bank-accounts.service, business.service, coa.service, customers.service, dashboard.service, modules.service, rbac.service, receipts.service, suppliers.service, suspense.service, user.service

---

## Columns to ADD to Existing Tables (via ALTER TABLE migrations)

These columns are in the spec but missing from current tables. Add them as needed when the feature that requires them is being built — not all at once.

### `bank_accounts` — add when building Phase 2
```sql
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS account_number    TEXT,
  ADD COLUMN IF NOT EXISTS bank_name         TEXT,
  ADD COLUMN IF NOT EXISTS cleared_balance   NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_deposits  NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reconciliation_date DATE,
  ADD COLUMN IF NOT EXISTS sort_order        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at        TIMESTAMPTZ;
-- account_type: extend CHECK to include 'credit_card', 'other'
-- (drop old constraint, add new one)
```

### `customers` — add when building Phase 3 (Sales)
```sql
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS city               TEXT,
  ADD COLUMN IF NOT EXISTS state              TEXT,
  ADD COLUMN IF NOT EXISTS postal_code        TEXT,
  ADD COLUMN IF NOT EXISTS tax_number         TEXT,
  ADD COLUMN IF NOT EXISTS credit_limit       NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER,
  ADD COLUMN IF NOT EXISTS website            TEXT,
  ADD COLUMN IF NOT EXISTS notes              TEXT,
  ADD COLUMN IF NOT EXISTS cached_balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at         TIMESTAMPTZ;
```

### `suppliers` — add when building Phase 4 (Purchase)
```sql
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS city               TEXT,
  ADD COLUMN IF NOT EXISTS state              TEXT,
  ADD COLUMN IF NOT EXISTS postal_code        TEXT,
  ADD COLUMN IF NOT EXISTS tax_number         TEXT,
  ADD COLUMN IF NOT EXISTS credit_limit       NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER,
  ADD COLUMN IF NOT EXISTS website            TEXT,
  ADD COLUMN IF NOT EXISTS notes              TEXT,
  ADD COLUMN IF NOT EXISTS cached_balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at         TIMESTAMPTZ;
```

---

## Development Phases

Each phase = one full module delivered end-to-end:
DB migration → Backend (model/repo/service/router) → Frontend (list page + form) → E2E test.

**One module at a time. Complete each phase before starting the next.**

---

## Phase 2 — Complete the Banking Module

**Status:** In Progress (Receipts done; Payments, Transfers, Reconciliation pending)

### 2A — Payments

**New table: `payments`**
```
id                      UUID PK uuid_generate_v7()
business_id             UUID FK → businesses.id CASCADE
bank_account_id         UUID FK → bank_accounts.id SET NULL
date                    DATE NOT NULL DEFAULT CURRENT_DATE
reference               TEXT
paid_to_type            TEXT NOT NULL DEFAULT 'Contact'  -- 'Contact' | 'Other'
paid_to_contact_id      UUID   -- polymorphic: supplier or employee
paid_to_contact_type    TEXT   -- 'supplier' | 'employee'
paid_to_other           TEXT
description             TEXT
lines                   JSONB NOT NULL DEFAULT '[]'  -- same pattern as receipts
show_line_number        BOOLEAN DEFAULT false
show_description        BOOLEAN DEFAULT false
show_qty                BOOLEAN DEFAULT false
show_discount           BOOLEAN DEFAULT false
image_url               TEXT
created_at              TIMESTAMPTZ DEFAULT NOW()
updated_at              TIMESTAMPTZ DEFAULT NOW()
deleted_at              TIMESTAMPTZ
```
Indexes: business_id, bank_account_id, date, paid_to_contact_id

Tab: **Payments** — list columns: date, reference, paid_from (bank account), payee, description, amount
Form: mirrors receipts form (bank account, date, ref, payee, line items)
Backend: payments model/repo/service/router
Frontend: PaymentsTab, NewPaymentDialog, PaymentDetailPanel

**Cache update on payment write:** recalculate `bank_accounts.current_balance`

---

### 2B — Inter-Account Transfers

**New table: `inter_account_transfers`**
```
id                  UUID PK uuid_generate_v7()
business_id         UUID FK → businesses.id CASCADE
date                DATE NOT NULL
reference           TEXT
description         TEXT
from_account_id     UUID FK → bank_accounts.id SET NULL
to_account_id       UUID FK → bank_accounts.id SET NULL
amount              NUMERIC(15,2) NOT NULL
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
deleted_at          TIMESTAMPTZ
```
Indexes: business_id, from_account_id, to_account_id, date

Tab: **Inter-Account Transfers** — sub-page under Bank and Cash Accounts tab
List: date, reference, from account, to account, description, amount
Form: date, from account, to account, amount, reference, description
Cache: update both `from_account` and `to_account` current_balance

---

### 2C — Bank Reconciliation

**New tables: `bank_reconciliations`, `bank_reconciliation_lines`**

`bank_reconciliations`:
```
id                    UUID PK
business_id           UUID FK → businesses.id CASCADE
bank_account_id       UUID FK → bank_accounts.id CASCADE
reconciliation_date   DATE NOT NULL
statement_balance     NUMERIC(15,2) NOT NULL
status                TEXT DEFAULT 'open'  -- 'open' | 'reconciled'
notes                 TEXT
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

`bank_reconciliation_lines`:
```
id                    UUID PK
reconciliation_id     UUID FK → bank_reconciliations.id CASCADE
source_type           TEXT  -- 'receipt' | 'payment' | 'transfer'
source_id             UUID
is_cleared            BOOLEAN DEFAULT false
cleared_date          DATE
created_at            TIMESTAMPTZ
```

Sub-page under Bank and Cash Accounts. Accessible via account row → "Reconcile" button.

---

### 2D — Bank Rules

**New table: `bank_rules`**
```
id                    UUID PK
business_id           UUID FK → businesses.id CASCADE
name                  TEXT NOT NULL
rule_type             TEXT NOT NULL  -- 'payment' | 'receipt'
match_field           TEXT NOT NULL  -- 'description' | 'reference' | 'amount'
match_operator        TEXT NOT NULL  -- 'contains' | 'equals' | 'starts_with' | 'ends_with'
match_value           TEXT NOT NULL
account_id            UUID FK → coa_accounts.id SET NULL
description_override  TEXT
sort_order            INTEGER DEFAULT 0
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
deleted_at            TIMESTAMPTZ
```

Accessible from Settings tab → Bank Rules.
Used by Import Bank Statement and Uncategorized Payments/Receipts.

---

## Phase 3 — Sales Module

**Order of delivery within phase:** Customers (expand) → Sales Invoices → Receipts (link to invoice) → Sales Quotes → Sales Orders → Credit Notes → Delivery Notes → Late Payment Fees → Billable Time → Billable Expenses

### 3A — Expand Customers Table
Add missing columns (see ALTER TABLE block above for customers).
Update customer form to include: phone, city, state, postal_code, tax_number, credit_limit, payment_terms_days, website, notes.

### 3B — Sales Invoices

**New table: `sales_invoices`**
```
id                    UUID PK
business_id           UUID FK → businesses.id CASCADE
invoice_number        TEXT NOT NULL
customer_id           UUID FK → customers.id SET NULL
date                  DATE NOT NULL
due_date              DATE
description           TEXT
status                TEXT DEFAULT 'draft'  -- 'draft'|'sent'|'paid'|'partially_paid'|'overdue'|'cancelled'
lines                 JSONB NOT NULL DEFAULT '[]'
-- DENORMALIZED:
cached_subtotal       NUMERIC(15,2) DEFAULT 0
cached_tax_total      NUMERIC(15,2) DEFAULT 0
cached_total          NUMERIC(15,2) DEFAULT 0
cached_paid_amount    NUMERIC(15,2) DEFAULT 0
cached_balance_due    NUMERIC(15,2) DEFAULT 0
notes                 TEXT
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
deleted_at            TIMESTAMPTZ
```
Indexes: business_id + date, customer_id, status, due_date

JSONB `lines` item shape:
```json
{
  "account_id": "uuid",
  "inventory_item_id": "uuid|null",
  "description": "string",
  "qty": 1,
  "unit_price": 0,
  "discount_percent": 0,
  "tax_rate": 0,
  "tax_amount": 0,
  "line_total": 0
}
```

**Link receipts to invoice:** Add `sales_invoice_id UUID FK → sales_invoices.id` to `receipts` table (ALTER). When a receipt line clears an invoice, update `sales_invoices.cached_paid_amount` and `cached_balance_due`. Also update `customers.cached_balance`.

Tab: **Sales Invoices** — list with status color coding (green/amber/red/gray)

### 3C — Sales Quotes

**New table: `sales_quotes`**
```
id                    UUID PK
business_id           UUID FK → businesses.id CASCADE
quote_number          TEXT NOT NULL
customer_id           UUID FK → customers.id SET NULL
date                  DATE NOT NULL
expiry_date           DATE
description           TEXT
status                TEXT DEFAULT 'active'  -- 'active'|'accepted'|'cancelled'|'expired'
lines                 JSONB NOT NULL DEFAULT '[]'
cached_total          NUMERIC(15,2) DEFAULT 0
notes                 TEXT
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
deleted_at            TIMESTAMPTZ
```

"Convert to Invoice" button on quote detail → pre-fill sales_invoice form.

### 3D — Sales Orders

**New table: `sales_orders`**
```
id                    UUID PK
business_id           UUID FK → businesses.id CASCADE
order_number          TEXT NOT NULL
customer_id           UUID FK → customers.id SET NULL
sales_quote_id        UUID FK → sales_quotes.id SET NULL
date                  DATE NOT NULL
description           TEXT
status                TEXT DEFAULT 'open'  -- 'open'|'partially_invoiced'|'invoiced'|'cancelled'
lines                 JSONB NOT NULL DEFAULT '[]'
cached_order_amount   NUMERIC(15,2) DEFAULT 0
cached_invoice_amount NUMERIC(15,2) DEFAULT 0
notes                 TEXT
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
deleted_at            TIMESTAMPTZ
```

### 3E — Credit Notes

**New table: `credit_notes`**
```
id                    UUID PK
business_id           UUID FK → businesses.id CASCADE
credit_note_number    TEXT NOT NULL
customer_id           UUID FK → customers.id SET NULL
sales_invoice_id      UUID FK → sales_invoices.id SET NULL
date                  DATE NOT NULL
description           TEXT
lines                 JSONB NOT NULL DEFAULT '[]'
cached_total          NUMERIC(15,2) DEFAULT 0
notes                 TEXT
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
deleted_at            TIMESTAMPTZ
```

### 3F — Delivery Notes

**New table: `delivery_notes`**
```
id                    UUID PK
business_id           UUID FK → businesses.id CASCADE
delivery_number       TEXT NOT NULL
customer_id           UUID FK → customers.id SET NULL
sales_order_id        UUID FK → sales_orders.id SET NULL
sales_invoice_id      UUID FK → sales_invoices.id SET NULL
date                  DATE NOT NULL
description           TEXT
lines                 JSONB NOT NULL DEFAULT '[]'  -- [{inventory_item_id, description, qty}]
notes                 TEXT
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
deleted_at            TIMESTAMPTZ
```

### 3G — Late Payment Fees

**New table: `late_payment_fees`**
```
id                    UUID PK
business_id           UUID FK → businesses.id CASCADE
customer_id           UUID FK → customers.id SET NULL
sales_invoice_id      UUID FK → sales_invoices.id SET NULL
date                  DATE NOT NULL
amount                NUMERIC(15,2) NOT NULL
description           TEXT
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
deleted_at            TIMESTAMPTZ
```

### 3H — Billable Time & Expenses

**New table: `billable_time`**
```
id                    UUID PK
business_id           UUID FK → businesses.id CASCADE
customer_id           UUID FK → customers.id SET NULL
date                  DATE NOT NULL
description           TEXT
hours                 NUMERIC(8,2)
hourly_rate           NUMERIC(15,2)
total_amount          NUMERIC(15,2)
status                TEXT DEFAULT 'unbilled'  -- 'unbilled'|'invoiced'|'written_off'
sales_invoice_id      UUID FK → sales_invoices.id SET NULL
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
deleted_at            TIMESTAMPTZ
```

**New table: `billable_expenses`**
```
id                    UUID PK
business_id           UUID FK → businesses.id CASCADE
customer_id           UUID FK → customers.id SET NULL
date                  DATE NOT NULL
description           TEXT
amount                NUMERIC(15,2)
expense_account_id    UUID FK → coa_accounts.id SET NULL
status                TEXT DEFAULT 'unbilled'  -- 'unbilled'|'invoiced'
sales_invoice_id      UUID FK → sales_invoices.id SET NULL
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
deleted_at            TIMESTAMPTZ
```

---

## Phase 4 — Purchase Module

**Order:** Suppliers (expand) → Purchase Invoices → Payments (link to invoice) → Purchase Quotes → Purchase Orders → Debit Notes → Goods Receipts

Mirrors the Sales module. Every table follows the same JSONB lines pattern.

### 4A — Expand Suppliers Table
Add missing columns (see ALTER TABLE block above for suppliers).

### 4B — Purchase Invoices

**New table: `purchase_invoices`**
```
id                    UUID PK
business_id           UUID FK → businesses.id CASCADE
invoice_number        TEXT NOT NULL
supplier_id           UUID FK → suppliers.id SET NULL
date                  DATE NOT NULL
due_date              DATE
description           TEXT
status                TEXT DEFAULT 'unpaid'  -- 'unpaid'|'partially_paid'|'paid'|'overdue'
lines                 JSONB NOT NULL DEFAULT '[]'
cached_subtotal       NUMERIC(15,2) DEFAULT 0
cached_tax_total      NUMERIC(15,2) DEFAULT 0
cached_total          NUMERIC(15,2) DEFAULT 0
cached_paid_amount    NUMERIC(15,2) DEFAULT 0
cached_balance_due    NUMERIC(15,2) DEFAULT 0
notes                 TEXT
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
deleted_at            TIMESTAMPTZ
```

**Link payments to invoice:** Add `purchase_invoice_id UUID FK → purchase_invoices.id` to `payments` table. Update `purchase_invoices.cached_paid_amount` and `suppliers.cached_balance` on payment write.

### 4C — Purchase Quotes

**New table: `purchase_quotes`** — same structure as `sales_quotes` but with `supplier_id` instead of `customer_id`.

### 4D — Purchase Orders

**New table: `purchase_orders`** — same structure as `sales_orders` but with `supplier_id`.

### 4E — Debit Notes

**New table: `debit_notes`** — mirror of `credit_notes` for supplier side.
```
id, business_id, debit_note_number, supplier_id, purchase_invoice_id, date, description, lines JSONB, cached_total, notes, created_at, updated_at, deleted_at
```

### 4F — Goods Receipts

**New table: `goods_receipts`**
```
id                    UUID PK
business_id           UUID FK → businesses.id CASCADE
receipt_number        TEXT NOT NULL
supplier_id           UUID FK → suppliers.id SET NULL
purchase_order_id     UUID FK → purchase_orders.id SET NULL
date                  DATE NOT NULL
description           TEXT
lines                 JSONB NOT NULL DEFAULT '[]'  -- [{inventory_item_id, description, qty, unit_cost}]
notes                 TEXT
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
deleted_at            TIMESTAMPTZ
```

---

## Phase 5 — Inventory Module

**Order:** Locations → Items → Item Locations → Unit Costs → Kits → Transfers → Write-offs → Production Orders

### 5A — Inventory Locations

**New table: `inventory_locations`**
```
id, business_id FK, name TEXT NOT NULL, description TEXT, is_default BOOLEAN DEFAULT false, is_active BOOLEAN DEFAULT true, created_at, updated_at, deleted_at
```

### 5B — Inventory Items

**New table: `inventory_items`**
```
id                        UUID PK
business_id               UUID FK → businesses.id CASCADE
code                      TEXT
name                      TEXT NOT NULL
description               TEXT
unit_of_measure           TEXT
valuation_method          TEXT DEFAULT 'average_cost'  -- 'average_cost'|'fifo'
sales_account_id          UUID FK → coa_accounts.id SET NULL
purchase_account_id       UUID FK → coa_accounts.id SET NULL
cost_of_sales_account_id  UUID FK → coa_accounts.id SET NULL
inventory_account_id      UUID FK → coa_accounts.id SET NULL
default_selling_price     NUMERIC(15,2)
default_purchase_price    NUMERIC(15,2)
reorder_point             NUMERIC(15,2)
is_active                 BOOLEAN DEFAULT true
-- DENORMALIZED:
quantity_on_hand          NUMERIC(15,4) DEFAULT 0
quantity_to_deliver       NUMERIC(15,4) DEFAULT 0
quantity_to_receive       NUMERIC(15,4) DEFAULT 0
average_cost              NUMERIC(15,4) DEFAULT 0
total_value               NUMERIC(15,2) DEFAULT 0
created_at                TIMESTAMPTZ
updated_at                TIMESTAMPTZ
deleted_at                TIMESTAMPTZ
```
Indexes: business_id, code, is_active

### 5C — Inventory Item Locations
```
id, inventory_item_id FK CASCADE, inventory_location_id FK CASCADE, quantity_on_hand NUMERIC(15,4) DEFAULT 0, created_at, updated_at
UNIQUE(inventory_item_id, inventory_location_id)
```

### 5D — Inventory Unit Costs
```
id, business_id FK, inventory_item_id FK CASCADE, effective_date DATE, unit_cost NUMERIC(15,4), notes TEXT, created_at, updated_at
```

### 5E — Inventory Kits
```
id, business_id FK, code TEXT, name TEXT NOT NULL, description TEXT, selling_price NUMERIC(15,2), is_active BOOLEAN DEFAULT true, lines JSONB DEFAULT '[]', created_at, updated_at, deleted_at
-- lines: [{inventory_item_id, qty, sort_order}]
```

### 5F — Inventory Transfers
```
id, business_id FK, transfer_number TEXT, date DATE, from_location_id FK → inventory_locations, to_location_id FK → inventory_locations, description TEXT, lines JSONB DEFAULT '[]', notes TEXT, created_at, updated_at, deleted_at
-- lines: [{inventory_item_id, qty, sort_order}]
```
On save: update `inventory_item_locations` for both from/to locations. Update `inventory_items.quantity_on_hand` if single-location business.

### 5G — Inventory Write-offs
```
id, business_id FK, write_off_number TEXT, date DATE, inventory_location_id FK SET NULL, description TEXT, expense_account_id FK → coa_accounts SET NULL, lines JSONB DEFAULT '[]', cached_total_cost NUMERIC(15,2) DEFAULT 0, notes TEXT, created_at, updated_at, deleted_at
-- lines: [{inventory_item_id, qty, unit_cost, line_cost}]
```

### 5H — Production Orders
```
id, business_id FK, order_number TEXT, date DATE, finished_item_id FK → inventory_items, inventory_location_id FK SET NULL, quantity_produced NUMERIC(15,4), description TEXT, status TEXT DEFAULT 'pending', total_cost NUMERIC(15,2) DEFAULT 0, lines JSONB DEFAULT '[]', notes TEXT, created_at, updated_at, deleted_at
-- lines: [{inventory_item_id (raw material), qty_required, qty_used, unit_cost}]
```

---

## Phase 6 — Employees & Payroll

**Order:** Employees → Payslip Items → Payslips → Expense Claim Payers → Expense Claims

### 6A — Employees
```
id, business_id FK, code TEXT, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, date_of_birth DATE, date_hired DATE, date_terminated DATE, job_title TEXT, department TEXT, control_account_id FK → coa_accounts SET NULL, is_active BOOLEAN DEFAULT true, notes TEXT, cached_balance NUMERIC(15,2) DEFAULT 0, created_at, updated_at, deleted_at
```

### 6B — Payslip Items (Settings sub-page)
```
id, business_id FK, name TEXT NOT NULL, item_type TEXT NOT NULL  -- 'earning'|'deduction'|'employer_contribution', account_id FK → coa_accounts SET NULL, is_active BOOLEAN DEFAULT true, sort_order INT DEFAULT 0, created_at, updated_at, deleted_at
```

### 6C — Payslips
```
id, business_id FK, payslip_number TEXT NOT NULL, employee_id FK → employees SET NULL, date DATE NOT NULL, description TEXT, lines JSONB DEFAULT '[]', gross_pay NUMERIC(15,2) DEFAULT 0, total_deductions NUMERIC(15,2) DEFAULT 0, net_pay NUMERIC(15,2) DEFAULT 0, employer_contributions NUMERIC(15,2) DEFAULT 0, created_at, updated_at, deleted_at
-- lines: [{payslip_item_id, description, amount, item_type}]
```

### 6D — Expense Claim Payers (Settings sub-page)
```
id, business_id FK, name TEXT NOT NULL, employee_id FK → employees SET NULL, account_id FK → coa_accounts SET NULL, is_active BOOLEAN DEFAULT true, created_at, updated_at, deleted_at
```

### 6E — Expense Claims
```
id, business_id FK, claim_number TEXT NOT NULL, payer_id FK → expense_claim_payers SET NULL, employee_id FK → employees SET NULL, date DATE NOT NULL, description TEXT, lines JSONB DEFAULT '[]', cached_total NUMERIC(15,2) DEFAULT 0, created_at, updated_at, deleted_at
-- lines: [{account_id, description, amount, tax_rate, tax_amount}]
```

---

## Phase 7 — Fixed Assets & Depreciation

**Order:** Fixed Assets → Depreciation Entries → Intangible Assets → Amortization Entries

### 7A — Fixed Assets
```
id, business_id FK, code TEXT, name TEXT NOT NULL, description TEXT, serial_number TEXT, location_notes TEXT, asset_account_id FK → coa_accounts SET NULL, depreciation_account_id FK → coa_accounts SET NULL, accumulated_account_id FK → coa_accounts SET NULL, purchase_date DATE, disposal_date DATE, status TEXT DEFAULT 'active', depreciation_method TEXT DEFAULT 'straight_line', annual_depreciation_rate NUMERIC(8,4) DEFAULT 0, acquisition_cost NUMERIC(15,2) DEFAULT 0, accumulated_depreciation NUMERIC(15,2) DEFAULT 0, book_value NUMERIC(15,2) DEFAULT 0, created_at, updated_at, deleted_at
```

### 7B — Depreciation Entries
```
id, business_id FK, entry_number TEXT, date DATE, description TEXT, lines JSONB DEFAULT '[]', cached_total NUMERIC(15,2) DEFAULT 0, created_at, updated_at, deleted_at
-- lines: [{fixed_asset_id, amount}]
-- on save: update fixed_assets.accumulated_depreciation and book_value
```

### 7C — Intangible Assets
Same structure as fixed_assets with `amortization_account_id` instead of `depreciation_account_id`, and `accumulated_amortization` instead of `accumulated_depreciation`.

### 7D — Amortization Entries
Same structure as depreciation_entries but referencing `intangible_assets`.

---

## Phase 8 — Advanced Finance

### 8A — Capital Accounts

**New table: `capital_accounts`**
```
id, business_id FK, code TEXT, name TEXT NOT NULL, description TEXT, account_id FK → coa_accounts SET NULL, cached_balance NUMERIC(15,2) DEFAULT 0, created_at, updated_at, deleted_at
```

**New table: `capital_subaccounts`** (Settings sub-page)
```
id, business_id FK, name TEXT NOT NULL, description TEXT, sort_order INT DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at, updated_at, deleted_at
```

### 8B — Investments

**New table: `investments`**
```
id, business_id FK, code TEXT, name TEXT NOT NULL, ticker_symbol TEXT, investment_type TEXT  -- 'stock'|'bond'|'mutual_fund'|'other', control_account_id FK → coa_accounts SET NULL, quantity_owned NUMERIC(15,6) DEFAULT 0, average_cost_per_unit NUMERIC(15,4) DEFAULT 0, total_cost NUMERIC(15,2) DEFAULT 0, current_market_price NUMERIC(15,4) DEFAULT 0, current_market_value NUMERIC(15,2) DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at, updated_at, deleted_at
```

**New table: `investment_market_prices`** (Settings sub-page)
```
id, business_id FK, investment_id FK CASCADE, price_date DATE, price NUMERIC(15,4), created_at
```

### 8C — Withholding Tax Receipts

**New table: `withholding_tax_receipts`**
```
id, business_id FK, receipt_number TEXT, customer_id FK → customers SET NULL, date DATE, sales_invoice_id FK → sales_invoices SET NULL, description TEXT, amount NUMERIC(15,2), created_at, updated_at, deleted_at
```

### 8D — Journal Entries (Manual)

**New tables: `journal_entries`, `journal_lines`**

`journal_entries`:
```
id, business_id FK, date DATE NOT NULL, reference TEXT, description TEXT, source_type TEXT DEFAULT 'journal_entry', source_id UUID, created_at, updated_at, deleted_at
```

`journal_lines`:
```
id, journal_entry_id FK CASCADE, account_id FK → coa_accounts SET NULL, debit NUMERIC(15,2) DEFAULT 0, credit NUMERIC(15,2) DEFAULT 0, description TEXT, created_at
```
Index: journal_entry_id, account_id

**Note:** All transactional tables (receipts, payments, invoices, etc.) should also auto-post to `journal_entries` via a service layer trigger on write. Implement journal posting as a shared service function called by every module's service layer.

---

## Phase 9 — Reports

Reports are read-only views computed from existing data. No new tables except:

**New table: `user_preferences`** (for report filter persistence)
```
id, user_id UUID, business_id FK, preference_key TEXT, preference_value JSONB, created_at, updated_at
UNIQUE(user_id, business_id, preference_key)
```

### Reports to implement:

| Category | Reports |
|---|---|
| Financial Statements | Balance Sheet, Profit & Loss, Trial Balance, Cash Flow Statement |
| Tax | Tax Summary, Tax Audit |
| Customers | Aged Receivables, Customer Statement, Sales by Customer |
| Suppliers | Aged Payables, Supplier Statement, Purchases by Supplier |
| Inventory | Inventory Value, Inventory Movement, Stock Reorder |
| Fixed Assets | Asset Register, Depreciation Schedule |
| Payroll | Payroll Summary, Employee Earnings |
| General | General Ledger, Transaction Listing |
| Forecasts | Forecast P&L, Actual vs Budget |

Each report page: date range picker, comparison period toggle, filters, Export (PDF/CSV).

---

## Phase 10 — Settings Completion

Settings pages not yet built (accessible via Settings tab sub-pages):

| Setting | Table(s) | Status |
|---|---|---|
| Business Details | businesses | Done (partial — expand fields) |
| Chart of Accounts | coa_accounts, coa_groups | Done |
| Tax Codes | tax_codes (new) | Not built |
| Currencies | currencies, exchange_rates (new) | Not built |
| Users & Permissions | existing RBAC | Done (admin panel) |
| Custom Fields | custom_fields, custom_field_values (new) | Not built |
| Themes | themes (new) | Not built |
| Footers | footers (new) | Not built |
| Form Defaults | form_defaults (new) | Not built |
| Recurring Transactions | recurring_transactions (new) | Not built |
| Lock Date | lock_dates (new) | Not built |
| Forecasts | forecasts (new) | Not built |
| Bank Rules | bank_rules (Phase 2D) | Not built |
| Withholding Tax | config on sales/purchase invoices | Not built |
| Date & Number Format | businesses (existing columns) | Partial |
| Divisions | divisions (new) | Not built |
| Special Accounts | special_accounts (new) | Not built |
| Control Accounts | control_accounts (new) | Not built |
| Access Tokens | access_tokens (new) | Not built |
| Capital Subaccounts | capital_subaccounts (Phase 8A) | Not built |
| Cash Flow Groups | add cash_flow_group column to coa_groups | Not built |
| Investment Prices | investment_market_prices (Phase 8B) | Not built |
| Payslip Items | payslip_items (Phase 6B) | Not built |
| Expense Claim Payers | expense_claim_payers (Phase 6D) | Not built |
| Inventory Locations | inventory_locations (Phase 5A) | Not built |

### New tables needed for Settings:

**`tax_codes`** (add early — needed by invoices in Phase 3):
```
id, business_id FK, name TEXT NOT NULL, rate NUMERIC(8,4) NOT NULL, tax_account_id FK → coa_accounts SET NULL, applies_to TEXT DEFAULT 'both'  -- 'sales'|'purchases'|'both', is_active BOOLEAN DEFAULT true, created_at, updated_at, deleted_at
```

**`divisions`** (add before Phase 3 — used as optional FK on invoices):
```
id, business_id FK, code TEXT, name TEXT NOT NULL, description TEXT, is_active BOOLEAN DEFAULT true, created_at, updated_at, deleted_at
```

**`currencies`** + **`exchange_rates`** (add before multi-currency in invoices):
```
-- currencies:
id, code CHAR(3) UNIQUE, name TEXT, symbol TEXT, decimal_places INT DEFAULT 2, is_active BOOLEAN DEFAULT true, created_at, updated_at

-- exchange_rates:
id, from_currency_id FK, to_currency_id FK, rate NUMERIC(18,8), rate_date DATE, created_at
```

---

## Summary: Phase Delivery Order

```
Phase 2  → Payments + Inter-Account Transfers + Bank Reconciliation + Bank Rules
Phase 3  → Sales (Invoices → Quotes → Orders → Credit Notes → Delivery Notes → Billable)
Phase 4  → Purchase (Invoices → Quotes → Orders → Debit Notes → Goods Receipts)
Phase 5  → Inventory (Locations → Items → Kits → Transfers → Write-offs → Production)
Phase 6  → Employees & Payroll
Phase 7  → Fixed Assets & Depreciation + Intangible Assets & Amortization
Phase 8  → Capital Accounts + Investments + Withholding Tax + Journal Entries
Phase 9  → Reports
Phase 10 → Settings completion (Tax Codes, Currencies, Divisions, Custom Fields, etc.)
```

**Before starting each phase:**
1. Check this file for the exact table spec — don't deviate without updating here
2. `ls supabase/migrations/` to get the correct next sequence number
3. Deliver: DB migration → Backend → Frontend → E2E test
4. One agent per layer (db-migration-manager, backend-architect, frontend-next-dev, e2e-tester)
