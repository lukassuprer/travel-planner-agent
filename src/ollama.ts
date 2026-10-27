import type { PlannerModel } from "./agent.js";
import type { AgentDecision, ToolCall, ToolResult, TripRequest } from "./types.js";

export class OllamaPlanner implements PlannerModel {
  constructor(private readonly apiKey: string, private readonly model = "gemma4:31b") {}

  async decide(input: { request: TripRequest; history: Array<{ call: ToolCall; result: ToolResult }> }): Promise<AgentDecision> {
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
Call research tools one at a time, then assemble_itinerary. Never invent tool results.`,
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
