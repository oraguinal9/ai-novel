import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-novel-bg">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-slate-500 hover:text-white">← 返回首页</Link>
          <h1 className="text-2xl font-bold text-white mt-4">使用手册</h1>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          {/* 快速上手 */}
          <section>
            <h2 className="text-lg font-bold text-novel-accent mb-3">快速上手</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-white font-bold">1. 选世界观</span> — 16个世界观覆盖仙侠、都市、科幻、宫斗等热门题材，挑一个感兴趣的。</p>
              <p><span className="text-white font-bold">2. 选角色</span> — 每个世界有1-2个预设身份，各有不同的背景故事和初始属性。</p>
              <p><span className="text-white font-bold">3. AI开始写</span> — 选择后AI实时流式生成第一章，打字机效果显示。</p>
              <p><span className="text-white font-bold">4. 做出选择</span> — 每章结束后弹出2-3个选项，每个选项会改变你的属性值。</p>
              <p><span className="text-white font-bold">5. 推进剧情</span> — 你的选择决定故事走向，直到达成结局。</p>
            </div>
          </section>

          {/* 属性系统 */}
          <section>
            <h2 className="text-lg font-bold text-novel-accent mb-3">属性系统</h2>
            <p className="text-sm mb-2">每个世界有独立的5维属性体系：</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-novel-panel/60 rounded-lg p-3">
                <p className="text-white font-bold">仙侠</p>
                <p className="text-xs text-slate-400">攻击·防御·气血·道心·灵石</p>
              </div>
              <div className="bg-novel-panel/60 rounded-lg p-3">
                <p className="text-white font-bold">都市</p>
                <p className="text-xs text-slate-400">异能·抗性·生命·理智·资金</p>
              </div>
              <div className="bg-novel-panel/60 rounded-lg p-3">
                <p className="text-white font-bold">重生</p>
                <p className="text-xs text-slate-400">手段·城府·心态·财富·先知</p>
              </div>
              <div className="bg-novel-panel/60 rounded-lg p-3">
                <p className="text-white font-bold">甜宠</p>
                <p className="text-xs text-slate-400">魅力·隐忍·心力·感情·信任</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">绿色=属性提升，红色=属性下降。某些属性归零会触发死亡/失败结局。</p>
          </section>

          {/* 核心功能 */}
          <section>
            <h2 className="text-lg font-bold text-novel-accent mb-3">游戏功能</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-white">📥 导出</span> — 游戏页顶栏，下载完整剧情为TXT文件。</p>
              <p><span className="text-white">📤 分享</span> — 一键复制全部剧情到剪贴板。</p>
              <p><span className="text-white">↩ 回退</span> — 退回上一步重新选择。后悔药！</p>
              <p><span className="text-white">📜 回顾</span> — 右侧抽屉查看所有已发生章节。</p>
              <p><span className="text-white">登录存档</span> — 注册后每次选择自动存档，下次继续。</p>
            </div>
          </section>

          {/* 额度说明 */}
          <section>
            <h2 className="text-lg font-bold text-novel-accent mb-3">额度说明</h2>
            <div className="bg-novel-panel/60 rounded-lg p-4 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span>未登录体验</span>
                <span className="text-white font-bold">5次</span>
              </div>
              <div className="flex justify-between py-2">
                <span>注册用户</span>
                <span className="text-white font-bold">30次</span>
              </div>
              <p className="text-xs text-slate-500 mt-3">每生成一章消耗1次。次数用完会提示，刷新页面可查看剩余次数。</p>
            </div>
          </section>

          {/* 写作风格 */}
          <section>
            <h2 className="text-lg font-bold text-novel-accent mb-3">AI写作风格</h2>
            <p className="text-sm">AI采用番茄爆款风格：</p>
            <ul className="text-sm space-y-1 mt-2 list-disc list-inside text-slate-400">
              <li>对话占80%，短句快节奏</li>
              <li>每段结尾留钩子</li>
              <li>去AI味——加废话毛边、破折号打断、情绪收着写</li>
              <li>每章100-180字，砍光心理和景物描写</li>
            </ul>
          </section>

          {/* 常见问题 */}
          <section>
            <h2 className="text-lg font-bold text-novel-accent mb-3">常见问题</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-white font-bold">Q: 生成太慢？</p>
                <p className="text-slate-400">AI在构思中，一般5-15秒开始出字。如果30秒还没反应，点重试。</p>
              </div>
              <div>
                <p className="text-white font-bold">Q: 剧情不满意？</p>
                <p className="text-slate-400">点↩回退重新选择，或者刷新页面重开。</p>
              </div>
              <div>
                <p className="text-white font-bold">Q: 能自定义世界观吗？</p>
                <p className="text-slate-400">暂不支持。后续会开放自定义功能。</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 text-center">
          <Link href="/" className="text-novel-accent hover:underline text-sm">开始你的冒险 →</Link>
        </div>
      </div>
    </div>
  );
}
