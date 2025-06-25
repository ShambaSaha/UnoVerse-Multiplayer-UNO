
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
    let firstCard;
    let remainingDeck;
    let hands;
    const numPlayers = 1 + numBots;

    // This loop prevents a potential infinite recursion if the deck runs out of non-wild cards
    while (true) {
        const fullDeck = createDeck();
        const shuffledDeck = shuffleDeck([...fullDeck]);
        
        const dealt = dealCards([...shuffledDeck], numPlayers, 7);
        hands = dealt.hands;
        let deckForFindingFirstCard = dealt.remainingDeck;
        
        let firstCardIndex = deckForFindingFirstCard.length - 1;
        while (firstCardIndex >= 0 && deckForFindingFirstCard[firstCardIndex].color === 'wild') {
            firstCardIndex--;
        }

        if (firstCardIndex >= 0) {
            firstCard = deckForFindingFirstCard.splice(firstCardIndex, 1)[0];
            remainingDeck = deckForFindingFirstCard;
            break; // Found a valid starting card, exit the loop
        }
    }

    const players = [
        { id: "player-1", name: playerName, isHost: true, cards: hands[0] },
    ];

    const botNames = ["Bot 1", "Bot 2", "Bot 3", "Bot 4", "Bot 5", "Bot 6"];
    for (let i = 0; i < numBots; i++) {
        players.push({ id: `player-${i+2}`, name: botNames[i % botNames.length], isHost: false, cards: hands[i+1] });
    }

    const startingPlayerIndex = Math.floor(Math.random() * numPlayers);

    return {
        id: "uno-local-game",
        players,
        currentPlayerIndex: startingPlayerIndex,
        discardPile: [firstCard],
        drawPile: remainingDeck,
        isClockwise: true,
        gameWinner: null,
        chosenColor: null,
        pendingDrawAmount: 0,
    };
};

/**
 * @param {import('./types').Player[]} players
 * @returns {Omit<import('./types').GameState, 'id'>}
 */
export const createOnlineGameFromPlayers = (players) => {
    let firstCard;
    let remainingDeck;
    let hands;
    const numPlayers = players.length;

    // This loop prevents a potential infinite recursion if the deck runs out of non-wild cards
    while (true) {
        const fullDeck = createDeck();
        const shuffledDeck = shuffleDeck([...fullDeck]);
        
        const dealt = dealCards([...shuffledDeck], numPlayers, 7);
        hands = dealt.hands;
        let deckForFindingFirstCard = dealt.remainingDeck;

        let firstCardIndex = deckForFindingFirstCard.length - 1;
        while (firstCardIndex >= 0 && deckForFindingFirstCard[firstCardIndex].color === 'wild') {
            firstCardIndex--;
        }
        
        if (firstCardIndex >= 0) {
            firstCard = deckForFindingFirstCard.splice(firstCardIndex, 1)[0];
            remainingDeck = deckForFindingFirstCard;
            break; // Found a valid starting card, exit the loop
        }
    }


    const updatedPlayers = players.map((player, index) => ({
        ...player,
        cards: hands[index]
    }));

    const startingPlayerIndex = Math.floor(Math.random() * numPlayers);

    return {
        players: updatedPlayers,
        currentPlayerIndex: startingPlayerIndex,
        discardPile: [firstCard],
        drawPile: remainingDeck,
        isClockwise: true,
        gameWinner: null,
        chosenColor: null,
        pendingDrawAmount: 0,
    };
};
