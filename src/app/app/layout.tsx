"use client";

import Link from "next/link";
import { Calendar, ChefHat, Package, Utensils, Home } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangToggle } from "@/components/lang-toggle";
import { useI18n } from "@/components/i18n";

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
	const { t } = useI18n();
	return (
		<div className="min-h-dvh bg-background text-foreground">
			<header className="sticky top-0 z-30 bg-background border-b border-border shadow-sm">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="h-16 flex items-center justify-between">
						<Link href="/app" className="flex items-center space-x-2 group">
							<div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
								<ChefHat className="h-6 w-6 text-blue-600 dark:text-blue-400" />
							</div>
							<span className="text-xl font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
								{t("appTitle")}
							</span>
						</Link>
						
						<nav className="hidden md:flex items-center space-x-1">
							<Link 
								href="/app" 
								className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground/90 hover:bg-muted hover:text-foreground transition-colors"
							>
								<Calendar className="h-4 w-4" />
								<span>{t("calendar")}</span>
							</Link>
							<Link 
								href="/app/ingredients" 
								className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground/90 hover:bg-muted hover:text-foreground transition-colors"
							>
								<Utensils className="h-4 w-4" />
								<span>{t("ingredients")}</span>
							</Link>
							<Link 
								href="/app/storage" 
								className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground/90 hover:bg-muted hover:text-foreground transition-colors"
							>
								<Package className="h-4 w-4" />
								<span>{t("storage")}</span>
							</Link>
							<Link 
								href="/app/recipes" 
								className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground/90 hover:bg-muted hover:text-foreground transition-colors"
							>
								<ChefHat className="h-4 w-4" />
								<span>{t("recipes")}</span>
							</Link>
						</nav>

						<div className="flex items-center gap-2">
							{/* Mobile menu button */}
							<div className="md:hidden">
								<button className="p-2 rounded-lg text-foreground/90 hover:bg-muted hover:text-foreground">
									<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
									</svg>
								</button>
							</div>
							<LangToggle />
							<ThemeToggle />
						</div>
					</div>
				</div>
			</header>
			
			<main className="flex-1">
				{children}
			</main>
		</div>
	)
}
