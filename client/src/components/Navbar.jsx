import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useNotifications } from '../lib/NotificationContext';
import { Smartphone, LogOut, User, Menu, X, Home, Wrench, Search, Users, BookOpen, Bell, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { unreadCount, notifications, markAsRead, markAllAsRead, soundEnabled, toggleSound } = useNotifications();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const getNotifIcon = (n) => {
    const msg = (n.message || '').toLowerCase();
    if (msg.includes('received')) return '📦';
    if (msg.includes('inspection completed')) return '✅';
    if (msg.includes('quotation')) return '📄';
    if (msg.includes('approved')) return '👍';
    if (msg.includes('repair started')) return '🔧';
    if (msg.includes('spare parts')) return '⏳';
    if (msg.includes('testing')) return '🧪';
    if (msg.includes('ready')) return '📋';
    if (msg.includes('delivered')) return '🎉';
    if (n.type === 'assignment') return '📋';
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
    { to: '/repair/register', label: 'Repair Booking', icon: Wrench },
    { to: '/#tracking', label: 'Live Tracking', icon: Search },
  ];

  const staffLinks = [
    { to: '/login/staff', label: 'Staff Login', icon: Users },
    { to: '/login/student', label: 'Student Login', icon: BookOpen },
  ];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Smartphone className="w-8 h-8 text-emerald-600" />
            <span className="text-lg font-bold text-gray-900">SHREE RAAM MOBILE</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link, i) => (
              <Link key={i} to={link.to} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition">
                {link.label}
              </Link>
            ))}

            {isAuthenticated && (user?.role === 'master' || user?.role === 'student') && (
              <Link to="/enrolled-courses" className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition">
                Enrolled Courses
              </Link>
            )}

            {/* Staff & Student Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition flex items-center gap-1">
                <Users className="w-4 h-4" /> Portal <span className="text-xs">▼</span>
              </button>
              <div className="absolute right-0 mt-0 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <Link to="/login/staff" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700">
                  <Users className="w-4 h-4" /> Staff Login
                </Link>
                <Link to="/login/technician" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                  <Wrench className="w-4 h-4" /> Technician Login
                </Link>
                <Link to="/login/student" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                  <BookOpen className="w-4 h-4" /> Student Login
                </Link>
                <hr className="my-1" />
                <Link to="/login/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">
                  <Users className="w-4 h-4" /> Admin Login
                </Link>
                <Link to="/login/master" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700">
                  <Users className="w-4 h-4" /> Master Login
                </Link>
              </div>
            </div>

            <Link to="/#contact" className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition">
              Contact Us
            </Link>

            {/* Auth Section */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3 ml-4">
                {/* Notification Bell */}
                <div className="relative">
                  <button 
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {/* Notification Dropdown */}
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
                      <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        <div className="flex items-center gap-2">
                          <button onClick={toggleSound} className="p-1 text-gray-500 hover:text-gray-700" title={soundEnabled ? 'Mute' : 'Unmute'}>
                            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                          </button>
                          {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                              Mark all read
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-80">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-400">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No notifications</p>
                          </div>
                        ) : (
                          notifications.slice(0, 15).map(n => (
                            <div
                              key={n.id}
                              onClick={() => !n.is_read && markAsRead(n.id)}
                              className={`p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-lg">{getNotifIcon(n)}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                                  <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(n.created_at)}</p>
                                </div>
                                {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{user?.name}</span>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{user?.role}</span>
                </div>
                <button onClick={handleLogout} className="text-red-500 hover:text-red-700 p-2"><LogOut className="w-5 h-5" /></button>
              </div>
            ) : (
              <Link to="/login/customer" className="ml-4 btn-primary text-sm flex items-center gap-2">
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link, i) => (
              <Link key={i} to={link.to} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700">
                <link.icon className="w-5 h-5" /> {link.label}
              </Link>
            ))}
            <hr className="my-2" />
            <p className="px-3 text-xs text-gray-400 uppercase font-semibold">Portals</p>
            {staffLinks.map((link, i) => (
              <Link key={i} to={link.to} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700">
                <link.icon className="w-5 h-5" /> {link.label}
              </Link>
            ))}
            <Link to="/login/technician" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700">
              <Wrench className="w-5 h-5" /> Technician Login
            </Link>
            <Link to="/login/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-purple-50 hover:text-purple-700">
              <Users className="w-5 h-5" /> Admin Login
            </Link>
            <Link to="/login/master" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-orange-50 hover:text-orange-700">
              <Users className="w-5 h-5" /> Master Login
            </Link>
            <hr className="my-2" />
            {isAuthenticated ? (
              <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4" />
                  <span>{user?.name}</span>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{user?.role}</span>
                </div>
                <button onClick={handleLogout} className="text-red-500"><LogOut className="w-5 h-5" /></button>
              </div>
            ) : (
              <Link to="/login/customer" onClick={() => setMenuOpen(false)} className="block text-center btn-primary mt-2">
                Customer Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
