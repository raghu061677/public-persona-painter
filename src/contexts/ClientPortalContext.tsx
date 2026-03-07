import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ClientPortalUser {
  id: string;
  email: string;
  name: string | null;
  client_id: string;
  client_name?: string | null;
  role: string;
  is_active: boolean;
}

interface ClientPortalContextType {
  portalUser: ClientPortalUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setPortalUser: (user: ClientPortalUser | null) => void;
  isClientPortalUser: boolean;
}

const PORTAL_USER_KEY = 'go_ads_portal_user';

const ClientPortalContext = createContext<ClientPortalContextType | undefined>(undefined);

export function ClientPortalProvider({ children }: { children: ReactNode }) {
  const [portalUser, setPortalUserState] = useState<ClientPortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Bootstrap from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PORTAL_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ClientPortalUser;
        if (parsed?.id && parsed?.client_id && parsed?.is_active) {
          setPortalUserState(parsed);
        } else {
          localStorage.removeItem(PORTAL_USER_KEY);
        }
      }
    } catch {
      localStorage.removeItem(PORTAL_USER_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const setPortalUser = useCallback((user: ClientPortalUser | null) => {
    setPortalUserState(user);
    if (user) {
      localStorage.setItem(PORTAL_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(PORTAL_USER_KEY);
    }
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(PORTAL_USER_KEY);
    setPortalUserState(null);
    navigate('/portal/auth');
  }, [navigate]);

  const isClientPortalUser = !!portalUser;

  return (
    <ClientPortalContext.Provider
      value={{
        portalUser,
        loading,
        signOut,
        setPortalUser,
        isClientPortalUser,
      }}
    >
      {children}
    </ClientPortalContext.Provider>
  );
}

export function useClientPortal() {
  const context = useContext(ClientPortalContext);
  if (context === undefined) {
    throw new Error('useClientPortal must be used within a ClientPortalProvider');
  }
  return context;
}
