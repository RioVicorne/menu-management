"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import CameraModal from './camera-modal';
import { RecognitionResult } from '@/lib/camera-service';
import { logger } from '@/lib/logger';

interface CameraButtonProps {
  onIngredientsRecognized?: (result: RecognitionResult) => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export default function CameraButton({
  onIngredientsRecognized,
  variant = 'default',
  size = 'default',
  className = '',
  children,
  disabled = false
}: CameraButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleIngredientsRecognized = (result: RecognitionResult) => {
    setIsProcessing(true);
    
    try {
      if (onIngredientsRecognized) {
        onIngredientsRecognized(result);
      }
      
      // Show success feedback
      console.log('Ingredients recognized:', result.ingredients);
      
    } catch (error) {
      logger.error('Error handling recognized ingredients:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        onClick={handleOpenModal}
        variant={variant}
        size={size}
        className={`flex items-center space-x-2 ${className}`}
        disabled={disabled || isProcessing}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Camera className="w-4 h-4" />
        )}
        <span>
          {isProcessing ? 'Đang xử lý...' : (children || 'Camera')}
        </span>
      </Button>

      <CameraModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onIngredientsRecognized={handleIngredientsRecognized}
      />
    </>
  );
}






