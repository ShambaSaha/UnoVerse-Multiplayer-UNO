
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PlayerHand } from "./player-hand";
import { OpponentDisplay } from "./opponent-display";
import { GameInfo } from "./game-info";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trophy, LoaderCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSound } from "@/hooks/use-sound";

const TURN_DURATION = 20; // seconds

// Pure helper function
const getNextPlayerIndex = (currentIndex, direction, playerCount) => {
    if (direction) { // isClockwise
        return (currentIndex + 1) % playerCount;
    } else {
        return (currentIndex - 1 + playerCount) % playerCount;
    }
};

// Pure function to check card playability
const isCardPlayable = (card, topCard, chosenColor, pendingDrawAmount) => {
    if (pendingDrawAmount > 0) {
        // If there's a stack, you can only play a matching draw card.
        return card.value === topCard.value;
    }
    if (!topCard) return false;
    if (card.color === 'wild') return true;
    if (chosenColor) return card.color === chosenColor;
    return card.color === topCard.color || card.value === topCard.value;
};


// Pure function to process a card play
const calculateNextStateAfterPlay = (currentState, card, chosenColor, showToast) => {
    let {
        players,
        currentPlayerIndex,
        isClockwise,
        drawPile,
        pendingDrawAmount = 0,
    } = currentState;

    const numPlayers = players.length;
    const player = players[currentPlayerIndex];

    const newHand = player.cards.filter(c => c.id !== card.id);
    let newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, cards: newHand };

    let newDrawPile = [...drawPile];
    let newIsClockwise = isClockwise;
    let newPendingDrawAmount = pendingDrawAmount;
    let finalNextPlayerIndex;
    let skipNextPlayer = false;

    // Handle draw card value effects first
    if (card.value === "draw2") newPendingDrawAmount += 2;
    if (card.value === "wild_draw4") newPendingDrawAmount += 4;

    // Determine if the next player will be skipped based on the card played
    if (card.value === "skip") {
        skipNextPlayer = true;
    } else if (card.value === "reverse") {
        if (numPlayers === 2) {
            skipNextPlayer = true;
        } else {
            newIsClockwise = !isClockwise;
        }
    } else if (card.value === 'draw2' || card.value === 'wild_draw4') {
        const nextPlayerIndex = getNextPlayerIndex(currentPlayerIndex, newIsClockwise, numPlayers);
        const victimPlayer = newPlayers[nextPlayerIndex];
        const canVictimStack = victimPlayer.cards.some(c => c.value === card.value);

        if (!canVictimStack) {
            // Victim cannot stack, so they must draw the whole pile.
            if (newDrawPile.length < newPendingDrawAmount) {
              showToast({ title: "Draw Pile Low", description: "Not enough cards to draw.", variant: "destructive" });
              const cardsToDraw = newDrawPile.splice(0, newDrawPile.length);
              const victimNewHand = [...victimPlayer.cards, ...cardsToDraw];
              newPlayers[nextPlayerIndex] = { ...victimPlayer, cards: victimNewHand };
            } else {
              const cardsToDraw = newDrawPile.splice(newDrawPile.length - newPendingDrawAmount, newPendingDrawAmount);
              const victimNewHand = [...victimPlayer.cards, ...cardsToDraw];
              newPlayers[nextPlayerIndex] = { ...victimPlayer, cards: victimNewHand };
            }
            
            // Reset pending amount and mark that the victim's turn should be skipped.
            newPendingDrawAmount = 0;
            skipNextPlayer = true;
        }
    }

    // Now, calculate the final next player based on skips and direction
    if (skipNextPlayer) {
        // A skip means we advance the turn twice from the current player
        const skippedPlayerIndex = getNextPlayerIndex(currentPlayerIndex, newIsClockwise, numPlayers);
        finalNextPlayerIndex = getNextPlayerIndex(skippedPlayerIndex, newIsClockwise, numPlayers);
    } else {
        // Default action is to advance to the next player
        finalNextPlayerIndex = getNextPlayerIndex(currentPlayerIndex, newIsClockwise, numPlayers);
    }


    return {
        ...currentState,
        players: newPlayers,
        discardPile: [...currentState.discardPile, card],
        drawPile: newDrawPile,
        currentPlayerIndex: finalNextPlayerIndex,
        isClockwise: newIsClockwise,
        chosenColor: card.color === 'wild' ? chosenColor : null,
        gameWinner: newHand.length === 0 ? player : currentState.gameWinner,
        pendingDrawAmount: newPendingDrawAmount,
    };
};

