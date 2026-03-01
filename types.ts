
export enum RentalStatus {
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

export enum ItemCategory {
  STANDARDS = 'Standards',
  LEDGERS = 'Ledgers',
  TRANSOMS = 'Transoms',
  BOARDS = 'Boards',
  ACCESSORIES = 'Accessories',
  SAFETY = 'Safety Gear'
}

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  totalQuantity: number;
  availableQuantity: number;
  damagedQuantity: number; // Items needing repair
  missingQuantity: number; // Lifetime lost items
  unitPrice: number; // Price per day
  monthlyPrice: number; // Price per month
  lastMaintenance: string;
}

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
}

export interface RentalItem {
  itemId: string;
  quantity: number;
}

export interface ReturnItemSnapshot {
  itemId: string;
  good: number;
  damaged: number;
  missing: number;
}

export interface Rental {
  id: string;
  customerId: string;
  items: RentalItem[];
  startDate: string;
  endDate: string;
  status: RentalStatus;
  paymentStatus: 'Paid' | 'Pending' | 'Overdue';
  totalCost: number;
  lateFee?: number;
  damageFee?: number;
  finalRevenue?: number;
  deliveryAddress: string;
  returnSnapshot?: ReturnItemSnapshot[];
  deposit?: number;
  deliveryFee?: number;
  depositStatus?: 'Pending' | 'Refunded' | 'Withheld' | 'Partial';
  refundedAmount?: number;
  rateType?: 'Daily' | 'Monthly';
  manualMonths?: number;
  createdAt?: string;
}

export interface PurchaseItem {
  itemId: string;
  quantity: number;
  purchasePrice: number;
}

export interface Purchase {
  id: string;
  supplier: string;
  purchaseDate: string;
  paymentStatus: 'Paid' | 'Pending';
  
  // Legacy fields (for single item purchases)
  itemId?: string;
  quantity?: number;
  purchasePrice?: number;

  // New fields (for bulk purchases)
  items?: PurchaseItem[];
  totalCost?: number;
}

export type ViewType = 'dashboard' | 'inventory' | 'customers' | 'rentals' | 'purchasing' | 'maintenance' | 'losses';