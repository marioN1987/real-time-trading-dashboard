import { beforeEach, describe, expect, it, vi } from "vitest";
import { marketDataStore } from "./MarketDataStore";
import type { IPriceTick } from "../types/types.interface";

function createTick(
  overrides: Partial<IPriceTick> = {},
): IPriceTick {
  return {
    symbol: "EURUSD",
    bid: "1.08500",
    ask: "1.08503",
    ts: Date.now(),
    seq: 1,
    ...overrides,
  };
}

describe("marketDataStore", () => {
  beforeEach(() => {
    // Remove symbols from previous tests to isolate store state.
    for (const symbol of [...marketDataStore.getAllSymbols()]) {
      marketDataStore.removeSymbol(symbol);
    }
  });

  describe("registerSymbol", () => {
    it("registers a valid symbol", () => {
      marketDataStore.registerSymbol("EURUSD");

      expect(marketDataStore.getAllSymbols()).toContain("EURUSD");
    });

    it("normalizes symbols to uppercase", () => {
      marketDataStore.registerSymbol(" eurusd ");

      expect(marketDataStore.getAllSymbols()).toContain("EURUSD");
    });

    it("ignores invalid symbols", () => {
      marketDataStore.registerSymbol("EUR");
      marketDataStore.registerSymbol("EURUSD1");

      expect(marketDataStore.getAllSymbols()).toEqual([]);
    });

    it("does not register duplicate symbols", () => {
      marketDataStore.registerSymbol("EURUSD");
      marketDataStore.registerSymbol("EURUSD");

      expect(
        marketDataStore.getAllSymbols().filter((s) => s === "EURUSD"),
      ).toHaveLength(1);
    });
  });

  describe("handleIncomingTick", () => {
    it("caches a valid tick and calculates spread", () => {
      marketDataStore.handleIncomingTick(createTick());

      const state = marketDataStore.getTickStateBySymbol("EURUSD");

      expect(state).toBeDefined();
      expect(state?.bid).toBe("1.085");
      expect(state?.ask).toBe("1.08503");
      expect(state?.spread).toBe("0.00003");
      expect(state?.direction).toBe("FLAT");
      expect(state?.isStale).toBe(false);
      expect(state?.history).toEqual(["1.085"]);
    });

    it("registers a symbol when its first tick arrives", () => {
      marketDataStore.handleIncomingTick(createTick({ symbol: "GBPUSD" }));

      expect(marketDataStore.getAllSymbols()).toContain("GBPUSD");
      expect(
        marketDataStore.getTickStateBySymbol("GBPUSD"),
      ).toBeDefined();
    });

    it("updates direction when the bid increases", () => {
      marketDataStore.handleIncomingTick(createTick({ seq: 1, bid: "1.08500" }));
      marketDataStore.handleIncomingTick(
        createTick({ seq: 2, bid: "1.08600", ask: "1.08603" }),
      );

      expect(
        marketDataStore.getTickStateBySymbol("EURUSD")?.direction,
      ).toBe("UP");
    });

    it("updates direction when the bid decreases", () => {
      marketDataStore.handleIncomingTick(createTick({ seq: 1, bid: "1.08500" }));
      marketDataStore.handleIncomingTick(
        createTick({ seq: 2, bid: "1.08400", ask: "1.08403" }),
      );

      expect(
        marketDataStore.getTickStateBySymbol("EURUSD")?.direction,
      ).toBe("DOWN");
    });

    it("ignores duplicate and out-of-order ticks", () => {
      marketDataStore.handleIncomingTick(
        createTick({ seq: 5, bid: "1.08500" }),
      );

      marketDataStore.handleIncomingTick(
        createTick({ seq: 4, bid: "1.09000", ask: "1.09003" }),
      );

      const state = marketDataStore.getTickStateBySymbol("EURUSD");

      expect(state?.seq).toBe(5);
      expect(state?.bid).toBe("1.085");
    });

    it("ignores malformed symbols and invalid sequence numbers", () => {
      marketDataStore.handleIncomingTick(createTick({ symbol: "EUR" }));
      marketDataStore.handleIncomingTick(createTick({ seq: NaN }));
      marketDataStore.handleIncomingTick(createTick({ seq: 1.5 }));

      expect(marketDataStore.getTickStateBySymbol("EURUSD")).toBeUndefined();
    });

    it("ignores negative bids and asks below the bid", () => {
      marketDataStore.handleIncomingTick(
        createTick({ bid: "-1", ask: "1" }),
      );
      marketDataStore.handleIncomingTick(
        createTick({ bid: "1.2", ask: "1.1" }),
      );

      expect(marketDataStore.getTickStateBySymbol("EURUSD")).toBeUndefined();
    });

    it("keeps only the latest 20 bid values in history", () => {
      for (let seq = 1; seq <= 25; seq++) {
        const bid = (1 + seq / 100000).toFixed(5);

        marketDataStore.handleIncomingTick(
          createTick({
            seq,
            bid,
            ask: (Number(bid) + 0.00003).toFixed(5),
          }),
        );
      }

      const state = marketDataStore.getTickStateBySymbol("EURUSD");

      expect(state?.history).toHaveLength(20);
      expect(state?.seq).toBe(25);
    });
  });

  describe("subscribers", () => {
    it("notifies subscribers when a valid tick arrives", () => {
      const callback = vi.fn();
      const unsubscribe = marketDataStore.subscribe(callback);

      marketDataStore.handleIncomingTick(createTick());

      expect(callback).toHaveBeenCalled();

      unsubscribe();
    });

    it("stops notifying after unsubscribe", () => {
      const callback = vi.fn();
      const unsubscribe = marketDataStore.subscribe(callback);

      unsubscribe();
      marketDataStore.handleIncomingTick(createTick());

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("removeSymbol", () => {
    it("removes a symbol and its cached state", () => {
      marketDataStore.handleIncomingTick(createTick());

      marketDataStore.removeSymbol("EURUSD");

      expect(marketDataStore.getAllSymbols()).not.toContain("EURUSD");
      expect(marketDataStore.getTickStateBySymbol("EURUSD")).toBeUndefined();
    });
  });

  describe("setDisconnectedState", () => {
    it("marks cached ticks as stale", () => {
      marketDataStore.handleIncomingTick(createTick());

      marketDataStore.setDisconnectedState();

      expect(
        marketDataStore.getTickStateBySymbol("EURUSD")?.isStale,
      ).toBe(true);
    });
  });
});