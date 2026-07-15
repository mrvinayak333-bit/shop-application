import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useNotifications } from '../lib/NotificationContext';
import { 
  Smartphone, LogOut, User, Menu, X, Home, Wrench, Search, Users, 
  BookOpen, Bell, Volume2, VolumeX, Sun, Moon, PlusCircle, ShieldAlert 
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { unreadCount, notifications, markAsRead, markAllAsRead, soundEnabled, toggleSound } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Dark/Light Theme Switch
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark') || localStorage.theme === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDark]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const getNotifIcon = (n) => {
    const msg = (n.message || '').toLowerCase();
    if (msg.includes('received')) return '📦';
    if (msg.includes('completed')) return '✅';
    if (msg.includes('quotation')) return '📄';
    if (msg.includes('approved')) return '👍';
    if (msg.includes('started')) return '🔧';
    return '🔔';
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/#services', label: 'Services', icon: Wrench },
    { to: '/repair/register', label: 'Book Repair', icon: PlusCircle },
    { to: '/#tracking', label: 'Live Tracking', icon: Search },
  ];

  const staffLinks = [
    { to: '/login/staff', label: 'Staff Login', icon: Users },
  ];

  // Map user role to panel path
  const getPanelPath = () => {
    if (!user) return '/login/customer';
    if (user.role === 'master') return '/dashboard/master';
    if (user.role === 'admin') return '/dashboard/admin';
    if (user.role === 'technician') return '/dashboard/technician';
    if (user.role === 'student') return '/dashboard/student';
    return '/dashboard/customer';
  };

  return (
    <>
      {/* Top sticky navbar for desktop & tablets */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800/80 shadow-sm transition">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo branding */}
            <Link to="/" className="flex items-center gap-2">
              <Smartphone className="w-8 h-8 text-emerald-600" />
              <span className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider">
                SHREE RAAM MOBILE
              </span>
            </Link>

            {/* Desktop Menu links */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link, i) => (
                <Link 
                  key={i} 
                  to={link.to} 
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    location.pathname === link.to 
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {isAuthenticated && (
                <Link 
                  to={getPanelPath()} 
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                >
                  Dashboard
                </Link>
              )}

              {isAuthenticated && (user?.role === 'master' || user?.role === 'admin' || user?.role === 'student') && (
                <Link 
                  to="/enrolled-courses" 
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    location.pathname === '/enrolled-courses' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Enrolled Courses
                </Link>
              )}

              {/* Portals Dropdown */}
              <div className="relative group">
                <button className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1">
                  <Users className="w-4 h-4" /> Portals <span className="text-[10px]">▼</span>
                </button>
                <div className="absolute right-0 mt-0 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700/50 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link to="/login/staff" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <Users className="w-4 h-4 text-emerald-600" /> Staff Login
                  </Link>
                  <Link to="/login/technician" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <Wrench className="w-4 h-4 text-blue-500" /> Technician Login
                  </Link>
                  <Link to="/login/student" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <BookOpen className="w-4 h-4 text-purple-500" /> Student Login
                  </Link>
                  <hr className="my-1 border-slate-100 dark:border-slate-700" />
                  <Link to="/login/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <Users className="w-4 h-4 text-indigo-500" /> Admin Login
                  </Link>
                  <Link to="/login/master" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <Users className="w-4 h-4 text-orange-500" /> Master Login
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Buttons: Theme, Notifications, User Auth */}
            <div className="flex items-center gap-2">
              
              {/* Light/Dark mode toggle */}
              <button 
                onClick={() => setIsDark(!isDark)}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
                title="Toggle Theme"
              >
                {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Notification bell for authed users */}
              {isAuthenticated && (
                <div className="relative">
                  <button 
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {/* Notification Dropdown modal */}
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700/60 z-50 max-h-96 overflow-hidden">
                      <div className="p-3.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notifications</h3>
                        <div className="flex items-center gap-2">
                          <button onClick={toggleSound} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white" title={soundEnabled ? 'Mute' : 'Unmute'}>
                            {soundEnabled ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
                          </button>
                          {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-emerald-600 hover:text-emerald-800 font-bold">
                              Clear all
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-80 divide-y divide-slate-50 dark:divide-slate-700/30">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                            <Bell className="w-8 h-8 mx-auto mb-1.5 opacity-55" />
                            <p className="text-xs">No new notifications</p>
                          </div>
                        ) : (
                          notifications.slice(0, 15).map(n => (
                            <div
                              key={n.id}
                              onClick={() => !n.is_read && markAsRead(n.id)}
                              className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition flex gap-2.5 ${!n.is_read ? 'bg-emerald-50/30 dark:bg-slate-700/20' : ''}`}
                            >
                              <span className="text-lg">{getNotifIcon(n)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{n.title}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                                <span className="text-[9px] text-slate-400 block mt-1">{formatTimeAgo(n.created_at)}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Login / Profile quick actions */}
              {isAuthenticated ? (
                <div className="hidden lg:flex items-center gap-3.5 pl-3 border-l border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{user?.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{user?.role}</p>
                  </div>
                  <button 
                    onClick={handleLogout} 
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link to="/login/customer" className="hidden lg:inline-flex btn-premium text-xs">
                  Customer Portal
                </Link>
              )}

              {/* Mobile menu hamburger */}
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-2 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

            </div>
          </div>
        </div>

        {/* Mobile slide down menu */}
        {menuOpen && (
          <div className="lg:hidden bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800/80 shadow-lg px-4 py-3 space-y-1">
            {navLinks.map((link, i) => (
              <Link 
                key={i} 
                to={link.to} 
                onClick={() => setMenuOpen(false)} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-medium"
              >
                <link.icon className="w-5 h-5 text-emerald-600" /> {link.label}
              </Link>
            ))}
            {isAuthenticated && (user?.role === 'master' || user?.role === 'admin' || user?.role === 'student') && (
              <Link 
                to="/enrolled-courses" 
                onClick={() => setMenuOpen(false)} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-medium"
              >
                <BookOpen className="w-5 h-5 text-emerald-600" /> Enrolled Courses
              </Link>
            )}
            <hr className="my-2 border-slate-100 dark:border-slate-800" />
            
            <p className="px-3 text-[10px] text-slate-400 uppercase font-black tracking-wider">Portals</p>
            {staffLinks.map((link, i) => (
              <Link key={i} to={link.to} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium">
                <link.icon className="w-5 h-5" /> {link.label}
              </Link>
            ))}
            <Link to="/login/technician" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium">
              <Wrench className="w-5 h-5 text-blue-500" /> Technician Login
            </Link>
            <Link to="/login/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium">
              <Users className="w-5 h-5 text-indigo-500" /> Admin Login
            </Link>
            <Link to="/login/master" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium">
              <Users className="w-5 h-5 text-orange-500" /> Master Login
            </Link>

            <hr className="my-2 border-slate-100 dark:border-slate-800" />
            {isAuthenticated ? (
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">{user?.name}</span>
                </div>
                <button onClick={handleLogout} className="text-red-500 flex items-center gap-1 font-bold text-xs"><LogOut className="w-4 h-4" /> Logout</button>
              </div>
            ) : (
              <Link to="/login/customer" onClick={() => setMenuOpen(false)} className="block text-center btn-premium mt-2">
                Customer Portal
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Smart Bottom Navigation Bar for Mobile devices */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-150 dark:border-slate-800/80 h-16 z-55 flex items-center justify-around px-2 pb-1 transition shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
        <Link to="/" className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400">
          <Home className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold mt-0.5">Home</span>
        </Link>
        <Link to="/repair/register" className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400">
          <Wrench className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold mt-0.5">Book Repair</span>
        </Link>
        <Link to="/#tracking" className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400">
          <Search className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold mt-0.5">Tracking</span>
        </Link>
        {isAuthenticated ? (
          <Link to={getPanelPath()} className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400">
            <User className="w-5.5 h-5.5" />
            <span className="text-[9px] font-bold mt-0.5">Dashboard</span>
          </Link>
        ) : (
          <Link to="/login/customer" className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400">
            <User className="w-5.5 h-5.5" />
            <span className="text-[9px] font-bold mt-0.5">Login</span>
          </Link>
        )}
      </div>
    </>
  );
}
