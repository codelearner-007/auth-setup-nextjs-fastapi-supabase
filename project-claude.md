# project-claude.md
# Manager.io Clone — Complete Project Reference

---

## 0. Prime Directive for Claude

You are building a full-featured accounting and business management system
modelled on Manager.io. This file is the single source of truth.

Rules you must follow at ALL times:
- Never modify any interface, page, or component without explicit user approval first.
  Always show what you plan to change and wait for "yes" before touching UI code.
- Always apply 3NF for main app data + selective denormalization for high-read paths.
- Every table must have created_at, updated_at, and deleted_at (soft delete).
- All primary keys are UUIDs.
- All monetary values are stored as DECIMAL(15,4).
- All foreign keys must have matching indexes.
- Never drop a column — only add or soft-deprecate.
- When asked to build a page, refer to the Tab Definitions section first.

---

## 1. Database Strategy

### Core Rule
3NF for main app data + selective denormalization for high-read paths
= best optimization strategy.

### What This Means in Practice

#### 3NF Applied To:
- All master data tables (businesses, customers, suppliers, employees, accounts)
- All transactional tables (invoices, payments, receipts, journal entries)
- All settings tables (tax codes, currencies, themes, custom fields)
- Every relationship table (invoice lines, journal lines, payslip items)

3NF means:
1. Every column depends only on the primary key (no partial dependency)
2. No transitive dependency (A → B → C not allowed — B must be its own table)
3. No repeating groups — arrays always become child tables

#### Selective Denormalization Applied To (high-read paths):
- `bank_accounts.cached_balance` — recalculated on every receipt/payment write,
  read thousands of times. Store it. Invalidate on any transaction affecting the account.
- `customers.cached_balance` — sum of unpaid invoices. Update on invoice create/pay.
- `suppliers.cached_balance` — sum of unpaid purchase invoices.
- `inventory_items.quantity_on_hand` — updated on every inventory movement.
  Never calculate live from movements for list views.
- `inventory_items.quantity_to_deliver` — updated when sales orders change.
- `inventory_items.quantity_to_receive` — updated when purchase orders change.
- `sales_invoices.cached_paid_amount` — sum of receipts against this invoice.
  Avoids joining receipts table on every invoice list render.
- `purchase_invoices.cached_paid_amount` — same pattern for purchases.

#### Cache Invalidation Rules:
- When a receipt is created/edited/deleted → update bank_account.cached_balance
  AND customer.cached_balance AND sales_invoice.cached_paid_amount
- When a payment is created/edited/deleted → update bank_account.cached_balance
  AND supplier.cached_balance AND purchase_invoice.cached_paid_amount
- When inventory transaction occurs → update inventory_items quantity columns
- Never trust cached columns for accounting reports — always recalculate from
  journal_lines for Balance Sheet, P&L, Trial Balance

---

## 2. Core System Tables

### businesses
```
id                    UUID PK
name                  VARCHAR(255) NOT NULL
address               TEXT
city                  VARCHAR(100)
state                 VARCHAR(100)
country_id            UUID FK → countries.id
postal_code           VARCHAR(20)
phone                 VARCHAR(50)
email                 VARCHAR(255)
website               VARCHAR(255)
tax_number            VARCHAR(100)
registration_number   VARCHAR(100)
logo_path             VARCHAR(500)
base_currency_id      UUID FK → currencies.id
date_format           VARCHAR(20)   DEFAULT 'DD/MM/YYYY'
time_format           VARCHAR(10)   DEFAULT '24h'
number_format         VARCHAR(20)   DEFAULT '1,234.56'
first_day_of_week     TINYINT       DEFAULT 1  -- 1=Monday
fiscal_year_start     VARCHAR(5)    DEFAULT '01-01'
lock_date             DATE          NULL
is_active             BOOLEAN       DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### users
```
id                    UUID PK
name                  VARCHAR(255)
email                 VARCHAR(255) UNIQUE
password_hash         VARCHAR(255)
role                  ENUM('administrator','restricted')
avatar_path           VARCHAR(500) NULL
last_login_at         TIMESTAMP NULL
mfa_enabled           BOOLEAN DEFAULT false
mfa_secret            VARCHAR(255) NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### business_users  (pivot — user access per business)
```
id                    UUID PK
business_id           UUID FK → businesses.id
user_id               UUID FK → users.id
role                  ENUM('administrator','restricted')
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### user_permissions  (per-tab access control for restricted users)
```
id                    UUID PK
business_user_id      UUID FK → business_users.id
tab_key               VARCHAR(100)   -- e.g. 'sales_invoices', 'payslips'
can_view              BOOLEAN DEFAULT false
can_create            BOOLEAN DEFAULT false
can_edit              BOOLEAN DEFAULT false
can_delete            BOOLEAN DEFAULT false
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### countries
```
id                    UUID PK
name                  VARCHAR(100)
iso_code              CHAR(2) UNIQUE
phone_code            VARCHAR(10)
created_at            TIMESTAMP
```

### currencies
```
id                    UUID PK
name                  VARCHAR(100)
code                  CHAR(3) UNIQUE   -- ISO 4217 e.g. PKR, USD
symbol                VARCHAR(10)
decimal_places        TINYINT DEFAULT 2
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### exchange_rates
```
id                    UUID PK
from_currency_id      UUID FK → currencies.id
to_currency_id        UUID FK → currencies.id
rate                  DECIMAL(18,8)
rate_date             DATE
created_at            TIMESTAMP
```

---

## 3. Chart of Accounts

### account_groups  (for Balance Sheet / P&L grouping)
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
type                  ENUM('asset','liability','equity','income','expense')
parent_group_id       UUID FK → account_groups.id NULL  -- nesting
sort_order            INTEGER DEFAULT 0
cash_flow_group       VARCHAR(100) NULL  -- for Cash Flow Statement grouping
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### accounts  (chart of accounts — every debit/credit line references this)
```
id                    UUID PK
business_id           UUID FK → businesses.id
account_group_id      UUID FK → account_groups.id NULL
code                  VARCHAR(50) NULL
name                  VARCHAR(255)
type                  ENUM('asset','liability','equity','income','expense')
sub_type              VARCHAR(100) NULL  -- e.g. 'bank','receivable','payable'
is_system             BOOLEAN DEFAULT false  -- system accounts cannot be deleted
control_account_type  VARCHAR(100) NULL
  -- values: 'accounts_receivable','accounts_payable','inventory',
  --         'fixed_assets','bank_cash','capital_accounts', etc.
currency_id           UUID FK → currencies.id NULL  -- NULL = base currency
description           TEXT NULL
is_active             BOOLEAN DEFAULT true
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### control_accounts  (user-defined groupings for financial statements)
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
account_type          VARCHAR(100)
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### control_account_members
```
id                    UUID PK
control_account_id    UUID FK → control_accounts.id
account_id            UUID FK → accounts.id
created_at            TIMESTAMP
```

---

## 4. Journal Engine  (every financial event posts here — never bypass)

### journal_entries
```
id                    UUID PK
business_id           UUID FK → businesses.id
source_type           VARCHAR(100)
  -- values: 'receipt','payment','sales_invoice','purchase_invoice',
  --         'credit_note','debit_note','journal_entry','payslip',
  --         'depreciation','amortization','inventory_write_off',
  --         'production_order','expense_claim','inter_account_transfer'
source_id             UUID NULL      -- ID of the originating record
date                  DATE
reference             VARCHAR(100) NULL
description           TEXT NULL
is_balanced           BOOLEAN GENERATED  -- true when sum(debit)=sum(credit)
division_id           UUID FK → divisions.id NULL
project_id            UUID FK → projects.id NULL
folder_id             UUID FK → folders.id NULL
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL

INDEX: business_id, date
INDEX: source_type, source_id
```

