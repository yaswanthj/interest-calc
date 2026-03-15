
import React from 'react';

interface LogoProps {
  className?: string;
  themeColor?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "", themeColor = "#d97706" }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        <rect width="100" height="100" rx="20" fill="white" />
        <path
          d="M25 35L42 70L59 35"
          stroke={themeColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M75 40C75 35 70 30 65 30C60 30 55 35 55 40C55 45 60 50 65 50C70 50 75 55 75 60C75 65 70 70 65 70C60 70 55 65 55 60"
          stroke={themeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="text-xl font-black tracking-tighter text-white heading-font">VS</span>
        <span className="text-[10px] font-bold tracking-[0.2em] text-white/90">APPS</span>
      </div>
    </div>
  );
};

export default Logo;
