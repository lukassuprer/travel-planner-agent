import { mkdir, writeFile } from "node:fs/promises";
import { runAgent, DeterministicPlanner } from "./agent.js";
import type { TripRequest } from "./types.js";

const requests: Record<string, TripRequest> = {
  "run-1.json": {
    destination: "Prague",
    startDate: "2026-06-10",
    endDate: "2026-06-12",
    budget: 900,
    pace: "balanced",
    interests: ["culture", "food"],
    dietary: ["vegetarian"],
  },
  "run-2.json": {
    destination: "Lisbon",
    startDate: "2026-09-04",
    endDate: "2026-09-06",
    budget: 850,
    pace: "relaxed",
    interests: ["outdoors", "culture"],
    dietary: [],
  },
};

await mkdir(new URL("../traces/", import.meta.url), { recursive: true });
for (const [filename, request] of Object.entries(requests)) {
  const result = await runAgent(request, new DeterministicPlanner());
  await writeFile(new URL(`../traces/${filename}`, import.meta.url), JSON.stringify({ request, ...result }, null, 2));
}