// Pure function to process a card draw
const calculateNextStateAfterDraw = (currentState, showToast) => {
    if (currentState.drawPile.length === 0) {
        showToast({ title: "Draw Pile Empty", description: "No cards left to draw.", variant: "destructive" });
        return { newState: currentState, drawnCard: null };
    }

    const player = currentState.players[currentState.currentPlayerIndex];
    const newCard = currentState.drawPile[currentState.drawPile.length-1];
    const newDrawPile = currentState.drawPile.slice(0, -1);

    const newHand = [...player.cards, newCard];
    const newPlayers = [...currentState.players];
    newPlayers[currentState.currentPlayerIndex] = { ...player, cards: newHand };
    
    return {
        newState: {
            ...currentState,
            players: newPlayers,
            drawPile: newDrawPile,
        },
        drawnCard: newCard,
    };
};

// Pure function for bot decision making
const makeBotMove = (currentState, showToast) => {
    const { players, currentPlayerIndex, discardPile, chosenColor, pendingDrawAmount, isClockwise } = currentState;
    const botPlayer = players[currentPlayerIndex];
    const topCard = discardPile[discardPile.length - 1];

    const playableCards = botPlayer.cards.filter(card => 
        isCardPlayable(card, topCard, chosenColor, pendingDrawAmount || 0)
    );

    if (playableCards.length > 0) {
        let cardToPlay;
        const nonWildPlayable = playableCards.filter(c => c.color !== 'wild');
        
        if (nonWildPlayable.length > 0) {
            cardToPlay = nonWildPlayable[0];
        } else {
            cardToPlay = playableCards[0];
        }

        let nextChosenColor = null;
        if (cardToPlay.color === 'wild') {
            const colorCounts = {};
            botPlayer.cards.forEach(c => {
                if (c.color !== 'wild' && c.id !== cardToPlay.id) {
                    colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
                }
            });
            const colors = Object.keys(colorCounts);
            if (colors.length > 0) {
                nextChosenColor = colors.reduce((a, b) => (colorCounts[a] > colorCounts[b] ? a : b));
            } else {
                nextChosenColor = ['red', 'green', 'blue', 'yellow'][Math.floor(Math.random() * 4)];
            }
        }
        return { move: 'play', state: calculateNextStateAfterPlay(currentState, cardToPlay, nextChosenColor, showToast) };
    } else {
        if (pendingDrawAmount > 0) {
            return { move: 'none', state: currentState };
        }

        const { newState: stateAfterDraw, drawnCard } = calculateNextStateAfterDraw(currentState, showToast);
        
        if (drawnCard && isCardPlayable(drawnCard, topCard, stateAfterDraw.chosenColor, 0)) {
            let nextChosenColor = null;
            if (drawnCard.color === 'wild') {
                 const colorCounts = {};
                 stateAfterDraw.players[currentPlayerIndex].cards.forEach(c => {
                    if (c.color !== 'wild' && c.id !== drawnCard.id) {
                        colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
                    }
                });
                const colors = Object.keys(colorCounts);
                if (colors.length > 0) {
                    nextChosenColor = colors.reduce((a, b) => (colorCounts[a] > colorCounts[b] ? a : b));
                } else {
                    nextChosenColor = ['red', 'green', 'blue', 'yellow'][Math.floor(Math.random() * 4)];
                }
            }
            return { move: 'draw-play', state: calculateNextStateAfterPlay(stateAfterDraw, drawnCard, nextChosenColor, showToast) };
        } else {
            const nextPlayerIndex = getNextPlayerIndex(stateAfterDraw.currentPlayerIndex, isClockwise, stateAfterDraw.players.length);
            const finalState = { ...stateAfterDraw, currentPlayerIndex: nextPlayerIndex, chosenColor: null };
            return { move: 'draw-pass', state: finalState };
        }
    }
};