### journal_lines
```
id                    UUID PK
journal_entry_id      UUID FK → journal_entries.id
account_id            UUID FK → accounts.id
debit                 DECIMAL(15,4) DEFAULT 0
credit                DECIMAL(15,4) DEFAULT 0
description           TEXT NULL
currency_id           UUID FK → currencies.id NULL
foreign_amount        DECIMAL(15,4) NULL
exchange_rate         DECIMAL(18,8) NULL
tax_code_id           UUID FK → tax_codes.id NULL
created_at            TIMESTAMP

INDEX: journal_entry_id
INDEX: account_id
```

---

## 5. Settings & Configuration Tables

### tax_codes
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(100)
rate                  DECIMAL(8,4)   -- percentage e.g. 17.0000 for 17%
tax_account_id        UUID FK → accounts.id
applies_to            SET('sales','purchases','both')
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### custom_fields
```
id                    UUID PK
business_id           UUID FK → businesses.id
applies_to            VARCHAR(100)  -- table name e.g. 'sales_invoices'
label                 VARCHAR(255)
field_type            ENUM('text','number','date','checkbox','dropdown')
dropdown_options      JSON NULL      -- array of strings for dropdown type
show_on_documents     BOOLEAN DEFAULT false
show_as_column        BOOLEAN DEFAULT false
sort_order            INTEGER DEFAULT 0
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### custom_field_values
```
id                    UUID PK
custom_field_id       UUID FK → custom_fields.id
record_id             UUID           -- ID of the record this value belongs to
value_text            TEXT NULL
value_number          DECIMAL(15,4) NULL
value_date            DATE NULL
value_boolean         BOOLEAN NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP

INDEX: custom_field_id, record_id
```

### themes
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
html_template         LONGTEXT       -- HTML+CSS for printed documents
is_default            BOOLEAN DEFAULT false
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### footers
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
content               LONGTEXT       -- plain text or HTML
is_default            BOOLEAN DEFAULT false
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### form_defaults
```
id                    UUID PK
business_id           UUID FK → businesses.id
form_type             VARCHAR(100)   -- e.g. 'sales_invoices'
defaults_json         JSON           -- field → default value map
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### recurring_transactions
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
source_type           VARCHAR(100)   -- e.g. 'sales_invoices'
template_json         JSON           -- full form data as template
frequency             ENUM('daily','weekly','monthly','custom')
interval_value        INTEGER DEFAULT 1
next_due_date         DATE
last_generated_at     TIMESTAMP NULL
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### forecasts
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
account_id            UUID FK → accounts.id
period_start          DATE
period_end            DATE
amount                DECIMAL(15,4)
notes                 TEXT NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### divisions
```
id                    UUID PK
business_id           UUID FK → businesses.id
code                  VARCHAR(50) NULL
name                  VARCHAR(255)
description           TEXT NULL
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### projects
```
id                    UUID PK
business_id           UUID FK → businesses.id
code                  VARCHAR(50) NULL
name                  VARCHAR(255)
description           TEXT NULL
status                ENUM('active','completed','cancelled') DEFAULT 'active'
start_date            DATE NULL
end_date              DATE NULL
-- denormalized for list view performance:
cached_total_income   DECIMAL(15,4) DEFAULT 0
cached_total_expense  DECIMAL(15,4) DEFAULT 0
cached_net_profit     DECIMAL(15,4) DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### folders
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
description           TEXT NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### special_accounts
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
account_id            UUID FK → accounts.id
description           TEXT NULL
starting_balance      DECIMAL(15,4) DEFAULT 0
starting_balance_date DATE NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### starting_balances
```
id                    UUID PK
business_id           UUID FK → businesses.id
account_id            UUID FK → accounts.id NULL
reference_type        VARCHAR(100)   -- 'account','customer','supplier','inventory'
reference_id          UUID NULL
amount                DECIMAL(15,4)
balance_date          DATE
notes                 TEXT NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### lock_dates
```
id                    UUID PK
business_id           UUID FK → businesses.id
lock_date             DATE
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### access_tokens
```
id                    UUID PK
business_id           UUID FK → businesses.id
user_id               UUID FK → users.id
name                  VARCHAR(255)
token_hash            VARCHAR(255) UNIQUE
last_used_at          TIMESTAMP NULL
expires_at            TIMESTAMP NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

---

## 6. Bank and Cash Accounts Module

### bank_accounts
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
account_type          ENUM('bank','cash','credit_card','other')
account_number        VARCHAR(100) NULL
bank_name             VARCHAR(255) NULL
currency_id           UUID FK → currencies.id
control_account_id    UUID FK → accounts.id   -- links to chart of accounts
opening_balance       DECIMAL(15,4) DEFAULT 0
opening_balance_date  DATE NULL
-- DENORMALIZED (high-read):
cached_balance        DECIMAL(15,4) DEFAULT 0   -- recalc on every tx write
cleared_balance       DECIMAL(15,4) DEFAULT 0   -- from last reconciliation
pending_deposits      DECIMAL(15,4) DEFAULT 0
last_reconciliation_date DATE NULL
sort_order            INTEGER DEFAULT 0
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### receipts
```
id                    UUID PK
business_id           UUID FK → businesses.id
bank_account_id       UUID FK → bank_accounts.id
date                  DATE
reference             VARCHAR(100) NULL
description           TEXT NULL
total_amount          DECIMAL(15,4)
payer_type            ENUM('customer','other') DEFAULT 'other'
customer_id           UUID FK → customers.id NULL
division_id           UUID FK → divisions.id NULL
project_id            UUID FK → projects.id NULL
folder_id             UUID FK → folders.id NULL
theme_id              UUID FK → themes.id NULL
footer_id             UUID FK → footers.id NULL
currency_id           UUID FK → currencies.id NULL
exchange_rate         DECIMAL(18,8) NULL
notes                 TEXT NULL
is_imported           BOOLEAN DEFAULT false   -- true if from bank import
bank_rule_id          UUID FK → bank_rules.id NULL
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL

INDEX: business_id, date
INDEX: bank_account_id
INDEX: customer_id
```

### receipt_lines
```
id                    UUID PK
receipt_id            UUID FK → receipts.id
account_id            UUID FK → accounts.id
sales_invoice_id      UUID FK → sales_invoices.id NULL  -- clears invoice
description           TEXT NULL
amount                DECIMAL(15,4)
tax_code_id           UUID FK → tax_codes.id NULL
tax_amount            DECIMAL(15,4) DEFAULT 0
withholding_tax_amount DECIMAL(15,4) DEFAULT 0
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

### payments
```
id                    UUID PK
business_id           UUID FK → businesses.id
bank_account_id       UUID FK → bank_accounts.id
date                  DATE
reference             VARCHAR(100) NULL
description           TEXT NULL
total_amount          DECIMAL(15,4)
payee_type            ENUM('supplier','employee','other') DEFAULT 'other'
supplier_id           UUID FK → suppliers.id NULL
employee_id           UUID FK → employees.id NULL
division_id           UUID FK → divisions.id NULL
project_id            UUID FK → projects.id NULL
folder_id             UUID FK → folders.id NULL
currency_id           UUID FK → currencies.id NULL
exchange_rate         DECIMAL(18,8) NULL
notes                 TEXT NULL
is_imported           BOOLEAN DEFAULT false
bank_rule_id          UUID FK → bank_rules.id NULL
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL

INDEX: business_id, date
INDEX: bank_account_id
INDEX: supplier_id
```

