import { UnifiedPlatform } from "@/components/UnifiedPlatform";
import { ShieldAlert } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-tiktok-cyan selection:text-black font-sans">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-tiktok-red" />
            <span className="font-bold text-sm">TrustScore-RAG</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <a href="https://github.com/AliHasan-786/TrustScore" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </nav>

      {/* Dynamic Background Gradients */}
      <div className="fixed inset-0 z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-tiktok-cyan/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-tiktok-red/10 blur-[120px]" />
      </div>

      {/* Content */}
      <UnifiedPlatform />

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 text-center pb-24">
        <p className="text-zinc-500 text-sm max-w-2xl mx-auto">
          TrustScore-RAG — Built as an undeniable portfolio demonstration of Product Management, Trust & Safety architecture, and AI-native product intuition.
        </p>
        <p className="text-zinc-600 text-xs mt-2">
          Not affiliated with TikTok or ByteDance. System is a strategic prototype.
        </p>
      </footer>
    </main>
  );
}
