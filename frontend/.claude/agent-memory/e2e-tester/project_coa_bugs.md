---
name: COA Feature Audit Findings
description: Critical bugs and issues found in Chart of Accounts feature during 2026-04-06 audit
type: project
---

Audit date: 2026-04-06. Feature: Chart of Accounts (BusinessChartOfAccounts.jsx + backend coa.py)

**Bug 1 (CRITICAL) — Field name mismatch: `category` vs no backend field**
The GroupDialog sends `{ name, category, type }` to the backend via `handleGroupSave`.
The backend `CoaGroupCreate` schema only accepts `{ name, type, parent_group_id }`.
The `category` field is silently dropped by the backend — it is stored nowhere.
The `coa_groups` DB table has no `category` column.
File: `BusinessChartOfAccounts.jsx` line 236.

**Bug 2 (CRITICAL) — Field name mismatch: `cash_flow_activity` vs `cash_flow_category`**
The AccountDialog payload uses `cash_flow_activity` (line 331).
The backend `CoaAccountCreate` schema expects `cash_flow_category`.
The `coa_accounts` DB table column is `cash_flow_category`.
Result: cash flow activity is always null in the database even when selected.
File: `BusinessChartOfAccounts.jsx` line 331.

**Bug 3 (CRITICAL) — Frontend filters accounts by `a.type` but `coa_accounts` has no `type` column**
Line 421: `accounts.filter((a) => a.type === panelType && !a.group_id)` — ungrouped.
The DB schema for `coa_accounts` has no `type` column. The backend response schema
`CoaAccountResponse` has no `type` field. So `a.type` is always `undefined`, meaning
ALL ungrouped accounts appear in BOTH panels simultaneously.
File: `BusinessChartOfAccounts.jsx` line 421.

**Bug 4 (CRITICAL) — `is_total` field does not exist in backend or DB**
Line 575: `createCoaAccount(businessId, { name: 'Total', type: 'pl', is_total: true })`.
`CoaAccountCreate` schema does not have `is_total`. DB `coa_accounts` has no `is_total` column.
Also `AccountRow` at line 721 checks `account.is_total` — always false/undefined.
The "New Total" button will create an account with name "Total" and no special marking.
File: `BusinessChartOfAccounts.jsx` lines 575, 721.

**Bug 5 (MAJOR) — `reorderCoaAccounts` called with `group_id: null` but backend requires non-null string**
`CoaAccountsOrderUpdate.group_id` is typed `str` (required, non-optional) in the backend.
The frontend calls `reorderCoaAccounts(businessId, { group_id: null, items: [...] })` for ungrouped.
This will fail validation with HTTP 422.
File: `BusinessChartOfAccounts.jsx` line 487 and `coa.py` `CoaAccountsOrderUpdate`.

**Bug 6 (MINOR) — Account panel filter uses `a.type` for grouped accounts too (GroupRows)**
`panelGroups` is filtered by `g.type === panelType` (groups do have `type`).
But `groupAccounts = accounts.filter((a) => a.group_id === group.id)` — this is correct.
Grouped accounts are found correctly. Only the ungrouped filter is broken (Bug 3).

**Bug 7 (MINOR) — Delete UI is completely missing from the component**
The test plan step 13 says "delete an account". There is no Trash icon, no delete button,
no delete handler in `BusinessChartOfAccounts.jsx`. The `deleteCoaAccount` and `deleteCoaGroup`
functions exist in `coa.service.js` but are never called in the UI.

**What works correctly:**
- Skeleton loader structure mirrors the two-panel layout
- Balance Sheet | P&L two-panel grid layout renders correctly
- Group creation form structure (name + category select) is correct UI-wise
- Account creation form structure (name + group select) is correct UI-wise
- Reorder groups modal (DnD) will work when triggered for groups (>1 group)
- Backend CRUD endpoints all exist and are registered
- Architecture is correct: service → `/api/v1/*` → FastAPI → repository
- No Supabase client in components
- Semantic color tokens used throughout
- Settings page COA entry has no `comingSoon` flag — correctly activated
- Business owner check (`_require_business`) is correct

**How to apply:** Fix bugs 1–5 before any manual or automated testing — they will cause
silent data loss (bugs 1, 2) or incorrect UI rendering (bugs 3, 4, 5).