### payment_lines
```
id                    UUID PK
payment_id            UUID FK → payments.id
account_id            UUID FK → accounts.id
purchase_invoice_id   UUID FK → purchase_invoices.id NULL
description           TEXT NULL
amount                DECIMAL(15,4)
tax_code_id           UUID FK → tax_codes.id NULL
tax_amount            DECIMAL(15,4) DEFAULT 0
withholding_tax_amount DECIMAL(15,4) DEFAULT 0
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

### inter_account_transfers
```
id                    UUID PK
business_id           UUID FK → businesses.id
date                  DATE
reference             VARCHAR(100) NULL
description           TEXT NULL
from_account_id       UUID FK → bank_accounts.id
to_account_id         UUID FK → bank_accounts.id
amount                DECIMAL(15,4)
from_currency_id      UUID FK → currencies.id NULL
to_currency_id        UUID FK → currencies.id NULL
exchange_rate         DECIMAL(18,8) NULL
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### bank_reconciliations
```
id                    UUID PK
business_id           UUID FK → businesses.id
bank_account_id       UUID FK → bank_accounts.id
reconciliation_date   DATE
statement_balance     DECIMAL(15,4)
calculated_balance    DECIMAL(15,4)
discrepancy           DECIMAL(15,4) GENERATED  -- statement - calculated
status                ENUM('reconciled','unreconciled') DEFAULT 'unreconciled'
notes                 TEXT NULL
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### bank_reconciliation_lines
```
id                    UUID PK
reconciliation_id     UUID FK → bank_reconciliations.id
source_type           ENUM('receipt','payment','transfer')
source_id             UUID
is_cleared            BOOLEAN DEFAULT false
created_at            TIMESTAMP
```

### bank_rules
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
rule_type             ENUM('payment','receipt')
match_field           VARCHAR(100)   -- 'description','reference','amount'
match_operator        ENUM('contains','equals','starts_with','ends_with')
match_value           VARCHAR(255)
account_id            UUID FK → accounts.id
tax_code_id           UUID FK → tax_codes.id NULL
description_override  VARCHAR(255) NULL
sort_order            INTEGER DEFAULT 0
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

---

## 7. Customers Module

### customers
```
id                    UUID PK
business_id           UUID FK → businesses.id
code                  VARCHAR(50) NULL
name                  VARCHAR(255)
email                 VARCHAR(255) NULL
phone                 VARCHAR(50) NULL
address               TEXT NULL
city                  VARCHAR(100) NULL
state                 VARCHAR(100) NULL
country_id            UUID FK → countries.id NULL
postal_code           VARCHAR(20) NULL
tax_number            VARCHAR(100) NULL
credit_limit          DECIMAL(15,4) NULL
payment_terms_days    INTEGER NULL
currency_id           UUID FK → currencies.id NULL
control_account_id    UUID FK → accounts.id NULL
division_id           UUID FK → divisions.id NULL
website               VARCHAR(255) NULL
notes                 TEXT NULL
-- DENORMALIZED (high-read):
cached_balance        DECIMAL(15,4) DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL

INDEX: business_id
INDEX: code
INDEX: name
```

---

## 8. Suppliers Module

### suppliers
```
id                    UUID PK
business_id           UUID FK → businesses.id
code                  VARCHAR(50) NULL
name                  VARCHAR(255)
email                 VARCHAR(255) NULL
phone                 VARCHAR(50) NULL
address               TEXT NULL
city                  VARCHAR(100) NULL
state                 VARCHAR(100) NULL
country_id            UUID FK → countries.id NULL
postal_code           VARCHAR(20) NULL
tax_number            VARCHAR(100) NULL
credit_limit          DECIMAL(15,4) NULL
payment_terms_days    INTEGER NULL
currency_id           UUID FK → currencies.id NULL
control_account_id    UUID FK → accounts.id NULL
division_id           UUID FK → divisions.id NULL
website               VARCHAR(255) NULL
notes                 TEXT NULL
-- DENORMALIZED (high-read):
cached_balance        DECIMAL(15,4) DEFAULT 0
cached_qty_to_receive INTEGER DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

---

## 9. Sales Module

### sales_quotes
```
id                    UUID PK
business_id           UUID FK → businesses.id
quote_number          VARCHAR(100)
customer_id           UUID FK → customers.id
date                  DATE
expiry_date           DATE NULL
description           TEXT NULL
status                ENUM('active','accepted','cancelled','expired')
theme_id              UUID FK → themes.id NULL
footer_id             UUID FK → footers.id NULL
currency_id           UUID FK → currencies.id NULL
exchange_rate         DECIMAL(18,8) NULL
division_id           UUID FK → divisions.id NULL
project_id            UUID FK → projects.id NULL
folder_id             UUID FK → folders.id NULL
notes                 TEXT NULL
-- DENORMALIZED:
cached_subtotal       DECIMAL(15,4) DEFAULT 0
cached_tax_total      DECIMAL(15,4) DEFAULT 0
cached_total          DECIMAL(15,4) DEFAULT 0
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### sales_quote_lines
```
id                    UUID PK
sales_quote_id        UUID FK → sales_quotes.id
inventory_item_id     UUID FK → inventory_items.id NULL
account_id            UUID FK → accounts.id NULL
description           TEXT NULL
quantity              DECIMAL(15,4) DEFAULT 1
unit_price            DECIMAL(15,4)
discount_percent      DECIMAL(8,4) DEFAULT 0
tax_code_id           UUID FK → tax_codes.id NULL
tax_amount            DECIMAL(15,4) DEFAULT 0
line_total            DECIMAL(15,4)
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### sales_orders
```
id                    UUID PK
business_id           UUID FK → businesses.id
order_number          VARCHAR(100)
customer_id           UUID FK → customers.id
sales_quote_id        UUID FK → sales_quotes.id NULL
date                  DATE
description           TEXT NULL
status                ENUM('open','partially_invoiced','invoiced','cancelled')
is_cancelled          BOOLEAN DEFAULT false
theme_id              UUID FK → themes.id NULL
footer_id             UUID FK → footers.id NULL
currency_id           UUID FK → currencies.id NULL
exchange_rate         DECIMAL(18,8) NULL
division_id           UUID FK → divisions.id NULL
project_id            UUID FK → projects.id NULL
folder_id             UUID FK → folders.id NULL
notes                 TEXT NULL
-- DENORMALIZED:
cached_order_amount   DECIMAL(15,4) DEFAULT 0
cached_invoice_amount DECIMAL(15,4) DEFAULT 0
cached_qty_to_deliver DECIMAL(15,4) DEFAULT 0
invoice_status        ENUM('uninvoiced','partially_invoiced','invoiced')
delivery_status       ENUM('pending','partially_delivered','delivered')
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### sales_order_lines
```
id                    UUID PK
sales_order_id        UUID FK → sales_orders.id
inventory_item_id     UUID FK → inventory_items.id NULL
account_id            UUID FK → accounts.id NULL
description           TEXT NULL
quantity              DECIMAL(15,4)
unit_price            DECIMAL(15,4)
discount_percent      DECIMAL(8,4) DEFAULT 0
tax_code_id           UUID FK → tax_codes.id NULL
tax_amount            DECIMAL(15,4) DEFAULT 0
line_total            DECIMAL(15,4)
quantity_invoiced     DECIMAL(15,4) DEFAULT 0
quantity_delivered    DECIMAL(15,4) DEFAULT 0
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### sales_invoices
```
id                    UUID PK
business_id           UUID FK → businesses.id
invoice_number        VARCHAR(100)
customer_id           UUID FK → customers.id
sales_order_id        UUID FK → sales_orders.id NULL
date                  DATE
due_date              DATE NULL
description           TEXT NULL
status                ENUM('draft','sent','paid','partially_paid','overdue','cancelled')
theme_id              UUID FK → themes.id NULL
footer_id             UUID FK → footers.id NULL
currency_id           UUID FK → currencies.id NULL
exchange_rate         DECIMAL(18,8) NULL
division_id           UUID FK → divisions.id NULL
project_id            UUID FK → projects.id NULL
folder_id             UUID FK → folders.id NULL
withholding_tax_rate  DECIMAL(8,4) NULL
withholding_tax_amount DECIMAL(15,4) DEFAULT 0
notes                 TEXT NULL
-- DENORMALIZED (high-read):
cached_subtotal       DECIMAL(15,4) DEFAULT 0
cached_tax_total      DECIMAL(15,4) DEFAULT 0
cached_total          DECIMAL(15,4) DEFAULT 0
cached_paid_amount    DECIMAL(15,4) DEFAULT 0
cached_balance_due    DECIMAL(15,4) DEFAULT 0
days_overdue          INTEGER DEFAULT 0  -- recalc daily via cron
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL

INDEX: business_id, date
INDEX: customer_id
INDEX: status
INDEX: due_date
```

