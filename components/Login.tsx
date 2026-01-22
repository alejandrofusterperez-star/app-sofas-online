
import React, { useState, useEffect } from 'react';

const PHRASES = [
    "Tu casa, tu refugio de paz.",
    "El sofá perfecto para tus mejores momentos.",
    "Diseño que inspira, confort que enamora.",
    "Transforma cada rincón con estilo propio.",
    "La elegancia se siente en cada textura.",
    "Donde el confort se encuentra con la tecnología."
];

const BACKGROUNDS = [
    "/assets/login/bg1.jpg",
    "/assets/login/bg2.jpg",
    "/assets/login/bg3.jpg"
];

interface LoginProps {
    onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [index, setIndex] = useState(0);
    const [fade, setFade] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setIndex((prev) => (prev + 1) % PHRASES.length);
                setFade(true);
            }, 500);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === 'alejandro' && password === 'Sofas123.') {
            onLogin();
        } else {
            setError('Credenciales incorrectas. Inténtalo de nuevo.');
        }
    };

    const currentBg = BACKGROUNDS[index % BACKGROUNDS.length];

    return (
        <div className="min-h-screen w-full flex overflow-hidden font-sans bg-white">
            {/* Lado Izquierdo: Branding, Frases y Fondo Dinámico */}
            <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-20 overflow-hidden">
                {/* Imágenes de fondo con transición */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={currentBg}
                        alt="Background"
                        className={`w-full h-full object-cover transition-all duration-1000 ${fade ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {/* Overlay para legibilidad y atmósfera */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px]"></div>
                </div>

                <div className="absolute inset-0 opacity-10 z-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="0.1" />
                    </svg>
                </div>

                <div className="relative z-20 text-white max-w-lg">
                    <img
                        src="/assets/logo.png"
                        alt="OK Sofás"
                        className="h-14 mb-12 drop-shadow-xl"
                    />
                    <div className="h-44">
                        <h2 className={`text-5xl font-black mb-8 transition-all duration-700 uppercase tracking-tighter leading-tight drop-shadow-2xl ${fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            {PHRASES[index]}
                        </h2>
                    </div>
                    <p className="text-lg text-white/90 font-medium leading-relaxed drop-shadow-md text-pretty">
                        Descubre cómo luce la perfección en tu propio hogar con nuestra tecnología exclusiva de visualización virtual.
                    </p>

                    <div className="mt-16 flex gap-3">
                        {BACKGROUNDS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 transition-all duration-500 rounded-full ${i === (index % BACKGROUNDS.length) ? 'w-10 bg-[#74AE2C]' : 'w-4 bg-white/20'}`}
                            ></div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Lado Derecho: Formulario de Login */}
            <div className="w-full lg:w-1/2 bg-[#F8FAF5] flex items-center justify-center p-8 lg:p-24 relative">
                <div className="w-full max-w-md animate-in fade-in slide-in-from-right-12 duration-1000">
                    <div className="lg:hidden mb-12">
                        <img
                            src="/assets/logo.png"
                            alt="OK Sofás"
                            className="h-12"
                        />
                    </div>

                    <div className="mb-10">
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">Bienvenido</h1>
                        <p className="text-slate-500 font-medium">Introduce tus credenciales para acceder</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Usuario</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-[#74AE2C] transition-all font-bold text-slate-700 shadow-sm"
                                placeholder="Tu usuario"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-[#74AE2C] transition-all font-bold text-slate-700 shadow-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 animate-shake">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-[#74AE2C] text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-[#74AE2C]/20 hover:bg-[#639626] hover:-translate-y-1 transition-all active:scale-95 mt-4"
                        >
                            Iniciar sesión
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-slate-100">
                        <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                            Tecnología AI para Ok Sofás
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
