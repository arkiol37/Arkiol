import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Clapperboard, FolderOpen, Image, BarChart3,
  CreditCard, Cpu, Settings, LogOut, ChevronDown, Coins, Plus, Layers
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/studio', label: 'New Campaign', icon: Plus, primary: true },
  { to: '/projects', label: 'Projects', icon: FolderOpen },
  { to: '/library', label: 'Asset Library', icon: Image },
  { to: '/brand-assets', label: 'Brand Assets', icon: Layers },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/providers', label: 'AI Providers', icon: Cpu },
  { to: '/pricing', label: 'Pricing & Plans', icon: CreditCard },
];

export default function AppLayout() {
  const { user, workspace, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const planBadgeColors: Record<string, string> = {
    free:    'text-ink-100',
    creator: 'text-blue-400',
    pro:     'text-gold-300',
    studio:  'text-purple-400',
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center text-ink-900 font-black text-lg shadow-gold">
            N
          </div>
          <div>
            <div className="text-sm font-black text-ink-50 tracking-tight">Arkiol</div>
            <div className="text-[10px] text-ink-200 font-medium">AI Brand Director</div>
          </div>
        </div>

        {/* Workspace */}
        {workspace && (
          <div className="mb-6 px-1">
            <div className="text-[10px] font-semibold text-ink-300 uppercase tracking-widest mb-2">Workspace</div>
            <div className="flex items-center gap-2 p-2 bg-ink-600 rounded-xl border border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-gold-400/20 flex items-center justify-center text-gold-300 text-xs font-bold">
                {workspace.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-ink-50 truncate">{workspace.name}</div>
                <div className={`text-[10px] font-semibold capitalize ${planBadgeColors[workspace.plan]}`}>
                  {workspace.plan} plan
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Credits */}
        {workspace && (
          <div className="mb-6 mx-1 p-3 bg-ink-800 rounded-xl border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-200 uppercase tracking-widest">
                <Coins size={10} className="text-gold-400" />
                Credits
              </div>
              <span className="font-mono text-xs font-bold text-gold-300">{workspace.creditsBalance}</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${Math.min(100, (workspace.creditsBalance / 100) * 100)}%` }} />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon, primary }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''} ${primary ? 'mt-2 !text-gold-300 border border-gold-400/20 bg-gold-400/10 hover:bg-gold-400/15' : ''}`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: Settings + User */}
        <div className="mt-6 space-y-0.5 border-t border-white/[0.06] pt-4">
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={15} />
            Settings
          </NavLink>

          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-ink-700 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-gold-400/20 flex items-center justify-center text-gold-300 text-xs font-bold flex-shrink-0">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-xs font-semibold text-ink-50 truncate">{user.firstName} {user.lastName}</div>
                  <div className="text-[10px] text-ink-200 truncate">{user.email}</div>
                </div>
                <ChevronDown size={12} className="text-ink-300 flex-shrink-0" />
              </button>

              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-ink-700 border border-white/10 rounded-xl overflow-hidden shadow-xl z-50"
                >
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <LogOut size={13} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 ml-64 min-h-screen bg-ink-900">
        <Outlet />
      </main>
    </div>
  );
}
