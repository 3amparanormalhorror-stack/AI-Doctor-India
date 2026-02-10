import React from 'react';
import { Gender } from '../types';

interface AvatarProps {
  gender: Gender;
  isSpeaking: boolean;
  className?: string;
}

const CaduceusLogo: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => (
  <svg viewBox="0 0 512 512" className={`w-full h-full p-8 transition-all duration-700 ${isSpeaking ? 'scale-110' : 'scale-100'}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logo-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#b91c1c" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    {/* "DOCTOR" Text Arch */}
    <path id="textPath" d="M100,200 Q256,50 412,200" fill="transparent" />
    <text className="font-black" fill="#ef4444" fontSize="64" style={{ filter: isSpeaking ? 'url(#glow)' : 'none' }}>
      <textPath href="#textPath" startOffset="50%" textAnchor="middle">DOCTOR</textPath>
    </text>

    <g style={{ filter: isSpeaking ? 'url(#glow)' : 'none' }}>
      {/* Central Staff */}
      <rect x="246" y="140" width="20" height="320" rx="10" fill="url(#logo-grad)" />
      <circle cx="256" cy="130" r="25" fill="url(#logo-grad)" />

      {/* Wings */}
      <path d="M256,160 C180,160 80,100 40,180 C80,240 200,220 256,210" fill="url(#logo-grad)" />
      <path d="M256,160 C332,160 432,100 472,180 C432,240 312,220 256,210" fill="url(#logo-grad)" />
      
      {/* Snakes */}
      <path d="M256,430 C180,430 180,330 256,330 C332,330 332,230 256,230" stroke="url(#logo-grad)" strokeWidth="15" strokeLinecap="round" />
      <path d="M256,430 C332,430 332,330 256,330 C180,330 180,230 256,230" stroke="url(#logo-grad)" strokeWidth="15" strokeLinecap="round" />
      
      {/* Snake Heads */}
      <circle cx="215" cy="240" r="10" fill="url(#logo-grad)" />
      <circle cx="297" cy="240" r="10" fill="url(#logo-grad)" />
    </g>
  </svg>
);

const Avatar: React.FC<AvatarProps> = ({ gender, isSpeaking, className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Neural Synapse Background */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isSpeaking ? 'opacity-40' : 'opacity-10'}`}>
        <svg viewBox="0 0 200 200" className="w-full h-full animate-[spin_60s_linear_infinite]">
          <defs>
            <linearGradient id="synapse-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[...Array(12)].map((_, i) => (
            <line 
              key={i}
              x1="100" y1="100" 
              x2={100 + 80 * Math.cos(i * Math.PI / 6)} 
              y2={100 + 80 * Math.sin(i * Math.PI / 6)} 
              stroke="url(#synapse-grad)" 
              strokeWidth="0.5"
              className={isSpeaking ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </svg>
      </div>

      {/* Primary Atmospheric Glow */}
      <div className={`absolute inset-0 rounded-full blur-[100px] transition-all duration-[1500ms] ${
        isSpeaking 
          ? 'bg-rose-500/40 scale-150' 
          : 'bg-rose-500/10 scale-100'
      }`} />
      
      {/* Outer Rotating HUD */}
      <div className={`absolute -inset-16 transition-all duration-[2000ms] ${
        isSpeaking ? 'rotate-90 scale-110 opacity-100' : 'rotate-0 scale-90 opacity-0'
      }`}>
        <div className="absolute inset-0 border-[0.5px] border-rose-400/20 rounded-[2.5rem] rotate-45" />
        <div className="absolute inset-0 border-[0.5px] border-indigo-400/20 rounded-[2.5rem] -rotate-45" />
      </div>

      {/* Main Avatar Container */}
      <div className={`relative w-48 h-48 md:w-64 md:h-64 rounded-full border-2 transition-all duration-700 overflow-hidden glass z-10 ${
        isSpeaking 
          ? 'border-rose-400/80 shadow-[0_0_100px_rgba(239,68,68,0.5)]' 
          : 'border-slate-800 shadow-2xl'
      }`}>
        {/* Core Logo Image */}
        <div className="relative w-full h-full flex items-center justify-center bg-slate-950/40">
          <CaduceusLogo isSpeaking={isSpeaking} />
        </div>
        
        {/* Neural Network Scanning Beam */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-rose-400/40 to-transparent h-4 w-full animate-[scanline-fast_1.5s_linear_infinite] pointer-events-none" />
        
        {/* Vocal Light Pillar Overlay */}
        {isSpeaking && (
          <div className="absolute inset-0 bg-gradient-to-t from-rose-500/20 via-transparent to-transparent animate-pulse" />
        )}

        {/* Symmetry Frequency Visualizer */}
        {isSpeaking && (
          <div className="absolute bottom-6 left-0 right-0 flex items-end justify-center gap-1.5 px-10 h-24 pointer-events-none">
            {[...Array(20)].map((_, i) => {
              const distanceToCenter = Math.abs(i - 9.5);
              const heightBase = 100 - (distanceToCenter * 8);
              return (
                <div 
                  key={i}
                  className={`w-1 rounded-full transition-all duration-100 shadow-[0_0_15px_rgba(239,68,68,0.8)] ${
                    i % 2 === 0 ? 'bg-rose-400' : 'bg-indigo-400'
                  }`}
                  style={{
                    height: `${Math.random() * heightBase + 10}%`,
                    animation: `avatar-wave-pro 0.3s ease-in-out infinite alternate ${i * 0.03}s`
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced HUD Brackets */}
      <div className="absolute -inset-12 pointer-events-none z-0">
        <div className={`absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-rose-500/60 rounded-tl-[3rem] transition-all duration-1000 ${
          isSpeaking ? 'translate-x-[-20px] translate-y-[-20px] scale-105' : 'opacity-20 scale-90'
        }`} />
        <div className={`absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-indigo-500/60 rounded-tr-[3rem] transition-all duration-1000 ${
          isSpeaking ? 'translate-x-[20px] translate-y-[-20px] scale-105' : 'opacity-20 scale-90'
        }`} />
        <div className={`absolute bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-rose-500/60 rounded-bl-[3rem] transition-all duration-1000 ${
          isSpeaking ? 'translate-x-[-20px] translate-y-[20px] scale-105' : 'opacity-20 scale-90'
        }`} />
        <div className={`absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-indigo-500/60 rounded-br-[3rem] transition-all duration-1000 ${
          isSpeaking ? 'translate-x-[20px] translate-y-[20px] scale-105' : 'opacity-20 scale-90'
        }`} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes avatar-wave-pro {
          0% { opacity: 0.4; filter: brightness(0.8); }
          100% { opacity: 1; filter: brightness(1.2) drop-shadow(0 0 5px white); }
        }
        @keyframes scanline-fast {
          0% { transform: translateY(-500%); opacity: 0; }
          30% { opacity: 0.8; }
          100% { transform: translateY(1000%); opacity: 0; }
        }
      `}} />
    </div>
  );
};

export default Avatar;