### sales_invoice_lines
```
id                    UUID PK
sales_invoice_id      UUID FK → sales_invoices.id
sales_order_line_id   UUID FK → sales_order_lines.id NULL
inventory_item_id     UUID FK → inventory_items.id NULL
account_id            UUID FK → accounts.id NULL
description           TEXT NULL
quantity              DECIMAL(15,4)
unit_price            DECIMAL(15,4)
unit_cost             DECIMAL(15,4) NULL  -- for cost of sales calculation
discount_percent      DECIMAL(8,4) DEFAULT 0
tax_code_id           UUID FK → tax_codes.id NULL
tax_amount            DECIMAL(15,4) DEFAULT 0
line_total            DECIMAL(15,4)
cost_of_sales         DECIMAL(15,4) DEFAULT 0
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### credit_notes
```
id                    UUID PK
business_id           UUID FK → businesses.id
credit_note_number    VARCHAR(100)
customer_id           UUID FK → customers.id
sales_invoice_id      UUID FK → sales_invoices.id NULL
date                  DATE
description           TEXT NULL
theme_id              UUID FK → themes.id NULL
footer_id             UUID FK → footers.id NULL
currency_id           UUID FK → currencies.id NULL
exchange_rate         DECIMAL(18,8) NULL
division_id           UUID FK → divisions.id NULL
project_id            UUID FK → projects.id NULL
folder_id             UUID FK → folders.id NULL
-- DENORMALIZED:
cached_subtotal       DECIMAL(15,4) DEFAULT 0
cached_tax_total      DECIMAL(15,4) DEFAULT 0
cached_total          DECIMAL(15,4) DEFAULT 0
cached_cost_of_sales  DECIMAL(15,4) DEFAULT 0
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### credit_note_lines
```
id                    UUID PK
credit_note_id        UUID FK → credit_notes.id
inventory_item_id     UUID FK → inventory_items.id NULL
account_id            UUID FK → accounts.id NULL
description           TEXT NULL
quantity              DECIMAL(15,4)
unit_price            DECIMAL(15,4)
unit_cost             DECIMAL(15,4) NULL
discount_percent      DECIMAL(8,4) DEFAULT 0
tax_code_id           UUID FK → tax_codes.id NULL
tax_amount            DECIMAL(15,4) DEFAULT 0
line_total            DECIMAL(15,4)
cost_of_sales         DECIMAL(15,4) DEFAULT 0
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

### delivery_notes
```
id                    UUID PK
business_id           UUID FK → businesses.id
delivery_number       VARCHAR(100)
customer_id           UUID FK → customers.id
sales_order_id        UUID FK → sales_orders.id NULL
sales_invoice_id      UUID FK → sales_invoices.id NULL
date                  DATE
inventory_location_id UUID FK → inventory_locations.id NULL
description           TEXT NULL
theme_id              UUID FK → themes.id NULL
footer_id             UUID FK → footers.id NULL
notes                 TEXT NULL
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### delivery_note_lines
```
id                    UUID PK
delivery_note_id      UUID FK → delivery_notes.id
inventory_item_id     UUID FK → inventory_items.id
description           TEXT NULL
quantity              DECIMAL(15,4)
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

### late_payment_fees
```
id                    UUID PK
business_id           UUID FK → businesses.id
customer_id           UUID FK → customers.id
sales_invoice_id      UUID FK → sales_invoices.id
date                  DATE
amount                DECIMAL(15,4)
description           TEXT NULL
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### billable_time
```
id                    UUID PK
business_id           UUID FK → businesses.id
customer_id           UUID FK → customers.id
date                  DATE
description           TEXT NULL
hours                 DECIMAL(8,2)
hourly_rate           DECIMAL(15,4)
total_amount          DECIMAL(15,4)
status                ENUM('unbilled','invoiced','written_off')
sales_invoice_id      UUID FK → sales_invoices.id NULL
division_id           UUID FK → divisions.id NULL
project_id            UUID FK → projects.id NULL
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### billable_expenses
```
id                    UUID PK
business_id           UUID FK → businesses.id
customer_id           UUID FK → customers.id
date                  DATE
description           TEXT NULL
amount                DECIMAL(15,4)
expense_account_id    UUID FK → accounts.id
status                ENUM('unbilled','invoiced')
sales_invoice_id      UUID FK → sales_invoices.id NULL
division_id           UUID FK → divisions.id NULL
project_id            UUID FK → projects.id NULL
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

---

## 10. Purchase Module

### purchase_quotes
```
id                    UUID PK
business_id           UUID FK → businesses.id
quote_number          VARCHAR(100)
supplier_id           UUID FK → suppliers.id
date                  DATE
expiry_date           DATE NULL
description           TEXT NULL
status                ENUM('active','accepted','cancelled')
currency_id           UUID FK → currencies.id NULL
exchange_rate         DECIMAL(18,8) NULL
division_id           UUID FK → divisions.id NULL
project_id            UUID FK → projects.id NULL
folder_id             UUID FK → folders.id NULL
notes                 TEXT NULL
cached_total          DECIMAL(15,4) DEFAULT 0
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### purchase_quote_lines
```
id                    UUID PK
purchase_quote_id     UUID FK → purchase_quotes.id
inventory_item_id     UUID FK → inventory_items.id NULL
account_id            UUID FK → accounts.id NULL
description           TEXT NULL
quantity              DECIMAL(15,4)
unit_price            DECIMAL(15,4)
tax_code_id           UUID FK → tax_codes.id NULL
tax_amount            DECIMAL(15,4) DEFAULT 0
line_total            DECIMAL(15,4)
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

