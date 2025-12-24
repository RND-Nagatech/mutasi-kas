import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { AlertCircle } from 'lucide-react';

const kirimKasSchema = z.object({
  kodeToko: z.string().min(1, 'Toko wajib dipilih'),
  metode: z.enum(['CASH', 'TRANSFER'], { required_error: 'Metode wajib dipilih' }),
  noRekening: z.string().optional(),
  nominalKirim: z.number().min(1, 'Nominal kirim wajib diisi'),
  keterangan: z.string().optional(),
  gramasi: z.number().optional(),
}).refine(
  (data) => {
    if (data.metode === 'TRANSFER' && !data.noRekening) {
      return false;
    }
    return true;
  },
  {
    message: 'Rekening wajib dipilih untuk metode TRANSFER',
    path: ['noRekening'],
  }
);

type KirimKasFormData = z.infer<typeof kirimKasSchema>;

export default function KirimKas() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<KirimKasFormData>({
    resolver: zodResolver(kirimKasSchema),
    defaultValues: {
      kodeToko: '',
      metode: undefined,
      noRekening: '',
      nominalKirim: 0,
      keterangan: '-',
      gramasi: undefined,
    },
  });

  // Dummy state for UI only
  const saldoAwal = 0;
  const saldoAkhir = 0;
  const nominalKirim = 0;
  const isNominalExceedSaldo = false;
  const nominalDisplay = '';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Kirim Kas"
        description="Buat transaksi pengiriman kas ke toko"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Form Kirim Kas</CardTitle>
            <CardDescription>
              Lengkapi data berikut untuk membuat transaksi kirim kas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              {/* Toko Selection */}
              <div className="space-y-2">
                <Label htmlFor="kodeToko">Kode Toko</Label>
                <Controller
                  name="kodeToko"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.kodeToko ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Pilih Toko" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <div className="px-4 py-2 text-sm text-muted-foreground">Data toko dummy</div>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.kodeToko && (
                  <p className="text-xs text-destructive">{errors.kodeToko.message}</p>
                )}
              </div>

              {/* Metode */}
              <div className="space-y-2">
                <Label htmlFor="metode">Metode</Label>
                <Controller
                  name="metode"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.metode ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Pilih Metode" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="CASH">CASH</SelectItem>
                        <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.metode && (
                  <p className="text-xs text-destructive">{errors.metode.message}</p>
                )}
              </div>

              {/* Field dinamis berdasarkan metode */}
              {/* CASH */}
              <>
                {/* Nominal Kirim Rp */}
                <div className="space-y-2">
                  <Label htmlFor="nominalKirim">Nominal Kirim Rp</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                    <Input
                      id="nominalKirim"
                      value={nominalDisplay}
                      placeholder="0"
                      className={`pl-10 font-mono ${errors.nominalKirim || isNominalExceedSaldo ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {errors.nominalKirim && (
                    <p className="text-xs text-destructive">{errors.nominalKirim.message}</p>
                  )}
                  {isNominalExceedSaldo && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nominal kirim melebihi saldo awal
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                {/* Gramasi */}
                <div className="space-y-2">
                  <Label htmlFor="gramasi">Nominal Kirim Gr</Label>
                  <Controller
                    name="gramasi"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="gramasi"
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="Masukkan gramasi (opsional)"
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      />
                    )}
                  />
                </div>
              </>

              {/* TRANSFER */}
              <>
                {/* Nominal Kirim Rp */}
                <div className="space-y-2">
                  <Label htmlFor="nominalKirim">Nominal Kirim Rp</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                    <Input
                      id="nominalKirim"
                      value={nominalDisplay}
                      placeholder="0"
                      className={`pl-10 font-mono ${errors.nominalKirim || isNominalExceedSaldo ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {errors.nominalKirim && (
                    <p className="text-xs text-destructive">{errors.nominalKirim.message}</p>
                  )}
                  {isNominalExceedSaldo && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nominal kirim melebihi saldo awal
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                {/* Rekening Tujuan */}
                <div className="space-y-2 animate-slide-up">
                  <Label htmlFor="noRekening">Rekening Tujuan</Label>
                  <Controller
                    name="noRekening"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={errors.noRekening ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Pilih Rekening" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <div className="px-4 py-2 text-sm text-muted-foreground">Data rekening dummy</div>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.noRekening && (
                    <p className="text-xs text-destructive">{errors.noRekening.message}</p>
                  )}
                </div>
              </>

              {/* Keterangan */}
              <div className="space-y-2">
                <Label htmlFor="keterangan">Keterangan (Opsional)</Label>
                <Textarea
                  id="keterangan"
                  placeholder="Tambahkan keterangan jika diperlukan"
                  {...register('keterangan')}
                  rows={3}
                />
              </div>

              <Button 
                type="button" 
                className="w-full"
                disabled
              >
                Kirim Kas
              </Button>

            </form>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="pt-2 border-t">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Saldo Awal</span>
                <CurrencyDisplay amount={saldoAwal} />
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Nominal Kirim</span>
                <CurrencyDisplay amount={nominalKirim || 0} className="text-destructive" />
              </div>
              <div className="flex justify-between pt-2 border-t font-semibold">
                <span>Saldo Akhir</span>
                <CurrencyDisplay 
                  amount={saldoAkhir} 
                  highlightNegative 
                  className="text-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
