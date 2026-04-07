import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { permintaanTransferApi } from '@/services/api/permintaanTransferApi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SEEN_EXTERNAL_REQUEST_IDS_KEY = 'seen_external_permintaan_transfer_ids';

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [newRequestIds, setNewRequestIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const newRequestCount = useMemo(() => newRequestIds.length, [newRequestIds]);

  const getSeenIds = useCallback((): Set<string> => {
    try {
      const raw = sessionStorage.getItem(SEEN_EXTERNAL_REQUEST_IDS_KEY);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set<string>();
      return new Set<string>(parsed.filter((id) => typeof id === 'string'));
    } catch {
      return new Set<string>();
    }
  }, []);

  const addSeenIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const seen = getSeenIds();
    ids.forEach((id) => seen.add(id));
    sessionStorage.setItem(SEEN_EXTERNAL_REQUEST_IDS_KEY, JSON.stringify(Array.from(seen)));
  }, [getSeenIds]);

  const checkNewExternalRequests = useCallback(async () => {
    try {
      const rows = await permintaanTransferApi.list({ status: 'OPEN' });
      const seen = getSeenIds();
      const unseenExternal = rows.filter((row) => {
        const isExternal = String(row.createdBy || '').startsWith('api-token:');
        const isUnseen = !seen.has(row.id);
        return isExternal && isUnseen;
      });
      if (unseenExternal.length > 0) {
        setNewRequestIds(unseenExternal.map((row) => row.id));
        setNotifOpen(true);
      }
    } catch {
      // Ignore polling errors; user can continue using app.
    }
  }, [getSeenIds]);

  useEffect(() => {
    void checkNewExternalRequests();
    const interval = setInterval(() => {
      void checkNewExternalRequests();
    }, 20000);
    return () => clearInterval(interval);
  }, [checkNewExternalRequests]);

  const handleCloseNotif = () => {
    addSeenIds(newRequestIds);
    setNotifOpen(false);
    setNewRequestIds([]);
  };

  const handleReviewNotif = () => {
    addSeenIds(newRequestIds);
    setNotifOpen(false);
    setNewRequestIds([]);
    queryClient.invalidateQueries({ queryKey: ['permintaan-transfer'] });
    navigate('/permintaan-transfer');
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex flex-1 flex-col lg:pl-72 transition-all duration-300 ease-in-out">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 p-4 lg:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <Dialog open={notifOpen} onOpenChange={(open) => !open && handleCloseNotif()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Permintaan Transfer Baru</DialogTitle>
            <DialogDescription>
              {newRequestCount > 1
                ? `Ada ${newRequestCount} permintaan transfer baru dari OpenAPI.`
                : 'Ada 1 permintaan transfer baru dari OpenAPI.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseNotif}>
              Tutup
            </Button>
            <Button onClick={handleReviewNotif}>
              Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
