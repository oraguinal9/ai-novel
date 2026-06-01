import type { WorldConfig, CharacterPreset, StatDef } from "./worlds";

export interface GameState {
  worldId: string;
  character: string;
  stats: Record<string, number>;
  chapter: number;
  history: StorySegment[];
  summary: string;
}

export interface StorySegment {
  chapter: number;
  text: string;
  choices: ChoiceOption[];
  chosen: number;
}

export interface ChoiceOption {
  text: string;
  effects: Record<string, number>;
}

export function buildPrompt(state: GameState, world: WorldConfig, charPreset: CharacterPreset): string {
  const stats = world.stats.map(s => s.icon + s.name + ":" + (state.stats[s.key] ?? 0)).join(" ");

  const recentHistory = state.history.slice(-4).map(h => {
    const choiceText = h.chosen >= 0 ? "\n  player chose: " + (h.choices[h.chosen]?.text ?? "...") : "";
    return "Ch" + h.chapter + ": " + h.text.slice(0, 200) + "..." + choiceText;
  }).join("\n\n");

  return [
    "You are an AI narrator for an interactive novel. Generate branching story content in Chinese.",
    "",
    "## World Setting",
    world.setting,
    "",
    "## Main Character",
    charPreset.name + ": " + charPreset.background,
    charPreset.storyHook,
    "",
    "## Current Stats",
    stats,
    "",
    "## Recent Story",
    recentHistory,
    "",
    "## Story Summary",
    state.summary || "The story is just beginning.",
    "",
    "## Writing Rules - 番茄爆款铁律",
    "1. 前两句出钩子：直接进冲突。不写背景、不写风景、不写\"你站在...\"。",
    "2. 对话占80%：短句你来我往。一人一句不超过20字。连续对话不超过4句，中间插动作。",
    "3. 每段必有一爽：打脸/反转/数字变化/战力碾压/身份揭露。五选一。",
    "4. 去AI味铁则：",
    "   - 打破排比对称。\"不是...而是...\"禁用。",
    "   - 加废话。对话里塞一句不推动剧情的闲话。",
    "   - 情绪最高点用最小的话。不说\"你很愤怒\"，写\"你把剑握紧。指节发白。\"",
    "   - 用破折号打断自己。\"我以为你——算了。\"",
    "5. 结尾必须是钩子：悬念/反转/陌生消息/危机预告。禁用\"你离开了\"\"天黑了\"\"你休息了\"。",
    "6. 短！100-180字。砍掉所有心理描写和景物描写。",
    "7. 通过角色的眼睛看世界：不是客观描写，是你看到了什么+这让你想到什么。",
    "8. " + world.choiceStyle,
    "",
    "## Output Format",
    "写100-180字正文。短句。对话为主。结尾钩子。",
    "然后 ---META--- 然后一行JSON。",
    "",
    "正确示例：",
    "\"你欠我的。\"他头也没回。你握紧剑——他的手已经按在刀柄上。三秒。谁都没动。然后他说：\"他们来了。\"你听到了脚步声。不止一个人。",
    "",
    "---META---",
    '{"summary":"一句话","choices":[{"text":"拔剑先动手","effects":{"atk":5}},{"text":"问他欠什么","effects":{"def":3}},{"text":"转身就跑","effects":{"hp":-10}}]}',
    "",
    "正文不要用引号包裹。JSON放最后。",
    "现在生成第" + state.chapter + "章。",
  ].join("\n");
}

export function applyEffects(stats: Record<string, number>, effects: Record<string, number>): Record<string, number> {
  const next = { ...stats };
  for (const [key, delta] of Object.entries(effects)) {
    next[key] = (next[key] ?? 0) + delta;
  }
  return next;
}

export function createInitialState(worldId: string, charPreset: CharacterPreset): GameState {
  return {
    worldId,
    character: charPreset.name,
    stats: { ...charPreset.initialStats },
    chapter: 1,
    history: [],
    summary: "",
  };
}

export function checkGameOver(stats: Record<string, number>, statDefs: StatDef[]): string | null {
  const hpStat = statDefs.find(s => s.key === "hp");
  const hp = hpStat ? (stats[hpStat.key] ?? 100) : 100;
  if (hp <= 0) return "You lost consciousness. The story pauses here...";

  const sanityStat = statDefs.find(s => s.key === "sanity");
  if (sanityStat && (stats[sanityStat.key] ?? 100) <= 0) return "Your sanity has shattered. You cannot continue...";

  const daoStat = statDefs.find(s => s.key === "daoHeart");
  if (daoStat && (stats[daoStat.key] ?? 100) <= 0) return "Your Dao heart is broken. The remnant soul consumes your consciousness...";

  return null;
}
