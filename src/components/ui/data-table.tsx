import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableFooter,
  TableRow,
} from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/loading-skeleton';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  className?: string;
  footer?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'Tidak ada data',
  keyExtractor,
  onRowClick,
  className,
  footer,
}: DataTableProps<T>) {
  if (isLoading) {
    return <TableSkeleton rows={5} columns={columns.length} />;
  }

  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden shadow-sm', className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 hover:from-slate-100 hover:to-slate-50 dark:hover:from-slate-700 dark:hover:to-slate-800 border-b border-slate-200 dark:border-slate-700">
            {columns.map((column) => (
              <TableHead 
                key={column.key} 
                className={cn('font-semibold text-foreground py-4 px-6 text-left', column.className)}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="h-32 text-center text-muted-foreground py-8"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow 
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'transition-all duration-200 border-b border-slate-100 dark:border-slate-700/50',
                  index % 2 === 0 
                    ? 'bg-white/30 dark:bg-slate-800/30' 
                    : 'bg-slate-50/30 dark:bg-slate-700/30',
                  onRowClick && 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:z-10 relative'
                )}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn('py-4 px-6', column.className)}>
                    {column.cell(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
          
        </TableBody>
        {data.length > 0 && footer && (
          <TableFooter>
            {footer}
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
