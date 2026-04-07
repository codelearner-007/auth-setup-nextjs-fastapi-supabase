'use client';

import { useState, useEffect } from 'react';
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
import { GripVertical, Lock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

function SortableColRow({ col, onToggle, isLast }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: col.key });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 px-4 py-2.5 select-none transition-colors ${isLast ? '' : 'border-b border-border'} ${isDragging ? 'opacity-50 bg-muted/40' : 'bg-card hover:bg-muted/20'}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none flex-shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Checkbox
        id={`col-editor-${col.key}`}
        checked={col.visible}
        onCheckedChange={() => !col.locked && onToggle(col.key)}
        disabled={col.locked}
        className="h-3.5 w-3.5 flex-shrink-0"
      />
      <Label
        htmlFor={`col-editor-${col.key}`}
        className={`text-sm flex-1 ${col.locked ? 'text-muted-foreground cursor-not-allowed' : 'text-foreground cursor-pointer'}`}
      >
        {col.label}
      </Label>
      {col.locked && (
        <Lock className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
      )}
    </div>
  );
}

/**
 * ColEditorDialog — reusable drag-and-drop column visibility editor.
 *
 * Props:
 *   open         {boolean}
 *   onOpenChange {(open: boolean) => void}
 *   cols         {Array<{ key: string, label: string, visible: boolean, locked: boolean }>}
 *   onApply      {(newCols: typeof cols) => void}
 */
export default function ColEditorDialog({ open, onOpenChange, cols, onApply }) {
  const [draftCols, setDraftCols] = useState(cols);

  useEffect(() => {
    if (open) setDraftCols(cols);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDraftCols((prev) => {
        const oldIndex = prev.findIndex((c) => c.key === active.id);
        const newIndex = prev.findIndex((c) => c.key === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  function toggleCol(key) {
    setDraftCols((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  }

  function handleApply() {
    onApply(draftCols);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-64 p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border bg-muted/30">
          <DialogTitle className="text-sm font-semibold">Edit Columns</DialogTitle>
        </DialogHeader>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={draftCols.map((c) => c.key)} strategy={verticalListSortingStrategy}>
            {draftCols.map((col, idx) => (
              <SortableColRow
                key={col.key}
                col={col}
                onToggle={toggleCol}
                isLast={idx === draftCols.length - 1}
              />
            ))}
          </SortableContext>
        </DndContext>
        <DialogFooter className="px-4 py-3 border-t border-border bg-muted/20 flex-row gap-2 sm:justify-start">
          <Button size="sm" className="cursor-pointer h-7 text-xs" onClick={handleApply}>
            Apply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer h-7 text-xs text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
