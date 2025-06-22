"use client";

import { UnoCard } from "./uno-card";
import { AlertTriangle, ChevronsRight, ChevronsLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function GameInfo({ gameState, onDrawCard, isMyTurn }) {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <p className="font-semibold">Draw Pile</p>
          <UnoCard 
            card="facedown" 
            onClick={isMyTurn ? onDrawCard : undefined} 
            className={cn(isMyTurn && "cursor-pointer hover:scale-105 transition-transform", !isMyTurn && "cursor-not-allowed opacity-70")}
          />
          <p className="text-sm text-muted-foreground">{gameState.drawPile.length} cards left</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="font-semibold">Discard Pile</p>
          <UnoCard card={topCard} />
           {topCard.color === "wild" && gameState.chosenColor && (
             <div className="flex items-center gap-2 mt-2">
                <p className="text-sm font-semibold">Color:</p>
                <div className={cn("w-6 h-6 rounded-full border-2", {
                    "bg-red-500": gameState.chosenColor === 'red',
                    "bg-blue-500": gameState.chosenColor === 'blue',
                    "bg-green-500": gameState.chosenColor === 'green',
                    "bg-yellow-400": gameState.chosenColor === 'yellow',
                })}></div>
             </div>
           )}
        </div>
      </div>
      <div className="flex items-center gap-4 p-2 rounded-lg bg-card text-card-foreground">
        {gameState.isClockwise ? <ChevronsRight className="w-6 h-6"/> : <ChevronsLeft className="w-6 h-6"/>}
        <p className="font-bold text-lg">
          Turn: {gameState.players[gameState.currentPlayerIndex].name}
        </p>
        {gameState.players[gameState.currentPlayerIndex].cards.length === 1 && (
             <div className="flex items-center gap-1 text-primary animate-pulse">
                <AlertTriangle className="w-5 h-5"/>
                <span className="font-bold">UNO!</span>
            </div>
        )}
      </div>
    </div>
  );
}
