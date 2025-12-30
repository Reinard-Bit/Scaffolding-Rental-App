
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  History, 
  Plus, 
  Search, 
  TrendingUp, 
  AlertTriangle,
  Menu,
  FileText,
  Loader2,
  Cpu,
  ChevronRight,
  ChevronDown,
  Truck,
  ShoppingCart,
  X,
  Trash2,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
  Pencil,
  MapPin,
  AlertCircle,
  Calendar,
  Calculator,
  RotateCcw,
  Ban,
  Hammer,
  Wrench,
  Archive,
  Hourglass,
  Bell,
  Wallet,
  Coins,
  CalendarClock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { 
  InventoryItem, 
  Customer, 
  Rental, 
  ViewType, 
  RentalStatus,
  Purchase,
  ItemCategory,
  ReturnItemSnapshot
} from './types';
import { 
  INITIAL_INVENTORY, 
  INITIAL_CUSTOMERS, 
  INITIAL_RENTALS, 
  INITIAL_PURCHASES,
  DEFAULT_LATE_FEE_MULTIPLIER
} from './constants';
import { analyzeFleet } from './services/geminiService';

interface BulkPurchaseRow {
  id: string;
  itemId: string;
  supplier: string;
  quantity: number;
  purchasePrice: number;
  paymentStatus: 'Paid' | 'Pending';
}

interface RentalItemRow {
  id: string; // temporary id for UI list
  itemId: string;
  quantity: number;
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('dashboard');
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [rentals, setRentals] = useState<Rental[]>(INITIAL_RENTALS);
  const [purchases, setPurchases] = useState<Purchase[]>(INITIAL_PURCHASES);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'All' | 'Paid' | 'Pending'>('All');
  
