
"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { GameBoard } from "@/components/game-board";
import { createLocalGame } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";

function LocalGame() {
  const searchParams = useSearchParams();
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    const name = searchParams.get("name") || "You";
    const bots = parseInt(searchParams.get("bots") || "3", 10);
    const numBots = Math.max(1, Math.min(5, bots));
    
    // Generate game state only on the client side to prevent hydration mismatch
    setGameState(createLocalGame(name, numBots));
  }, [searchParams]);

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
