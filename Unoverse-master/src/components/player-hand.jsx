
"use client";

import { UnoCard } from "./uno-card";

export function PlayerHand({ player, onPlayCard, isCurrentTurn, isCardPlayable }) {
  const cardCount = player.cards.length;
  // Responsive card overlap logic
  const cardWidth = window.innerWidth < 640 ? 80 : 112; // 80px for mobile, 112px for desktop
  const maxHandWidth = window.innerWidth * 0.9; // Hand takes up 90% of screen width
  
  let overlap = 40;
  if (cardCount > 1) {
      const totalCardWidth = cardCount * cardWidth;
      if (totalCardWidth > maxHandWidth) {
          overlap = (totalCardWidth - maxHandWidth) / (cardCount - 1);
      }
  }


  return (
    <div className="flex flex-col items-center gap-2 sm:gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">{player.name}'s Hand</h2>
        <div className="relative flex justify-center items-end h-40 sm:h-48 w-full max-w-xs sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl">
            {player.cards.map((card, index) => {
                const playable = isCurrentTurn && isCardPlayable(card);
                return (
                  <div
                      key={card.id}
                      className="absolute transition-all duration-300 ease-in-out"
                      style={{
                          transform: `translateX(${(index - (cardCount - 1) / 2) * (cardWidth - overlap)}px) translateY(${playable ? '-1rem' : '0'}) rotate(${((index - (cardCount - 1) / 2) * 5)}deg)`,
                          zIndex: index,
                          
                      }}
                  >
                      <UnoCard
                          card={card}
                          onClick={() => playable && onPlayCard(card)}
                          isPlayable={playable}
                      />
                  </div>
                )
            })}
        </div>
    </div>
  );
}
