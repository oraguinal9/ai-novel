/** 剧本模式引擎 */

export interface ScriptNode {
  id: string;
  chapter: number;
  title: string;
  summary: string;
  choices: ScriptChoice[];
  isEnding?: boolean;
}

export interface ScriptChoice {
  text: string;
  nextNode: string;
  effects: Record<string, number>;
}

export interface StoryScript {
  title: string;
  worldId: string;
  character: string;
  startNode: string;
  nodes: ScriptNode[];
}

export interface ScriptGameState {
  script: StoryScript;
  currentNodeId: string;
  history: ScriptHistoryEntry[];
  stats: Record<string, number>;
  summary: string;
}

export interface ScriptHistoryEntry {
  nodeId: string;
  chapter: number;
  title: string;
  text: string;
  chosenChoice: number;
}

/** Parse a simple markdown-like format into StoryScript.
 * Format:
 *   ## 节点ID: 标题
 *   概述文字...
 *   - [选项1] -> 下一节点ID
 *   - [选项2] -> 下一节点ID
 */
export function parseScript(text: string, worldId: string, character: string): StoryScript | null {
  try {
    const lines = text.split("\n");
    const nodes: ScriptNode[] = [];
    let current: Partial<ScriptNode> | null = null;
    let chapterCounter = 0;
    let firstNodeId = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Node header: ## id: title
      const headerMatch = line.match(/^##\s+(\S+):\s*(.+)/);
      if (headerMatch) {
        if (current && current.id && current.summary) {
          current.chapter = ++chapterCounter;
          nodes.push(current as ScriptNode);
        }
        const id = headerMatch[1];
        if (!firstNodeId) firstNodeId = id;
        current = {
          id,
          title: headerMatch[2] || id,
          summary: "",
          choices: [],
          isEnding: false,
        };
        continue;
      }

      // Choice line: - [选项] -> 目标ID
      const choiceMatch = line.match(/^-\s*\[(.+)\]\s*->\s*(\S+)/);
      if (choiceMatch && current) {
        current.choices = current.choices || [];
        current.choices.push({
          text: choiceMatch[1],
          nextNode: choiceMatch[2],
          effects: {},
        });
        continue;
      }

      // Ending marker
      if (line.match(/^\[结局\]/i) && current) {
        current.isEnding = true;
        continue;
      }

      // Summary text (accumulate non-empty lines that aren't choices)
      if (current && line && !line.startsWith("##") && !line.match(/^-\s*\[.+\]\s*->/)) {
        if (current.summary) current.summary += "\n" + line;
        else current.summary = line;
      }
    }

    // Last node
    if (current && current.id && current.summary) {
      current.chapter = ++chapterCounter;
      nodes.push(current as ScriptNode);
    }

    if (nodes.length === 0) return null;

    return {
      title: nodes[0]?.title || "未命名剧本",
      worldId,
      character,
      startNode: firstNodeId,
      nodes,
    };
  } catch {
    return null;
  }
}

/** Build prompt for a specific script node */
export function buildScriptPrompt(state: ScriptGameState): string {
  const node = state.script.nodes.find(n => n.id === state.currentNodeId);
  if (!node) return "";

  const stats = Object.entries(state.stats).map(([k, v]) => k + ":" + v).join(" ");

  const recentHistory = state.history.slice(-3).map(h =>
    "Ch" + h.chapter + " " + h.title + ": " + (h.chosenChoice >= 0 ? " chose " + (node?.choices[h.chosenChoice]?.text ?? "") : "")
  ).join("\n");

  return [
    "You are a web novel writer. Write one story segment based on the outline below.",
    "",
    "## Current Scene: " + node.title,
    "What happens: " + node.summary,
    "",
    "## Character Stats",
    stats,
    "",
    "## Recent Path",
    recentHistory || "Start of story.",
    "",
    "## Writing Rules",
    "1. 100-180 chars. Short sentences. Dialog-driven. Fast pace.",
    "2. Start with a hook. End with suspense.",
    "3. No description. No inner monologue. Action and dialog only.",
    "4. Natural speech: interruptions, half-sentences, slang.",
    "5. Show emotions through actions, never state them directly.",
    "6. End with the choices offered below, make them feel natural.",
    "",
    "## Output Format",
    "Write the story text (100-180 chars). Then ---META--- then one line JSON:",
    "",
    "Story text here...",
    "",
    "---META---",
    JSON.stringify({
      summary: "one sentence",
      choices: node.choices.map(c => ({
        text: c.text,
        effects: c.effects,
      })),
    }),
    "",
    "Generate scene: " + node.title,
  ].join("\n");
}

/** Find node by ID */
export function getNode(script: StoryScript, nodeId: string): ScriptNode | undefined {
  return script.nodes.find(n => n.id === nodeId);
}

/** Check if node is an ending */
export function isEnding(script: StoryScript, nodeId: string): boolean {
  return script.nodes.find(n => n.id === nodeId)?.isEnding ?? false;
}

/** Create initial script state */
export function createScriptState(script: StoryScript, initialStats: Record<string, number>): ScriptGameState {
  return {
    script,
    currentNodeId: script.startNode,
    history: [],
    stats: { ...initialStats },
    summary: "",
  };
}
