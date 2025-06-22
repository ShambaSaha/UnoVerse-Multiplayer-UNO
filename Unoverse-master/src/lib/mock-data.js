
const colors = ["red", "yellow", "green", "blue"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];

const createDeck = () => {
  const deck = [];
  let idCounter = 0;

  // Numbered and action cards
  colors.forEach(color => {
    values.forEach(value => {
      // One '0' card per color
      const count = value === "0" ? 1 : 2;
      for (let i = 0; i < count; i++) {
        deck.push({ id: `card-${idCounter++}`, color, value });
      }
    });
  });

  // Wild cards
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `card-${idCounter++}`, color: "wild", value: "wild" });
    deck.push({ id: `card-${idCounter++}`, color: "wild", value: "wild_draw4" });
  }

  return deck;
};

const shuffleDeck = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const dealCards = (deck, numPlayers, cardsPerPlayer) => {
  const hands = Array(numPlayers).fill(0).map(() => []);
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let j = 0; j < numPlayers; j++) {
      const card = deck.pop();
      if(card) hands[j].push(card);
    }
  }
  return { hands, remainingDeck: deck };
};


/**
 * @param {string} playerName
 * @param {number} numBots
 * @returns {import('./types').GameState}
 */
export const createLocalGame = (playerName, numBots) => {
    const fullDeck = createDeck();
    const shuffledDeck = shuffleDeck([...fullDeck]);
    
    const numPlayers = 1 + numBots;
    const { hands, remainingDeck } = dealCards([...shuffledDeck], numPlayers, 7);

    let firstCardIndex = remainingDeck.length - 1;
    while (remainingDeck[firstCardIndex].color === 'wild') {
        firstCardIndex--;
        if (firstCardIndex < 0) { // Safety check if deck is all wild cards
            const newDeck = createDeck();
            const newShuffled = shuffleDeck([...newDeck]);
            return createLocalGame(playerName, numBots); // Recurse, very unlikely
        }
    }
    const firstCard = remainingDeck.splice(firstCardIndex, 1)[0];

    const players = [
        { id: "player-1", name: playerName, isHost: true, cards: hands[0] },
    ];

    const botNames = ["Bot 1", "Bot 2", "Bot 3", "Bot 4", "Bot 5", "Bot 6"];
    for (let i = 0; i < numBots; i++) {
        players.push({ id: `player-${i+2}`, name: botNames[i % botNames.length], isHost: false, cards: hands[i+1] });
    }

    return {
        id: "uno-local-game",
        players,
        currentPlayerIndex: 0,
        discardPile: [firstCard],
        drawPile: remainingDeck,
        isClockwise: true,
        gameWinner: null,
        chosenColor: null,
    };
};

/**
 * @param {import('./types').Player[]} players
 * @returns {Omit<import('./types').GameState, 'id'>}
 */
export const createOnlineGameFromPlayers = (players) => {
    const fullDeck = createDeck();
    const shuffledDeck = shuffleDeck([...fullDeck]);
    
    const numPlayers = players.length;
    const { hands, remainingDeck } = dealCards([...shuffledDeck], numPlayers, 7);

    let firstCardIndex = remainingDeck.length - 1;
    while (remainingDeck[firstCardIndex].color === 'wild') {
        firstCardIndex--;
        if (firstCardIndex < 0) { 
            const newDeck = createDeck();
            const newShuffled = shuffleDeck([...newDeck]);
            // This is problematic in a real app, but for now...
            return createOnlineGameFromPlayers(players);
        }
    }
    const firstCard = remainingDeck.splice(firstCardIndex, 1)[0];

    const updatedPlayers = players.map((player, index) => ({
        ...player,
        cards: hands[index]
    }));

    return {
        players: updatedPlayers,
        currentPlayerIndex: 0,
        discardPile: [firstCard],
        drawPile: remainingDeck,
        isClockwise: true,
        gameWinner: null,
        chosenColor: null,
    };
};
