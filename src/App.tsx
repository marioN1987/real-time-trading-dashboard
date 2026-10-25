import { useCallback, useEffect, useRef, useState } from "react";
import { ITick, ConnectionStatus } from "./types/types";
import { marketDataStore } from "./store/MarketDataStore";
import { OrderTicket } from "./components/OrderTick";
import { Watchlist } from "./components/WatchList";
import { useMarketDataStream } from "./hooks/useMarketDataStream";
import { subscribeSymbol } from "./helper/helperMethods";

export function App() {
  const [selectedTicket, setSelectedTicket] = useState<ITick | null>(null);
  const connectionStatusRef = useRef<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED,
  );

  const [serverSessionId, setServerSessionId] = useState("");
  const [availableInstruments, setAvailableInstruments] = useState<string[]>(
    [],
  );
  const reconnectAttempt = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  const { connectStream } = useMarketDataStream({
    wsRef,
    connectionStatusRef,
    reconnectAttempt,
    reconnectTimerRef,
    subscriptionsRef,
    setAvailableInstruments,
    setServerSessionId,
    marketDataStore,
  });

  const handleSubscribeSymbol = useCallback((symbol: string) => {
    subscribeSymbol(symbol, subscriptionsRef, wsRef);
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
            onSubscribeSymbol={handleSubscribeSymbol}
            availableInstruments={availableInstruments}
            serverSessionId={serverSessionId}
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
