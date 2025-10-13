"use client";

import { } from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  ChefHat, 
  Package, 
  ShoppingCart, 
  Plus, 
  TrendingUp, 
  Users, 
  Clock,
  ArrowRight,
  BarChart3,
  Bell
} from "lucide-react";
import TodayMenu from "@/components/today-menu";

export default function HomePage() {
  const router = useRouter();

  const quickActions = [
    {
      title: "Thêm món ăn",
      description: "Thêm món mới vào thực đơn",
      icon: Plus,
      color: "bg-blue-500",
      href: "/ingredients"
    },
    {
      title: "Lập thực đơn",
      description: "Tạo thực đơn cho ngày mai",
      icon: Calendar,
      color: "bg-green-500",
      href: "/menu"
    },
    {
      title: "Kiểm tra kho",
      description: "Xem tình trạng nguyên liệu",
      icon: Package,
      color: "bg-purple-500",
      href: "/storage"
    },
    {
      title: "Danh sách mua sắm",
      description: "Xem những gì cần mua",
      icon: ShoppingCart,
      color: "bg-orange-500",
      href: "/shopping"
    }
  ];

  const stats = [
    { label: "Món ăn hôm nay", value: "5", icon: ChefHat, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
    { label: "Nguyên liệu trong kho", value: "24", icon: Package, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
    { label: "Cần mua sắm", value: "8", icon: ShoppingCart, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
    { label: "Người ăn", value: "12", icon: Users, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="card-modern p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
              Chào mừng trở lại! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Hôm nay là một ngày tuyệt vời để quản lý thực đơn
            </p>
          </div>
          <div className="mt-4 lg:mt-0">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{new Date().toLocaleDateString('vi-VN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card-modern p-6 hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="card-modern p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Thao tác nhanh
          </h2>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => router.push(action.href)}
                className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-300 hover-lift"
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-3 rounded-lg ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Today's Menu */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TodayMenu />
        </div>
        
        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Thông báo
              </h3>
              <Bell className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Cần bổ sung nguyên liệu
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    8 nguyên liệu sắp hết
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Thực đơn tuần tới
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Chưa lập kế hoạch
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Stats */}
          <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Thống kê tuần
              </h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Món ăn đã nấu</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">32</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Nguyên liệu đã dùng</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">156</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Chi phí ước tính</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">2.4M</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
