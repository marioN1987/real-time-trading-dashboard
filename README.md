# Real-time rading dashboard

## Instructions

1. `git clone git@github.com:marioN1987/real-time-trading-dashboard.git`
2. `cd real-time-trading-dashboard`

<b>Install dependencies, start server and react</b>

3. `npm i && npm start` or `npm i; npm start` (in powershell)

### Architecture

Real-time trading dashboard uses a client–server architecture with a centralized data store, built around React, TypeScript, Node.js, and WebSockets.

- Node.js Mock Market Data Server: Generates market prices
- WebSocket communication with MarketDataStore and Node.js market server
- UseSyncExternalStore hook connects components to MarketDataStore efficiently and provides more targeted updates, without copying the entire store into React state. Benefits: reliable updates, less boilerplate, more efficient rendering which is important for real time apps.
- Watchlist: Get data from MarketDataStore and render it to show to user actual market prices.

### Tradeoffs

- Performance vs precision: Process every tick accurately, but batch UI notifications to avoid performance bottlenecks.
- Simplicity vs clean architecture: Start a simple store with few components, introduce abstractions as the project grows.
- Real time updates vs UI responsiveness: Update the data store on every valid tick, but limit renders to every 50–100 ms if needed.
- Speed vs. durability: Use in-memory storage for fast live updates and add persistent storage when historical data, replay or auditing are required.

Overall: Prioritize accurate data processing, a responsive UI, and a simple architecture but optimize and add complexity when necessary.

### Performance trace

- Tested using Chrome DevTools Performance while reordering 200 instruments and typing in order ticket with the market data server running.
- Interaction to Next Paint (INP): 16 ms
- Cumulative Layout Shift (CLS): 0.00
- Evidence: docs/performance-metrics.png

The recorded interactions showed a 16 ms INP, indicating responsive input during this test. Results reflect the local development environment and the workload active during the recording.

### Libraries installed

- concurrently: It's required because `npm start` script launches two long-running processes: the WebSocket backend and the Vite frontend.
- decimal.js: It's required because the trading dashboard handles financial prices, where normal floating-point (in Javascript) arithmetic can introduce rounding errors.
- ws: It's a Node.js library which help developers to create and manage WebSocket connections with the backend. The trading dashboard uses it to stream price updates from the mock backend to the React frontend in real time.
  -tailwindcss: CSS Framework which helps style react components (trading dashboard) using utility classes.
- ESLint: code analysis tool that checks JavaScript and TypeScript code bugs, mistakes, and coding issues before you run or build the project.
- globals: This library provides predefined lists of global variables for different environments. Solves undefined errors which was shown when run `lint` in terminal. These variables are provided by the browser not declared in your JavaScript files.
- @eslint/js: JavaScript rules ESLint can use.
