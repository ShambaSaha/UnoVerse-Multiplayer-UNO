"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { GameBoard } from "@/components/game-board";
import { createLocalGame } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";

function LocalGame() {
  const searchParams = useSearchParams();
  const [gameState, setGameState] = useState(null);

  // Get stable primitive values from searchParams
  const name = searchParams.get("name") || "You";
  const botsParam = searchParams.get("bots") || "3";

  useEffect(() => {
    // This effect now safely runs only when name or botsParam change.
    const parsedBots = parseInt(botsParam, 10);
    const numBots = Math.max(1, Math.min(5, isNaN(parsedBots) ? 3 : parsedBots));
    
    setGameState(createLocalGame(name, numBots));
  }, [name, botsParam]);

  if (!gameState) {
    return <LoadingFallback />;
  }

  return <GameBoard initialGameState={gameState} playerId="player-1" />;
}


function LoadingFallback() {
    return (
        <div className="w-full h-screen bg-background p-4 flex flex-col items-center justify-center gap-8">
            <Skeleton className="w-48 h-12" />
            <div className="flex gap-8">
                <Skeleton className="w-32 h-48" />
                <Skeleton className="w-32 h-48" />
            </div>
             <Skeleton className="w-full max-w-lg h-24" />
        </div>
    )
}


export default function LocalGamePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LocalGame />
    </Suspense>
  );
}
