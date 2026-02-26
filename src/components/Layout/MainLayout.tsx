import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Building2, ChevronLeft, LogOut, Home } from 'lucide-react';
import { useInspectionStore } from '../../store/useInspectionStore';

const MainLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        inspectorRut,
        inspectorName,
        inspectorEmail,
        inspectorRole,
        fetchData,
        checkConnection,
        logout
    } = useInspectionStore();

    const [showProfile, setShowProfile] = useState(false);
    const isDashboard = location.pathname === '/';

    useEffect(() => {
        checkConnection();
    }, [checkConnection]);

    useEffect(() => {
        if (!inspectorRut && location.pathname !== '/login') {
            navigate('/login');
        } else if (inspectorRut) {
            fetchData();
        }
    }, [inspectorRut, navigate, location.pathname, fetchData]);

    const getInitials = (name: string | null) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const handleLogout = () => {
        setShowProfile(false);
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        {!isDashboard && (
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 -ml-2 text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg rounded-full"
                                aria-label="Volver"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        <div className="flex items-center space-x-2 text-primary-600 cursor-pointer" onClick={() => navigate('/')}>
                            <Building2 size={28} />
                            <span className="text-xl font-bold tracking-tight text-slate-900">InmobApp</span>
                        </div>
                    </div>

                    <div className="flex items-center relative">
                        <button
                            onClick={() => setShowProfile(!showProfile)}
                            className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold hover:bg-primary-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        >
                            {getInitials(inspectorName)}
                        </button>

                        {showProfile && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowProfile(false)}
                                ></div>
                                <div className="absolute top-12 right-0 w-64 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                                        <p className="font-bold text-slate-800 break-words">{inspectorName || 'Usuario'}</p>
                                        <p className="text-sm text-slate-500 font-medium mb-1">{inspectorRole || 'Inspector'}</p>
                                        <p className="text-xs text-slate-400 break-words">{inspectorEmail || inspectorRut}</p>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        <button
                                            onClick={() => {
                                                setShowProfile(false);
                                                navigate('/');
                                            }}
                                            className="w-full text-left px-4 py-3 text-sm text-slate-600 font-medium hover:bg-slate-50 rounded-lg flex items-center space-x-2 transition-colors"
                                        >
                                            <Home size={18} />
                                            <span>Dashboard / Inicio</span>
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-3 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg flex items-center space-x-2 transition-colors"
                                        >
                                            <LogOut size={18} />
                                            <span>Cerrar Sesión</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                <Outlet />
            </main>

            {/* Footer / Status Bar (optional, can be useful for tablet real estate app) */}
            {isDashboard && (
                <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
                    <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
                        InmobApp v1.0.0 - Modo Inspector
                    </div>
                </footer>
            )}
        </div>
    );
};

export default MainLayout;
