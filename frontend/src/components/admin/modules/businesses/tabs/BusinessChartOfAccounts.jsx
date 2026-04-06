'use client';

import { BookOpen } from 'lucide-react';

export default function BusinessChartOfAccounts() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <BookOpen className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">Chart of Accounts</p>
      <p className="text-xs text-muted-foreground">This feature is coming soon.</p>
    </div>
  );
}
