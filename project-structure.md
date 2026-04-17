# BookVault — UI Page Specifications
# Detailed layout of every tab and page in the application

---

## Tab Menu Overview

```
BookVault (Manager.io Clone)
│
├── 📊 Summary                          ← reads from journal_lines (balance sheet view)
│
├── 🏦 Bank and Cash Accounts           ── Phase 2 (IN PROGRESS)
│   ├── [list of bank/cash accounts]
│   ├── → Receipts                      ✅ DONE
│   ├── → Payments                      ⏳ Phase 2A
│   ├── → Inter-Account Transfers       ⏳ Phase 2B
│   └── → Bank Reconciliation           ⏳ Phase 2C
│
├── 👥 Customers                        ✅ DONE (expand in Phase 3)
│
├── 🧾 Sales                            ── Phase 3
│   ├── Sales Invoices                  ⏳ 3B
│   ├── Sales Quotes                    ⏳ 3C
│   ├── Sales Orders                    ⏳ 3D
│   ├── Credit Notes                    ⏳ 3E
│   ├── Delivery Notes                  ⏳ 3F
│   ├── Late Payment Fees               ⏳ 3G
│   ├── Billable Time                   ⏳ 3H
│   └── Billable Expenses               ⏳ 3H
│
├── 🏭 Suppliers                        ✅ DONE (expand in Phase 4)
│
├── 🛒 Purchases                        ── Phase 4
│   ├── Purchase Invoices               ⏳ 4B
│   ├── Purchase Quotes                 ⏳ 4C
│   ├── Purchase Orders                 ⏳ 4D
│   ├── Debit Notes                     ⏳ 4E
│   └── Goods Receipts                  ⏳ 4F
│
├── 📦 Inventory                        ── Phase 5
│   ├── Items                           ⏳ 5B
│   ├── Locations                       ⏳ 5A
│   ├── Kits                            ⏳ 5E
│   ├── Transfers                       ⏳ 5F
│   ├── Write-offs                      ⏳ 5G
│   └── Production Orders               ⏳ 5H
│
├── 👷 Employees & Payroll              ── Phase 6
│   ├── Employees                       ⏳ 6A
│   ├── Payslips                        ⏳ 6C
│   └── Expense Claims                  ⏳ 6E
│
├── 🏗️ Fixed Assets                     ── Phase 7
│   ├── Fixed Assets                    ⏳ 7A
│   ├── Depreciation Entries            ⏳ 7B
│   ├── Intangible Assets               ⏳ 7C
│   └── Amortization Entries            ⏳ 7D
│
├── 💰 Advanced Finance                 ── Phase 8
│   ├── Capital Accounts                ⏳ 8A
│   ├── Investments                     ⏳ 8B
│   ├── Withholding Tax Receipts        ⏳ 8C
│   └── Journal Entries (Manual)        ⏳ 8D
│
├── 📈 Reports                          ── Phase 9
│   ├── Balance Sheet
│   ├── Profit & Loss
│   ├── Trial Balance
│   ├── Cash Flow Statement
│   ├── Tax Summary / Tax Audit
│   ├── Aged Receivables / Payables
│   ├── Customer & Supplier Statements
│   ├── Inventory Value / Movement
│   ├── Asset Register / Depreciation Schedule
│   ├── Payroll Summary
│   ├── General Ledger
│   └── Forecast P&L / Actual vs Budget
│
└── ⚙️ Settings                         ── Phase 10
    ├── Business Details                ✅ partial
    ├── Chart of Accounts               ✅ DONE
    ├── Tax Codes                       ⏳
    ├── Currencies & Exchange Rates     ⏳
    ├── Divisions                       ⏳
    ├── Bank Rules                      ⏳ (Phase 2D)
    ├── Custom Fields                   ⏳
    ├── Recurring Transactions          ⏳
    ├── Lock Date                       ⏳
    ├── Themes / Footers / Form Defaults⏳
    ├── Payslip Items                   ⏳ (Phase 6B)
    ├── Expense Claim Payers            ⏳ (Phase 6D)
    ├── Inventory Locations             ⏳ (Phase 5A)
    ├── Capital Subaccounts             ⏳ (Phase 8A)
    ├── Investment Prices               ⏳ (Phase 8B)
    ├── Special/Control Accounts        ⏳
    ├── Cash Flow Groups                ⏳
    └── Users & Permissions             ✅ DONE (admin panel)
```

