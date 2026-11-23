export interface RestaurantSummary {
  id: string;
  name: string;
  cuisine: string;
  isOpen: boolean;
  hoursLabel: string;
  deliveryFeeCents: number;
  etaLabel: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  isAvailable: boolean;
}

export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

export interface RestaurantMenu extends RestaurantSummary {
  serviceLocations: string[];
  menuUpdatedAt: string;
  categories: MenuCategory[];
}
