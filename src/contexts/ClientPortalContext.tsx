import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

interface ClientPortalUser {
  id: string;
  email: string;
  name: string | null;
  client_id: string;
  role: string;
  is_active: boolean;
}

interface ClientPortalContextType {
  user: User | null;
  session: Session | null;
  portalUser: ClientPortalUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isClientPortalUser: boolean;
}

const ClientPortalContext = createContext<ClientPortalContextType | undefined>(undefined);

export function ClientPortalProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [portalUser, setPortalUser] = useState<ClientPortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // Fetch portal user data if authenticated
      if (currentSession?.user) {
        setTimeout(() => {
          fetchPortalUser(currentSession.user.id);
        }, 0);
      } else {
        setPortalUser(null);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchPortalUser(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPortalUser = async (authUserId: string) => {
    try {
      const { data } = await (supabase as any)
        .from('client_portal_users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .eq('is_active', true)
        .maybeSingle();

      setPortalUser(data);
    } catch (error) {
      console.error('Error fetching portal user:', error);
      setPortalUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setPortalUser(null);
    navigate('/portal/auth');
  };

  const isClientPortalUser = !!portalUser || user?.user_metadata?.is_client_portal_user === true;

  return (
    <ClientPortalContext.Provider
      value={{
        user,
        session,
        portalUser,
        loading,
        signOut,
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
