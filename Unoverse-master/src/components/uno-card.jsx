
"use client";

import { cn } from "@/lib/utils";
import React from "react";

// SVG Icons for special cards
const ReverseIcon = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 3h6v6" />
    <path d="M21 3l-9.5 9.5" />
    <path d="M9 21H3v-6" />
    <path d="M3 21l9.5-9.5" />
  </svg>
);

const SkipIcon = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

const Draw2Icon = ({ className }) => (
  <span className={cn("font-bold", className)}>+2</span>
);

const WildIcon = ({ className }) => (
   <div className={cn("grid grid-cols-2 w-full h-full", className)}>
    <div className="bg-blue-500"></div>
    <div className="bg-red-500"></div>
    <div className="bg-yellow-400"></div>
    <div className="bg-green-500"></div>
  </div>
);

const Draw4Icon = ({ className }) => (
  <span className={cn("font-black text-white", className)}>+4</span>
);


export function UnoCard({ card, className, isPlayable, ...props }) {
  if (card === "facedown") {
    return (
      <div
        className={cn(
          "w-20 h-32 sm:w-24 sm:h-36 md:w-28 md:h-44 bg-zinc-800 rounded-lg sm:rounded-xl p-2 flex items-center justify-center border-2 sm:border-4 border-zinc-300 shadow-lg",
          className
        )}
        {...props}
      >
        <h1 className="text-white font-bold text-2xl sm:text-3xl transform -rotate-12 select-none">UNO</h1>
      </div>
    );
  }

  const cardColorMap = {
    red: "bg-red-500",
    yellow: "bg-yellow-400",
    green: "bg-green-500",
    blue: "bg-blue-500",
    wild: "bg-zinc-800",
  };

  const renderValue = (isCenter) => {
    const size = isCenter ? "w-8 h-8 sm:w-10 sm:h-10" : "w-4 h-4 sm:w-5 sm:h-5";
    const iconClassName = `text-white ${size}`;
    const textClassName = `font-bold text-white ${isCenter ? 'text-4xl sm:text-5xl' : 'text-lg sm:text-xl'}`;

    switch (card.value) {
      case "skip": return <SkipIcon className={iconClassName} />;
      case "reverse": return <ReverseIcon className={iconClassName} />;
      case "draw2": return <Draw2Icon className={textClassName} />;
      case "wild": return <WildIcon className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden"/>;
      case "wild_draw4": return <Draw4Icon className={textClassName} />;
      default: return <span className={textClassName}>{card.value}</span>;
    }
  };

  const isWild = card.color === "wild";

  return (
    <div
      className={cn(
        "w-20 h-32 sm:w-24 sm:h-36 md:w-28 md:h-44 rounded-lg sm:rounded-xl p-1 sm:p-1.5 bg-white shadow-lg transition-all duration-300",
        isPlayable && "cursor-pointer hover:shadow-2xl hover:scale-105",
        isPlayable === false && "opacity-70 cursor-not-allowed",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "w-full h-full rounded-md sm:rounded-lg flex items-center justify-center relative overflow-hidden",
          cardColorMap[card.color]
        )}
      >
         {!isWild && (
          <>
            <div className="absolute top-1 left-1 sm:top-2 sm:left-2">{renderValue(false)}</div>
            <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 transform rotate-180">{renderValue(false)}</div>
          </>
        )}
        
        <div className="absolute w-2/3 h-2/3 bg-white/80 rounded-full blur-sm opacity-50 transform -rotate-12"></div>
        <div className="relative z-10 flex items-center justify-center">
          {renderValue(true)}
        </div>

        {isWild && card.value === "wild_draw4" &&
            <div className="absolute bottom-2 right-2 flex gap-0.5">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-blue-500 border border-white/50"></div>
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-red-500 border border-white/50 -translate-y-0.5 sm:-translate-y-1"></div>
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-yellow-400 border border-white/50"></div>
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm bg-green-500 border border-white/50 -translate-y-0.5 sm:-translate-y-1"></div>
            </div>
        }
      </div>
    </div>
  );
}
