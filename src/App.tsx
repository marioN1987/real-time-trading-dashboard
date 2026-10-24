import { useCallback, useEffect, useRef, useState } from "react";
import { ITick, ConnectionStatus, IPriceTick } from "./types/types";
import { marketDataStore } from "./store/MarketDataStore";
import { OrderTicket } from "./components/OrderTick";
import { Watchlist } from "./components/WatchList";

export function App() {
  const [selectedTicket, setSelectedTicket] = useState<ITick | null>(null);
  const connectionStatusRef = useRef<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED,
  );

  const reconnectAttempt = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  const connectStream = useCallback((): void => {
    const ws = new WebSocket("ws://localhost:8080");

    wsRef.current = ws;
    connectionStatusRef.current = ConnectionStatus.CONNECTING;

    ws.onopen = () => {
      connectionStatusRef.current = ConnectionStatus.CONNECTED;
      reconnectAttempt.current = 0;

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      console.log("WebSocket Connected");

      // Subscribe to every symbol added to the watchlist.
      for (const symbol of subscriptionsRef.current) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "subscribe",
              symbol,
            }),
          );

          console.log("WebSocket Subscribe sent on connect:", symbol);
        }
      }
    };

    ws.onmessage = (event) => {
      try {
        const tick = JSON.parse(event.data) as IPriceTick;
        marketDataStore.handleIncomingTick(tick);
      } catch (err) {
        console.error("WebSocket Failed to process market tick:", err);
      }
    };

    ws.onclose = () => {
      // Ignore events from an older connection.
      if (wsRef.current !== ws) return;

      wsRef.current = null;
      connectionStatusRef.current = ConnectionStatus.DISCONNECTED;
      marketDataStore.setDisconnectedState();

      const baseDelay = Math.min(
        1000 * Math.pow(2, reconnectAttempt.current),
        30000,
      );

      const backoffDelay = Math.round(baseDelay * (0.8 + Math.random() * 0.4));

      reconnectAttempt.current += 1;

      console.log(`WebSocket reconnecting in ${backoffDelay}ms`);

      reconnectTimerRef.current = window.setTimeout(() => {
        connectStream();
      }, backoffDelay);

      ws.onerror = (event) => {
        console.error("WebSocket Connection error:", event);
        // The close handler handles reconnection.
      };
    };
  }, []);

  const subscribeSymbol = useCallback((symbol: string) => {
    const symbolUppercase = symbol.trim().toUpperCase();

    if (!/^[A-Z]{6}$/.test(symbolUppercase)) {
      console.warn("Invalid symbol, should be 6 uppercase letters:", symbol);
      return;
    }

    // Remember it even if the connection isn't ready yet.
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
  }, []);

  // Handle selected ticket event
  const handleRowSelect = useCallback(
    (symbol: string, currentPrice: string, currentSeq: number) => {
      setSelectedTicket({ symbol, price: currentPrice, seq: currentSeq });
    },
    [],
  );

  useEffect(() => {
    connectStream();
  }, [connectStream]);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <header className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="bg-red-500 p-2 text-white text-2xl font-bold tracking-wide rounded-lg shadow-lg">
            Real-Time Trading Dashboard
          </h1>
        </div>
      </header>

      {/* Watchlist Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <section className="lg:col-span-2">
          <Watchlist
            onSelectInstrument={handleRowSelect}
            onSubscribeSymbol={subscribeSymbol}
          />
        </section>

        <aside className="sticky top-6">
          {selectedTicket?.price !== undefined ? (
            <OrderTicket
              key={`${selectedTicket.symbol}-${selectedTicket.seq}`}
              initialSymbol={selectedTicket.symbol}
              initialPrice={selectedTicket.price ?? "0"}
              initialSeq={selectedTicket.seq}
              maxTolerance="0.00015"
            />
          ) : (
            <div className="py-20 px-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 font-mono text-xs">
              Select market instrument Row.
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
