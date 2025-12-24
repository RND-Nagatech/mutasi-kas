import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { StatusTransaksi } from '@/types';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      status: {
        OPEN: 'bg-info/10 text-info border border-info/20',
        DONE: 'bg-success/10 text-success border border-success/20',
        CANCEL: 'bg-destructive/10 text-destructive border border-destructive/20',
        REJECT: 'bg-warning/10 text-warning border border-warning/20',
      },
    },
    defaultVariants: {
      status: 'OPEN',
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  status: StatusTransaksi;
  className?: string;
}

const statusLabels: Record<StatusTransaksi, string> = {
  OPEN: 'Open',
  DONE: 'Selesai',
  CANCEL: 'Dibatalkan',
  REJECT: 'Ditolak',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)}>
      {statusLabels[status]}
    </span>
  );
}
