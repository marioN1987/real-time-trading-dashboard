import { RefObject } from "react";

export const subscribeSymbol = (symbol: string, subscriptionsRef: RefObject<Set<String>>, wsRef: RefObject<WebSocket | null>) => {
  const symbolUppercase = symbol.trim().toUpperCase();

  if (!/^[A-Z]{6}$/.test(symbolUppercase)) {
    console.warn("Invalid symbol, should be 6 uppercase letters:", symbol);
    return;
  }

  // Remembers subscriptions even when the WebSocket isn't connected and restores them after reconnecting
  subscriptionsRef.current.add(symbolUppercase);

  const ws = wsRef.current;

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "subscribe",
        symbol: symbolUppercase,
      }),
    );

    console.log("WebSocket Subscribe sent:", symbolUppercase);
  } else {
    console.log("WebSocket Subscription queued:", symbolUppercase);
  }
};

export function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidSymbol(symbol: string): boolean {
  return /^[A-Z]{6}$/.test(symbol);
}