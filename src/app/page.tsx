"use client";

import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Package,
  ChefHat,
  Menu,
  ArrowRight,
  BarChart3,
  Users,
  Clock,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  const features = [
    {
      icon: Menu,
      title: "Quản lý thực đơn",
      description: "Lập kế hoạch thực đơn theo ngày, tuần, tháng với giao diện lịch trực quan",
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
      action: () => router.push("/menu"),
    },
    {
      icon: Package,
      title: "Quản lý kho",
      description: "Theo dõi tồn kho nguyên liệu, cảnh báo hết hàng và quản lý nhập xuất",
      color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
      action: () => router.push("/storage"),
    },
    {
      icon: ChefHat,
      title: "Quản lý nguyên liệu",
      description: "Thêm, chỉnh sửa thông tin nguyên liệu và phân loại theo danh mục",
      color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
      action: () => router.push("/ingredients"),
    },
  ];

  const stats = [
    {
      icon: Menu,
      label: "Thực đơn đã lập",
      value: "0",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: Package,
      label: "Nguyên liệu trong kho",
      value: "0",
      color: "text-green-600 dark:text-green-400",
    },
    {
      icon: ChefHat,
      label: "Loại nguyên liệu",
      value: "0",
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      icon: BarChart3,
      label: "Thống kê tháng này",
      value: "0",
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
              <ChefHat className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Chào mừng đến với Menu Management
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Hệ thống quản lý thực đơn và kho nguyên liệu toàn diện, giúp bạn lập kế hoạch và quản lý hiệu quả
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 text-center"
              >
                <div className="flex items-center justify-center mb-3">
                  <div className={`p-2 rounded-lg ${stat.color.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-')}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Features Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Tính năng chính
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={feature.action}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${feature.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {feature.description}
                      </p>
                      <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                        <span>Khám phá ngay</span>
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Bắt đầu ngay hôm nay
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Chọn một trong các tùy chọn bên dưới để bắt đầu quản lý thực đơn của bạn
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push("/menu")}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Menu className="h-5 w-5" />
                <span>Xem lịch thực đơn</span>
              </button>
              <button
                onClick={() => router.push("/storage")}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Package className="h-5 w-5" />
                <span>Quản lý kho</span>
              </button>
              <button
                onClick={() => router.push("/ingredients")}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <ChefHat className="h-5 w-5" />
                <span>Quản lý nguyên liệu</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
