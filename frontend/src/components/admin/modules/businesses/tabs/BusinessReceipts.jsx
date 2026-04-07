'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
  Pencil,
  Search,
  GripVertical,
  ArrowLeft,
  CalendarDays,
  Paperclip,
  ExternalLink,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  listReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt,
} from '@/lib/services/receipts.service';
import { apiClient } from '@/lib/services/api-client';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${parseInt(d)}/${parseInt(m)}/${y}`;
}

function sumLines(lines) {
  return lines.reduce((acc, l) => acc + (parseFloat(l.total) || 0), 0);
}

function emptyLine() {
  return { id: Math.random().toString(36).slice(2), account_id: '', amount: '', total: '' };
}

/* ── Loading skeleton ────────────────────────────────────────────────────── */

function ReceiptsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <Skeleton className="h-10 w-full rounded-none" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-none border-t border-border" />
        ))}
      </div>
    </div>
  );
}

/* ── Form skeleton (bank accounts loading) ───────────────────────────────── */

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-6 w-36" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-full rounded" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded" />
      <Skeleton className="h-32 w-full rounded" />
    </div>
  );
}

/* ── Sortable line row ───────────────────────────────────────────────────── */

function SortableRow({ id, saving, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`hover:bg-muted/20 transition-colors ${isDragging ? 'opacity-50 bg-muted/40' : ''}`}
    >
      <td className="px-1 py-1.5 border-r border-border text-center">
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={saving}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </td>
      {children}
    </tr>
  );
}

/* ── Receipt form (create / edit) ────────────────────────────────────────── */

function ReceiptForm({ businessId, onSaved, onCancel, initial }) {
  const isEdit = !!initial;

  // Core fields
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [showReference, setShowReference] = useState(!!initial?.reference);
  const [reference, setReference] = useState(initial?.reference ?? '');
  const [paidByContactId, setPaidByContactId] = useState(initial?.paid_by_contact_id ?? '');
  const [paidByContactType, setPaidByContactType] = useState(initial?.paid_by_contact_type ?? ''); // 'customer' | 'supplier'
  const [paidByOther, setPaidByOther] = useState(initial?.paid_by_other ?? '');
  // paidByMode: 'customer' | 'supplier' | 'other'
  const [paidByMode, setPaidByMode] = useState(
    initial?.paid_by_contact_type === 'customer' ? 'customer'
    : initial?.paid_by_contact_type === 'supplier' ? 'supplier'
    : initial?.paid_by_other ? 'other'
    : 'other'
  );
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [receivedInAccountId, setReceivedInAccountId] = useState(
    initial?.received_in_account_id ?? ''
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [lines, setLines] = useState(
    initial?.lines?.length ? initial.lines.map((l) => ({ ...l, id: l.id ?? emptyLine().id })) : [emptyLine()]
  );
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [uploading, setUploading] = useState(false);

  // Column visibility flags
  const [showLineNumber, setShowLineNumber] = useState(false);
  const [showLineDescription, setShowLineDescription] = useState(false);
  const [showQty, setShowQty] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);


  // Remote state
  const [bankAccounts, setBankAccounts] = useState([]);
  const [coaAccounts, setCoaAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingAccounts(true);
      try {
        const [bankRes, coaRes, custRes, suppRes] = await Promise.all([
          apiClient.get(`/v1/businesses/${businessId}/bank-accounts`).catch(() => null),
          apiClient.get(`/v1/businesses/${businessId}/chart-of-accounts/accounts`).catch(() => null),
          apiClient.get(`/v1/businesses/${businessId}/customers`).catch(() => null),
          apiClient.get(`/v1/businesses/${businessId}/suppliers`).catch(() => null),
        ]);
        if (!active) return;
        setBankAccounts(bankRes?.items ?? (Array.isArray(bankRes) ? bankRes : []));
        const coaItems = (coaRes?.items ?? (Array.isArray(coaRes) ? coaRes : [])).filter((a) => a.type === 'pl' && !a.is_total);
        setCoaAccounts(coaItems);
        setCustomers(custRes?.items ?? []);
        setSuppliers(suppRes?.items ?? []);
      } finally {
        if (active) setLoadingAccounts(false);
      }
    }
    load();
    return () => { active = false; };
  }, [businessId]);

  /* ── Line management ─────────────────────────────────────────────────── */

  function calcTotal(line) {
    const amount = parseFloat(line.amount) || 0;
    const qty = parseFloat(line.qty) || 1;
    const discount = parseFloat(line.discount) || 0;
    return amount * qty - discount;
  }

  function updateLine(id, field, value) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        updated.total = calcTotal(updated);
        return updated;
      })
    );
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(id) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLines((prev) => {
        const oldIndex = prev.findIndex((l) => l.id === active.id);
        const newIndex = prev.findIndex((l) => l.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  /* ── Submit ──────────────────────────────────────────────────────────── */

  async function handleSubmit() {
    setError(null);
    if (!date) { setError('Date is required.'); return; }

    const payload = {
      date,
      reference: showReference ? reference.trim() || null : null,
      paid_by_type: paidByMode === 'other' ? 'Other' : 'Contact',
      paid_by_contact_id: paidByMode !== 'other' ? paidByContactId || null : null,
      paid_by_contact_type: paidByMode !== 'other' ? paidByMode : null,
      paid_by_other: paidByMode === 'other' ? paidByOther.trim() || null : null,
      received_in_account_id: receivedInAccountId || null,
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      lines: lines
        .filter((l) => l.account_id || parseFloat(l.amount))
        .map(({ id: _id, ...rest }) => ({
          ...rest,
          amount: parseFloat(rest.amount) || 0,
          total: parseFloat(rest.total) || 0,
        })),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateReceipt(businessId, initial.id, payload);
      } else {
        await createReceipt(businessId, payload);
      }
      onSaved();
    } catch (err) {
      setError(err?.message ?? 'Failed to save receipt.');
    } finally {
      setSaving(false);
    }
  }

  if (loadingAccounts) return <FormSkeleton />;

  const grandTotal = sumLines(lines);

  return (
    <div className="space-y-6 pb-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
          onClick={onCancel}
          disabled={saving}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h2 className="text-lg font-semibold text-foreground">
          {isEdit ? 'Edit Receipt' : 'New Receipt'}
        </h2>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ── Section: Top fields ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Date row */}
        <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr] items-center border-b border-border">
          <div className="px-4 py-3 bg-muted/30 border-r border-border flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <Label htmlFor="receipt-date" className="text-xs font-medium text-muted-foreground">
              Date <span className="text-destructive">*</span>
            </Label>
          </div>
          <div className="px-4 py-2.5">
            <Input
              id="receipt-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={saving}
              className="h-8 text-sm w-44"
            />
          </div>
        </div>

        {/* Reference row */}
        <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr] items-center border-b border-border">
          <div className="px-4 py-3 bg-muted/30 border-r border-border flex items-center gap-2">
            <Checkbox
              id="receipt-ref-toggle"
              checked={showReference}
              onCheckedChange={setShowReference}
              disabled={saving}
              className="h-3.5 w-3.5"
            />
            <Label
              htmlFor="receipt-ref-toggle"
              className="text-xs font-medium text-muted-foreground cursor-pointer select-none"
            >
              Reference
            </Label>
          </div>
          <div className="px-4 py-2.5">
            {showReference ? (
              <Input
                id="receipt-reference"
                placeholder="e.g. REC-001"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={saving}
                className="h-8 text-sm w-44"
                autoFocus
              />
            ) : (
              <span className="text-xs text-muted-foreground italic">Click checkbox to add a reference</span>
            )}
          </div>
        </div>

        {/* Paid by row */}
        <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr] items-center border-b border-border">
          <div className="px-4 py-3 bg-muted/30 border-r border-border">
            <Label className="text-xs font-medium text-muted-foreground">Paid by</Label>
          </div>
          <div className="px-4 py-2.5 flex flex-wrap items-center gap-2">
            {/* Type selector: Customer / Supplier / Other */}
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Contact</span>
            <Select
              value={paidByMode}
              onValueChange={(val) => {
                setPaidByMode(val);
                setPaidByContactId('');
                setPaidByContactType(val !== 'other' ? val : '');
                setPaidByOther('');
              }}
              disabled={saving}
            >
              <SelectTrigger className="h-8 text-sm w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <Separator className="my-1" />
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Contact picker when Customer or Supplier selected */}
            {(paidByMode === 'customer' || paidByMode === 'supplier') && (
              <Select
                value={paidByContactId}
                onValueChange={setPaidByContactId}
                disabled={saving}
              >
                <SelectTrigger className="h-8 text-sm w-44">
                  <SelectValue placeholder={paidByMode === 'customer' ? 'Select customer…' : 'Select supplier…'} />
                </SelectTrigger>
                <SelectContent>
                  {(paidByMode === 'customer' ? customers : suppliers).length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No {paidByMode === 'customer' ? 'customers' : 'suppliers'} found
                    </SelectItem>
                  ) : (
                    (paidByMode === 'customer' ? customers : suppliers).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}

            {/* Free-text input when Other selected */}
            {paidByMode === 'other' && (
              <Input
                placeholder="Optional"
                value={paidByOther}
                onChange={(e) => setPaidByOther(e.target.value)}
                disabled={saving}
                className="h-8 text-sm flex-1 min-w-[140px]"
              />
            )}
          </div>
        </div>

        {/* Received in row */}
        <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr] items-center">
          <div className="px-4 py-3 bg-muted/30 border-r border-border">
            <Label className="text-xs font-medium text-muted-foreground">Received in</Label>
          </div>
          <div className="px-4 py-2.5">
            <Select
              value={receivedInAccountId}
              onValueChange={setReceivedInAccountId}
              disabled={saving}
            >
              <SelectTrigger className="h-8 text-sm w-56">
                <SelectValue placeholder="Select account…" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.length === 0 ? (
                  <SelectItem value="_none" disabled>No bank accounts found</SelectItem>
                ) : (
                  bankAccounts.map((acct) => (
                    <SelectItem key={acct.id} value={acct.id}>
                      {acct.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Section: Description ────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="receipt-description" className="text-xs font-medium text-muted-foreground">
          Description
        </Label>
        <Textarea
          id="receipt-description"
          placeholder="Optional description…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={saving}
          rows={3}
          className="text-sm resize-none"
        />
      </div>

      {/* ── Section: Line items ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="w-6 border-r border-border" />
                {showLineNumber && (
                  <th className="px-3 py-2 w-10 text-center text-xs font-semibold text-muted-foreground border-r border-border">
                    #
                  </th>
                )}
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground border-r border-border">
                  Account
                </th>
                {showLineDescription && (
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground border-r border-border">
                    Description
                  </th>
                )}
                {showQty && (
                  <th className="px-3 py-2 w-20 text-right text-xs font-semibold text-muted-foreground border-r border-border">
                    Qty
                  </th>
                )}
                <th className="px-3 py-2 w-28 text-right text-xs font-semibold text-muted-foreground border-r border-border">
                  Amount
                </th>
                {showDiscount && (
                  <th className="px-3 py-2 w-24 text-right text-xs font-semibold text-muted-foreground border-r border-border">
                    Discount
                  </th>
                )}
                <th className="px-3 py-2 w-28 text-right text-xs font-semibold text-muted-foreground border-r border-border">
                  Total
                </th>
                <th className="px-3 py-2 w-10 text-center text-xs font-semibold text-muted-foreground" />
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={lines.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <tbody className="divide-y divide-border">
              {lines.map((line, idx) => (
                <SortableRow key={line.id} id={line.id} saving={saving}>
                  {showLineNumber && (
                    <td className="px-3 py-2 text-center text-xs text-muted-foreground border-r border-border">
                      {idx + 1}
                    </td>
                  )}
                  <td className="px-2 py-1.5 border-r border-border">
                    <Select
                      value={line.account_id}
                      onValueChange={(v) => updateLine(line.id, 'account_id', v)}
                      disabled={saving}
                    >
                      <SelectTrigger className="h-7 text-xs w-full min-w-[120px]">
                        <SelectValue placeholder="Select account…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suspense">Suspense</SelectItem>
                        {coaAccounts.map((acct) => (
                          <SelectItem key={acct.id} value={acct.id}>
                            {acct.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  {showLineDescription && (
                    <td className="px-2 py-1.5 border-r border-border">
                      <Input
                        placeholder="Line description"
                        value={line.line_description ?? ''}
                        onChange={(e) => updateLine(line.id, 'line_description', e.target.value)}
                        disabled={saving}
                        className="h-7 text-xs"
                      />
                    </td>
                  )}
                  {showQty && (
                    <td className="px-2 py-1.5 border-r border-border">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="1"
                        value={line.qty ?? ''}
                        onChange={(e) => updateLine(line.id, 'qty', e.target.value)}
                        disabled={saving}
                        className="h-7 text-xs text-right"
                      />
                    </td>
                  )}
                  <td className="px-2 py-1.5 border-r border-border">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={line.amount}
                      onChange={(e) => updateLine(line.id, 'amount', e.target.value)}
                      disabled={saving}
                      className="h-7 text-xs text-right"
                    />
                  </td>
                  {showDiscount && (
                    <td className="px-2 py-1.5 border-r border-border">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={line.discount ?? ''}
                        onChange={(e) => updateLine(line.id, 'discount', e.target.value)}
                        disabled={saving}
                        className="h-7 text-xs text-right"
                      />
                    </td>
                  )}
                  <td className="px-3 py-1.5 border-r border-border text-right text-xs tabular-nums text-foreground">
                    {(parseFloat(line.total) || 0).toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => removeLine(line.id)}
                      disabled={saving || lines.length === 1}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </SortableRow>
              ))}
            </tbody>
              </SortableContext>
            </DndContext>
            <tfoot>
              <tr className="border-t border-border bg-muted/20">
                <td
                  colSpan={
                    2 +
                    (showLineNumber ? 1 : 0) +
                    (showLineDescription ? 1 : 0) +
                    (showQty ? 1 : 0) +
                    (showDiscount ? 1 : 0)
                  }
                  className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground"
                >
                  Grand Total
                </td>
                <td className="px-3 py-2 text-right text-sm font-semibold text-foreground tabular-nums">
                  {grandTotal.toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 cursor-pointer text-xs"
          onClick={addLine}
          disabled={saving}
        >
          <Plus className="h-3.5 w-3.5" />
          Add line
        </Button>
      </div>

      {/* ── Section: Column visibility ───────────────────────────────────── */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Column visibility
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2.5">
          {[
            { id: 'col-linenum', label: 'Line number', value: showLineNumber, setter: setShowLineNumber },
            { id: 'col-linedesc', label: 'Description', value: showLineDescription, setter: setShowLineDescription },
            { id: 'col-qty', label: 'Qty', value: showQty, setter: setShowQty },
            { id: 'col-discount', label: 'Discount', value: showDiscount, setter: setShowDiscount },
          ].map(({ id, label, value, setter }) => (
            <div key={id} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={value}
                onCheckedChange={setter}
                disabled={saving}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor={id} className="text-xs text-muted-foreground cursor-pointer select-none">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section: Image attachment ────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          Attachment
        </Label>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="h-9 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-muted file:text-muted-foreground hover:file:bg-muted/80 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                setError(null);
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  fd.append('businessId', businessId);
                  const res = await fetch('/api/storage/receipt-upload', {
                    method: 'POST',
                    body: fd,
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error ?? 'Upload failed');
                  setImageUrl(json.url);
                } catch (err) {
                  setError(err.message);
                } finally {
                  setUploading(false);
                }
              }}
              disabled={saving || uploading}
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          {imageUrl?.startsWith('http') && (
            <div className="flex items-center gap-1.5 min-w-0">
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-[180px]"
              >
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                View attachment
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
                onClick={() => setImageUrl('')}
                disabled={saving || uploading}
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          {imageUrl && !imageUrl.startsWith('http') && (
            <span className="text-xs text-muted-foreground truncate max-w-[180px]">{imageUrl}</span>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="cursor-pointer min-w-[90px]"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isEdit ? (
            'Save'
          ) : (
            'Create'
          )}
        </Button>
        <Button
          variant="ghost"
          className="cursor-pointer text-muted-foreground"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ── Delete confirm dialog ───────────────────────────────────────────────── */

function DeleteDialog({ open, onOpenChange, businessId, receipt, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteReceipt(businessId, receipt.id);
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message ?? 'Failed to delete receipt.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !deleting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Receipt</DialogTitle>
        </DialogHeader>
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">
            Delete receipt{receipt?.reference ? <> <span className="font-medium">{receipt.reference}</span></> : ''} from{' '}
            <span className="font-medium">{formatDate(receipt?.date)}</span>? This cannot be undone.
          </p>
        </div>
        {error && (
          <p className="text-xs text-destructive" role="alert">{error}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting} className="cursor-pointer">
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="cursor-pointer min-w-[72px]">
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function BusinessReceipts({ business }) {
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // 'list' | 'create' | 'edit'
  const [view, setView] = useState('list');
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchReceipts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listReceipts(business.id);
      setReceipts(Array.isArray(data) ? data : (data?.items ?? []));
    } catch (err) {
      setError(err?.message ?? 'Failed to load receipts.');
    } finally {
      setIsLoading(false);
    }
  }, [business.id]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  function handleSaved() {
    fetchReceipts();
    setView('list');
    setEditTarget(null);
  }

  const filtered = search.trim()
    ? receipts.filter((r) => {
        const q = search.toLowerCase();
        return (
          (r.reference ?? '').toLowerCase().includes(q) ||
          (r.paid_by_name ?? '').toLowerCase().includes(q) ||
          (r.date ?? '').includes(q)
        );
      })
    : receipts;

  /* ── Form view ──────────────────────────────────────────────────────── */
  if (view === 'create' || view === 'edit') {
    return (
      <ReceiptForm
        key={view === 'create' ? 'create' : editTarget?.id}
        businessId={business.id}
        onSaved={handleSaved}
        onCancel={() => { setView('list'); setEditTarget(null); }}
        initial={view === 'edit' ? editTarget : null}
      />
    );
  }

  /* ── List view ──────────────────────────────────────────────────────── */
  if (isLoading) return <ReceiptsSkeleton />;

  return (
    <div className="space-y-4">
      {/* Delete dialog */}
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        businessId={business.id}
        receipt={deleteTarget}
        onDeleted={fetchReceipts}
      />

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">Receipts</h1>
          <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
            {receipts.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search receipts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-sm w-52"
            />
          </div>
          <Button
            size="sm"
            className="gap-1.5 cursor-pointer"
            onClick={() => setView('create')}
          >
            <Plus className="h-3.5 w-3.5" />
            New Receipt
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[540px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 w-16 border-r border-border text-center text-xs font-semibold text-muted-foreground">
                <span className="flex items-center justify-center">
                  <Pencil className="h-3 w-3" />
                </span>
              </th>
              <th className="px-4 py-2 w-28 text-left text-xs font-semibold text-muted-foreground border-r border-border">
                Date
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground border-r border-border">
                Reference
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground border-r border-border">
                Paid By
              </th>
              <th className="px-4 py-2 w-28 text-right text-xs font-semibold text-muted-foreground border-r border-border">
                Amount
              </th>
              <th className="px-3 py-2 w-16 text-center text-xs font-semibold text-muted-foreground">
                <span className="flex items-center justify-center">
                  <Trash2 className="h-3 w-3" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {search.trim() ? 'No receipts match your search.' : 'No receipts yet'}
                </td>
              </tr>
            ) : (
              filtered.map((receipt) => {
                const total = Array.isArray(receipt.lines)
                  ? sumLines(receipt.lines)
                  : (receipt.total ?? 0);
                return (
                  <tr
                    key={receipt.id}
                    className="hover:bg-muted/30 transition-colors duration-150"
                  >
                    <td className="px-3 py-2 w-16 border-r border-border text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs cursor-pointer"
                        onClick={() => { setEditTarget(receipt); setView('edit'); }}
                      >
                        Edit
                      </Button>
                    </td>
                    <td className="px-4 py-2.5 text-foreground border-r border-border whitespace-nowrap">
                      {formatDate(receipt.date)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground border-r border-border whitespace-nowrap">
                      {receipt.reference || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground border-r border-border whitespace-nowrap">
                      {receipt.paid_by_other || (receipt.paid_by_contact_id ? 'Contact' : '—')}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground tabular-nums border-r border-border whitespace-nowrap">
                      {total.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 w-16 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(receipt)}
                        aria-label="Delete receipt"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
