import type { PlannerModel } from "./agent.js";
import type { AgentDecision, ToolCall, ToolResult, TripRequest } from "./types.js";

export class OllamaPlanner implements PlannerModel {
  constructor(private readonly apiKey: string, private readonly model = "gemma4:31b") {}

  async decide(input: { request: TripRequest; history: Array<{ call: ToolCall; result: ToolResult }> }): Promise<AgentDecision> {
    const successfulResult = (name: ToolCall["name"]) =>
      input.history.find((item) => item.call.name === name && item.result.ok)?.result.data;
    const researchTools: ToolCall["name"][] = [
      "weather_lookup",
      "flight_price_lookup",
      "lodging_lookup",
      "attractions_lookup",
    ];
    const hasAllResearch = researchTools.every((name) => successfulResult(name) !== undefined);

    // Keep the final assembly deterministic: the model chooses when to research,
    // while the local tool receives the exact results it produced.
    if (hasAllResearch) {
      return {
        type: "tool_call",
        call: {
          name: "assemble_itinerary",
          args: {
            request: input.request,
            weather: successfulResult("weather_lookup"),
            flights: successfulResult("flight_price_lookup"),
            lodging: successfulResult("lodging_lookup"),
            attractions: successfulResult("attractions_lookup"),
          },
        },
        rationale: "All research is complete; assemble the validated budget-aware itinerary.",
      };
    }

    const response = await fetch("https://ollama.com/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: "json",
        messages: [
          {
            role: "system",
            content: `You are a travel-planning controller. Return exactly one JSON object matching one of:
{"type":"tool_call","call":{"name":"weather_lookup|flight_price_lookup|lodging_lookup|attractions_lookup|assemble_itinerary","args":{}},"rationale":"..."}
or {"type":"clarify","question":"..."}.
Call exactly one missing research tool at a time. Do not call assemble_itinerary until all four research tools have succeeded. Never invent tool results.`,
          },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Ollama request failed with HTTP ${response.status}.`);
    const body = await response.json() as { message?: { content?: string } };
    if (!body.message?.content) throw new Error("Ollama returned no structured message.");
    return JSON.parse(body.message.content) as AgentDecision;
  }
}
