import type { Itinerary, ItineraryDay, ToolCall, ToolName, ToolResult, TripRequest } from "./types.js";

const validTools: ToolName[] = [
  "weather_lookup",
  "flight_price_lookup",
  "lodging_lookup",
  "attractions_lookup",
  "assemble_itinerary",
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateDate(value: unknown): value is string {
  return isNonEmptyString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function fail(tool: ToolName, error: string): ToolResult {
  return { ok: false, tool, error };
}

export function executeTool(call: ToolCall): ToolResult {
  if (!validTools.includes(call.name)) {
    return fail(call.name, "Unknown tool.");
  }

  const { args } = call;
  if (call.name !== "assemble_itinerary" && !isNonEmptyString(args.destination)) {
    return fail(call.name, "destination is required.");
  }

  switch (call.name) {
    case "weather_lookup":
      if (!validateDate(args.startDate) || !validateDate(args.endDate)) {
        return fail(call.name, "startDate and endDate must use YYYY-MM-DD.");
      }
      return {
        ok: true,
        tool: call.name,
        data: {
          forecast: [
            { date: args.startDate, condition: "Partly cloudy", highC: 22, rainChance: 20 },
            { date: args.endDate, condition: "Sunny", highC: 24, rainChance: 10 },
          ],
          advice: "Comfortable walking weather; pack a light layer.",
        },
      };
    case "flight_price_lookup":
      return {
        ok: true,
        tool: call.name,
        data: { option: "Round trip economy", price: 280, currency: "USD", airline: "MockAir" },
      };
    case "lodging_lookup":
      return {
        ok: true,
        tool: call.name,
        data: { option: "Central budget hotel", nightlyRate: 105, nights: 3, total: 315, currency: "USD" },
      };
    case "attractions_lookup":
      return {
        ok: true,
        tool: call.name,
        data: {
          activities: [
            { name: "Old Town walking tour", interest: "culture", price: 0, hours: 2 },
            { name: "City food market", interest: "food", price: 25, hours: 2 },
            { name: "Riverside park and viewpoint", interest: "outdoors", price: 0, hours: 3 },
            { name: "National museum", interest: "culture", price: 18, hours: 2 },
          ],
        },
      };
    case "assemble_itinerary":
      return assemble(args);
  }
}

function assemble(args: Record<string, unknown>): ToolResult {
  const request = args.request as TripRequest | undefined;
  const weather = args.weather as { forecast?: Array<{ date: string; condition: string }> } | undefined;
  const flights = args.flights as { price?: number; option?: string } | undefined;
  const lodging = args.lodging as { total?: number; option?: string } | undefined;
  const attractions = args.attractions as {
    activities?: Array<{ name: string; price: number }>;
  } | undefined;

  if (!request || !isNonEmptyString(request.destination) || !weather || !flights || !lodging || !attractions) {
    return fail("assemble_itinerary", "request and all four research results are required.");
  }
  if (!Array.isArray(attractions.activities) || attractions.activities.length < 3) {
    return fail("assemble_itinerary", "attractions must contain at least three activities.");
  }

  const activityCost = attractions.activities.reduce((sum, activity) => sum + activity.price, 0);
  const total = (flights.price ?? 0) + (lodging.total ?? 0) + activityCost + 90;
  if (total > request.budget) {
    return fail("assemble_itinerary", `estimated cost ${total} exceeds budget ${request.budget}.`);
  }

  const days: ItineraryDay[] = [
    {
      date: request.startDate,
      morning: attractions.activities[0].name,
      afternoon: attractions.activities[1].name,
      evening: "Dinner near the central square",
      estimatedCost: attractions.activities[1].price + 35,
    },
    {
      date: request.endDate,
      morning: "Slow breakfast and neighborhood walk",
      afternoon: attractions.activities[2].name,
      evening: attractions.activities[3].name,
      estimatedCost: attractions.activities[3].price + 30,
    },
  ];
  const itinerary: Itinerary = {
    destination: request.destination,
    dates: `${request.startDate} to ${request.endDate}`,
    lodging: lodging.option ?? "Selected lodging",
    transport: flights.option ?? "Selected flight",
    totalEstimatedCost: total,
    budgetRemaining: request.budget - total,
    days,
    notes: [
      `Weather-aware plan: ${weather.forecast?.map((day) => `${day.date} ${day.condition}`).join("; ")}.`,
      `Pace: ${request.pace}; interests: ${request.interests.join(", ") || "general sightseeing"}.`,
      request.dietary.length > 0 ? `Dietary note: ${request.dietary.join(", ")}.` : "No dietary restrictions supplied.",
    ],
  };
  return { ok: true, tool: "assemble_itinerary", data: itinerary };
}
