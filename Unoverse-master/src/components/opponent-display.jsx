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
          "p-1 sm:p-2 w-24 md:w-32 transition-all duration-300",
          isCurrentTurn ? "bg-accent shadow-2xl scale-110" : "bg-card"
        )}
      >
        <CardContent className="p-1 sm:p-2 flex flex-col items-center gap-2">
          <div className="relative">
            <Image
              src={"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"}
              alt={player.name}
              width={48}
              height={48}
              className="rounded-full border-2 border-primary bg-muted p-1 text-card-foreground"
            />
            {player.isHost && (
              <Crown className="absolute -top-1 -right-1 h-5 w-5 text-yellow-400 fill-current" />
            )}
          </div>
          <p className="font-semibold text-center truncate w-full text-sm md:text-base">{player.name}</p>
          <div className="text-xs md:text-sm text-muted-foreground font-bold">
            {player.cards.length} Card{player.cards.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>
      <div className="flex -space-x-4">
        {Array.from({ length: Math.min(player.cards.length, 5) }).map((_, i) => (
          <div
            key={i}
            className="w-6 h-9 sm:w-8 sm:h-12 bg-zinc-700 rounded-md border-2 border-white shadow-md"
            style={{ transform: `rotate(${i * 5 - 10}deg)` }}
          ></div>
        ))}
      </div>
    </div>
  );
}
