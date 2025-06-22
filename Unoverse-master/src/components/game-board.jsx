
"use client";

import { useState, useEffect, useCallback } from "react";
import { PlayerHand } from "./player-hand";
import { OpponentDisplay } from "./opponent-display";
import { GameInfo } from "./game-info";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "./ui/skeleton";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Pure helper function
const getNextPlayerIndex = (currentIndex, direction, playerCount) => {
    if (direction) { // isClockwise
        return (currentIndex + 1) % playerCount;
    } else {
        return (currentIndex - 1 + playerCount) % playerCount;
    }
};

// Pure function to process a card play
const calculateNextStateAfterPlay = (currentState, card, chosenColor, showToast) => {
    let {
        players,
        currentPlayerIndex,
        isClockwise,
        drawPile,
    } = currentState;

    const numPlayers = players.length;
    const player = players[currentPlayerIndex];

    const newHand = player.cards.filter(c => c.id !== card.id);
    let newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, cards: newHand };

    let newDrawPile = [...drawPile];
    let newIsClockwise = isClockwise;
    let nextPlayerIndex = currentPlayerIndex;
    
    switch(card.value) {
        case "skip":
            nextPlayerIndex = getNextPlayerIndex(nextPlayerIndex, newIsClockwise, numPlayers);
            break;
        case "reverse":
            newIsClockwise = !newIsClockwise;
            // In a 2-player game, reverse acts like a skip
            if (numPlayers === 2) {
                nextPlayerIndex = getNextPlayerIndex(nextPlayerIndex, newIsClockwise, numPlayers);
            }
            break;
        case "draw2": {
            const victimIndex = getNextPlayerIndex(nextPlayerIndex, newIsClockwise, numPlayers);
            if (newDrawPile.length < 2) {
              showToast({ title: "Draw Pile Low", description: "Not enough cards to draw.", variant: "destructive" });
            } else {
              const victim = newPlayers[victimIndex];
              const cardsToDraw = newDrawPile.splice(newDrawPile.length - 2, 2);
              const victimNewHand = [...victim.cards, ...cardsToDraw];
              newPlayers[victimIndex] = { ...victim, cards: victimNewHand };
            }
            nextPlayerIndex = getNextPlayerIndex(nextPlayerIndex, newIsClockwise, numPlayers);
            break;
        }
        case "wild_draw4": {
            const victimIndex = getNextPlayerIndex(nextPlayerIndex, newIsClockwise, numPlayers);
            if (newDrawPile.length < 4) {
               showToast({ title: "Draw Pile Low", description: "Not enough cards to draw.", variant: "destructive" });
            } else {
              const victim = newPlayers[victimIndex];
              const cardsToDraw = newDrawPile.splice(newDrawPile.length - 4, 4);
              const victimNewHand = [...victim.cards, ...cardsToDraw];
              newPlayers[victimIndex] = { ...victim, cards: victimNewHand };
            }
            nextPlayerIndex = getNextPlayerIndex(nextPlayerIndex, newIsClockwise, numPlayers);
            break;
        }
    }

    const finalNextPlayerIndex = getNextPlayerIndex(nextPlayerIndex, newIsClockwise, numPlayers);

    return {
        ...currentState,
        players: newPlayers,
        discardPile: [...currentState.discardPile, card],
        drawPile: newDrawPile,
        currentPlayerIndex: finalNextPlayerIndex,
        isClockwise: newIsClockwise,
        chosenColor: card.color === 'wild' ? chosenColor : null,
        gameWinner: newHand.length === 0 ? player : currentState.gameWinner,
    };
};

