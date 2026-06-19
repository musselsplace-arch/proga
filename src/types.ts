export enum MenuCategory {
  CoffeeBlack = 'Black Coffee ☕',
  CoffeeMilk = 'Coffee with Milk 🥛',
  CoffeeCold = 'Cold & Refreshing 🧊',
  CoffeeAddons = 'Addons & Extras 💡',
  BreakfastStarters = 'Breakfast & Starters',
  Salads = 'Salads',
  Sandwiches = 'Sandwiches',
  WineBitesPlatters = 'Wine Bites & Platters',
  Desserts = 'Desserts',
  WineClassicWhite = 'Classic White Wine',
  WineQvevriAmber = 'Qvevri & Amber Wine',
  WineRed = 'Red Wine',
  WineSparklingPetNat = 'Sparkling & Pet-Nat',
  WineRose = 'Rosé Wine',
}

export interface MenuItem {
  id: string;
  nameKa: string;
  nameEn: string;
  category: MenuCategory;
  detailsKa?: string;
  detailsEn?: string;
  isWine: boolean;
  // If isWine is false
  price?: number;
  // If isWine is true
  glassPrice?: number;
  bottlePrice?: number;
}

export type OrderOption = 'standard' | 'glass' | 'bottle';

export interface CartItem {
  id: string; // Unique for cart (combining item ID and selectedOption)
  menuItem: MenuItem;
  quantity: number;
  selectedOption: OrderOption;
  unitPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  discountPercent: number; // 0 to 100
  discountAmount: number;
  serviceChargePercent: number; // e.g. 10% standard in Georgia
  serviceChargeAmount: number;
  total: number;
  paymentMethod: 'cash' | 'card';
  timestamp: string; // ISO String
  tableNumber: string; // e.g., 'Takeaway', 'Table 1', etc.
  cashierName: string;
  status: 'completed' | 'refunded';
}

export interface TableState {
  tableId: string; // 'Takeaway', 'T1', 'T2', etc.
  tableNameKa: string;
  tableNameEn: string;
  items: CartItem[];
  discountPercent: number;
  serviceChargePercent: number;
}

export interface PrinterState {
  isConnected: boolean;
  deviceName: string;
  printWidth: '58mm' | '80mm';
  printerEncoding: 'utf8' | 'translit' | 'english';
}
