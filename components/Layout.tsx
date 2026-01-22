
import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF5]">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://oksofas.es/wp-content/uploads/2025/01/oksofas-logo-png.png.webp"
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
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <div className="flex items-center gap-4">
              <img
                src="https://oksofas.es/wp-content/uploads/2025/01/oksofas-logo-png.png.webp"
                alt="OK Sofás"
                className="h-6 opacity-80"
              />
              <span className="text-sm text-slate-400 font-medium">
                &copy; {new Date().getFullYear()} OK Sofás.
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
            <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-full shadow-lg hover:scale-105 transition-transform cursor-pointer">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Desarrollado con 🤍 por</span>
              <img
                src="https://digency.es/wp-content/uploads/2022/09/Logo_blanco.png.webp"
                alt="Digency"
                className="h-4 w-auto brightness-200"
              />
            </div>
          </div>
          <div className="flex gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-[#74AE2C] transition-colors">Aviso Legal</a>
            <a href="#" className="hover:text-[#74AE2C] transition-colors">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
