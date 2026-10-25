
import { beforeEach, describe, expect, it, vi } from "vitest";
import { marketDataStore } from "./MarketDataStore";
import type { IPriceTick } from "../types/types";

const createTick = (
  overrides: Partial<IPriceTick> = {},
): IPriceTick => ({
  symbol: "EURUSD",
  bid: "1.10000",
  ask: "1.10020",
  ts: Date.now(),
  seq: 1,
  ...overrides,
});

describe("MarketDataStore", () => {
  beforeEach(() => {
    marketDataStore.reset();
  });

  describe("registerSymbol", () => {
    it("registers a valid symbol", () => {
      marketDataStore.registerSymbol("EURUSD");

      expect(marketDataStore.getAllSymbols()).toContain("EURUSD");
      expect(marketDataStore.getAllRegisteredSymbols()).toContain(
        "EURUSD",
      );
    });

    it("normalizes symbols to uppercase", () => {
      marketDataStore.registerSymbol("eurusd");

      expect(marketDataStore.getAllSymbols()).toContain("EURUSD");
    });

    it("rejects invalid symbols", () => {
      marketDataStore.registerSymbol("EUR");
      marketDataStore.registerSymbol("EURUSD1");
      marketDataStore.registerSymbol("123456");

      expect(marketDataStore.getAllSymbols()).toEqual([]);
    });

    it("does not duplicate registered symbols", () => {
      marketDataStore.registerSymbol("EURUSD");
      marketDataStore.registerSymbol("EURUSD");

      expect(
        marketDataStore.getAllSymbols().filter((s) => s === "EURUSD"),
      ).toHaveLength(1);
    });
  });

  describe("removeSymbol", () => {
    it("removes a symbol from the visible watchlist", () => {
      marketDataStore.registerSymbol("EURUSD");

      marketDataStore.removeSymbol("EURUSD");

      expect(marketDataStore.getAllSymbols()).not.toContain("EURUSD");
    });

    it("keeps a removed symbol registered", () => {
      marketDataStore.registerSymbol("EURUSD");

      marketDataStore.removeSymbol("EURUSD");

      expect(
        marketDataStore.getAllRegisteredSymbols(),
      ).toContain("EURUSD");
    });
  });

  describe("reorderSymbols", () => {
    it("changes the order of visible registered symbols", () => {
      marketDataStore.registerSymbol("EURUSD");
      marketDataStore.registerSymbol("GBPUSD");
      marketDataStore.registerSymbol("USDJPY");

      marketDataStore.reorderSymbols([
        "USDJPY",
        "EURUSD",
        "GBPUSD",
      ]);

      expect(marketDataStore.getAllSymbols()).toEqual([
        "USDJPY",
        "EURUSD",
        "GBPUSD",
      ]);
    });
  });

  describe("handleIncomingTick", () => {
    it("stores a valid tick and calculates spread", () => {
      marketDataStore.handleIncomingTick(createTick());

      const state = marketDataStore.getTickStateBySymbol("EURUSD");

      expect(state).toBeDefined();
      expect(state?.bid).toBe("1.1");
      expect(state?.ask).toBe("1.1002");
      expect(state?.spread).toBe("0.00020");
      expect(state?.changeSinceOpen).toBe("0.00000");
      expect(state?.isStale).toBe(false);
    });

    it("automatically registers the tick symbol", () => {
      marketDataStore.handleIncomingTick(createTick());

      expect(marketDataStore.getAllSymbols()).toContain("EURUSD");
    });

    it("calculates upward price direction", () => {
      marketDataStore.handleIncomingTick(createTick({ seq: 1 }));

      marketDataStore.handleIncomingTick(
        createTick({
          bid: "1.10100",
          ask: "1.10120",
          seq: 2,
        }),
      );

      expect(
        marketDataStore.getTickStateBySymbol("EURUSD")?.direction,
      ).toBe("UP");
    });

    it("calculates downward price direction", () => {
      marketDataStore.handleIncomingTick(createTick({ seq: 1 }));

      marketDataStore.handleIncomingTick(
        createTick({
          bid: "1.09900",
          ask: "1.09920",
          seq: 2,
        }),
      );

      expect(
        marketDataStore.getTickStateBySymbol("EURUSD")?.direction,
      ).toBe("DOWN");
    });

    it("ignores ticks with an old or repeated sequence number", () => {
      marketDataStore.handleIncomingTick(
        createTick({ bid: "1.10000", seq: 2 }),
      );

      marketDataStore.handleIncomingTick(
        createTick({ bid: "1.20000", seq: 1 }),
      );

      const state = marketDataStore.getTickStateBySymbol("EURUSD");

      expect(state?.bid).toBe("1.1");
      expect(state?.seq).toBe(2);
    });

    it("rejects malformed symbols", () => {
      marketDataStore.handleIncomingTick(
        createTick({ symbol: "EUR" }),
      );

      expect(
        marketDataStore.getTickStateBySymbol("EUR"),
      ).toBeUndefined();
    });

    it("rejects an ask price lower than the bid", () => {
      marketDataStore.handleIncomingTick(
        createTick({
          bid: "1.10100",
          ask: "1.10000",
        }),
      );

      expect(
        marketDataStore.getTickStateBySymbol("EURUSD"),
      ).toBeUndefined();
    });

    it("rejects negative prices", () => {
      marketDataStore.handleIncomingTick(
        createTick({
          bid: "-1",
          ask: "1",
        }),
      );

      expect(
        marketDataStore.getTickStateBySymbol("EURUSD"),
      ).toBeUndefined();
    });

    it("limits price history to 20 entries", () => {
      for (let seq = 1; seq <= 25; seq++) {
        marketDataStore.handleIncomingTick(
          createTick({
            bid: (1.1 + seq / 100000).toFixed(5),
            ask: (1.1002 + seq / 100000).toFixed(5),
            seq,
          }),
        );
      }

      const state = marketDataStore.getTickStateBySymbol("EURUSD");

      expect(state?.history).toHaveLength(20);
    });

    it("marks cached prices as stale after disconnection", () => {
      marketDataStore.handleIncomingTick(createTick());

      marketDataStore.setDisconnectedState();

      expect(
        marketDataStore.getTickStateBySymbol("EURUSD")?.isStale,
      ).toBe(true);
    });
  });

  describe("subscriptions and version", () => {
    it("notifies subscribers when the store changes", () => {
      const callback = vi.fn();
      const unsubscribe = marketDataStore.subscribe(callback);

      marketDataStore.registerSymbol("EURUSD");

      expect(callback).toHaveBeenCalled();

      unsubscribe();
    });

    it("increments the version when subscribers are notified", () => {
      const initialVersion = marketDataStore.getVersion();

      marketDataStore.registerSymbol("EURUSD");

      expect(marketDataStore.getVersion()).toBeGreaterThan(
        initialVersion,
      );
    });

    it("stops notifying after unsubscribe", () => {
      const callback = vi.fn();
      const unsubscribe = marketDataStore.subscribe(callback);

      unsubscribe();
      marketDataStore.registerSymbol("EURUSD");

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
