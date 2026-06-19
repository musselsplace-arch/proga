import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MenuCategory, 
  MenuItem, 
  CartItem, 
  Order, 
  TableState, 
  PrinterState, 
  OrderOption 
} from './types';
import { MENU_ITEMS } from './data';
import { 
  findBulkOutEndpoint, 
  generateEscPosPayload 
} from './utils/printer';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ReceiptModal from './components/ReceiptModal';
import { db, doc, onSnapshot, setDoc, collection, deleteDoc } from './lib/firebase';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Layers, 
  Settings, 
  BarChart3, 
  Printer, 
  ShoppingCart, 
  Coins, 
  CreditCard,
  Sparkles,
  Sliders,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Volume2,
  Trash
} from 'lucide-react';

const INITIAL_TABLES: TableState[] = [
  { tableId: 'Takeaway', tableNameKa: 'გასატანი (Takeaway)', tableNameEn: 'Takeaway', items: [], discountPercent: 0, serviceChargePercent: 0 },
  { tableId: 'T1', tableNameKa: 'მაგიდა 1', tableNameEn: 'Table 1', items: [], discountPercent: 0, serviceChargePercent: 0 },
  { tableId: 'T2', tableNameKa: 'მაგიდა 2', tableNameEn: 'Table 2', items: [], discountPercent: 0, serviceChargePercent: 0 },
  { tableId: 'T3', tableNameKa: 'მაგიდა 3', tableNameEn: 'Table 3', items: [], discountPercent: 0, serviceChargePercent: 0 },
  { tableId: 'T4', tableNameKa: 'მაგიდა 4', tableNameEn: 'Table 4', items: [], discountPercent: 0, serviceChargePercent: 0 },
  { tableId: 'T5', tableNameKa: 'მაგიდა 5', tableNameEn: 'Table 5', items: [], discountPercent: 0, serviceChargePercent: 0 },
  { tableId: 'B1', tableNameKa: 'ბარი 1', tableNameEn: 'Bar 1', items: [], discountPercent: 0, serviceChargePercent: 0 },
  { tableId: 'B2', tableNameKa: 'ბარი 2', tableNameEn: 'Bar 2', items: [], discountPercent: 0, serviceChargePercent: 0 },
  { tableId: 'B3', tableNameKa: 'ბარი 3', tableNameEn: 'Bar 3', items: [], discountPercent: 0, serviceChargePercent: 0 },
];

