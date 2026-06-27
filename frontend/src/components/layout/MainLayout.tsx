import React, { useState } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  Home, Building2, Users, DollarSign, FileText, Settings, LogOut, Menu, X,
  TrendingUp, User, CreditCard, Globe, ChevronUp,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { Tooltip } from '../ui/Tooltip';
import toast from 'react-hot-toast';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, logout } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoutConfirm = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Logout failed');
      setIsLoggingOut(false);
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  const isAdmin = user?.role_id === 1;

  const navigation = isAdmin
    ? [
        { key: 'nav.dashboard', href: '/dashboard', icon: Home },
        { key: 'nav.hostels', href: '/hostels', icon: Building2 },
        { key: 'nav.owners', href: '/owners', icon: Users },
        { key: 'nav.reports', href: '/reports', icon: FileText },
        { key: 'nav.settings', href: '/settings', icon: Settings },
      ]
    : [
        { key: 'nav.dashboard', href: '/owner/dashboard', icon: Home },
        { key: 'nav.rooms', href: '/owner/rooms', icon: Building2 },
        { key: 'nav.students', href: '/owner/students', icon: Users },
        { key: 'nav.monthlyFees', href: '/owner/monthly-fees', icon: DollarSign },
        { key: 'nav.collections', href: '/owner/collections', icon: CreditCard },
        { key: 'nav.incomes', href: '/owner/income', icon: TrendingUp },
        { key: 'nav.expenses', href: '/owner/expenses', icon: FileText },
        { key: 'nav.reports', href: '/owner/reports', icon: FileText },
        { key: 'nav.googleForm', href: '/owner/webhook-setup', icon: Globe },
        { key: 'nav.settings', href: '/owner/settings', icon: Settings },
      ];

  const activeItem = navigation.find((n) => n.href === location.pathname);
  const pageTitle = activeItem ? t(activeItem.key) : t('nav.dashboard');
  const profileHref = isAdmin ? '/profile' : '/owner/profile';
  const roleLabel = isAdmin ? t('role.admin') : t('role.owner');

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--content-bg)' }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--sidebar-bg)', color: '#fff' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 h-20 px-5 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-lg font-bold leading-tight text-white">
            {t('brand.name')}
          </span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-white/90">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navigation.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.key}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                  active ? 'bg-white shadow-sm' : 'text-white/90 hover:bg-white/10'
                }`}
                style={active ? { color: 'var(--primary-color)' } : undefined}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        {/* Footer: profile + logout */}
        <div className="p-3 border-t border-white/15 flex-shrink-0 space-y-1">
          <button
            onClick={() => { navigate(profileHref); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
            </span>
            <span className="text-left min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white truncate">{user?.full_name}</span>
              <span className="block text-xs text-white/70">{roleLabel}</span>
            </span>
            <ChevronUp className="w-4 h-4 text-white/70" />
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">{t('common.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex-shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-gray-200 dark:border-gray-700"
          style={{ backgroundColor: 'var(--card-bg)' }}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden" style={{ color: 'var(--text-color)' }}>
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>{pageTitle}</h1>
          <div className="ml-auto">
            <Tooltip text={t('common.logout')} position="bottom">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <LogOut className="h-4 w-4" style={{ color: 'var(--primary-color)' }} />
              </button>
            </Tooltip>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--content-bg)' }}>
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Logout</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 dark:text-gray-200 mb-1">Are you sure you want to logout?</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">You will need to login again to access your account.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutConfirm}
                disabled={isLoggingOut}
                className="px-4 py-2 text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