**Legend:** ✅ Done | ⏳ Not built yet

---

## Detailed Page Specifications

---

## 📊 SUMMARY

**Page Type:** Dashboard (read-only, no "New" button)

```
┌─────────────────────────────────────────────────┐
│  Summary               [Period: This Year ▼] [Edit]│
├─────────────────────────────────────────────────┤
│  BALANCE SHEET                                  │
│                                                 │
│  Assets                                         │
│  ├── Current Assets                             │
│  │   ├── Cash & Cash Equivalents    $12,500.00 ←── clickable
│  │   ├── Accounts Receivable         $5,200.00 ←── clickable
│  │   └── Inventory on Hand           $8,000.00 ←── clickable
│  │                               ──────────────  │
│  │   Total Current Assets           $25,700.00   │
│  └── Total Assets                   $25,700.00   │
│                                                 │
│  Liabilities                                    │
│  ├── Current Liabilities                        │
│  │   ├── Accounts Payable            $3,100.00 ←── clickable
│  │   └── Tax Payable                 $1,400.00 ←── clickable
│  └── Total Liabilities               $4,500.00   │
│                                                 │
│  Equity                                         │
│  ├── Retained Earnings              $21,200.00   │
│  └── Total Equity                   $21,200.00   │
│                                                 │
│  PROFIT & LOSS                                  │
│  ├── Income                                     │
│  │   └── Sales Revenue              $30,000.00 ←── clickable
│  ├── Expenses                                   │
│  │   └── Operating Expenses          $8,800.00 ←── clickable
│  └── Net Profit                     $21,200.00   │
└─────────────────────────────────────────────────┘
```

**Clicking any amount** → side panel: journal lines for that account
(date, reference, debit, credit, running balance — each row links to source document)

---

## 🏦 BANK AND CASH ACCOUNTS

**Page Type:** Master list + sub-pages

```
┌──────────────────────────────────────────────────────────────────┐
│  Bank and Cash Accounts                      [New Account]        │
├────────────────┬──────────┬──────────┬──────────┬───────────────┤
│ Account Name   │ Type     │ Currency │ Cleared  │ Net Balance   │
├────────────────┼──────────┼──────────┼──────────┼───────────────┤
│ Main Checking  │ Bank     │ USD      │ $9,800   │ $12,500.00 ←──│
│ Petty Cash     │ Cash     │ USD      │ —        │    $200.00 ←──│
│ VISA Corporate │ Credit   │ USD      │ $2,100   │  -$1,500.00 ←─│
└────────────────┴──────────┴──────────┴──────────┴───────────────┘
  Sub-page links: [Receipts] [Payments] [Transfers] [Reconciliation]
```

**Clicking Net Balance** → transaction list for that account:
```
Date | Reference | Description | Type | Amount | Running Balance
```

**New Account form fields:**
`Name · Account Type (bank/cash/credit card/other) · Bank Name · Account Number · Currency · Opening Balance · Opening Balance Date · Control Account`

---

### → Receipts (sub-page) ✅ DONE

```
┌────────────────────────────────────────────────────────┐
│  Receipts                                  [New Receipt]│
├──────┬───────────┬─────────────┬──────────┬───────────┤
│ Date │ Reference │ Bank Account│ Customer │ Amount    │
├──────┼───────────┼─────────────┼──────────┼───────────┤
│ ...  │ REC-001   │ Main Check. │ Acme Ltd │ $1,200.00 │
└──────┴───────────┴─────────────┴──────────┴───────────┘
```

**New Receipt form:**
```
Bank Account [dropdown]    Date [date]    Reference [text]
Description [text]
Payer: ○ Customer [dropdown]  ○ Other [text]

Lines:
┌──────────────────┬─────────────┬──────────┬────────────┐
│ Account          │ Description │ Tax Code │ Amount     │
├──────────────────┼─────────────┼──────────┼────────────┤
│ [COA dropdown]   │             │          │            │
└──────────────────┴─────────────┴──────────┴────────────┘
                              [+ Add Line]  Total: $0.00
[Attach Invoice]                    [Cancel] [Save]
```

