import Link from "next/link";

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-dvh bg-background">
			<header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
				<div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
					<Link href="/app" className="font-semibold">Menu Planner</Link>
					<nav className="flex items-center gap-3 text-sm">
						<Link href="/app" className="px-2 py-1 rounded hover:bg-muted">Calendar</Link>
						<Link href="/app/ingredients" className="px-2 py-1 rounded hover:bg-muted">Ingredients</Link>
						<Link href="/app/storage" className="px-2 py-1 rounded hover:bg-muted">Storage</Link>
					</nav>
				</div>
			</header>
			<main className="mx-auto max-w-6xl px-4 py-6">
				{children}
			</main>
		</div>
	)
}
