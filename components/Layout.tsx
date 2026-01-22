
import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF5]">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/assets/logo.png"
              alt="OK Sofás Logo"
              className="h-10 w-auto object-contain"
            />
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-slate-800 uppercase tracking-widest leading-none">Visualizador AI</h1>
              <p className="text-[10px] text-[#74AE2C] font-bold uppercase mt-1">Transforma tu hogar</p>
            </div>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-bold text-slate-600">
            <a href="#" className="text-[#74AE2C] border-b-2 border-[#74AE2C] pb-1">Configurador</a>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="bg-white border-t border-slate-100 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <img
              src="/assets/logo.png"
              alt="OK Sofás"
              className="h-6 opacity-80"
            />
            <span className="text-sm text-slate-400 font-medium">
              &copy; {new Date().getFullYear()} OK Sofás. Tecnología AI Avanzada.
            </span>
          </div>
          <div className="flex gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-[#74AE2C] transition-colors">Aviso Legal</a>
            <a href="#" className="hover:text-[#74AE2C] transition-colors">Cookies</a>
            <a href="#" className="hover:text-[#74AE2C] transition-colors">Atención al Cliente</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
