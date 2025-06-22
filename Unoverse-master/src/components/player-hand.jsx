"use client";

import { UnoCard } from "./uno-card";

export function PlayerHand({ player, onPlayCard, isCurrentTurn, isCardPlayable }) {
  const cardCount = player.cards.length;
  const cardWidth = 112; // 28 * 4 from w-28
  const overlap = cardCount > 8 ? (cardWidth * cardCount - 600) / (cardCount - 1) : 40;

  return (
    <div className="flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold">{player.name}'s Hand</h2>
        <div className="flex justify-center items-end h-48 w-full max-w-screen-lg">
            {player.cards.map((card, index) => {
                const playable = isCurrentTurn && isCardPlayable(card);
                return (
                  <div
                      key={card.id}
                      className="absolute transition-transform duration-300 ease-in-out"
                      style={{
                          transform: `translateX(${(index - (cardCount - 1) / 2) * (cardWidth - overlap)}px) rotate(${((index - (cardCount - 1) / 2) * 5)}deg)`,
                          zIndex: index
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