---

### → Payments (sub-page) ⏳ Phase 2A

```
┌────────────────────────────────────────────────────────┐
│  Payments                                  [New Payment]│
├──────┬───────────┬─────────────┬──────────┬───────────┤
│ Date │ Reference │ Bank Account│ Payee    │ Amount    │
└──────┴───────────┴─────────────┴──────────┴───────────┘
```

**New Payment form (mirrors Receipts):**
```
Bank Account · Date · Reference · Description
Payee: ○ Supplier  ○ Employee  ○ Other
Lines: Account · Description · Tax Code · Amount
[Link to Purchase Invoice]
```

---

### → Inter-Account Transfers (sub-page) ⏳ Phase 2B

```
┌──────┬───────────┬────────────────┬────────────────┬──────────┐
│ Date │ Reference │ From Account   │ To Account     │ Amount   │
└──────┴───────────┴────────────────┴────────────────┴──────────┘
```

**New Transfer form:**
```
Date · Reference · From Account [dropdown] · To Account [dropdown]
Amount · Description
```

---

### → Bank Reconciliation (sub-page) ⏳ Phase 2C

```
Select Account: [Main Checking ▼]

Reconciliation Date: [date]   Statement Balance: [amount]

┌──────────┬───────┬─────────────┬────────┬─────────┐
│ Date     │ Ref   │ Description │ Amount │ Cleared │
├──────────┼───────┼─────────────┼────────┼─────────┤
│ Jan 5    │ R001  │ Client pymt │ +500   │ [✓]     │
│ Jan 6    │ P002  │ Rent paid   │ -1200  │ [ ]     │
└──────────┴───────┴─────────────┴────────┴─────────┘
Book Balance: $12,500   Statement: $12,500   Difference: $0.00
                                          [Save Reconciliation]
```

---

## 👥 CUSTOMERS ✅ DONE (expand in Phase 3)

```
┌─────────────────────────────────────────────────────────────┐
│  Customers                                   [New Customer]  │
├────────┬──────────────┬───────────┬──────────┬─────────────┤
│ Code   │ Name         │ Email     │ Division │ Balance     │
├────────┼──────────────┼───────────┼──────────┼─────────────┤
│ C001   │ Acme Ltd  ←──│ @acme.com │ Main     │ $5,200.00 ←─│
└────────┴──────────────┴───────────┴──────────┴─────────────┘
```

- **Clicking Name** → edit customer form
- **Clicking Balance** → customer statement (all invoices + receipts + credit notes, with running balance)

**New Customer form:**
`Code · Name · Email · Phone · Address · City · State · Country · Postal Code · Tax Number · Credit Limit · Payment Terms · Website · Notes · Control Account · Division`

---

## 🏭 SUPPLIERS ✅ DONE (expand in Phase 4)

Same layout as Customers. Extra column: `Qty to Receive`

- **Clicking Balance** → supplier statement (purchase invoices + payments + debit notes)
- **Clicking Name** → edit supplier form

---

## 🧾 SALES MODULE — Phase 3

---

### Sales Quotes ⏳ 3C

```
┌──────┬──────────┬──────────┬──────────────┬───────────┬────────┬──────────┐
│ Date │ Expiry   │ Quote #  │ Customer     │ Total     │ Status │ Actions  │
├──────┼──────────┼──────────┼──────────────┼───────────┼────────┼──────────┤
│ ...  │ Mar 30   │ QT-001 ←─│ Acme Ltd     │ $3,500.00 │ Active │ Convert  │
└──────┴──────────┴──────────┴──────────────┴───────────┴────────┴──────────┘
```

Status badges: `Active(blue)` `Accepted(green)` `Cancelled(gray)` `Expired(red)`

Action buttons: `[Convert to Sales Order]` `[Convert to Invoice]`

