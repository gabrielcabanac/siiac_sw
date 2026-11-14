import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, KeyRound, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, setMockSession } = useAuth();
  const navigate = useNavigate();

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg(error.message || 'Error al iniciar sesión con Supabase.');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoAccess = (role: 'admin' | 'operador' | 'consulta', name: string) => {
    setMockSession(role, name);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-emerald-600 items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-500/30 mb-4">
          SIIAC
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Portal de Demostración
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Sistema Integrado de Información y Atención al Ciudadano
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {/* Alerta de estado */}
          {!isSupabaseConfigured ? (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Supabase aún no configurado en .env.local</p>
                  <p className="mt-1 text-amber-700">
                    Puedes evaluar inmediatamente todas las funciones utilizando los botones de <strong>Acceso Rápido por Rol</strong> abajo.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Conexión Supabase activa. Ingresa con tus credenciales.</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Formulario Supabase Auth */}
          {isSupabaseConfigured && (
            <form onSubmit={handleSupabaseLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@demo.siiac.gob.pe"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Iniciando...' : 'Iniciar Sesión en Supabase'}
              </button>
            </form>
          )}

          {/* Accesos Rápidos de Demostración */}
          <div className={isSupabaseConfigured ? 'mt-6 pt-6 border-t border-slate-200' : ''}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 text-center">
              Acceso Rápido para Evaluación
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => handleDemoAccess('admin', 'Gabriel Cabana')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    GC
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Gabriel Cabana (Admin)</p>
                    <p className="text-xs text-slate-500">Acceso total: Orquestador ETL, Carga y Auditoría</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
              </button>

              <button
                onClick={() => handleDemoAccess('operador', 'Lic. Rosa Paredes (Operador)')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    OPE
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Rol Operador de Mesa</p>
                    <p className="text-xs text-slate-500">Carga de Excel, revisión de errores y consulta</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
              </button>

              <button
                onClick={() => handleDemoAccess('consulta', 'Ventanilla Atención 01 (Consulta)')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-500 hover:bg-slate-50 text-left transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                    CON
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Rol Consulta Ciudadana</p>
                    <p className="text-xs text-slate-500">Solo lectura de saldos (sin carga de archivos)</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          PoC SI806U — Desarrollo Adaptativo e Integración de Software
        </p>
      </div>
    </div>
  );
};

