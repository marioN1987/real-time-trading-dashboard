
const { WebSocketServer, WebSocket } = require("ws");

const SESSION_ID = `${Date.now()}-${Math.random()}`;
const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });
const sequenceTracker = new Map();
const priceTracker = new Map();
const TICK_INTERVAL = 2; //2 ms up to 500 ticks per second

const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CHF",
  "AUD", "CAD", "NZD", "SEK", "NOK",
  "SGD", "HKD", "MXN", "ZAR", "TRY",
];

const INSTRUMENTS = [];

// Generate all possible currency pairs (symbols) from the CURRENCIES array
for (const base of CURRENCIES) {
  for (const quote of CURRENCIES) {
    if (base !== quote) {
      INSTRUMENTS.push(`${base}${quote}`);
    }
  }
}

// Get 200 Instruments
const UNIQUE_INSTRUMENTS = [...new Set(INSTRUMENTS)].slice(0, 100);

console.log(`Generated ${UNIQUE_INSTRUMENTS.length} instruments.`);

function initializeSymbol(symbol) {
  if (priceTracker.has(symbol)) return;

  const isJpy = symbol.endsWith("JPY");

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

  const isJpy = symbol.endsWith("JPY");
  const seq = sequenceTracker.get(symbol) + 1;

  sequenceTracker.set(symbol, seq);

  let currentSeq = seq;

  // Generate occasional out-of-order ticks.
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
    bid: isJpy
      ? (price / 1000).toFixed(3)
      : (price / 100000).toFixed(5),
    ask: isJpy
      ? ((price + 30) / 1000).toFixed(3)
      : ((price + 3) / 100000).toFixed(5),
    ts: Date.now(),
    seq: currentSeq,
  };
}

wss.on("connection", (ws) => {
  const subscriptions = new Set(UNIQUE_INSTRUMENTS);

  ws.send(JSON.stringify({
    type: "catalog",
    symbols: UNIQUE_INSTRUMENTS,
    sessionId: SESSION_ID
  }));

  const tickInterval = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return;

    for (const symbol of subscriptions) {
      if (ws.readyState !== WebSocket.OPEN) break;

      ws.send(JSON.stringify(createTick(symbol)));
    }
  }, TICK_INTERVAL);

  ws.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      if (
        message.type === "subscribe" &&
        typeof message.symbol === "string"
      ) {
        const symbolUppercase = message.symbol.trim().toUpperCase();

        // Validate six-letter symbols,
        if (!/^[A-Z]{6}$/.test(symbolUppercase)) {
          console.warn("Invalid symbol:", symbolUppercase);
          return;
        }

        if (
          !subscriptions.has(symbolUppercase) &&
          subscriptions.size >= 200
        ) {
          console.warn("Subscription limit reached:", symbolUppercase);
          return;
        }

        const isNew = !subscriptions.has(symbolUppercase);

        initializeSymbol(symbolUppercase);
        subscriptions.add(symbolUppercase);

        console.log("Subscribed:", symbolUppercase);

        // Send market data for a newly added symbol.
        if (isNew && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(createTick(symbolUppercase)));
        }
      }

      if (
        message.type === "unsubscribe" &&
        typeof message.symbol === "string"
      ) {
        const symbol = message.symbol.trim().toUpperCase();

        subscriptions.delete(symbol);

        console.log("Unsubscribed:", symbol);
      }
    } catch (error) {
      console.error("Invalid client message:", error);
    }
  });

  // Produce an occasional disconnect.
  const disconnectTimer = setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log("Simulated market data server disconnect.");
      ws.terminate();
    }
  }, 25000 + Math.random() * 10000);

  ws.on("close", () => {
    clearInterval(tickInterval);
    clearTimeout(disconnectTimer);
    console.log("Market data server disconnected.");
  });

  ws.on("close", (code, reason) => {
    clearInterval(tickInterval);

    console.log("WebSocket closed:", {
      code,
      reason: reason.toString(),
    });
  });

  ws.on("error", (error) => {
    console.error("Market data server error:", error.message);
  });
});

console.log(`Market data server running at ws://localhost:${PORT}`);
