'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Loader2, Lock, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage, tokenStore, setRoleCookie } from '@/lib/api';
import { loginSchema, type LoginInput } from '@/lib/schemas';
import type { LoginResponse } from '@/lib/types';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      const res = await api.post<LoginResponse>('/auth/login', values);
      tokenStore.set(res.data.accessToken);
      setRoleCookie(res.data.user.role);
      setUser(res.data.user);
      toast.success(`Welcome back, ${res.data.user.name.split(' ')[0]}`);
      router.replace(searchParams.get('next') || '/dashboard');
    } catch (err) {
      setServerError(errorMessage(err, 'Invalid credentials'));
      setShakeKey((k) => k + 1);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="w-full max-w-md">
      <motion.div variants={item} className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-60 blur-xl" />
          <div className="relative rounded-2xl bg-brand-gradient p-3.5 text-white shadow-lift">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Task<span className="text-brand-gradient">Flow</span>
        </h1>
        <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
      </motion.div>

      <motion.div variants={item} key={shakeKey} className={shakeKey ? 'animate-shake' : ''}>
        <div className="glass-strong rounded-3xl p-8 shadow-lift">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {serverError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
              >
                {serverError}
              </motion.p>
            )}
            <motion.div variants={item} className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="group relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="h-11 rounded-xl pl-9"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </motion.div>
            <motion.div variants={item} className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="group relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-11 rounded-xl pl-9"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </motion.div>
            <motion.div variants={item}>
              <Button type="submit" size="lg" className="group w-full rounded-xl text-[15px]" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>


    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Floating aurora orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] animate-float rounded-full bg-indigo-500/25 blur-3xl" />
        <div
          className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] animate-float rounded-full bg-fuchsia-500/20 blur-3xl"
          style={{ animationDelay: '-3s' }}
        />
        <div
          className="absolute left-1/2 top-1/3 h-80 w-80 animate-float rounded-full bg-violet-500/20 blur-3xl"
          style={{ animationDelay: '-6s' }}
        />
        <div className="absolute inset-0 animate-aurora bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,color-mix(in_oklab,var(--grad-via)_18%,transparent),transparent_70%)]" />
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
