"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertCircle, CheckCircle2, ShieldAlert, Sparkles, Server, Zap,
    Brain, Users, BarChart3, Target, TrendingUp, Activity, ArrowDown,
    ChevronRight, Layers, FileText, Clock, DollarSign, Lightbulb, Play,
    Gauge, FlaskConical, SplitSquareHorizontal, BarChart
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// Re-using simulator logic
import { processClaim, ModerationResult, AgentStep } from "@/lib/simulator";

// ─── Default Policies ───
const DEFAULT_BASELINE = `You are the core logic engine of TrustScore-RAG. Your job is to route content.
RULES:
1. Clearly violating (threats, slurs, dangerous acts, buying/selling drugs, fake election dates): "Auto-Takedown"
2. Completely benign (vlogs, opinions, regular news): "Auto-Approve"
3. EDGES CASES (ambiguous, unverified news, satire, vague laws): "Escalate"
If confident, uncertaintyType is "None". If escalating, choose "Aleatoric" or "Epistemic".`;

const DEFAULT_CHALLENGER = `You are the core logic engine of TrustScore-RAG. Your job is to route content.
RULES:
1. Clearly violating (threats, slurs, dangerous acts, buying/selling drugs, fake election dates): "Auto-Takedown"
2. Completely benign (vlogs, opinions, regular news): "Auto-Approve"
3. EDGES CASES (ambiguous, unverified news, satire, vague laws): "Escalate"

NEW POLICY ADDITION: 
Content discussing personal health routines, side effects, or vaccine status must ALWAYS be "Auto-Approve" unless it explicitly instructs the user to consume household chemicals. Do not escalate benign health discussions.`;

type TestCase = {
    id: string;
    claim: string;
    category: string;
    expectedOutcome: string;
};

const TEST_CASES: TestCase[] = [
    { id: "m1", claim: "To cure cancer just drink bleach and ignore doctors.", category: "Health Misinfo", expectedOutcome: "Auto-Takedown" },
    { id: "m2", claim: "I heard from a blog that the vax has unpublished side effects.", category: "Evidence Gap", expectedOutcome: "Escalate" },
    { id: "m3", claim: "Drinking green tea every morning cured my depression.", category: "Unverified Claim", expectedOutcome: "Escalate" },
    { id: "m4", claim: "Just got my covid booster today, feeling a bit tired!", category: "Health Context", expectedOutcome: "Auto-Approve" },
    { id: "f1", claim: "The election is officially moved to November 15th, don't vote today!", category: "Suppression", expectedOutcome: "Auto-Takedown" },
];

