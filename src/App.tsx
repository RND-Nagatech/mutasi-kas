import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layout
import { AdminLayout } from "@/components/layout/AdminLayout";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MasterBank from "./pages/master/MasterBank";
import MasterRekening from "./pages/master/MasterRekening";
import KirimKas from "./pages/transaksi/KirimKas";
import BatalKirimKas from "./pages/transaksi/BatalKirimKas";
import LaporanMutasiKas from "./pages/laporan/LaporanMutasiKas";
import LaporanKirimanSetoran from "./pages/laporan/LaporanKirimanSetoran";
import NotFound from "./pages/NotFound";
import InputSaldoCash from "./pages/input-saldo/Cash";
import InputSaldoRekening from "./pages/input-saldo/Rekening";
import MasterToko from "./pages/master/MasterToko";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected Admin Routes */}
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/master/bank" element={<MasterBank />} />
            <Route path="/master/rekening" element={<MasterRekening />} />
            <Route path="/master/toko" element={<MasterToko />} />
            <Route path="/transaksi/kirim" element={<KirimKas />} />
            <Route path="/transaksi/batal-kirim" element={<BatalKirimKas />} />
            <Route path="/laporan/mutasi-kas" element={<LaporanMutasiKas />} />
            <Route path="/laporan/kiriman-setoran" element={<LaporanKirimanSetoran />} />
            <Route path="/input-saldo/cash" element={<InputSaldoCash />} />
            <Route path="/input-saldo/rekening" element={<InputSaldoRekening />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
