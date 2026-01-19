import React, { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { X, Minimize, Maximize } from "lucide-react";

// === Button ===
interface RetroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function RetroButton({ className, active, children, ...props }: RetroButtonProps) {
  return (
    <button
      className={cn(
        "px-4 py-1 text-sm font-sans select-none",
        "focus:outline-none focus:ring-1 focus:ring-black focus:ring-offset-1 focus:ring-offset-white",
        active ? "bevel-down bg-gray-200" : "bevel-up hover:bg-gray-200 active:bevel-down active:bg-gray-300",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// === Window Frame ===
interface RetroWindowProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  isActive?: boolean;
}

export function RetroWindow({ title, icon, onClose, children, className, isActive = true, ...props }: RetroWindowProps) {
  return (
    <div 
      className={cn(
        "bevel-window flex flex-col shadow-xl", 
        className
      )}
      {...props}
    >
      {/* Title Bar */}
      <div className={cn(
        "flex items-center justify-between px-1 py-0.5 mb-1",
        isActive ? "bg-[#000080] text-white" : "bg-[#808080] text-[#c0c0c0]"
      )}>
        <div className="flex items-center gap-2 font-bold text-sm tracking-wide select-none">
          {icon && <span className="w-4 h-4">{icon}</span>}
          <span>{title}</span>
        </div>
        <div className="flex gap-0.5">
           <button className="w-4 h-4 bg-[#c0c0c0] bevel-up flex items-center justify-center active:bevel-down">
             <Minimize className="w-3 h-3 text-black" />
           </button>
           <button className="w-4 h-4 bg-[#c0c0c0] bevel-up flex items-center justify-center active:bevel-down">
             <Maximize className="w-3 h-3 text-black" />
           </button>
           <button 
            onClick={onClose}
            className="w-4 h-4 bg-[#c0c0c0] bevel-up flex items-center justify-center ml-1 active:bevel-down"
           >
             <X className="w-3 h-3 text-black" />
           </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-h-0 bg-[#c0c0c0] p-1 flex flex-col gap-1">
        {children}
      </div>
    </div>
  );
}

// === Input ===
interface RetroInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function RetroInput({ className, ...props }: RetroInputProps) {
  return (
    <input 
      className={cn(
        "bevel-down px-2 py-1 outline-none font-mono text-sm",
        "focus:bg-white bg-white text-black",
        className
      )}
      {...props}
    />
  );
}

// === Text Area (Chat Display) ===
export function RetroDisplay({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn(
      "bevel-down bg-black text-white p-1 overflow-y-auto font-mono text-sm leading-tight",
      "scrollbar-thin",
      className
    )}>
      {children}
    </div>
  );
}
