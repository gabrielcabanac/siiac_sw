import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layers, 
  FileSpreadsheet, 
  Search, 
  History, 
  Lock,
  Download,
  PenTool
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { role } = useAuth();
  const canOperate = role === 'admin' || role === 'operador';

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowed: true
    },
    {
      to: '/operaciones',
      label: 'Registro Operacional (Digitación)',
      icon: PenTool,
      allowed: canOperate,
      tooltip: canOperate ? undefined : 'Requiere rol Operador o Admin'
    },
    {
      to: '/etl',
      label: 'Orquestador ETL Multi-Fuente',
      icon: Layers,
      allowed: canOperate,
      tooltip: canOperate ? undefined : 'Requiere rol Operador o Admin'
    },
    {
      to: '/consulta',
      label: 'Atención al Ciudadano',
      icon: Search,
      allowed: true
    },
    {
      to: '/importar',
      label: 'Carga Individual Excel',
      icon: FileSpreadsheet,
      allowed: canOperate,
      tooltip: canOperate ? undefined : 'Requiere rol Operador o Admin'
    },
    {
      to: '/historial',
      label: 'Auditoría y Lotes',
      icon: History,
      allowed: true
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        <div>
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Módulos de Integración
          </p>
          <nav className="mt-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (!item.allowed) {
                return (
                  <div
                    key={item.to}
                    title={item.tooltip}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 cursor-not-allowed bg-slate-800/40"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-slate-500" />
                      <span>{item.label}</span>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Descarga de plantillas oficiales */}
        <div className="pt-4 border-t border-slate-800">
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Plantillas de Carga (.xlsx)
          </p>
          <div className="space-y-1.5 px-1">
            <a
              href="/samples/papeletas_campo_inspectores.xlsx"
              download
              className="flex items-center justify-between px-3 py-2 text-xs rounded bg-slate-800/80 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 transition"
              title="Formato oficial para actas de campo de inspectores"
            >
              <span className="truncate">plantilla_papeletas_campo.xlsx</span>
              <Download className="w-3.5 h-3.5 flex-shrink-0 ml-2" />
            </a>
            <a
              href="/samples/recaudacion_bancos_externos.xlsx"
              download
              className="flex items-center justify-between px-3 py-2 text-xs rounded bg-slate-800/80 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 transition"
              title="Formato oficial para extractos bancarios y coactiva"
            >
              <span className="truncate">plantilla_bancos_coactiva.xlsx</span>
              <Download className="w-3.5 h-3.5 flex-shrink-0 ml-2" />
            </a>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        <p className="font-semibold text-slate-300">Responsable de Integración:</p>
        <p className="text-emerald-400 font-bold">Gabriel Cabana</p>
        <p className="mt-1 text-[11px] text-slate-500">Dirección de Tecnologías de Información</p>
      </div>
    </aside>
  );
};
