const { WebSocketServer } = require("ws");

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });
const SYMBOLS = [];

const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CHF",
  "AUD", "CAD", "NZD", "SEK", "NOK",
  "SGD", "HKD", "MXN", "ZAR", "TRY",
];

// Generate all possible currency pairs (symbols) from the CURRENCIES array
for (const base of CURRENCIES) {
  for (const quote of CURRENCIES) {
    if (base !== quote) {
      SYMBOLS.push(`${base}${quote}`);
    }
  }
}