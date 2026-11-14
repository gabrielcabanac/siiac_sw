import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  isMockMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  setMockSession: (role: UserRole, name?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('consulta');
  const [loading, setLoading] = useState<boolean>(true);
  const [isMockMode, setIsMockMode] = useState<boolean>(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Si no hay Supabase configurado todavía, inicializar en modo demostración guiada
      setIsMockMode(true);
      const savedMockRole = (localStorage.getItem('siiac_mock_role') as UserRole) || 'admin';
      const savedMockName = 'Gabriel Cabana';
      setRole(savedMockRole);
      setProfile({
        id: 'mock-user-id-001',
        role: savedMockRole,
        full_name: savedMockName
      });
      setLoading(false);
      return;
    }

    // Si Supabase está configurado, escuchar cambios de autenticación
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Error al obtener sesión de Supabase:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setRole('consulta');
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Perfil no encontrado en BD, asignando rol por defecto:', error);
        setRole('consulta');
        setProfile({
          id: userId,
          role: 'consulta',
          full_name: 'Usuario Registrado'
        });
      } else if (data) {
        setProfile(data as UserProfile);
        setRole(data.role as UserRole);
      }
    } catch (err) {
      console.error('Error al consultar perfil:', err);
      setRole('consulta');
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase no está configurado aún. Por favor crea el archivo .env.local o usa el Modo Demo.') };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setRole('consulta');
    localStorage.removeItem('siiac_mock_role');
  };

  const setMockSession = (newRole: UserRole, name?: string) => {
    setIsMockMode(true);
    const mockName = name || 'Gabriel Cabana';
    localStorage.setItem('siiac_mock_role', newRole);
    localStorage.setItem('siiac_mock_name', mockName);
    setRole(newRole);
    setProfile({
      id: `mock-${newRole}-id`,
      role: newRole,
      full_name: mockName
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        isMockMode,
        signIn,
        signOut,
        setMockSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

