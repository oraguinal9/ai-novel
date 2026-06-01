import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AI互动小说 — 你的选择改变一切", template: "%s | AI互动小说" },
  description: "AI实时生成分支剧情，16个世界观可选：仙侠/都市/末日/宫斗/武侠/科幻/灵异/西幻/赛博/重生/怪谈/年代/游戏/玄幻/大女主/甜宠。每个选择影响属性与结局。",
  keywords: ["AI互动小说", "AI生成故事", "互动叙事", "分支剧情", "文字冒险", "选择取向", "AI小说", "仙侠", "都市", "重生", "规则怪谈"],
  authors: [{ name: "执笔惊鸿" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  openGraph: {
    title: "AI互动小说 — 你的选择改变一切",
    description: "AI实时生成分支剧情。16个世界观，每个选择都影响结局。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: { card: "summary_large_image", title: "AI互动小说", description: "AI实时生成，你的选择改变一切" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head><meta name="baidu-site-verification" content="codeva-FoDOCkuQeR" /></head>
      <body className="min-h-screen bg-novel-bg">
        {/* Particle background */}
        <div className="particles">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 20% 30%, rgba(201,169,110,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(100,100,200,0.04) 0%, transparent 50%)",
          }} />
        </div>
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
