"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = "",
  size = "md"
}: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur effect */}
      <div 
        className="absolute inset-0 bg-sage-900/30 backdrop-blur-md transition-all duration-300 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={cn(
        "relative glass-card rounded-3xl shadow-glass max-h-[90vh] overflow-hidden transform transition-all duration-300 animate-scale-in w-full",
        sizeClasses[size],
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sage-200/50">
          <h2 className="text-xl font-semibold text-foreground">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-sage-100/50 hover-lift"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
}