### purchase_orders
```
id                    UUID PK
business_id           UUID FK → businesses.id
order_number          VARCHAR(100)
supplier_id           UUID FK → suppliers.id
purchase_quote_id     UUID FK → purchase_quotes.id NULL
date                  DATE
description           TEXT NULL
currency_id           UUID FK → currencies.id NULL
exchange_rate         DECIMAL(18,8) NULL
division_id           UUID FK → divisions.id NULL
project_id            UUID FK → projects.id NULL
folder_id             UUID FK → folders.id NULL
notes                 TEXT NULL
-- DENORMALIZED:
cached_order_amount   DECIMAL(15,4) DEFAULT 0
cached_invoice_amount DECIMAL(15,4) DEFAULT 0
invoice_status        ENUM('uninvoiced','partially_invoiced','invoiced')
delivery_status       ENUM('pending','partially_delivered','delivered')
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### purchase_order_lines
```
id                    UUID PK
purchase_order_id     UUID FK → purchase_orders.id
inventory_item_id     UUID FK → inventory_items.id NULL
account_id            UUID FK → accounts.id NULL
description           TEXT NULL
quantity              DECIMAL(15,4)
unit_price            DECIMAL(15,4)
tax_code_id           UUID FK → tax_codes.id NULL
tax_amount            DECIMAL(15,4) DEFAULT 0
line_total            DECIMAL(15,4)
quantity_received     DECIMAL(15,4) DEFAULT 0
quantity_invoiced     DECIMAL(15,4) DEFAULT 0
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### purchase_invoices
```
id                    UUID PK
business_id           UUID FK → businesses.id
invoice_number        VARCHAR(100)
supplier_id           UUID FK → suppliers.id
purchase_order_id     UUID FK → purchase_orders.id NULL
date                  DATE
due_date              DATE NULL
description           TEXT NULL
status                ENUM('unpaid','partially_paid','paid','overdue')
currency_id           UUID FK → currencies.id NULL
exchange_rate         DECIMAL(18,8) NULL
division_id           UUID FK → divisions.id NULL
project_id            UUID FK → projects.id NULL
folder_id             UUID FK → folders.id NULL
withholding_tax_rate  DECIMAL(8,4) NULL
withholding_tax_amount DECIMAL(15,4) DEFAULT 0
notes                 TEXT NULL
-- DENORMALIZED:
cached_subtotal       DECIMAL(15,4) DEFAULT 0
cached_tax_total      DECIMAL(15,4) DEFAULT 0
cached_total          DECIMAL(15,4) DEFAULT 0
cached_paid_amount    DECIMAL(15,4) DEFAULT 0
cached_balance_due    DECIMAL(15,4) DEFAULT 0
days_overdue          INTEGER DEFAULT 0
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### purchase_invoice_lines
```
id                    UUID PK
purchase_invoice_id   UUID FK → purchase_invoices.id
purchase_order_line_id UUID FK → purchase_order_lines.id NULL
inventory_item_id     UUID FK → inventory_items.id NULL
account_id            UUID FK → accounts.id NULL
description           TEXT NULL
quantity              DECIMAL(15,4)
unit_price            DECIMAL(15,4)
tax_code_id           UUID FK → tax_codes.id NULL
tax_amount            DECIMAL(15,4) DEFAULT 0
line_total            DECIMAL(15,4)
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### debit_notes
```
id                    UUID PK
business_id           UUID FK → businesses.id
debit_note_number     VARCHAR(100)
supplier_id           UUID FK → suppliers.id
purchase_invoice_id   UUID FK → purchase_invoices.id NULL
date                  DATE
description           TEXT NULL
currency_id           UUID FK → currencies.id NULL
exchange_rate         DECIMAL(18,8) NULL
cached_total          DECIMAL(15,4) DEFAULT 0
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### debit_note_lines
```
id                    UUID PK
debit_note_id         UUID FK → debit_notes.id
inventory_item_id     UUID FK → inventory_items.id NULL
account_id            UUID FK → accounts.id NULL
description           TEXT NULL
quantity              DECIMAL(15,4)
unit_price            DECIMAL(15,4)
tax_code_id           UUID FK → tax_codes.id NULL
tax_amount            DECIMAL(15,4) DEFAULT 0
line_total            DECIMAL(15,4)
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

### goods_receipts
```
id                    UUID PK
business_id           UUID FK → businesses.id
receipt_number        VARCHAR(100)
supplier_id           UUID FK → suppliers.id
purchase_order_id     UUID FK → purchase_orders.id NULL
date                  DATE
inventory_location_id UUID FK → inventory_locations.id NULL
description           TEXT NULL
notes                 TEXT NULL
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### goods_receipt_lines
```
id                    UUID PK
goods_receipt_id      UUID FK → goods_receipts.id
inventory_item_id     UUID FK → inventory_items.id
purchase_order_line_id UUID FK → purchase_order_lines.id NULL
description           TEXT NULL
quantity              DECIMAL(15,4)
unit_cost             DECIMAL(15,4) NULL
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

---

## 11. Inventory Module

### inventory_locations
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
description           TEXT NULL
is_default            BOOLEAN DEFAULT false
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### inventory_items
```
id                    UUID PK
business_id           UUID FK → businesses.id
code                  VARCHAR(100) NULL
name                  VARCHAR(255)
description           TEXT NULL
unit_of_measure       VARCHAR(50) NULL
valuation_method      ENUM('average_cost','fifo','specific_identification')
                      DEFAULT 'average_cost'
control_account_id    UUID FK → accounts.id NULL
sales_account_id      UUID FK → accounts.id NULL
purchase_account_id   UUID FK → accounts.id NULL
cost_of_sales_account_id UUID FK → accounts.id NULL
division_id           UUID FK → divisions.id NULL
default_selling_price DECIMAL(15,4) NULL
default_purchase_price DECIMAL(15,4) NULL
tax_code_id           UUID FK → tax_codes.id NULL
reorder_point         DECIMAL(15,4) NULL
reorder_quantity      DECIMAL(15,4) NULL
is_active             BOOLEAN DEFAULT true
-- DENORMALIZED (very high-read):
quantity_on_hand      DECIMAL(15,4) DEFAULT 0
quantity_to_deliver   DECIMAL(15,4) DEFAULT 0
quantity_to_receive   DECIMAL(15,4) DEFAULT 0
quantity_reserved     DECIMAL(15,4) DEFAULT 0
average_cost          DECIMAL(15,4) DEFAULT 0
total_value           DECIMAL(15,4) DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL

INDEX: business_id
INDEX: code
```

### inventory_item_locations  (qty per location — 3NF child of inventory_items)
```
id                    UUID PK
inventory_item_id     UUID FK → inventory_items.id
inventory_location_id UUID FK → inventory_locations.id
quantity_on_hand      DECIMAL(15,4) DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP

UNIQUE: inventory_item_id, inventory_location_id
```

### inventory_kits
```
id                    UUID PK
business_id           UUID FK → businesses.id
code                  VARCHAR(100) NULL
name                  VARCHAR(255)
description           TEXT NULL
selling_price         DECIMAL(15,4) NULL
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### inventory_kit_components
```
id                    UUID PK
kit_id                UUID FK → inventory_kits.id
inventory_item_id     UUID FK → inventory_items.id
quantity              DECIMAL(15,4)
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

