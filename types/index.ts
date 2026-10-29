export interface Restaurant {
  id: string;
  name: string;
  category: string;
  district: string;
  priceRange: "$" | "$$" | "$$$" | "$$$$";
  openingHours: string;
  ratingSum: number;
  ratingCount: number;
  averageRating: number;
  address?: string;
}

export interface UserProfile {
  deviceId: string;
  createdAt: string;
  isGuest: boolean;
  ratedRestaurants: Record<string, number>;
}