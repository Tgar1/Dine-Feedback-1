import { analyzeFeedback } from "./analyze-feedback";

const result = await analyzeFeedback({
  rating: 4,
  painPoint: "service",
  comment: "Testing Rodina",
});

console.log("AI ANALYSIS RESULT:");
console.log(JSON.stringify(result, null, 2));