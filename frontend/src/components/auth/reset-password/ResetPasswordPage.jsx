'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { ResetPasswordForm } from '@/components/forms/auth/ResetPasswordForm';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ResetPasswordPage() {
  const { resetPassword, loading, error } = useAuth();
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (data) => {
    const result = await resetPassword(data.newPassword, data.confirmPassword);
    if (result.success) {
      setSuccess(true);
      const requiresMFA =
        'requiresMFA' in result && typeof result.requiresMFA === 'boolean'
          ? result.requiresMFA
          : false;
      setTimeout(() => {
        router.push(requiresMFA ? '/auth/2fa?returnTo=/app' : '/app');
      }, 1500);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Password reset successful
            </h2>
            <p className="text-muted-foreground mb-8">
              Your password has been successfully reset.
              You will be redirected to the app in a moment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create new password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            {error}
          </div>
        )}
        <ResetPasswordForm onSubmit={handleSubmit} loading={loading} />
      </CardContent>
    </Card>
  );
}
