
// Interface cho thông tin thời tiết
export interface WeatherInfo {
  temperature: number; // Celsius
  humidity: number; // Percentage
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'foggy' | 'snowy';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  location?: string;
}

// Interface cho món ăn theo mùa
export interface SeasonalDish {
  dishId: string;
  dishName: string;
  category: string;
  season: string[];
  weather: string[];
  temperatureRange: {
    min: number;
    max: number;
  };
  description: string;
  benefits: string[];
  ingredients: string[];
}

// Database món ăn theo mùa và thời tiết
const SEASONAL_DISHES: SeasonalDish[] = [
  // Mùa xuân
  {
    dishId: 'spring-salad',
    dishName: 'Salad rau củ mùa xuân',
    category: 'Salad',
    season: ['spring'],
    weather: ['sunny', 'cloudy'],
    temperatureRange: { min: 15, max: 25 },
    description: 'Salad tươi ngon với rau củ mùa xuân',
    benefits: ['Giàu vitamin', 'Tốt cho tiêu hóa', 'Ít calo'],
    ingredients: ['rau xà lách', 'cà chua', 'dưa chuột', 'hành tây', 'dầu oliu']
  },
  {
    dishId: 'spring-soup',
    dishName: 'Canh chua cá mùa xuân',
    category: 'Canh',
    season: ['spring'],
    weather: ['rainy', 'cloudy'],
    temperatureRange: { min: 10, max: 20 },
    description: 'Canh chua ấm áp cho ngày mưa',
    benefits: ['Ấm bụng', 'Giàu protein', 'Tăng sức đề kháng'],
    ingredients: ['cá', 'cà chua', 'dứa', 'rau thơm', 'nước mắm']
  },

  // Mùa hè
  {
    dishId: 'summer-cooling',
    dishName: 'Chè đậu đỏ',
    category: 'Tráng miệng',
    season: ['summer'],
    weather: ['sunny'],
    temperatureRange: { min: 25, max: 35 },
    description: 'Chè mát lạnh giải nhiệt mùa hè',
    benefits: ['Giải nhiệt', 'Bổ sung nước', 'Giàu chất xơ'],
    ingredients: ['đậu đỏ', 'đường', 'nước cốt dừa', 'đá']
  },
  {
    dishId: 'summer-salad',
    dishName: 'Gỏi cuốn tôm thịt',
    category: 'Gỏi',
    season: ['summer'],
    weather: ['sunny', 'cloudy'],
    temperatureRange: { min: 20, max: 30 },
    description: 'Gỏi cuốn tươi mát cho ngày nóng',
    benefits: ['Tươi mát', 'Ít calo', 'Giàu protein'],
    ingredients: ['bánh tráng', 'tôm', 'thịt', 'rau sống', 'nước mắm']
  },
  {
    dishId: 'summer-soup',
    dishName: 'Canh chua tôm',
    category: 'Canh',
    season: ['summer'],
    weather: ['sunny', 'cloudy'],
    temperatureRange: { min: 25, max: 35 },
    description: 'Canh chua thanh mát mùa hè',
    benefits: ['Thanh mát', 'Giàu protein', 'Tốt cho tiêu hóa'],
    ingredients: ['tôm', 'cà chua', 'dứa', 'rau thơm', 'nước mắm']
  },

  // Mùa thu
  {
    dishId: 'autumn-warm',
    dishName: 'Thịt kho tàu',
    category: 'Món chính',
    season: ['autumn'],
    weather: ['cloudy', 'rainy'],
    temperatureRange: { min: 15, max: 25 },
    description: 'Thịt kho đậm đà cho mùa thu',
    benefits: ['Ấm áp', 'Giàu protein', 'Bổ dưỡng'],
    ingredients: ['thịt ba chỉ', 'trứng', 'nước dừa', 'hành tím', 'nước mắm']
  },
  {
    dishId: 'autumn-soup',
    dishName: 'Canh khổ qua nhồi thịt',
    category: 'Canh',
    season: ['autumn'],
    weather: ['cloudy', 'rainy'],
    temperatureRange: { min: 10, max: 20 },
    description: 'Canh khổ qua bổ dưỡng mùa thu',
    benefits: ['Bổ dưỡng', 'Tốt cho sức khỏe', 'Giàu vitamin'],
    ingredients: ['khổ qua', 'thịt băm', 'nấm', 'rau thơm', 'nước mắm']
  },

  // Mùa đông
  {
    dishId: 'winter-hot',
    dishName: 'Lẩu thái',
    category: 'Lẩu',
    season: ['winter'],
    weather: ['cloudy', 'rainy', 'foggy'],
    temperatureRange: { min: 5, max: 15 },
    description: 'Lẩu nóng hổi cho mùa đông',
    benefits: ['Ấm áp', 'Tăng sức đề kháng', 'Giàu dinh dưỡng'],
    ingredients: ['thịt bò', 'hải sản', 'rau củ', 'nước dừa', 'gia vị thái']
  },
  {
    dishId: 'winter-soup',
    dishName: 'Cháo gà',
    category: 'Cháo',
    season: ['winter'],
    weather: ['cloudy', 'rainy', 'foggy'],
    temperatureRange: { min: 0, max: 10 },
    description: 'Cháo gà ấm áp cho ngày lạnh',
    benefits: ['Ấm áp', 'Dễ tiêu hóa', 'Tăng sức đề kháng'],
    ingredients: ['gạo', 'thịt gà', 'hành lá', 'rau thơm', 'nước mắm']
  },
  {
    dishId: 'winter-stew',
    dishName: 'Thịt bò hầm',
    category: 'Hầm',
    season: ['winter'],
    weather: ['cloudy', 'rainy'],
    temperatureRange: { min: 5, max: 15 },
    description: 'Thịt bò hầm đậm đà mùa đông',
    benefits: ['Ấm áp', 'Giàu protein', 'Bổ dưỡng'],
    ingredients: ['thịt bò', 'cà rốt', 'khoai tây', 'hành tây', 'gia vị']
  },

  // Món ăn theo thời tiết đặc biệt
  {
    dishId: 'rainy-comfort',
    dishName: 'Phở bò',
    category: 'Phở',
    season: ['spring', 'autumn', 'winter'],
    weather: ['rainy', 'cloudy'],
    temperatureRange: { min: 10, max: 20 },
    description: 'Phở bò ấm áp cho ngày mưa',
    benefits: ['Ấm áp', 'Dễ tiêu hóa', 'Bổ dưỡng'],
    ingredients: ['bánh phở', 'thịt bò', 'hành lá', 'rau thơm', 'nước dùng']
  },
  {
    dishId: 'hot-day-cooling',
    dishName: 'Bún bò Huế',
    category: 'Bún',
    season: ['summer'],
    weather: ['sunny'],
    temperatureRange: { min: 25, max: 35 },
    description: 'Bún bò Huế cay nồng cho ngày nóng',
    benefits: ['Cay nồng', 'Giàu protein', 'Tăng sức đề kháng'],
    ingredients: ['bún', 'thịt bò', 'chả', 'rau sống', 'nước dùng']
  },
  {
    dishId: 'stormy-comfort',
    dishName: 'Cơm tấm',
    category: 'Cơm',
    season: ['spring', 'summer', 'autumn'],
    weather: ['stormy', 'rainy'],
    temperatureRange: { min: 15, max: 25 },
    description: 'Cơm tấm đậm đà cho ngày bão',
    benefits: ['Đậm đà', 'No lâu', 'Giàu dinh dưỡng'],
    ingredients: ['cơm tấm', 'thịt nướng', 'chả', 'trứng', 'rau sống']
  }
];

