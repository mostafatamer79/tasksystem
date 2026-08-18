'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  const t = useTranslations('Pagination');
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <p>
        {t('pageOf', { page, totalPages: Math.max(totalPages, 1) })} · {t('total', { total })}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> {t('prev')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t('next')} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
