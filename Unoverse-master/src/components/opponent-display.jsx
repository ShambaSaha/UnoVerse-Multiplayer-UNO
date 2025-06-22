"use client";

import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

export function OpponentDisplay({ player, isCurrentTurn }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Card
        className={cn(
          "p-2 w-32 transition-all duration-300",
          isCurrentTurn ? "bg-accent shadow-2xl scale-110" : "bg-card"
        )}
      >
        <CardContent className="p-2 flex flex-col items-center gap-2">
          <div className="relative">
            <Image
              src={`https://placehold.co/80x80.png`}
              alt={player.name}
              width={64}
              height={64}
              className="rounded-full border-2 border-primary"
              data-ai-hint="avatar person"
            />
            {player.isHost && (
              <Crown className="absolute -top-1 -right-1 h-5 w-5 text-yellow-400 fill-current" />
            )}
          </div>
          <p className="font-semibold text-center truncate w-full">{player.name}</p>
          <div className="text-sm text-muted-foreground font-bold">
            {player.cards.length} Card{player.cards.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>
      <div className="flex -space-x-3">
        {Array.from({ length: Math.min(player.cards.length, 5) }).map((_, i) => (
          <div
            key={i}
            className="w-8 h-12 bg-zinc-700 rounded-md border-2 border-white shadow-md"
            style={{ transform: `rotate(${i * 5 - 10}deg)` }}
          ></div>
        ))}
      </div>
    </div>
  );
}
