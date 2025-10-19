"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Camera, 
  CameraOff, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { CameraService, cameraService, imageRecognitionService, type RecognitionResult, type RecognizedIngredient } from '@/lib/camera-service';
import { logger } from '@/lib/logger';

interface CameraComponentProps {
  onIngredientsRecognized?: (result: RecognitionResult) => void;
  onClose?: () => void;
  className?: string;
}

export default function CameraComponent({ 
  onIngredientsRecognized, 
  onClose,
  className = "" 
}: CameraComponentProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeCamera();
    
    return () => {
      cameraService.stopCamera();
    };
  }, []);

  const initializeCamera = async () => {
    try {
      setError(null);
      
      if (!CameraService.isSupported()) {
        throw new Error('Trình duyệt không hỗ trợ camera');
      }

      const videoElement = await cameraService.initializeCamera({
        width: 1280,
        height: 720,
        facingMode: 'environment'
      });

      if (videoRef.current) {
        videoRef.current.srcObject = videoElement.srcObject;
        videoRef.current.play();
      }

      setIsInitialized(true);
    } catch (error) {
      logger.error('Error initializing camera:', error);
      setError(error instanceof Error ? error.message : 'Không thể khởi tạo camera');
    }
  };

  const capturePhoto = async () => {
    if (!isInitialized) return;

    setIsCapturing(true);
    setError(null);

    try {
      const imageData = cameraService.capturePhoto();
      
      if (!imageData) {
        throw new Error('Không thể chụp ảnh');
      }

      setCapturedImage(imageData);
      
      // Start recognition process
      setIsProcessing(true);
      const result = await imageRecognitionService.recognizeIngredients(imageData);
      
      setRecognitionResult(result);
      
      if (onIngredientsRecognized) {
        onIngredientsRecognized(result);
      }
    } catch (error) {
      logger.error('Error capturing photo:', error);
      setError(error instanceof Error ? error.message : 'Lỗi khi chụp ảnh');
    } finally {
      setIsCapturing(false);
      setIsProcessing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setRecognitionResult(null);
    setError(null);
  };

  const handleClose = () => {
    cameraService.stopCamera();
    if (onClose) {
      onClose();
    }
  };

  if (!CameraService.isSupported()) {
    return (
      <Card className={`border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                Camera không được hỗ trợ
              </h3>
              <p className="text-red-800 dark:text-red-200 text-sm">
                Trình duyệt của bạn không hỗ trợ truy cập camera.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`} ref={containerRef}>
      {/* Camera Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>Camera nhận diện nguyên liệu</span>
            </CardTitle>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Camera View */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            {!isInitialized ? (
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Đang khởi tạo camera...</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full aspect-video object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                
                {/* Capture Overlay */}
                {isCapturing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p>Đang chụp ảnh...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Camera Controls */}
          <div className="mt-4 flex items-center justify-center space-x-3">
            <Button
              onClick={capturePhoto}
              disabled={!isInitialized || isCapturing || isProcessing}
              className="flex items-center space-x-2"
            >
              {isCapturing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              <span>{isCapturing ? 'Đang chụp...' : 'Chụp ảnh'}</span>
            </Button>

            <Button
              variant="outline"
              onClick={initializeCamera}
              disabled={isCapturing || isProcessing}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Khởi động lại
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Captured Image and Results */}
      {capturedImage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ImageIcon className="w-5 h-5" />
              <span>Kết quả nhận diện</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Captured Image */}
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured ingredients"
                  className="w-full max-w-md mx-auto rounded-lg shadow-md"
                />
                
                {/* Processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="text-center text-white">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p>Đang nhận diện nguyên liệu...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recognition Results */}
              {recognitionResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-green-900 dark:text-green-100">
                      Nguyên liệu được nhận diện ({recognitionResult.ingredients.length})
                    </h4>
                    <span className="text-sm text-gray-500">
                      {recognitionResult.processingTime}ms
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {recognitionResult.ingredients.map((ingredient, index) => (
                      <IngredientCard key={index} ingredient={ingredient} />
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center space-x-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={retakePhoto}
                      className="flex items-center space-x-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Chụp lại</span>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        // Add ingredients to inventory or menu
                        console.log('Adding ingredients:', recognitionResult.ingredients);
                      }}
                      className="flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Thêm vào kho</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface IngredientCardProps {
  ingredient: RecognizedIngredient;
}

function IngredientCard({ ingredient }: IngredientCardProps) {
  const confidenceColor = ingredient.confidence >= 0.8 ? 'text-green-600' : 
                         ingredient.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600';
  
  const confidenceBg = ingredient.confidence >= 0.8 ? 'bg-green-100 dark:bg-green-900/30' : 
                       ingredient.confidence >= 0.6 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30';

  return (
    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-medium text-gray-900 dark:text-white">
          {ingredient.name}
        </h5>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${confidenceColor} ${confidenceBg}`}>
          {Math.round(ingredient.confidence * 100)}%
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Loại:</span> {ingredient.category}
        </p>
        
        {ingredient.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Mô tả:</span> {ingredient.description}
          </p>
        )}
        
        {ingredient.nutritionInfo && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Dinh dưỡng:</span>
            <div className="ml-2 mt-1 grid grid-cols-2 gap-1 text-xs">
              <span>Calo: {ingredient.nutritionInfo.calories}</span>
              <span>Protein: {ingredient.nutritionInfo.protein}g</span>
              <span>Carb: {ingredient.nutritionInfo.carbs}g</span>
              <span>Béo: {ingredient.nutritionInfo.fat}g</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

