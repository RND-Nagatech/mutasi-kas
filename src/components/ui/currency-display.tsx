import { cn } from '@/lib/utils';
import { formatRupiah } from '@/utils/format';

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
  showSign?: boolean;
  highlightNegative?: boolean;
}

export function CurrencyDisplay({ 
  amount, 
  className, 
  showSign = false,
  highlightNegative = true,
}: CurrencyDisplayProps) {
  const isNegative = amount < 0;
  const displayAmount = showSign && amount > 0 ? `+${formatRupiah(amount)}` : formatRupiah(amount);
  
  return (
    <span 
      className={cn(
        'font-medium tabular-nums',
        highlightNegative && isNegative && 'text-destructive',
        className
      )}
    >
      {displayAmount}
    </span>
  );
}
