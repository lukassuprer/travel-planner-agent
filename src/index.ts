import "dotenv/config";
import { DeterministicPlanner, runAgent } from "./agent.js";
import { OllamaPlanner } from "./ollama.js";
import type { Pace, TripRequest } from "./types.js";

function parseArgs(argv: string[]): TripRequest {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) throw new Error("Arguments use --name value syntax.");
    values.set(key.slice(2), value);
  }
  const destination = values.get("destination");
  const startDate = values.get("start");
  const endDate = values.get("end");
  const budget = Number(values.get("budget"));
  if (!destination || !startDate || !endDate || !Number.isFinite(budget)) {
    throw new Error("Required flags: --destination, --start, --end, --budget.");
  }
  const pace = (values.get("pace") ?? "balanced") as Pace;
  if (!["relaxed", "balanced", "fast"].includes(pace)) throw new Error("pace must be relaxed, balanced, or fast.");
  return {
    destination,
    startDate,
    endDate,
    budget,
    pace,
    interests: (values.get("interests") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    dietary: (values.get("dietary") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
  };
}

function printItinerary(result: Awaited<ReturnType<typeof runAgent>>): void {
  const { itinerary, trace } = result;
  console.log(JSON.stringify({ itinerary, trace }, null, 2));
}

try {
  const request = parseArgs(process.argv.slice(2));
  const model = process.env.OLLAMA_API_KEY
    ? new OllamaPlanner(process.env.OLLAMA_API_KEY, process.env.OLLAMA_MODEL)
    : new DeterministicPlanner();
  printItinerary(await runAgent(request, model));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unexpected planner error.");
  process.exitCode = 1;
}
