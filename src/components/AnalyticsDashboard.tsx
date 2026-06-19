import React, { useMemo } from 'react';
import { Order } from '../types';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Clock, 
  RotateCcw, 
  Printer, 
  Flame, 
  ArrowLeft,
  Briefcase,
  Layers
} from 'lucide-react';

interface AnalyticsDashboardProps {
  orders: Order[];
  onRefund: (orderId: string) => void;
  onPrintRelease: (order: Order) => void;
  onBack: () => void;
}

export default function AnalyticsDashboard({ orders, onRefund, onPrintRelease, onBack }: AnalyticsDashboardProps) {
  
  // Calculate stats
  const stats = useMemo(() => {
    // Only count completed orders for revenue
    const activeOrders = orders.filter(o => o.status === 'completed');
    
    let totalRevenue = 0;
    let totalService = 0;
    let cashSales = 0;
    let cardSales = 0;
    let orderCount = activeOrders.length;
    
    // Track popular items count
    const itemCounts: { [key: string]: { name: string; qty: number; category: string } } = {};

    activeOrders.forEach(o => {
      totalRevenue += o.total;
      totalService += o.serviceChargeAmount;
      if (o.paymentMethod === 'cash') {
        cashSales += o.total;
      } else {
        cardSales += o.total;
      }

      o.items.forEach(itm => {
        const optionLabel = itm.selectedOption === 'glass' ? ' (Gl)' : itm.selectedOption === 'bottle' ? ' (Bt)' : '';
        const key = `${itm.menuItem.id}_${itm.selectedOption}`;
        const name = itm.menuItem.nameEn + optionLabel;
        if (!itemCounts[key]) {
          itemCounts[key] = { name, qty: 0, category: itm.menuItem.category };
        }
        itemCounts[key].qty += itm.quantity;
      });
    });

    const averageCheck = orderCount > 0 ? totalRevenue / orderCount : 0;
    
    // Sort popular items
    const topItems = Object.values(itemCounts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Group sales by Table category
    const tableSales: { [key: string]: number } = {};
    activeOrders.forEach(o => {
      tableSales[o.tableNumber] = (tableSales[o.tableNumber] || 0) + o.total;
    });

    const refundCount = orders.filter(o => o.status === 'refunded').length;

    return {
      totalRevenue,
      totalService,
      cashSales,
      cardSales,
      orderCount,
      averageCheck,
      topItems,
      tableSales,
      refundCount
    };
  }, [orders]);

  const cashPercent = stats.totalRevenue > 0 ? (stats.cashSales / stats.totalRevenue) * 100 : 0;
  const cardPercent = stats.totalRevenue > 0 ? (stats.cardSales / stats.totalRevenue) * 100 : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-[#faf8f5] p-6 text-stone-850">
      {/* Top action bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="flex items-center justify-center rounded-xl border border-stone-200 bg-white p-2.5 text-stone-500 hover:bg-stone-50 hover:text-gold-650 shadow-xs transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-stone-900 tracking-tight">
              მოლარის ანგარიში • Analytics Dash
            </h1>
            <p className="text-xs text-stone-400 font-medium">
              Total logs, income summary and custom transactions details for Black Cat.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 rounded-xl bg-white p-1 border border-stone-200 shadow-xs">
          <span className="px-3 py-1.5 text-xs font-bold text-gold-650">
            {stats.orderCount} Closed Orders
          </span>
          {stats.refundCount > 0 && (
            <span className="px-3 py-1.5 text-xs font-bold text-red-650 border-l border-stone-200">
              {stats.refundCount} Refunded
            </span>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Total Revenue */}
        <div className="rounded-2xl border border-gold-300 bg-amber-50/40 p-5 relative overflow-hidden shadow-xs">
          <div className="absolute right-4 bottom-4 text-gold-500/10">
            <TrendingUp className="h-20 w-20 text-gold-500/30" />
          </div>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">სულ გაყიდვები / Total Sales</p>
          <p className="mt-2 text-3xl font-bold font-mono text-gold-650">
            {stats.totalRevenue.toFixed(0)} <span className="text-xl">₾</span>
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-stone-405">
            <span>In total revenue, excl. refunds</span>
          </div>
        </div>

        {/* Average check */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">საშუალო ჩეკი / Avg Bill</p>
          <p className="mt-2 text-3xl font-bold font-mono text-stone-900">
            {stats.averageCheck.toFixed(0)} <span className="text-xl">₾</span>
          </p>
          <div className="mt-3 text-xs text-stone-500 flex items-center gap-1.5 font-medium">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            <span>Per individual invoice ticket</span>
          </div>
        </div>

        {/* Collected Service Charge */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">მომსახურება / Service Total</p>
          <p className="mt-2 text-3xl font-bold font-mono text-stone-900">
            {stats.totalService.toFixed(0)} <span className="text-xl">₾</span>
          </p>
          <div className="mt-3 text-xs text-stone-500 flex items-center gap-1.5 font-medium">
            <Briefcase className="h-3.5 w-3.5 text-blue-650" />
            <span>Accrued restaurant tips/fees</span>
          </div>
        </div>

        {/* Fast Cash vs Card Split */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col justify-between shadow-xs">
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">მეთოდები / Payment Methods</p>
            <div className="mt-2 flex justify-between text-xs font-mono font-bold">
              <span className="text-emerald-700">Cash: {stats.cashSales.toFixed(0)}₾</span>
              <span className="text-sky-700">Card: {stats.cardSales.toFixed(0)}₾</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-stone-100">
              <div 
                className="bg-emerald-505 transition-all duration-500" 
                style={{ width: `${cashPercent || 50}%`, backgroundColor: '#10b981' }} 
              />
              <div 
                className="bg-sky-505 transition-all duration-500" 
                style={{ width: `${cardPercent || 50}%`, backgroundColor: '#0ea5e9' }} 
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-stone-400 font-mono font-bold">
              <span>{cashPercent.toFixed(0)}%</span>
              <span>{cardPercent.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        {/* Top 5 Hot Products */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 lg:col-span-1 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-550 animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">
              პოპულარული / Best Sellers
            </h2>
          </div>
          
          {stats.topItems.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center text-xs text-stone-400">
              No product sales logged yet today.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.topItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl bg-stone-50 p-3 border border-stone-100">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-stone-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-stone-450 truncate font-medium">{item.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-amber-500/10 border border-amber-300/40 px-2 py-0.5 text-xs font-mono font-bold text-gold-700">
                      x{item.qty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Table sales performance */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 lg:col-span-2 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-gold-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-850">
              მაგიდების რეიტინგი / Table Contributions
            </h2>
          </div>

          {Object.keys(stats.tableSales).length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center text-xs text-stone-400">
              No sales by table logged yet today.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(stats.tableSales).map(([tbl, total]) => (
                <div key={tbl} className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 flex flex-col justify-between">
                  <span className="text-xs font-bold text-stone-550 text-left">{tbl}</span>
                  <span className="mt-2 text-lg font-bold font-mono text-stone-900 text-left">
                    {(total as number).toFixed(0)} <span className="text-xs text-gold-655 font-bold">₾</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Transaction Audit Logs */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs">
        <div className="border-b border-stone-100 bg-stone-50 px-5 py-4 flex justify-between items-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
            <Clock className="h-4 w-4 text-stone-500" />
            ჩეკების ისტორია / Receipt Transaction Log
          </h2>
          <span className="text-xs font-mono font-bold text-stone-400">
            Total Logs: {orders.length}
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-stone-400">
            <p className="text-sm">არცერთი შეკვეთა არ მოიძებნა</p>
            <p className="text-xs mt-1">Orders database is currently empty.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-stone-850">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fcfbfa] text-[10px] text-stone-400 uppercase tracking-wider border-b border-stone-100 font-bold">
                <tr>
                  <th className="px-5 py-3">Receipt / ID</th>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Table</th>
                  <th className="px-5 py-3">Items Ordered</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3 text-right">Total Billing</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((order) => {
                  const isRefunded = order.status === 'refunded';
                  const dateStr = new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-stone-50 transition-colors ${
                        isRefunded ? 'bg-red-50/40 text-stone-400' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-stone-700">
                        #{order.orderNumber}
                      </td>
                      <td className="px-5 py-3.5 text-stone-400 font-medium">
                        {dateStr}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-stone-700">
                        {order.tableNumber}
                      </td>
                      <td className="px-5 py-3.5 text-stone-400 max-w-[220px] truncate font-medium">
                        {order.items.map(itm => {
                          const optLabel = itm.selectedOption === 'glass' ? '-Gl' : itm.selectedOption === 'bottle' ? '-Bt' : '';
                          return `${itm.menuItem.nameEn}${optLabel} x${itm.quantity}`;
                        }).join(', ')}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold font-mono leading-none ${
                          order.paymentMethod === 'card' 
                            ? 'bg-sky-50 text-sky-700 border border-sky-100' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {order.paymentMethod.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-stone-800">
                        {isRefunded ? '-' : ''}{order.total.toFixed(0)} ₾
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isRefunded 
                            ? 'bg-red-50 text-red-700 border border-red-100' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {isRefunded ? 'Refunded' : 'Completed'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2 text-stone-850">
                          <button
                            onClick={() => onPrintRelease(order)}
                            className="flex items-center justify-center p-1.5 rounded-lg border border-stone-200 bg-white text-stone-450 hover:bg-stone-50 hover:text-gold-650 transition-all shadow-xs"
                            title="Receipt Details & Reprint"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          
                          {!isRefunded ? (
                            <button
                              onClick={() => {
                                if (window.confirm('დარწმუნებული ხართ რომ გსურთ ამ ჩეკის გაუქმება (Refund)?')) {
                                  onRefund(order.id);
                                }
                              }}
                              className="flex items-center justify-center p-1.5 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all shadow-xs"
                              title="Cancel / Refund Transaction"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <div className="w-[28px]" /> // blank placeholder
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