### inventory_unit_costs
```
id                    UUID PK
business_id           UUID FK → businesses.id
inventory_item_id     UUID FK → inventory_items.id
effective_date        DATE
unit_cost             DECIMAL(15,4)
notes                 TEXT NULL
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### inventory_transfers
```
id                    UUID PK
business_id           UUID FK → businesses.id
transfer_number       VARCHAR(100)
date                  DATE
from_location_id      UUID FK → inventory_locations.id
to_location_id        UUID FK → inventory_locations.id
description           TEXT NULL
notes                 TEXT NULL
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### inventory_transfer_lines
```
id                    UUID PK
transfer_id           UUID FK → inventory_transfers.id
inventory_item_id     UUID FK → inventory_items.id
quantity              DECIMAL(15,4)
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

### inventory_write_offs
```
id                    UUID PK
business_id           UUID FK → businesses.id
write_off_number      VARCHAR(100)
date                  DATE
inventory_location_id UUID FK → inventory_locations.id NULL
description           TEXT NULL
expense_account_id    UUID FK → accounts.id NULL
notes                 TEXT NULL
cached_total_cost     DECIMAL(15,4) DEFAULT 0
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### inventory_write_off_lines
```
id                    UUID PK
write_off_id          UUID FK → inventory_write_offs.id
inventory_item_id     UUID FK → inventory_items.id
quantity              DECIMAL(15,4)
unit_cost             DECIMAL(15,4)
line_cost             DECIMAL(15,4)
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

### production_orders
```
id                    UUID PK
business_id           UUID FK → businesses.id
order_number          VARCHAR(100)
date                  DATE
inventory_item_id     UUID FK → inventory_items.id  -- finished good
inventory_location_id UUID FK → inventory_locations.id NULL
quantity_produced     DECIMAL(15,4)
description           TEXT NULL
status                ENUM('complete','insufficient_quantity','pending')
total_cost            DECIMAL(15,4) DEFAULT 0
notes                 TEXT NULL
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### production_order_components
```
id                    UUID PK
production_order_id   UUID FK → production_orders.id
inventory_item_id     UUID FK → inventory_items.id  -- raw material
quantity_required     DECIMAL(15,4)
quantity_used         DECIMAL(15,4) DEFAULT 0
unit_cost             DECIMAL(15,4)
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

---

## 12. Employees and Payroll Module

### employees
```
id                    UUID PK
business_id           UUID FK → businesses.id
code                  VARCHAR(50) NULL
name                  VARCHAR(255)
email                 VARCHAR(255) NULL
phone                 VARCHAR(50) NULL
address               TEXT NULL
date_of_birth         DATE NULL
date_hired            DATE NULL
date_terminated       DATE NULL
job_title             VARCHAR(255) NULL
department            VARCHAR(255) NULL
control_account_id    UUID FK → accounts.id NULL
division_id           UUID FK → divisions.id NULL
is_active             BOOLEAN DEFAULT true
notes                 TEXT NULL
-- DENORMALIZED:
cached_balance        DECIMAL(15,4) DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### payslip_items
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
item_type             ENUM('earning','deduction','employer_contribution')
account_id            UUID FK → accounts.id
is_active             BOOLEAN DEFAULT true
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### payslips
```
id                    UUID PK
business_id           UUID FK → businesses.id
payslip_number        VARCHAR(100)
employee_id           UUID FK → employees.id
date                  DATE
description           TEXT NULL
division_id           UUID FK → divisions.id NULL
-- DENORMALIZED:
gross_pay             DECIMAL(15,4) DEFAULT 0
total_deductions      DECIMAL(15,4) DEFAULT 0
net_pay               DECIMAL(15,4) DEFAULT 0
employer_contributions DECIMAL(15,4) DEFAULT 0
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### payslip_lines
```
id                    UUID PK
payslip_id            UUID FK → payslips.id
payslip_item_id       UUID FK → payslip_items.id
description           TEXT NULL
amount                DECIMAL(15,4)
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

### expense_claim_payers
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
employee_id           UUID FK → employees.id NULL
account_id            UUID FK → accounts.id
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### expense_claims
```
id                    UUID PK
business_id           UUID FK → businesses.id
claim_number          VARCHAR(100)
payer_id              UUID FK → expense_claim_payers.id
employee_id           UUID FK → employees.id NULL
date                  DATE
description           TEXT NULL
division_id           UUID FK → divisions.id NULL
project_id            UUID FK → projects.id NULL
cached_total          DECIMAL(15,4) DEFAULT 0
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### expense_claim_lines
```
id                    UUID PK
expense_claim_id      UUID FK → expense_claims.id
account_id            UUID FK → accounts.id
description           TEXT NULL
amount                DECIMAL(15,4)
tax_code_id           UUID FK → tax_codes.id NULL
tax_amount            DECIMAL(15,4) DEFAULT 0
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

---

## 13. Fixed Assets and Depreciation

### fixed_assets
```
id                    UUID PK
business_id           UUID FK → businesses.id
code                  VARCHAR(50) NULL
name                  VARCHAR(255)
description           TEXT NULL
serial_number         VARCHAR(255) NULL
location              VARCHAR(255) NULL
control_account_id    UUID FK → accounts.id NULL
depreciation_account_id UUID FK → accounts.id NULL
accumulated_depreciation_account_id UUID FK → accounts.id NULL
purchase_date         DATE NULL
disposal_date         DATE NULL
status                ENUM('active','disposed')
depreciation_method   ENUM('straight_line','diminishing_value') DEFAULT 'straight_line'
annual_depreciation_rate DECIMAL(8,4) DEFAULT 0
-- DENORMALIZED:
acquisition_cost      DECIMAL(15,4) DEFAULT 0
accumulated_depreciation DECIMAL(15,4) DEFAULT 0
book_value            DECIMAL(15,4) DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### depreciation_entries
```
id                    UUID PK
business_id           UUID FK → businesses.id
entry_number          VARCHAR(100)
date                  DATE
reference             VARCHAR(100) NULL
description           TEXT NULL
division_id           UUID FK → divisions.id NULL
cached_total          DECIMAL(15,4) DEFAULT 0
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### depreciation_entry_lines
```
id                    UUID PK
depreciation_entry_id UUID FK → depreciation_entries.id
fixed_asset_id        UUID FK → fixed_assets.id
amount                DECIMAL(15,4)
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

### intangible_assets
```
id                    UUID PK
business_id           UUID FK → businesses.id
code                  VARCHAR(50) NULL
name                  VARCHAR(255)
description           TEXT NULL
control_account_id    UUID FK → accounts.id NULL
amortization_account_id UUID FK → accounts.id NULL
accumulated_amortization_account_id UUID FK → accounts.id NULL
purchase_date         DATE NULL
disposal_date         DATE NULL
status                ENUM('active','disposed')
annual_amortization_rate DECIMAL(8,4) DEFAULT 0
-- DENORMALIZED:
acquisition_cost      DECIMAL(15,4) DEFAULT 0
accumulated_amortization DECIMAL(15,4) DEFAULT 0
book_value            DECIMAL(15,4) DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### amortization_entries
```
id                    UUID PK
business_id           UUID FK → businesses.id
entry_number          VARCHAR(100)
date                  DATE
reference             VARCHAR(100) NULL
description           TEXT NULL
division_id           UUID FK → divisions.id NULL
cached_total          DECIMAL(15,4) DEFAULT 0
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### amortization_entry_lines
```
id                    UUID PK
amortization_entry_id UUID FK → amortization_entries.id
intangible_asset_id   UUID FK → intangible_assets.id
amount                DECIMAL(15,4)
sort_order            INTEGER DEFAULT 0
created_at            TIMESTAMP
```

---

## 14. Investments Module

### investments
```
id                    UUID PK
business_id           UUID FK → businesses.id
code                  VARCHAR(50) NULL
name                  VARCHAR(255)
ticker_symbol         VARCHAR(20) NULL
investment_type       ENUM('stock','bond','mutual_fund','other')
control_account_id    UUID FK → accounts.id NULL
currency_id           UUID FK → currencies.id NULL
-- DENORMALIZED:
quantity_owned        DECIMAL(15,6) DEFAULT 0
average_cost_per_unit DECIMAL(15,4) DEFAULT 0
total_cost            DECIMAL(15,4) DEFAULT 0
current_market_price  DECIMAL(15,4) DEFAULT 0
current_market_value  DECIMAL(15,4) DEFAULT 0
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### investment_market_prices
```
id                    UUID PK
business_id           UUID FK → businesses.id
investment_id         UUID FK → investments.id
price_date            DATE
price                 DECIMAL(15,4)
created_by            UUID FK → users.id
created_at            TIMESTAMP
```

