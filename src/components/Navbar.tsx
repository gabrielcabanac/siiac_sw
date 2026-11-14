import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, UserCircle2, ShieldCheck, Database } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export const Navbar: React.FC = () => {
  const { profile, role, signOut, isMockMode, setMockSession } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Marca Institucional */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-inner font-bold text-lg">
            S
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-800 tracking-tight text-lg">SIIAC</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                Gestión Municipal
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Sistema Integrado de Información y Atención al Ciudadano
            </p>
          </div>
        </div>

        {/* Estado de Conexión & Perfil de Usuario */}
        <div className="flex items-center space-x-3">
          {/* Badge Oficial de Google Cloud Platform */}
          <div className="hidden md:flex items-center text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-semibold shadow-xs">
            <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" fill="#4285F4"/>
            </svg>
            <span>GCP: siiac-gabrielcabana-7144a.web.app</span>
          </div>

          {/* Badge de conexión */}
          <div className="hidden lg:flex items-center text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            <span>Servidor Activo</span>
          </div>

          {/* Selector de rol */}
          {isMockMode && (
            <div className="hidden lg:flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500 px-1 font-medium">Perfil:</span>
              <button
                onClick={() => setMockSession('admin')}
                className={`px-2 py-0.5 rounded transition ${
                  role === 'admin' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Admin TI
              </button>
              <button
                onClick={() => setMockSession('operador')}
                className={`px-2 py-0.5 rounded transition ${
                  role === 'operador' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Operador
              </button>
              <button
                onClick={() => setMockSession('consulta')}
                className={`px-2 py-0.5 rounded transition ${
                  role === 'consulta' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ventanilla
              </button>
            </div>
          )}

          {/* Información del Usuario */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 leading-tight">
                {profile?.full_name || 'Gabriel Cabana'}
              </p>
              <div className="flex items-center justify-end space-x-1 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span className="text-[11px] uppercase font-bold text-emerald-700 tracking-wider">
                  {role === 'admin' ? 'Administrador General' : role === 'operador' ? 'Operador de Integración' : 'Atención al Ciudadano'}
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-black text-sm">
              GC
            </div>

            {/* Botón Salir */}
            <button
              onClick={() => signOut()}
              title="Cerrar Sesión"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

