import React, { useState, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, Search, Calendar, FileText, MoreVertical, Edit2, Trash2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Rental, RentalStatus, OperationalExpense, Customer } from './types';
import { addOperationalExpense, updateOperationalExpense, deleteOperationalExpense } from './services/db';

interface FinanceDashboardProps {
  rentals: Rental[];
  operationalExpenses: OperationalExpense[];
  customers: Customer[];
  onExpenseAdded: (expense: OperationalExpense) => void;
  onExpenseUpdated: (expense: OperationalExpense) => void;
  onExpenseDeleted: (id: string) => void;
  onViewRental: (rentalId: string) => void;
}

export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ 
  rentals, 
  operationalExpenses, 
  customers,
  onExpenseAdded,
  onExpenseUpdated,
  onExpenseDeleted,
  onViewRental
}) => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState<{
    amount: number;
    category: 'Fuel' | 'Toll' | 'Parking' | 'Driver Meals' | 'Other';
    date: string;
    description: string;
  }>({
    amount: 0,
    category: 'Fuel',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const handleOpenAddExpense = () => {
    setEditingExpenseId(null);
    setExpenseForm({
      amount: 0,
      category: 'Fuel',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense: OperationalExpense) => {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      description: expense.description
    });
    setIsExpenseModalOpen(true);
  };

  const initiateDeleteExpense = (id: string) => {
    setExpenseToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteExpense = async () => {
    if (expenseToDelete) {
      await deleteOperationalExpense(expenseToDelete);
      onExpenseDeleted(expenseToDelete);
      setIsDeleteModalOpen(false);
      setExpenseToDelete(null);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseForm.amount <= 0 || !expenseForm.description) return;

    if (editingExpenseId) {
      const updatedExpense: OperationalExpense = {
        id: editingExpenseId,
        amount: expenseForm.amount,
        category: expenseForm.category,
        date: expenseForm.date,
        description: expenseForm.description
      };
      await updateOperationalExpense(updatedExpense);
      onExpenseUpdated(updatedExpense);
    } else {
      const newExpense = await addOperationalExpense({
        amount: expenseForm.amount,
        category: expenseForm.category,
        date: expenseForm.date,
        description: expenseForm.description
      });
      onExpenseAdded(newExpense);
    }

    setIsExpenseModalOpen(false);
    setEditingExpenseId(null);
    setExpenseForm({
      amount: 0,
      category: 'Fuel',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRowId(prev => prev === id ? null : id);
  };

  // Calculate top metrics
  const rentalRevenue = useMemo(() => {
    return rentals.reduce((acc, r) => {
      // Sum of rental subtotal (totalCost without deliveryFee)
      // Actually, totalCost in Rental includes items cost. Let's just use totalCost.
      // Wait, the prompt says: 'Rental Revenue' (sum of rentalSubtotal from rentals)
      // If rentalSubtotal isn't a field, it's probably totalCost. Let's use totalCost.
      if (r.status === RentalStatus.RETURNED && r.finalRevenue !== undefined) {
        // If finalRevenue includes deliveryFee, we should subtract it to get rentalSubtotal
        return acc + (r.finalRevenue - (r.deliveryFee || 0));
      }
      return acc + r.totalCost + (r.lateFee || 0);
    }, 0);
  }, [rentals]);

  const deliveryCashPool = useMemo(() => {
    const totalDeliveryFees = rentals.reduce((acc, r) => acc + (r.deliveryFee || 0), 0);
    const totalExpenses = operationalExpenses.reduce((acc, e) => acc + e.amount, 0);
    return totalDeliveryFees - totalExpenses;
  }, [rentals, operationalExpenses]);

  // Master Ledger
  const masterLedger = useMemo(() => {
    const ledger: any[] = [];

    // Add Income Rows
    rentals.forEach(r => {
      // Rental Income
      const rentalIncome = r.status === RentalStatus.RETURNED && r.finalRevenue !== undefined
        ? (r.finalRevenue - (r.deliveryFee || 0))
        : (r.totalCost + (r.lateFee || 0));
        
      if (rentalIncome > 0) {
        ledger.push({
          id: `inc-rent-${r.id}`,
          originalId: r.id,
          date: r.startDate,
          type: 'Income',
          category: 'Rental Revenue',
          description: `Rental #${r.id.toUpperCase()}`,
          amount: rentalIncome,
          customerId: r.customerId,
          deliveryAddress: r.deliveryAddress
        });
      }

      // Delivery Income
      if (r.deliveryFee && r.deliveryFee > 0) {
        ledger.push({
          id: `inc-del-${r.id}`,
          originalId: r.id,
          date: r.startDate,
          type: 'Income',
          category: 'Delivery Fee',
          description: `Delivery for Rental #${r.id.toUpperCase()}`,
          amount: r.deliveryFee,
          customerId: r.customerId,
          deliveryAddress: r.deliveryAddress
        });
      }
    });

    // Add Expense Rows
    operationalExpenses.forEach(e => {
      ledger.push({
        id: `exp-${e.id}`,
        originalId: e.id,
        date: e.date,
        type: 'Expense',
        category: e.category,
        description: e.description,
        amount: e.amount
      });
    });

    // Sort by date descending
    return ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rentals, operationalExpenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('IDR', 'Rp');
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-white/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-neutral-400 font-medium tracking-wide text-sm uppercase">Rental Revenue</h3>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white whitespace-nowrap">{formatCurrency(rentalRevenue)}</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-white/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-neutral-400 font-medium tracking-wide text-sm uppercase">Delivery Cash Pool</h3>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-gray-300">
              <Wallet size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white whitespace-nowrap">{formatCurrency(deliveryCashPool)}</p>
          <p className="text-xs text-neutral-500 mt-2">Delivery Fees minus Operational Expenses</p>
        </div>
      </div>

      {/* Master Ledger Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-white tracking-tight">Master Ledger</h2>
        <button
          onClick={handleOpenAddExpense}
          className="bg-white hover:bg-gray-200 text-black px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center space-x-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
        >
          <Plus size={16} />
          <span>Log Expense</span>
        </button>
      </div>

      {/* Master Ledger Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="p-4 text-xs font-medium text-neutral-400 uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-medium text-neutral-400 uppercase tracking-wider">Type</th>
                <th className="p-4 text-xs font-medium text-neutral-400 uppercase tracking-wider">Category</th>
                <th className="p-4 text-xs font-medium text-neutral-400 uppercase tracking-wider">Description</th>
                <th className="p-4 text-xs font-medium text-neutral-400 uppercase tracking-wider text-right">Amount</th>
                <th className="p-4 text-xs font-medium text-neutral-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {masterLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-neutral-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FileText size={32} className="opacity-20" />
                      <p>No transactions found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                masterLedger.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr className="hover:bg-gray-800/50 transition-colors group">
                      <td className="p-4 text-sm text-neutral-300 font-mono">{row.date}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.type === 'Income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-neutral-300">{row.category}</td>
                      <td className="p-4 text-sm text-neutral-400">{row.description}</td>
                      <td className={`p-4 text-sm font-mono text-right ${
                        row.type === 'Income' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {row.type === 'Income' ? '+' : '-'}{formatCurrency(row.amount)}
                      </td>
                      <td className="p-4 text-right">
                        {row.type === 'Expense' ? (
                          <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleOpenEditExpense({
                                id: row.originalId,
                                amount: row.amount,
                                category: row.category as any,
                                date: row.date,
                                description: row.description
                              })}
                              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => initiateDeleteExpense(row.originalId)}
                              className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => toggleRowExpand(row.id)}
                            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                          >
                            {expandedRowId === row.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedRowId === row.id && row.type === 'Income' && (
                      <tr className="bg-neutral-900/80">
                        <td colSpan={6} className="p-4 border-t border-neutral-800/50">
                          <div className="flex items-center justify-between bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Source Contract Context</span>
                              <div className="flex items-center gap-4 mt-1">
                                <div>
                                  <span className="text-[10px] text-neutral-500 block">Customer Name</span>
                                  <span className="text-sm font-medium text-white">
                                    {customers.find(c => c.id === row.customerId)?.name || 'Unknown'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-neutral-500 block">Project / Location</span>
                                  <span className="text-sm font-medium text-white">{row.deliveryAddress || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => onViewRental(row.originalId)}
                              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-gray-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                            >
                              <ExternalLink size={16} />
                              View Contract
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col gap-3 p-4">
          {masterLedger.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              <div className="flex flex-col items-center justify-center space-y-3">
                <FileText size={32} className="opacity-20" />
                <p>No transactions found.</p>
              </div>
            </div>
          ) : (
            masterLedger.map((row) => {
              const isIncome = row.type === 'Income';
              const formattedAmount = formatCurrency(row.amount);
              const abbreviatedId = row.id.length > 8 ? row.id.substring(0, 8) + '...' : row.id;
              
              return (
                <div key={row.id} className="flex flex-col gap-2">
                  <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-white">{row.category}</span>
                        <span className="text-xs text-gray-400">{row.date} • {abbreviatedId}</span>
                      </div>
                      <div className="text-right flex flex-col">
                        <span className={`font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                          {isIncome ? '+' : '-'}{formattedAmount}
                        </span>
                        <span className="text-xs text-gray-500">{row.type}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-gray-700/50">
                      <span className="text-xs text-gray-400 truncate max-w-[60%]">{row.description}</span>
                      
                      {row.type === 'Expense' ? (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleOpenEditExpense({
                              id: row.originalId,
                              amount: row.amount,
                              category: row.category as any,
                              date: row.date,
                              description: row.description
                            })}
                            className="p-1.5 text-gray-400 hover:text-gray-300 bg-gray-700/50 rounded-lg"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => initiateDeleteExpense(row.originalId)}
                            className="p-1.5 text-gray-400 hover:text-red-400 bg-gray-700/50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => toggleRowExpand(row.id)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-300 bg-white/10 px-2 py-1 rounded-lg"
                        >
                          {expandedRowId === row.id ? 'Hide' : 'Details'}
                          {expandedRowId === row.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {expandedRowId === row.id && row.type === 'Income' && (
                    <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl ml-4">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">Source Contract Context</span>
                      <div className="flex flex-col gap-2 mb-3">
                        <div>
                          <span className="text-[10px] text-neutral-500 block">Customer Name</span>
                          <span className="text-sm font-medium text-white">
                            {customers.find(c => c.id === row.customerId)?.name || 'Unknown'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 block">Project / Location</span>
                          <span className="text-sm font-medium text-white">{row.deliveryAddress || 'N/A'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => onViewRental(row.originalId)}
                        className="w-full flex items-center justify-center gap-2 bg-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm font-bold"
                      >
                        <ExternalLink size={16} />
                        View Contract
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Log/Edit Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-gray-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-6 tracking-tight">
              {editingExpenseId ? 'Edit Operational Expense' : 'Log Operational Expense'}
            </h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Amount (Rp)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all font-mono"
                  value={expenseForm.amount || ''}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Category</label>
                <select
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                >
                  <option value="Fuel">Fuel</option>
                  <option value="Toll">Toll</option>
                  <option value="Parking">Parking</option>
                  <option value="Driver Meals">Driver Meals</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                  value={expenseForm.date}
                  onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fuel for delivery truck"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-white hover:bg-gray-200 text-black px-6 py-2 rounded-xl text-sm font-medium transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                >
                  {editingExpenseId ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Expense Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-gray-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                <Trash2 size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Delete Expense</h2>
            </div>
            <p className="text-neutral-400 text-sm mb-6">
              Are you sure you want to delete this operational expense? This action cannot be undone and will affect your financial cashflow calculations.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setExpenseToDelete(null);
                }}
                className="px-4 py-2 text-neutral-400 hover:text-white transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExpense}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