---

## 15. Capital Accounts Module

### capital_accounts
```
id                    UUID PK
business_id           UUID FK → businesses.id
code                  VARCHAR(50) NULL
name                  VARCHAR(255)
description           TEXT NULL
account_id            UUID FK → accounts.id
-- DENORMALIZED:
cached_balance        DECIMAL(15,4) DEFAULT 0
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

### capital_subaccounts
```
id                    UUID PK
business_id           UUID FK → businesses.id
name                  VARCHAR(255)
description           TEXT NULL
sort_order            INTEGER DEFAULT 0
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

---

## 16. Withholding Tax Module

### withholding_tax_receipts
```
id                    UUID PK
business_id           UUID FK → businesses.id
receipt_number        VARCHAR(100)
customer_id           UUID FK → customers.id
date                  DATE
sales_invoice_id      UUID FK → sales_invoices.id NULL
description           TEXT NULL
amount                DECIMAL(15,4)
created_by            UUID FK → users.id
created_at            TIMESTAMP
updated_at            TIMESTAMP
deleted_at            TIMESTAMP NULL
```

---

## 17. Tab Definitions and Page Specifications

Each entry describes:
- What the tab list page shows (columns)
- What the "New" form collects
- What clicking a record/balance link shows
- Which other modules that link connects to

---

### TAB: Summary
List page shows:
- Balance sheet summary grouped by account group
- Assets, liabilities, equity totals
- Period selector (Edit button)
- Transactions button → shows all journal lines for selected period

Clicking any balance amount:
→ Opens drill-down showing all journal_lines for that account
→ Columns: date, reference, description, debit, credit, running balance
→ Links back to source document (receipt, invoice, etc.)

---

### TAB: Bank and Cash Accounts
List page columns:
- Account name
- Account type (bank/cash/credit card)
- Currency
- Cleared balance (from last reconciliation)
- Pending deposits
- Net balance (cached_balance — clickable)
- Last reconciliation date

Clicking Net Balance link:
→ Shows combined receipt + payment transaction list for that account
→ Columns: date, reference, description, type (receipt/payment), amount, running balance
→ Each row is a link → opens the full receipt or payment form
→ Latest transaction at top (ORDER BY date DESC, created_at DESC)

New Account form fields:
- Name, account type, bank name, account number
- Currency, opening balance, opening balance date
- Control account (links to chart of accounts)

Sub-pages accessible from this tab:
- Bank Reconciliations → reconciliation_id → shows reconciled vs unreconciled lines
- Bank Rules → rule list → clicking rule opens rule edit form
- Import Bank Statement → CSV/OFX upload → matches against bank_rules
- Inter-Account Transfers → transfer list with from/to account, amount

---

### TAB: Receipts
List page columns:
- Date, reference, bank account, customer/payer, description, amount

Clicking amount:
→ Opens receipt detail showing all receipt_lines
→ Shows which invoices were cleared by this receipt
→ Shows journal entry that was posted

New Receipt form:
- Date, bank account, reference, description
- Payer type + customer selector
- Line items: account, description, amount, tax code
- Optional: link to sales invoice to clear it

---

### TAB: Payments
List page columns:
- Date, reference, bank account, payee, description, amount

Clicking amount → payment detail with lines, cleared invoices, journal entry

New Payment form:
- Date, bank account, reference, description
- Payee type + supplier/employee selector
- Line items: account, description, amount, tax code
- Optional: link to purchase invoice to clear it

---

### TAB: Customers
List page columns:
- Code, name, email, control account, division, balance (clickable)

Clicking balance link:
→ Shows full customer statement
→ All sales_invoices, receipts, credit_notes for this customer
→ Columns: date, type, reference, amount, paid, balance due
→ Each row is a clickable link to that document

Clicking customer name:
→ Opens customer detail/edit form

---

### TAB: Suppliers
List page columns:
- Code, name, email, control account, division, balance (clickable), qty to receive

Clicking balance → full supplier statement with purchase invoices and payments
Clicking name → supplier edit form

---

### TAB: Sales Quotes
List page columns:
- Date, expiry date, reference, customer, description, total, status

Status logic:
- Active → no linked sales order or invoice
- Accepted → has linked sales order or invoice
- Cancelled → manually cancelled
- Expired → past expiry date

Clicking reference → opens full quote with line items
Convert to Sales Order button → creates sales_order pre-filled from quote
Convert to Sales Invoice button → creates sales_invoice pre-filled

---

### TAB: Sales Orders
List page columns:
- Date, reference, customer, sales quote (link), description,
  qty to deliver, order amount, invoice amount, invoice status, delivery status

Clicking reference → full order with lines
Invoice Status link → goes to linked sales_invoices list filtered by this order
Delivery Status link → goes to linked delivery_notes list

---

### TAB: Sales Invoices
List page columns:
- Date, due date, reference, customer, description,
  total, paid amount, balance due, status (color coded), days overdue

Status colors:
- Green = Paid
- Amber = Due (not yet overdue)
- Red = Overdue
- Gray = Draft

Clicking reference → full invoice with all lines
Clicking customer name → customer statement
Clicking balance due → receipt allocation page
Send button → email invoice to customer

---

### TAB: Credit Notes
List page columns:
- Date, reference, customer, sales invoice (link), description, cost of sales, amount

Clicking sales invoice link → opens that sales invoice
Clicking amount → credit note detail with lines

---

### TAB: Delivery Notes
List page columns:
- Delivery date, reference, order number (link), invoice number (link),
  customer, inventory location, description, quantity delivered

---

### TAB: Late Payment Fees
List page columns:
- Date, customer (link), invoice reference (link), amount

---

### TAB: Purchase Quotes / Orders / Invoices / Debit Notes / Goods Receipts
Same pattern as Sales equivalents — mirror structure for supplier side.

Purchase Invoices list additional columns:
- Invoice status, days overdue, payment due date

---

### TAB: Inventory Items
List page columns:
- Code, name, valuation method, control account, division,
  qty on hand (clickable), qty to deliver, qty to receive,
  qty reserved, reorder point, qty needed, avg cost, total value

Clicking qty on hand:
→ Shows all inventory movements for this item
→ Columns: date, type (receipt/delivery/write-off/transfer/production), qty in, qty out, balance

---

### TAB: Inventory Kits
List: kit code, name, components count, selling price

---

### TAB: Inventory Locations
List: location name, description, is default

---

### TAB: Inventory Transfers
List: date, reference, from location, to location, description, items count

---

### TAB: Inventory Write-offs
List: date, reference, location, description, total cost

---

### TAB: Inventory Unit Costs
List: item name, effective date, unit cost

---

### TAB: Production Orders
List: date, reference, finished item, location, qty produced, total cost, status

---

### TAB: Fixed Assets
List: code, name, acquisition cost (link), accumulated depreciation, book value, status

Clicking acquisition cost link → shows all payments/purchase invoices that funded this asset

---

### TAB: Depreciation Entries
List: date, reference, description, assets included, division, total amount

---

### TAB: Intangible Assets / Amortization Entries
Same pattern as Fixed Assets / Depreciation Entries

---

### TAB: Employees
List: code, name, email, control account, division, balance (clickable)

Clicking balance → employee statement with payslips and payments

---

### TAB: Payslip Items
List: name, type (earning/deduction/contribution), account

---

### TAB: Payslips
List: date, reference, employee (link), description, gross pay, deductions, net pay, employer contributions

Clicking employee link → employee record
Clicking reference → full payslip detail

