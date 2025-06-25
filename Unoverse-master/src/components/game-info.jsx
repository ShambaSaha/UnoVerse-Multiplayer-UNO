
"use client";

import { UnoCard } from "./uno-card";
import { AlertTriangle, ChevronsRight, ChevronsLeft, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

export function GameInfo({ gameState, onDrawCard, onPassTurn, isMyTurn, hasDrawn, turnTimer }) {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  const [prevDiscardLength, setPrevDiscardLength] = useState(gameState.discardPile.length);
  const [isAnimating, setIsAnimating] = useState(false);
  const pendingDrawAmount = gameState.pendingDrawAmount || 0;

  useEffect(() => {
    if (gameState.discardPile.length > prevDiscardLength) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300); // Match animation duration
      setPrevDiscardLength(gameState.discardPile.length);
      return () => clearTimeout(timer);
    }
  }, [gameState.discardPile.length, prevDiscardLength]);

  return (
    <div className="flex flex-col items-center justify-center gap-2 sm:gap-4">
       {pendingDrawAmount > 0 && (
        <div className="p-2 rounded-lg bg-destructive/20 text-destructive font-bold text-lg animate-pulse">
            DRAW STACK: +{pendingDrawAmount}
        </div>
      )}
      <div className="flex items-start gap-4 sm:gap-8">
        <div className="flex flex-col items-center gap-2">
          <p className="font-semibold">Draw Pile</p>
          <UnoCard 
            card="facedown" 
            onClick={isMyTurn ? onDrawCard : undefined} 
            className={cn(
                isMyTurn && !hasDrawn && pendingDrawAmount === 0 && "cursor-pointer hover:scale-105 transition-transform", 
                (!isMyTurn || hasDrawn || pendingDrawAmount > 0) && "cursor-not-allowed opacity-70"
            )}
          />
          <p className="text-sm text-muted-foreground">{gameState.drawPile.length} cards left</p>
        </div>

        {isMyTurn && hasDrawn && pendingDrawAmount === 0 && (
            <div className="flex flex-col items-center gap-2 self-center">
                <Button onClick={onPassTurn}>Pass Turn</Button>
            </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <p className="font-semibold">Discard Pile</p>
          <UnoCard card={topCard} className={cn(isAnimating && 'animate-card-played')} />
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
        <div className="flex items-center gap-2" title="Game Direction">
            {gameState.isClockwise ? <ChevronsRight className="w-6 h-6"/> : <ChevronsLeft className="w-6 h-6"/>}
        </div>
        <p className="font-bold text-lg">
          Turn: {gameState.players[gameState.currentPlayerIndex].name}
        </p>
        {gameState.players[gameState.currentPlayerIndex].cards.length === 1 && (
             <div className="flex items-center gap-1 text-primary animate-pulse">
                <AlertTriangle className="w-5 h-5"/>
                <span className="font-bold">UNO!</span>
            </div>
        )}
        <div className="flex items-center gap-2 font-mono text-lg" title="Time Remaining">
            <Hourglass className="w-5 h-5"/>
            <span>{turnTimer}</span>
        </div>
      </div>
    </div>
  );
}
