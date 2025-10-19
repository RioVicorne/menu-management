import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { specialOccasionService } from '@/lib/special-occasion-service';

interface SpecialOccasionRequest {
  occasionId?: string;
  occasionType?: string;
  preferences?: {
    guestCount?: number;
    budget?: number;
    dietaryRestrictions?: string[];
    favoriteDishes?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SpecialOccasionRequest = await request.json();
    const { occasionId, occasionType, preferences } = body;

    let occasions;
    let menu;

    if (occasionId) {
      // Lấy menu cho dịp cụ thể
      menu = specialOccasionService.getMenuForOccasion(occasionId);
      if (!menu) {
        return NextResponse.json(
          { 
            error: 'Occasion not found',
            message: 'Không tìm thấy dịp đặc biệt này'
          },
          { status: 404 }
        );
      }

      // Tạo menu tùy chỉnh nếu có preferences
      if (preferences) {
        const occasion = specialOccasionService.getAllOccasions().find(occ => occ.id === occasionId);
        if (occasion) {
          menu = specialOccasionService.createCustomMenu(occasion, preferences);
        }
      }
    } else if (occasionType) {
      // Lấy tất cả dịp theo loại
      occasions = specialOccasionService.getOccasionsByType(occasionType as any);
    } else {
      // Lấy tất cả dịp đặc biệt
      occasions = specialOccasionService.getAllOccasions();
    }

    const response = {
      success: true,
      data: menu ? { menu } : { occasions },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Special Occasion API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Có lỗi xảy ra khi xử lý dịp đặc biệt.'
      },
      { status: 500 }
    );
  }
}

// GET endpoint để lấy thông tin dịp đặc biệt
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const type = searchParams.get('type');
    const occasionId = searchParams.get('occasionId');

    switch (action) {
      case 'occasions':
        let occasions;
        if (type) {
          occasions = specialOccasionService.getOccasionsByType(type as any);
        } else {
          occasions = specialOccasionService.getAllOccasions();
        }
        
        return NextResponse.json({
          success: true,
          occasions: occasions.slice(0, 20) // Limit to 20 occasions
        });

      case 'menu':
        if (!occasionId) {
          return NextResponse.json(
            { error: 'occasionId is required' },
            { status: 400 }
          );
        }
        
        const menu = specialOccasionService.getMenuForOccasion(occasionId);
        if (!menu) {
          return NextResponse.json(
            { 
              error: 'Menu not found',
              message: 'Không tìm thấy menu cho dịp này'
            },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          menu
        });

      case 'tips':
        if (!occasionId) {
          return NextResponse.json(
            { error: 'occasionId is required' },
            { status: 400 }
          );
        }
        
        const tips = specialOccasionService.getPreparationTips(occasionId);
        return NextResponse.json({
          success: true,
          tips
        });

      case 'dishes':
        if (!occasionId) {
          return NextResponse.json(
            { error: 'occasionId is required' },
            { status: 400 }
          );
        }
        
        const dishes = specialOccasionService.getDishesByOccasion(occasionId);
        return NextResponse.json({
          success: true,
          dishes
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Special Occasion GET API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Có lỗi xảy ra khi lấy thông tin dịp đặc biệt.'
      },
      { status: 500 }
    );
  }
}


