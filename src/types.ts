export type Pace = "relaxed" | "balanced" | "fast";

export interface TripRequest {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  pace: Pace;
  interests: string[];
  dietary: string[];
}

export interface ToolCall {
  name: ToolName;
  args: Record<string, unknown>;
}

export type ToolName =
  | "weather_lookup"
  | "flight_price_lookup"
  | "lodging_lookup"
  | "attractions_lookup"
  | "assemble_itinerary";

export interface ToolResult {
  ok: boolean;
  tool: ToolName;
  data?: unknown;
  error?: string;
}

export interface ItineraryDay {
  date: string;
  morning: string;
  afternoon: string;
  evening: string;
  estimatedCost: number;
}

export interface Itinerary {
  destination: string;
  dates: string;
  lodging: string;
  transport: string;
  totalEstimatedCost: number;
  budgetRemaining: number;
  days: ItineraryDay[];
  notes: string[];
}

export type AgentDecision =
  | { type: "tool_call"; call: ToolCall; rationale: string }
  | { type: "final"; itinerary: Itinerary }
  | { type: "clarify"; question: string };

export interface TraceEvent {
  step: number;
  actor: "agent" | "tool";
  event: string;
  payload: unknown;
}
