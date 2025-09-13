'use client';

import { Link, ChefHat, Calendar, Utensils, Package } from "lucide-react";
import { useI18n } from "../i18n";
import { LangToggle } from "../lang-toggle";

   
export default function AppHeader() {
	const { t } = useI18n();
	return (
		<header className="sticky top-0 z-30 bg-background border-b border-border shadow-sm">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="h-16 flex items-center justify-between">
					<Link href="/" className="flex items-center space-x-2 group">
						<div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors" suppressHydrationWarning>
							<ChefHat className="h-6 w-6 text-blue-600 dark:text-blue-400" />
						</div>
						<span className="text-xl font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" suppressHydrationWarning>
							{t("appTitle")}
						</span>
					</Link>
					
					<nav className="hidden md:flex items-center space-x-1">
						<Link 
							href="/" 
							className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground/90 hover:bg-muted hover:text-foreground transition-colors"
						>
							<Calendar className="h-4 w-4" />
							<span suppressHydrationWarning>{t("calendar")}</span>
						</Link>
						<Link 
							href="/ingredients" 
							className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground/90 hover:bg-muted hover:text-foreground transition-colors"
						>
							<Utensils className="h-4 w-4" />
							<span suppressHydrationWarning>{t("ingredients")}</span>
						</Link>
						<Link 
							href="/storage" 
							className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground/90 hover:bg-muted hover:text-foreground transition-colors"
						>
							<Package className="h-4 w-4" />
							<span suppressHydrationWarning>{t("storage")}</span>
						</Link>
						<Link 
							href="/recipes" 
							className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground/90 hover:bg-muted hover:text-foreground transition-colors"
						>
							<ChefHat className="h-4 w-4" />
							<span suppressHydrationWarning>{t("recipes")}</span>
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
					</div>
				</div>
			</div>
		</header>
	);
}