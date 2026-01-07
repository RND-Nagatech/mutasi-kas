import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  isLoading?: boolean;
  className?: string;
  iconClassName?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  isLoading = false,
  className,
  iconClassName,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('animate-fade-in', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-32 mt-3" />
          <Skeleton className="h-4 w-20 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('animate-fade-in transition-all duration-300 hover:shadow-xl hover:scale-105 border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && (
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10',
              iconClassName
            )}>
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
        {(description || trend) && (
          <div className="mt-2 flex items-center gap-2">
            {trend && (
              <span className={cn(
                'text-xs font-medium',
                trend.positive ? 'text-success' : 'text-destructive'
              )}>
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
