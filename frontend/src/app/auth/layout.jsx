import Link from 'next/link';
import { ArrowLeft, Shield, Key, LayoutDashboard, ScrollText } from 'lucide-react';
import { Providers } from '@/components/common/Providers';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AuthLayout({ children }) {
  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || 'SaaS Starter';

  const highlights = [
    {
      icon: LayoutDashboard,
      title: 'Multi-Business Management',
      description: 'Create and manage multiple businesses from a single account with isolated data per business.',
    },
    {
      icon: ScrollText,
      title: 'Accounting & Bookkeeping',
      description: 'Record income, expenses, invoices, and transactions for each business with ease.',
    },
    {
      icon: Key,
      title: 'Instant Reports',
      description: 'Generate profit & loss, balance sheets, and custom financial reports per business in one click.',
    },
    {
      icon: Shield,
      title: 'Data Backup & Export',
      description: 'Take full backups of your business data anytime and export to CSV or PDF for safekeeping.',
    },
  ];

  return (
    <div className="flex min-h-screen">
      <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative">
        <Link
          href="/"
          className="absolute left-8 top-8 flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Homepage
        </Link>

        <div className="absolute right-8 top-8">
          <ThemeToggle />
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
            {productName}
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <Providers>{children}</Providers>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80">
        <div className="w-full flex items-center justify-center p-12">
          <div className="max-w-md">
            <h3 className="text-primary-foreground text-2xl font-bold mb-2">
              Your Finances, All in One Place
            </h3>
            <p className="text-primary-foreground/70 text-sm mb-8">
              Manage multiple businesses, track every transaction, and generate reports — effortlessly.
            </p>

            <div className="space-y-5">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 bg-primary-foreground/5 backdrop-blur-sm rounded-xl p-4 border border-primary-foreground/10"
                >
                  <div className="p-2 rounded-lg bg-primary-foreground/10 shrink-0">
                    <item.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-primary-foreground">
                      {item.title}
                    </h4>
                    <p className="text-sm text-primary-foreground/70 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-primary-foreground/10 text-center">
              <p className="text-primary-foreground/60 text-xs">
                Open source starter template for building SaaS applications
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
