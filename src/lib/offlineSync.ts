import { db } from './supabase-wrapper';

export interface OfflineAction {
  id: string;
  timestamp: number;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  synced: boolean;
}

const OFFLINE_QUEUE_KEY = 'offline_action_queue';

export class OfflineSync {
  private queue: OfflineAction[] = [];

  constructor() {
    this.loadQueue();
    this.setupOnlineListener();
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('Back online, syncing...');
      this.syncQueue();
    });
  }

  addAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced'>) {
    const newAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      synced: false,
    };

    this.queue.push(newAction);
    this.saveQueue();

    if (navigator.onLine) {
      this.syncQueue();
    }
  }

  async syncQueue() {
    if (!navigator.onLine || this.queue.length === 0) return;

    const unsynced = this.queue.filter(a => !a.synced);
    
    for (const action of unsynced) {
      try {
        await this.syncAction(action);
        action.synced = true;
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        // Keep action in queue for retry
        break;
      }
    }

    // Remove synced actions
    this.queue = this.queue.filter(a => !a.synced);
    this.saveQueue();
  }

  private async syncAction(action: OfflineAction) {
    const { type, table, data } = action;

    switch (type) {
      case 'create':
        await db.from(table as any).insert(data);
        break;
      case 'update':
        await db.from(table as any).update(data).eq('id', data.id);
        break;
      case 'delete':
        await db.from(table as any).delete().eq('id', data.id);
        break;
    }
  }

  getPendingCount() {
    return this.queue.filter(a => !a.synced).length;
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

export const offlineSync = new OfflineSync();
