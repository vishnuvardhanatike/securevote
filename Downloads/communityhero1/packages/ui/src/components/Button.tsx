import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
  className?: string;
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const baseStyle = "px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-300",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-300",
    danger: "bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-300"
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
