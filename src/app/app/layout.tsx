import Link from "next/link";
import { Calendar, ChefHat, Package, Utensils, Home } from "lucide-react";

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-dvh bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
			<header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 shadow-sm">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="h-16 flex items-center justify-between">
						<Link href="/app" className="flex items-center space-x-2 group">
							<div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
								<ChefHat className="h-6 w-6 text-blue-600 dark:text-blue-400" />
							</div>
							<span className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
								Menu Planner
							</span>
						</Link>
						
						<nav className="hidden md:flex items-center space-x-1">
							<Link 
								href="/app" 
								className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors"
							>
								<Calendar className="h-4 w-4" />
								<span>Calendar</span>
							</Link>
							<Link 
								href="/app/ingredients" 
								className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors"
							>
								<Utensils className="h-4 w-4" />
								<span>Ingredients</span>
							</Link>
							<Link 
								href="/app/storage" 
								className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors"
							>
								<Package className="h-4 w-4" />
								<span>Storage</span>
							</Link>
							<Link 
								href="/app/recipes" 
								className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors"
							>
								<ChefHat className="h-4 w-4" />
								<span>Recipes</span>
							</Link>
						</nav>

						{/* Mobile menu button */}
						<div className="md:hidden">
							<button className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800">
								<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
								</svg>
							</button>
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
