import { useEffect, useState } from 'react';

export type Toko = {
  _id: string;
  kode_toko: string;
  nama_toko: string;
  alamat_toko: string;
};

export function useTokoList() {
  const [tokos, setTokos] = useState<Toko[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://apibz2.nagatech.id:12099/api/v1/tokos')
      .then((res) => res.json())
      .then((data) => {
        setTokos(data);
        setLoading(false);
      })
      .catch((err) => {
        setError('Gagal mengambil data toko');
        setLoading(false);
      });
  }, []);

  return { tokos, loading, error };
}