export class SeasonalRecommendationService {
  private static instance: SeasonalRecommendationService;
  
  private constructor() {}
  
  public static getInstance(): SeasonalRecommendationService {
    if (!SeasonalRecommendationService.instance) {
      SeasonalRecommendationService.instance = new SeasonalRecommendationService();
    }
    return SeasonalRecommendationService.instance;
  }

  // Lấy thông tin mùa hiện tại
  getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
    const month = new Date().getMonth() + 1;
    
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  // Ước tính thời tiết dựa trên mùa (mock data)
  getEstimatedWeather(): WeatherInfo {
    const season = this.getCurrentSeason();
    
    let temperature: number;
    let condition: WeatherInfo['condition'];
    
    switch (season) {
      case 'spring':
        temperature = 18 + Math.random() * 7; // 18-25°C
        condition = Math.random() > 0.7 ? 'rainy' : Math.random() > 0.5 ? 'cloudy' : 'sunny';
        break;
      case 'summer':
        temperature = 25 + Math.random() * 10; // 25-35°C
        condition = Math.random() > 0.8 ? 'rainy' : 'sunny';
        break;
      case 'autumn':
        temperature = 15 + Math.random() * 10; // 15-25°C
        condition = Math.random() > 0.6 ? 'rainy' : Math.random() > 0.4 ? 'cloudy' : 'sunny';
        break;
      case 'winter':
        temperature = 5 + Math.random() * 10; // 5-15°C
        condition = Math.random() > 0.5 ? 'cloudy' : Math.random() > 0.3 ? 'rainy' : 'sunny';
        break;
      default:
        temperature = 20;
        condition = 'sunny';
    }

    return {
      temperature: Math.round(temperature),
      humidity: Math.round(60 + Math.random() * 30), // 60-90%
      condition,
      season
    };
  }

  // Lấy món ăn phù hợp theo thời tiết
  getDishesByWeather(weather: WeatherInfo): SeasonalDish[] {
    return SEASONAL_DISHES.filter(dish => {
      // Kiểm tra mùa
      const seasonMatch = dish.season.includes(weather.season);
      
      // Kiểm tra thời tiết
      const weatherMatch = dish.weather.includes(weather.condition);
      
      // Kiểm tra nhiệt độ
      const temperatureMatch = weather.temperature >= dish.temperatureRange.min && 
                             weather.temperature <= dish.temperatureRange.max;
      
      return seasonMatch && weatherMatch && temperatureMatch;
    });
  }

