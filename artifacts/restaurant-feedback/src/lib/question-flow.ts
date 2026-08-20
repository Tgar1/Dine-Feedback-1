export type FeedbackType = "positive" | "neutral" | "negative";

export type Question = {
  id: string;
  question: string;
  description?: string;
  key: "rating" | "feedbackType" | "category" | "attribute" | "specificDetail" | "dish";
  next?: string | null;
  options: { label: string; value: string; next: string | null }[];
};

const categories = (next: string) => [
  { label: "Food", value: "food", next }, { label: "Service", value: "service", next },
  { label: "Waiting time", value: "waiting", next }, { label: "Ambience", value: "ambience", next },
  { label: "Value for money", value: "value", next }, { label: "Cleanliness", value: "cleanliness", next },
  { label: "Delivery / order experience", value: "delivery", next }, { label: "Something else", value: "other", next },
];

const attributes: Record<FeedbackType, Record<string, string[]>> = {
  positive: {
    food: ["Taste / flavour", "Presentation", "Freshness", "Portion size", "Temperature", "Menu variety", "Quality of ingredients", "A particular dish", "Other"],
    service: ["Friendliness", "Attentiveness", "Speed", "Professionalism", "Other"],
    waiting: ["Quick seating", "Quick ordering", "Fast food preparation", "Fast payment", "Other"],
    ambience: ["Music", "Lighting", "Comfort", "Noise level", "Seating", "Overall atmosphere", "Other"],
    value: ["Fair pricing", "Portion size", "Quality for the price", "Overall value", "Other"],
    cleanliness: ["Tables", "Restrooms", "Cutlery", "Floors", "Overall cleanliness", "Other"],
    delivery: ["Packaging", "Accuracy", "Speed", "Food condition", "Communication", "Other"],
    other: ["Something memorable", "A team member", "The overall experience", "Other"],
  },
  neutral: {
    food: ["Taste / flavour", "Temperature", "Portion size", "Freshness", "Presentation", "Quality", "Order was incorrect", "Other"],
    service: ["Friendliness", "Attentiveness", "Speed", "Communication", "Staff knowledge", "Other"],
    waiting: ["Getting seated", "Ordering", "Food preparation", "Receiving the bill", "Payment", "Other"],
    ambience: ["Music", "Lighting", "Temperature", "Noise level", "Seating", "Cleanliness", "Other"],
    value: ["Price", "Portion size", "Quality for the price", "Overall experience", "Other"],
    cleanliness: ["Tables", "Restrooms", "Cutlery", "Floors", "Overall cleanliness", "Other"],
    delivery: ["Packaging", "Accuracy", "Speed", "Food condition", "Communication", "Other"],
    other: ["Something else", "Nothing in particular"],
  },
  negative: {
    food: ["Taste / flavour", "Temperature", "Portion size", "Freshness", "Presentation", "Quality", "Order was incorrect", "Other"],
    service: ["Slow service", "Unfriendly staff", "Poor communication", "Inattentiveness", "Other"],
    waiting: ["Getting seated", "Ordering", "Food preparation", "Receiving the bill", "Payment", "Delivery", "Other"],
    ambience: ["Music", "Lighting", "Temperature", "Noise level", "Seating", "General ambience", "Other"],
    value: ["Price too high", "Portion size", "Quality for the price", "Experience did not match cost", "Other"],
    cleanliness: ["Tables", "Restrooms", "Floors", "Cutlery", "General environment", "Other"],
    delivery: ["Packaging", "Order accuracy", "Delivery speed", "Food condition", "Communication", "Other"],
    other: ["Something else"],
  },
};

const slug = (label: string) => label.toLowerCase().replace(/\s*\/\s*/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const attributeQuestion = (type: FeedbackType, category: string): Question => ({
  id: `${type}-${category}-attribute`,
  question: type === "positive" ? `What did you particularly enjoy about the ${category}?` : type === "neutral" ? `What could have been better about the ${category}?` : `What was not right about the ${category}?`,
  key: "attribute",
  options: (attributes[type][category] ?? attributes[type].other).map((label) => ({ label, value: slug(label), next: "specific-detail" })),
});

export const questionFlow: Record<string, Question> = {
  root: { id: "root", question: "How was your experience at Rodina today?", key: "rating", options: [
    { label: "Excellent", value: "5", next: "positive-category" }, { label: "Good", value: "4", next: "positive-category" },
    { label: "Okay", value: "3", next: "neutral-category" }, { label: "Poor", value: "2", next: "negative-category" }, { label: "Very poor", value: "1", next: "negative-category" },
  ] },
  "positive-category": { id: "positive-category", question: "We're glad you had a great experience. What made it stand out?", key: "category", options: categories("positive-attribute") },
  "neutral-category": { id: "neutral-category", question: "What would have made your experience better?", key: "category", options: [
    ...categories("neutral-attribute"),
    { label: "Nothing in particular", value: "nothing", next: "neutral-nothing-detail" },
  ] },
  "negative-category": { id: "negative-category", question: "We're sorry your experience wasn't what you expected. What could we have done better?", key: "category", options: categories("negative-attribute") },
  "specific-detail": { id: "specific-detail", question: "What specifically stood out?", description: "Optional — a short detail helps the team understand exactly what happened.", key: "specificDetail", options: [] },
  "neutral-nothing-detail": { id: "neutral-nothing-detail", question: "Anything else you'd like us to know?", description: "Optional — thank you for helping us understand your visit.", key: "specificDetail", options: [] },
  dish: { id: "dish", question: "Which dish was this about?", description: "Optional — this helps the kitchen recognise what to repeat or review.", key: "dish", options: [] },
};

for (const type of ["positive", "neutral", "negative"] as const) {
  for (const category of Object.keys(attributes[type])) questionFlow[`${type}-${category}-attribute`] = attributeQuestion(type, category);
}
