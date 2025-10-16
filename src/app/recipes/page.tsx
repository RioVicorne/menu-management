"use client";

import { ChefHat, BookOpen, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RecipesPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-4">
          <div className="p-4 gradient-primary rounded-3xl shadow-soft">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-sage-600 to-wood-600 bg-clip-text text-transparent">
              Công thức nấu ăn
            </h1>
            <p className="text-muted-foreground">
              Kho lưu trữ công thức và hướng dẫn nấu ăn
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="flex justify-center">
        <Card variant="modern" className="w-full max-w-2xl hover-lift">
          <CardContent className="p-12 text-center">
            <div className="space-y-6">
              <div className="p-6 rounded-full bg-gradient-to-br from-sage-100 to-wood-100 dark:from-sage-900/30 dark:to-wood-900/30 w-fit mx-auto">
                <ChefHat className="h-16 w-16 text-sage-600" />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Tính năng sắp ra mắt</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Chúng tôi đang phát triển tính năng quản lý công thức nấu ăn với hướng dẫn chi tiết, 
                  thời gian chuẩn bị và video minh họa.
                </p>
                <div className="flex items-center justify-center gap-2 text-sage-600">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-medium">Sắp có mặt!</span>
                </div>
              </div>
              <div className="pt-4">
                <Button variant="outline" size="lg" disabled>
                  Khám phá sớm
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="culinary" className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-wood-600" />
              Công thức chi tiết
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Hướng dẫn từng bước với hình ảnh minh họa và thời gian chuẩn bị.
            </p>
          </CardContent>
        </Card>

        <Card variant="culinary" className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ChefHat className="h-5 w-5 text-sage-600" />
              Video hướng dẫn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Video minh họa cách nấu từng món ăn một cách trực quan.
            </p>
          </CardContent>
        </Card>

        <Card variant="culinary" className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-mint-600" />
              Gợi ý thông minh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gợi ý món ăn phù hợp dựa trên nguyên liệu có sẵn.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