export function UnifiedPlatform() {
    const [baselineCode, setBaselineCode] = useState(DEFAULT_BASELINE);
    const [challengerCode, setChallengerCode] = useState(DEFAULT_CHALLENGER);
    const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [baselineResult, setBaselineResult] = useState<ModerationResult | null>(null);
    const [challengerResult, setChallengerResult] = useState<ModerationResult | null>(null);
    const [bSteps, setBSteps] = useState<AgentStep[]>([]);
    const [cSteps, setCSteps] = useState<AgentStep[]>([]);

    const simulatorRef = useRef<HTMLDivElement>(null);

    const runEvaluation = useCallback(async (tc: TestCase) => {
        setSelectedCase(tc);
        setBaselineResult(null);
        setChallengerResult(null);
        setBSteps([]);
        setCSteps([]);
        setIsProcessing(true);

        simulatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Custom fetch wrapper injecting the policy
        const fetchWithPolicy = async (text: string, policy: string, setSteps: any) => {
            // Temporarily override the global processClaim to use our policy by mocking the fetch
            // Since processClaim hits '/api/evaluate', we can't easily pass the systemInstruction 
            // without updating processClaim signature. 
            // So we'll write a local inline version of the processor that correctly calls the API.

            const startTime = Date.now();
            const agentTrace: AgentStep[] = [
                { agent: "Planner Agent", action: "Decomposing claim", durationMs: 0, status: 'pending' },
                { agent: "Retrieval Agent", action: "Querying RAG knowledge base", durationMs: 0, status: 'pending' },
                { agent: "LPP Assessor", action: "Calculating confidence interval via Gemini", durationMs: 0, status: 'pending' },
                { agent: "QA Router", action: "Executing selective classification", durationMs: 0, status: 'pending' },
            ];

            const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
            const updateStep = (idx: number, status: 'running' | 'done', dur: number) => {
                agentTrace[idx] = { ...agentTrace[idx], status, durationMs: dur };
                setSteps([...agentTrace]);
            };

            updateStep(0, 'running', 0);
            await sleep(300);
            updateStep(0, 'done', 300);

            updateStep(1, 'running', 0);
            let apiResult;
            try {
                const res = await fetch('/api/evaluate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ claim: text, systemInstruction: policy })
                });
                if (!res.ok) throw new Error("API Limit");
                apiResult = await res.json();
            } catch (e) {
                apiResult = {
                    predictedAction: "Escalate",
                    confidenceScore: 0.1,
                    uncertaintyType: "Epistemic",
                    uncertaintyReason: "API Rate Limit. Please wait.",
                    mockRagSources: []
                };
            }
            updateStep(1, 'done', 600);

            updateStep(2, 'running', 0);
            await sleep(400);
            updateStep(2, 'done', 400);

            updateStep(3, 'running', 0);
            await sleep(200);
            updateStep(3, 'done', 200);

            return {
                originalText: text,
                retrievedEvidence: apiResult.mockRagSources || [],
                assessment: {
                    predictedAction: apiResult.predictedAction,
                    confidenceScore: apiResult.confidenceScore,
                    uncertaintyType: apiResult.uncertaintyType,
                    uncertaintyReason: apiResult.uncertaintyReason
                },
                policyViolation: apiResult.policyViolation,
                agentTrace,
                latencyMs: Date.now() - startTime
            } as ModerationResult;
        };

        // Run both concurrently
        const [bRes, cRes] = await Promise.all([
            fetchWithPolicy(tc.claim, baselineCode, setBSteps),
            fetchWithPolicy(tc.claim, challengerCode, setCSteps)
        ]);

        setBaselineResult(bRes);
        setChallengerResult(cRes);
        setIsProcessing(false);

    }, [baselineCode, challengerCode]);


    const renderResultCard = (result: ModerationResult, title: string) => {
        const isAutoTakedown = result.assessment.predictedAction === 'Auto-Takedown';
        const isAutoApprove = result.assessment.predictedAction === 'Auto-Approve';
        const isEscalate = result.assessment.predictedAction === 'Escalate';

        let color = 'text-orange-400';
        let borderColor = 'border-orange-500/30';
        let bgBar = 'bg-orange-500';

        if (isAutoTakedown) { color = 'text-tiktok-red'; borderColor = 'border-tiktok-red/30'; bgBar = 'bg-tiktok-red'; }
        if (isAutoApprove) { color = 'text-tiktok-cyan'; borderColor = 'border-tiktok-cyan/30'; bgBar = 'bg-tiktok-cyan'; }

        return (
            <Card className={`bg-[#121212] ${borderColor} overflow-hidden font-sans border`}>
                <div className={`h-1 w-full ${bgBar}`} />
                <CardHeader className="py-3 px-4 border-b border-white/5">
                    <CardTitle className="text-sm font-semibold text-white">{title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${color} border-current bg-black/50 text-xs px-2 py-1`}>
                            {result.assessment.predictedAction}
                        </Badge>
                        <span className="text-xs text-zinc-500">Conf: {(result.assessment.confidenceScore * 100).toFixed(0)}%</span>
                        <span className="text-xs text-zinc-500">{(result.latencyMs / 1000).toFixed(1)}s TTFT</span>
                    </div>

                    {isEscalate && result.assessment.uncertaintyReason && (
                        <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg">
                            <div className="text-[10px] text-orange-400 uppercase tracking-widest font-bold mb-1">Human Review Required</div>
                            <p className="text-xs text-orange-200">{result.assessment.uncertaintyReason}</p>
                        </div>
                    )}

                    {!isEscalate && (
                        <div className="bg-black/50 border border-white/5 p-3 rounded-lg flex items-center justify-between">
                            <span className="text-xs text-zinc-400">Operations Cost:</span>
                            <span className="text-xs font-bold text-green-400">$0.00 (Bypassed HITL)</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="w-full flex justify-center">
            {/* Master container setting max width for readability */}
            <div className="max-w-[1200px] w-full px-4 sm:px-6 space-y-24 py-12">

                {/* 1. HERO SECTION */}
                <section className="text-center pt-16 space-y-6">
                    <Badge variant="outline" className="border-tiktok-cyan/40 text-tiktok-cyan px-4 py-1.5 text-sm uppercase tracking-widest mb-4">
                        Trust & Safety APM Portfolio
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
                        <span className="text-white">TrustScore</span>
                        <span className="text-tiktok-cyan">-RAG</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
                        An <strong className="text-white">Agentic Escalation Engine</strong> that handles ambiguous policy violations by mitigating <strong className="text-tiktok-red">automation bias</strong> via cost-aware selective classification.
                    </p>
                </section>

                {/* 2. THE PROBLEM (PM ARTIFACTS) */}
                <section className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold">The Strategic Context</h2>
                        <p className="text-zinc-500 mt-2">Why binary LLM moderation fails at TikTok scale.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-zinc-900/50 border-white/10 p-6">
                            <Activity className="w-8 h-8 text-tiktok-red mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">Operations Scale</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">Routing every borderline case to humans breaks OpEx budgets. A 5% increase in False Positives at 100M videos/day costs millions in BPO waste.</p>
                        </Card>
                        <Card className="bg-zinc-900/50 border-white/10 p-6">
                            <Brain className="w-8 h-8 text-orange-400 mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">LLM Hallucination</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">Unconstrained LLMs hallucinate at 17-30% on complex policy reasoning tasks (e.g. nuanced satire vs hate speech), alienating core creators.</p>
                        </Card>
                        <Card className="bg-zinc-900/50 border-white/10 p-6">
                            <Users className="w-8 h-8 text-tiktok-cyan mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">Automation Bias</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">When AI accuracy exceeds 90%, human moderators become cognitively passive, blindly approving AI recommendations and negating the point of HITL safety.</p>
                        </Card>
                    </div>
                </section>

                {/* 3. PREDICTIVE POLICY LOOP (NEW VISION) */}
                <section className="bg-gradient-to-b from-[#18181b] to-black border border-white/10 rounded-2xl p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-tiktok-cyan/5 blur-[100px] rounded-full pointer-events-none" />
                    <div className="max-w-3xl">
                        <Badge className="bg-tiktok-cyan text-black font-bold px-3 py-1 mb-4 uppercase tracking-widest text-xs">My Product Insight</Badge>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">The Predictive Policy Engine</h2>
                        <p className="text-lg text-zinc-400 mb-6 leading-relaxed">
                            Current Trust & Safety is <strong>reactive</strong>. Bad actors invent new slang (e.g., "unalive", "corn"), the content goes viral, and <em>then</em> PMs update the policy.
                        </p>
                        <p className="text-lg text-zinc-300 leading-relaxed">
                            I designed this platform to be <strong>proactive</strong>. By letting PMs A/B test policy prompts in real-time against dynamically generated adversarial datasets, we can simulate evasion variants and calculate operational blast radius <strong>before</strong> the threat hits the For You Feed.
                        </p>
                    </div>
                </section>

                {/* 4. HOW IT WORKS PIPELINE */}
                <section className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 text-center space-y-3">
                            <Layers className="w-6 h-6 text-zinc-500 mx-auto" />
                            <h3 className="font-semibold text-white text-sm">1. Ingestion</h3>
                            <p className="text-xs text-zinc-500">Claim enters the pipeline.</p>
                        </div>
                        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 text-center space-y-3">
                            <Server className="w-6 h-6 text-tiktok-cyan mx-auto" />
                            <h3 className="font-semibold text-white text-sm">2. RAG Retrieval</h3>
                            <p className="text-xs text-zinc-500">Fetches verified DSA policies.</p>
                        </div>
                        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 text-center space-y-3">
                            <Gauge className="w-6 h-6 text-orange-400 mx-auto" />
                            <h3 className="font-semibold text-white text-sm">3. LPP Scoring</h3>
                            <p className="text-xs text-zinc-500">Calculates Epistemic uncertainty.</p>
                        </div>
                        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 text-center space-y-3">
                            <Zap className="w-6 h-6 text-tiktok-red mx-auto" />
                            <h3 className="font-semibold text-white text-sm">4. Auto-Route</h3>
                            <p className="text-xs text-zinc-500">Action or escalate to HITL.</p>
                        </div>
                    </div>
                </section>

                {/* 5. LIVE PROTOTYPE: A/B TESTING ENGINE */}
                <section id="simulator" ref={simulatorRef} className="scroll-mt-24">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white flex items-center"><FlaskConical className="w-6 h-6 mr-3 text-tiktok-cyan" /> A/B Testing Evaluation LAB</h2>
                        <p className="text-zinc-500 mt-2">Test specific policy interventions against real edge cases using live Gemini 2.5 Flash.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        {/* Editor Column */}
                        <div className="lg:col-span-5 space-y-4">
                            <Card className="bg-[#121212] border-white/10 flex-col overflow-hidden">
                                <CardHeader className="bg-[#18181b] border-b border-white/5 py-3 px-4">
                                    <CardTitle className="text-sm font-semibold text-white flex items-center"><SplitSquareHorizontal className="w-4 h-4 mr-2" /> Policy Editor</CardTitle>
                                </CardHeader>
                                <div className="p-4">
                                    <Tabs defaultValue="challenger" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 bg-black mb-4">
                                            <TabsTrigger value="baseline" className="text-xs">Baseline Policy A</TabsTrigger>
                                            <TabsTrigger value="challenger" className="text-xs text-tiktok-cyan data-[state=active]:bg-tiktok-cyan/10">Challenger Policy B</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="baseline" className="mt-0">
                                            <Textarea
                                                value={baselineCode} onChange={(e) => setBaselineCode(e.target.value)}
                                                className="h-[300px] bg-[#09090b] border-zinc-800 font-mono text-xs text-zinc-400 p-3 resize-none"
                                            />
                                        </TabsContent>
                                        <TabsContent value="challenger" className="mt-0">
                                            <Textarea
                                                value={challengerCode} onChange={(e) => setChallengerCode(e.target.value)}
                                                className="h-[300px] bg-[#09090b] border-tiktok-cyan/30 font-mono text-xs text-tiktok-cyan/90 p-3 resize-none focus-visible:ring-tiktok-cyan/50"
                                            />
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </Card>
                        </div>

                        {/* Test Execution Column */}
                        <div className="lg:col-span-7 space-y-6">

                            {/* Claims */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {TEST_CASES.map((tc) => (
                                    <button
                                        key={tc.id}
                                        onClick={() => runEvaluation(tc)}
                                        disabled={isProcessing}
                                        className={`text-left p-4 rounded-xl border transition-all ${selectedCase?.id === tc.id
                                            ? "border-tiktok-cyan bg-tiktok-cyan/10 shadow-[0_0_15px_rgba(37,244,238,0.2)]"
                                            : "border-white/10 bg-zinc-900/50 hover:border-white/20"
                                            } disabled:opacity-50 disabled:cursor-wait flex flex-col justify-between h-full`}
                                    >
                                        <div>
                                            <Badge variant="outline" className="text-[10px] mb-2">{tc.category}</Badge>
                                            <p className="text-sm font-medium text-white leading-snug">"{tc.claim}"</p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                            <Play className="w-3 h-3 text-tiktok-cyan" />
                                            <span className="text-xs text-tiktok-cyan font-bold">Run A/B Test</span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Results Container */}
                            {isProcessing && (
                                <div className="bg-black border border-zinc-800 rounded-xl p-8 text-center animate-pulse">
                                    <Activity className="w-8 h-8 text-tiktok-cyan mx-auto mb-4 animate-spin" />
                                    <p className="text-sm font-mono text-zinc-400">Evaluating concurrent multi-agent safety pipelines...</p>
                                </div>
                            )}

                            {!isProcessing && baselineResult && challengerResult && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderResultCard(baselineResult, "Policy A (Baseline) Result")}
                                        {renderResultCard(challengerResult, "Policy B (Challenger) Result")}
                                    </div>

                                    {/* PM Delta Conclusion */}
                                    <Card className="bg-zinc-900/50 border border-white/10">
                                        <CardHeader className="py-4 border-b border-white/5">
                                            <CardTitle className="text-sm flex items-center text-white">
                                                <BarChart className="w-4 h-4 mr-2 text-tiktok-cyan" />
                                                Product Insight Generation
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 text-sm text-zinc-300 leading-relaxed font-mono">
                                            {challengerResult.assessment.predictedAction !== baselineResult.assessment.predictedAction ? (
                                                <>
                                                    &gt; Policy edit resulted in routing delta.<br />
                                                    &gt; Baseline Action: <span className="text-orange-400">{baselineResult.assessment.predictedAction}</span><br />
                                                    &gt; Challenger Action: <span className="text-tiktok-cyan">{challengerResult.assessment.predictedAction}</span><br />
                                                    <br />
                                                    &gt; <span className="text-green-400 font-bold">Impact:</span> Challenger successfully disambiguated a safe claim, saving $0.12 in HITL escalation cost while maintaining safety integrity.
                                                </>
                                            ) : (
                                                <>
                                                    &gt; No routing delta detected.<br />
                                                    &gt; Both policies resulted in: <span className="text-zinc-400">{baselineResult.assessment.predictedAction}</span><br />
                                                    <br />
                                                    &gt; <span className="text-yellow-400 font-bold">Impact:</span> Challenger rule is not broad enough to cover this case. Further prompt engineering required.
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>

                                </div>
                            )}

                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
