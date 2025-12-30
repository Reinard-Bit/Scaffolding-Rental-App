
import { InventoryItem, ItemCategory, Customer, RentalStatus, Rental, Purchase } from './types';

export const DEFAULT_LATE_FEE_MULTIPLIER = 1.5; // 1.5x daily rate for overdue days

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Main Frame 170', category: ItemCategory.STANDARDS, totalQuantity: 500, availableQuantity: 320, damagedQuantity: 5, missingQuantity: 2, unitPrice: 500, monthlyPrice: 10000, lastMaintenance: '2024-01-15' },
  { id: '2', name: 'Cross Brace 220', category: ItemCategory.LEDGERS, totalQuantity: 1000, availableQuantity: 450, damagedQuantity: 12, missingQuantity: 5, unitPrice: 250, monthlyPrice: 5000, lastMaintenance: '2024-02-10' },
  { id: '3', name: 'Catwalk', category: ItemCategory.BOARDS, totalQuantity: 300, availableQuantity: 150, damagedQuantity: 8, missingQuantity: 1, unitPrice: 3000, monthlyPrice: 60000, lastMaintenance: '2024-01-20' },
  { id: '4', name: 'Join Pin', category: ItemCategory.ACCESSORIES, totalQuantity: 2000, availableQuantity: 1500, damagedQuantity: 50, missingQuantity: 20, unitPrice: 100, monthlyPrice: 1250, lastMaintenance: '2023-12-05' },
  { id: '5', name: 'Roda Rem (Brake)', category: ItemCategory.ACCESSORIES, totalQuantity: 200, availableQuantity: 100, damagedQuantity: 2, missingQuantity: 0, unitPrice: 1500, monthlyPrice: 30000, lastMaintenance: '2024-03-01' },
  { id: '6', name: 'Roda Tanpa Rem', category: ItemCategory.ACCESSORIES, totalQuantity: 200, availableQuantity: 180, damagedQuantity: 0, missingQuantity: 0, unitPrice: 1250, monthlyPrice: 25000, lastMaintenance: '2024-03-05' },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'John Doe', company: 'BuildRight Corp', email: 'john@buildright.com', phone: '+62 811 0123 456', address: 'Jl. Sudirman No. 45, Jakarta', status: 'active' },
  { id: 'c2', name: 'Sarah Smith', company: 'Skyline Dev', email: 'sarah@skyline.com', phone: '+62 812 4567 890', address: 'Kawasan Industri MM2100, Bekasi', status: 'active' },
  { id: 'c3', name: 'Mike Johnson', company: 'Renovate Inc', email: 'mike@renovate.com', phone: '+62 813 8901 234', address: 'Jl. Gatot Subroto Kav. 10, Bandung', status: 'active' },
];

export const INITIAL_RENTALS: Rental[] = [
  {
    id: 'r1',
    customerId: 'c1',
    items: [{ itemId: '1', quantity: 50 }, { itemId: '2', quantity: 100 }],
    startDate: '2024-03-01',
    endDate: '2024-03-25',
    status: RentalStatus.ACTIVE,
    paymentStatus: 'Pending',
    totalCost: 1000000,
    deliveryAddress: 'Jl. Sudirman No. 45, Jakarta',
    deposit: 500000,
    depositStatus: 'Pending'
  },
  {
    id: 'r2',
    customerId: 'c2',
    items: [{ itemId: '3', quantity: 200 }],
    startDate: '2024-02-15',
    endDate: '2024-03-05',
    status: RentalStatus.RETURNED,
    paymentStatus: 'Paid',
    totalCost: 12000000,
    deliveryAddress: 'Kawasan Industri MM2100, Bekasi',
    deposit: 2000000,
    depositStatus: 'Refunded',
    refundedAmount: 2000000
  }
];

export const INITIAL_PURCHASES: Purchase[] = [
  { id: 'p1', itemId: '1', supplier: 'Scaffold Hub Indo', quantity: 100, purchasePrice: 25000000, purchaseDate: '2024-01-10', paymentStatus: 'Paid' },
  { id: 'p2', itemId: '4', supplier: 'Global Access Gear', quantity: 500, purchasePrice: 5000000, purchaseDate: '2023-12-01', paymentStatus: 'Paid' },
];