export function GameBoard({ initialGameState, playerId, isOnline = false }) {
  const [gameState, setGameState] = useState(initialGameState);
  const { toast } = useToast();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCard, setPendingCard] = useState(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [turnTimer, setTurnTimer] = useState(TURN_DURATION);
  const turnTimerIntervalRef = useRef(null);
  
  const playCardSound = useSound('/sounds/card-play.mp3');
  const drawCardSound = useSound('/sounds/card-draw.mp3', { volume: 0.5 });
  const winGameSound = useSound('/sounds/win.mp3');

  // If online, sync state with parent which gets updates from Firestore
  useEffect(() => {
    if (isOnline) {
      setGameState(initialGameState);
    }
  }, [initialGameState, isOnline]);

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
    
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    if (!isCardPlayable(card, topCard, gameState.chosenColor, gameState.pendingDrawAmount || 0)) {
        toast({ title: "Invalid Move", description: "You can't play that card.", variant: "destructive" });
        return;
    }
    
    if (card.color === 'wild') {
        setPendingCard(card);
        setShowColorPicker(true);
        return; 
    }
    
    playCardSound();
    const nextState = calculateNextStateAfterPlay(gameState, card, null, toast);
    updateGameState(nextState);
  };
  
  const handleDrawCard = () => {
    if (gameState.players[gameState.currentPlayerIndex].id !== playerId) {
        toast({ title: "Not your turn!", description: "It's not your turn to draw.", variant: "destructive" });
        return;
    };
    if (gameState.pendingDrawAmount > 0) {
        toast({ title: "Stack Active", description: "You must play a matching draw card.", variant: "destructive" });
        return;
    }
    if (hasDrawn) {
        toast({ title: "Already Drawn", description: "You have already drawn a card this turn. Play a card or pass.", variant: "destructive" });
        return;
    }
    drawCardSound();
    const { newState } = calculateNextStateAfterDraw(gameState, toast);
    updateGameState(newState);
    setHasDrawn(true);
  }

  const handlePassTurn = () => {
    if (gameState.pendingDrawAmount > 0) {
        return; // Should not be clickable, but safeguard.
    }
    if (!hasDrawn) {
        toast({ title: "Cannot Pass", description: "You must draw a card before you can pass.", variant: "destructive" });
        return;
    }
    const nextPlayerIndex = getNextPlayerIndex(gameState.currentPlayerIndex, gameState.isClockwise, gameState.players.length);
    updateGameState({ ...gameState, currentPlayerIndex: nextPlayerIndex, chosenColor: null });
  }

  const handleAutoPass = useCallback(() => {
    const performAutoMove = (currentGameState) => {
        // Safeguard against race conditions
        if (currentGameState.players[currentGameState.currentPlayerIndex].id !== playerId) {
            return currentGameState;
        }

        const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
        const topCard = currentGameState.discardPile[currentGameState.discardPile.length - 1];
    
        // 1. Check for playable cards in hand first.
        const playableCards = currentPlayer.cards.filter(card => isCardPlayable(card, topCard, currentGameState.chosenColor, currentGameState.pendingDrawAmount || 0));
    
        if (playableCards.length > 0) {
            // 2. If a playable card exists, play it automatically.
            const cardToPlay = playableCards[0]; // Simple strategy: play the first available card.
            
            let chosenColor = null;
            if (cardToPlay.color === 'wild') {
                // Auto-pick the most common color in hand for wild cards
                const colorCounts = {};
                currentPlayer.cards.forEach(c => {
                    if (c.color !== 'wild' && c.id !== cardToPlay.id) colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
                });
                const colors = Object.keys(colorCounts);
                chosenColor = colors.length > 0 
                    ? colors.reduce((a, b) => (colorCounts[a] > colorCounts[b] ? a : b))
                    : ['red', 'green', 'blue', 'yellow'][Math.floor(Math.random() * 4)];
            }
            playCardSound();
            return calculateNextStateAfterPlay(currentGameState, cardToPlay, chosenColor, toast);
        }
        
        // If there's a pending draw amount, the game logic, not this function, will handle the forced draw.
        if (currentGameState.pendingDrawAmount > 0) {
            // This case is handled by calculateNextStateAfterPlay from the previous player's turn.
            // The timed-out player can't do anything but let the draw happen.
            // We return the current state as no action is taken by this player.
            return currentGameState; 
        }

        // 3. If no playable cards, then draw.
        drawCardSound();
        const { newState: stateAfterDraw, drawnCard } = calculateNextStateAfterDraw(currentGameState, toast);
    
        // 4. If drawn card is playable, play it.
        if (drawnCard && isCardPlayable(drawnCard, topCard, stateAfterDraw.chosenColor, stateAfterDraw.pendingDrawAmount || 0)) {
            let chosenColor = null;
            if (drawnCard.color === 'wild') {
                chosenColor = ['red', 'green', 'blue', 'yellow'][Math.floor(Math.random() * 4)];
            }
            playCardSound();
            return calculateNextStateAfterPlay(stateAfterDraw, drawnCard, chosenColor, toast);
        } else {
            // 5. If drawn card is not playable, pass turn.
            const nextPlayerIndex = getNextPlayerIndex(stateAfterDraw.currentPlayerIndex, stateAfterDraw.isClockwise, stateAfterDraw.players.length);
            return { ...stateAfterDraw, currentPlayerIndex: nextPlayerIndex, chosenColor: null };
        }
    };
    
    // First, show the toast notification as a side-effect, outside of the render cycle.
    toast({ title: "Time's up!", description: "Your turn was automatically handled.", variant: "destructive" });

    const updater = (currentState) => {
        const nextState = performAutoMove(currentState);
        if (isOnline && nextState !== currentState) {
            updateGameState(nextState);
        }
        return nextState;
    };
    
    if (!isOnline) {
        setGameState(updater);
    } else {
        // In online mode, we get the latest state and let the updater function handle the async update.
        // We still return the new state for local rendering updates.
        setGameState(currentState => {
            return updater(currentState);
        });
    }
  }, [isOnline, updateGameState, toast, playCardSound, drawCardSound, playerId]);


  const handleSelectColor = (color) => {
      if(pendingCard) {
          playCardSound();
          const nextState = calculateNextStateAfterPlay(gameState, pendingCard, color, toast);
          updateGameState(nextState);
      }
      setShowColorPicker(false);
      setPendingCard(null);
  }

  // Effect to handle turn changes (timer reset, state reset)
  useEffect(() => {
    if (gameState.gameWinner) {
      if (turnTimerIntervalRef.current) clearInterval(turnTimerIntervalRef.current);
      winGameSound();
      return;
    }

    setHasDrawn(false);
    setTurnTimer(TURN_DURATION);
    
    if (turnTimerIntervalRef.current) clearInterval(turnTimerIntervalRef.current);
    turnTimerIntervalRef.current = setInterval(() => {
      setTurnTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(turnTimerIntervalRef.current);
  }, [gameState.currentPlayerIndex, gameState.gameWinner, winGameSound]);

  // Effect to handle turn timeout
  useEffect(() => {
    if (turnTimer === 0) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer.id === playerId) {
        handleAutoPass();
      }
    }
  }, [turnTimer, playerId, gameState.players, gameState.currentPlayerIndex, handleAutoPass]);

  // Effect to handle bot turns
  useEffect(() => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (isOnline || !gameState || gameState.gameWinner || currentPlayer.id === playerId) {
        return;
    }

    const botMoveTimeout = setTimeout(() => {
      const { move, state: nextState } = makeBotMove(gameState, toast);
        
      if (move === 'play' || move === 'draw-play') {
          playCardSound();
      }
      if (move === 'draw-play' || move === 'draw-pass') {
          drawCardSound();
      }
      
      // Add a slight delay for the draw-play scenario to feel more natural
      if (move === 'draw-play') {
          setTimeout(() => {
              setGameState(nextState);
          }, 500);
      } else {
          setGameState(nextState);
      }
    }, 1500); // Bot move delay

    return () => clearTimeout(botMoveTimeout);
  }, [gameState, isOnline, playerId, toast, playCardSound, drawCardSound]);


  const yourPlayerIndex = gameState.players.findIndex(p => p.id === playerId);
  
  if (yourPlayerIndex === -1) {
    return (
        <div className="w-full h-screen bg-background p-4 flex flex-col items-center justify-center gap-4">
            <LoaderCircle className="w-12 h-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Joining game...</p>
        </div>
    )
  }

  const you = gameState.players[yourPlayerIndex];
  const opponents = gameState.players.filter(p => p.id !== playerId);
  
  const opponentPositions = {
      top: [],
      left: [],
      right: []
  };

  if (opponents.length === 1) {
      opponentPositions.top = [opponents[0]];
  } else if (opponents.length === 2) {
      opponentPositions.left = [opponents[0]];
      opponentPositions.right = [opponents[1]];
  } else if (opponents.length === 3) {
      opponentPositions.top = [opponents[1]];
      opponentPositions.left = [opponents[0]];
      opponentPositions.right = [opponents[2]];
  } else if (opponents.length === 4) {
      opponentPositions.top = [opponents[1], opponents[2]];
      opponentPositions.left = [opponents[0]];
      opponentPositions.right = [opponents[3]];
  } else if (opponents.length === 5) {
      opponentPositions.top = [opponents[1], opponents[2], opponents[3]];
      opponentPositions.left = [opponents[0]];
      opponentPositions.right = [opponents[4]];
  }

  const isMyTurn = gameState.players[gameState.currentPlayerIndex].id === you.id;

  return (
    <div className="w-full h-screen bg-background p-2 sm:p-4 flex flex-col overflow-hidden">
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
                    <div className="grid grid-cols-2 gap-4 p-4">
                        <Button className="h-20 bg-red-500 hover:bg-red-600" onClick={() => handleSelectColor('red')}>Red</Button>
                        <Button className="h-20 bg-yellow-400 hover:bg-yellow-500" onClick={() => handleSelectColor('yellow')}>Yellow</Button>
                        <Button className="h-20 bg-green-500 hover:bg-green-600" onClick={() => handleSelectColor('green')}>Green</Button>
                        <Button className="h-20 bg-blue-500 hover:bg-blue-600" onClick={() => handleSelectColor('blue')}>Blue</Button>
                    </div>
                </AlertDialogContent>
             </AlertDialog>
        )}

      <header className="flex-shrink-0 w-full flex justify-around p-1 sm:p-4 flex-wrap gap-2">
        {opponentPositions.top.map((p) => (
          <OpponentDisplay
            key={p.id}
            player={p}
            isCurrentTurn={gameState.players[gameState.currentPlayerIndex].id === p.id}
          />
        ))}
      </header>

      <main className="flex-grow flex items-center justify-between my-2">
         <div className="w-1/6 flex justify-center">
            {opponentPositions.left.map((p) => (
                <OpponentDisplay
                    key={p.id}
                    player={p}
                    isCurrentTurn={gameState.players[gameState.currentPlayerIndex].id === p.id}
                />
            ))}
        </div>
        <div className="w-4/6">
            <GameInfo 
                gameState={gameState} 
                onDrawCard={handleDrawCard} 
                onPassTurn={handlePassTurn}
                isMyTurn={isMyTurn}
                hasDrawn={hasDrawn}
                turnTimer={turnTimer}
            />
        </div>
        <div className="w-1/6 flex justify-center">
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
          isCardPlayable={(card) => isCardPlayable(card, gameState.discardPile[gameState.discardPile.length - 1], gameState.chosenColor, gameState.pendingDrawAmount || 0)}
        />
      </footer>
    </div>
  );
}
