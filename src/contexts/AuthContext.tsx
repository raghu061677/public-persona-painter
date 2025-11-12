import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'user' | 'sales' | 'finance' | 'operations';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  isAdmin: boolean;
  isSales: boolean;
  isFinance: boolean;
  isOperations: boolean;
  hasRole: (role: AppRole) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetching and activity logging with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(async () => {
            await fetchUserRoles(session.user.id);
            
            // Log authentication events
            if (event === 'SIGNED_IN') {
              await supabase.rpc('log_user_activity', {
                p_user_id: session.user.id,
                p_activity_type: 'login',
                p_activity_description: 'User signed in',
              });
            } else if (event === 'SIGNED_OUT') {
              await supabase.rpc('log_user_activity', {
                p_user_id: session.user.id,
                p_activity_type: 'logout',
                p_activity_description: 'User signed out',
              });
            }
          }, 0);
        } else {
          setRoles([]);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserRoles(session.user.id);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
      } else {
        const userRoles = data?.map(r => r.role as AppRole) || [];
        setRoles(userRoles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = roles.includes('admin');
  const isSales = roles.includes('sales');
  const isFinance = roles.includes('finance');
  const isOperations = roles.includes('operations');
  
  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ user, session, roles, isAdmin, isSales, isFinance, isOperations, hasRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
