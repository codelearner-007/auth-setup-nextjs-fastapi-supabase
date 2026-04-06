'use client';

import { useRouter } from 'next/navigation';
import { Building2, BookOpen, ChevronRight } from 'lucide-react';

const SETTING_PAGES = [
  {
    key: 'business-details',
    label: 'Business Details',
    description: 'Name, address, and country information.',
    icon: Building2,
  },
  {
    key: 'chart-of-accounts',
    label: 'Chart of Accounts',
    description: 'Manage your chart of accounts.',
    icon: BookOpen,
  },
];

export default function BusinessSettings({ business }) {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage settings for {business.name}.
        </p>
      </div>

      <div className="space-y-2">
        {SETTING_PAGES.map(({ key, label, description, icon: Icon, comingSoon }) => (
          <button
            key={key}
            type="button"
            onClick={() => !comingSoon && router.push(`?tab=settings&page=${key}`)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card text-left transition-colors
              ${comingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted cursor-pointer'}`}
          >
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                {label}
                {comingSoon && (
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Coming Soon
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            {!comingSoon && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}
