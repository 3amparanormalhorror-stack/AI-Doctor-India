import React from 'react';

export const COLORS = {
  primary: '#ef4444', // Medical Red (Updated to match logo)
  secondary: '#22c55e', // Healing Green
  accent: '#f59e0b', // Warning Amber
  danger: '#ef4444', // Emergency Red
  bgLight: '#f8fafc',
  bgDark: '#0f172a'
};

const CaduceusIcon = () => (
  <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="246" y="140" width="20" height="320" rx="10" fill="currentColor" />
    <circle cx="256" cy="130" r="25" fill="currentColor" />
    <path d="M256,160 C180,160 80,100 40,180 C80,240 200,220 256,210" fill="currentColor" />
    <path d="M256,160 C332,160 432,100 472,180 C432,240 312,220 256,210" fill="currentColor" />
    <path d="M256,430 C180,430 180,330 256,330 C332,330 332,230 256,230" stroke="currentColor" strokeWidth="15" strokeLinecap="round" />
    <path d="M256,430 C332,430 332,330 256,330 C180,330 180,230 256,230" stroke="currentColor" strokeWidth="15" strokeLinecap="round" />
  </svg>
);

export const Icons = {
  DoctorMale: () => <CaduceusIcon />,
  DoctorFemale: () => <CaduceusIcon />,
  Emergency: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
};