  // Notification State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Modal states
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  
  // New/Edit Item State
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemForm, setNewItemForm] = useState<{
    name: string;
    category: ItemCategory;
    unitPrice: number;
    monthlyPrice: number;
    initialStock: number;
  }>({
    name: '',
    category: ItemCategory.STANDARDS,
    unitPrice: 0,
    monthlyPrice: 0,
    initialStock: 0
  });

  // Delete Item State
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleteInventoryModalOpen, setIsDeleteInventoryModalOpen] = useState(false);

  // Maintenance Modal State
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceItem, setMaintenanceItem] = useState<InventoryItem | null>(null);
  const [maintenanceAction, setMaintenanceAction] = useState<'repair' | 'discard'>('repair');
  const [maintenanceQuantity, setMaintenanceQuantity] = useState<number>(0);
  
  // Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [rentalToReturn, setRentalToReturn] = useState<Rental | null>(null);
  const [returnDate, setReturnDate] = useState('');
  const [returnQuantities, setReturnQuantities] = useState<Record<string, { good: number, damaged: number, missing: number }>>({});
  const [lateFeeMultiplier, setLateFeeMultiplier] = useState<number>(DEFAULT_LATE_FEE_MULTIPLIER);
  const [refundAmount, setRefundAmount] = useState<number>(0);

  // Extend Rental Modal State
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [rentalToExtend, setRentalToExtend] = useState<Rental | null>(null);
  const [extensionDate, setExtensionDate] = useState('');

  // Delete Customer State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  // Expand Customer State
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  // Expand Rental State
  const [expandedRentalId, setExpandedRentalId] = useState<string | null>(null);
  const toggleRentalExpand = (rentalId: string) => setExpandedRentalId(prev => prev === rentalId ? null : rentalId);

  // Set Logic State
  const [setCount, setSetCount] = useState<number>(1);
  
  const [singlePurchase, setSinglePurchase] = useState<{
    itemId: string;
    supplier: string;
    quantity: number;
    purchasePrice: number;
    paymentStatus: 'Paid' | 'Pending';
  }>({
    itemId: '',
    supplier: '',
    quantity: 1,
    purchasePrice: 0,
    paymentStatus: 'Paid'
  });

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: ''
  });

  const [rentalForm, setRentalForm] = useState<{
    customerId: string;
    startDate: string;
    endDate: string;
    items: RentalItemRow[];
    rateType: 'Daily' | 'Monthly';
    manualMonths: number;
    deliveryAddress: string;
    deposit: number;
    deliveryFee: number;
    paymentStatus: 'Paid' | 'Pending' | 'Overdue';
  }>({
    customerId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    items: [{ id: '1', itemId: '', quantity: 1 }],
    rateType: 'Daily',
    manualMonths: 1,
    deliveryAddress: '',
    deposit: 0,
    deliveryFee: 0,
    paymentStatus: 'Pending'
  });

  const [bulkRows, setBulkRows] = useState<BulkPurchaseRow[]>([
    { id: '1', itemId: '', supplier: '', quantity: 1, purchasePrice: 0, paymentStatus: 'Paid' }
  ]);

  // Grouping State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Check for overdue rentals on mount and calculate alerts
  const alerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeAlerts: { id: string, type: 'critical' | 'warning', title: string, message: string, date: string, rentalId: string }[] = [];

    rentals.forEach(r => {
      // Skip if returned or cancelled
      if (r.status !== RentalStatus.ACTIVE && r.status !== RentalStatus.OVERDUE) return;

      // Parse dates (assuming YYYY-MM-DD)
      const [y, m, d] = r.endDate.split('-').map(Number);
      const endDate = new Date(y, m - 1, d); // Month is 0-indexed in JS Date
      
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const customer = customers.find(c => c.id === r.customerId);
      const customerName = customer ? customer.name : 'Unknown Client';

      if (diffDays < 0) {
        // Overdue
        activeAlerts.push({
          id: `overdue-${r.id}`,
          type: 'critical',
          title: 'Overdue Rental',
          message: `Rental #${r.id.toUpperCase()} (${customerName}) is overdue by ${Math.abs(diffDays)} days.`,
          date: r.endDate,
          rentalId: r.id
        });
      } else if (diffDays <= 3) {
        // Upcoming within 3 days
         activeAlerts.push({
          id: `upcoming-${r.id}`,
          type: 'warning',
          title: 'Return Due Soon',
          message: `Rental #${r.id.toUpperCase()} (${customerName}) is due ${diffDays === 0 ? 'today' : `in ${diffDays} days`}.`,
          date: r.endDate,
          rentalId: r.id
        });
      }
    });

    return activeAlerts.sort((a, b) => (a.type === 'critical' ? -1 : 1));
  }, [rentals, customers]);

  // Browser Notification Trigger
  useEffect(() => {
     // Check if we have critical alerts and permission granted
     const criticalCount = alerts.filter(a => a.type === 'critical').length;
     if (criticalCount > 0 && "Notification" in window && Notification.permission === "granted") {
         // Prevent spamming by checking a flag or just notify summary
         // Simple implementation: Notify on first load if criticals exist
     }
  }, [alerts]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
       alert("This browser does not support desktop notifications.");
       return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
       new Notification("ScaffoldPro Alerts Enabled", { body: "You will be notified of overdue and upcoming rentals." });
    }
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setRentals(prevRentals => prevRentals.map(rental => {
      if (rental.status === RentalStatus.ACTIVE && rental.endDate < today) {
        return { ...rental, status: RentalStatus.OVERDUE };
      }
      return rental;
    }));
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('IDR', 'Rp');
  };

  const toggleCustomerExpand = (customerId: string) => {
    setExpandedCustomerId(prev => prev === customerId ? null : customerId);
  };

  const totalDamagedItems = inventory.reduce((acc, i) => acc + (i.damagedQuantity || 0), 0);
  const totalMissingItems = inventory.reduce((acc, i) => acc + (i.missingQuantity || 0), 0);

  const stats = {
    totalRevenue: rentals.reduce((acc, r) => acc + r.totalCost + (r.lateFee || 0) + (r.deliveryFee || 0), 0),
    totalProcurement: purchases.reduce((acc, p) => acc + p.purchasePrice, 0),
    activeRentals: rentals.filter(r => r.status === RentalStatus.ACTIVE).length,
    overdueRentals: rentals.filter(r => r.status === RentalStatus.OVERDUE).length,
    lowStockItems: inventory.filter(i => (i.availableQuantity / i.totalQuantity) < 0.2).length,
    totalCustomers: customers.length
  };

  const chartData = inventory.map(item => {
    // Calculate actual active rented quantity
    const activeRentedQty = rentals
      .filter(r => r.status === RentalStatus.ACTIVE || r.status === RentalStatus.OVERDUE)
      .reduce((acc, r) => {
        const rItem = r.items.find(ri => ri.itemId === item.id);
        return acc + (rItem ? rItem.quantity : 0);
      }, 0);

    const damagedQty = item.damagedQuantity || 0;
    
    return {
      name: item.name,
      available: item.availableQuantity,
      rented: activeRentedQty,
      damaged: damagedQty
    };
  });

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeFleet(inventory, rentals);
    setAiAnalysis(result || "No insights available at this moment.");
    setIsAnalyzing(false);
  };

  // --- Inventory Logic ---
  const handleOpenEditItem = (item: InventoryItem) => {
    setNewItemForm({
      name: item.name,
      category: item.category,
      unitPrice: item.unitPrice,
      monthlyPrice: item.monthlyPrice,
      initialStock: item.totalQuantity
    });
    setEditingItemId(item.id);
    setIsNewItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name) return;

    if (editingItemId) {
      // Edit Mode
      setInventory(prev => prev.map(item => {
        if (item.id === editingItemId) {
          const stockDiff = newItemForm.initialStock - item.totalQuantity;
          // Validate if reducing stock below rented amount
          if (item.availableQuantity + stockDiff < 0) {
            alert("Cannot reduce stock quantity below the currently rented amount.");
            return item; // Return original
          }
          
          return {
            ...item,
            name: newItemForm.name,
            category: newItemForm.category,
            unitPrice: newItemForm.unitPrice,
            monthlyPrice: newItemForm.monthlyPrice,
            totalQuantity: newItemForm.initialStock,
            availableQuantity: item.availableQuantity + stockDiff
            // Preserve damaged and missing quantities implicitly via ...item logic if we hadn't destructured
            // but here we return explicit fields, so ensure we keep them if they exist on item
          };
        }
        return item;
      }));
    } else {
      // Create Mode
      const newItem: InventoryItem = {
        id: `INV-${Date.now()}`,
        name: newItemForm.name,
        category: newItemForm.category,
        totalQuantity: newItemForm.initialStock,
        availableQuantity: newItemForm.initialStock,
        damagedQuantity: 0,
        missingQuantity: 0,
        unitPrice: newItemForm.unitPrice,
        monthlyPrice: newItemForm.monthlyPrice,
        lastMaintenance: new Date().toISOString().split('T')[0]
      };
      setInventory(prev => [...prev, newItem]);
    }

    setIsNewItemModalOpen(false);
    setNewItemForm({
      name: '',
      category: ItemCategory.STANDARDS,
      unitPrice: 0,
      monthlyPrice: 0,
      initialStock: 0
    });
    setEditingItemId(null);
  };

  const initiateDeleteItem = (id: string) => {
    setItemToDelete(id);
    setIsDeleteInventoryModalOpen(true);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      // Check for active rentals
      const hasActiveRentals = rentals.some(r => 
        (r.status === RentalStatus.ACTIVE || r.status === RentalStatus.OVERDUE) && r.items.some(ri => ri.itemId === itemToDelete)
      );

      if (hasActiveRentals) {
        alert("Cannot delete equipment that is currently rented out (including overdue items). Please process returns first.");
        setIsDeleteInventoryModalOpen(false);
        return;
      }

      setInventory(prev => prev.filter(i => i.id !== itemToDelete));
      setIsDeleteInventoryModalOpen(false);
      setItemToDelete(null);
    }
  };

  // --- Maintenance & Repair Logic ---
  const handleOpenMaintenance = (item: InventoryItem, action: 'repair' | 'discard') => {
    setMaintenanceItem(item);
    setMaintenanceAction(action);
    setMaintenanceQuantity(0);
    setIsMaintenanceModalOpen(true);
  };

  const handleMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceItem || maintenanceQuantity <= 0) return;

    if (maintenanceQuantity > maintenanceItem.damagedQuantity) {
        alert("Cannot process more items than are currently damaged.");
        return;
    }

    setInventory(prev => prev.map(item => {
        if (item.id === maintenanceItem.id) {
            if (maintenanceAction === 'repair') {
                // Move from Damaged to Available
                return {
                    ...item,
                    damagedQuantity: item.damagedQuantity - maintenanceQuantity,
                    availableQuantity: item.availableQuantity + maintenanceQuantity
                };
            } else {
                // Discard: Remove from Damaged AND Total
                return {
                    ...item,
                    damagedQuantity: item.damagedQuantity - maintenanceQuantity,
                    totalQuantity: item.totalQuantity - maintenanceQuantity
                };
            }
        }
        return item;
    }));

    setIsMaintenanceModalOpen(false);
    setMaintenanceItem(null);
    setMaintenanceQuantity(0);
  };

  // --- Purchase Logic ---
  const addBulkRow = () => {
    setBulkRows([...bulkRows, { id: Date.now().toString(), itemId: '', supplier: '', quantity: 1, purchasePrice: 0, paymentStatus: 'Paid' }]);
  };

  const removeBulkRow = (id: string) => {
    if (bulkRows.length > 1) {
      setBulkRows(bulkRows.filter(row => row.id !== id));
    }
  };

  const updateBulkRow = (id: string, field: keyof BulkPurchaseRow, value: any) => {
    setBulkRows(bulkRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  // --- Rental Logic ---
  const handleOpenRentalModal = () => {
    setRentalForm({
      customerId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      items: [{ id: Date.now().toString(), itemId: '', quantity: 1 }],
      rateType: 'Daily',
      manualMonths: 1,
      deliveryAddress: '',
      deposit: 0,
      deliveryFee: 0,
      paymentStatus: 'Pending'
    });
    setSetCount(1);
    setIsRentalModalOpen(true);
  };

  const addRentalItemRow = () => {
    setRentalForm(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now().toString(), itemId: '', quantity: 1 }]
    }));
  };

  const removeRentalItemRow = (id: string) => {
    if (rentalForm.items.length > 1) {
      setRentalForm(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id)
      }));
    }
  };

  const updateRentalItemRow = (id: string, field: keyof RentalItemRow, value: any) => {
    setRentalForm(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleAddSet = () => {
     const setItems = [
       { itemId: '1', multiplier: 2 },
       { itemId: '2', multiplier: 2 },
       { itemId: '4', multiplier: 4 },
     ];

     let currentItems = [...rentalForm.items];

     // Remove empty initial row if it exists and we are adding stuff
     if (currentItems.length === 1 && !currentItems[0].itemId) {
        currentItems = [];
     }

     setItems.forEach(({itemId, multiplier}) => {
        // Verify item exists in current inventory state (in case user deleted it)
        const inventoryItem = inventory.find(i => i.id === itemId);
        if (!inventoryItem) return;

        const qtyToAdd = setCount * multiplier;
        const existingRowIndex = currentItems.findIndex(r => r.itemId === itemId);

        if (existingRowIndex > -1) {
            currentItems[existingRowIndex] = {
                ...currentItems[existingRowIndex],
                quantity: currentItems[existingRowIndex].quantity + qtyToAdd
            };
        } else {
            currentItems.push({
                id: `auto-set-${Date.now()}-${itemId}`,
                itemId,
                quantity: qtyToAdd
            });
        }
     });

     if (currentItems.length === 0) {
         currentItems.push({ id: Date.now().toString(), itemId: '', quantity: 1 });
     }

     setRentalForm(prev => ({ ...prev, items: currentItems }));
  };

  const calculateDaysDiff = () => {
    if (!rentalForm.startDate || !rentalForm.endDate) return 0;
    const start = new Date(rentalForm.startDate);
    const end = new Date(rentalForm.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays > 0 ? diffDays : 0;
  };

  const getItemRentalCost = (item: InventoryItem, quantity: number, duration: number, isMonthlyFixed: boolean) => {
    if (isMonthlyFixed) {
       return item.monthlyPrice * quantity * duration;
    }

    const days = duration;
    if (item.monthlyPrice > 0) {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      const monthlyCost = months * item.monthlyPrice;
      const dailyCost = remainingDays * item.unitPrice;
      const effectiveRemainderCost = Math.min(dailyCost, item.monthlyPrice);
      return (monthlyCost + effectiveRemainderCost) * quantity;
    }
    return item.unitPrice * quantity * days;
  };

  const calculateRentalTotal = () => {
    if (rentalForm.rateType === 'Monthly') {
         return rentalForm.items.reduce((total, row) => {
          const item = inventory.find(i => i.id === row.itemId);
          if (!item) return total;
          return total + getItemRentalCost(item, row.quantity, rentalForm.manualMonths, true);
        }, 0);
    }
    
    const days = calculateDaysDiff();
    if (days === 0) return 0;

    return rentalForm.items.reduce((total, row) => {
      const item = inventory.find(i => i.id === row.itemId);
      if (!item) return total;
      return total + getItemRentalCost(item, row.quantity, days, false);
    }, 0);
  };

  const handleCreateRental = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentalForm.customerId || !rentalForm.startDate || !rentalForm.endDate || !rentalForm.deliveryAddress) return;

    // Validate Items
    const validItems = rentalForm.items.filter(i => i.itemId && i.quantity > 0);
    if (validItems.length === 0) return;

    // Check Stock Availability
    for (const row of validItems) {
      const item = inventory.find(i => i.id === row.itemId);
      if (!item) continue;
      if (row.quantity > item.availableQuantity) {
        alert(`Insufficient stock for ${item.name}. Available: ${item.availableQuantity}`);
        return;
      }
    }

    const newRental: Rental = {
      id: `R-${Date.now()}`,
      customerId: rentalForm.customerId,
      items: validItems.map(({ itemId, quantity }) => ({ itemId, quantity })),
      startDate: rentalForm.startDate,
      endDate: rentalForm.endDate,
      status: RentalStatus.ACTIVE,
      paymentStatus: rentalForm.paymentStatus,
      totalCost: calculateRentalTotal(),
      deliveryAddress: rentalForm.deliveryAddress,
      deposit: rentalForm.deposit,
      deliveryFee: rentalForm.deliveryFee,
      depositStatus: rentalForm.deposit > 0 ? 'Pending' : undefined
    };

    // Update Rentals
    setRentals([newRental, ...rentals]);

    // Update Inventory Stock
    const inventoryUpdates = new Map<string, number>();
    validItems.forEach(i => {
      inventoryUpdates.set(i.itemId, i.quantity);
    });

    setInventory(prev => prev.map(item => {
      const deductQty = inventoryUpdates.get(item.id);
      if (deductQty) {
        return {
          ...item,
          availableQuantity: item.availableQuantity - deductQty
        };
      }
      return item;
    }));

    setIsRentalModalOpen(false);
  };

  const cyclePaymentStatus = (e: React.MouseEvent, rentalId: string, currentStatus: string) => {
    e.stopPropagation();
    const statusMap: Record<string, 'Paid' | 'Pending' | 'Overdue'> = {
      'Pending': 'Paid',
      'Paid': 'Overdue',
      'Overdue': 'Pending'
    };
    const nextStatus = statusMap[currentStatus] || 'Pending';
    
    setRentals(prev => prev.map(r => r.id === rentalId ? { ...r, paymentStatus: nextStatus } : r));
  };

  // --- Extension Logic ---
  const handleExtendClick = (rental: Rental) => {
    setRentalToExtend(rental);
    // Default extension date to current end date
    setExtensionDate(rental.endDate);
    setIsExtendModalOpen(true);
  };

  const calculateExtensionFinancials = () => {
    if (!rentalToExtend || !extensionDate) return { newTotal: 0, additionalCost: 0, newDays: 0 };
    
    const start = new Date(rentalToExtend.startDate);
    const newEnd = new Date(extensionDate);
    const oldEnd = new Date(rentalToExtend.endDate);

    // Calculate duration in days for the whole period (start to new end)
    const diffTime = newEnd.getTime() - start.getTime();
    let newDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (newDays <= 0) newDays = 0;

    // Calculate new item cost based on total duration
    // We use the 'smart' daily calculation which applies monthly rates if optimal
    const newItemCost = rentalToExtend.items.reduce((total, rItem) => {
        const item = inventory.find(i => i.id === rItem.itemId);
        if (!item) return total;
        return total + getItemRentalCost(item, rItem.quantity, newDays, false);
    }, 0);

    const additionalCost = newItemCost - rentalToExtend.totalCost;

    return {
        newTotal: newItemCost,
        additionalCost,
        newDays
    };
  };

  const handleProcessExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentalToExtend || !extensionDate) return;

    // Ensure new date is after start date
    if (new Date(extensionDate) <= new Date(rentalToExtend.startDate)) {
        alert("New end date must be after the start date.");
        return;
    }
    
    // Ensure new date is after old end date (extension implies adding time)
    if (new Date(extensionDate) <= new Date(rentalToExtend.endDate)) {
        alert("To shorten a rental, please use the Return function instead.");
        return;
    }

    const { newTotal } = calculateExtensionFinancials();

    // Determine status: if we extended to a future date relative to today, it's ACTIVE
    // If we extended but the new date is still in the past (backdating correction?), check against today
    const today = new Date().toISOString().split('T')[0];
    const newStatus = extensionDate < today ? RentalStatus.OVERDUE : RentalStatus.ACTIVE;

    setRentals(prev => prev.map(r => {
        if (r.id === rentalToExtend.id) {
            return {
                ...r,
                endDate: extensionDate,
                totalCost: newTotal,
                status: newStatus
            };
        }
        return r;
    }));

    setIsExtendModalOpen(false);
    setRentalToExtend(null);
  };

  // --- Return Logic ---
  const handleReturnClick = (rental: Rental) => {
    setRentalToReturn(rental);
    // Default return date to today
    setReturnDate(new Date().toISOString().split('T')[0]);
    // Reset late fee multiplier to default
    setLateFeeMultiplier(DEFAULT_LATE_FEE_MULTIPLIER);
    // Initialize refund amount to full deposit if exists
    setRefundAmount(rental.deposit || 0);
    
    // Initialize quantities with assumption all are good
    const initialQty: Record<string, { good: number, damaged: number, missing: number }> = {};
    rental.items.forEach(item => {
      initialQty[item.itemId] = { good: item.quantity, damaged: 0, missing: 0 };
    });
    setReturnQuantities(initialQty);
    
    setIsReturnModalOpen(true);
  };

  const updateReturnQty = (itemId: string, field: 'good' | 'damaged' | 'missing', value: number) => {
    setReturnQuantities(prev => ({
        ...prev,
        [itemId]: {
            ...prev[itemId],
            [field]: Math.max(0, value)
        }
    }));
  };

  const calculateReturnFinancials = () => {
    if (!rentalToReturn || !returnDate) return { baseCost: 0, lateFee: 0, total: 0, overdueDays: 0 };
    
    const start = new Date(rentalToReturn.startDate);
    const endContract = new Date(rentalToReturn.endDate);
    const actualReturn = new Date(returnDate);

    // Calculate Base Duration (Original Contract or Actual if returned early)
    // If returned early, we usually charge for the actual duration, or the full contract depending on policy.
    // Let's assume we charge for actual duration used, unless it's a fixed monthly.
    // However, for simplified logic here:
    // 1. Calculate cost from Start -> Min(ReturnDate, EndContractDate)
    
    const endBaseCalc = actualReturn < endContract ? actualReturn : endContract;
    const baseDiffTime = endBaseCalc.getTime() - start.getTime();
    let baseDays = Math.ceil(baseDiffTime / (1000 * 60 * 60 * 24));
    if (baseDays <= 0) baseDays = 1;

    const baseCost = rentalToReturn.items.reduce((total, rItem) => {
      const item = inventory.find(i => i.id === rItem.itemId);
      if (!item) return total;
      // Note: We use daily logic here for flexibility in returns, even if originally monthly
      // Ideally check if original was monthly fixed, but for now we recalculate based on duration usage
      return total + getItemRentalCost(item, rItem.quantity, baseDays, false);
    }, 0);

    // Calculate Late Fees
    let lateFee = 0;
    let overdueDays = 0;

    if (actualReturn > endContract) {
        const lateDiffTime = actualReturn.getTime() - endContract.getTime();
        overdueDays = Math.ceil(lateDiffTime / (1000 * 60 * 60 * 24));
        
        if (overdueDays > 0) {
            lateFee = rentalToReturn.items.reduce((total, rItem) => {
                const item = inventory.find(i => i.id === rItem.itemId);
                if (!item) return total;
                // Late fee is usually Daily Rate * Overdue Days * Multiplier
                // getItemRentalCost handles the daily rate logic
                const dailyLateCost = getItemRentalCost(item, rItem.quantity, overdueDays, false);
                return total + (dailyLateCost * lateFeeMultiplier);
            }, 0);
        }
    }

    return {
        baseCost,
        lateFee,
        total: baseCost + lateFee,
        overdueDays
    };
  };

  const handleProcessReturn = () => {
    if (!rentalToReturn) return;

    // Validate totals
    for (const item of rentalToReturn.items) {
        const qty = returnQuantities[item.itemId];
        if (!qty) continue;
        const totalEntered = qty.good + qty.damaged + qty.missing;
        if (totalEntered !== item.quantity) {
            alert(`Please verify quantities for item ID ${item.itemId}. Total (Good+Damaged+Missing) must equal the rented quantity (${item.quantity}).`);
            return;
        }
    }

    // Determine deposit status
    let depositStatus: 'Pending' | 'Refunded' | 'Withheld' | 'Partial' | undefined = undefined;
    if (rentalToReturn.deposit && rentalToReturn.deposit > 0) {
        if (refundAmount === rentalToReturn.deposit) {
            depositStatus = 'Refunded';
        } else if (refundAmount === 0) {
            depositStatus = 'Withheld';
        } else {
            depositStatus = 'Partial';
        }
    }

    const { total, lateFee } = calculateReturnFinancials();

    // 1. Update Inventory
    setInventory(prev => prev.map(invItem => {
        const returnData = returnQuantities[invItem.id];
        if (returnData) {
            // Good: Return to available stock
            // Damaged: Stays in total stock, Added to damaged pile (needs repair)
            // Missing: Removed from total stock (lost), Added to missing log
            return {
                ...invItem,
                availableQuantity: invItem.availableQuantity + returnData.good,
                damagedQuantity: (invItem.damagedQuantity || 0) + returnData.damaged,
                missingQuantity: (invItem.missingQuantity || 0) + returnData.missing,
                totalQuantity: invItem.totalQuantity - returnData.missing
            };
        }
        return invItem;
    }));

    // 2. Create Snapshot
    const snapshot: ReturnItemSnapshot[] = Object.entries(returnQuantities).map(([itemId, qtys]) => ({
        itemId,
        good: qtys.good,
        damaged: qtys.damaged,
        missing: qtys.missing
    }));

    // 3. Update Rental Status
    setRentals(prev => prev.map(r => {
      if (r.id === rentalToReturn.id) {
        return { 
          ...r, 
          status: RentalStatus.RETURNED,
          endDate: returnDate, // Update to actual return date
          totalCost: total, // Update cost to actual based on date + late fees
          lateFee: lateFee > 0 ? lateFee : undefined,
          returnSnapshot: snapshot,
          depositStatus: depositStatus,
          refundedAmount: refundAmount
        };
      }
      return r;
    }));

    setIsReturnModalOpen(false);
    setRentalToReturn(null);
  };

  // --- Customer Logic ---
  const handleOpenAddCustomer = () => {
    setNewCustomer({ name: '', company: '', email: '', phone: '', address: '' });
    setEditingCustomerId(null);
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (customer: Customer) => {
    setNewCustomer({
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
      address: customer.address
    });
    setEditingCustomerId(customer.id);
    setIsCustomerModalOpen(true);
  };

  const initiateDeleteCustomer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomerToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteCustomer = () => {
    if (customerToDelete) {
      setCustomers(customers.filter(c => c.id !== customerToDelete));
      setIsDeleteModalOpen(false);
      setIsCustomerModalOpen(false); // Close edit modal as well
      setCustomerToDelete(null);
      setEditingCustomerId(null);
    }
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.address) return;

    if (editingCustomerId) {
      // Edit mode
      setCustomers(customers.map(c => c.id === editingCustomerId ? {
        ...c,
        name: newCustomer.name,
        company: newCustomer.company,
        email: newCustomer.email,
        phone: newCustomer.phone,
        address: newCustomer.address
      } : c));
    } else {
      // Add mode
      const customer: Customer = {
        id: `c-${Date.now()}`,
        name: newCustomer.name,
        company: newCustomer.company || 'Private Client',
        email: newCustomer.email,
        phone: newCustomer.phone,
        address: newCustomer.address,
        status: 'active'
      };
      setCustomers([customer, ...customers]);
    }

    setIsCustomerModalOpen(false);
    setNewCustomer({ name: '', company: '', email: '', phone: '', address: '' });
    setEditingCustomerId(null);
  };

  const handleResupply = (e: React.FormEvent) => {
    e.preventDefault();
    const purchaseDate = new Date().toISOString().split('T')[0];
    const newPurchasesList: Purchase[] = [];
    const inventoryUpdateMap: Record<string, number> = {};

    if (isBulkMode) {
      const validRows = bulkRows.filter(row => row.itemId && row.supplier);
      if (validRows.length === 0) return;

      const transactionId = Date.now().toString();
      validRows.forEach((row, index) => {
        newPurchasesList.push({
          id: `P-BULK-${transactionId}-${index}`,
          itemId: row.itemId,
          supplier: row.supplier,
          quantity: row.quantity,
          purchasePrice: row.purchasePrice,
          purchaseDate,
          paymentStatus: row.paymentStatus
        });
        inventoryUpdateMap[row.itemId] = (inventoryUpdateMap[row.itemId] || 0) + row.quantity;
      });
    } else {
      if (!singlePurchase.itemId || !singlePurchase.supplier) return;
      newPurchasesList.push({
        id: `P-SINGLE-${Date.now()}`,
        itemId: singlePurchase.itemId,
        supplier: singlePurchase.supplier,
        quantity: singlePurchase.quantity,
        purchasePrice: singlePurchase.purchasePrice,
        purchaseDate,
        paymentStatus: singlePurchase.paymentStatus
      });
      inventoryUpdateMap[singlePurchase.itemId] = (inventoryUpdateMap[singlePurchase.itemId] || 0) + singlePurchase.quantity;
    }

    // Update Purchases
    setPurchases([...newPurchasesList, ...purchases]);

    // Update Inventory
    setInventory(prev => prev.map(item => {
      if (inventoryUpdateMap[item.id]) {
        return {
          ...item,
          totalQuantity: item.totalQuantity + inventoryUpdateMap[item.id],
          availableQuantity: item.availableQuantity + inventoryUpdateMap[item.id]
        };
      }
      return item;
    }));

    setIsPurchaseModalOpen(false);
    // Reset forms
    setSinglePurchase({ itemId: '', supplier: '', quantity: 1, purchasePrice: 0, paymentStatus: 'Paid' });
    setBulkRows([{ id: '1', itemId: '', supplier: '', quantity: 1, purchasePrice: 0, paymentStatus: 'Paid' }]);
  };

  const toggleGroup = (groupId: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupId)) {
      newSet.delete(groupId);
    } else {
      newSet.add(groupId);
    }
    setExpandedGroups(newSet);
  };

  const NavItem = ({ id, icon: Icon, label }: { id: ViewType, icon: any, label: string }) => (
    <button
      onClick={() => { setView(id); setIsSidebarOpen(false); }}
      className={`flex items-center space-x-3 w-full p-3 rounded-xl transition-all duration-200 ${
        view === id 
          ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' 
          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
      }`}
    >
      <Icon size={18} />
      <span className="font-medium text-sm tracking-wide">{label}</span>
      {view === id && <ChevronRight size={14} className="ml-auto opacity-60" />}
    </button>
  );

  // Grouping Logic for Purchases
  const getBaseId = (id: string) => id.startsWith('P-BULK-') ? id.split('-').slice(0, 3).join('-') : id;
  
  const filteredPurchases = purchases.filter(p => {
    const item = inventory.find(i => i.id === p.itemId);
    const term = searchTerm.toLowerCase();
    
    // Payment Status Filter
    const matchesStatus = paymentStatusFilter === 'All' || p.paymentStatus === paymentStatusFilter;

    // Search Term Filter
    const matchesSearch = (
      p.supplier.toLowerCase().includes(term) ||
      (item && item.name.toLowerCase().includes(term)) ||
      p.id.toLowerCase().includes(term)
    );

    return matchesSearch && matchesStatus;
  });

  const groupedPurchases = new Map<string, Purchase[]>();
  filteredPurchases.forEach(p => {
    const baseId = getBaseId(p.id);
    if (!groupedPurchases.has(baseId)) {
        groupedPurchases.set(baseId, []);
    }
    groupedPurchases.get(baseId)!.push(p);
  });

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100 selection:bg-blue-500/30">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] border-r border-slate-800/60 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center space-x-3 mb-10 px-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-600/20">
              <Package size={22} />
            </div>
            <h1 className="text-xl font-bold tracking-tighter text-white">SCAFFOLD<span className="text-blue-500">PRO</span></h1>
          </div>
          
          <nav className="space-y-1.5 flex-1">
            <NavItem id="dashboard" icon={LayoutDashboard} label="Fleet Overview" />
            <NavItem id="inventory" icon={Package} label="Equipment Fleet" />
            <NavItem id="rentals" icon={History} label="Rental History" />
            <NavItem id="customers" icon={Users} label="Client Directory" />
            <NavItem id="purchasing" icon={Truck} label="Procurement" />
            
            <div className="pt-6 pb-2">
              <p className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-600">Health & Reports</p>
            </div>
            <NavItem id="maintenance" icon={Hammer} label="Maintenance" />
            <NavItem id="losses" icon={Ban} label="Loss Reports" />
          </nav>

          <div className="mt-auto pt-8">
            <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">System Operational</h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">Enterprise license active for 2024 billing cycle.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-[#020617]/80 backdrop-blur-md border-b border-slate-800/50 sticky top-0 z-30 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              className="lg:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-0.5">
                {view === 'customers' ? 'CUSTOMERS' : view === 'dashboard' ? 'Real-time Stats' : 
                 view === 'maintenance' ? 'Fleet Health' :
                 view === 'losses' ? 'Asset Tracking' : view}
              </h2>
              <h3 className="text-xl font-bold text-white capitalize">
                {view === 'customers' ? 'Customers' : view === 'dashboard' ? 'Fleet Dashboard' : 
                 view === 'purchasing' ? 'Purchase History' : 
                 view === 'maintenance' ? 'Repair Center' :
                 view === 'losses' ? 'Missing Items Log' : view}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-5">
            <div className="relative hidden md:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="Find anything..." 
                className="pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all w-72"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} 
                className="p-2.5 text-slate-400 hover:bg-slate-800 rounded-xl transition-all relative"
              >
                <Bell size={20} />
                {alerts.length > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#020617] animate-pulse" />
                )}
              </button>
              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-white/5">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <h4 className="text-sm font-bold text-white">Notifications</h4>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold">{alerts.length} New</span>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                        {alerts.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs italic">All caught up! No active alerts.</div>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className={`p-4 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors ${alert.type === 'critical' ? 'bg-rose-500/5' : ''}`}>
                                    <div className="flex items-start space-x-3">
                                        <div className={`mt-0.5 min-w-[8px] h-2 rounded-full ${alert.type === 'critical' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-amber-500'}`} />
                                        <div>
                                            <p className={`text-xs font-bold mb-1 ${alert.type === 'critical' ? 'text-rose-400' : 'text-amber-400'}`}>{alert.title}</p>
                                            <p className="text-[11px] text-slate-400 leading-relaxed">{alert.message}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <p className="text-[9px] text-slate-600 font-mono">Due: {alert.date}</p>
                                                <button 
                                                  onClick={() => {
                                                    setView('rentals');
                                                    setSearchTerm(alert.rentalId);
                                                    setIsNotificationsOpen(false);
                                                  }}
                                                  className="text-[9px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wider"
                                                >
                                                  View
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-2 bg-slate-900/50 border-t border-slate-800">
                        <button 
                          onClick={requestNotificationPermission} 
                          className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-wider hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Enable Desktop Alerts
                        </button>
                    </div>
                </div>
              )}
            </div>

            {view === 'purchasing' && (
              <div className="relative hidden md:block">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <Filter size={14} />
                </div>
                <select 
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value as 'All' | 'Paid' | 'Pending')}
                  className="pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none cursor-pointer font-medium"
                >
                  <option value="All">All Status</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <ChevronDown size={14} />
                </div>
              </div>
            )}

            {view === 'purchasing' ? (
              <button 
                onClick={() => setIsPurchaseModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
              >
                <Truck size={18} className="mr-2" /> RESUPPLY FLEET
              </button>
            ) : view === 'customers' ? (
              <button 
                onClick={handleOpenAddCustomer}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-lg shadow-blue-900/20 transition-all active:scale-95"
              >
                <Plus size={18} className="mr-2" /> ADD CLIENT
              </button>
            ) : view === 'rentals' ? (
               <button 
                onClick={handleOpenRentalModal}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-lg shadow-blue-900/20 transition-all active:scale-95"
              >
                <FileText size={18} className="mr-2" /> NEW RENTAL
              </button>
            ) : view === 'inventory' ? (
               <button 
                onClick={() => {
                   setEditingItemId(null);
                   setNewItemForm({
                     name: '',
                     category: ItemCategory.STANDARDS,
                     unitPrice: 0,
                     monthlyPrice: 0,
                     initialStock: 0
                   });
                   setIsNewItemModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-lg shadow-blue-900/20 transition-all active:scale-95"
              >
                <Plus size={18} className="mr-2" /> ADD EQUIPMENT
              </button>
            ) : (
              <div />
            )}
          </div>
        </header>

        {/* ... Rest of the component (Dashboard, Inventory views, etc.) ... */}
        <div className="p-8 max-w-[1600px] mx-auto">
          {view === 'dashboard' && (
             <div className="space-y-8">
              
              {/* Critical Alerts Section */}
              {alerts.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                      <Bell size={20} className="mr-2 text-rose-500" /> Action Required
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {alerts.slice(0, 3).map(alert => (
                          <div key={alert.id} className={`p-4 rounded-2xl border flex items-start space-x-3 transition-all ${
                              alert.type === 'critical' 
                              ? 'bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40' 
                              : 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40'
                          }`}>
                              <div className={`p-2.5 rounded-xl shrink-0 ${alert.type === 'critical' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                  {alert.type === 'critical' ? <AlertCircle size={20} /> : <Clock size={20} />}
                              </div>
                              <div>
                                  <h4 className={`text-sm font-bold ${alert.type === 'critical' ? 'text-rose-400' : 'text-amber-400'}`}>
                                      {alert.title}
                                  </h4>
                                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                      {alert.message}
                                  </p>
                                  <div className="mt-3 flex items-center space-x-3">
                                      <span className="text-[10px] font-mono bg-black/30 px-2 py-1 rounded text-slate-400">{alert.date}</span>
                                      <button 
                                         onClick={() => {
                                             setView('rentals');
                                             setSearchTerm(alert.rentalId);
                                         }}
                                         className="text-[10px] font-bold uppercase hover:text-white cursor-pointer opacity-70 hover:opacity-100 flex items-center"
                                      >
                                          View Details <ArrowRight size={10} className="ml-1" />
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ))}
                      {alerts.length > 3 && (
                        <div className="flex items-center justify-center p-4 rounded-2xl border border-slate-800 border-dashed hover:bg-slate-800/50 transition-all cursor-pointer" onClick={() => setIsNotificationsOpen(true)}>
                           <div className="text-center">
                              <p className="text-sm font-bold text-slate-400">+{alerts.length - 3} More Alerts</p>
                              <p className="text-[10px] text-slate-500 mt-1">Click notification bell to view all</p>
                           </div>
                        </div>
                      )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {[
                  { label: 'Total Fleet Investment', value: formatCurrency(stats.totalProcurement), icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Projected Revenue', value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Total Clients', value: stats.totalCustomers, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                  { label: 'Critical Stock', value: stats.lowStockItems, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                  { label: 'Damaged Items', value: totalDamagedItems, icon: Hammer, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                  { label: 'Items Lost (Missing)', value: totalMissingItems, icon: Ban, color: 'text-slate-400', bg: 'bg-slate-500/10' },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#0f172a] p-6 rounded-3xl border border-slate-800/50 shadow-sm hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                        <stat.icon size={22} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Current Status</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-[#0f172a] p-8 rounded-3xl border border-slate-800/50">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-lg font-bold text-white">Fleet Utilization</h3>
                      <p className="text-sm text-slate-500">Equipment availability, rentals, and maintenance status</p>
                    </div>
                    <div className="flex items-center space-x-3 text-xs">
                        <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-800 mr-1"></span> Available</div>
                        <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span> Rented</div>
                        <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-rose-500 mr-1"></span> Damaged</div>
                    </div>
                  </div>
                  <div className="h-[340px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={chartData} barGap={4} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis 
                          dataKey="name" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fill: '#64748b' }}
                          interval={0}
                        />
                        <YAxis 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fill: '#64748b' }}
                        />
                        <Tooltip 
                          cursor={{ fill: '#1e293b' }}
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            borderRadius: '16px', 
                            border: '1px solid #334155', 
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' 
                          }}
                          itemStyle={{ fontSize: '12px' }}
                        />
                        <Bar dataKey="rented" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} barSize={20} name="Rented" />
                        <Bar dataKey="available" stackId="a" fill="#1e293b" barSize={20} stroke="#334155" name="Available" />
                        <Bar dataKey="damaged" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} name="Damaged" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#0f172a] p-8 rounded-3xl border border-slate-800/50 flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold text-white flex items-center">
                      <Cpu size={20} className="mr-2 text-blue-500" /> Intelligence
                    </h3>
                    <button 
                      onClick={handleRunAnalysis}
                      disabled={isAnalyzing}
                      className="text-[10px] font-black uppercase tracking-widest bg-blue-600/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg hover:bg-blue-600/20 transition-all disabled:opacity-50"
                    >
                      {isAnalyzing ? <Loader2 className="animate-spin" size={12} /> : 'Process data'}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {aiAnalysis ? (
                      <div className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed space-y-4">
                        {aiAnalysis.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-10">
                        <div className="bg-slate-800/50 p-6 rounded-full mb-6 relative">
                           <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full" />
                           <Cpu size={40} className="text-slate-600 relative z-10" />
                        </div>
                        <h4 className="text-white font-bold mb-2">Ready for Analysis</h4>
                        <p className="text-xs text-slate-500 max-w-[220px] mx-auto leading-relaxed italic">
                          Click process to generate AI projections for your equipment fleet in IDR.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'inventory' && (
             <div className="bg-[#0f172a] rounded-3xl border border-slate-800/50 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/50 bg-slate-900/30">
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Equipment Identity</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Category</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Stock Metrics</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Rates (Day / Month)</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Health Status</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {inventory.filter(item => 
                      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.category.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((item) => {
                      const stockPercent = item.totalQuantity > 0 ? (item.availableQuantity / item.totalQuantity) * 100 : 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-all group cursor-default">
                          <td className="px-8 py-6">
                            <p className="font-bold text-white group-hover:text-blue-400 transition-colors mb-0.5">{item.name}</p>
                            <p className="text-[10px] text-slate-500 flex items-center">
                              ID: {item.id} <span className="mx-2">•</span> Maint: {item.lastMaintenance}
                            </p>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-md text-[10px] font-black uppercase tracking-tight">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-bold text-white">{item.availableQuantity}</span>
                              <span className="text-slate-600">/</span>
                              <span className="text-xs text-slate-500">{item.totalQuantity}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-blue-400">{formatCurrency(item.unitPrice)} <span className="text-[10px] text-slate-500 font-normal">/day</span></span>
                              <span className="text-xs font-bold text-slate-500">{formatCurrency(item.monthlyPrice)} <span className="text-[9px] font-normal">/mo</span></span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col space-y-2">
                                <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                      stockPercent < 20 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 
                                      stockPercent < 50 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 
                                      'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                    }`}
                                    style={{ width: `${stockPercent}%` }}
                                />
                                </div>
                                <p className={`text-[10px] font-bold ${stockPercent < 20 ? 'text-rose-500' : 'text-slate-500'}`}>
                                    {stockPercent < 20 ? 'CRITICAL LOW' : `${stockPercent.toFixed(0)}% AVAILABILITY`}
                                </p>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => handleOpenEditItem(item)}
                                className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                title="Edit Details"
                              >
                                  <Pencil size={16} />
                              </button>
                              <button 
                                onClick={() => initiateDeleteItem(item.id)}
                                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                title="Delete Item"
                              >
                                  <Trash2 size={16} />
                              </button>
                              <button 
                                onClick={() => setSelectedItemForHistory(item)}
                                className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                title="View History"
                              >
                                <History size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'maintenance' && (
             <div className="bg-[#0f172a] rounded-3xl border border-slate-800/50 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-slate-800/50">
                  <h3 className="text-lg font-bold text-white mb-2">Damaged Items Registry</h3>
                  <p className="text-sm text-slate-500">Track items returned in poor condition. Repair them to restore availability or discard them from the fleet.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/50 bg-slate-900/30">
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Equipment</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Total Damaged</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Impact</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {inventory.filter(item => 
                      (item.damagedQuantity && item.damagedQuantity > 0) &&
                      (item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    ).map((item) => {
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-all group">
                          <td className="px-8 py-6">
                             <div className="flex items-center space-x-3">
                                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                                   <Hammer size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-0.5">{item.name}</p>
                                    <p className="text-[10px] text-slate-500">{item.category}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-xl font-black text-rose-500">{item.damagedQuantity} <span className="text-xs font-normal text-slate-500">units</span></span>
                          </td>
                          <td className="px-8 py-6">
                             <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1">
                                <div className="h-full bg-rose-500" style={{ width: `${(item.damagedQuantity / item.totalQuantity) * 100}%` }} />
                             </div>
                             <span className="text-[10px] text-slate-500">{( (item.damagedQuantity / item.totalQuantity) * 100).toFixed(1)}% of total stock</span>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <div className="flex items-center justify-end space-x-3">
                                <button 
                                    onClick={() => handleOpenMaintenance(item, 'repair')}
                                    className="px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center"
                                >
                                    <Wrench size={14} className="mr-2" /> Repair
                                </button>
                                <button 
                                    onClick={() => handleOpenMaintenance(item, 'discard')}
                                    className="px-4 py-2 bg-slate-800 text-slate-400 border border-slate-700 hover:bg-rose-600/20 hover:text-rose-400 hover:border-rose-600/20 rounded-xl text-xs font-bold transition-all flex items-center"
                                >
                                    <Trash2 size={14} className="mr-2" /> Discard
                                </button>
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                    {inventory.filter(i => i.damagedQuantity && i.damagedQuantity > 0).length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-8 py-12 text-center text-slate-500">
                                <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500/50" />
                                <p>No damaged items currently reported. Fleet is in good condition.</p>
                            </td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'losses' && (
             <div className="bg-[#0f172a] rounded-3xl border border-slate-800/50 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-slate-800/50">
                  <h3 className="text-lg font-bold text-white mb-2">Missing Items Log</h3>
                  <p className="text-sm text-slate-500">Historical record of items reported missing or lost during rental periods.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/50 bg-slate-900/30">
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Equipment</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Category</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Lifetime Lost Quantity</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-right">Estimated Value Lost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {inventory.filter(item => 
                      (item.missingQuantity && item.missingQuantity > 0) &&
                      (item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    ).map((item) => {
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-all group">
                          <td className="px-8 py-6">
                             <div className="flex items-center space-x-3">
                                <div className="p-2 bg-slate-700/30 rounded-lg text-slate-400">
                                   <Ban size={20} />
                                </div>
                                <p className="font-bold text-white mb-0.5">{item.name}</p>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-md text-[10px] font-black uppercase tracking-tight">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-lg font-black text-white">{item.missingQuantity} <span className="text-xs font-normal text-slate-500">units</span></span>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <span className="text-sm font-bold text-slate-400">
                                 ~ {formatCurrency((item.unitPrice * 30) * item.missingQuantity)} 
                             </span>
                             <p className="text-[9px] text-slate-600 mt-0.5">Based on monthly rental value replacement calc</p>
                          </td>
                        </tr>
                      );
                    })}
                     {inventory.filter(i => i.missingQuantity && i.missingQuantity > 0).length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-8 py-12 text-center text-slate-500">
                                <p>No missing items recorded.</p>
                            </td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'purchasing' && (
             <div className="bg-[#0f172a] rounded-3xl border border-slate-800/50 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/30 border-b border-slate-800/50">
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">PURCHASE ID</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">EQUIPMENT</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">SUPPLIER</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">QUANTITY</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">DATE</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">STATUS</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-right">UNIT PRICE TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {Array.from(groupedPurchases.entries()).map(([baseId, group]) => {
                      const isBulkGroup = group.length > 1;
                      const isExpanded = expandedGroups.has(baseId);
                      
                      const firstItem = group[0];
                      const itemDetails = inventory.find(i => i.id === firstItem.itemId);
                      
                      const totalCost = group.reduce((acc, curr) => acc + curr.purchasePrice, 0);
                      const totalQty = group.reduce((acc, curr) => acc + curr.quantity, 0);
                      const distinctItemsCount = group.length;

                      // Logic for handling multiple suppliers in a group
                      const uniqueSuppliers = Array.from(new Set(group.map(p => p.supplier)));
                      const isMultiSupplier = uniqueSuppliers.length > 1;
                      const displaySupplier = isMultiSupplier ? 'Multiple Suppliers' : uniqueSuppliers[0];

                      // Logic for payment status
                      const hasPending = group.some(p => p.paymentStatus === 'Pending');
                      const allPending = group.every(p => p.paymentStatus === 'Pending');
                      const statusLabel = allPending ? 'Pending' : hasPending ? 'Mixed Status' : 'Paid';
                      const statusColor = allPending || hasPending ? 'text-amber-500' : 'text-emerald-500';

                      return (
                        <React.Fragment key={baseId}>
                          {/* Parent Row */}
                          <tr 
                            onClick={() => isBulkGroup && toggleGroup(baseId)}
                            className={`transition-all group ${isBulkGroup ? 'cursor-pointer hover:bg-slate-800/50' : 'hover:bg-slate-800/30'}`}
                          >
                            <td className="px-8 py-6 w-52">
                              <div className="flex items-center space-x-3">
                                {isBulkGroup && (
                                  <div className={`text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                    <ChevronRight size={14} />
                                  </div>
                                )}
                                <p className="font-mono text-[10px] text-amber-500/80 font-bold tracking-tight">
                                  #{baseId}
                                </p>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              {isBulkGroup ? (
                                 <div>
                                   <p className="font-bold text-white group-hover:text-blue-400 transition-colors text-lg leading-tight">
                                     Bulk Order <span className="text-slate-500 text-sm font-normal">({distinctItemsCount} Items)</span>
                                   </p>
                                   <p className="text-[10px] text-slate-500 font-medium">Mixed Categories</p>
                                 </div>
                              ) : (
                                <div>
                                  <p className="font-bold text-white group-hover:text-blue-400 transition-colors text-lg leading-tight">{itemDetails?.name || 'Unknown'}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">{itemDetails?.category}</p>
                                </div>
                              )}
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center space-x-2">
                                  <Truck size={14} className={isMultiSupplier ? "text-amber-500" : "text-slate-500"} />
                                  <span className={`text-sm font-medium ${isMultiSupplier ? 'text-amber-500 italic' : 'text-slate-300'}`}>
                                    {displaySupplier}
                                  </span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className="text-lg font-bold text-white">{totalQty} units</span>
                            </td>
                            <td className="px-8 py-6 text-sm text-slate-500">
                              {firstItem.purchaseDate}
                            </td>
                            <td className="px-8 py-6">
                              <div className={`flex items-center space-x-2 ${statusColor}`}>
                                {statusLabel === 'Paid' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                <span className="text-xs font-bold uppercase tracking-wider">{statusLabel}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <span className="text-lg font-black text-white tracking-tighter">
                                {formatCurrency(totalCost)}
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Children Rows */}
                          {isBulkGroup && isExpanded && group.map((purchase, idx) => {
                            const subItem = inventory.find(i => i.id === purchase.itemId);
                            return (
                              <tr key={purchase.id} className="bg-slate-900/30 hover:bg-slate-900/50 transition-colors">
                                <td className="px-8 py-4 relative">
                                   <div className="absolute left-12 top-0 bottom-1/2 w-4 border-l border-b border-slate-700/50 rounded-bl-xl" />
                                </td>
                                <td className="px-8 py-4">
                                  <p className="font-medium text-slate-300 text-sm">{subItem?.name}</p>
                                  <p className="text-[10px] text-slate-600">{subItem?.category}</p>
                                </td>
                                 <td className="px-8 py-4">
                                   <span className="text-xs text-slate-400">{purchase.supplier}</span>
                                 </td>
                                <td className="px-8 py-4">
                                  <span className="text-sm font-bold text-slate-400">{purchase.quantity} units</span>
                                </td>
                                <td className="px-8 py-4 text-xs text-slate-600">
                                </td>
                                <td className="px-8 py-4">
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                    purchase.paymentStatus === 'Paid' 
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {purchase.paymentStatus}
                                  </span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                  <span className="text-sm font-bold text-slate-400">
                                    {formatCurrency(purchase.purchasePrice)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'customers' && (
            <div className="space-y-6">
               <div className="bg-[#0f172a] rounded-3xl border border-slate-800/50 overflow-hidden shadow-2xl">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 border-b border-slate-800/50 bg-slate-900/30 px-8 py-5">
                      <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Client Identity</div>
                      <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Contact Information</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Rental Activity</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Status</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-right">Actions</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-slate-800/50">
                    {customers.filter(c => 
                      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      c.company.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((customer) => {
                      const customerRentals = rentals.filter(r => r.customerId === customer.id);
                      const activeCount = customerRentals.filter(r => r.status === RentalStatus.ACTIVE).length;
                      const overdueCount = customerRentals.filter(r => r.status === RentalStatus.OVERDUE).length;
                      const totalOngoing = activeCount + overdueCount;
                      const isExpanded = expandedCustomerId === customer.id;

                      return (
                        <div key={customer.id} className="group transition-all hover:bg-slate-800/30">
                          <div 
                             className="grid grid-cols-12 px-8 py-6 items-center cursor-pointer"
                             onClick={() => toggleCustomerExpand(customer.id)}
                          >
                             {/* Client Identity */}
                             <div className="col-span-3">
                                <p className="font-bold text-white group-hover:text-blue-400 transition-colors text-lg">{customer.name}</p>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">{customer.company}</p>
                             </div>

                             {/* Contact Info */}
                             <div className="col-span-3">
                                <div className="flex flex-col space-y-1">
                                   <span className="text-sm text-slate-300">{customer.email}</span>
                                   <span className="text-xs text-slate-500 font-mono tracking-wide">{customer.phone}</span>
                                </div>
                             </div>

                             {/* Rental Activity */}
                             <div className="col-span-2">
                                 <div className="flex flex-col items-start space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <span className={`text-lg font-black ${totalOngoing > 0 ? 'text-white' : 'text-slate-500'}`}>
                                        {totalOngoing}
                                      </span>
                                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide pt-1">ONGOING</span>
                                      {totalOngoing > 0 && (
                                        <div className={`w-2 h-2 rounded-full mt-1 ${overdueCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'}`} />
                                      )}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700/50">
                                      {customerRentals.length} Lifetime Rentals
                                    </div>
                                 </div>
                             </div>

                             {/* Status */}
                             <div className="col-span-2">
                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight ${
                                   customer.status === 'active' 
                                     ? 'bg-emerald-500/10 text-emerald-500' 
                                     : 'bg-slate-700 text-slate-400'
                                 }`}>
                                   {customer.status}
                                 </span>
                             </div>

                             {/* Actions */}
                             <div className="col-span-2 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleOpenEditCustomer(customer); }}
                                    className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                    title="Edit Details"
                                  >
                                    <Pencil size={18} />
                                  </button>
                                  <button 
                                    onClick={(e) => initiateDeleteCustomer(customer.id, e)}
                                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                    title="Delete Client"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                  <div className={`p-2 text-slate-600 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`}>
                                     <ChevronDown size={18} />
                                  </div>
                                </div>
                             </div>
                          </div>

                          {/* Expanded Rental History */}
                          {isExpanded && (
                             <div className="px-8 pb-8 pt-2 bg-slate-900/20 border-t border-slate-800/30">
                                 <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                                     <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
                                         <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                                             <History size={14} className="mr-2 text-blue-500" /> Detailed Rental History
                                         </h4>
                                         <span className="text-[10px] text-slate-500">{customerRentals.length} Records found</span>
                                     </div>
                                     {customerRentals.length > 0 ? (
                                         <table className="w-full text-left">
                                             <thead>
                                                 <tr className="border-b border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                     <th className="px-4 py-3">Rental ID</th>
                                                     <th className="px-4 py-3">Date Range</th>
                                                     <th className="px-4 py-3">Items</th>
                                                     <th className="px-4 py-3">Status</th>
                                                     <th className="px-4 py-3 text-right">Total Cost</th>
                                                 </tr>
                                             </thead>
                                             <tbody className="divide-y divide-slate-800/50">
                                                 {customerRentals.map(rental => {
                                                     const totalItems = rental.items.reduce((acc, i) => acc + i.quantity, 0);
                                                     return (
                                                         <tr key={rental.id} className="hover:bg-slate-800/30">
                                                             <td className="px-4 py-3 text-xs font-mono text-blue-400">#{rental.id}</td>
                                                             <td className="px-4 py-3 text-xs text-slate-400">
                                                                 {rental.startDate} <span className="text-slate-600 px-1">→</span> {rental.endDate}
                                                             </td>
                                                             <td className="px-4 py-3 text-xs text-white">{totalItems} Units</td>
                                                             <td className="px-4 py-3">
                                                                 <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                                                     rental.status === RentalStatus.ACTIVE ? 'bg-blue-500/10 text-blue-500' :
                                                                     rental.status === RentalStatus.OVERDUE ? 'bg-rose-500/10 text-rose-500' :
                                                                     'bg-emerald-500/10 text-emerald-500'
                                                                 }`}>
                                                                     {rental.status}
                                                                 </span>
                                                             </td>
                                                             <td className="px-4 py-3 text-right text-xs font-bold text-slate-300">
                                                                 {formatCurrency(rental.totalCost + (rental.deliveryFee || 0) + (rental.lateFee || 0))}
                                                             </td>
                                                         </tr>
                                                     );
                                                 })}
                                             </tbody>
                                         </table>
                                     ) : (
                                         <div className="p-8 text-center text-slate-500 text-xs italic">
                                             No rental history available for this client.
                                         </div>
                                     )}
                                 </div>
                             </div>
                          )}
                        </div>
                      );
                    })}
                    {customers.length === 0 && (
                      <div className="px-8 py-12 text-center text-slate-500 text-sm italic">
                          No clients found in the directory.
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}

          {view === 'rentals' && (
            <div className="bg-[#0f172a] rounded-3xl border border-slate-800/50 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/30 border-b border-slate-800/50">
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Transaction ID</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Contract Partner</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Duration</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Current Status</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Payment</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-right">Invoice Total</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {rentals
                      .filter(rental => {
                        const customer = customers.find(c => c.id === rental.customerId);
                        const term = searchTerm.toLowerCase();
                        return (
                          rental.id.toLowerCase().includes(term) ||
                          (customer && (
                            customer.name.toLowerCase().includes(term) ||
                            customer.company.toLowerCase().includes(term)
                          ))
                        );
                      })
                      .map((rental) => {
                        const customer = customers.find(c => c.id === rental.customerId);
                        const isExpanded = expandedRentalId === rental.id;
                        
                        // Calculate duration
                        const start = new Date(rental.startDate);
                        const end = new Date(rental.endDate);
                        const diffTime = Math.abs(end.getTime() - start.getTime());
                        const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        const finalInvoiceTotal = rental.totalCost + (rental.deliveryFee || 0) + (rental.lateFee || 0);

                        return (
                          <React.Fragment key={rental.id}>
                            <tr 
                              onClick={() => toggleRentalExpand(rental.id)}
                              className={`transition-all group cursor-pointer border-b border-slate-800/50 ${isExpanded ? 'bg-slate-800/30' : 'hover:bg-slate-800/10'}`}
                            >
                              <td className="px-8 py-6">
                                <div className="flex items-center space-x-3">
                                  <div className={`text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-blue-500' : ''}`}>
                                       <ChevronRight size={14} />
                                  </div>
                                  <span className="font-mono text-xs text-blue-500/70 font-bold group-hover:text-blue-400">#{rental.id.toUpperCase()}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{customer?.name}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{customer?.company}</p>
                                {rental.deliveryAddress && (
                                  <div className="text-[10px] text-slate-500 flex items-center mt-1">
                                    <MapPin size={10} className="mr-1 text-slate-600" />
                                    <span className="truncate max-w-[150px]" title={rental.deliveryAddress}>{rental.deliveryAddress}</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-col">
                                  <span className="text-xs text-slate-300 font-medium">{rental.startDate}</span>
                                  <span className="text-[10px] text-slate-600">to {rental.endDate}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                  rental.status === RentalStatus.ACTIVE ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                  rental.status === RentalStatus.RETURNED ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  rental.status === RentalStatus.OVERDUE ? 'bg-rose-500/10 text-rose-500 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]' :
                                  'bg-slate-700/50 text-slate-400 border-slate-700'
                                }`}>
                                  {rental.status}
                                </span>
                              </td>
                              <td className="px-8 py-6">
                                <button
                                  onClick={(e) => cyclePaymentStatus(e, rental.id, rental.paymentStatus)}
                                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide transition-all ${
                                    rental.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' :
                                    rental.paymentStatus === 'Overdue' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20' :
                                    'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                  }`}
                                  title="Click to cycle status"
                                >
                                  {rental.paymentStatus === 'Paid' ? <CheckCircle2 size={12} /> : 
                                   rental.paymentStatus === 'Overdue' ? <AlertCircle size={12} /> : 
                                   <Clock size={12} />}
                                  <span>{rental.paymentStatus}</span>
                                </button>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <span className="text-lg font-black text-white tracking-tighter">
                                  {formatCurrency(finalInvoiceTotal)}
                                </span>
                                {rental.lateFee && rental.lateFee > 0 && (
                                  <div className="text-[9px] text-rose-400 font-bold mt-1">
                                    + Late Fee: {formatCurrency(rental.lateFee)}
                                  </div>
                                )}
                                {rental.deliveryFee && rental.deliveryFee > 0 && (
                                  <div className="text-[9px] text-slate-500 font-bold mt-0.5">
                                    (Incl. Delivery)
                                  </div>
                                )}
                              </td>
                              <td className="px-8 py-6 text-center">
                                {(rental.status === RentalStatus.ACTIVE || rental.status === RentalStatus.OVERDUE) && (
                                  <div className="flex items-center justify-center space-x-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleExtendClick(rental); }}
                                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-xl transition-all border border-amber-500/20"
                                      title="Extend Rental Duration"
                                    >
                                      <CalendarClock size={14} />
                                      <span>Extend</span>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleReturnClick(rental); }}
                                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-500 hover:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-xl transition-all border border-blue-500/20"
                                      title="Process Return"
                                    >
                                      <RotateCcw size={14} />
                                      <span>Return</span>
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                                <tr className="bg-slate-900/20">
                                    <td colSpan={7} className="p-0">
                                         <div className="px-8 py-6 border-b border-slate-800/50 shadow-inner">
                                             <div className="flex flex-col lg:flex-row gap-6">
                                                 {/* Equipment Manifest */}
                                                 <div className="flex-1 bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden p-6">
                                                     <div className="flex items-center justify-between mb-6">
                                                         <h4 className="text-sm font-bold text-white flex items-center">
                                                             <Layers size={16} className="mr-2 text-blue-500" /> Equipment Manifest
                                                         </h4>
                                                         <div className="text-xs text-slate-500 font-mono">
                                                             Duration: {durationDays} Days ({rental.startDate} - {rental.endDate})
                                                         </div>
                                                     </div>
                                                     
                                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                         {rental.items.map((rItem, idx) => {
                                                             const inventoryItem = inventory.find(i => i.id === rItem.itemId);
                                                             return (
                                                                 <div key={idx} className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-xl flex items-center justify-between group/item hover:border-slate-700 transition-colors">
                                                                     <div className="flex items-center space-x-3">
                                                                         <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500 group-hover/item:text-blue-400">
                                                                             <Package size={16} />
                                                                         </div>
                                                                         <div>
                                                                             <p className="text-sm font-bold text-slate-200">{inventoryItem?.name || 'Unknown Item'}</p>
                                                                             <p className="text-[10px] text-slate-500 uppercase tracking-wider">{inventoryItem?.category}</p>
                                                                         </div>
                                                                     </div>
                                                                     <div className="text-right">
                                                                         <p className="text-lg font-black text-white">{rItem.quantity}</p>
                                                                         <p className="text-[10px] text-slate-500 font-bold">UNITS</p>
                                                                     </div>
                                                                 </div>
                                                             );
                                                         })}
                                                     </div>
                                                 </div>

                                                 {/* Financial Summary */}
                                                 <div className="w-full lg:w-80 bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden p-6">
                                                    <h4 className="text-sm font-bold text-white flex items-center mb-6">
                                                        <Wallet size={16} className="mr-2 text-emerald-500" /> Financial Summary
                                                    </h4>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Equipment Rental</span>
                                                            <span className="text-white font-bold">{formatCurrency(rental.totalCost)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Delivery Fee</span>
                                                            <span className="text-white font-bold">{formatCurrency(rental.deliveryFee || 0)}</span>
                                                        </div>
                                                        {rental.lateFee && rental.lateFee > 0 && (
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-rose-400 font-bold">Late Fees</span>
                                                                <span className="text-rose-400 font-bold">{formatCurrency(rental.lateFee)}</span>
                                                            </div>
                                                        )}
                                                        <div className="border-t border-slate-700/50 pt-3 mt-2 flex justify-between items-center">
                                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Invoice</span>
                                                            <span className="text-lg font-black text-white">{formatCurrency(finalInvoiceTotal)}</span>
                                                        </div>

                                                        {/* Deposit Section */}
                                                        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 mt-4">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center space-x-2">
                                                                    <Coins size={14} className="text-amber-500" />
                                                                    <span className="text-xs font-bold text-slate-300">Security Deposit</span>
                                                                </div>
                                                                <span className="text-sm font-bold text-white">{formatCurrency(rental.deposit || 0)}</span>
                                                            </div>
                                                            {rental.depositStatus && (
                                                              <div className="mt-2 pt-2 border-t border-slate-800/50 flex justify-between items-center">
                                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                                                    rental.depositStatus === 'Refunded' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                    rental.depositStatus === 'Withheld' ? 'bg-rose-500/10 text-rose-400' :
                                                                    rental.depositStatus === 'Partial' ? 'bg-blue-500/10 text-blue-400' :
                                                                    'bg-amber-500/10 text-amber-400'
                                                                }`}>
                                                                  {rental.depositStatus}
                                                                </span>
                                                                {rental.refundedAmount !== undefined && (
                                                                  <span className="text-xs text-slate-400">
                                                                     Ref: {formatCurrency(rental.refundedAmount)}
                                                                  </span>
                                                                )}
                                                              </div>
                                                            )}
                                                            {!rental.depositStatus && (
                                                              <p className="text-[9px] text-slate-500 mt-1">Held until return is complete.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                 </div>
                                             </div>
                                         </div>
                                    </td>
                                </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* ... Maintenance, Delete Customer, Delete Inventory, Purchase History, New Customer, New Equipment, Purchase Modal, New Rental Modal ... */}
      
      {/* Maintenance Action Modal */}
      {isMaintenanceModalOpen && maintenanceItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsMaintenanceModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#0f172a] border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden flex flex-col items-center">
             <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${maintenanceAction === 'repair' ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {maintenanceAction === 'repair' ? <Wrench size={32} /> : <Trash2 size={32} />}
             </div>
             
             <h3 className="text-xl font-bold text-white mb-2">
                {maintenanceAction === 'repair' ? 'Repair Equipment' : 'Discard Damaged Item'}
             </h3>
             <p className="text-sm text-slate-400 mb-6 text-center">
                {maintenanceAction === 'repair' 
                    ? `How many "${maintenanceItem.name}" have been repaired and are ready for use?`
                    : `Permanently remove damaged "${maintenanceItem.name}" from the inventory? This reduces total stock.`
                }
             </p>

             <form onSubmit={handleMaintenanceSubmit} className="w-full">
                <div className="mb-6">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 text-center">Quantity to {maintenanceAction}</label>
                    <input 
                        autoFocus
                        type="number" 
                        min="1" 
                        max={maintenanceItem.damagedQuantity}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={maintenanceQuantity || ''}
                        onChange={(e) => setMaintenanceQuantity(parseInt(e.target.value))}
                    />
                    <p className="text-xs text-slate-600 text-center mt-2">Max available in damage pile: {maintenanceItem.damagedQuantity}</p>
                </div>

                <div className="flex space-x-3 w-full">
                    <button 
                        type="button"
                        onClick={() => setIsMaintenanceModalOpen(false)}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                    >
                        CANCEL
                    </button>
                    <button 
                        type="submit"
                        className={`flex-1 py-3 font-bold text-xs rounded-xl shadow-lg transition-all ${
                            maintenanceAction === 'repair' 
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' 
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20'
                        }`}
                    >
                        CONFIRM {maintenanceAction.toUpperCase()}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Delete Customer Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#0f172a] border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
              <AlertCircle size={32} className="text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Client Record?</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              This action cannot be undone. This will permanently remove the client and their associated history from the directory.
            </p>
            <div className="flex space-x-3 w-full">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
              >
                CANCEL
              </button>
              <button 
                onClick={confirmDeleteCustomer}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-900/20 transition-all"
              >
                CONFIRM DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Inventory Item Modal */}
      {isDeleteInventoryModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsDeleteInventoryModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#0f172a] border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
              <AlertCircle size={32} className="text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Equipment?</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Are you sure you want to remove this item from your fleet inventory? This action cannot be undone.
            </p>
            <div className="flex space-x-3 w-full">
              <button 
                onClick={() => setIsDeleteInventoryModalOpen(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
              >
                CANCEL
              </button>
              <button 
                onClick={confirmDeleteItem}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-900/20 transition-all"
              >
                CONFIRM DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Purchase History Modal */}
      {selectedItemForHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedItemForHistory(null)} />
          <div className="relative w-full max-w-4xl bg-[#0f172a] border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold flex items-center">
                      <History size={20} className="mr-2 text-blue-500" /> Purchase Record: {selectedItemForHistory.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Full procurement ledger for this equipment asset.</p>
                </div>
                <button onClick={() => setSelectedItemForHistory(null)} className="p-2 bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800">
                    <th className="px-6 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Supplier</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Quantity</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Unit Total</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Date Acquired</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {purchases.filter(p => p.itemId === selectedItemForHistory.id).length > 0 ? (
                    purchases.filter(p => p.itemId === selectedItemForHistory.id).map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/20">
                        <td className="px-6 py-4 text-sm text-slate-300 font-bold">{p.supplier}</td>
                        <td className="px-6 py-4 text-sm text-white">{p.quantity} units</td>
                        <td className="px-6 py-4">
                           <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                              p.paymentStatus === 'Paid' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {p.paymentStatus}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-black text-emerald-400 text-right">{formatCurrency(p.purchasePrice)}</td>
                        <td className="px-6 py-4 text-xs text-slate-500 text-right font-mono uppercase">{p.purchaseDate}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-600 text-sm italic">No purchase records found for this item.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/50 flex items-center justify-between">
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                Current Total Fleet Asset: {selectedItemForHistory.totalQuantity} Units
              </div>
              <button 
                onClick={() => setSelectedItemForHistory(null)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
              >
                CLOSE LEDGER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsCustomerModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <Users size={20} className="mr-2 text-blue-500" /> {editingCustomerId ? 'Edit Client' : 'New Client'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{editingCustomerId ? 'Update client information.' : 'Add a new partner to your directory.'}</p>
              </div>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Contact Person</label>
                <input 
                  required
                  type="text"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  placeholder="e.g. John Smith"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Company Name <span className="text-slate-600 font-normal normal-case">(Optional)</span></label>
                <input 
                  type="text"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  value={newCustomer.company}
                  onChange={(e) => setNewCustomer({...newCustomer, company: e.target.value})}
                  placeholder="e.g. Acme Construction"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Email Address <span className="text-slate-600 font-normal normal-case">(Optional)</span></label>
                <input 
                  type="email"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  placeholder="email@company.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Phone Number</label>
                <input 
                  type="tel"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  placeholder="+62 ..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Construction Site Address <span className="text-rose-500">*</span></label>
                <textarea 
                  required
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  placeholder="Full project site address..."
                />
              </div>

              <div className="flex space-x-3 mt-6">
                {editingCustomerId && (
                  <button 
                    type="button"
                    onClick={(e) => initiateDeleteCustomer(editingCustomerId, e)}
                    className="flex-1 py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button 
                  type="submit"
                  className="flex-[4] py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                >
                  {editingCustomerId ? 'UPDATE CLIENT' : 'ADD TO DIRECTORY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Equipment Modal */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsNewItemModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <Package size={20} className="mr-2 text-blue-500" /> {editingItemId ? 'Edit Equipment Details' : 'New Equipment'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{editingItemId ? 'Update inventory specifications.' : 'Define new inventory item.'}</p>
              </div>
              <button onClick={() => setIsNewItemModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Equipment Name</label>
                <input 
                  required
                  type="text"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm({...newItemForm, name: e.target.value})}
                  placeholder="e.g. Ledger 4.0m"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Category</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white appearance-none"
                  value={newItemForm.category}
                  onChange={(e) => setNewItemForm({...newItemForm, category: e.target.value as ItemCategory})}
                >
                  {Object.values(ItemCategory).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Daily Rate</label>
                  <input 
                    type="number"
                    min="0"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                    value={newItemForm.unitPrice}
                    onChange={(e) => setNewItemForm({...newItemForm, unitPrice: Number(e.target.value)})}
                    placeholder="IDR 0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Monthly Rate</label>
                  <input 
                    type="number"
                    min="0"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                    value={newItemForm.monthlyPrice}
                    onChange={(e) => setNewItemForm({...newItemForm, monthlyPrice: Number(e.target.value)})}
                    placeholder="IDR 0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  {editingItemId ? 'Total Stock Quantity' : 'Initial Stock Level'}
                </label>
                <input 
                  type="number"
                  min="0"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  value={newItemForm.initialStock}
                  onChange={(e) => setNewItemForm({...newItemForm, initialStock: Number(e.target.value)})}
                  placeholder="0"
                />
                <p className="text-[10px] text-slate-600 mt-2">
                  {editingItemId 
                    ? "* Warning: Changing total stock manually may affect availability calculations if inconsistent with purchase history."
                    : "* Note: Adding stock here sets the opening balance. To track procurement costs for reports, use the 'Resupply Fleet' feature after creating the item."
                  }
                </p>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                >
                  {editingItemId ? 'UPDATE FLEET' : 'ADD TO FLEET'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resupply Purchase Modal */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsPurchaseModalOpen(false)} />
          <div className={`relative w-full ${isBulkMode ? 'max-w-5xl' : 'max-w-md'} bg-[#0f172a] border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden transition-all duration-300`}>
            <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold flex items-center">
                      <Truck size={20} className="mr-2 text-emerald-500" /> {isBulkMode ? 'Bulk Fleet Procurement' : 'New Resupply Order'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Populate your inventory with new high-quality equipment.</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${!isBulkMode ? 'text-blue-400' : 'text-slate-600'}`}>Single</span>
                    <button 
                      onClick={() => setIsBulkMode(!isBulkMode)}
                      className="relative w-10 h-5 bg-slate-700 rounded-full transition-colors focus:outline-none"
                    >
                      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isBulkMode ? 'translate-x-5 bg-emerald-500' : ''}`} />
                    </button>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isBulkMode ? 'text-emerald-400' : 'text-slate-600'}`}>Bulk</span>
                  </div>
                  <button onClick={() => setIsPurchaseModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                      <X size={20} />
                  </button>
                </div>
            </div>
            
            <form onSubmit={handleResupply} className="space-y-6">
                {!isBulkMode ? (
                  <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Equipment</label>
                        <select 
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-white"
                            value={singlePurchase.itemId}
                            onChange={(e) => setSinglePurchase({...singlePurchase, itemId: e.target.value})}
                        >
                            <option value="">Select Item...</option>
                            {inventory.map(item => (
                                <option key={item.id} value={item.id}>{item.name} ({item.category})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Supplier Name</label>
                        <input 
                            required
                            type="text"
                            placeholder="e.g. Scaffold Hub Indo"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-white"
                            value={singlePurchase.supplier}
                            onChange={(e) => setSinglePurchase({...singlePurchase, supplier: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Quantity</label>
                            <input 
                                required
                                type="number"
                                min="1"
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-white"
                                value={singlePurchase.quantity}
                                onChange={(e) => setSinglePurchase({...singlePurchase, quantity: parseInt(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Price (IDR)</label>
                            <input 
                                required
                                type="number"
                                min="0"
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-white"
                                value={singlePurchase.purchasePrice}
                                onChange={(e) => setSinglePurchase({...singlePurchase, purchasePrice: parseInt(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Payment Status</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setSinglePurchase({...singlePurchase, paymentStatus: 'Paid'})}
                          className={`flex items-center justify-center p-3 rounded-xl border transition-all ${
                            singlePurchase.paymentStatus === 'Paid' 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                          }`}
                        >
                          <CheckCircle2 size={16} className="mr-2" />
                          <span className="text-xs font-bold uppercase tracking-wide">Paid</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSinglePurchase({...singlePurchase, paymentStatus: 'Pending'})}
                          className={`flex items-center justify-center p-3 rounded-xl border transition-all ${
                            singlePurchase.paymentStatus === 'Pending' 
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400' 
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                          }`}
                        >
                          <Clock size={16} className="mr-2" />
                          <span className="text-xs font-bold uppercase tracking-wide">Pending</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar relative">
                    <div className="grid grid-cols-12 gap-3 px-3 py-2 sticky top-0 bg-[#0f172a] z-10 border-b border-slate-800 mb-2">
                        <div className="col-span-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Equipment</div>
                        <div className="col-span-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Supplier</div>
                        <div className="col-span-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</div>
                        <div className="col-span-1 text-[9px] font-black text-slate-500 uppercase tracking-widest">Qty</div>
                        <div className="col-span-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Total (IDR)</div>
                        <div className="col-span-1"></div>
                    </div>

                    <div className="space-y-2">
                      {bulkRows.map((row) => (
                        <div key={row.id} className="grid grid-cols-12 gap-3 items-center bg-slate-900/40 hover:bg-slate-800/40 p-2 rounded-xl border border-slate-800/50 transition-colors group">
                          <div className="col-span-3">
                            <select 
                              required
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-white appearance-none"
                              value={row.itemId}
                              onChange={(e) => updateBulkRow(row.id, 'itemId', e.target.value)}
                            >
                              <option value="">Select...</option>
                              {inventory.map(item => (
                                  <option key={item.id} value={item.id}>{item.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-3">
                            <input 
                              required
                              type="text"
                              placeholder="Supplier"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-white placeholder:text-slate-600"
                              value={row.supplier}
                              onChange={(e) => updateBulkRow(row.id, 'supplier', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <select
                              className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none appearance-none font-bold ${
                                row.paymentStatus === 'Paid' ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                              value={row.paymentStatus}
                              onChange={(e) => updateBulkRow(row.id, 'paymentStatus', e.target.value)}
                            >
                              <option value="Paid">Paid</option>
                              <option value="Pending">Pending</option>
                            </select>
                          </div>
                          <div className="col-span-1">
                            <input 
                              required
                              type="number"
                              min="1"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-white"
                              value={row.quantity}
                              onChange={(e) => updateBulkRow(row.id, 'quantity', parseInt(e.target.value))}
                            />
                          </div>
                          <div className="col-span-2">
                            <input 
                              required
                              type="number"
                              min="0"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-white"
                              value={row.purchasePrice}
                              onChange={(e) => updateBulkRow(row.id, 'purchasePrice', parseInt(e.target.value))}
                            />
                          </div>
                          <div className="col-span-1 text-right flex justify-end">
                            <button 
                              type="button"
                              onClick={() => removeBulkRow(row.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      type="button"
                      onClick={addBulkRow}
                      className="w-full py-2.5 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:text-emerald-500 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-[10px] font-bold uppercase tracking-widest mt-4"
                    >
                      <Plus size={12} className="mr-2" /> Add another item
                    </button>
                  </div>
                )}

                <div className={`flex items-center justify-between pt-6 border-t border-slate-800/50 ${isBulkMode ? 'flex-row' : 'flex-col space-y-4'}`}>
                    {isBulkMode && (
                      <div className="text-slate-400">
                        <span className="text-[10px] font-bold uppercase block opacity-50">Estimated Bulk Total</span>
                        <span className="text-lg font-black text-white">
                          {formatCurrency(bulkRows.reduce((acc, r) => acc + (r.purchasePrice || 0), 0))}
                        </span>
                      </div>
                    )}
                    <button 
                        type="submit"
                        className={`${isBulkMode ? 'w-auto px-10' : 'w-full'} py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95`}
                    >
                        {isBulkMode ? 'SUBMIT BULK ORDER' : 'COMPLETE PROCUREMENT'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* New Rental Modal */}
      {isRentalModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsRentalModalOpen(false)} />
          <div className="relative w-full max-w-5xl bg-[#0f172a] border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-8 shrink-0">
                <div>
                  <h2 className="text-xl font-bold flex items-center">
                      <FileText size={20} className="mr-2 text-blue-500" /> New Rental Contract
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Create a new rental agreement for a client.</p>
                </div>
                <button onClick={() => setIsRentalModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleCreateRental} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
                
                {/* Rate Type Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Contract Type</label>
                        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                            <button
                                type="button"
                                onClick={() => setRentalForm({...rentalForm, rateType: 'Daily'})}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${rentalForm.rateType === 'Daily' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Daily / Custom Dates
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                     // Set default end date based on current start + 1 month
                                     const start = new Date(rentalForm.startDate);
                                     start.setMonth(start.getMonth() + 1);
                                     setRentalForm({
                                        ...rentalForm, 
                                        rateType: 'Monthly', 
                                        manualMonths: 1,
                                        endDate: start.toISOString().split('T')[0]
                                     });
                                }}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${rentalForm.rateType === 'Monthly' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Monthly Fixed
                            </button>
                        </div>
                    </div>
                </div>

                {/* Client & Dates */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Client</label>
                    <select 
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                      value={rentalForm.customerId}
                      onChange={(e) => {
                        const selectedCId = e.target.value;
                        const client = customers.find(c => c.id === selectedCId);
                        setRentalForm({ 
                          ...rentalForm, 
                          customerId: selectedCId,
                          deliveryAddress: client ? client.address : '' // Auto-fill address
                        });
                      }}
                    >
                      <option value="">Select a Client...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {c.company}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Start Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input 
                        required
                        type="date"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white [color-scheme:dark]"
                        value={rentalForm.startDate}
                        onChange={(e) => {
                             const newStart = e.target.value;
                             if (rentalForm.rateType === 'Monthly') {
                                 const start = new Date(newStart);
                                 start.setMonth(start.getMonth() + rentalForm.manualMonths);
                                 setRentalForm({ 
                                    ...rentalForm, 
                                    startDate: newStart,
                                    endDate: start.toISOString().split('T')[0]
                                 });
                             } else {
                                 setRentalForm({ ...rentalForm, startDate: newStart });
                             }
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-span-1">
                    {rentalForm.rateType === 'Daily' ? (
                        <>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">End Date</label>
                            <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input 
                                required
                                type="date"
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white [color-scheme:dark]"
                                value={rentalForm.endDate}
                                min={rentalForm.startDate}
                                onChange={(e) => setRentalForm({ ...rentalForm, endDate: e.target.value })}
                            />
                            </div>
                        </>
                    ) : (
                        <>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Duration (Months)</label>
                            <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input 
                                required
                                type="number"
                                min="1"
                                step="0.5"
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                                value={rentalForm.manualMonths}
                                onChange={(e) => {
                                    const months = parseFloat(e.target.value) || 0;
                                    const start = new Date(rentalForm.startDate);
                                    start.setMonth(start.getMonth() + months);
                                    setRentalForm({ 
                                        ...rentalForm, 
                                        manualMonths: months,
                                        endDate: start.toISOString().split('T')[0]
                                    });
                                }}
                            />
                            </div>
                        </>
                    )}
                  </div>
                </div>

                <div className="col-span-3">
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Site Address / Delivery Location <span className="text-rose-500">*</span></label>
                   <textarea
                      required
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                      value={rentalForm.deliveryAddress}
                      onChange={(e) => setRentalForm({ ...rentalForm, deliveryAddress: e.target.value })}
                      placeholder="Enter the specific project site address for this rental..."
                   />
                </div>

                <div className="grid grid-cols-3 gap-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                   <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Security Deposit (IDR)</label>
                       <div className="relative">
                           <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                           <input 
                                type="number"
                                min="0"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-white"
                                value={rentalForm.deposit}
                                onChange={(e) => setRentalForm({ ...rentalForm, deposit: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                           />
                       </div>
                       <p className="text-[9px] text-slate-600 mt-1.5 ml-1">Refundable amount held for duration.</p>
                   </div>
                   <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Delivery & Setup Fee (IDR)</label>
                       <div className="relative">
                           <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                           <input 
                                type="number"
                                min="0"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                                value={rentalForm.deliveryFee}
                                onChange={(e) => setRentalForm({ ...rentalForm, deliveryFee: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                           />
                       </div>
                       <p className="text-[9px] text-slate-600 mt-1.5 ml-1">One-time service charge added to invoice.</p>
                   </div>
                   <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Payment Status</label>
                        <div className="relative">
                           <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white appearance-none"
                                value={rentalForm.paymentStatus}
                                onChange={(e) => setRentalForm({ ...rentalForm, paymentStatus: e.target.value as any })}
                           >
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                                <option value="Overdue">Overdue</option>
                           </select>
                           <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                        </div>
                        <p className="text-[9px] text-slate-600 mt-1.5 ml-1">Initial invoice status.</p>
                   </div>
                </div>

                {/* Items List */}
                <div>
                   {/* Quick Add Set UI */}
                   <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 mb-6 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-600 rounded-lg text-white">
                                <Layers size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">Quick Add Scaffolding Set <span className="ml-2 text-emerald-400 font-black bg-emerald-400/10 px-2 py-0.5 rounded-md text-[10px]">Rp 35.000 / mo</span></h4>
                                <p className="text-[10px] text-slate-400">Includes: 2 Main Frames, 2 Cross Braces, 4 Join Pins.</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="flex flex-col">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Set Qty</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={setCount}
                                    onChange={(e) => setSetCount(Math.max(1, parseInt(e.target.value) || 0))}
                                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <button 
                                type="button"
                                onClick={handleAddSet}
                                className="h-[52px] px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center"
                            >
                                <Plus size={16} className="mr-2" /> ADD
                            </button>
                        </div>
                   </div>

                   <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                     <h3 className="text-sm font-bold text-white">Equipment List</h3>
                     <span className="text-xs text-slate-500">
                        {rentalForm.rateType === 'Daily' 
                            ? `Duration: ${calculateDaysDiff()} Days` 
                            : `Duration: ${rentalForm.manualMonths} Months (Fixed)`}
                     </span>
                   </div>
                   
                   <div className="grid grid-cols-12 gap-3 mb-2 px-2">
                      <div className="col-span-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Item</div>
                      <div className="col-span-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Rate/{rentalForm.rateType === 'Daily' ? 'Day' : 'Mo'}</div>
                      <div className="col-span-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Quantity</div>
                      <div className="col-span-2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Subtotal</div>
                      <div className="col-span-1"></div>
                   </div>

                   <div className="space-y-2">
                     {rentalForm.items.map((row) => {
                       const item = inventory.find(i => i.id === row.itemId);
                       const subtotal = item 
                            ? getItemRentalCost(
                                item, 
                                row.quantity, 
                                rentalForm.rateType === 'Monthly' ? rentalForm.manualMonths : calculateDaysDiff(), 
                                rentalForm.rateType === 'Monthly'
                              ) 
                            : 0;
                       
                       return (
                         <div key={row.id} className="grid grid-cols-12 gap-3 items-center bg-slate-900/40 hover:bg-slate-800/40 p-2 rounded-xl border border-slate-800/50 transition-colors group">
                           <div className="col-span-5">
                             <select 
                               required
                               className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-white appearance-none"
                               value={row.itemId}
                               onChange={(e) => updateRentalItemRow(row.id, 'itemId', e.target.value)}
                             >
                               <option value="">Select Equipment...</option>
                               {inventory.map(item => (
                                   <option key={item.id} value={item.id}>{item.name}</option>
                               ))}
                             </select>
                           </div>
                           <div className="col-span-2">
                             <span className="text-xs font-bold text-slate-400">
                               {item ? formatCurrency(rentalForm.rateType === 'Monthly' ? item.monthlyPrice : item.unitPrice) : '-'}
                             </span>
                           </div>
                           <div className="col-span-2">
                             <input 
                               required
                               type="number"
                               min="1"
                               className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-white"
                               value={row.quantity}
                               onChange={(e) => updateRentalItemRow(row.id, 'quantity', parseInt(e.target.value) || 0)}
                             />
                           </div>
                           <div className="col-span-2 text-right">
                             <span className="text-sm font-bold text-white">
                               {formatCurrency(subtotal)}
                             </span>
                           </div>
                           <div className="col-span-1 text-right flex justify-end">
                             <button 
                               type="button"
                               onClick={() => removeRentalItemRow(row.id)}
                               className="p-1.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                               title="Remove item"
                             >
                               <Trash2 size={14} />
                             </button>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                   
                   <button 
                     type="button"
                     onClick={addRentalItemRow}
                     className="w-full py-2.5 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:text-blue-500 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-[10px] font-bold uppercase tracking-widest mt-4"
                   >
                     <Plus size={12} className="mr-2" /> Add another item
                   </button>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-800/50 mt-6 shrink-0">
                  <div className="text-slate-400">
                    <span className="text-[10px] font-bold uppercase block opacity-50">Estimated Invoice Total</span>
                    <span className="text-xl font-black text-white">
                      {formatCurrency(calculateRentalTotal() + rentalForm.deliveryFee)}
                    </span>
                    {rentalForm.deliveryFee > 0 && <span className="text-[10px] text-slate-500 ml-2">(Incl. Delivery)</span>}
                  </div>
                  <button 
                      type="submit"
                      className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                  >
                      CREATE CONTRACT
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Rental Modal */}
      {isReturnModalOpen && rentalToReturn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsReturnModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-8 shrink-0">
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <RotateCcw size={20} className="mr-2 text-blue-500" /> Return Equipment
                </h2>
                <p className="text-xs text-slate-500 mt-1">Verify condition and finalize rental costs.</p>
              </div>
              <button onClick={() => setIsReturnModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Transaction</div>
                            <div className="text-sm font-mono font-bold text-blue-400">#{rentalToReturn.id.toUpperCase()}</div>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contract Due Date</div>
                             <div className="text-sm font-bold text-white">{rentalToReturn.endDate}</div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Actual Return Date</label>
                             <input 
                                type="date"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-white [color-scheme:dark]"
                                value={returnDate}
                                onChange={(e) => setReturnDate(e.target.value)}
                            />
                        </div>
                         <div>
                             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Late Fee Rate (Multiplier)</label>
                             <div className="flex items-center space-x-2">
                                <span className="text-xs text-slate-400 font-bold">x</span>
                                <input 
                                    type="number"
                                    min="1"
                                    step="0.1"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-white font-bold"
                                    value={lateFeeMultiplier}
                                    onChange={(e) => setLateFeeMultiplier(parseFloat(e.target.value) || 1)}
                                />
                             </div>
                        </div>
                    </div>

                    {calculateReturnFinancials().overdueDays > 0 && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-start space-x-3">
                             <AlertCircle size={16} className="text-rose-500 mt-0.5" />
                             <div>
                                 <p className="text-xs font-bold text-rose-500 uppercase tracking-wide">Overdue by {calculateReturnFinancials().overdueDays} Day(s)</p>
                                 <p className="text-[10px] text-slate-400">A late fee will be applied based on the multiplier configured.</p>
                             </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-4 px-2 pb-2 border-b border-slate-800/50 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        <div className="col-span-5">Item</div>
                        <div className="col-span-2 text-center">Good</div>
                        <div className="col-span-2 text-center">Damaged</div>
                        <div className="col-span-2 text-center">Missing</div>
                        <div className="col-span-1 text-center">Total</div>
                    </div>

                    {rentalToReturn.items.map(item => {
                        const invItem = inventory.find(i => i.id === item.itemId);
                        const qty = returnQuantities[item.itemId] || { good: 0, damaged: 0, missing: 0 };
                        const currentTotal = qty.good + qty.damaged + qty.missing;
                        const isBalanced = currentTotal === item.quantity;

                        return (
                            <div key={item.itemId} className="grid grid-cols-12 gap-4 items-center bg-slate-900/20 p-3 rounded-xl border border-slate-800/30">
                                <div className="col-span-5">
                                    <div className="text-sm font-bold text-white">{invItem?.name}</div>
                                    <div className="text-[10px] text-slate-500">Rented: {item.quantity} Units</div>
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number"
                                        min="0"
                                        className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-2 text-center text-xs font-bold text-emerald-400 focus:ring-1 focus:ring-emerald-500 outline-none"
                                        value={qty.good}
                                        onChange={(e) => updateReturnQty(item.itemId, 'good', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number"
                                        min="0"
                                        className="w-full bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-2 text-center text-xs font-bold text-amber-400 focus:ring-1 focus:ring-amber-500 outline-none"
                                        value={qty.damaged}
                                        onChange={(e) => updateReturnQty(item.itemId, 'damaged', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number"
                                        min="0"
                                        className="w-full bg-rose-500/10 border border-rose-500/20 rounded-lg px-2 py-2 text-center text-xs font-bold text-rose-400 focus:ring-1 focus:ring-rose-500 outline-none"
                                        value={qty.missing}
                                        onChange={(e) => updateReturnQty(item.itemId, 'missing', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    {isBalanced ? (
                                        <CheckCircle2 size={16} className="text-slate-600" />
                                    ) : (
                                        <span className="text-[10px] font-bold text-rose-500">{currentTotal}/{item.quantity}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Inventory Impact Preview */}
                <div className="bg-slate-900/30 rounded-xl p-5 border border-slate-800/50 mt-6">
                   <h4 className="text-xs font-bold text-white mb-4 flex items-center uppercase tracking-widest">
                      <TrendingUp size={14} className="mr-2 text-blue-500" /> Projected Inventory Updates
                   </h4>
                   <div className="space-y-3">
                      {rentalToReturn.items.map(item => {
                          const invItem = inventory.find(i => i.id === item.itemId);
                          if (!invItem) return null;
                          const qty = returnQuantities[item.itemId] || { good: 0, damaged: 0, missing: 0 };
                          
                          // Projections
                          const newAvailable = invItem.availableQuantity + qty.good;
                          const newDamaged = (invItem.damagedQuantity || 0) + qty.damaged;
                          const newTotal = invItem.totalQuantity - qty.missing;

                          return (
                              <div key={item.itemId} className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                                  <p className="text-xs font-bold text-slate-300 mb-2">{invItem.name}</p>
                                  <div className="grid grid-cols-3 gap-2">
                                      {/* Available */}
                                      <div className={`p-2 rounded border text-center ${qty.good > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800 border-slate-700'}`}>
                                          <p className="text-[9px] text-slate-500 uppercase">Available</p>
                                          <div className="flex items-center justify-center text-xs font-bold mt-0.5">
                                              <span className="text-slate-400">{invItem.availableQuantity}</span>
                                              {qty.good > 0 && (
                                                  <>
                                                      <ArrowRight size={10} className="mx-1 text-slate-600" />
                                                      <span className="text-emerald-400">{newAvailable}</span>
                                                  </>
                                              )}
                                          </div>
                                      </div>
                                      
                                      {/* Damaged */}
                                      <div className={`p-2 rounded border text-center ${qty.damaged > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-800 border-slate-700'}`}>
                                          <p className="text-[9px] text-slate-500 uppercase">Damaged</p>
                                          <div className="flex items-center justify-center text-xs font-bold mt-0.5">
                                              <span className="text-slate-400">{invItem.damagedQuantity || 0}</span>
                                              {qty.damaged > 0 && (
                                                  <>
                                                      <ArrowRight size={10} className="mx-1 text-slate-600" />
                                                      <span className="text-amber-400">{newDamaged}</span>
                                                  </>
                                              )}
                                          </div>
                                      </div>

                                      {/* Total Fleet (Impacted by Missing) */}
                                      <div className={`p-2 rounded border text-center ${qty.missing > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-800 border-slate-700'}`}>
                                          <p className="text-[9px] text-slate-500 uppercase">Total Fleet</p>
                                          <div className="flex items-center justify-center text-xs font-bold mt-0.5">
                                              <span className="text-slate-400">{invItem.totalQuantity}</span>
                                              {qty.missing > 0 && (
                                                  <>
                                                      <ArrowRight size={10} className="mx-1 text-slate-600" />
                                                      <span className="text-rose-400">{newTotal}</span>
                                                  </>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                   </div>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-800/50 mt-2 shrink-0">
                {rentalToReturn.deposit && rentalToReturn.deposit > 0 && (
                  <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <h4 className="text-xs font-bold text-white mb-3 flex items-center">
                       <Wallet size={14} className="mr-2 text-amber-500" /> Security Deposit Management
                    </h4>
                    <div className="flex items-end justify-between gap-4">
                       <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Deposit Held</p>
                          <p className="text-lg font-bold text-slate-300">{formatCurrency(rentalToReturn.deposit)}</p>
                       </div>
                       <div className="flex-1">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Refund Amount</label>
                          <input 
                             type="number"
                             min="0"
                             max={rentalToReturn.deposit}
                             value={refundAmount}
                             onChange={(e) => setRefundAmount(Math.min(rentalToReturn.deposit || 0, Math.max(0, parseInt(e.target.value) || 0)))}
                             className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Action Status</p>
                          <div className={`text-xs font-bold px-3 py-2 rounded-lg border ${
                             refundAmount === rentalToReturn.deposit ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                             refundAmount === 0 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                             'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                             {refundAmount === rentalToReturn.deposit ? 'FULL REFUND' : refundAmount === 0 ? 'WITHHOLD' : 'PARTIAL REFUND'}
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-end mb-6">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Cost Breakdown</p>
                        <div className="text-xs text-slate-400 flex flex-col">
                             <span>Base Rental: {formatCurrency(calculateReturnFinancials().baseCost)}</span>
                             {calculateReturnFinancials().lateFee > 0 && (
                                <span className="text-rose-400 font-bold">
                                    + Late Fee: {formatCurrency(calculateReturnFinancials().lateFee)}
                                </span>
                             )}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Final Total Due</p>
                        <p className="text-2xl font-black text-white">{formatCurrency(calculateReturnFinancials().total)}</p>
                    </div>
                </div>
                
                <button 
                    onClick={handleProcessReturn}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center"
                >
                    <CheckCircle2 size={18} className="mr-2" /> CONFIRM RETURN
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Rental Modal */}
      {isExtendModalOpen && rentalToExtend && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsExtendModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <CalendarClock size={20} className="mr-2 text-amber-500" /> Extend Contract
                </h2>
                <p className="text-xs text-slate-500 mt-1">Modify rental duration and update invoicing.</p>
              </div>
              <button onClick={() => setIsExtendModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                     <div className="flex justify-between items-center mb-4">
                        <div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Transaction</div>
                            <div className="text-sm font-mono font-bold text-blue-400">#{rentalToExtend.id.toUpperCase()}</div>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Start Date</div>
                             <div className="text-sm font-bold text-white">{rentalToExtend.startDate}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current End Date</label>
                             <div className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-400">
                                {rentalToExtend.endDate}
                             </div>
                        </div>
                        <div>
                             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">New End Date</label>
                             <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                <input 
                                    type="date"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white [color-scheme:dark]"
                                    value={extensionDate}
                                    min={rentalToExtend.startDate}
                                    onChange={(e) => setExtensionDate(e.target.value)}
                                />
                             </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/20">
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-xs text-slate-500 font-bold">New Duration</span>
                         <span className="text-sm font-black text-white">{calculateExtensionFinancials().newDays} Days</span>
                     </div>
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-xs text-slate-500 font-bold">Previous Total</span>
                         <span className="text-sm font-bold text-slate-400">{formatCurrency(rentalToExtend.totalCost)}</span>
                     </div>
                     <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                         <span className="text-xs text-amber-500 font-bold">Additional Cost</span>
                         <span className="text-sm font-black text-amber-500">
                             + {formatCurrency(calculateExtensionFinancials().additionalCost)}
                         </span>
                     </div>
                </div>

                <div className="flex justify-between items-end pt-4">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">New Contract Total</p>
                        <p className="text-2xl font-black text-white">
                            {formatCurrency(calculateExtensionFinancials().newTotal)}
                        </p>
                    </div>
                    <button 
                        onClick={handleProcessExtension}
                        className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-900/20 transition-all active:scale-95 flex items-center"
                    >
                        <CalendarClock size={16} className="mr-2" /> CONFIRM EXTENSION
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
