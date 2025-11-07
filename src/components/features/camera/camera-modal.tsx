"use client";

import { useState } from 'react';
import Modal from '@/components/ui/modal';
import CameraComponent from './camera-component';
import { RecognitionResult } from '@/lib/camera-service';
import { Camera } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngredientsRecognized?: (result: RecognitionResult) => void;
  title?: string;
}

export default function CameraModal({ 
  isOpen, 
  onClose, 
  onIngredientsRecognized,
  title = "Camera nhận diện nguyên liệu"
}: CameraModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleIngredientsRecognized = (result: RecognitionResult) => {
    setIsProcessing(true);
    
    // Call parent callback
    if (onIngredientsRecognized) {
      onIngredientsRecognized(result);
    }
    
    // Auto close after a delay
    setTimeout(() => {
      setIsProcessing(false);
      onClose();
    }, 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
    >
      <div className="space-y-4">
        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Camera className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Hướng dẫn sử dụng
              </h4>
              <ul className="text-blue-800 dark:text-blue-200 text-sm space-y-1">
                <li>• Đặt nguyên liệu trong khung hình camera</li>
                <li>• Đảm bảo ánh sáng đủ và nguyên liệu rõ nét</li>
                <li>• Nhấn &quot;Chụp ảnh&quot; để nhận diện nguyên liệu</li>
                <li>• AI sẽ phân tích và đưa ra kết quả</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Camera Component */}
        <CameraComponent
          onIngredientsRecognized={handleIngredientsRecognized}
          onClose={onClose}
        />

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-700 dark:text-gray-300">
                Đang xử lý kết quả nhận diện...
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

