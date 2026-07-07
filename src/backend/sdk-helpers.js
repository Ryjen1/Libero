/**
 * SDK Helpers — QVAC local AI only.
 *
 * Dual-mode: tries to load the real QVAC SDK, falls back to simulation
 * if hardware/dependencies prevent initialization.
 */

// ── QVAC AI ──────────────────────────────────────────────────────────────

class QVACSimulator {
  constructor() {
    this.status = 'simulated';
    this.modelName = 'Simulated LLaMA 3.2 1B';
  }

  async init() {
    console.log('[QVAC] Simulation mode — no local inference available');
  }

  async analyze(events, prompt) {
    const formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];
    const styles = ['counter-attacking', 'possession-based', 'high-pressing', 'direct play'];
    const evCount = events?.length ?? 0;

    const formation = formations[evCount % formations.length];
    const style = styles[(evCount + 1) % styles.length];

    const lines = [
      `**Tactical Analysis** (${evCount} events tracked)`,
      '',
      `Formation: ${formation} | Style: ${style}`,
      '',
    ];

    if (evCount === 0) {
      lines.push('No match events yet. Start logging to see live analysis.');
    } else {
      const goals = events.filter(e => e.type === 'goal').length;
      const cards = events.filter(e => e.type === 'card').length;
      const subs = events.filter(e => e.type === 'substitution').length;

      lines.push(`Goals: ${goals} | Cards: ${cards} | Subs: ${subs}`);
      lines.push('');

      if (goals > 0) lines.push(`Open, attacking match with ${goals} goal(s).`);
      if (cards > 2) lines.push(`High card count — aggressive pressing, physical play.`);
      if (subs > 0) lines.push(`${subs} substitution(s) — tactical adjustments underway.`);

      const winProb = 45 + Math.floor(Math.random() * 20);
      lines.push('');
      lines.push(`Win Probability: ${winProb}%`);
      lines.push(`Recommendation: Maintain ${formation} shape, exploit ${style === 'counter-attacking' ? 'flanks' : 'central channels'}.`);
    }

    return { text: lines.join('\n'), streamed: false, simulated: true };
  }
}

class QVACRunner {
  constructor() {
    this.status = 'loading';
    this.modelId = null;
    this.modelName = 'LLaMA 3.2 1B (Q4)';
  }

  async init() {
    const { loadModel, LLAMA_3_2_1B_INST_Q4_0, completion, unloadModel } = await import('@qvac/sdk');
    this._loadModel = loadModel;
    this._completion = completion;
    this._unloadModel = unloadModel;

    this.modelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      onProgress: (p) => {
        console.log(`[QVAC] Downloading model: ${p.percentage.toFixed(0)}%`);
      },
    });
    this.status = 'ready';
  }

  async analyze(events, prompt) {
    const eventSummary = events?.map(e =>
      `${e.minute || '?'}' — ${e.type}: ${e.description || e.team || ''}`
    ).join('\n') || 'No events recorded yet.';

    const systemPrompt = `You are Libero AI, a football tactical analyst.
Provide concise, insightful analysis of match events.
Always include: tactical observations, win probability, recommendation.
Keep responses under 150 words.`;

    const userMessage = prompt ||
      `Analyze this match:\n\n${eventSummary}`;

    const result = this._completion({
      modelId: this.modelId,
      history: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: true,
    });

    let fullText = '';
    for await (const token of result.tokenStream) {
      fullText += token;
    }

    return { text: fullText, streamed: true, simulated: false };
  }

  async destroy() {
    if (this.modelId) {
      await this._unloadModel({ modelId: this.modelId });
    }
  }
}

// ── Factory ──────────────────────────────────────────────────────────────

export async function createSDKHelpers() {
  let ai;

  try {
    const runner = new QVACRunner();
    await runner.init();
    ai = runner;
    console.log('[SDK] QVAC initialized (real)');
  } catch (err) {
    console.warn('[SDK] QVAC fallback to simulation:', err.message);
    ai = new QVACSimulator();
    await ai.init();
  }

  return {
    aiStatus: ai.status,
    runAnalysis: (events, prompt) => ai.analyze(events, prompt),
  };
}
