import { useCallback, useEffect } from "react";

export function App() {
  const connectStream = useCallback((): void => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      console.log("WebSocket Connected");

      ws.onmessage = (event) => {
        try {
          const tick = JSON.parse(event.data);
          console.log("Incoming tick:", tick);
        } catch (err) {
          console.error("Failed to process market tick:", err);
        }
      };

      ws.onerror = () => {
        ws.close();
        console.log("WebSocket Error, closing connection");
      };
    };
  }, []);

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
    </main>
  );
}
