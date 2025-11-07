
// Interface cho dịp đặc biệt
export interface SpecialOccasion {
  id: string;
  name: string;
  type: 'birthday' | 'anniversary' | 'holiday' | 'party' | 'romantic' | 'family' | 'business';
  description: string;
  season: string[];
  budget: 'low' | 'medium' | 'high' | 'luxury';
  guestCount: {
    min: number;
    max: number;
  };
  duration: 'short' | 'medium' | 'long'; // Thời gian chuẩn bị
  formality: 'casual' | 'semi-formal' | 'formal';
  dietaryConsiderations: string[];
  specialRequirements: string[];
}

// Interface cho menu dịp đặc biệt
export interface SpecialOccasionMenu {
  occasionId: string;
  occasionName: string;
  menu: {
    appetizers: Array<{
      name: string;
      description: string;
      ingredients: string[];
      prepTime: number;
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
    mainCourses: Array<{
      name: string;
      description: string;
      ingredients: string[];
      prepTime: number;
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
    desserts: Array<{
      name: string;
      description: string;
      ingredients: string[];
      prepTime: number;
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
    beverages: Array<{
      name: string;
      description: string;
      type: 'alcoholic' | 'non-alcoholic' | 'hot' | 'cold';
    }>;
  };
  totalPrepTime: number;
  estimatedCost: number;
  servingSize: number;
  tips: string[];
}

// Database các dịp đặc biệt
const SPECIAL_OCCASIONS: SpecialOccasion[] = [
  {
    id: 'birthday-adult',
    name: 'Sinh nhật người lớn',
    type: 'birthday',
    description: 'Tiệc sinh nhật cho người lớn với menu đa dạng',
    season: ['spring', 'summer', 'autumn', 'winter'],
    budget: 'medium',
    guestCount: { min: 4, max: 20 },
    duration: 'medium',
    formality: 'casual',
    dietaryConsiderations: ['vegetarian', 'gluten-free'],
    specialRequirements: ['birthday-cake', 'decorations']
  },
  {
    id: 'birthday-child',
    name: 'Sinh nhật trẻ em',
    type: 'birthday',
    description: 'Tiệc sinh nhật cho trẻ em với món ăn phù hợp',
    season: ['spring', 'summer', 'autumn', 'winter'],
    budget: 'medium',
    guestCount: { min: 6, max: 30 },
    duration: 'short',
    formality: 'casual',
    dietaryConsiderations: ['kid-friendly', 'nut-free'],
    specialRequirements: ['birthday-cake', 'party-favors', 'games']
  },
  {
    id: 'anniversary-romantic',
    name: 'Kỷ niệm lãng mạn',
    type: 'romantic',
    description: 'Bữa tối lãng mạn cho cặp đôi',
    season: ['spring', 'summer', 'autumn', 'winter'],
    budget: 'high',
    guestCount: { min: 2, max: 4 },
    duration: 'long',
    formality: 'formal',
    dietaryConsiderations: ['romantic-atmosphere'],
    specialRequirements: ['candles', 'flowers', 'music']
  },
  {
    id: 'new-year',
    name: 'Tết Nguyên Đán',
    type: 'holiday',
    description: 'Menu truyền thống cho dịp Tết',
    season: ['spring'],
    budget: 'high',
    guestCount: { min: 8, max: 50 },
    duration: 'long',
    formality: 'formal',
    dietaryConsiderations: ['traditional-vietnamese'],
    specialRequirements: ['lucky-foods', 'red-decorations', 'fireworks']
  },
  {
    id: 'christmas',
    name: 'Giáng Sinh',
    type: 'holiday',
    description: 'Menu cho dịp Giáng Sinh',
    season: ['winter'],
    budget: 'high',
    guestCount: { min: 6, max: 30 },
    duration: 'long',
    formality: 'semi-formal',
    dietaryConsiderations: ['christmas-tradition'],
    specialRequirements: ['christmas-tree', 'gifts', 'carols']
  },
  {
    id: 'housewarming',
    name: 'Tiệc tân gia',
    type: 'party',
    description: 'Tiệc mừng nhà mới',
    season: ['spring', 'summer', 'autumn', 'winter'],
    budget: 'medium',
    guestCount: { min: 10, max: 40 },
    duration: 'medium',
    formality: 'casual',
    dietaryConsiderations: ['easy-to-serve'],
    specialRequirements: ['house-tour', 'gifts']
  },
  {
    id: 'business-dinner',
    name: 'Tiệc kinh doanh',
    type: 'business',
    description: 'Bữa tối kinh doanh trang trọng',
    season: ['spring', 'summer', 'autumn', 'winter'],
    budget: 'luxury',
    guestCount: { min: 4, max: 12 },
    duration: 'long',
    formality: 'formal',
    dietaryConsiderations: ['professional', 'impressive'],
    specialRequirements: ['quiet-atmosphere', 'business-cards']
  },
  {
    id: 'family-reunion',
    name: 'Họp mặt gia đình',
    type: 'family',
    description: 'Tiệc họp mặt gia đình lớn',
    season: ['spring', 'summer', 'autumn', 'winter'],
    budget: 'medium',
    guestCount: { min: 15, max: 100 },
    duration: 'long',
    formality: 'casual',
    dietaryConsiderations: ['family-tradition', 'generous-portions'],
    specialRequirements: ['family-photos', 'games', 'memories']
  }
];

// Database menu cho các dịp đặc biệt
const SPECIAL_OCCASION_MENUS: Record<string, SpecialOccasionMenu> = {
  'birthday-adult': {
    occasionId: 'birthday-adult',
    occasionName: 'Sinh nhật người lớn',
    menu: {
      appetizers: [
        {
          name: 'Gỏi cuốn tôm thịt',
          description: 'Gỏi cuốn tươi mát với tôm và thịt',
          ingredients: ['bánh tráng', 'tôm', 'thịt', 'rau sống', 'nước mắm'],
          prepTime: 30,
          difficulty: 'easy'
        },
        {
          name: 'Nem nướng',
          description: 'Nem nướng thơm ngon',
          ingredients: ['thịt băm', 'nem', 'rau sống', 'bánh tráng'],
          prepTime: 45,
          difficulty: 'medium'
        }
      ],
      mainCourses: [
        {
          name: 'Lẩu thái',
          description: 'Lẩu thái cay nồng cho tiệc sinh nhật',
          ingredients: ['thịt bò', 'hải sản', 'rau củ', 'nước dừa', 'gia vị thái'],
          prepTime: 60,
          difficulty: 'medium'
        },
        {
          name: 'Cơm tấm đặc biệt',
          description: 'Cơm tấm với đầy đủ món ăn',
          ingredients: ['cơm tấm', 'thịt nướng', 'chả', 'trứng', 'rau sống'],
          prepTime: 40,
          difficulty: 'easy'
        }
      ],
      desserts: [
        {
          name: 'Bánh sinh nhật',
          description: 'Bánh sinh nhật tự làm',
          ingredients: ['bột mì', 'trứng', 'đường', 'kem', 'trái cây'],
          prepTime: 90,
          difficulty: 'hard'
        },
        {
          name: 'Chè đậu đỏ',
          description: 'Chè đậu đỏ mát lạnh',
          ingredients: ['đậu đỏ', 'đường', 'nước cốt dừa', 'đá'],
          prepTime: 60,
          difficulty: 'easy'
        }
      ],
      beverages: [
        { name: 'Nước ngọt', description: 'Coca, Pepsi, Sprite', type: 'non-alcoholic' },
        { name: 'Bia', description: 'Bia tươi', type: 'alcoholic' },
        { name: 'Nước ép trái cây', description: 'Nước ép cam, táo', type: 'non-alcoholic' }
      ]
    },
    totalPrepTime: 180,
    estimatedCost: 500000,
    servingSize: 8,
    tips: [
      'Chuẩn bị trước các món có thể làm sẵn',
      'Sắp xếp bàn ghế phù hợp với số lượng khách',
      'Chuẩn bị đủ đĩa, ly, muỗng cho khách',
      'Có kế hoạch dự phòng cho món ăn'
    ]
  },
  'birthday-child': {
    occasionId: 'birthday-child',
    occasionName: 'Sinh nhật trẻ em',
    menu: {
      appetizers: [
        {
          name: 'Khoai tây chiên',
          description: 'Khoai tây chiên giòn cho trẻ em',
          ingredients: ['khoai tây', 'dầu ăn', 'muối'],
          prepTime: 20,
          difficulty: 'easy'
        },
        {
          name: 'Bánh mì kẹp thịt',
          description: 'Bánh mì kẹp thịt đơn giản',
          ingredients: ['bánh mì', 'thịt nướng', 'rau sống', 'sốt'],
          prepTime: 15,
          difficulty: 'easy'
        }
      ],
      mainCourses: [
        {
          name: 'Pizza',
          description: 'Pizza phù hợp với trẻ em',
          ingredients: ['bột pizza', 'phô mai', 'thịt', 'rau củ'],
          prepTime: 45,
          difficulty: 'medium'
        },
        {
          name: 'Mì Ý',
          description: 'Mì Ý với sốt cà chua',
          ingredients: ['mì Ý', 'sốt cà chua', 'thịt băm', 'phô mai'],
          prepTime: 30,
          difficulty: 'easy'
        }
      ],
      desserts: [
        {
          name: 'Bánh sinh nhật trẻ em',
          description: 'Bánh sinh nhật với kem và kẹo',
          ingredients: ['bột mì', 'trứng', 'đường', 'kem', 'kẹo'],
          prepTime: 120,
          difficulty: 'hard'
        },
        {
          name: 'Kem',
          description: 'Kem các loại cho trẻ em',
          ingredients: ['kem', 'kẹo', 'trái cây'],
          prepTime: 10,
          difficulty: 'easy'
        }
      ],
      beverages: [
        { name: 'Nước ngọt', description: 'Coca, Pepsi, Sprite', type: 'non-alcoholic' },
        { name: 'Nước ép', description: 'Nước ép cam, táo', type: 'non-alcoholic' },
        { name: 'Sữa', description: 'Sữa tươi', type: 'non-alcoholic' }
      ]
    },
    totalPrepTime: 150,
    estimatedCost: 300000,
    servingSize: 12,
    tips: [
      'Chuẩn bị món ăn đơn giản, dễ ăn',
      'Có nhiều món ngọt cho trẻ em',
      'Chuẩn bị đồ chơi và trò chơi',
      'Có người lớn giám sát trẻ em'
    ]
  },
  'new-year': {
    occasionId: 'new-year',
    occasionName: 'Tết Nguyên Đán',
    menu: {
      appetizers: [
        {
          name: 'Bánh chưng',
          description: 'Bánh chưng truyền thống ngày Tết',
          ingredients: ['gạo nếp', 'đậu xanh', 'thịt ba chỉ', 'lá dong'],
          prepTime: 480,
          difficulty: 'hard'
        },
        {
          name: 'Dưa hành',
          description: 'Dưa hành muối chua',
          ingredients: ['hành tây', 'giấm', 'đường', 'muối'],
          prepTime: 60,
          difficulty: 'easy'
        }
      ],
      mainCourses: [
        {
          name: 'Thịt kho tàu',
          description: 'Thịt kho tàu truyền thống',
          ingredients: ['thịt ba chỉ', 'trứng', 'nước dừa', 'hành tím'],
          prepTime: 90,
          difficulty: 'medium'
        },
        {
          name: 'Gà luộc',
          description: 'Gà luộc nguyên con',
          ingredients: ['gà', 'hành lá', 'rau thơm', 'nước mắm'],
          prepTime: 60,
          difficulty: 'easy'
        }
      ],
      desserts: [
        {
          name: 'Mứt dừa',
          description: 'Mứt dừa ngọt ngào',
          ingredients: ['dừa', 'đường', 'vanilla'],
          prepTime: 120,
          difficulty: 'medium'
        },
        {
          name: 'Bánh kẹo',
          description: 'Bánh kẹo các loại',
          ingredients: ['đường', 'bột mì', 'trứng', 'hương liệu'],
          prepTime: 90,
          difficulty: 'medium'
        }
      ],
      beverages: [
        { name: 'Rượu', description: 'Rượu đế, rượu vang', type: 'alcoholic' },
        { name: 'Nước ngọt', description: 'Coca, Pepsi', type: 'non-alcoholic' },
        { name: 'Trà', description: 'Trà nóng', type: 'hot' }
      ]
    },
    totalPrepTime: 600,
    estimatedCost: 800000,
    servingSize: 20,
    tips: [
      'Chuẩn bị từ trước Tết 1-2 tuần',
      'Mua nguyên liệu sớm để tránh tăng giá',
      'Chuẩn bị đủ món ăn cho nhiều ngày',
      'Giữ gìn truyền thống gia đình'
    ]
  }
};

export class SpecialOccasionService {
  private static instance: SpecialOccasionService;
  
  private constructor() {}
  
  public static getInstance(): SpecialOccasionService {
    if (!SpecialOccasionService.instance) {
      SpecialOccasionService.instance = new SpecialOccasionService();
    }
    return SpecialOccasionService.instance;
  }

  // Lấy tất cả dịp đặc biệt
  getAllOccasions(): SpecialOccasion[] {
    return SPECIAL_OCCASIONS;
  }

  // Lấy dịp đặc biệt theo loại
  getOccasionsByType(type: SpecialOccasion['type']): SpecialOccasion[] {
    return SPECIAL_OCCASIONS.filter(occasion => occasion.type === type);
  }

  // Lấy dịp đặc biệt theo ngân sách
  getOccasionsByBudget(budget: SpecialOccasion['budget']): SpecialOccasion[] {
    return SPECIAL_OCCASIONS.filter(occasion => occasion.budget === budget);
  }

  // Lấy menu cho dịp đặc biệt
  getMenuForOccasion(occasionId: string): SpecialOccasionMenu | null {
    return SPECIAL_OCCASION_MENUS[occasionId] || null;
  }

  // Tạo menu tùy chỉnh cho dịp đặc biệt
  createCustomMenu(occasion: SpecialOccasion, preferences?: {
    guestCount?: number;
    budget?: number;
    dietaryRestrictions?: string[];
    favoriteDishes?: string[];
  }): SpecialOccasionMenu {
    const baseMenu = this.getMenuForOccasion(occasion.id);
    
    if (!baseMenu) {
      // Tạo menu mặc định nếu không có menu có sẵn
      return this.createDefaultMenu(occasion);
    }

    // Điều chỉnh menu theo preferences
    const customMenu = { ...baseMenu };
    
    if (preferences?.guestCount) {
      const multiplier = preferences.guestCount / baseMenu.servingSize;
      customMenu.estimatedCost = Math.round(baseMenu.estimatedCost * multiplier);
      customMenu.servingSize = preferences.guestCount;
    }

    if (preferences?.budget) {
      // Điều chỉnh menu theo ngân sách
      if (preferences.budget < customMenu.estimatedCost * 0.7) {
        // Giảm chi phí bằng cách thay thế món đắt tiền
        customMenu.menu.mainCourses = customMenu.menu.mainCourses.filter(dish => 
          !dish.name.includes('lẩu') && !dish.name.includes('hải sản')
        );
        customMenu.estimatedCost = Math.round(customMenu.estimatedCost * 0.8);
      } else if (preferences.budget > customMenu.estimatedCost * 1.3) {
        // Tăng chất lượng menu
        customMenu.menu.mainCourses.push({
          name: 'Tôm hùm nướng',
          description: 'Tôm hùm nướng cao cấp',
          ingredients: ['tôm hùm', 'bơ', 'tỏi', 'rau thơm'],
          prepTime: 45,
          difficulty: 'hard'
        });
        customMenu.estimatedCost = Math.round(customMenu.estimatedCost * 1.5);
      }
    }

    return customMenu;
  }

  // Tạo menu mặc định
  private createDefaultMenu(occasion: SpecialOccasion): SpecialOccasionMenu {
    return {
      occasionId: occasion.id,
      occasionName: occasion.name,
      menu: {
        appetizers: [
          {
            name: 'Gỏi cuốn',
            description: 'Gỏi cuốn tươi mát',
            ingredients: ['bánh tráng', 'tôm', 'rau sống'],
            prepTime: 30,
            difficulty: 'easy'
          }
        ],
        mainCourses: [
          {
            name: 'Cơm tấm',
            description: 'Cơm tấm đậm đà',
            ingredients: ['cơm tấm', 'thịt nướng', 'chả'],
            prepTime: 40,
            difficulty: 'easy'
          }
        ],
        desserts: [
          {
            name: 'Chè đậu đỏ',
            description: 'Chè đậu đỏ mát lạnh',
            ingredients: ['đậu đỏ', 'đường', 'nước cốt dừa'],
            prepTime: 60,
            difficulty: 'easy'
          }
        ],
        beverages: [
          { name: 'Nước ngọt', description: 'Coca, Pepsi', type: 'non-alcoholic' }
        ]
      },
      totalPrepTime: 120,
      estimatedCost: 200000,
      servingSize: 6,
      tips: [
        'Chuẩn bị trước các món có thể làm sẵn',
        'Sắp xếp bàn ghế phù hợp',
        'Chuẩn bị đủ dụng cụ ăn uống'
      ]
    };
  }

  // Lấy gợi ý chuẩn bị cho dịp đặc biệt
  getPreparationTips(occasionId: string): string[] {
    const menu = this.getMenuForOccasion(occasionId);
    return menu?.tips || [];
  }

  // Tính toán thời gian chuẩn bị
  calculatePrepTime(menu: SpecialOccasionMenu): number {
    const maxPrepTime = Math.max(
      ...menu.menu.appetizers.map(dish => dish.prepTime),
      ...menu.menu.mainCourses.map(dish => dish.prepTime),
      ...menu.menu.desserts.map(dish => dish.prepTime)
    );
    
    return maxPrepTime + 30; // Thêm 30 phút buffer
  }

  // Lấy món ăn phù hợp theo dịp
  getDishesByOccasion(occasionId: string): string[] {
    const menu = this.getMenuForOccasion(occasionId);
    if (!menu) return [];

    const allDishes = [
      ...menu.menu.appetizers.map(dish => dish.name),
      ...menu.menu.mainCourses.map(dish => dish.name),
      ...menu.menu.desserts.map(dish => dish.name)
    ];

    return allDishes;
  }

  // Tìm dịp đặc biệt theo tên
  findOccasionByName(name: string): SpecialOccasion | null {
    return SPECIAL_OCCASIONS.find(occasion => 
      occasion.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(occasion.name.toLowerCase())
    ) || null;
  }
}

// Export singleton instance
export const specialOccasionService = SpecialOccasionService.getInstance();


