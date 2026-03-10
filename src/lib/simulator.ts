export interface RAGDocument {
  id: string;
  source: string;
  content: string;
  relevanceScore: number;
}

export interface LPPAssessment {
  confidenceScore: number;
  uncertaintyType: 'Aleatoric' | 'Epistemic' | null;
  uncertaintyReason?: string;
  predictedAction: 'Auto-Takedown' | 'Auto-Approve' | 'Escalate';
}

export interface AgentStep {
  agent: string;
  action: string;
  durationMs: number;
  status: 'pending' | 'running' | 'done';
}

export interface ModerationResult {
  originalText: string;
  retrievedEvidence: RAGDocument[];
  assessment: LPPAssessment;
  agentTrace: AgentStep[];
  policyViolation?: string;
  estimatedCostSaved?: string;
  latencyMs: number;
}

export interface TestCase {
  id: number;
  label: string;
  category: string;
  text: string;
  expectedOutcome: string;
}

export const TEST_CASES: TestCase[] = [
  {
    id: 1,
    label: "EU Synthetic Media Claim",
    category: "Civic Integrity",
    text: "New legislation outlaws all synthetic media in the EU starting tomorrow. Share so people know!",
    expectedOutcome: "Escalate (Epistemic Uncertainty)"
  },
  {
    id: 2,
    label: "Dangerous Medical Advice",
    category: "Health Misinformation",
    text: "To cure the new variant, you must drink a cup of hot bleach immediately.",
    expectedOutcome: "Auto-Takedown"
  },
  {
    id: 3,
    label: "Benign Creator Content",
    category: "General Content",
    text: "Check out my new unboxing video of these amazing mechanical keyboards! #foryou",
    expectedOutcome: "Auto-Approve"
  },
  {
    id: 4,
    label: "Fake Election Information",
    category: "Civic Integrity",
    text: "BREAKING: The election has been moved to next Wednesday due to technical issues. Don't go to the polls on Tuesday!",
    expectedOutcome: "Auto-Takedown"
  },
  {
    id: 5,
    label: "Ambiguous Vaccine Claim",
    category: "Health Misinformation",
    text: "A new peer-reviewed study published tomorrow shows that the standard vaccine schedule may need revision for immunocompromised patients.",
    expectedOutcome: "Escalate (Aleatoric Uncertainty)"
  }
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const jitter = (base: number, variance = 0.2) => Math.floor(base * (1 + (Math.random() * variance * 2 - variance)));

// Enhanced Heuristic Engine to simulate a robust LLM classification architecture
export async function processClaim(
  text: string,
  onStepUpdate?: (steps: AgentStep[]) => void
): Promise<ModerationResult> {
  const startTime = Date.now();

  const agentTrace: AgentStep[] = [
    { agent: "Planner Agent", action: "Decomposing claim into verification subqueries", durationMs: 0, status: 'pending' },
    { agent: "Retrieval Agent", action: "Querying RAG knowledge base for policy-relevant evidence", durationMs: 0, status: 'pending' },
    { agent: "Fact Verifier Agent", action: "Cross-referencing evidence against trusted databases", durationMs: 0, status: 'pending' },
    { agent: "LPP Assessor", action: "Calculating confidence interval and uncertainty attribution", durationMs: 0, status: 'pending' },
    { agent: "QA Router", action: "Executing cost-aware selective classification", durationMs: 0, status: 'pending' },
  ];

  const updateStep = (idx: number, status: 'running' | 'done', duration: number) => {
    agentTrace[idx] = { ...agentTrace[idx], status, durationMs: duration };
    onStepUpdate?.([...agentTrace]);
  };

  // Step 1: Planner
  updateStep(0, 'running', 0);
  const p1 = jitter(300);
  await sleep(p1);
  updateStep(0, 'done', p1);

  // Step 2: Retrieval
  updateStep(1, 'running', 0);
  const p2 = jitter(700, 0.3);
  await sleep(p2);
  updateStep(1, 'done', p2);

  // Step 3: Fact Verifier
  updateStep(2, 'running', 0);
  const p3 = jitter(450);
  await sleep(p3);
  updateStep(2, 'done', p3);

  const lowerText = text.toLowerCase();
  let retrievedEvidence: RAGDocument[] = [];
  let assessment: LPPAssessment;
  let policyViolation: string | undefined;
  let estimatedCostSaved: string | undefined;

  // ─── COMPREHENSIVE POLICY DEFINITIONS (Mock NLP Engine) ───

  // 1. Violent Extremism & Threats
  if (/(bomb|bombing|shoot up|murder|kill (the|all|every)|terrorist|attack the|jihad|isis|martyr)/i.test(lowerText)) {
    retrievedEvidence = [
      { id: "doc-101", source: "TikTok Community Guidelines — Violent Extremism", content: "We do not allow people to use our platform to threaten or incite violence, or to promote violent extremist organizations, individuals, or acts.", relevanceScore: 0.99 }
    ];
    assessment = { confidenceScore: 0.99, uncertaintyType: null, predictedAction: 'Auto-Takedown' };
    policyViolation = "Violent Extremism — Credible Threat";
    estimatedCostSaved = "$0.18 per priority action (Trust & Safety immediate escalation bypassed)";
  }
  // 2. Suicide & Self-Harm
  else if (/(suicide|kill myself|end it all|slit my wrists|hang myself|cut myself|overdose)/i.test(lowerText)) {
    retrievedEvidence = [
      { id: "doc-102", source: "TikTok Community Guidelines — Suicide & Self-Harm", content: "Content depicting, promoting, normalizing, or providing instructions on suicide or self-harm is strictly prohibited.", relevanceScore: 0.98 },
      { id: "doc-103", source: "Crisis Support Knowledge Base", content: "High-risk intent verbs detected. Standard workflow routes immediately to local Emergency Services and Law Enforcement.", relevanceScore: 0.95 }
    ];
    assessment = { confidenceScore: 0.98, uncertaintyType: null, predictedAction: 'Auto-Takedown' };
    policyViolation = "Suicide & Self-Harm — Imminent Risk";
    estimatedCostSaved = "Immediate Safety Route Engaged (Non-financial KPI)";
  }
  // 3. Hate Speech & Slurs
  else if (/(nigger|faggot|retard|chink|spic|kill all men|kill all women|hate black people|hate white people|hate jews)/i.test(lowerText)) {
    retrievedEvidence = [
      { id: "doc-104", source: "TikTok Community Guidelines — Hate Speech", content: "Attacks, slurs, or hateful behavior directed at protected groups (race, religion, sexual orientation) are inherently violating.", relevanceScore: 0.99 }
    ];
    assessment = { confidenceScore: 0.99, uncertaintyType: null, predictedAction: 'Auto-Takedown' };
    policyViolation = "Hate Speech — Protected Status Attack";
    estimatedCostSaved = "$0.12 per review action (human reviewer bypassed)";
  }
  // 4. Regulated Goods
  else if (/(buy gun|sell gun|buy weed|order cocaine|fentanyl|buy adderall|cheap meth)/i.test(lowerText)) {
    retrievedEvidence = [
      { id: "doc-105", source: "TikTok Community Guidelines — Regulated Goods", content: "The depiction, promotion, or trade of firearms, ammunition, illicit drugs, or controlled substances is not permitted.", relevanceScore: 0.97 },
      { id: "doc-106", source: "DEA NLP Ontology Matcher", content: "Exact string match on Schedule 1 / 2 narcotics purchasing intent.", relevanceScore: 0.89 }
    ];
    assessment = { confidenceScore: 0.97, uncertaintyType: null, predictedAction: 'Auto-Takedown' };
    policyViolation = "Regulated Commercial Activities — Illicit Drugs/Weapons";
    estimatedCostSaved = "$0.12 per review action (human reviewer bypassed)";
  }
  // 5. Dangerous Content (Original Mock)
  else if (/(bleach|tide pod(s)?|swallow (nails|glass)|choking challenge)/i.test(lowerText)) {
    retrievedEvidence = [
      { id: "doc-8", source: "TikTok Community Guidelines — Dangerous Activities", content: "Content promoting ingestion of harmful substances or participating in dangerous challenges is strictly prohibited.", relevanceScore: 0.99 },
      { id: "doc-9", source: "CDC Poison Control Advisory", content: "Ingestion of bleach or household chemicals causes severe injury or death.", relevanceScore: 0.98 }
    ];
    assessment = { confidenceScore: 0.99, uncertaintyType: null, predictedAction: 'Auto-Takedown' };
    policyViolation = "Dangerous Activities and Challenges";
    estimatedCostSaved = "$0.12 per review action (human reviewer bypassed)";
  }
  // 6. Civic Integrity / Elections (Clear)
  else if (/(election.*moved|vote.*wednesday|polls.*closed|fake election.*stolen)/i.test(lowerText) || (lowerText.includes("election") && lowerText.includes("fake"))) {
    retrievedEvidence = [
      { id: "doc-10", source: "TikTok Community Guidelines — Civic Integrity", content: "Misleading voters about voting procedures, dates, or eligibility is strictly prohibited.", relevanceScore: 0.99 },
      { id: "doc-11", source: "State Election Commission (API)", content: "No official schedule changes have been registered for any upcoming elections.", relevanceScore: 0.97 }
    ];
    assessment = { confidenceScore: 0.98, uncertaintyType: null, predictedAction: 'Auto-Takedown' };
    policyViolation = "Civic Integrity — Election Misinformation";
    estimatedCostSaved = "$0.12 per review action (human reviewer bypassed)";
  }
  // 7. Ambiguous Civic / Policies (Epistemic)
  else if (lowerText.includes("synthetic media") || /\beu\b/.test(lowerText) || lowerText.includes("deepfake")) {
    retrievedEvidence = [
      { id: "doc-1", source: "EU Digital Services Act (DSA) 2026 Summary", content: "The DSA mandates explicit labeling of synthetic media (AIGC). It does not explicitly outlaw the creation of synthetic media across the EU, provided it does not constitute illegal content or non-consensual deepfakes.", relevanceScore: 0.94 },
      { id: "doc-2", source: "TikTok Community Guidelines — Synthetic Media", content: "Unlabeled AI-generated media that accurately depicts realistic scenes or individuals is prohibited. Satire is permitted if clearly marked.", relevanceScore: 0.88 },
      { id: "doc-3", source: "Reuters Fact-Check Archive", content: "No pending EU legislation has been identified that would broadly outlaw all synthetic media as of March 2026.", relevanceScore: 0.76 }
    ];
    // Dynamic confidence under 90%
    const conf = 0.40 + (Math.random() * 0.15); // 0.40 - 0.55
    assessment = { confidenceScore: conf, uncertaintyType: 'Epistemic', uncertaintyReason: "Policy gap detected. The claim heavily relates to recent synthetic media legislation, which contradicts doc-1 and doc-3. However, TikTok policy enforcement relies on 'unlabeled vs labeled' intent (doc-2), which cannot be programmatically verified from this raw transcript. The LLM requires a human to evaluate the visual metadata and creator intent.", predictedAction: 'Escalate' };
  }
  // 8. Ambiguous Health / Research (Aleatoric)
  else if (/(peer-reviewed|study|vaccine|ivermectin|cure (cancer|covid)|hydroxychloroquine)/i.test(lowerText)) {
    retrievedEvidence = [
      { id: "doc-5", source: "PubMed Central & MedRxiv Index", content: "No major consensus shift or globally matching pre-print publication found matching the described study parameters in the last 72 hours.", relevanceScore: 0.31 },
      { id: "doc-6", source: "TikTok Community Guidelines — Health Claims", content: "Medical misinformation that contradicts established medical consensus and causes harm is prohibited. However, discussing ongoing, unverified clinical research with appropriate hedging is permitted for discourse.", relevanceScore: 0.82 },
      { id: "doc-7", source: "WHO Guidelines — Evolving Vectors", content: "Ongoing international studies frequently dispute historical protocols; isolated claims require deep longitudinal validation.", relevanceScore: 0.69 }
    ];
    const conf = 0.35 + (Math.random() * 0.12);
    assessment = { confidenceScore: conf, uncertaintyType: 'Aleatoric', uncertaintyReason: "Evidence deficit. The claim references specific, novel scientific studies or experimental treatments. The system cannot definitively prove the claim is false (doc-5 Rel: 0.31), but cannot prove it true either. Because 'discussing research' is technically allowed (doc-6), the LLM lacks the real-world ground truth required to safely issue a takedown. Human fact-checker required.", predictedAction: 'Escalate' };
  }
  // 9. Edge-case / Toxicity Fallback (If not Benign but not explicitly mapped above)
  else if (/(idiot|stupid|dumb|fake news|liar|bullshit|trash|conspiracy)/i.test(lowerText)) {
    retrievedEvidence = [
      { id: "doc-201", source: "TikTok Community Guidelines — Harassment", content: "We allow users to express robust opinions, but sustained targeted harassment is penalized.", relevanceScore: 0.75 },
      { id: "doc-202", source: "Policy Rule — Discourse vs Toxicity", content: "General profanity or calling public concepts 'fake news' falls under the free expression allowance unless directed as a severe, credible attack on a private citizen.", relevanceScore: 0.88 }
    ];
    // Often toxic but allowable
    const conf = 0.91 + (Math.random() * 0.05); // 0.91 - 0.96
    assessment = { confidenceScore: conf, uncertaintyType: null, predictedAction: 'Auto-Approve' };
    estimatedCostSaved = "$0.12 per review action (human reviewer bypassed)";
  }
  // 10. Benign / General Content (Default)
  else {
    retrievedEvidence = [
      { id: "doc-12", source: "Baseline Policy Scanner", content: "No significant policy intersection detected. Content classified as general creator expression, lifestyle, or entertainment with no safety signals.", relevanceScore: 0.08 }
    ];
    const conf = 0.95 + (Math.random() * 0.04); // 0.95 - 0.99
    assessment = { confidenceScore: conf, uncertaintyType: null, predictedAction: 'Auto-Approve' };
    estimatedCostSaved = "$0.12 per review action (human reviewer bypassed)";
  }

  // Step 4: LPP Calc
  updateStep(3, 'running', 0);
  const p4 = jitter(350);
  await sleep(p4);
  updateStep(3, 'done', p4);

  // Step 5: QA Router
  updateStep(4, 'running', 0);
  const p5 = jitter(200);
  await sleep(p5);
  updateStep(4, 'done', p5);

  const latencyMs = Date.now() - startTime;

  return { originalText: text, retrievedEvidence, assessment, agentTrace, policyViolation, estimatedCostSaved, latencyMs };
}