---

### TAB: Expense Claim Payers
List: name, employee, account

---

### TAB: Expense Claims
List: date, reference, payer, employee, description, accounts, total

---

### TAB: Capital Accounts
List: code, name, balance (clickable)

Clicking balance → all transactions contributing to this account balance

---

### TAB: Investments
List: code/ticker, name, control account, quantity, market price, market value

---

### TAB: Billable Time
List: date, customer, description, hours, hourly rate, total, status (unbilled/invoiced/written off)

---

### TAB: Billable Expenses
List: date, customer, description, amount, status

---

### TAB: Projects
List: name, total income (link), total expenses (link), net profit

Clicking income link → all receipts/invoices tagged to this project
Clicking expenses link → all payments tagged to this project

---

### TAB: Divisions
List: code, name, description

---

### TAB: Folders
List: name, description

---

### TAB: Journal Entries
List: date, reference, description, accounts, debit total, credit total, status (balanced/unbalanced)

Clicking reference → full journal with all lines, debit/credit, running balance

---

### TAB: Reports
Static list of available reports grouped by category.
Each report is a link that opens a parameterised report page.

Categories:
- Financial Statements: Balance Sheet, Profit and Loss, Trial Balance, Cash Flow
- Tax: Tax Summary, Tax Audit
- Customers: Aged Receivables, Customer Statement, Sales by Customer
- Suppliers: Aged Payables, Supplier Statement, Purchases by Supplier
- Inventory: Inventory Value, Inventory Movement, Stock Reorder Report
- Fixed Assets: Fixed Asset Register, Depreciation Schedule
- Payroll: Payroll Summary, Employee Earnings
- General Ledger, Transaction Listing
- Forecasts: Forecast P&L, Actual vs Budget

Each report page has:
- Date range picker
- Comparison period toggle
- Filter by division/project/customer/supplier
- Export (PDF, CSV)

---

### TAB: Settings
Two-section layout:
- Upper: active features (click to configure)
- Lower: inactive features (click to activate and they move to upper)

Feature items with settings pages:
- Business Details → businesses table fields + logo upload
- Chart of Accounts → accounts + account_groups tree editor
- Tax Codes → tax_codes list + form
- Currencies → currencies list + exchange_rates form
- Users → users list + permissions form
- Custom Fields → custom_fields list per form type
- Themes → themes list + HTML editor
- Footers → footers list + editor
- Form Defaults → defaults per form type
- Recurring Transactions → recurring_transactions list
- Lock Date → lock_dates form
- Forecasts → forecasts form
- Bank Rules → bank_rules list
- Withholding Tax → toggle + rate configuration
- Date and Number Format → businesses.date_format etc.
- Divisions → divisions list
- Special Accounts → special_accounts list
- Control Accounts → control_accounts list
- Access Tokens → access_tokens list
- Capital Subaccounts → capital_subaccounts list
- Cash Flow Statement Groups → account_groups cash_flow_group field
- Investment Market Prices → investment_market_prices form
- Payslip Items → payslip_items list
- Expense Claim Payers → expense_claim_payers list
- Non-Inventory Items → (items with is_inventory=false in accounts)
- Inventory Locations → inventory_locations list

---

## 18. Key Relationships Summary

```
businesses           ──< bank_accounts
businesses           ──< customers
businesses           ──< suppliers
businesses           ──< employees
businesses           ──< accounts (chart of accounts)
businesses           ──< tax_codes
businesses           ──< inventory_items
businesses           ──< projects
businesses           ──< divisions

bank_accounts        ──< receipts
bank_accounts        ──< payments
bank_accounts        ──< inter_account_transfers (×2: from + to)
bank_accounts        ──< bank_reconciliations

customers            ──< sales_quotes
customers            ──< sales_orders
customers            ──< sales_invoices
customers            ──< credit_notes
customers            ──< receipts
customers            ──< billable_time
customers            ──< billable_expenses
customers            ──< late_payment_fees
customers            ──< withholding_tax_receipts

suppliers            ──< purchase_quotes
suppliers            ──< purchase_orders
suppliers            ──< purchase_invoices
suppliers            ──< debit_notes
suppliers            ──< payments
suppliers            ──< goods_receipts

sales_quotes         ──< sales_quote_lines
sales_orders         ──< sales_order_lines
sales_invoices       ──< sales_invoice_lines
sales_invoices       ──< receipt_lines         (clears invoice)
sales_invoices       ──< credit_notes
sales_invoices       ──< late_payment_fees
sales_invoices       ──< delivery_notes
sales_orders         >── sales_quotes
sales_invoices       >── sales_orders

purchase_quotes      ──< purchase_quote_lines
purchase_orders      ──< purchase_order_lines
purchase_invoices    ──< purchase_invoice_lines
purchase_invoices    ──< payment_lines          (clears invoice)
purchase_invoices    ──< debit_notes
purchase_orders      >── purchase_quotes
purchase_invoices    >── purchase_orders

inventory_items      ──< inventory_item_locations
inventory_items      ──< inventory_kit_components
inventory_items      ──< inventory_unit_costs
inventory_items      ──< sales_invoice_lines
inventory_items      ──< purchase_invoice_lines
inventory_items      ──< goods_receipt_lines
inventory_items      ──< delivery_note_lines
inventory_items      ──< inventory_transfer_lines
inventory_items      ──< inventory_write_off_lines
inventory_items      ──< production_orders (finished good)
inventory_items      ──< production_order_components (raw material)

employees            ──< payslips
employees            ──< expense_claims
employees            ──< payments (payee)

fixed_assets         ──< depreciation_entry_lines
intangible_assets    ──< amortization_entry_lines

journal_entries      ──< journal_lines
journal_entries      >── accounts (via journal_lines)

ALL transactional tables → journal_entries (via source_type + source_id)
```

---

## 19. Indexes for High-Read Paths (must create in migrations)

```sql
-- Journal lookup (used in every report)
CREATE INDEX idx_journal_lines_account_date
  ON journal_lines(account_id)
  INCLUDE (debit, credit);

-- Invoice aging
CREATE INDEX idx_sales_invoices_status_due
  ON sales_invoices(business_id, status, due_date);

-- Customer statement
CREATE INDEX idx_sales_invoices_customer
  ON sales_invoices(customer_id, date DESC);

-- Bank account transaction history
CREATE INDEX idx_receipts_bank_date
  ON receipts(bank_account_id, date DESC);
CREATE INDEX idx_payments_bank_date
  ON payments(bank_account_id, date DESC);

-- Inventory list
CREATE INDEX idx_inventory_items_business
  ON inventory_items(business_id, is_active);

-- Custom field values lookup
CREATE INDEX idx_custom_field_values_record
  ON custom_field_values(custom_field_id, record_id);
```

---

## 20. Notes for Claude When Building Pages

1. Always show proposed UI changes to the user before implementing.
2. List pages must be paginated (25 rows default, configurable).
3. All list pages must support "Edit Columns" — user can toggle which columns
   are visible. Store preferences in user_preferences table (not yet defined —
   add it when building this feature).
4. All list pages must support "Advanced Queries" — filter, sort, group.
5. Clicking a balance/amount link always opens a modal or side panel first,
   not a full page navigation, unless the data is > 50 rows.
6. When recalculating cached_balance fields, always wrap in a database
   transaction with the triggering write.
7. Soft deletes only — never hard delete transactional data.
8. All monetary arithmetic must use DECIMAL — never float.
9. Every form must post a journal_entry on save. No exceptions.
10. Lock date must be enforced — reject any transaction dated on or before
    lock_date with a clear error message.