export default function App() {
  // --- STATE DECLARATIONS ---
  const [tablesState, setTablesState] = useState<TableState[]>([]);
  const [activeTableId, setActiveTableId] = useState<string>('Takeaway');
  const [ordersHistory, setOrdersHistory] = useState<Order[]>([]);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'All'>('All');
  const [activeTab, setActiveTab] = useState<'pos' | 'analytics'>('pos');
  
  // Custom quick-add item inputs
  const [customNameKa, setCustomNameKa] = useState<string>('');
  const [customNameEn, setCustomNameEn] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  // General settings panel toggles
  const [cashierName, setCashierName] = useState<string>('Cashier A');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState<boolean>(false);
  const [audioFeedback, setAudioFeedback] = useState<boolean>(true);

  // Printer Configuration State
  const [printerState, setPrinterState] = useState<PrinterState>({
    isConnected: false,
    deviceName: '',
    printWidth: '58mm',
    printerEncoding: 'translit', // Translit is standard for standard cheap receipt printers
  });
  const [usbError, setUsbError] = useState<string | null>(null);
  const activeDeviceRef = useRef<any | null>(null);

  // Active printed invoice modal target
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  // Admin Overview Panel toggler state
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);

  // --- REAL-TIME FIREBASE SYNC: TABLES ---
  useEffect(() => {
    const q = collection(db, 'tables');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Run first-time population of Firestore tables (with service charge = 0!)
        INITIAL_TABLES.forEach(async (tbl) => {
          await setDoc(doc(db, 'tables', tbl.tableId), tbl);
        });
        return;
      }

      const docsData: TableState[] = [];
      snapshot.forEach((docSnapshot) => {
        docsData.push(docSnapshot.data() as TableState);
      });

      // Sort according to INITIAL_TABLES sequence so the UI preserves the exact tab order
      const sorted = [...docsData].sort((a, b) => {
        const idxA = INITIAL_TABLES.findIndex(t => t.tableId === a.tableId);
        const idxB = INITIAL_TABLES.findIndex(t => t.tableId === b.tableId);
        return idxA - idxB;
      });

      setTablesState(sorted);
    });

    return () => unsubscribe();
  }, []);

  // --- REAL-TIME FIREBASE SYNC: ORDERS ---
  useEffect(() => {
    const q = collection(db, 'orders');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOrders: Order[] = [];
      snapshot.forEach((docSnapshot) => {
        allOrders.push(docSnapshot.data() as Order);
      });
      // Sort in descending order based on timestamp/date (newest order first)
      const sortedOrders = allOrders.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      setOrdersHistory(sortedOrders);
    });

    return () => unsubscribe();
  }, []);

  // --- LOCAL CONFIG & OFFLINE RESTORE ---
  useEffect(() => {
    // Sync printer state
    const savedPrinter = localStorage.getItem('black_cat_printer_config');
    if (savedPrinter) {
      try {
        const parsed = JSON.parse(savedPrinter);
        setPrinterState(prev => ({
          ...prev,
          ...parsed,
          isConnected: false, // Force reconnecting USB device on refresh due to browser policy
        }));
      } catch {}
    }

    // Sync cashier
    const savedCashier = localStorage.getItem('black_cat_cashier');
    if (savedCashier) {
      setCashierName(savedCashier);
    }
  }, []);

  // Firestore update helper for single table modifications
  const updateTableDoc = async (tableId: string, updater: (tbl: TableState) => TableState) => {
    const current = tablesState.find(t => t.tableId === tableId);
    if (!current) return;
    const next = updater(current);
    try {
      await setDoc(doc(db, 'tables', tableId), next);
    } catch (err) {
      console.error("Failed to update table in Firestore:", err);
      // Fallback local update
      setTablesState(prev => prev.map(t => t.tableId === tableId ? next : t));
    }
  };

  const savePrinterConfig = (updated: Partial<PrinterState>) => {
    const next = { ...printerState, ...updated };
    setPrinterState(next);
    localStorage.setItem('black_cat_printer_config', JSON.stringify({
      printWidth: next.printWidth,
      printerEncoding: next.printerEncoding
    }));
  };

  // --- SOUND FEEDBACKS ---
  const playBeep = (freq = 800, type: OscillatorType = 'sine', duration = 0.08) => {
    if (!audioFeedback) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Sound feedback bypassed:", e);
    }
  };

  // --- USB CONNECTOR HELPER ---
  const connectUsbPrinter = async () => {
    setUsbError(null);
    if (typeof navigator === 'undefined' || !('usb' in navigator)) {
      setUsbError('WebUSB is not supported inside standard iframe sandbox containers! Please open the app in a new tab using the top-right button to connect to USB hardware directly.');
      return;
    }
    try {
      // Prompt user to select USB device
      const device = await (navigator as any).usb.requestDevice({
        filters: [] // Do not restrict to classCode 7, many consumer receipt printers do not set class descriptor properly
      });
      
      await device.open();
      // Select config 1
      await device.selectConfiguration(1);
      
      // Auto-claim the first available interface
      let interfaceNum = 0;
      if (device.configuration && device.configuration.interfaces.length > 0) {
        interfaceNum = device.configuration.interfaces[0].interfaceNumber;
      }
      
      await device.claimInterface(interfaceNum);
      
      activeDeviceRef.current = device;
      setPrinterState(prev => ({
        ...prev,
        isConnected: true,
        deviceName: device.productName || device.manufacturerName || 'Thermal Receipt Printer'
      }));
      playBeep(1200, 'sine', 0.2);
    } catch (err: any) {
      console.error('USB Hardware Connection Error:', err);
      let errMsg = err.message || JSON.stringify(err);
      if (err.name === 'SecurityError') {
        errMsg = 'Permission blocked inside sandboxed frame. Open the application in a new browser tab where permissions are permitted!';
      }
      setUsbError(errMsg);
      playBeep(450, 'sawtooth', 0.25);
    }
  };

  const transmitPrintToUsb = async (order: Order): Promise<boolean> => {
    if (!activeDeviceRef.current || !printerState.isConnected) {
      return false;
    }
    try {
      const device = activeDeviceRef.current;
      const endpoint = findBulkOutEndpoint(device);
      const binaryPayload = generateEscPosPayload(order, printerState.printWidth, printerState.printerEncoding);
      
      await device.transferOut(endpoint, binaryPayload.buffer);
      playBeep(950, 'sine', 0.15);
      return true;
    } catch (err) {
      console.error('USB print transfer failed:', err);
      playBeep(400, 'triangle', 0.3);
      return false;
    }
  };

  // --- POS CART COMPUTATIONS & UTILS ---
  const activeTable = useMemo(() => {
    return tablesState.find(t => t.tableId === activeTableId) || {
      tableId: 'Takeaway',
      tableNameKa: 'გასატანი',
      tableNameEn: 'Takeaway',
      items: [],
      discountPercent: 0,
      serviceChargePercent: 0
    };
  }, [tablesState, activeTableId]);

  const activeCart = activeTable.items;

  const currentCartTotals = useMemo(() => {
    const subtotal = activeCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountAmount = Math.round(subtotal * (activeTable.discountPercent / 100));
    const serviceChargeAmount = Math.round((subtotal - discountAmount) * (activeTable.serviceChargePercent / 100));
    const total = subtotal - discountAmount + serviceChargeAmount;

    return {
      subtotal,
      discountAmount,
      serviceChargeAmount,
      total
    };
  }, [activeCart, activeTable.discountPercent, activeTable.serviceChargePercent]);

  // --- BASKET MANIPULATIONS ---
  const handleAddToCart = (menuItem: MenuItem, option: OrderOption) => {
    playBeep(900, 'sine', 0.05);
    const cartItemId = `${menuItem.id}_${option}`;
    const price = menuItem.isWine
      ? (option === 'glass' ? menuItem.glassPrice || 0 : menuItem.bottlePrice || 0)
      : menuItem.price || 0;

    updateTableDoc(activeTableId, (t) => {
      const index = t.items.findIndex(i => i.id === cartItemId);
      let updatedItems;
      if (index > -1) {
        updatedItems = t.items.map((item, idx) => 
          idx === index ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        updatedItems = [...t.items, {
          id: cartItemId,
          menuItem,
          quantity: 1,
          selectedOption: option,
          unitPrice: price
        }];
      }
      return { ...t, items: updatedItems };
    });
  };

  const handleUpdateQuantity = (cartItemId: string, change: number) => {
    playBeep(change > 0 ? 950 : 750, 'sine', 0.05);
    updateTableDoc(activeTableId, (t) => {
      const updatedItems = t.items.map(item => {
        if (item.id === cartItemId) {
          const nextQty = item.quantity + change;
          return nextQty > 0 ? { ...item, quantity: nextQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
      return { ...t, items: updatedItems };
    });
  };

  const handleRemoveItem = (cartItemId: string) => {
    playBeep(400, 'sine', 0.1);
    updateTableDoc(activeTableId, (t) => {
      return {
        ...t,
        items: t.items.filter(i => i.id !== cartItemId)
      };
    });
  };

  const handleClearCart = () => {
    playBeep(350, 'sine', 0.15);
    updateTableDoc(activeTableId, (t) => {
      return { ...t, items: [], discountPercent: 0, serviceChargePercent: 0 };
    });
  };

  const setDiscountForActiveTable = (pct: number) => {
    playBeep(850, 'sine', 0.05);
    updateTableDoc(activeTableId, (t) => {
      return { ...t, discountPercent: pct };
    });
  };

  const setServiceChargeForActiveTable = (pct: number) => {
    playBeep(850, 'sine', 0.05);
    updateTableDoc(activeTableId, (t) => {
      return { ...t, serviceChargePercent: pct };
    });
  };

  // --- CATALOG FILTERING ---
  const filteredMenuItems = useMemo(() => {
    return MENU_ITEMS.filter(item => {
      // Filter by Category
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      // Filter by Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchKa = item.nameKa.toLowerCase().includes(query);
        const matchEn = item.nameEn.toLowerCase().includes(query);
        const detailsKaMatch = item.detailsKa?.toLowerCase().includes(query) || false;
        const detailsEnMatch = item.detailsEn?.toLowerCase().includes(query) || false;
        return matchKa || matchEn || detailsKaMatch || detailsEnMatch;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  // --- CHECKOUT SUBMISSION ---
  const handleCheckout = (paymentMethod: 'cash' | 'card') => {
    if (activeCart.length === 0) return;

    // Create unique invoice numbers (e.g. BC-1001, BC-1002)
    const nextOrderNumber = (ordersHistory.length + 1001).toString();
    const uniqueId = `order_${Date.now()}`;

    const newOrder: Order = {
      id: uniqueId,
      orderNumber: nextOrderNumber,
      items: [...activeCart],
      subtotal: currentCartTotals.subtotal,
      discountPercent: activeTable.discountPercent,
      discountAmount: currentCartTotals.discountAmount,
      serviceChargePercent: activeTable.serviceChargePercent,
      serviceChargeAmount: currentCartTotals.serviceChargeAmount,
      total: currentCartTotals.total,
      paymentMethod,
      timestamp: new Date().toISOString(),
      tableNumber: activeTable.tableId === 'Takeaway' ? 'Takeaway' : activeTable.tableNameEn,
      cashierName,
      status: 'completed'
    };

    // Play double confirmation beeps
    playBeep(1100, 'sine', 0.1);
    setTimeout(() => playBeep(1400, 'sine', 0.12), 100);

    // Save order in history via Firestore
    try {
      setDoc(doc(db, 'orders', uniqueId), newOrder);
    } catch (err) {
      console.error("Failed to save order in Firestore:", err);
      // fallback
      setOrdersHistory(prev => [newOrder, ...prev]);
    }

    // Open receipt print dialogue
    setPrintingOrder(newOrder);

    // Auto-trigger direct printing if hardware is connected!
    if (printerState.isConnected) {
      setTimeout(() => {
        transmitPrintToUsb(newOrder);
      }, 500);
    }

    // Clear active table cart and sync with Firestore
    updateTableDoc(activeTableId, (t) => {
      return {
        ...t,
        items: [],
        discountPercent: 0,
        serviceChargePercent: 0
      };
    });
  };

  // --- CUSTOM SALES ITEM INJECTOR ---
  const handleAddCustomCharge = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(customPrice);
    if (!customNameKa || !customNameEn || isNaN(priceNum) || priceNum <= 0) {
      alert('გთხოვთ შეავსოთ ველები სწორად! (Please fill values correctly)');
      return;
    }

    const uniqueCustomItem: MenuItem = {
      id: `custom_${Date.now()}`,
      nameKa: customNameKa,
      nameEn: customNameEn,
      category: MenuCategory.BreakfastStarters, // default category
      detailsKa: 'საფირმო ხაზგარეშე შეკვეთა',
      detailsEn: 'Custom off-menu charge',
      isWine: false,
      price: priceNum
    };

    handleAddToCart(uniqueCustomItem, 'standard');
    
    // Clear & close
    setCustomNameKa('');
    setCustomNameEn('');
    setCustomPrice('');
    setShowCustomModal(false);
  };

  // --- REFUNDING & REPRINTS ---
  const handleRefund = async (orderId: string) => {
    playBeep(300, 'sawtooth', 0.25);
    const existingOrder = ordersHistory.find(o => o.id === orderId);
    if (!existingOrder) return;
    try {
      await setDoc(doc(db, 'orders', orderId), { ...existingOrder, status: 'refunded' as const });
    } catch (err) {
      console.error("Failed to refund order in firestore:", err);
      // fallback
      setOrdersHistory(prev => prev.map(o => {
        if (o.id === orderId) {
          return { ...o, status: 'refunded' as const };
        }
        return o;
      }));
    }
  };

  const handleReprintRelease = (order: Order) => {
    setPrintingOrder(order);
  };

  // Reset Cache entirely
  const handleResetSystemCache = async () => {
    const ok = window.confirm('დარწმუნებული ხართ რომ გსურთ სისტემის გაწმენდა? წაიშლება ყველა შეკვეთის ისტორია და მაგიდების მიმდინარე კალათები.');
    if (ok) {
      playBeep(200, 'sawtooth', 0.4);
      // Update tables in Firestore to initial tables
      for (const tbl of INITIAL_TABLES) {
        try {
          await setDoc(doc(db, 'tables', tbl.tableId), tbl);
        } catch (err) {
          console.error(`Failed to reset table ${tbl.tableId}:`, err);
        }
      }

      // Delete order documents from Firestore
      for (const ord of ordersHistory) {
        try {
          await deleteDoc(doc(db, 'orders', ord.id));
        } catch (err) {
          console.error(`Failed to delete order document ${ord.id}:`, err);
        }
      }

      setTablesState(INITIAL_TABLES);
      setOrdersHistory([]);
      setActiveTableId('Takeaway');
      setShowSettingsDropdown(false);
    }
  };

  return (
    <div id="pos-application-root" className="flex flex-col h-screen bg-[#faf8f5] font-sans text-stone-800 overflow-hidden select-none">
      
      {/* 1. Header Navigation Bar */}
      <header className="h-16 shrink-0 bg-white border-b border-stone-200/80 flex items-center justify-between px-5 z-20 shadow-xs">
        
        {/* Left emblem & titles */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-9 w-9 rounded-xl bg-gold-500/10 flex items-center justify-center border border-gold-500/30 shrink-0">
            <span className="text-lg font-bold text-gold-600">🐈</span>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-lg tracking-tight text-stone-900">BLACK CAT</span>
              <span className="text-[10px] font-mono font-bold text-gold-800 px-1.5 py-0.5 rounded bg-gold-100 border border-gold-200">POS 1.2</span>
            </div>
          </div>
        </div>

        {/* Global Nav Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          
          <button
            onClick={() => { playBeep(850, 'sine', 0.08); setActiveTab('pos'); }}
            className={`px-2.5 py-2 sm:px-4 rounded-xl text-xs font-semibold tracking-wide transition-all duration-250 flex items-center gap-1.5 ${
              activeTab === 'pos' 
                ? 'bg-stone-200 text-stone-900 ring-1 ring-stone-300' 
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5 text-stone-600" />
            <span className="hidden md:inline">სალარო / Checkout</span>
            <span className="md:hidden">სალარო</span>
          </button>

          <button
            onClick={() => { playBeep(850, 'sine', 0.08); setActiveTab('analytics'); }}
            className={`px-2.5 py-2 sm:px-4 rounded-xl text-xs font-semibold tracking-wide transition-all duration-250 flex items-center gap-1.5 ${
              activeTab === 'analytics' 
                ? 'bg-stone-200 text-stone-900 ring-1 ring-stone-300' 
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-stone-600" />
            <span className="hidden md:inline">ანალიტიკა / History</span>
            <span className="md:hidden">ანალიტიკა</span>
            {ordersHistory.length > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-gold-600 shrink-0" />
            )}
          </button>

          {/* New Admin Button requested by user */}
          <button
            onClick={() => { playBeep(850, 'sine', 0.08); setShowAdminPanel(true); }}
            className="px-2.5 py-2 sm:px-4 rounded-xl text-xs font-bold tracking-wide transition-all duration-250 flex items-center gap-1.5 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 ring-1 ring-amber-500/20"
          >
            <Sliders className="h-3.5 w-3.5 text-amber-600" />
            <span className="hidden md:inline">ადმინი / Admin</span>
            <span className="md:hidden">ადმინი</span>
          </button>

          {/* Quick Hardware Printer Status Line indicator */}
          <button 
            onClick={connectUsbPrinter}
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
              printerState.isConnected 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-stone-100 text-stone-600 border-stone-200/80 hover:bg-stone-200'
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>USB: {printerState.isConnected ? 'Connected' : 'Offline'}</span>
          </button>

          {/* Settings Trigger */}
          <div className="relative">
            <button
              onClick={() => { playBeep(900, 'sine', 0.05); setShowSettingsDropdown(!showSettingsDropdown); }}
              className={`h-9 w-9 bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center justify-center text-stone-600 hover:text-stone-900 transition border ${
                showSettingsDropdown ? 'border-amber-500 text-gold-600 bg-amber-50' : 'border-stone-200/80'
              }`}
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Dropdown overlay */}
            <AnimatePresence>
              {showSettingsDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-72 rounded-2xl border border-stone-200 bg-white p-4 shadow-xl z-50 text-stone-800"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">სისტემის მართვა</span>
                    <button onClick={() => setShowSettingsDropdown(false)} className="text-stone-450 hover:text-stone-700">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Shift Cashier Name Configuration */}
                    <div>
                      <label className="text-[10px] text-stone-400 block font-semibold mb-1">CASHIER NAME / მელარე</label>
                      <input 
                        type="text" 
                        value={cashierName} 
                        onChange={(e) => {
                          setCashierName(e.target.value);
                          localStorage.setItem('black_cat_cashier', e.target.value);
                        }}
                        className="w-full bg-stone-50 rounded-xl px-3 py-1.5 text-xs text-stone-800 border border-stone-200 focus:outline-none focus:border-gold-500"
                      />
                    </div>

                    {/* Printer config fields */}
                    <div>
                      <label className="text-[10px] text-stone-400 block font-semibold mb-1">PAPER WIDTH / ფურცელი</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['58mm', '80mm'] as const).map(w => (
                          <button
                            key={w}
                            onClick={() => savePrinterConfig({ printWidth: w })}
                            className={`py-1 rounded text-xs transition font-mono ${
                              printerState.printWidth === w 
                                ? 'bg-gold-500/15 text-gold-850 border border-gold-300' 
                                : 'bg-stone-50 text-stone-400 border border-stone-200'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-stone-400 block font-semibold mb-1">ENCODING / ენა ჩეკში</label>
                      <select 
                        value={printerState.printerEncoding}
                        onChange={(e) => savePrinterConfig({ printerEncoding: e.target.value as any })}
                        className="w-full bg-stone-50 rounded-xl px-2 py-1.5 text-xs text-stone-800 border border-stone-200 focus:outline-none focus:border-gold-500"
                      >
                        <option value="translit">Transliterated (Sapirmo Omleti)</option>
                        <option value="utf8">UTF-8 Georgian (Safarmo Omleti)</option>
                        <option value="english">English translation only</option>
                      </select>
                    </div>

                    {/* Beeps toggler */}
                    <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                      <span className="text-xs text-stone-600 flex items-center gap-2">
                        <Volume2 className="h-3.5 w-3.5 text-stone-450" /> Audio Feedback
                      </span>
                      <button
                        onClick={() => setAudioFeedback(!audioFeedback)}
                        className={`text-xs px-2.5 py-1 rounded transition ${
                          audioFeedback ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {audioFeedback ? 'Enabled' : 'Muted'}
                      </button>
                    </div>

                    {/* Hard reset cache */}
                    <button
                      onClick={handleResetSystemCache}
                      className="w-full mt-2 py-2 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-all text-xs text-center font-semibold"
                    >
                      Reset Local POS Cache
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      {activeTab === 'analytics' ? (
        <AnalyticsDashboard 
          orders={ordersHistory}
          onRefund={handleRefund}
          onPrintRelease={handleReprintRelease}
          onBack={() => { playBeep(800, 'sine', 0.05); setActiveTab('pos'); }}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Left Columns: Seating Tabs & Menu item catalogs */}
          <div className="flex-1 flex flex-col bg-[#faf8f5] overflow-hidden border-r border-stone-200/85">
            
            {/* Horizontal Tables & Bar stools selection bar */}
            <div className="h-14 shrink-0 bg-[#f4f1ea] border-b border-stone-200 px-4 flex items-center gap-2 overflow-x-auto select-none">
              <span className="text-xs font-semibold text-stone-500 shrink-0 mr-1 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-gold-600" />
                მაგიდები:
              </span>
              {tablesState.map((tbl) => {
                const isActive = tbl.tableId === activeTableId;
                const busyCount = tbl.items.reduce((sum, item) => sum + item.quantity, 0);
                const tableTotal = tbl.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

                return (
                  <button
                    key={tbl.tableId}
                    onClick={() => {
                      playBeep(920, 'sine', 0.06);
                      setActiveTableId(tbl.tableId);
                    }}
                    className={`h-9 shrink-0 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 flex items-center gap-2 relative ${
                      isActive 
                        ? 'bg-gold-500/15 text-gold-850 border border-gold-400/50 shadow-xs' 
                        : busyCount > 0
                          ? 'border border-amber-500 bg-amber-50 text-amber-800 hover:bg-amber-100 shadow-xs'
                          : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900 shadow-xs'
                    }`}
                  >
                    <span>{tbl.tableId === 'Takeaway' ? '🥡' : ''} {tbl.tableNameEn}</span>
                    {busyCount > 0 && (
                      <span className="rounded-md bg-amber-500/20 border border-amber-500/30 px-1 font-bold font-mono text-[9px] text-amber-800">
                        {tableTotal.toFixed(0)}₾
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Catalog Search & Custom Sales additions trigger panel */}
            <div className="p-4 shrink-0 bg-stone-100/40 border-b border-stone-200/80 flex flex-col sm:flex-row gap-3 items-center justify-between">
              
              {/* Category selector pill dropdown */}
              <div className="flex gap-1.5 overflow-x-auto self-stretch sm:self-auto max-w-full pb-1 sm:pb-0">
                <button
                  onClick={() => { playBeep(850, 'sine', 0.04); setSelectedCategory('All'); }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold shrink-0 transition ${
                    selectedCategory === 'All' 
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold' 
                      : 'bg-white text-stone-600 border border-stone-200 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  All Items
                </button>
                {Object.values(MenuCategory).map(cat => (
                  <button
                    key={cat}
                    onClick={() => { playBeep(850, 'sine', 0.04); setSelectedCategory(cat); }}
                    className={`h-8 px-3 rounded-lg text-xs font-bold shrink-0 transition ${
                      selectedCategory === cat 
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold' 
                        : 'bg-white text-stone-600 border border-stone-200 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 items-center w-full sm:w-auto self-stretch">
                {/* Search input */}
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="ძიება / Search recipes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white rounded-xl pl-9 pr-4 py-2 text-xs text-stone-850 placeholder-stone-400 border border-stone-200 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-stone-900 text-stone-400 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Custom non-menu sale add button */}
                <button
                  type="button"
                  onClick={() => { playBeep(920, 'sine', 0.06); setShowCustomModal(true); }}
                  className="h-9 px-3 rounded-xl border border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 shadow-xs transition-all flex items-center gap-1.5 shrink-0"
                >
                  <span>➕ Off-Menu</span>
                </button>
              </div>
            </div>

            {/* Menu catalog products GRID */}
            <div className="flex-1 overflow-y-auto p-5">
              
              {filteredMenuItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-stone-400 text-center">
                  <span className="text-3xl">🏜️</span>
                  <p className="text-xs font-semibold mt-2 text-stone-650">პროდუქტი ვერ მოიებნა / No items matched</p>
                  <p className="text-[11px] text-stone-400 mt-1">Refine your category filters or try a different term.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredMenuItems.map((item) => (
                    <div 
                      key={item.id}
                      className="rounded-2xl border border-stone-200 bg-white hover:bg-[#FAF9F6] p-4 shadow-xs transition-all duration-150 flex flex-col justify-between group relative hover:border-stone-300 hover:shadow-md"
                    >
                      <div>
                        {/* Title & Lang label */}
                        <div className="text-left">
                          <h3 className="font-display font-bold text-stone-850 group-hover:text-gold-650 transition-colors text-sm truncate uppercase tracking-tight">
                            {item.nameEn}
                          </h3>
                          <h4 className="font-sans text-[11px] font-medium text-stone-550 mt-0.5 truncate">
                            {item.nameKa}
                          </h4>
                        </div>

                        {/* Grams and details text description if exists */}
                        {(item.detailsEn || item.detailsKa) && (
                          <p className="text-[10px] text-stone-400/95 italic mt-2 line-clamp-2 text-left leading-relaxed">
                            {item.detailsEn || item.detailsKa}
                          </p>
                        )}
                      </div>

                      {/* Pricing block trigger controls */}
                      <div className="mt-4 pt-3 border-t border-stone-100 flex justify-between items-center bg-stone-50 p-1.5 rounded-xl">
                        {!item.isWine ? (
                          <>
                            <span className="text-xs font-mono font-bold text-stone-900 flex items-center gap-0.5">
                              {item.price} <span className="text-gold-600 text-[10px]">₾</span>
                            </span>
                            <button
                              onClick={() => handleAddToCart(item, 'standard')}
                              className="px-3 py-1.5 rounded-lg bg-gold-500 text-white hover:bg-gold-600 text-[10px] font-bold tracking-wider transition shadow-xs active:scale-[0.97]"
                            >
                              ADD +
                            </button>
                          </>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5 w-full">
                            <button
                              onClick={() => handleAddToCart(item, 'glass')}
                              className="py-1 px-1 rounded-lg bg-white hover:bg-gold-500/10 border border-stone-200 text-[10px] text-stone-700 font-mono transition flex flex-col items-center leading-tight active:scale-[0.98]"
                            >
                              <span className="text-[8px] text-stone-400 uppercase font-semibold">Glass/ჭიქა</span>
                              <span className="font-bold text-gold-600 mt-0.5">{item.glassPrice}₾</span>
                            </button>
                            <button
                              onClick={() => handleAddToCart(item, 'bottle')}
                              className="py-1 px-1 rounded-lg bg-white hover:bg-gold-500/10 border border-stone-200 text-[10px] text-stone-700 font-mono transition flex flex-col items-center leading-tight active:scale-[0.98]"
                            >
                              <span className="text-[8px] text-stone-400 uppercase font-semibold">Bottle/ბოთლი</span>
                              <span className="font-bold text-gold-600 mt-0.5">{item.bottlePrice}₾</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT CHECKOUT PANEL (Active Basket sidebar) */}
          <div className="w-[360px] shrink-0 bg-[#f7f6f2] border-l border-stone-200/80 flex flex-col justify-between overflow-hidden">
            
            {/* Basket Header */}
            <div className="p-4 border-b border-stone-200 bg-stone-100 flex items-center justify-between py-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  {activeTable.tableId === 'Takeaway' ? 'გასატანი ჩეკი' : `${activeTable.tableNameKa} ჩეკი`}
                </span>
                {activeCart.length > 0 && (
                  <span className="rounded-full bg-gold-500/10 border border-gold-500/20 px-2 py-0.5 text-[9px] font-bold font-mono text-gold-700">
                    {activeCart.reduce((sum, item) => sum + item.quantity, 0)} items
                  </span>
                )}
              </div>

              {activeCart.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-xs text-red-655 hover:text-red-750 transition-all font-bold flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clean
                </button>
              )}
            </div>

            {/* Cart Items List Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeCart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center">
                  <span className="text-3xl opacity-60">🐈‍⬛</span>
                  <p className="text-xs font-bold text-stone-500 mt-3 uppercase tracking-wider">კალათა ცარიელია</p>
                  <p className="text-[11px] text-stone-400 mt-1 max-w-[200px]">
                    Select table and click catalogue items above to add.
                  </p>
                </div>
              ) : (
                activeCart.map((item) => {
                  const itemOptionLabel = item.selectedOption === 'glass' ? ' (ჭიქა / Glass)' : item.selectedOption === 'bottle' ? ' (ბოთლი / Bottle)' : '';
                  const itemTotal = item.quantity * item.unitPrice;
                  
                  return (
                    <div 
                      key={item.id}
                      className="rounded-xl border border-stone-250 bg-white p-3 flex flex-col gap-2 shadow-xs transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-stone-850 truncate uppercase mt-0.5 tracking-tight">{item.menuItem.nameEn}</p>
                          <p className="text-[10px] text-stone-500 truncate mt-0.5 leading-none">{item.menuItem.nameKa}</p>
                          {item.menuItem.isWine && (
                            <span className="text-[9px] font-semibold text-gold-700 mt-1 block">
                              {itemOptionLabel}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-stone-400 hover:text-red-600 p-1 rounded-md hover:bg-red-500/5 transition shrink-0"
                        >
                          <Trash className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                        {/* Qty selectors */}
                        <div className="flex items-center gap-1.5 rounded-lg bg-stone-50 border border-stone-200 p-0.5">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="h-6 w-6 rounded-md hover:bg-stone-200/50 flex items-center justify-center text-stone-500 hover:text-stone-900 transition"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-mono text-xs text-stone-85 w-5 text-center font-bold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="h-6 w-6 rounded-md hover:bg-stone-200/50 flex items-center justify-center text-stone-500 hover:text-stone-900 transition"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Sum of price */}
                        <span className="text-xs font-mono font-bold text-stone-800">
                          {itemTotal.toFixed(0)} <span className="text-[10px] text-gold-600 font-bold">₾</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Calculations & Service Charges Control Panel */}
            <div className="p-4 border-t border-stone-200 bg-stone-100 shrink-0 space-y-4">
              
              {activeCart.length > 0 && (
                <div className="space-y-3">
                  {/* Service Charge Quick Selectors */}
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-stone-500 uppercase mb-1.5">
                      <span>მომსახურება / Service Rate:</span>
                      <span className="font-mono text-stone-700 font-bold">{activeTable.serviceChargePercent}%</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[0, 10, 15, 18].map(sc => (
                        <button
                          key={sc}
                          onClick={() => setServiceChargeForActiveTable(sc)}
                          className={`py-1 rounded text-[10px] font-semibold transition ${
                            activeTable.serviceChargePercent === sc 
                              ? 'bg-gold-500 text-white border border-gold-500 font-bold shadow-xs' 
                              : 'bg-white text-stone-650 border border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          {sc}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Discount Selectors */}
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-stone-500 uppercase mb-1.5">
                      <span>დაკლება / Discount:</span>
                      <span className="font-mono text-stone-700 font-bold">{activeTable.discountPercent}%</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {[0, 5, 10, 15, 20].map(disc => (
                        <button
                          key={disc}
                          onClick={() => setDiscountForActiveTable(disc)}
                          className={`py-1 rounded text-[10px] font-semibold transition ${
                            activeTable.discountPercent === disc 
                              ? 'bg-gold-500 text-white border border-gold-500 font-bold shadow-xs' 
                              : 'bg-white text-stone-650 border border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          {disc}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Total Summary */}
              <div className="space-y-1.5 text-xs text-stone-600 font-mono border-t border-stone-200 pt-3">
                <div className="flex justify-between">
                  <span>ჯამი (Subtotal):</span>
                  <span>{currentCartTotals.subtotal.toFixed(0)} ₾</span>
                </div>

                {currentCartTotals.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>ფასდაკლება (-{activeTable.discountPercent}%):</span>
                    <span>-{currentCartTotals.discountAmount.toFixed(0)} ₾</span>
                  </div>
                )}

                {currentCartTotals.serviceChargeAmount > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>მომსახურება (+{activeTable.serviceChargePercent}%):</span>
                    <span>+{currentCartTotals.serviceChargeAmount.toFixed(0)} ₾</span>
                  </div>
                )}

                {/* GRAND TOTAL */}
                <div className="rounded-xl bg-white p-3 border border-stone-200 shadow-xs mt-2 flex justify-between items-center">
                  <span className="text-xs font-semibold text-stone-400 uppercase">სულ გადასახადელი:</span>
                  <span className="text-xl font-bold text-gold-650 font-mono tracking-tight">
                    {currentCartTotals.total.toFixed(0)} ₾
                  </span>
                </div>
              </div>

              {/* Checkout CTA triggers */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => handleCheckout('cash')}
                  disabled={activeCart.length === 0}
                  className="py-3 px-3 rounded-xl font-bold text-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <Coins className="h-4 w-4" />
                  CASH / ნაღდი
                </button>
                <button
                  onClick={() => handleCheckout('card')}
                  disabled={activeCart.length === 0}
                  className="py-3 px-3 rounded-xl font-bold text-center bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <CreditCard className="h-4 w-4" />
                  CARD / ბარათი
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* 3. OPTIONAL QUICK PANEL: Add Off-menu charge dialog modal */}
      <AnimatePresence>
        {showCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl text-left text-stone-800"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-stone-900 text-sm uppercase tracking-wider">
                  off-menu კერძის დამატება
                </h3>
                <button 
                  onClick={() => setShowCustomModal(false)}
                  className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddCustomCharge} className="space-y-4 text-xs">
                <div>
                  <label className="text-stone-400 font-bold mb-1 block">სახელი (GEORGIAN)</label>
                  <input
                    type="text"
                    required
                    placeholder="მაგალითად: ხაზგარეშე ლიმონათი"
                    value={customNameKa}
                    onChange={(e) => setCustomNameKa(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-850 focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="text-stone-400 font-bold mb-1 block">Name (ENGLISH)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Off-menu Lemonade"
                    value={customNameEn}
                    onChange={(e) => setCustomNameEn(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-850 focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="text-stone-400 font-bold mb-1 block">ფასი / Price (₾)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="15"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-850 font-mono focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-605 text-center font-bold text-xs"
                  >
                    გაუქმება
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-650 text-white text-center font-bold text-xs shadow-xs"
                  >
                    დამატება (Inject)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. ACTIVE PRINT RECEIPT MODAL OVERLAY */}
      {printingOrder && (
        <ReceiptModal
          order={printingOrder}
          printerState={printerState}
          usbError={usbError}
          onPrintToUsb={transmitPrintToUsb}
          onClose={() => setPrintingOrder(null)}
          onConnectPrinter={connectUsbPrinter}
        />
      )}

      {/* 5. ADMIN OVERVIEW PANEL MODAL */}
      <AnimatePresence>
        {showAdminPanel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl bg-white sm:rounded-3xl rounded-none border border-stone-200 shadow-2xl p-4 sm:p-6 overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[85vh] text-left"
            >
              <div className="flex justify-between items-center pb-4 border-b border-stone-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Sliders className="h-4 w-4 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-stone-900 text-base">ადმინისტრატორის მართვის პანელი (Admin Panel)</h3>
                    <p className="text-[10px] text-stone-400 font-medium">Real-time revenue, active tables review, and billing logs</p>
                  </div>
                </div>
                <button 
                  onClick={() => { playBeep(800, 'sine', 0.05); setShowAdminPanel(false); }}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-850 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Real-time statistics summaries */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 py-4 sm:py-5 shrink-0 text-stone-850">
                <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4">
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Total shift Sales / გაყიდვები</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold font-mono text-stone-900">
                      {ordersHistory.reduce((sum, ord) => sum + ord.total, 0).toFixed(0)}
                    </span>
                    <span className="text-xs font-bold text-gold-650">₾</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-400 mt-2">
                    <span>Cash: {ordersHistory.filter(o => o.paymentMethod === 'cash').reduce((sum, ord) => sum + ord.total, 0).toFixed(0)}₾</span>
                    <span>Card: {ordersHistory.filter(o => o.paymentMethod === 'card').reduce((sum, ord) => sum + ord.total, 0).toFixed(0)}₾</span>
                  </div>
                </div>

                <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4">
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Unpaid ongoing tickets / აქტიური შეკვეთები</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold font-mono text-amber-750">
                      {tablesState.reduce((sum, t) => sum + t.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0), 0).toFixed(0)}
                    </span>
                    <span className="text-xs font-bold text-amber-650">₾</span>
                  </div>
                  <div className="text-[10px] text-stone-400 mt-2">
                    Across {tablesState.filter(t => t.items.length > 0).length} active table tickets
                  </div>
                </div>

                <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4">
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Live Table Availability / მაგიდები</span>
                  <div className="flex justify-between items-center mt-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-505 animate-pulse" />
                      <span className="text-xs font-medium text-stone-650">
                        {tablesState.filter(t => t.items.length === 0).length} open
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-medium text-stone-650">
                        {tablesState.filter(t => t.items.length > 0).length} busy
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-stone-400 mt-2">
                    Total: {tablesState.length} active service spots
                  </div>
                </div>
              </div>

              {/* Main review workspace layout */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 pb-2 min-h-[250px] text-stone-850">
                
                {/* 1. All spots status tracker (with empty/busy statuses) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1 flex items-center justify-between">
                    <span>SEATING CHASSIS & TICKETS / მაგიდების სია</span>
                    <span className="font-mono text-[10px] text-gold-650 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">REAL-TIME</span>
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {tablesState.map(tbl => {
                      const busyCount = tbl.items.reduce((sum, item) => sum + item.quantity, 0);
                      const subtotal = tbl.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                      const isBusy = busyCount > 0;

                      return (
                        <div 
                          key={tbl.tableId}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                            isBusy 
                              ? 'bg-amber-50/60 border-amber-250' 
                              : 'bg-stone-50/30 border-stone-100 hover:border-stone-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-800">{tbl.tableNameEn} ({tbl.tableNameKa})</span>
                              {isBusy ? (
                                <span className="px-1.5 py-0.2 text-[8px] font-bold bg-amber-500 text-white rounded">BUSY</span>
                              ) : (
                                <span className="px-1.5 py-0.2 text-[8px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">OPEN</span>
                              )}
                            </div>
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              {isBusy ? `${busyCount} active items currently ordered` : 'No active items listed. Table is vacant.'}
                            </p>
                          </div>
                          
                          {isBusy && (
                            <div className="text-right">
                              <span className="font-mono font-bold text-amber-800">{subtotal.toFixed(0)} ₾</span>
                              <p className="text-[9px] text-amber-600 font-semibold mt-0.5">+{tbl.serviceChargePercent}% Serv.</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Compact Bills & receipts list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1 flex items-center justify-between">
                    <span>RECENT SHIFT TRANSACTIONS / ბოლო ჩეკები</span>
                    <span className="text-[10px] font-medium text-stone-400">{ordersHistory.length} checked-out</span>
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {ordersHistory.length === 0 ? (
                      <div className="p-8 border border-dashed border-stone-200 rounded-xl text-center text-stone-400 text-xs">
                        No invoices printed yet during this shift.
                      </div>
                    ) : (
                      ordersHistory.slice().reverse().map(ord => (
                        <div key={ord.id} className="p-3 bg-stone-50 rounded-xl border border-stone-250/60 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-semibold text-stone-700">#{ord.invoiceNum}</span>
                              <span className="text-[9px] font-mono text-stone-400">{ord.formattedTime}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-semibold text-stone-550 uppercase bg-stone-300/40 px-1.5 py-0.5 rounded">
                                {ord.tableNameEn}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 rounded uppercase ${
                                ord.paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
                              }`}>
                                {ord.paymentMethod === 'cash' ? 'CASH' : 'CARD'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-stone-900">{ord.totals.total.toFixed(0)} ₾</span>
                            <span className="text-[9px] text-stone-400 block">by {ord.cashierName}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Bottom bar */}
              <div className="pt-4 border-t border-stone-100 shrink-0 flex items-center justify-between text-[11px] text-stone-400">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Real-time POS Admin chassis sync enabled</span>
                </div>
                <button
                  onClick={() => { playBeep(800, 'sine', 0.05); setShowAdminPanel(false); }}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-850 text-white font-bold text-xs rounded-xl transition"
                >
                  პანელის დახურვა / Close Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