**New Quote form:** Customer · Date · Expiry Date · Description · Notes
Line items: Item/Account · Description · Qty · Unit Price · Discount · Tax Code · Line Total

---

### Sales Orders ⏳ 3D

```
┌──────┬──────────┬────────────┬───────────┬──────────────┬───────────────┐
│ Date │ Order #  │ Customer   │ Qty Deliv.│ Order Amount │ Invoice Status│
├──────┼──────────┼────────────┼───────────┼──────────────┼───────────────┤
│ ...  │ SO-001 ←─│ Acme Ltd   │ 0/5       │ $3,500.00    │ Uninvoiced  ←─│
└──────┴──────────┴────────────┴───────────┴──────────────┴───────────────┘
```

- **Clicking Invoice Status** → linked sales invoices filtered by this order
- **Clicking Delivery Status** → linked delivery notes

---

### Sales Invoices ⏳ 3B

```
┌──────┬──────────┬──────────┬────────────┬─────────┬──────────┬─────────┬──────────┐
│ Date │ Due Date │ Inv. #   │ Customer   │ Total   │ Paid     │ Balance │ Status   │
├──────┼──────────┼──────────┼────────────┼─────────┼──────────┼─────────┼──────────┤
│ ...  │ Mar 15   │ INV-001←─│ Acme Ltd ←─│$3,500   │ $0       │$3,500 ←─│🔴Overdue │
│ ...  │ Apr 10   │ INV-002←─│ Beta Co  ←─│$1,200   │ $1,200   │ $0      │🟢Paid    │
└──────┴──────────┴──────────┴────────────┴─────────┴──────────┴─────────┴──────────┘
```

Status colors: `🟢 Paid` `🟡 Due` `🔴 Overdue` `⚫ Draft` `🚫 Cancelled`

- **Clicking Balance Due** → receipt allocation panel
- **Clicking Customer** → customer statement
- **Send button** → email invoice to customer

---

### Credit Notes ⏳ 3E

```
┌──────┬──────────┬────────────┬──────────────┬──────────────┬──────────┐
│ Date │ CN #     │ Customer   │ Invoice Link │ Cost of Sales│ Amount   │
└──────┴──────────┴────────────┴──────────────┴──────────────┴──────────┘
```

---

### Delivery Notes ⏳ 3F

```
┌──────┬────────┬──────────┬─────────┬────────────┬──────────┬──────────────┐
│ Date │ Del. # │ Order #  │ Inv. #  │ Customer   │ Location │ Qty Delivered│
└──────┴────────┴──────────┴─────────┴────────────┴──────────┴──────────────┘
```

---

### Late Payment Fees ⏳ 3G

```
┌──────┬──────────────┬──────────────────┬──────────┐
│ Date │ Customer     │ Invoice Reference │ Amount   │
└──────┴──────────────┴──────────────────┴──────────┘
```

---

### Billable Time ⏳ 3H

```
┌──────┬──────────┬─────────────┬───────┬─────────────┬──────────┬────────────┐
│ Date │ Customer │ Description │ Hours │ Hourly Rate │ Total    │ Status     │
└──────┴──────────┴─────────────┴───────┴─────────────┴──────────┴────────────┘
```

Status: `Unbilled(amber)` · `Invoiced(green)` · `Written Off(gray)`

---

### Billable Expenses ⏳ 3H

```
┌──────┬──────────┬─────────────┬──────────┬──────────┐
│ Date │ Customer │ Description │ Amount   │ Status   │
└──────┴──────────┴─────────────┴──────────┴──────────┘
```

---

## 🛒 PURCHASE MODULE — Phase 4

---

### Purchase Quotes ⏳ 4C
Same structure as Sales Quotes but with `Supplier` instead of `Customer`.

---

### Purchase Orders ⏳ 4D
Same structure as Sales Orders but with `Supplier`.

---

### Purchase Invoices ⏳ 4B

```
┌──────┬──────────┬──────────┬──────────┬───────┬──────────┬─────────┬──────────┐
│ Date │ Due Date │ Inv. #   │ Supplier │ Total │ Paid     │ Balance │ Status   │
└──────┴──────────┴──────────┴──────────┴───────┴──────────┴─────────┴──────────┘
```

