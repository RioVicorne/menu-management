import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="text-center space-y-4 px-6">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Menu Planning App</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">Plan daily dishes, check inventory needs, and keep your kitchen organized.</p>
        <Link href="/app" className="inline-flex items-center justify-center px-4 py-2 rounded border bg-black text-white hover:opacity-90">Open Calendar</Link>
      </div>
    </div>
  );
}