// Pure function to process a card draw
const calculateNextStateAfterDraw = (currentState, showToast) => {
    if (currentState.drawPile.length === 0) {
        showToast({ title: "Draw Pile Empty", description: "No cards left to draw.", variant: "destructive" });
        return {
            ...currentState,
            currentPlayerIndex: getNextPlayerIndex(currentState.currentPlayerIndex, currentState.isClockwise, currentState.players.length),
        };
    }

    const player = currentState.players[currentState.currentPlayerIndex];
    const newCard = currentState.drawPile[currentState.drawPile.length-1];
    const newDrawPile = currentState.drawPile.slice(0, -1);

    const newHand = [...player.cards, newCard];
    const newPlayers = [...currentState.players];
    newPlayers[currentState.currentPlayerIndex] = { ...player, cards: newHand };
    
    // Pass turn to next player after drawing
    return {
        ...currentState,
        players: newPlayers,
        drawPile: newDrawPile,
        currentPlayerIndex: getNextPlayerIndex(currentState.currentPlayerIndex, currentState.isClockwise, currentState.players.length),
    };
};


export function GameBoard({ initialGameState, playerId, isOnline = false }) {
  const [gameState, setGameState] = useState(initialGameState);
  const { toast } = useToast();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCard, setPendingCard] = useState(null);

  // If online, sync state with parent which gets updates from Firestore
  useEffect(() => {
    if (isOnline) {
      setGameState(initialGameState);
    }
  }, [initialGameState, isOnline]);

  const isCardPlayable = useCallback((card) => {
    if (!gameState || !gameState.discardPile || gameState.discardPile.length === 0) return false;
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const chosenColor = gameState.chosenColor;
    if (card.color === 'wild') return true;
    if (chosenColor) return card.color === chosenColor;
    return card.color === topCard.color || card.value === topCard.value;
  }, [gameState]);

  const updateGameState = async (newGameState) => {
    if (isOnline) {
      const gameRef = doc(db, "games", gameState.id);
      await updateDoc(gameRef, newGameState);
    } else {
      setGameState(newGameState);
    }
  };
  
  const handlePlayCard = (card) => {
    if (gameState.players[gameState.currentPlayerIndex].id !== playerId) {
      toast({ title: "Not your turn!", description: "Please wait for your turn to play.", variant: "destructive" });
      return;
    }

    if (!isCardPlayable(card)) {
        toast({ title: "Invalid Move", description: "You can't play that card.", variant: "destructive" });
        return;
    }
    
    if (card.color === 'wild') {
        setPendingCard(card);
        setShowColorPicker(true);
        return; // Wait for color selection
    }

    const nextState = calculateNextStateAfterPlay(gameState, card, null, toast);
    updateGameState(nextState);
  };
  
  const handleDrawCard = () => {
    if (gameState.players[gameState.currentPlayerIndex].id !== playerId) {
        toast({ title: "Not your turn!", description: "It's not your turn to draw.", variant: "destructive" });
        return;
    };
    const nextState = calculateNextStateAfterDraw(gameState, toast);
    updateGameState(nextState);
  }

  const handleSelectColor = (color) => {
      if(pendingCard) {
          const nextState = calculateNextStateAfterPlay(gameState, pendingCard, color, toast);
          updateGameState(nextState);
      }
      setShowColorPicker(false);
      setPendingCard(null);
  }

  // Effect to handle bot turns
  useEffect(() => {
    // Only run for local games, when it's not the player's turn, and the game is not over.
    if (isOnline || !gameState || gameState.gameWinner || gameState.players[gameState.currentPlayerIndex].id === playerId) {
        return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    const botMoveTimeout = setTimeout(() => {
      // Simple Bot AI Logic
      const playableCards = currentPlayer.cards.filter(card => isCardPlayable(card));

      if (playableCards.length > 0) {
        // Prioritize non-wild cards
        let cardToPlay = playableCards.find(c => c.color !== 'wild') || playableCards[0];
        
        if (cardToPlay.color === 'wild') {
          const colorCounts = {};
          currentPlayer.cards.forEach(c => {
            if (c.color !== 'wild') {
              colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
            }
          });

          const colors = Object.keys(colorCounts);
          let chosenColor = 'red'; // Default
          if (colors.length > 0) {
              chosenColor = colors.reduce((a, b) => (colorCounts[a] ?? 0) > (colorCounts[b] ?? 0) ? a : b);
          } else {
              const allColors = ['red', 'green', 'blue', 'yellow'];
              chosenColor = allColors[Math.floor(Math.random() * 4)];
          }
          const nextState = calculateNextStateAfterPlay(gameState, cardToPlay, chosenColor, toast);
          setGameState(nextState); // Local games directly set state
        } else {
          const nextState = calculateNextStateAfterPlay(gameState, cardToPlay, null, toast);
          setGameState(nextState); // Local games directly set state
        }
      } else {
        const nextState = calculateNextStateAfterDraw(gameState, toast);
        setGameState(nextState); // Local games directly set state
      }
    }, 1500);

    return () => clearTimeout(botMoveTimeout);
  }, [gameState, isOnline, playerId, isCardPlayable, toast]);


  const yourPlayerIndex = gameState.players.findIndex(p => p.id === playerId);
  
  if (yourPlayerIndex === -1) {
    return (
        <div className="w-full h-screen bg-background p-4 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Joining game...</p>
        </div>
    )
  }

  const you = gameState.players[yourPlayerIndex];
  const opponents = gameState.players.filter(p => p.id !== playerId);
  
  const opponentPositions = {
      top: opponents.slice(0, 3),
      left: opponents.slice(3,4),
      right: opponents.slice(4,5),
  }

  const isMyTurn = gameState.players[gameState.currentPlayerIndex].id === you.id;

  return (
    <div className="w-full h-screen bg-background p-4 flex flex-col overflow-hidden">
        {gameState.gameWinner && (
             <AlertDialog open={!!gameState.gameWinner}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-2xl">
                        <Trophy className="text-yellow-400 w-8 h-8"/> Game Over!
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Congratulations, <span className="font-bold text-primary">{gameState.gameWinner.name}</span> has won the game!
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogAction onClick={() => window.location.href = '/'}>Play Again</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
             </AlertDialog>
        )}
        {showColorPicker && (
             <AlertDialog open={showColorPicker}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Choose a Color</AlertDialogTitle>
                    <AlertDialogDescription>
                        You played a Wild card. Select the next color to be played.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-center gap-4 p-4">
                        <Button className="w-20 h-20 bg-red-500 hover:bg-red-600" onClick={() => handleSelectColor('red')}>Red</Button>
                        <Button className="w-20 h-20 bg-yellow-400 hover:bg-yellow-500" onClick={() => handleSelectColor('yellow')}>Yellow</Button>
                        <Button className="w-20 h-20 bg-green-500 hover:bg-green-600" onClick={() => handleSelectColor('green')}>Green</Button>
                        <Button className="w-20 h-20 bg-blue-500 hover:bg-blue-600" onClick={() => handleSelectColor('blue')}>Blue</Button>
                    </div>
                </AlertDialogContent>
             </AlertDialog>
        )}

      <header className="flex-shrink-0 w-full flex justify-around p-4">
        {opponentPositions.top.map((p) => (
          <OpponentDisplay
            key={p.id}
            player={p}
            isCurrentTurn={gameState.players[gameState.currentPlayerIndex].id === p.id}
          />
        ))}
      </header>

      <main className="flex-grow flex items-center justify-between">
         <div className="w-1/5 flex justify-center">
            {opponentPositions.left.map((p) => (
                <OpponentDisplay
                    key={p.id}
                    player={p}
                    isCurrentTurn={gameState.players[gameState.currentPlayerIndex].id === p.id}
                />
            ))}
        </div>
        <div className="w-3/5">
            <GameInfo gameState={gameState} onDrawCard={handleDrawCard} isMyTurn={isMyTurn} />
        </div>
        <div className="w-1/5 flex justify-center">
            {opponentPositions.right.map((p) => (
                <OpponentDisplay
                    key={p.id}
                    player={p}
                    isCurrentTurn={gameState.players[gameState.currentPlayerIndex].id === p.id}
                />
            ))}
        </div>
      </main>

      <footer className="flex-shrink-0">
        <PlayerHand
          player={you}
          onPlayCard={handlePlayCard}
          isCurrentTurn={isMyTurn}
          isCardPlayable={isCardPlayable}
        />
      </footer>
    </div>
  );
}
