export interface StageGateRule {
  stage: string;
  stageNumber: number;
  requiredForNext: string[]; // field names that must be filled to move to next stage
}

export const stageGateRules: StageGateRule[] = [
  {
    stage: "Discovery",
    stageNumber: 1,
    requiredForNext: ["identifiedPain", "metrics", "champion"],
  },
  {
    stage: "Qualification",
    stageNumber: 2,
    requiredForNext: [
      "economicBuyer",
      "decisionCriteria",
      "decisionProcess",
    ],
  },
  {
    stage: "Technical Win",
    stageNumber: 3,
    requiredForNext: ["technicalWinStatus", "techStack"],
  },
  {
    stage: "Business Case",
    stageNumber: 4,
    requiredForNext: ["valueDriver", "amount", "closeDate"],
  },
  {
    stage: "Negotiation",
    stageNumber: 5,
    requiredForNext: ["paperProcess", "competition"],
  },
  { stage: "Closed Won", stageNumber: 6, requiredForNext: [] },
  { stage: "Closed Lost", stageNumber: 7, requiredForNext: [] },
];

export function getRequiredFieldsForCurrentStage(
  stage: string | null
): string[] {
  const rule = stageGateRules.find((r) => r.stage === stage);
  return rule?.requiredForNext ?? [];
}

export function getMissingFields(
  stage: string | null,
  record: Record<string, unknown>
): string[] {
  const required = getRequiredFieldsForCurrentStage(stage);
  return required.filter((f) => {
    const val = record[f];
    return val == null || val === "" || val === undefined;
  });
}