  // Lấy món ăn phù hợp theo mùa
  getDishesBySeason(season: string): SeasonalDish[] {
    return SEASONAL_DISHES.filter(dish => dish.season.includes(season));
  }

  // Lấy món ăn phù hợp theo nhiệt độ
  getDishesByTemperature(temperature: number): SeasonalDish[] {
    return SEASONAL_DISHES.filter(dish => 
      temperature >= dish.temperatureRange.min && 
      temperature <= dish.temperatureRange.max
    );
  }

  // Tạo gợi ý món ăn thông minh
  generateSmartRecommendations(weather?: WeatherInfo): {
    recommendations: SeasonalDish[];
    weatherInfo: WeatherInfo;
    suggestions: string[];
  } {
    const currentWeather = weather || this.getEstimatedWeather();
    const recommendations = this.getDishesByWeather(currentWeather);
    
    // Tạo gợi ý dựa trên thời tiết
    const suggestions: string[] = [];
    
    if (currentWeather.temperature < 15) {
      suggestions.push('🌡️ Trời lạnh, nên chọn món ăn ấm áp');
      suggestions.push('🍲 Các món hầm, lẩu sẽ giúp giữ ấm cơ thể');
    } else if (currentWeather.temperature > 30) {
      suggestions.push('☀️ Trời nóng, nên chọn món ăn thanh mát');
      suggestions.push('🥗 Salad và gỏi sẽ giúp giải nhiệt');
    } else {
      suggestions.push('🌤️ Thời tiết dễ chịu, có thể chọn nhiều loại món');
    }

    if (currentWeather.condition === 'rainy') {
      suggestions.push('🌧️ Trời mưa, món ăn ấm áp sẽ rất phù hợp');
    } else if (currentWeather.condition === 'sunny') {
      suggestions.push('☀️ Trời nắng, nên uống nhiều nước và ăn món thanh mát');
    }

    // Thêm gợi ý theo mùa
    switch (currentWeather.season) {
      case 'spring':
        suggestions.push('🌸 Mùa xuân, nên ăn nhiều rau củ tươi');
        break;
      case 'summer':
        suggestions.push('☀️ Mùa hè, cần bổ sung nước và vitamin');
        break;
      case 'autumn':
        suggestions.push('🍂 Mùa thu, nên ăn món bổ dưỡng');
        break;
      case 'winter':
        suggestions.push('❄️ Mùa đông, cần ăn món ấm áp và giàu năng lượng');
        break;
    }

    return {
      recommendations: recommendations.slice(0, 6), // Giới hạn 6 món
      weatherInfo: currentWeather,
      suggestions
    };
  }

  // Lấy món ăn phù hợp cho tình trạng sức khỏe
  getDishesForHealthCondition(condition: string, weather: WeatherInfo): SeasonalDish[] {
    let suitableDishes = this.getDishesByWeather(weather);
    
    switch (condition) {
      case 'cold':
        // Người bị cảm lạnh
        suitableDishes = suitableDishes.filter(dish => 
          dish.category === 'Cháo' || 
          dish.category === 'Canh' || 
          dish.category === 'Lẩu' ||
          dish.benefits.some(benefit => benefit.includes('ấm áp') || benefit.includes('sức đề kháng'))
        );
        break;
      case 'hot':
        // Người bị sốt
        suitableDishes = suitableDishes.filter(dish => 
          dish.category === 'Cháo' || 
          dish.category === 'Salad' ||
          dish.benefits.some(benefit => benefit.includes('dễ tiêu hóa'))
        );
        break;
      case 'tired':
        // Người mệt mỏi
        suitableDishes = suitableDishes.filter(dish => 
          dish.benefits.some(benefit => benefit.includes('bổ dưỡng') || benefit.includes('năng lượng'))
        );
        break;
      case 'digestive':
        // Vấn đề tiêu hóa
        suitableDishes = suitableDishes.filter(dish => 
          dish.benefits.some(benefit => benefit.includes('tiêu hóa') || benefit.includes('dễ tiêu'))
        );
        break;
    }
    
    return suitableDishes;
  }

  // Lấy tất cả món ăn theo mùa
  getAllSeasonalDishes(): SeasonalDish[] {
    return SEASONAL_DISHES;
  }

  // Tìm món ăn theo tên
  findDishByName(name: string): SeasonalDish | null {
    return SEASONAL_DISHES.find(dish => 
      dish.dishName.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(dish.dishName.toLowerCase())
    ) || null;
  }

  // Lấy món ăn theo danh mục và mùa
  getDishesByCategoryAndSeason(category: string, season: string): SeasonalDish[] {
    return SEASONAL_DISHES.filter(dish => 
      dish.category === category && dish.season.includes(season)
    );
  }
}

// Export singleton instance
export const seasonalService = SeasonalRecommendationService.getInstance();
