import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Vote, LayoutDashboard, LogOut, PlusCircle, Building } from 'lucide-react';

export default function AdminLayout() {
  const { tenant, logout, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/admin/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/admin/campaigns" className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Vote className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-lg text-slate-900 tracking-tight block leading-tight">Universal Voting</span>
                  <span className="text-xs text-slate-500">多场景通用投票平台</span>
                </div>
              </Link>

              <nav className="hidden sm:flex gap-1">
                <Link
                  to="/admin/campaigns"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                    location.pathname === '/admin/campaigns'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  活动管理
                </Link>
                <Link
                  to="/admin/campaigns/new"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                    location.pathname === '/admin/campaigns/new'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  新建活动
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-medium text-slate-800">{tenant?.name}</span>
                <span className="text-slate-400">(@{tenant?.username})</span>
              </div>

              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
