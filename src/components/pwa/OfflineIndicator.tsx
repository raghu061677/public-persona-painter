import { useState, useEffect } from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { offlineSync } from '@/lib/offlineSync';
import { toast } from 'sonner';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Changes will sync when back online.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update pending count every 5 seconds
    const interval = setInterval(() => {
      setPendingCount(offlineSync.getPendingCount());
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await offlineSync.syncQueue();
      toast.success('Changes synced successfully');
      setPendingCount(offlineSync.getPendingCount());
    } catch (error) {
      toast.error('Failed to sync changes');
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <div className="rounded-full bg-green-500/10 p-2">
              <Wifi className="h-4 w-4 text-green-500" />
            </div>
          ) : (
            <div className="rounded-full bg-orange-500/10 p-2">
              <WifiOff className="h-4 w-4 text-orange-500" />
            </div>
          )}
          
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline Mode'}
            </p>
            {pendingCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {pendingCount} {pendingCount === 1 ? 'change' : 'changes'} pending
              </p>
            )}
          </div>

          {isOnline && pendingCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
