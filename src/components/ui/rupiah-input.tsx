import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type RupiahInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  value?: number | null;
  onValueChange?: (value: number) => void;
  onRawChange?: (raw: string) => void;
};

function formatRupiah(value: number | null | undefined) {
  if (value === null || value === undefined || isNaN(value)) return '';
  return new Intl.NumberFormat('id-ID').format(value);
}

const RupiahInput = forwardRef<HTMLInputElement, RupiahInputProps>((props, ref) => {
  const { value, onValueChange, onRawChange, className = '', placeholder, id, required, disabled, ...rest } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [display, setDisplay] = useState<string>(formatRupiah(value ?? 0));

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  useEffect(() => {
    setDisplay(formatRupiah(value ?? 0));
  }, [value]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // remove non digits
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    // update display formatted
    setDisplay(raw === '' ? '' : formatRupiah(num));
    if (onValueChange) onValueChange(num);
    if (onRawChange) onRawChange(raw);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
      <input
        {...rest}
        id={id}
        ref={inputRef}
        inputMode="numeric"
        value={display}
        onChange={handleInput}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        type="text"
        className={cn(
          // same base styles as project Input component
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'pl-10 font-mono text-right',
          className,
        )}
      />
    </div>
  );
});

export default RupiahInput;