Status: `🔴 Unpaid` `🟡 Partially Paid` `🟢 Paid` `🔴 Overdue`

---

### Debit Notes ⏳ 4E
Mirror of Credit Notes for supplier side.

---

### Goods Receipts ⏳ 4F

```
┌──────┬──────────┬──────────┬────────────────┬──────────┬──────────────┐
│ Date │ GR #     │ Supplier │ Purchase Order │ Location │ Description  │
└──────┴──────────┴──────────┴────────────────┴──────────┴──────────────┘
```

---

## 📦 INVENTORY MODULE — Phase 5

---

### Inventory Items ⏳ 5B

```
┌──────┬─────────────┬────────────┬──────────┬──────────┬──────────┬──────────┐
│ Code │ Name        │ Valuation  │ On Hand  │ To Deliv │ To Recv  │ Avg Cost │
├──────┼─────────────┼────────────┼──────────┼──────────┼──────────┼──────────┤
│ I001 │ Widget A    │ Avg Cost   │  150 ←───│  20      │  50      │ $8.50    │
└──────┴─────────────┴────────────┴──────────┴──────────┴──────────┴──────────┘
```

**Clicking Qty on Hand** → inventory movement history:
```
Date | Type (receipt/delivery/transfer/write-off) | Qty In | Qty Out | Balance
```

**New Item form:**
`Code · Name · Unit of Measure · Valuation Method · Sales Account · Purchase Account · Cost of Sales Account · Inventory Account · Default Sell Price · Default Buy Price · Reorder Point`

---

### Inventory Kits ⏳ 5E

```
┌──────┬─────────────────┬───────────┬──────────────┐
│ Code │ Name            │ Components│ Selling Price│
└──────┴─────────────────┴───────────┴──────────────┘
```

---

### Inventory Locations ⏳ 5A

```
┌──────────────────┬─────────────┬────────────┐
│ Name             │ Description │ Is Default │
└──────────────────┴─────────────┴────────────┘
```

---

### Inventory Transfers ⏳ 5F

```
┌──────┬──────────┬───────────────┬──────────────┬─────────────┐
│ Date │ Ref      │ From Location │ To Location  │ Items Count │
└──────┴──────────┴───────────────┴──────────────┴─────────────┘
```

---

### Inventory Write-offs ⏳ 5G

```
┌──────┬──────────┬──────────┬─────────────┬────────────┐
│ Date │ Ref      │ Location │ Description │ Total Cost │
└──────┴──────────┴──────────┴─────────────┴────────────┘
```

---

### Production Orders ⏳ 5H

```
┌──────┬──────────┬───────────────┬──────────┬──────────┬────────────┬──────────┐
│ Date │ Order #  │ Finished Item │ Location │ Qty Prod │ Total Cost │ Status   │
└──────┴──────────┴───────────────┴──────────┴──────────┴────────────┴──────────┘
```

Status: `Complete(green)` · `Pending(amber)` · `Insufficient Qty(red)`

---

## 👷 EMPLOYEES & PAYROLL — Phase 6

---

### Employees ⏳ 6A

```
┌──────┬────────────────┬───────────┬─────────────────┬─────────────┐
│ Code │ Name           │ Email     │ Control Account │ Balance     │
└──────┴────────────────┴───────────┴─────────────────┴─────────────┘
```

**Clicking Balance** → employee statement (payslips + payments)

---

### Payslips ⏳ 6C

```
┌──────┬──────────┬────────────┬───────────┬──────────┬───────────┬─────────┐
│ Date │ Payslip# │ Employee   │ Gross Pay │ Deduct.  │ Net Pay   │ Contrib │
└──────┴──────────┴────────────┴───────────┴──────────┴───────────┴─────────┘
```

**New Payslip form:**
```
Employee [dropdown]   Date [date]   Payslip # [text]
Description [text]

Lines:
┌──────────────────────┬──────────────┬──────────┐
│ Payslip Item         │ Description  │ Amount   │
└──────────────────────┴──────────────┴──────────┘
Gross Pay: $X   Deductions: $X   Net Pay: $X
```

---

