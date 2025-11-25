import type { SVGProps } from 'react';

export function Doctor(props: SVGProps<SVGSVGElement>) {
  return (
    <svg 
        viewBox="0 0 500 450" 
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
      <defs>
        <radialGradient id="grad-hero-bg-orange" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" style={{ stopColor: '#078554', stopOpacity: 0.1 }} />
          <stop offset="100%" style={{ stopColor: '#078554', stopOpacity: 0 }} />
        </radialGradient>
        <filter id="hero-glow-orange" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="15" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background shape */}
      <circle cx="250" cy="225" r="220" fill="url(#grad-hero-bg-orange)" filter="url(#hero-glow-orange)" />

      {/* Doctor Character */}
      <g transform="translate(150, 90)">
        {/* Torso */}
        <path d="M 100 80 C 130 80 140 110 140 130 L 140 220 H -40 L -40 130 C -40 110 -30 80 0 80 H 100 Z" fill="#FFFFFF" stroke="#E3E5E8" strokeWidth="2" />
        {/* Lab Coat Lapels */}
        <path d="M 50 80 L 30 140 H 70 L 50 80 Z" fill="#E3E5E8" stroke="#E3E5E8" strokeWidth="1.5" />
        <path d="M 40 220 L 40 240 M 60 220 L 60 240" stroke="#E3E5E8" strokeWidth="2" />

        {/* Head */}
        <circle cx="50" cy="30" r="45" fill="#f4d4be" stroke="#E3E5E8" strokeWidth="2"/>
        
        {/* Hair */}
        <path d="M 5,20 C -10,-10 110,-10 95,20 C 100,50 80,60 50,60 C 20,60 0,50 5,20 Z" fill="#4a3f35" />

        {/* Eyes and smile */}
        <circle cx="35" cy="30" r="4" fill="#4a3f35" />
        <circle cx="65" cy="30" r="4" fill="#4a3f35" />
        <path d="M 40 50 Q 50 58, 60 50" fill="none" stroke="#4a3f35" strokeWidth="2.5" strokeLinecap="round" />

        {/* Stethoscope */}
        <g transform="translate(0, 10)" stroke="#078554" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M 0 80 C 0 110, 100 110, 100 80" />
            <path d="M 0 80 C -20 60, -20 30, 0 20" />
            <path d="M 100 80 C 120 60, 120 30, 100 20" />
            <circle cx="0" cy="17" r="5" fill="#078554" stroke="none" />
            <circle cx="100" cy="17" r="5" fill="#078554" stroke="none" />
            <path d="M 50 110 V 130" />
            <circle cx="50" cy="140" r="10" fill="#FFFFFF" strokeWidth="3" />
            <circle cx="50"cy="140" r="5" fill="#078554" stroke="none" />
        </g>
      </g>
      
      {/* Floating UI Card 1 */}
      <g transform="translate(300, 220) rotate(8)">
        <rect x="0" y="0" width="160" height="180" rx="15" fill="#FFFFFF" stroke="#E3E5E8" strokeWidth="1" className="shadow-lg" filter="drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1))" />
        <rect x="15" y="20" width="80" height="10" rx="5" fill="#13A56A" />
        <rect x="15" y="45" width="130" height="8" rx="4" fill="#E3E5E8" />
        <rect x="15" y="60" width="130" height="8" rx="4" fill="#E3E5E8" />
        <rect x="15" y="90" width="40" height="40" rx="8" fill="#078554" fillOpacity="0.1" />
        <rect x="65" y="90" width="40" height="40" rx="8" fill="#E3E5E8" />
        <rect x="15" y="145" width="130" height="15" rx="7.5" fill="#13A56A" fillOpacity="0.2" />
      </g>
      
      {/* Floating Icon 2 */}
       <g transform="translate(50, 150) rotate(-15)">
         <circle cx="0" cy="0" r="30" fill="#FFFFFF" filter="drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1))" />
         <path d="M-10,0 a 12,12 0 1,0 20,0 a 10,10 0 1,0 -20,0" fill="#078554" fillOpacity="0.2" />
         <path d="M -8 0 L 0 8 L 8 0" stroke="#078554" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>

       {/* Floating Icon 3 - Changed from Cross to Tick */}
       <g transform="translate(420, 120) rotate(20)">
         <circle cx="0" cy="0" r="25" fill="#FFFFFF" filter="drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1))" />
         <path d="M -10 -2 L 0 8 L 12 -5" stroke="#078554" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

