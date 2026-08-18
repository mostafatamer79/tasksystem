'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { KeyRound, Loader2, Pencil, Plus, Search, Trash2, UserCheck, UserX } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useSetUserActive,
  useResetUserPassword,
  useDeleteUser,
  errorMessage,
} from '@/lib/hooks';
import {
  createUserSchema,
  resetPasswordSchema,
  type CreateUserInput,
  type ResetPasswordInput,
} from '@/lib/schemas';
import type { Role, User } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';

function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user?: User | null;
}) {
  const t = useTranslations('Users');
  const isEdit = !!user;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser(user?.id ?? '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'EMPLOYEE', workStartTime: '09:00', workEndTime: '17:00' },
  });

  useEffect(() => {
    if (open) {
      reset(
        user
          ? {
              name: user.name,
              email: user.email,
              password: 'placeholder-not-sent',
              role: user.role,
              department: user.department ?? '',
              position: user.position ?? '',
              workStartTime: user.workStartTime ?? '09:00',
              workEndTime: user.workEndTime ?? '17:00',
            }
          : { name: '', email: '', password: '', role: 'EMPLOYEE', department: '', position: '', workStartTime: '09:00', workEndTime: '17:00' },
      );
    }
  }, [open, user, reset]);

  const onSubmit = async (values: CreateUserInput) => {
    try {
      if (isEdit) {
        const { password: _pw, ...rest } = values;
        await updateUser.mutateAsync({
          ...rest,
          department: rest.department || undefined,
          position: rest.position || undefined,
        });
        toast.success(t('userUpdated'));
      } else {
        const created = await createUser.mutateAsync({
          ...values,
          department: values.department || undefined,
          position: values.position || undefined,
        });
        toast.success(t('userCreatedWithHours', { name: created.name, start: created.workStartTime, end: created.workEndTime }));
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, t('failedSaveUser')));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('editUser') : t('createUser')}
      description={isEdit ? t('editUserDescription', { name: user?.name }) : t('createUserDescription')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('name')}</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{t('email')}</Label>
            <Input type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
        </div>
        {!isEdit && (
          <div className="space-y-1.5">
            <Label>{t('password')}</Label>
            <Input type="password" placeholder={t('passwordPlaceholder')} {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>{t('role')}</Label>
            <Select {...register('role')}>
              <option value="EMPLOYEE">{t('employee')}</option>
              <option value="MODERATOR">Moderator</option>
              <option value="ADMIN">{t('admin')}</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('department')}</Label>
            <Input {...register('department')} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('position')}</Label>
            <Input {...register('position')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('workStartTime')}</Label>
            <Input type="time" {...register('workStartTime')} />
            {errors.workStartTime && <p className="text-xs text-destructive">{errors.workStartTime.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{t('workEndTime')}</Label>
            <Input type="time" {...register('workEndTime')} />
            {errors.workEndTime && <p className="text-xs text-destructive">{errors.workEndTime.message}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? t('save') : t('create')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const t = useTranslations('Users');
  const resetPw = useResetUserPassword();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('resetPassword')} description={t('resetPasswordDescription', { name: user.name })}>
      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (v) => {
          try {
            await resetPw.mutateAsync({ id: user.id, newPassword: v.newPassword });
            toast.success(t('passwordReset'));
            onClose();
          } catch (err) {
            toast.error(errorMessage(err, t('failedResetPassword')));
          }
        })}
      >
        <div className="space-y-1.5">
          <Label>{t('newPassword')}</Label>
          <Input type="password" placeholder={t('passwordPlaceholder')} {...register('newPassword')} />
          {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('resetPassword')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function UsersPage() {
  const t = useTranslations('Users');
  const tCommon = useTranslations('Common');
  const currentUser = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [activeFilter, setActiveFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const users = useUsers({
    page,
    limit: 10,
    search: search || undefined,
    role: role || undefined,
    isActive: activeFilter === '' ? undefined : activeFilter === 'true',
  });
  const setActive = useSetUserActive();
  const deleteUser = useDeleteUser();

  const columns: Column<User>[] = [
    {
      key: 'user',
      header: t('userColumn'),
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} src={u.avatarUrl} className="h-8 w-8" />
          <div>
            <p className="font-medium">{u.name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('roleColumn'),
      cell: (u) => (
        <span
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-xs font-medium',
            u.role === 'ADMIN'
              ? 'border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400'
              : u.role === 'MODERATOR' 
                ? 'border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400' 
                : 'border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300',
          )}
        >
          {u.role === 'ADMIN' ? t('admin') : u.role === 'MODERATOR' ? 'Moderator' : t('employee')}
        </span>
      ),
    },
    {
      key: 'org',
      header: t('orgColumn'),
      cell: (u) => (
        <span className="text-sm text-muted-foreground">
          {[u.department, u.position].filter(Boolean).join(' · ') || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('statusColumn'),
      cell: (u) => (
        <span
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-xs font-medium',
            u.isActive
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-slate-500/20 bg-slate-500/10 text-slate-500',
          )}
        >
          {u.isActive ? t('active') : t('disabled')}
        </span>
      ),
    },
    {
      key: 'created',
      header: t('joinedColumn'),
      cell: (u) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(u.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-44',
      cell: (u) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title={tCommon('edit')} onClick={() => { setEditUser(u); setFormOpen(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title={t('resetPassword')} onClick={() => setResetTarget(u)}>
            <KeyRound className="h-3.5 w-3.5" />
          </Button>
          {u.id !== currentUser?.id && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={u.isActive ? t('disable') : t('enable')}
                onClick={async () => {
                  try {
                    await setActive.mutateAsync({ id: u.id, active: !u.isActive });
                    toast.success(u.isActive ? t('userDisabled') : t('userEnabled'));
                  } catch (err) {
                    toast.error(errorMessage(err, t('actionFailed')));
                  }
                }}
              >
                {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-destructive"
                title={tCommon('delete')}
                onClick={() => setDeleteTarget(u)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={() => { setEditUser(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> {t('newUser')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select className="w-36" value={role} onChange={(e) => { setRole(e.target.value as Role | ''); setPage(1); }}>
          <option value="">{t('allRoles')}</option>
          <option value="ADMIN">{t('admin')}</option>
          <option value="EMPLOYEE">{t('employee')}</option>
        </Select>
        <Select className="w-36" value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}>
          <option value="">{t('anyStatus')}</option>
          <option value="true">{t('active')}</option>
          <option value="false">{t('disabled')}</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={users.data?.data ?? []}
        rowKey={(u) => u.id}
        loading={users.isLoading}
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyDescription')}
      />

      <Pagination
        page={users.data?.page ?? page}
        totalPages={users.data?.totalPages ?? 1}
        total={users.data?.total ?? 0}
        onPageChange={setPage}
      />

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editUser} />
      {resetTarget && <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('deleteUser')}
        description={t('deleteUserDescription', { name: deleteTarget?.name ?? '' })}
        confirmLabel={t('delete')}
        destructive
        loading={deleteUser.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteUser.mutateAsync(deleteTarget.id);
            toast.success(t('userDeleted'));
            setDeleteTarget(null);
          } catch (err) {
            toast.error(errorMessage(err, t('failedDeleteUser')));
          }
        }}
      />
    </motion.div>
  );
}
