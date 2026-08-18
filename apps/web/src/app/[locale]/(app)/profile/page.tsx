'use client';

import { useTheme } from 'next-themes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Loader2, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useChangePassword, errorMessage } from '@/lib/hooks';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/schemas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

function ThemeOption({ value, label, icon: Icon }: { value: string; label: string; icon: typeof Sun }) {
  const { theme, setTheme } = useTheme();
  const active = theme === value;
  return (
    <button
      onClick={() => setTheme(value)}
      className={cn(
        'flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all active:scale-95',
        active
          ? 'border-primary/40 bg-accent shadow-glow text-accent-foreground'
          : 'hover:bg-muted hover:shadow-soft',
      )}
    >
      <Icon className={cn('h-5 w-5', active && 'text-primary')} />
      {label}
    </button>
  );
}

export default function ProfilePage() {
  const t = useTranslations('Profile');
  const user = useAuthStore((s) => s.user);
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar name={user?.name ?? '?'} src={user?.avatarUrl} className="h-14 w-14 text-lg" />
          <div>
            <p className="text-lg font-semibold">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {user?.role === 'ADMIN' ? t('admin') : [user?.department, user?.position].filter(Boolean).join(' · ') || t('employee')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('appearance')}</CardTitle>
          <CardDescription>{t('appearanceDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <ThemeOption value="light" label={t('light')} icon={Sun} />
          <ThemeOption value="dark" label={t('dark')} icon={Moon} />
          <ThemeOption value="system" label={t('system')} icon={Sun} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('changePassword')}</CardTitle>
          <CardDescription>{t('changePasswordDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            noValidate
            onSubmit={handleSubmit(async (v) => {
              try {
                await changePassword.mutateAsync({
                  currentPassword: v.currentPassword,
                  newPassword: v.newPassword,
                });
                toast.success(t('passwordChanged'));
                reset();
              } catch (err) {
                toast.error(errorMessage(err, t('failedChangePassword')));
              }
            })}
          >
            <div className="space-y-1.5">
              <Label>{t('currentPassword')}</Label>
              <Input type="password" {...register('currentPassword')} />
              {errors.currentPassword && (
                <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('newPassword')}</Label>
                <Input type="password" {...register('newPassword')} />
                {errors.newPassword && (
                  <p className="text-xs text-destructive">{errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t('confirmPassword')}</Label>
                <Input type="password" {...register('confirmPassword')} />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('changePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
