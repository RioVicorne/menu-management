"use client";

import { useState, useEffect } from "react";
import { Sparkles, MessageSquare, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIFeatures, AIChat, AIResult } from "@/components/features/ai";
import { CameraButton } from "@/components/features/camera";
import { RecognitionResult } from "@/lib/camera-service";
import Modal from "@/components/ui/modal";
import { getAllIngredients } from "@/lib/api";
import { logger } from "@/lib/logger";

type ViewMode = 'features' | 'chat';

export default function PlannerPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('features');
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  // Handle camera recognition results
  const handleCameraIngredientsRecognized = (result: RecognitionResult) => {
    console.log('Camera recognized ingredients:', result.ingredients);
    
    // Update available ingredients with camera results
    const newIngredients = result.ingredients.map(ing => ing.name);
    setAvailableIngredients(prev => [...prev, ...newIngredients]);
    
    // Show success message
    alert(`Đã nhận diện ${result.ingredients.length} nguyên liệu từ camera!`);
  };

  // Load available ingredients for AI context
  useEffect(() => {
    const loadIngredients = async () => {
      try {
        const ingredients = await getAllIngredients();
        const ingredientNames = ingredients
          .filter(ing => Number(ing.ton_kho_so_luong || 0) > 0 || Number(ing.ton_kho_khoi_luong || 0) > 0)
          .map(ing => String(ing.ten_nguyen_lieu || ''))
          .filter(name => name.length > 0);
        setAvailableIngredients(ingredientNames);
      } catch (error) {
        logger.error('Error loading ingredients:', error);
      }
    };

    loadIngredients();
  }, []);

  const handleFeatureSelect = async (feature: string, data?: unknown) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: feature,
          data: data || {}
        }),
      });

      const result = await response.json();
      
      if (result.error) {
        console.error('AI Error:', result.error);
        setAiResult({ error: result.error });
      } else {
        console.log('AI Result:', result);
        setAiResult(result);
      }
      setShowResult(true);
    } catch (error) {
      console.error('Error calling AI:', error);
      alert('Có lỗi xảy ra khi gọi AI');
    } finally {
      setLoading(false);
    }
  };

  const aiContext = {
    availableIngredients,
    currentMenu: [], // Could be loaded from current date menu
    dietaryPreferences: [] // Could be loaded from user preferences
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-4">
          <div className="p-4 gradient-primary rounded-3xl shadow-soft">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-sage-600 to-wood-600 bg-clip-text text-transparent">
              AI Planner
            </h1>
            <p className="text-muted-foreground">
              Trợ lý thông minh giúp lập kế hoạch thực đơn và quản lý menu
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={viewMode === 'features' ? 'default' : 'outline'}
            onClick={() => setViewMode('features')}
            className="flex items-center gap-2"
          >
            <Grid3X3 className="w-4 h-4" />
            Tính năng AI
          </Button>
          <Button
            variant={viewMode === 'chat' ? 'default' : 'outline'}
            onClick={() => setViewMode('chat')}
            className="flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Chat với AI
          </Button>
        </div>

        {/* Camera Button */}
        <div className="flex items-center justify-center">
          <CameraButton
            onIngredientsRecognized={handleCameraIngredientsRecognized}
            variant="outline"
            className="flex items-center gap-2"
          >
            Nhận diện nguyên liệu bằng camera
          </CameraButton>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'features' ? (
        <AIFeatures 
          onFeatureSelect={handleFeatureSelect}
          loading={loading}
        />
      ) : (
        <AIChat 
          onFeatureSelect={handleFeatureSelect}
          context={aiContext}
        />
      )}

      {/* AI Result Modal */}
      {showResult && aiResult && (
        <Modal
          isOpen={showResult}
          onClose={() => setShowResult(false)}
          title="Kết quả AI"
          size="xl"
        >
          <AIResult
            type={aiResult.type || 'unknown'}
            content={aiResult.content || aiResult.error || 'Không có kết quả'}
            suggestions={aiResult.suggestions}
            error={aiResult.error}
            onRegenerate={() => {
              setShowResult(false);
              // You can implement regenerate logic here
            }}
          />
        </Modal>
      )}
    </div>
  );
}