import React, { useState } from 'react';
import {
  Smartphone, Monitor, SlidersHorizontal, User, Shield, Info, Globe, Check,
  Sun, Moon, Activity, Contrast, LayoutGrid, Vibrate, MonitorSmartphone,
  CloudUpload, RotateCcw, Smartphone as Phone, ShieldCheck, Zap,
} from 'lucide-react';
import { useTheme, FontSize } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth';
import toast from 'react-hot-toast';

const COLORS = ['#4F46E5', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
const FONT_OPTIONS = ['Inter', 'Roboto', 'Poppins', 'Open Sans', 'Montserrat', 'System Default'];
const SIZES: FontSize[] = ['small', 'medium', 'large'];

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void }> = ({ on, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!on)}
    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
      on ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
        on ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

const SectionTitle: React.FC<{ n: number; title: string; desc: string }> = ({ n, title, desc }) => (
  <div className="mb-4">
    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{`${n}. ${title}`}</h3>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
  </div>
);

export const SettingsPage: React.FC = () => {
  const { theme, setThemeMode, setPrimaryColor, setFontSize, setFontFamily, setOption, resetTheme } =
    useTheme();
  const { lang, setLang, t } = useLanguage();
  const { user } = useAuthStore();

  const [device, setDevice] = useState<'mobile' | 'web'>('web');
  const [tab, setTab] = useState<'preferences' | 'account' | 'security' | 'about'>('preferences');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const sizeIdx = Math.max(0, SIZES.indexOf(theme.fontSize));

  const options = [
    { key: 'reduceMotion' as const, icon: Activity, title: t('settings.opt.reduceMotion'), desc: t('settings.opt.reduceMotion.desc') },
    { key: 'highContrast' as const, icon: Contrast, title: t('settings.opt.highContrast'), desc: t('settings.opt.highContrast.desc') },
    { key: 'compactMode' as const, icon: LayoutGrid, title: t('settings.opt.compact'), desc: t('settings.opt.compact.desc') },
    { key: 'hapticFeedback' as const, icon: Vibrate, title: t('settings.opt.haptic'), desc: t('settings.opt.haptic.desc') },
    { key: 'keepScreenOn' as const, icon: MonitorSmartphone, title: t('settings.opt.keepScreen'), desc: t('settings.opt.keepScreen.desc') },
  ];

  const features = [
    { icon: CloudUpload, title: t('settings.feat.backup'), desc: t('settings.feat.backup.desc') },
    { icon: RotateCcw, title: t('settings.feat.reset'), desc: t('settings.feat.reset.desc') },
    { icon: Phone, title: t('settings.feat.cross'), desc: t('settings.feat.cross.desc') },
    { icon: ShieldCheck, title: t('settings.feat.secure'), desc: t('settings.feat.secure.desc') },
    { icon: Zap, title: t('settings.feat.instant'), desc: t('settings.feat.instant.desc') },
  ];

  const tabs = [
    { key: 'preferences' as const, icon: SlidersHorizontal, label: t('settings.tab.preferences') },
    { key: 'account' as const, icon: User, label: t('settings.tab.account') },
    { key: 'security' as const, icon: Shield, label: t('settings.tab.security') },
    { key: 'about' as const, icon: Info, label: t('settings.tab.about') },
  ];

  const changePassword = async () => {
    if (pw.next.length < 6) return toast.error('New password must be at least 6 characters');
    if (pw.next !== pw.confirm) return toast.error('Passwords do not match');
    setPwLoading(true);
    try {
      await authService.changePassword(pw.current, pw.next);
      toast.success('Password updated');
      setPw({ current: '', next: '', confirm: '' });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Could not update password');
    } finally {
      setPwLoading(false);
    }
  };

  const card = 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl';

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.subtitle')}</p>
        </div>
        {/* Mobile / Web toggle (visual) */}
        <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800 self-start">
          {(['mobile', 'web'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                device === d
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {d === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              {t(d === 'mobile' ? 'settings.mobile' : 'settings.web')}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === tb.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <tb.icon className="w-4 h-4" />
            {tb.label}
          </button>
        ))}
      </div>

      {/* PREFERENCES */}
      {tab === 'preferences' && (
        <div className={`${card} p-5 sm:p-6 divide-y divide-gray-100 dark:divide-gray-700`}>
          {/* 1. Language */}
          <div className="pb-6">
            <SectionTitle n={1} title={t('settings.language')} desc={t('settings.language.desc')} />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as 'en' | 'te')}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="en">{t('lang.english')}</option>
                  <option value="te">{t('lang.telugu')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['en', 'te'] as const).map((l) => {
                  const selected = lang === l;
                  return (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-colors ${
                        selected
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-600/10'
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <span className="w-8 h-8 rounded-lg bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
                        {l === 'en' ? 'EN' : 'తె'}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {l === 'en' ? t('lang.english') : t('lang.telugu')}
                      </span>
                      {selected && <Check className="w-4 h-4 text-primary-600 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Theme Mode */}
          <div className="py-6">
            <SectionTitle n={2} title={t('settings.theme')} desc={t('settings.theme.desc')} />
            <div className="grid grid-cols-2 gap-4">
              {([
                { mode: 'light' as const, icon: Sun, title: t('settings.theme.light'), desc: t('settings.theme.lightDesc') },
                { mode: 'dark' as const, icon: Moon, title: t('settings.theme.dark'), desc: t('settings.theme.darkDesc') },
              ]).map((m) => {
                const selected = theme.mode === m.mode;
                return (
                  <button
                    key={m.mode}
                    onClick={() => setThemeMode(m.mode)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                      selected
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-600/10'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <m.icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <span className="text-left">
                      <span className="block text-sm font-semibold text-gray-900 dark:text-white">{m.title}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{m.desc}</span>
                    </span>
                    {selected && <Check className="w-4 h-4 text-primary-600 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Primary Color */}
          <div className="py-6">
            <SectionTitle n={3} title={t('settings.color')} desc={t('settings.color.desc')} />
            <div className="flex flex-wrap gap-5">
              {COLORS.map((c) => {
                const selected = theme.primaryColor.toLowerCase() === c.toLowerCase();
                return (
                  <button key={c} onClick={() => setPrimaryColor(c)} className="flex flex-col items-center gap-1.5">
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: c, boxShadow: selected ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : 'none' }}
                    >
                      {selected && <Check className="w-5 h-5 text-white" />}
                    </span>
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{c}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Font Settings */}
          <div className="py-6">
            <SectionTitle n={4} title={t('settings.font')} desc={t('settings.font.desc')} />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('settings.font.size')}</p>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm text-gray-400">A</span>
              <input
                type="range" min={0} max={2} step={1} value={sizeIdx}
                onChange={(e) => setFontSize(SIZES[Number(e.target.value)])}
                className="flex-1 accent-primary-600"
              />
              <span className="text-2xl text-gray-400">A</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('settings.font.family')}</p>
                <select
                  value={theme.fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('settings.font.preview')}</p>
                <div className="h-[42px] flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-600">
                  <span className="font-semibold text-gray-900 dark:text-white" style={{ fontSize: theme.fontSize === 'large' ? 24 : theme.fontSize === 'small' ? 16 : 20 }}>Aa</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Additional Options */}
          <div className="pt-6">
            <SectionTitle n={5} title={t('settings.options')} desc="" />
            <div className="space-y-1">
              {options.map((o) => (
                <div key={o.key} className="flex items-center gap-3 py-2.5">
                  <span className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <o.icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{o.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{o.desc}</p>
                  </div>
                  <Toggle on={theme[o.key]} onChange={(v) => setOption(o.key, v)} />
                </div>
              ))}
            </div>

            {/* Note */}
            <div className="mt-5 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>{t('settings.note')}</strong> {t('settings.note.text')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT */}
      {tab === 'account' && (
        <div className={`${card} p-6`}>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('account.title')}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: t('account.fullName'), value: user?.full_name },
              { label: t('account.email'), value: user?.email },
              { label: t('account.phone'), value: user?.phone || '—' },
              { label: t('account.role'), value: user?.role },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{f.label}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  {f.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECURITY */}
      {tab === 'security' && (
        <div className={`${card} p-6 max-w-md`}>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('security.changePassword')}</h3>
          {([
            { key: 'current' as const, label: t('security.current') },
            { key: 'next' as const, label: t('security.new') },
            { key: 'confirm' as const, label: t('security.confirm') },
          ]).map((f) => (
            <div key={f.key} className="mb-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
              <input
                type="password"
                value={pw[f.key]}
                onChange={(e) => setPw((p) => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          ))}
          <button
            onClick={changePassword}
            disabled={pwLoading}
            className="mt-2 w-full py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60"
          >
            {pwLoading ? '…' : t('security.update')}
          </button>
        </div>
      )}

      {/* ABOUT */}
      {tab === 'about' && (
        <div className={`${card} p-6 text-center`}>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('about.appName')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">{t('about.desc')}</p>
          <p className="text-xs text-gray-400 mt-4">{t('settings.version')}</p>
        </div>
      )}

      {/* Feature cards (shown under Preferences) */}
      {tab === 'preferences' && (
        <div className="mt-8">
          <h3 className="text-center text-base font-semibold text-gray-900 dark:text-white mb-4">
            {t('settings.features.title')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {features.map((f, i) => (
              <button
                key={f.title}
                onClick={i === 1 ? resetTheme : undefined}
                className={`${card} p-4 text-center hover:shadow-md transition-shadow`}
              >
                <span className="inline-flex w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-600/10 items-center justify-center mb-2">
                  <f.icon className="w-5 h-5 text-primary-600" />
                </span>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{f.title}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">{f.desc}</p>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">{t('settings.version')}</p>
        </div>
      )}
    </div>
  );
};