### Expense Claims ⏳ 6E

```
┌──────┬──────────┬────────────┬──────────┬─────────────┬──────────┐
│ Date │ Claim #  │ Payer      │ Employee │ Description │ Total    │
└──────┴──────────┴────────────┴──────────┴─────────────┴──────────┘
```

---

## 🏗️ FIXED ASSETS — Phase 7

---

### Fixed Assets ⏳ 7A

```
┌──────┬─────────────────┬──────────────────┬─────────────────┬──────────┬────────┐
│ Code │ Name            │ Acquisition Cost │ Accum. Deprec.  │ Book Val │ Status │
├──────┼─────────────────┼──────────────────┼─────────────────┼──────────┼────────┤
│ FA01 │ Company Car     │    $25,000.00 ←──│      $5,000.00  │$20,000   │ Active │
└──────┴─────────────────┴──────────────────┴─────────────────┴──────────┴────────┘
```

Status: `Active(green)` · `Disposed(gray)`

**Clicking Acquisition Cost** → all purchase invoices/payments that funded this asset

---

### Depreciation Entries ⏳ 7B

```
┌──────┬──────────┬─────────────┬───────────────┬──────────┬──────────┐
│ Date │ Entry #  │ Description │ Assets Incl.  │ Division │ Total    │
└──────┴──────────┴─────────────┴───────────────┴──────────┴──────────┘
```

---

### Intangible Assets ⏳ 7C
Same layout as Fixed Assets with `Accumulated Amortization` instead of `Accumulated Depreciation`.

---

### Amortization Entries ⏳ 7D
Same layout as Depreciation Entries.

---

## 💰 ADVANCED FINANCE — Phase 8

---

### Capital Accounts ⏳ 8A

```
┌──────┬─────────────────┬─────────────┐
│ Code │ Name            │ Balance     │
├──────┼─────────────────┼─────────────┤
│ CA01 │ Owner's Capital │ $50,000 ←───│
└──────┴─────────────────┴─────────────┘
```

**Clicking Balance** → all transactions contributing to this account balance

---

### Investments ⏳ 8B

```
┌────────┬──────────────┬────────────┬──────────┬──────────────┬────────────────┐
│ Ticker │ Name         │ Ctrl Acct  │ Qty Owned│ Market Price │ Market Value   │
└────────┴──────────────┴────────────┴──────────┴──────────────┴────────────────┘
```

---

### Withholding Tax Receipts ⏳ 8C

```
┌──────┬──────────┬──────────────┬──────────────────┬──────────┐
│ Date │ Receipt# │ Customer     │ Invoice Reference │ Amount   │
└──────┴──────────┴──────────────┴──────────────────┴──────────┘
```

---

### Journal Entries (Manual) ⏳ 8D

```
┌──────┬──────────┬─────────────┬──────────────────┬───────────┬───────────────┐
│ Date │ Ref      │ Description │ Accounts         │ Debits    │ Status        │
├──────┼──────────┼─────────────┼──────────────────┼───────────┼───────────────┤
│ ...  │ JE-001 ←─│ Adj entry   │ Cash, Revenue    │ $1,000    │ ✓ Balanced    │
└──────┴──────────┴─────────────┴──────────────────┴───────────┴───────────────┘
```

**New Journal Entry form:**
```
Date · Reference · Description · Division · Project

Lines:
┌──────────────────┬─────────────┬──────────┬──────────┐
│ Account (COA)    │ Description │  Debit   │  Credit  │
├──────────────────┼─────────────┼──────────┼──────────┤
│                  │             │          │          │
└──────────────────┴─────────────┴──────────┴──────────┘
Total Debit: $0.00   Total Credit: $0.00
Status: ⚠ Unbalanced → must balance before saving
```

---

## 📈 REPORTS — Phase 9

