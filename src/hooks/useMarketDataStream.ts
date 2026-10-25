import { useCallback } from "react";
import { ConnectionStatus, IPriceTick, UseMarketDataStreamProps } from "../types/types";

export function useMarketDataStream({
  wsRef,
  connectionStatusRef,
  reconnectAttempt,
  reconnectTimerRef,
  subscriptionsRef,
  setAvailableInstruments,
  setServerSessionId,
  marketDataStore,
}: UseMarketDataStreamProps) {
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

      for (const symbol of subscriptionsRef.current) {
        if (ws.readyState !== WebSocket.OPEN) break;

        ws.send(JSON.stringify({ type: "subscribe", symbol }));

        console.log("WebSocket Subscribe sent on connect:", symbol);
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "catalog") {
          setAvailableInstruments(message.symbols);
          setServerSessionId(message.sessionId);
          return;
        }

        marketDataStore.handleIncomingTick(message as IPriceTick);
      } catch (err) {
        console.error("WebSocket Failed to process market tick:", err);
      }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;

      wsRef.current = null;
      connectionStatusRef.current = ConnectionStatus.DISCONNECTED;
      marketDataStore.setDisconnectedState();

      const baseDelay = Math.min(
        1000 * Math.pow(2, reconnectAttempt.current),
        30000,
      );

      const backoffDelay = Math.round(
        baseDelay * (0.8 + Math.random() * 0.4),
      );

      reconnectAttempt.current += 1;

      console.log(`WebSocket reconnecting in ${backoffDelay}ms`);

      reconnectTimerRef.current = window.setTimeout(() => {
        connectStream();
      }, backoffDelay);
    };

    ws.onerror = (event) => {
      console.error("WebSocket Connection error:", event);
    };
  }, [
    wsRef,
    connectionStatusRef,
    reconnectAttempt,
    reconnectTimerRef,
    subscriptionsRef,
    setAvailableInstruments,
    setServerSessionId,
    marketDataStore,
  ]);

  return { connectStream };
}