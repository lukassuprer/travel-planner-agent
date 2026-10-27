# Travel-Planner Agent

This project implements **Option A**: a tool-calling travel-planner agent with an explicit loop, structured JSON decisions, five tools, budget validation, and two successful run traces.

## Architecture

```text
CLI request
   |
   v
PlannerModel (Ollama JSON mode, or deterministic offline planner)
   |  tool_call / clarify / final
   v
Explicit agent loop -> tool executor -> result appended to history
   |                                  |
   +------------- repeat --------------+
                                      |
                                      v
                         assemble_itinerary
```

Tools are mocked and deterministic:

1. `weather_lookup` - conditions for the requested dates.
2. `flight_price_lookup` - a round-trip flight option.
3. `lodging_lookup` - a hotel option and total.
4. `attractions_lookup` - activities matching interests.
5. `assemble_itinerary` - creates the day-by-day plan and rejects plans over budget.

Every tool returns the structured shape `{ ok, tool, data?, error? }`. The loop records both agent decisions and tool results, stops at a successful assembled itinerary, and throws a clear error if it receives an unrecoverable tool error or exceeds its step limit. The deterministic model is included so traces and tests work offline; setting `OLLAMA_API_KEY` enables Ollama's structured JSON output mode.

## Setup

```bash
npm install
npm run build
```

Optional Ollama configuration:

```bash
cp .env.example .env
# set OLLAMA_API_KEY and optionally OLLAMA_MODEL
```

## Example input

```bash
npm start -- \
  --destination Prague \
  --start 2026-06-10 \
  --end 2026-06-12 \
  --budget 900 \
  --pace balanced \
  --interests culture,food \
  --dietary vegetarian
```

The CLI prints structured JSON containing the itinerary and the complete trace. If no Ollama key is configured, it uses the offline planner; with a key, the Ollama controller chooses the next tool call but the same local tool implementations enforce the contract and budget.

## Traces

Generate the two included successful traces with:

```bash
npm run trace
```

- `traces/run-1.json`: Prague, balanced, vegetarian.
- `traces/run-2.json`: Lisbon, relaxed, outdoors and culture.

Each trace contains the input, every agent decision, every tool result, and the final budget-respecting itinerary.
