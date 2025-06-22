/**
 * @typedef {"red" | "yellow" | "green" | "blue" | "wild"} CardColor
 */

/**
 * @typedef {"0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "skip" | "reverse" | "draw2" | "wild" | "wild_draw4"} CardValue
 */

/**
 * @typedef {object} Card
 * @property {string} id
 * @property {CardColor} color
 * @property {CardValue} value
 */

/**
 * @typedef {object} Player
 * @property {string} id
 * @property {string} name
 * @property {boolean} isHost
 * @property {Card[]} cards
 */

/**
 * @typedef {object} GameState
 * @property {string} id
 * @property {Player[]} players
 * @property {number} currentPlayerIndex
 * @property {Card[]} discardPile
 * @property {Card[]} drawPile
 * @property {boolean} isClockwise
 * @property {Player | null} gameWinner
 * @property {CardColor | null} chosenColor
 */

// This file is for JSDoc type definitions.
// It doesn't export anything, but allows for better IntelliSense.
export {};
