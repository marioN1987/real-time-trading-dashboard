const { WebSocketServer } = require("ws");

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });
const SYMBOLS = [];
const sequenceTracker = new Map();
const priceTracker = new Map();

const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CHF",
  "AUD", "CAD", "NZD", "SEK", "NOK",
  "SGD", "HKD", "MXN", "ZAR", "TRY",
];

const INITIAL_SYMBOLS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
];

// Generate all possible currency pairs (symbols) from the CURRENCIES array
for (const base of CURRENCIES) {
  for (const quote of CURRENCIES) {
    if (base !== quote) {
      SYMBOLS.push(`${base}${quote}`);
    }
  }
}

function initializeSymbol(symbol) {
  if (priceTracker.has(symbol)) return;

  const isJpy = symbol.includes("JPY");
  const base = symbol.startsWith("EUR")
    ? 108400
    : symbol.startsWith("GBP")
      ? 127000
      : isJpy
        ? 150240
        : 100000;

  priceTracker.set(symbol, base);
  sequenceTracker.set(symbol, 100000);
}

function createTick(symbol) {
  initializeSymbol(symbol);

  const jpy = symbol.includes("JPY");
  const seq = sequenceTracker.get(symbol) + 1;

  sequenceTracker.set(symbol, seq);

  let currentSeq = seq;

  // Generate few out-of-order ticks.
  if (Math.random() < 0.05) {
    currentSeq = Math.max(
      0,
      seq - Math.floor(Math.random() * 5) - 1,
    );
  }

  const price =
    priceTracker.get(symbol) +
    Math.floor(Math.random() * 21) - 10;

  priceTracker.set(symbol, price);

  // JPY pairs are conventionally quoted with fewer decimal places
  return {
    symbol,
    bid: jpy
      ? (price / 1000).toFixed(3)
      : (price / 100000).toFixed(5),
    ask: jpy
      ? ((price + 30) / 1000).toFixed(3)
      : ((price + 3) / 100000).toFixed(5),
    ts: Date.now(),
    seq: currentSeq,
  };
}

wss.on("connection", (ws) => {
  const subscriptions = new Set(INITIAL_SYMBOLS);

  console.log("WebSocket for mock feed connected.");

  const timer = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return;

    const symbols = [...subscriptions];
    if (symbols.length === 0) return;

    const symbol =
      symbols[Math.floor(Math.random() * symbols.length)];

    ws.send(JSON.stringify(createTick(symbol)));
  }, 2.5); //sends a tick every 2.5 milliseconds => 400 ticks per second

  // Randomly drop the connection after 25-35 seconds
  const disconnectTimer = setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log("WebSocket for mock feed disconnected.");
      ws.terminate();
    }
  }, 25000 + Math.random() * 10000);

  ws.on("close", () => {
    clearInterval(timer);
    clearTimeout(disconnectTimer);
    console.log("WebSocket for mock feed disconnected.");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error.message);
  });
});

console.log(`WebSocket server running at ws://localhost:${PORT}`);