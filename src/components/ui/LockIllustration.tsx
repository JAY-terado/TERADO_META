import React from 'react';

interface LockIllustrationProps {
  isMobile?: boolean;
}

export const LockIllustration: React.FC<LockIllustrationProps> = ({ isMobile = false }) => {
  if (isMobile) {
    return (
      <div className="relative w-full aspect-square flex items-center justify-center select-none pointer-events-none">
        <style>{`
          @keyframes floatShieldMobile {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-5px);
            }
          }

          @keyframes orbitMobileCW {
            0% {
              stroke-dashoffset: 400;
            }
            100% {
              stroke-dashoffset: 0;
            }
          }

          @keyframes orbitMobileCCW {
            0% {
              stroke-dashoffset: -400;
            }
            100% {
              stroke-dashoffset: 0;
            }
          }

          @keyframes particleOrbitMobile1 {
            0% { offset-distance: 0%; }
            100% { offset-distance: 100%; }
          }

          @keyframes particleOrbitMobile2 {
            0% { offset-distance: 100%; }
            100% { offset-distance: 0%; }
          }

          .anim-float-shield-mobile {
            animation: floatShieldMobile 4s ease-in-out infinite;
            transform-origin: center;
          }

          .anim-orbit-mobile-cw {
            stroke-dasharray: 80 160;
            animation: orbitMobileCW 6s linear infinite;
          }

          .anim-orbit-mobile-ccw {
            stroke-dasharray: 90 150;
            animation: orbitMobileCCW 7.5s linear infinite;
          }

          .anim-particle-mobile-1 {
            offset-path: path('M 15,100 A 85,16 15 1 1 185,100 A 85,16 15 1 1 15,100');
            animation: particleOrbitMobile1 5.5s linear infinite;
          }

          .anim-particle-mobile-2 {
            offset-path: path('M 20,100 A 80,18 -15 1 1 180,100 A 80,18 -15 1 1 20,100');
            animation: particleOrbitMobile2 7s linear infinite;
          }
        `}</style>

        <svg
          viewBox="0 0 200 200"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Radial Glow Gradient */}
            <radialGradient id="bgGlowMobile" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.55" />
              <stop offset="65%" stopColor="#1E3A8A" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
            </radialGradient>

            {/* Shield Fill Gradient */}
            <linearGradient id="shieldFillMobile" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#2563EB" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.8" />
            </linearGradient>

            {/* Lock Gradient */}
            <linearGradient id="lockGradMobile" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>

            {/* Glow Filters */}
            <filter id="neonGlowBlueMobile" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="neonGlowCyanMobile" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ambient Radial Background Glow */}
          <circle cx="100" cy="100" r="90" fill="url(#bgGlowMobile)" />

          {/* --- ORBITING RINGS --- */}
          {/* Tilted Outer Orbit Ring 1 */}
          <ellipse
            cx="100"
            cy="100"
            rx="85"
            ry="16"
            fill="none"
            stroke="rgba(56, 189, 248, 0.2)"
            strokeWidth="1.5"
            transform="rotate(15 100 100)"
          />
          <ellipse
            cx="100"
            cy="100"
            rx="85"
            ry="16"
            fill="none"
            stroke="#06B6D4"
            strokeWidth="2.5"
            className="anim-orbit-mobile-cw"
            filter="url(#neonGlowBlueMobile)"
            transform="rotate(15 100 100)"
          />

          {/* Tilted Outer Orbit Ring 2 */}
          <ellipse
            cx="100"
            cy="100"
            rx="80"
            ry="18"
            fill="none"
            stroke="rgba(29, 78, 216, 0.2)"
            strokeWidth="1.5"
            transform="rotate(-15 100 100)"
          />
          <ellipse
            cx="100"
            cy="100"
            rx="80"
            ry="18"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2.5"
            className="anim-orbit-mobile-ccw"
            filter="url(#neonGlowBlueMobile)"
            transform="rotate(-15 100 100)"
          />

          {/* --- SHIELD & LOCK (FLOATING GROUP - SCALED & CENTERED) --- */}
          <g className="anim-float-shield-mobile">
            <g transform="translate(100, 100) scale(0.9) translate(-200, -177.5)">
              {/* Back Shield Shadow */}
              <path
                d="M 200,90 Q 255,90 265,145 Q 265,225 200,265 Q 135,225 135,145 Q 145,90 200,90 Z"
                fill="#020617"
                opacity="0.6"
                transform="translate(0, 5)"
              />

              {/* Translucent Shield */}
              <path
                d="M 200,90 Q 255,90 265,145 Q 265,225 200,265 Q 135,225 135,145 Q 145,90 200,90 Z"
                fill="url(#shieldFillMobile)"
                stroke="#60A5FA"
                strokeWidth="3.5"
                filter="url(#neonGlowBlueMobile)"
              />

              {/* Inner Shield Overlay Border */}
              <path
                d="M 200,102 Q 243,102 251,146 Q 251,211 200,247 Q 149,211 149,146 Q 157,102 200,102 Z"
                fill="none"
                stroke="#93C5FD"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                opacity="0.75"
              />

              {/* --- LOCK BODY --- */}
              {/* Shackle (Lock Arch) */}
              <path
                d="M 172,168 V 144 A 28,28 0 0,1 228,144 V 168"
                fill="none"
                stroke="url(#lockGradMobile)"
                strokeWidth="7.5"
                strokeLinecap="round"
                filter="url(#neonGlowBlueMobile)"
              />

              {/* Padlock Body */}
              <rect
                x="162"
                y="168"
                width="76"
                height="56"
                rx="12"
                fill="url(#lockGradMobile)"
                stroke="#E0F2FE"
                strokeWidth="1"
                filter="url(#neonGlowBlueMobile)"
              />

              {/* Keyhole Glow Outer */}
              <circle cx="200" cy="192" r="7" fill="#0284C7" opacity="0.7" />

              {/* Keyhole Core */}
              <path
                d="M 200,187 A 4,4 0 0,0 197,194 L 195,202 H 205 L 203,194 A 4,4 0 0,0 200,187 Z"
                fill="#E0F2FE"
              />
            </g>
          </g>

          {/* --- ORBITING NEON PARTICLES --- */}
          {/* Particle 1 */}
          <circle r="4.5" fill="#38BDF8" filter="url(#neonGlowCyanMobile)" className="anim-particle-mobile-1" />

          {/* Particle 2 */}
          <circle r="3.5" fill="#60A5FA" filter="url(#neonGlowBlueMobile)" className="anim-particle-mobile-2" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-square flex items-center justify-center select-none pointer-events-none">
      <style>{`
        @keyframes floatShield {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes orbitCW {
          0% {
            stroke-dashoffset: 600;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes orbitCCW {
          0% {
            stroke-dashoffset: -600;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes pulseGlowRing {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.02);
          }
        }

        @keyframes particleOrbit1 {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }

        @keyframes particleOrbit2 {
          0% { offset-distance: 100%; }
          100% { offset-distance: 0%; }
        }

        .anim-float-shield {
          animation: floatShield 4.5s ease-in-out infinite;
          transform-origin: center;
        }

        .anim-orbit-cw {
          stroke-dasharray: 100 200;
          animation: orbitCW 8s linear infinite;
        }

        .anim-orbit-ccw {
          stroke-dasharray: 120 180;
          animation: orbitCCW 10s linear infinite;
        }

        .anim-pulse-glow {
          animation: pulseGlowRing 3s ease-in-out infinite;
          transform-origin: 200px 315px;
        }

        .anim-particle-1 {
          offset-path: path('M 30,200 A 170,25 15 1 1 370,200 A 170,25 15 1 1 30,200');
          animation: particleOrbit1 7s linear infinite;
        }

        .anim-particle-2 {
          offset-path: path('M 35,210 A 165,30 -15 1 1 365,210 A 165,30 -15 1 1 35,210');
          animation: particleOrbit2 9s linear infinite;
        }

        .anim-particle-3 {
          offset-path: path('M 100,315 A 100,18 0 1 1 300,315 A 100,18 0 1 1 100,315');
          animation: particleOrbit1 5s linear infinite;
        }
      `}</style>

      <svg
        viewBox="0 0 400 400"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Radial Glow Gradient */}
          <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#1E3A8A" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
          </radialGradient>

          {/* Shield Fill Gradient */}
          <linearGradient id="shieldFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#2563EB" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.75" />
          </linearGradient>

          {/* Pedestal Fill Gradient */}
          <linearGradient id="pedestalFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#0B1329" />
          </linearGradient>

          {/* Lock Gold Gradient */}
          <linearGradient id="lockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="neonGlowBlue" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="neonGlowCyan" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Radial Background Glow */}
        <circle cx="200" cy="200" r="180" fill="url(#bgGlow)" />

        {/* --- ORBITING RINGS --- */}
        {/* Tilted Outer Orbit Ring 1 */}
        <ellipse
          cx="200"
          cy="200"
          rx="170"
          ry="25"
          fill="none"
          stroke="rgba(56, 189, 248, 0.15)"
          strokeWidth="1.5"
          transform="rotate(15 200 200)"
        />
        <ellipse
          cx="200"
          cy="200"
          rx="170"
          ry="25"
          fill="none"
          stroke="#06B6D4"
          strokeWidth="2"
          className="anim-orbit-cw"
          filter="url(#neonGlowBlue)"
          transform="rotate(15 200 200)"
        />

        {/* Tilted Outer Orbit Ring 2 */}
        <ellipse
          cx="200"
          cy="200"
          rx="165"
          ry="30"
          fill="none"
          stroke="rgba(29, 78, 216, 0.15)"
          strokeWidth="1.5"
          transform="rotate(-15 200 200)"
        />
        <ellipse
          cx="200"
          cy="200"
          rx="165"
          ry="30"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
          className="anim-orbit-ccw"
          filter="url(#neonGlowBlue)"
          transform="rotate(-15 200 200)"
        />

        {/* --- PEDESTAL BASE --- */}
        {/* Shadow under pedestal */}
        <ellipse cx="200" cy="335" rx="130" ry="25" fill="#020617" opacity="0.8" />

        {/* Pedestal Outer Rim */}
        <ellipse cx="200" cy="325" rx="125" ry="32" fill="url(#pedestalFill)" stroke="#1D4ED8" strokeWidth="2.5" />

        {/* Pedestal Core Platfrom */}
        <ellipse cx="200" cy="315" rx="112" ry="24" fill="#0F172A" stroke="#2563EB" strokeWidth="1.5" />

        {/* Pedestal Top Glowing Ring */}
        <ellipse
          cx="200"
          cy="312"
          rx="102"
          ry="19"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="2.5"
          filter="url(#neonGlowCyan)"
          className="anim-pulse-glow"
        />

        {/* --- SHIELD & LOCK (FLOATING GROUP) --- */}
        <g className="anim-float-shield">
          {/* Back Shield Shadow */}
          <path
            d="M 200,90 Q 255,90 265,145 Q 265,225 200,265 Q 135,225 135,145 Q 145,90 200,90 Z"
            fill="#020617"
            opacity="0.5"
            transform="translate(0, 5)"
          />

          {/* Translucent Shield */}
          <path
            d="M 200,90 Q 255,90 265,145 Q 265,225 200,265 Q 135,225 135,145 Q 145,90 200,90 Z"
            fill="url(#shieldFill)"
            stroke="#60A5FA"
            strokeWidth="3.5"
            filter="url(#neonGlowBlue)"
          />

          {/* Inner Shield Overlay Border */}
          <path
            d="M 200,102 Q 243,102 251,146 Q 251,211 200,247 Q 149,211 149,146 Q 157,102 200,102 Z"
            fill="none"
            stroke="#93C5FD"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.6"
          />

          {/* --- LOCK BODY --- */}
          {/* Shackle (Lock Arch) */}
          <path
            d="M 172,168 V 144 A 28,28 0 0,1 228,144 V 168"
            fill="none"
            stroke="url(#lockGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            filter="url(#neonGlowBlue)"
          />

          {/* Padlock Body */}
          <rect
            x="162"
            y="168"
            width="76"
            height="56"
            rx="12"
            fill="url(#lockGrad)"
            stroke="#E0F2FE"
            strokeWidth="1"
            filter="url(#neonGlowBlue)"
          />

          {/* Keyhole Glow Outer */}
          <circle cx="200" cy="192" r="7" fill="#0284C7" opacity="0.6" />

          {/* Keyhole Core */}
          <path
            d="M 200,187 A 4,4 0 0,0 197,194 L 195,202 H 205 L 203,194 A 4,4 0 0,0 200,187 Z"
            fill="#E0F2FE"
          />
        </g>

        {/* --- ORBITING NEON PARTICLES --- */}
        {/* Particle 1 */}
        <circle r="4.5" fill="#38BDF8" filter="url(#neonGlowCyan)" className="anim-particle-1" />

        {/* Particle 2 */}
        <circle r="3.5" fill="#60A5FA" filter="url(#neonGlowBlue)" className="anim-particle-2" />

        {/* Particle 3 (Orbiting Close to Pedestal) */}
        <circle r="2.5" fill="#06B6D4" filter="url(#neonGlowCyan)" className="anim-particle-3" />
      </svg>
    </div>
  );
};

