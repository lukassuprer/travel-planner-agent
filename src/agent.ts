import type { AgentDecision, Itinerary, ToolCall, ToolResult, TraceEvent, TripRequest } from "./types.js";
import { executeTool } from "./tools.js";

export interface PlannerModel {
  decide(input: {
    request: TripRequest;
    history: Array<{ call: ToolCall; result: ToolResult }>;
  }): Promise<AgentDecision>;
}

export class DeterministicPlanner implements PlannerModel {
  async decide(input: { request: TripRequest; history: Array<{ call: ToolCall; result: ToolResult }> }): Promise<AgentDecision> {
    const last = input.history.at(-1);
    if (last && !last.result.ok) {
      return {
        type: "clarify",
        question: `The ${last.call.name} tool failed: ${last.result.error ?? "unknown error"}. Please provide corrected trip details or a larger budget.`,
      };
    }
    const completed = new Set(input.history.filter((item) => item.result.ok).map((item) => item.call.name));
    const common = { destination: input.request.destination, startDate: input.request.startDate, endDate: input.request.endDate };
    if (!completed.has("weather_lookup")) return { type: "tool_call", call: { name: "weather_lookup", args: common }, rationale: "Check conditions before scheduling outdoor activities." };
    if (!completed.has("flight_price_lookup")) return { type: "tool_call", call: { name: "flight_price_lookup", args: common }, rationale: "Find transport that fits the budget." };
    if (!completed.has("lodging_lookup")) return { type: "tool_call", call: { name: "lodging_lookup", args: common }, rationale: "Find lodging for the trip dates." };
    if (!completed.has("attractions_lookup")) return { type: "tool_call", call: { name: "attractions_lookup", args: { ...common, interests: input.request.interests } }, rationale: "Find activities matching the interests." };
    const result = (name: string) => input.history.find((item) => item.call.name === name && item.result.ok)?.result.data;
    return {
      type: "tool_call",
      call: {
        name: "assemble_itinerary",
        args: {
          request: input.request,
          weather: result("weather_lookup"),
          flights: result("flight_price_lookup"),
          lodging: result("lodging_lookup"),
          attractions: result("attractions_lookup"),
        },
      },
      rationale: "Assemble a day-by-day itinerary and verify the budget.",
    };
  }
}

export async function runAgent(request: TripRequest, model: PlannerModel, maxSteps = 10): Promise<{ itinerary: Itinerary; trace: TraceEvent[] }> {
  const history: Array<{ call: ToolCall; result: ToolResult }> = [];
  const trace: TraceEvent[] = [];
  for (let step = 1; step <= maxSteps; step += 1) {
    const decision = await model.decide({ request, history });
    trace.push({ step, actor: "agent", event: decision.type, payload: decision });
    if (decision.type === "clarify") throw new Error(`Agent needs clarification: ${decision.question}`);
    if (decision.type === "final") return { itinerary: decision.itinerary, trace };

    const result = executeTool(decision.call);
    history.push({ call: decision.call, result });
    trace.push({ step, actor: "tool", event: result.ok ? "success" : "error", payload: result });
    if (result.ok && decision.call.name === "assemble_itinerary") {
      return { itinerary: result.data as Itinerary, trace };
    }
  }
  throw new Error(`Agent exceeded the ${maxSteps}-step limit without completing an itinerary.`);
}
