import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RupiahInput from '@/components/ui/rupiah-input';
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
import { masterTokoApi } from '@/services/api/masterTokoApi';
import { rekeningApi } from '@/services/api/rekeningApi';
import { mutasiApi } from '@/services/api/mutasiApi';
import { mutasiKasApi } from '@/services/api/mutasiKasApi';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
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
    shouldFocusError: false,
  });

  const [tokoList, setTokoList] = useState<any[]>([]);
  const [rekeningList, setRekeningList] = useState<any[]>([]);
  const [saldoAwal, setSaldoAwal] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const kodeToko = watch('kodeToko');
  const metode = watch('metode');
  const noRekening = watch('noRekening');
  const nominalKirim = Number(watch('nominalKirim') || 0);
  const gramasi = watch('gramasi');
  const isNominalExceedSaldo = nominalKirim > saldoAwal;
  const saldoAkhir = saldoAwal - nominalKirim;
  const nominalDisplay = nominalKirim ? nominalKirim.toLocaleString('id-ID') : '';

  // load toko & rekening once
  useEffect(() => {
    masterTokoApi.getAll().then(data => setTokoList(data || [])).catch(() => setTokoList([]));
    rekeningApi.getAll().then(data => setRekeningList(data || [])).catch(() => setRekeningList([]));
  }, []);

  // fetch saldo awal from backend tm_kas whenever kodeToko/metode/noRekening change
  useEffect(() => {
    const fetchSaldo = async () => {
      if (!kodeToko || !metode) return setSaldoAwal(0);
      // If metode is TRANSFER, only fetch when noRekening is selected
      if (metode === 'TRANSFER' && !noRekening) return setSaldoAwal(0);
      try {
        const params: any = { kodeToko, metode };
        if (metode === 'TRANSFER' && noRekening) params.noRekening = noRekening;
        const res = await mutasiKasApi.getLastSaldoAkhir(params);
        setSaldoAwal(res?.saldoAkhir || 0);
      } catch (err) {
        setSaldoAwal(0);
      }
    };
    fetchSaldo();
  }, [kodeToko, metode, noRekening]);

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
            <form className="space-y-6" onSubmit={handleSubmit(data => { setShowConfirm(true); }, (formErrors) => {
              // show first validation message to user
              const firstKey = Object.keys(formErrors)[0];
              const firstErr = firstKey ? (formErrors as any)[firstKey] : null;
              toast({ title: 'Periksa form', description: firstErr?.message || 'Ada input yang belum benar', variant: 'destructive' });
            })} noValidate>
              {/* Toko Selection */}
              <div className="space-y-2">
                <Label htmlFor="kodeToko">Kode Toko</Label>
                <Controller
                  name="kodeToko"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={val => { field.onChange(val); }} value={field.value}>
                      <SelectTrigger className={errors.kodeToko ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Pilih Toko" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover max-h-48 overflow-auto">
                        {tokoList.length === 0 && (
                          <div className="px-4 py-2 text-sm text-muted-foreground">Memuat data toko...</div>
                        )}
                        {tokoList.map(toko => (
                          <SelectItem key={toko.kode_toko} value={toko.kode_toko}>{toko.nama_toko}</SelectItem>
                        ))}
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

              {/* Field dinamis: tampilkan sesuai metode terpilih */}
              {metode === 'CASH' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nominalKirim">Nominal Kirim Rp</Label>
                    <div>
                        <Controller
                          name="nominalKirim"
                          control={control}
                          render={({ field }) => (
                            <RupiahInput
                              id="nominalKirim"
                              value={field.value ?? 0}
                              onValueChange={(v) => field.onChange(v)}
                              placeholder="0"
                              className={`${errors.nominalKirim || isNominalExceedSaldo ? 'border-destructive' : ''}`}
                            />
                          )}
                        />
                      </div>
                    {errors.nominalKirim && <p className="text-xs text-destructive">{errors.nominalKirim.message}</p>}
                    {isNominalExceedSaldo && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Nominal kirim melebihi saldo awal</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gramasi">Nominal Kirim Gr</Label>
                    <Controller
                      name="gramasi"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="gramasi"
                          type="number"
                          step={0.01}
                          min={0}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            field.onChange(raw === '' ? undefined : Number(raw));
                          }}
                          placeholder="(opsional)"
                          className="no-spinner"
                        />
                      )}
                    />
                  </div>
                </>
              )}

              {metode === 'TRANSFER' && (
                <>
                  <div className="space-y-2 animate-slide-up">
                    <Label htmlFor="noRekening">Rekening Tujuan</Label>
                    <Controller
                      name="noRekening"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={val => field.onChange(val)} value={field.value}>
                          <SelectTrigger className={errors.noRekening ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Pilih Rekening" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {rekeningList.length === 0 && <div className="px-4 py-2 text-sm text-muted-foreground">Memuat rekening...</div>}
                            {rekeningList.map(rek => (
                              <SelectItem key={rek.noRekening} value={rek.noRekening}>{rek.namaRekening} - {rek.noRekening}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.noRekening && <p className="text-xs text-destructive">{errors.noRekening.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nominalKirim">Nominal Kirim Rp</Label>
                    <div>
                      <Controller
                        name="nominalKirim"
                        control={control}
                        render={({ field }) => (
                          <RupiahInput
                            id="nominalKirim"
                            value={field.value ?? 0}
                            onValueChange={(v) => field.onChange(v)}
                            placeholder="0"
                            className={`${errors.nominalKirim || isNominalExceedSaldo ? 'border-destructive' : ''}`}
                          />
                        )}
                      />
                    </div>
                    {errors.nominalKirim && <p className="text-xs text-destructive">{errors.nominalKirim.message}</p>}
                    {isNominalExceedSaldo && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Nominal kirim melebihi saldo awal</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </>
              )}

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

              <div className="flex gap-2">
                <Button type="submit" className="w-full" disabled={isNominalExceedSaldo || submitting || nominalKirim <= 0}>Kirim Kas</Button>
              </div>

            </form>
            {/* Konfirmasi dialog */}
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Konfirmasi Kirim Kas</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <div><strong>Toko:</strong> {kodeToko}</div>
                  <div><strong>Metode:</strong> {metode}</div>
                  {metode === 'TRANSFER' && <div><strong>Rekening:</strong> {noRekening}</div>}
                  <div><strong>Nominal Kirim:</strong> Rp {nominalKirim.toLocaleString('id-ID')}</div>
                  {gramasi && <div><strong>Gramasi:</strong> {gramasi}</div>}
                  <div><strong>Saldo Awal:</strong> Rp {saldoAwal.toLocaleString('id-ID')}</div>
                  <div><strong>Saldo Akhir:</strong> Rp {saldoAkhir.toLocaleString('id-ID')}</div>
                </div>
                <DialogFooter>
                  <Button onClick={async () => {
                    // submit to backend
                    setSubmitting(true);
                    try {
                      await mutasiApi.createMutasi({
                        kode_toko: kodeToko,
                        metode,
                        no_rekening: metode === 'TRANSFER' ? noRekening : '-',
                        nominal_rp: nominalKirim,
                        gramasi: gramasi || 0,
                        keterangan: (watch('keterangan') as any) || '-',
                        saldo_awal: saldoAwal,
                        saldo_akhir: saldoAkhir,
                        kode_bank: '-',
                        // provide tanggal and jam to satisfy model validation
                        tanggal: new Date().toISOString(),
                        jam: new Date().toLocaleTimeString('id-ID', { hour12: false }),
                      });
                      // close confirmation
                      setShowConfirm(false);
                      // reset form to initial state so page appears fresh
                      reset({ kodeToko: '', metode: undefined, noRekening: '', nominalKirim: 0, keterangan: '-', gramasi: undefined });
                      // Ensure the Select shows the placeholder text by clearing the value
                      setValue('metode', '' as any);
                      // clear displayed saldo
                      setSaldoAwal(0);
                    } catch (err) {
                      // TODO: show error toast
                    }
                    setSubmitting(false);
                  }} disabled={submitting || nominalKirim <= 0}>OK & Simpan</Button>
                  <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={submitting}>Batal</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