```
┌─────────────────────────────────────────────────┐
│  Reports                                        │
├─────────────────────────────────────────────────┤
│  Financial Statements                           │
│  ├── Balance Sheet                          →   │
│  ├── Profit & Loss                          →   │
│  ├── Trial Balance                          →   │
│  └── Cash Flow Statement                    →   │
│                                                 │
│  Tax                                            │
│  ├── Tax Summary                            →   │
│  └── Tax Audit                              →   │
│                                                 │
│  Customers                Suppliers             │
│  ├── Aged Receivables     ├── Aged Payables  →  │
│  ├── Customer Statement   ├── Supplier Stmt. →  │
│  └── Sales by Customer    └── Purch. by Supp →  │
│                                                 │
│  Inventory                Payroll               │
│  ├── Inventory Value      ├── Payroll Summary→  │
│  └── Inventory Movement   └── Employee Earn. →  │
│                                                 │
│  General Ledger                             →   │
│  Transaction Listing                        →   │
│  Forecast P&L / Actual vs Budget            →   │
└─────────────────────────────────────────────────┘
```

**Each report page layout:**
```
┌──────────────────────────────────────────────────┐
│  Balance Sheet                 [Export PDF] [CSV] │
├──────────────────────────────────────────────────┤
│  Period: [Jan 2026 ▼] to [Dec 2026 ▼]            │
│  Compare: [ ] Prior Year   Filter: [Division ▼]  │
├──────────────────────────────────────────────────┤
│  ... report data ...                             │
└──────────────────────────────────────────────────┘
```

---

## ⚙️ SETTINGS — Phase 10

**Two-section layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Settings                                               │
├─────────────────────────────────────────────────────────┤
│  ACTIVE FEATURES                                        │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Business Details │  │ Chart of Accounts│  ...       │
│  └──────────────────┘  └──────────────────┘            │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Tax Codes        │  │ Currencies       │  ...       │
│  └──────────────────┘  └──────────────────┘            │
│                                                         │
│  INACTIVE FEATURES (click to activate)                  │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Custom Fields    │  │ Recurring Trans. │  ...       │
│  └──────────────────┘  └──────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### Settings Sub-pages

| Setting | What it shows |
|---|---|
| **Business Details** | Name, address, logo upload, currency, date/number format, fiscal year start |
| **Chart of Accounts** ✅ | Two-column tree: left = Balance Sheet (Assets/Liab/Equity), right = P&L (Income/Expense). New Account · New Group · New Total buttons |
| **Tax Codes** | List: name, rate %, account, applies to. Form: name · rate · tax account · applies to sales/purchases/both |
| **Currencies** | List: code, name, symbol. Exchange Rates sub-table per currency |
| **Bank Rules** | List: name, type, match field, operator, value, account. Auto-apply on bank import |
| **Divisions** | Code · Name · Description |
| **Custom Fields** | Per form type: label, field type, dropdown options |
| **Themes** | HTML+CSS template editor for printed documents |
| **Footers** | Text/HTML editor for document footers |
| **Form Defaults** | Default values per form (e.g. default bank account for receipts) |
| **Recurring Transactions** | List with frequency, next due date, template |
| **Lock Date** | Single date field — blocks any transaction on or before this date |
| **Payslip Items** | Name · Type (earning/deduction/contribution) · Account |
| **Expense Claim Payers** | Name · Employee · Account |
| **Inventory Locations** | Name · Description · Is Default |
| **Capital Subaccounts** | Name · Description · Sort Order |
| **Special/Control Accounts** | Account groupings for financial statements |
| **Cash Flow Groups** | Assign cash_flow_group to account groups |
| **Investment Prices** | Date · Investment · Price per unit |
| **Access Tokens** | API token list with name, last used, expiry |
| **Users & Permissions** ✅ | RBAC: roles, permissions, user assignments (admin panel) |

---

## Universal Rules (All List Pages)

- **Pagination:** 25 rows default, configurable
- **Edit Columns:** user can toggle visible columns (stored in user_preferences)
- **Advanced Queries:** filter + sort + group on any column
- **Soft delete only** — never hard delete transactional data
- **Skeleton loader** while data loads (must mirror real page layout)
- **Monetary values** always DECIMAL — never float
- **Clicking a balance/amount** opens a side panel (modal if < 50 rows, full page if > 50 rows)
- **Every form save** posts a journal_entry — no exceptions
- **Lock date enforced** — reject transactions on or before lock_date
