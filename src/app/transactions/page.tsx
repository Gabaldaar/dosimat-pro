
"use client"

import { useState, useMemo, useEffect, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Calendar as CalendarIcon, 
  Trash2, 
  ShoppingBag, 
  Droplet, 
  Wrench, 
  Settings2, 
  Receipt, 
  MoreVertical, 
  Edit, 
  RefreshCw, 
  Loader2, 
  ArrowDownLeft, 
  Info, 
  Calculator, 
  TrendingUp,
  FilterX,
  PlusCircle,
  Copy,
  Send,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Check,
  MessageSquare,
  ChevronRight,
  Wallet,
  Printer,
  ArrowRightLeft
} from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "../../firebase"
import { collection, doc, increment, query, orderBy } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

const txTypeMap: Record<string, { label: string, icon: any, color: string, description: string }> = {
  sale: { label: "Venta", icon: ShoppingBag, color: "text-blue-600 bg-blue-50", description: "Venta general de productos o accesorios." },
  refill: { label: "Reposición", icon: Droplet, color: "text-cyan-600 bg-cyan-50", description: "Servicio de reposición de químicos." },
  service: { label: "Técnico", icon: Wrench, color: "text-indigo-600 bg-indigo-50", description: "Reparaciones o visitas de mantenimiento." },
  cobro: { label: "Cobro", icon: Receipt, color: "text-emerald-600 bg-emerald-50", description: "Pago recibido del cliente." },
  adjustment: { label: "Ajuste", icon: Settings2, color: "text-slate-600 bg-slate-50", description: "Corrección manual de saldo." },
  Adjustment: { label: "Ajuste", icon: RefreshCw, color: "text-slate-600 bg-slate-50", description: "Ajuste manual." },
  Expense: { label: "Gasto", icon: ArrowDownLeft, color: "text-rose-600 bg-rose-50", description: "Gasto manual registrado." },
  Reposición: { label: "Reposición", icon: Droplet, color: "text-cyan-600 bg-cyan-50", description: "Servicio de reposición de químicos." },
}

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLocalDate(dateString: string) {
  if (!dateString) return "---";
  const date = dateString.includes('T') ? new Date(dateString) : new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('es-AR');
}

function TransactionsContent() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const { userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'
  const searchParams = useSearchParams()
  
  const [mainView, setMainView] = useState("history")
  const [activeTab, setActiveTab] = useState("refill")
  const [editingTx, setEditingTx] = useState<any | null>(null)
  const [txToDelete, setTxToDelete] = useState<any | null>(null)
  const [selectedTxDetails, setSelectedTxDetails] = useState<any | null>(null)

  const [isWsDialogOpen, setIsWsDialogOpen] = useState(false)
  const [isMailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [selectedTxForComm, setSelectedTxForComm] = useState<any | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({})

  const [filterCustomer, setFilterCustomer] = useState("all")
  const [filterAccount, setFilterAccount] = useState("all")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterOpType, setFilterOpType] = useState("all") 
  const [filterFlow, setFilterFlow] = useState("all")
  const [itemFilterCategory, setItemFilterCategory] = useState("all")

  const [exchangeRate, setExchangeRate] = useState(1)
  const [convertedAmountOverride, setConvertedAmountOverride] = useState<number | null>(null)

  // Desbloqueador global de puntero (Evita congelamientos de Radix UI)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        const anyModalOpen = !!selectedTxDetails || !!txToDelete || isWsDialogOpen || isMailDialogOpen;
        if (!anyModalOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [selectedTxDetails, txToDelete, isWsDialogOpen, isMailDialogOpen]);

  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc')), [db])
  const wsTemplatesQuery = useMemoFirebase(() => collection(db, 'whatsapp_templates'), [db])
  const emailTemplatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db])
  const productCatsQuery = useMemoFirebase(() => collection(db, 'product_categories'), [db])

  const { data: customers } = useCollection(clientsQuery)
  const { data: catalog } = useCollection(catalogQuery)
  const { data: accounts } = useCollection(accountsQuery)
  const { data: transactions } = useCollection(txQuery)
  const { data: wsTemplates } = useCollection(wsTemplatesQuery)
  const { data: emailTemplates } = useCollection(emailTemplatesQuery)
  const { data: productCategories } = useCollection(productCatsQuery)

  const [hasAutoPopulated, setHasAutoPopulated] = useState(false)

  // Sincronizar parámetros de URL
  useEffect(() => {
    const mode = searchParams.get('mode')
    const clientId = searchParams.get('clientId')
    const type = searchParams.get('type')
    const accountId = searchParams.get('accountId')
    const amount = searchParams.get('amount')
    const currency = searchParams.get('currency')
    const desc = searchParams.get('description')

    if (mode === 'new') setMainView("register")
    if (clientId && clientId !== 'none') { 
      setSelectedCustomerId(clientId); 
      setFilterCustomer(clientId); 
    }
    if (type) setActiveTab(type === 'refill' ? 'refill' : type)
    if (accountId) setFilterAccount(accountId)
    
    if (amount) setManualAmount(Number(amount))
    if (currency) setManualCurrency(currency)
    if (desc) setTxDescription(decodeURIComponent(desc))
  }, [searchParams])

  // Lógica de auto-población desde Hojas de Ruta
  useEffect(() => {
    if (!catalog || hasAutoPopulated || searchParams.get('fromRoute') !== 'true') return;

    const cloroQty = Number(searchParams.get('cloro') || 0);
    const acidoQty = Number(searchParams.get('acido') || 0);
    const cash = Number(searchParams.get('cash') || 0);
    const notes = searchParams.get('notes') || '';

    const newItems: any[] = [];

    if (cloroQty > 0) {
      const prod = catalog.find((i: any) => 
        i.name.toLowerCase().includes('cloro') && !i.isService
      );
      if (prod) {
        const curr = (prod.priceARS || 0) > 0 ? 'ARS' : 'USD';
        newItems.push({
          itemId: prod.id,
          name: prod.name,
          qty: cloroQty,
          price: curr === 'ARS' ? prod.priceARS : prod.priceUSD,
          currency: curr,
          discount: 0
        });
      }
    }

    if (acidoQty > 0) {
      const prod = catalog.find((i: any) => 
        (i.name.toLowerCase().includes('acido') || i.name.toLowerCase().includes('ácido')) && !i.isService
      );
      if (prod) {
        const curr = (prod.priceARS || 0) > 0 ? 'ARS' : 'USD';
        newItems.push({
          itemId: prod.id,
          name: prod.name,
          qty: acidoQty,
          price: curr === 'ARS' ? prod.priceARS : prod.priceUSD,
          currency: curr,
          discount: 0
        });
      }
    }

    if (newItems.length > 0) {
      setSelectedItems(newItems);
    }
    
    if (cash > 0) {
      setPaidAmounts(prev => ({ ...prev, ARS: cash }));
    }
    
    if (notes) {
      setTxDescription(notes);
    }

    setHasAutoPopulated(true);
  }, [catalog, searchParams, hasAutoPopulated]);

  const sortedCustomers = useMemo(() => {
    if (!customers) return [];
    return [...customers].sort((a, b) => {
      const apA = (a.apellido || "").toLowerCase();
      const apB = (b.apellido || "").toLowerCase();
      if (apA !== apB) return apA.localeCompare(apB);
      return (a.nombre || "").toLowerCase().localeCompare((b.nombre || "").toLowerCase());
    });
  }, [customers]);

  const sortedCatalog = useMemo(() => {
    if (!catalog) return []
    return [...catalog].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [catalog])

  const sortedProductCategories = useMemo(() => {
    if (!productCategories) return []
    return [...productCategories].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [productCategories]);

  const filteredCatalogItems = useMemo(() => {
    if (!sortedCatalog) return []
    if (itemFilterCategory === "all") return sortedCatalog
    return sortedCatalog.filter((item: any) => item.categoryId === itemFilterCategory)
  }, [sortedCatalog, itemFilterCategory])

  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [destinationAccounts, setDestinationAccounts] = useState<Record<string, string>>({ ARS: "pending", USD: "pending" })
  const [paidAmounts, setPaidAmounts] = useState<Record<string, number>>({ ARS: 0, USD: 0 })
  const [operationDate, setOperationDate] = useState(getLocalDateString())
  const [manualAmount, setManualAmount] = useState(0)
  const [manualCurrency, setManualCurrency] = useState("ARS")
  const [manualAccountId, setManualAccountId] = useState("pending")
  const [adjustmentSign, setAdjustmentSign] = useState<"1" | "-1">("1")
  const [txDescription, setTxDescription] = useState("")
  const [imputations, setImputations] = useState<Record<string, number>>({})

  const selectedAccountForManual = useMemo(() => accounts?.find(a => a.id === manualAccountId), [accounts, manualAccountId]);
  const isCrossCurrency = useMemo(() => selectedAccountForManual && selectedAccountForManual.currency !== manualCurrency, [selectedAccountForManual, manualCurrency]);

  useEffect(() => {
    if (isCrossCurrency) {
      fetch('https://dolarapi.com/v1/dolares/oficial')
        .then(res => res.json())
        .then(data => {
          if (data && data.venta) setExchangeRate(data.venta);
        })
        .catch(err => console.error("Error fetching rate:", err));
    }
  }, [isCrossCurrency]);

  useEffect(() => {
    setConvertedAmountOverride(null);
  }, [manualAmount, manualCurrency, manualAccountId, exchangeRate]);

  const finalConvertedAmount = useMemo(() => {
    if (!isCrossCurrency || !selectedAccountForManual) return manualAmount;
    const baseAmount = manualAmount * (activeTab === 'adjustment' ? Number(adjustmentSign) : activeTab === 'Expense' ? -1 : 1);
    if (manualCurrency === 'USD' && selectedAccountForManual.currency === 'ARS') return baseAmount * exchangeRate;
    if (manualCurrency === 'ARS' && selectedAccountForManual.currency === 'USD') return baseAmount / exchangeRate;
    return baseAmount;
  }, [isCrossCurrency, selectedAccountForManual, manualAmount, manualCurrency, exchangeRate, activeTab, adjustmentSign]);

  const customerPendingTxs = useMemo(() => {
    if (!selectedCustomerId || !transactions || selectedCustomerId === "none") return []
    return transactions.filter(tx => tx.clientId === selectedCustomerId && tx.pendingAmount !== 0 && tx.type !== 'cobro')
  }, [selectedCustomerId, transactions])

  const cartTotals = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      const subtotal = (Number(item.price) || 0) * (Number(item.qty) || 0)
      const discountAmount = subtotal * ((Number(item.discount) || 0) / 100)
      const amount = subtotal - discountAmount
      acc[item.currency as 'ARS' | 'USD'] = (acc[item.currency as 'ARS' | 'USD'] || 0) + amount
      return acc
    }, { ARS: 0, USD: 0 })
  }, [selectedItems])

  const handleAddItem = (itemId: string) => {
    const item = catalog?.find((i: any) => i.id === itemId)
    if (!item) return
    const defaultCurrency = (item.priceARS || 0) > 0 ? 'ARS' : 'USD'
    const defaultPrice = (item.priceARS || 0) > 0 ? item.priceARS : item.priceUSD
    setSelectedItems(prev => [...prev, { itemId: item.id, name: item.name, qty: 1, price: defaultPrice, currency: defaultCurrency, discount: 0 }])
  }

  const handleStartEdit = (tx: any) => {
    setSelectedTxDetails(null); 
    setEditingTx(tx);
    setSelectedCustomerId(tx.clientId || "none");
    setOperationDate(tx.date.split('T')[0]);
    setActiveTab(tx.type === 'Reposición' ? 'refill' : tx.type);
    setTxDescription(tx.description || "");
    
    if (['cobro', 'adjustment', 'Expense'].includes(tx.type)) {
      if (tx.originalAmount && tx.originalCurrency) {
        setManualAmount(Math.abs(tx.originalAmount));
        setManualCurrency(tx.originalCurrency);
        setConvertedAmountOverride(Math.abs(tx.amount));
      } else {
        setManualAmount(Math.abs(tx.amount));
        setManualCurrency(tx.currency);
      }
      setManualAccountId(tx.financialAccountId || "pending");
      setAdjustmentSign(tx.amount >= 0 ? "1" : "-1");
      setImputations(tx.imputations || {});
    } else {
      setSelectedItems(tx.items || []);
      const newPaid: Record<string, number> = { ARS: 0, USD: 0 };
      const newAccs: Record<string, string> = { ARS: "pending", USD: "pending" };
      newPaid[tx.currency] = Number(tx.paidAmount || 0);
      newAccs[tx.currency] = tx.financialAccountId || "pending";
      setPaidAmounts(newPaid);
      setDestinationAccounts(newAccs);
    }
    setMainView("register");
  };

  const handleSaveTransaction = () => {
    if (editingTx) {
      const tx = editingTx;
      if (tx.clientId) {
        const field = (tx.originalCurrency || tx.currency) === 'USD' ? 'saldoUSD' : 'saldoActual';
        const amountToRevert = ['cobro', 'adjustment', 'Expense'].includes(tx.type) 
          ? -Number(tx.originalAmount || tx.amount || 0) 
          : Number(tx.debtAmount || 0);
        
        updateDocumentNonBlocking(doc(db, 'clients', tx.clientId), { [field]: increment(amountToRevert) });
      }
      if (tx.financialAccountId) {
        const amountToRevert = -Number(tx.accountMovementAmount || tx.amount || 0);
        updateDocumentNonBlocking(doc(db, 'financial_accounts', tx.financialAccountId), { initialBalance: increment(amountToRevert) });
      }
      if (tx.type === 'cobro' && tx.imputations) {
        Object.entries(tx.imputations).forEach(([targetId, amount]) => {
          updateDocumentNonBlocking(doc(db, 'transactions', targetId), { pendingAmount: increment(-Number(amount)) });
        });
      }
    }

    const client = selectedCustomerId && selectedCustomerId !== "none" ? customers?.find(c => c.id === selectedCustomerId) : null;
    const finalDateStr = new Date(operationDate + 'T12:00:00').toISOString();

    if (['cobro', 'adjustment', 'Expense'].includes(activeTab)) {
      const txId = editingTx?.id || Math.random().toString(36).substring(2, 11)
      const baseManualAmount = Number(manualAmount) * (activeTab === 'adjustment' ? Number(adjustmentSign) : activeTab === 'Expense' ? -1 : 1);
      const sign = (activeTab === 'adjustment' ? Number(adjustmentSign) : activeTab === 'Expense' ? -1 : 1);
      
      const acc = selectedAccountForManual;
      let finalAmountValue = baseManualAmount;
      let finalCurrency = manualCurrency;
      let accountMovementAmount = baseManualAmount;

      if (isCrossCurrency && acc) {
        const overrideVal = convertedAmountOverride !== null ? convertedAmountOverride * sign : finalConvertedAmount;
        finalAmountValue = overrideVal;
        finalCurrency = acc.currency;
        accountMovementAmount = overrideVal;
      }

      const accountBalanceAfter = (Number(acc?.initialBalance || 0)) + accountMovementAmount;

      let desc = txDescription || `${txTypeMap[activeTab].label} manual`;
      if (isCrossCurrency && acc) {
        desc += ` (Ref: ${manualCurrency} ${manualAmount} @ ${exchangeRate})`;
      }

      const txData = { 
        id: txId, 
        date: finalDateStr, 
        clientId: selectedCustomerId === "none" ? null : selectedCustomerId, 
        type: activeTab, 
        amount: finalAmountValue, 
        currency: finalCurrency, 
        originalAmount: isCrossCurrency ? baseManualAmount : null,
        originalCurrency: isCrossCurrency ? manualCurrency : null,
        description: desc, 
        financialAccountId: manualAccountId === "pending" ? null : manualAccountId, 
        paidAmount: activeTab === 'cobro' ? Math.abs(finalAmountValue) : 0, 
        pendingAmount: (activeTab === 'adjustment' && baseManualAmount < 0) ? baseManualAmount : 0,
        imputations: activeTab === 'cobro' ? imputations : null,
        accountBalanceAfter,
        accountMovementAmount: accountMovementAmount,
        accountMovementCurrency: acc?.currency || manualCurrency
      }

      setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })
      if (manualAccountId !== "pending") updateDocumentNonBlocking(doc(db, 'financial_accounts', manualAccountId), { initialBalance: increment(accountMovementAmount) });
      if (client) { const field = manualCurrency === 'ARS' ? 'saldoActual' : 'saldoUSD'; updateDocumentNonBlocking(doc(db, 'clients', client.id), { [field]: increment(baseManualAmount) }); }
      if (activeTab === 'cobro') { 
        Object.entries(imputations).forEach(([targetTxId, amount]) => { 
          updateDocumentNonBlocking(doc(db, 'transactions', targetTxId), { pendingAmount: increment(Number(amount)) }); 
        }); 
      }
    } else {
      ['ARS', 'USD'].forEach(curr => {
        const total = cartTotals[curr as 'ARS' | 'USD']; if (total <= 0) return;
        const paid = Number(paidAmounts[curr] || 0); 
        const debt = total - paid;
        const txId = editingTx?.id || Math.random().toString(36).substring(2, 11);
        
        const acc = destinationAccounts[curr] !== "pending" ? accounts?.find(a => a.id === destinationAccounts[curr]) : null;
        const accountBalanceAfter = (Number(acc?.initialBalance || 0)) + paid;
        
        let finalPending = -debt;
        if (editingTx && editingTx.id === txId) {
          const oldDebt = Math.abs(editingTx.amount) - (editingTx.paidAmount || 0);
          const deltaDebt = debt - oldDebt;
          finalPending = (editingTx.pendingAmount || 0) - deltaDebt;
        }

        const txData = { 
          id: txId, 
          date: finalDateStr, 
          clientId: selectedCustomerId === "none" ? null : selectedCustomerId, 
          type: activeTab === 'refill' ? 'Reposición' : activeTab, 
          amount: -Number(total), 
          paidAmount: paid, 
          debtAmount: debt, 
          currency: curr, 
          description: txDescription || `Operación ${txTypeMap[activeTab].label}`, 
          financialAccountId: (destinationAccounts[curr]==="pending" || paid === 0) ? null : destinationAccounts[curr], 
          items: selectedItems.filter(i => i.currency === curr), 
          pendingAmount: finalPending,
          accountBalanceAfter
        }
        setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })
        if (destinationAccounts[curr] !== "pending" && paid !== 0) updateDocumentNonBlocking(doc(db, 'financial_accounts', destinationAccounts[curr]), { initialBalance: increment(paid) });
        if (client && debt !== 0) { const field = curr === 'ARS' ? 'saldoActual' : 'saldoUSD'; updateDocumentNonBlocking(doc(db, 'clients', client.id), { [field]: increment(-debt) }); }
      })
    }
    toast({ title: editingTx ? "Operación actualizada" : "Operación registrada" }); 
    resetRegisterForm(); 
    setMainView("history");
  }

  const resetRegisterForm = () => {
    setEditingTx(null); 
    setSelectedCustomerId(""); 
    setSelectedItems([]); 
    setTxDescription(""); 
    setManualAmount(0); 
    setPaidAmounts({ ARS: 0, USD: 0 }); 
    setDestinationAccounts({ ARS: "pending", USD: "pending" }); 
    setImputations({});
    setOperationDate(getLocalDateString());
    setHasAutoPopulated(false);
    setConvertedAmountOverride(null);
  }

  const handleDeleteTx = () => {
    if (!txToDelete) return;
    const tx = txToDelete;

    if (tx.clientId) {
      const field = (tx.originalCurrency || tx.currency) === 'USD' ? 'saldoUSD' : 'saldoActual';
      const amountToRevert = ['cobro', 'adjustment', 'Expense'].includes(tx.type) 
        ? -Number(tx.originalAmount || tx.amount || 0) 
        : Number(tx.debtAmount || 0);
      
      updateDocumentNonBlocking(doc(db, 'clients', tx.clientId), { [field]: increment(amountToRevert) });
    }

    if (tx.financialAccountId) {
      const amountToRevert = -Number(tx.accountMovementAmount || tx.amount || 0);
      updateDocumentNonBlocking(doc(db, 'financial_accounts', tx.financialAccountId), { initialBalance: increment(amountToRevert) });
    }

    if (tx.type === 'cobro' && tx.imputations) {
      Object.entries(tx.imputations).forEach(([targetId, amount]) => {
        updateDocumentNonBlocking(doc(db, 'transactions', targetId), { pendingAmount: increment(-Number(amount)) });
      });
    }

    deleteDocumentNonBlocking(doc(db, 'transactions', tx.id));
    setTxToDelete(null);
    toast({ title: "Operación eliminada" });
  };

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    return transactions.filter((tx: any) => {
      const matchCustomer = filterCustomer === "all" || tx.clientId === filterCustomer
      const matchAccount = filterAccount === "all" || (filterAccount === "null" ? !tx.financialAccountId : tx.financialAccountId === filterAccount)
      const txDateStr = tx.date.split('T')[0];
      const matchStart = !filterStartDate || txDateStr >= filterStartDate;
      const matchEnd = !filterEndDate || txDateStr <= filterEndDate;
      
      const matchType = filterOpType === "all" || 
                        (filterOpType === 'Reposición' ? (tx.type === 'Reposición' || tx.type === 'refill') : tx.type === filterOpType);
      
      let matchFlow = true;
      if (filterFlow === 'income') matchFlow = tx.amount > 0 || tx.type === 'cobro';
      if (filterFlow === 'expense') matchFlow = tx.amount < 0 && tx.type !== 'cobro';

      return matchCustomer && matchAccount && matchStart && matchEnd && matchType && matchFlow;
    })
  }, [transactions, filterCustomer, filterAccount, filterStartDate, filterEndDate, filterOpType, filterFlow])

  const filteredTotals = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      if (tx.currency === 'ARS') acc.ars += Number(tx.amount || 0);
      if (tx.currency === 'USD') acc.usd += Number(tx.amount || 0);
      return acc;
    }, { ars: 0, usd: 0 })
  }, [filteredTransactions]);

  const handleCopyTxDetail = (tx: any) => {
    const client = customers?.find(c => c.id === tx.clientId);
    const dateStr = formatLocalDate(tx.date);
    const symbol = tx.currency === 'USD' ? 'u$s' : '$';
    const typeLabel = txTypeMap[tx.type]?.label || tx.type;

    let text = `*DOSIMAT PRO - DETALLE DE OPERACIÓN*\n\n`;
    text += `*Fecha:* ${dateStr}\n`;
    text += `*Cliente:* ${client ? `${client.apellido}, ${client.nombre}` : 'Global'}\n`;
    text += `*Tipo:* ${typeLabel}\n`;
    if (tx.description) text += `*Nota:* ${tx.description}\n\n`;

    if (tx.items && tx.items.length > 0) {
      text += `*Detalle:*\n`;
      tx.items.forEach((i: any) => {
        const iSymbol = i.currency === 'USD' ? 'u$s' : '$';
        const sub = i.price * i.qty * (1 - (i.discount || 0)/100);
        text += `- ${i.qty} x ${i.name} (${iSymbol} ${i.price.toLocaleString('es-AR')}) = ${iSymbol} ${sub.toLocaleString('es-AR')}\n`;
      });
      text += `\n`;
    }

    text += `*Total:* ${symbol} ${Math.abs(tx.amount).toLocaleString('es-AR')}\n`;
    text += `*Abonado:* ${symbol} ${Number(tx.paidAmount || 0).toLocaleString('es-AR')}\n`;
    text += `*Pendiente:* ${symbol} ${Math.abs(tx.pendingAmount || 0).toLocaleString('es-AR')}`;

    navigator.clipboard.writeText(text);
    toast({ title: "Detalle copiado" });
  };

  const handleOpenCommDialog = (tx: any, type: 'ws' | 'mail') => {
    setSelectedTxForComm(tx);
    setSelectedTemplateId("");
    setDynamicValues({});
    setTimeout(() => {
      if (type === 'ws') setIsWsDialogOpen(true);
      else setIsEmailDialogOpen(true);
    }, 150);
  }

  const handleSendComm = (type: 'ws' | 'mail') => {
    if (!selectedTxForComm || !activeTemplate) return;
    const body = replaceMarkers(activeTemplate.body, selectedTxForComm, dynamicValues);
    const client = customers?.find(c => c.id === selectedTxForComm.clientId);

    if (type === 'ws') {
      const phone = client?.telefono?.replace(/\D/g, '') || "";
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, '_blank');
      setIsWsDialogOpen(false);
    } else {
      const subject = replaceMarkers(activeTemplate.subject || "", selectedTxForComm, dynamicValues);
      const mailtoUrl = `mailto:${client?.mail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body).replace(/%0A/g, '%0D%0A')}`;
      window.open(mailtoUrl, '_blank');
      setIsEmailDialogOpen(false);
    }
  }

  const activeTemplate = useMemo(() => {
    const all = [...(emailTemplates || []), ...(wsTemplates || [])];
    return all.find(t => t.id === selectedTemplateId);
  }, [selectedTemplateId, emailTemplates, wsTemplates]);

  const dynamicKeys = useMemo(() => {
    if (!activeTemplate) return [];
    const content = activeTemplate.body + (activeTemplate.subject || "");
    const matches = content.match(/\{\{\?([^}]+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.replace(/\{\{\?|\}\}/g, ''))));
  }, [activeTemplate]);

  const replaceMarkers = (text: string, tx: any, dynamicVals?: Record<string, string>) => {
    let result = text;
    const client = customers?.find(c => c.id === tx.clientId);
    const symbol = tx.currency === 'USD' ? 'u$s' : '$';
    
    if (client) {
      result = result.replace(/\{\{Nombre\}\}/g, client.nombre || "");
      result = result.replace(/\{\{Apellido\}\}/g, client.apellido || "");
      result = result.replace(/\{\{Direccion\}\}/g, client.direccion || "");
      result = result.replace(/\{\{Localidad\}\}/g, client.localidad || "");
      result = result.replace(/\{\{Saldo_ARS\}\}/g, `$ ${Number(client.saldoActual || 0).toLocaleString('es-AR')}`);
      result = result.replace(/\{\{Saldo_USD\}\}/g, `u$s ${Number(client.saldoUSD || 0).toLocaleString('es-AR')}`);
      result = result.replace(/\{\{Saldo_Cuenta\}\}/g, tx.currency === 'USD' ? `u$s ${Number(client.saldoUSD || 0).toLocaleString('es-AR')}` : `$ ${Number(client.saldoActual || 0).toLocaleString('es-AR')}`);
    }

    const account = accounts?.find(a => a.id === tx.financialAccountId);
    result = result.replace(/\{\{Caja_Destino\}\}/g, account?.name || "A cuenta");
    result = result.replace(/\{\{Metodo_Pago\}\}/g, account ? (account.type === 'Bank' ? 'Transferencia/Banco' : 'Efectivo') : "A cuenta");

    result = result.replace(/\{\{Fecha\}\}/g, formatLocalDate(tx.date));
    result = result.replace(/\{\{Tipo_Operacion\}\}/g, txTypeMap[tx.type]?.label || tx.type);
    result = result.replace(/\{\{Total\}\}/g, `${symbol} ${Math.abs(tx.amount || 0).toLocaleString('es-AR')}`);
    result = result.replace(/\{\{Pendiente_Operacion\}\}/g, `${symbol} ${Math.abs(tx.pendingAmount || 0).toLocaleString('es-AR')}`);
    result = result.replace(/\{\{Moneda\}\}/g, tx.currency);
    result = result.replace(/\{\{Monto_Abonado\}\}/g, `${symbol} ${Number(tx.paidAmount || 0).toLocaleString('es-AR')}`);
    result = result.replace(/\{\{Descripción\}\}/g, tx.description || "");
    result = result.replace(/\{\{Saldo_Caja_Final\}\}/g, `${symbol} ${Number(tx.accountBalanceAfter || 0).toLocaleString('es-AR')}`);

    if (tx.items && tx.items.length > 0) {
      const itemsText = tx.items.map((i: any) => {
        const iSymbol = i.currency === 'USD' ? 'u$s' : '$';
        const sub = i.price * i.qty * (1 - (i.discount || 0)/100);
        return `- ${i.qty} x ${i.name} (${iSymbol} ${i.price.toLocaleString('es-AR')}) = ${iSymbol} ${sub.toLocaleString('es-AR')}`;
      }).join('\n');
      
      const totalDisc = tx.items.reduce((sum: number, i: any) => sum + (i.price * i.qty * ((i.discount || 0)/100)), 0);
      
      result = result.replace(/\{\{Detalle_Items\}\}/g, itemsText);
      result = result.replace(/\{\{Total_Descuento\}\}/g, `${symbol} ${totalDisc.toLocaleString('es-AR')}`);
    } else {
      result = result.replace(/\{\{Detalle_Items\}\}/g, "");
      result = result.replace(/\{\{Total_Descuento\}\}/g, `${symbol} 0`);
    }

    if (dynamicVals) {
      Object.entries(dynamicVals).forEach(([key, val]) => {
        result = result.replace(new RegExp(`\\{\\{\\?${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g'), val);
      });
    }
    return result;
  };

  const handlePrintPDF = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const activeFilters = useMemo(() => {
    const list: { label: string, value: string }[] = [];
    if (filterCustomer !== 'all') {
      const c = customers?.find(cust => cust.id === filterCustomer);
      list.push({ label: 'Cliente', value: c ? `${c.apellido}, ${c.nombre}` : filterCustomer });
    }
    if (filterAccount !== 'all') {
      if (filterAccount === 'null') list.push({ label: 'Caja', value: 'A Cuenta / Sin Caja' });
      else {
        const a = accounts?.find(acc => acc.id === filterAccount);
        list.push({ label: 'Caja', value: a ? a.name : filterAccount });
      }
    }
    if (filterOpType !== 'all') list.push({ label: 'Operación', value: filterOpType });
    if (filterFlow !== 'all') list.push({ label: 'Flujo', value: filterFlow === 'income' ? 'Ingresos' : 'Egresos' });
    if (filterStartDate) list.push({ label: 'Desde', value: formatLocalDate(filterStartDate) });
    if (filterEndDate) list.push({ label: 'Hasta', value: formatLocalDate(filterEndDate) });
    return list;
  }, [filterCustomer, filterAccount, filterOpType, filterFlow, filterStartDate, filterEndDate, customers, accounts]);

  return (
    <div className="flex min-h-screen bg-background w-full">
      <div className="no-print w-full flex">
        <Sidebar />
        <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 pb-48 overflow-x-hidden">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="flex" />
              <h1 className="text-xl md:text-3xl font-bold text-primary font-headline uppercase tracking-tighter italic">Operaciones</h1>
            </div>
            <Tabs value={mainView} onValueChange={setMainView}>
              <TabsList className="bg-muted/40 h-10 p-1 rounded-xl shadow-inner border">
                <TabsTrigger value="register" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary uppercase">{editingTx ? 'EDITAR' : 'NUEVA'}</TabsTrigger>
                <TabsTrigger value="history" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary uppercase">HISTORIAL</TabsTrigger>
              </TabsList>
            </Tabs>
          </header>

          {mainView === "register" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
              <Card className="lg:col-span-2 glass-card border-t-4 border-t-primary">
                <CardHeader className="pb-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl flex items-center gap-2">{editingTx ? 'Editando' : 'Registrar'} {txTypeMap[activeTab]?.label}</CardTitle>
                      <p className="text-xs text-muted-foreground">{txTypeMap[activeTab]?.description}</p>
                    </div>
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                        <TabsList className="grid grid-cols-5 w-full h-auto p-1 bg-muted/50 border">
                            {['sale', 'refill', 'service', 'cobro', 'adjustment'].map(key => {
                              const info = txTypeMap[key];
                              const Icon = info.icon;
                              return (
                                <TabsTrigger key={key} value={key} className="data-[state=active]:bg-primary data-[state=active]:text-white py-2 flex flex-col gap-1">
                                  <Icon className="h-4 w-4" />
                                  <span className="text-[9px] font-black uppercase">{info.label}</span>
                                </TabsTrigger>
                              );
                            })}
                        </TabsList>
                      </Tabs>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/20 rounded-xl border border-dashed">
                    <div className="space-y-2"><Label className="flex items-center gap-2 text-primary font-bold uppercase text-[10px] tracking-widest"><User className="h-3 w-3" /> Cliente</Label>
                      <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Buscar cliente..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">GLOBAL / SIN CLIENTE</SelectItem>
                          {sortedCustomers.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre} (${Number(c.saldoActual || 0).toLocaleString()})</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label className="flex items-center gap-2 text-primary font-bold uppercase text-[10px] tracking-widest"><CalendarIcon className="h-3 w-3" /> Fecha</Label>
                      <Input type="date" value={operationDate} onChange={(e) => setOperationDate(e.target.value)} className="bg-white" />
                    </div>
                  </div>
                  {['cobro', 'adjustment', 'Expense'].includes(activeTab) ? (
                    <div className="space-y-6">
                      <div className="p-6 border rounded-xl space-y-4 bg-muted/5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase">{activeTab === 'cobro' ? 'Monto a Cobrar' : 'Monto'}</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black opacity-40">{manualCurrency === 'USD' ? 'u$s' : '$'}</span>
                              <Input type="number" value={manualAmount} onChange={(e) => setManualAmount(Number(e.target.value))} className="bg-white font-black text-xl h-12 pl-10" />
                            </div>
                          </div>
                          <div className="space-y-2"><Label className="text-xs font-bold uppercase">Moneda Operación</Label>
                            <Tabs value={manualCurrency} onValueChange={setManualCurrency} className="w-full">
                              <TabsList className="grid grid-cols-2 h-12 p-1 border">
                                <TabsTrigger value="ARS" className="text-[10px] font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase">ARS</TabsTrigger>
                                <TabsTrigger value="USD" className="text-[10px] font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white uppercase">USD</TabsTrigger>
                              </TabsList>
                            </Tabs>
                          </div>
                          <div className="space-y-2"><Label className="text-xs font-bold uppercase">Caja Destino</Label>
                            <Select value={manualAccountId} onValueChange={setManualAccountId}><SelectTrigger className="bg-white h-12"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">A CUENTA</SelectItem>
                                {accounts?.map(a => (<SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {activeTab === 'adjustment' && (
                          <div className="pt-4 border-t border-dashed">
                            <Label className="text-xs font-bold uppercase mb-2 block">Sentido del Ajuste</Label>
                            <Select value={adjustmentSign} onValueChange={(v: any) => setAdjustmentSign(v)}>
                              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="1">Ingreso (+) / Reduce Deuda</SelectItem><SelectItem value="-1">Egreso (-) / Aumenta Deuda</SelectItem></SelectContent>
                            </Select>
                          </div>
                        )}

                        {isCrossCurrency && selectedAccountForManual && (
                          <div className="pt-6 border-t-2 border-primary/20 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest bg-primary/5 p-2 rounded-lg">
                              <ArrowRightLeft className="h-4 w-4" /> Pago con Conversión Detectado
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold flex items-center gap-2">TIPO DE CAMBIO <Badge className="text-[8px] bg-emerald-600">SUGERIDO</Badge></Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black opacity-40">$</span>
                                  <Input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))} className="bg-white font-black text-lg h-12 pl-10 border-primary/30" />
                                </div>
                              </div>
                              <div className="p-4 bg-primary text-white rounded-2xl flex flex-col justify-center shadow-lg">
                                <p className="text-[10px] font-black uppercase opacity-70">SE DESCONTARÁ DE {selectedAccountForManual.name.toUpperCase()}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-2xl font-black">{selectedAccountForManual.currency === 'USD' ? 'u$s' : '$'}</span>
                                  <Input 
                                    type="number" 
                                    value={convertedAmountOverride !== null ? convertedAmountOverride : Math.abs(finalConvertedAmount)} 
                                    onChange={(e) => setConvertedAmountOverride(Number(e.target.value))}
                                    className="bg-white border-primary/30 text-2xl font-black text-primary h-12"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {activeTab === 'cobro' && customerPendingTxs.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Imputar a Facturas Pendientes ({manualCurrency})</Label>
                          <div className="space-y-3 md:space-y-0">
                            <div className="md:hidden space-y-3">
                              {customerPendingTxs.filter(tx => tx.currency === manualCurrency).map(tx => (
                                <Card key={tx.id} className="p-4 border-emerald-100 shadow-sm">
                                  <div className="flex justify-between items-center mb-3">
                                    <Badge variant="outline" className={cn("text-[9px] uppercase font-black", txTypeMap[tx.type]?.color)}>{txTypeMap[tx.type]?.label || tx.type}</Badge>
                                    <span className="text-[10px] font-bold text-slate-400">{formatLocalDate(tx.date)}</span>
                                  </div>
                                  <div className="flex justify-between items-end gap-4">
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-black uppercase text-rose-600">Deuda Pendiente</p>
                                      <p className="text-xl font-black text-rose-700">{manualCurrency==='USD'?'u$s':'$'} {Math.abs(tx.pendingAmount || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                      <Label className="text-[10px] font-black uppercase text-emerald-700">Asignar Pago</Label>
                                      <div className="flex items-center gap-2">
                                        <Button 
                                          variant="outline" 
                                          size="icon" 
                                          className="h-11 w-11 shrink-0 border-emerald-200 text-emerald-600"
                                          onClick={() => setImputations({...imputations, [tx.id]: Math.abs(tx.pendingAmount)})}
                                        >
                                          <CheckCircle2 className="h-5 w-5" />
                                        </Button>
                                        <Input 
                                          type="number" 
                                          className="h-11 text-right font-black border-emerald-300 text-lg bg-emerald-50/30" 
                                          value={imputations[tx.id] || ""} 
                                          onChange={(e) => setImputations({...imputations, [tx.id]: Number(e.target.value)})}
                                          placeholder="0"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                            <div className="hidden md:block border rounded-xl overflow-hidden bg-white shadow-sm">
                              <Table>
                                <TableHeader className="bg-muted/30">
                                  <TableRow>
                                    <TableHead className="text-[9px] font-black uppercase">Fecha</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase">Tipo</TableHead>
                                    <TableHead className="text-right text-[9px] font-black uppercase">Pendiente</TableHead>
                                    <TableHead className="w-40 text-right text-[9px] font-black uppercase">Asignar</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {customerPendingTxs.filter(tx => tx.currency === manualCurrency).map(tx => (
                                    <TableRow key={tx.id}>
                                      <TableCell className="text-xs font-bold">{formatLocalDate(tx.date)}</TableCell>
                                      <TableCell><Badge variant="outline" className={cn("text-[9px] uppercase font-black", txTypeMap[tx.type]?.color)}>{txTypeMap[tx.type]?.label || tx.type}</Badge></TableCell>
                                      <TableCell className="text-right font-black text-rose-600">{manualCurrency==='USD'?'u$s':'$'} {Math.abs(tx.pendingAmount || 0).toLocaleString()}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 shrink-0"
                                            onClick={() => setImputations({...imputations, [tx.id]: Math.abs(tx.pendingAmount)})}
                                            title="Saldar factura completa"
                                          >
                                            <CheckCircle2 className="h-4 w-4" />
                                          </Button>
                                          <Input 
                                            type="number" 
                                            className="h-8 text-right font-black border-emerald-200" 
                                            value={imputations[tx.id] || ""} 
                                            onChange={(e) => setImputations({...imputations, [tx.id]: Number(e.target.value)})}
                                            placeholder="0"
                                          />
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground">Filtrar por Categoría</Label>
                          <Select value={itemFilterCategory} onValueChange={setItemFilterCategory}>
                            <SelectTrigger className="h-11 bg-white shadow-sm"><SelectValue placeholder="Filtrar categoría..." /></SelectTrigger>
                            <SelectContent className="max-h-60">
                              <SelectItem value="all">TODAS LAS CATEGORÍAS</SelectItem>
                              {sortedProductCategories.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name} {c.isFavorite && "⭐"}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-primary">Añadir Producto</Label>
                          <Select onValueChange={handleAddItem}>
                            <SelectTrigger className="h-11 bg-white border-primary/30 ring-2 ring-primary/5"><SelectValue placeholder="Añadir ítem..." /></SelectTrigger>
                            <SelectContent className="max-h-60">
                              {filteredCatalogItems.map(i => (<SelectItem key={i.id} value={i.id}>{i.name} (${i.priceARS} / u$s {i.priceUSD})</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="hidden md:block border rounded-xl overflow-hidden bg-white shadow-sm">
                          <Table>
                            <TableHeader className="bg-muted/30">
                              <TableRow>
                                <TableHead className="text-[9px] font-black uppercase">Ítem</TableHead>
                                <TableHead className="w-28 text-center text-[9px] font-black uppercase">Cant.</TableHead>
                                <TableHead className="w-32 text-center text-[9px] font-black uppercase">Precio</TableHead>
                                <TableHead className="w-28 text-center text-[9px] font-black uppercase">Desc %</TableHead>
                                <TableHead className="w-32 text-center text-[9px] font-black uppercase">Moneda</TableHead>
                                <TableHead className="text-right text-[9px] font-black uppercase">Subtotal</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedItems.map((item, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-bold text-xs">{item.name}</TableCell>
                                  <TableCell><Input type="number" value={item.qty} className="h-8 text-center font-black px-1" onChange={(e) => { const n = [...selectedItems]; n[i].qty = Number(e.target.value); setSelectedItems(n); }} /></TableCell>
                                  <TableCell><Input type="number" value={item.price} className="h-8 text-center font-black px-1" onChange={(e) => { const n = [...selectedItems]; n[i].price = Number(e.target.value); setSelectedItems(n); }} /></TableCell>
                                  <TableCell><Input type="number" value={item.discount} className="h-8 text-center font-bold px-1" onChange={(e) => { const n = [...selectedItems]; n[i].discount = Number(e.target.value); setSelectedItems(n); }} /></TableCell>
                                  <TableCell>
                                    <Tabs value={item.currency} onValueChange={(v) => { const n = [...selectedItems]; n[i].currency = v; setSelectedItems(n); }} className="w-full">
                                      <TabsList className="grid grid-cols-2 h-7 p-0.5 border">
                                        <TabsTrigger value="ARS" className="text-[7px] font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white">ARS</TabsTrigger>
                                        <TabsTrigger value="USD" className="text-[7px] font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                                      </TabsList>
                                    </Tabs>
                                  </TableCell>
                                  <TableCell className="text-right font-black text-xs">{(item.price * item.qty * (1 - item.discount/100)).toLocaleString()}</TableCell>
                                  <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setSelectedItems(selectedItems.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3" /></Button></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="md:hidden space-y-4">
                          {selectedItems.map((item, i) => (
                            <Card key={i} className="p-4 border-primary/10 shadow-md bg-white">
                              <div className="flex justify-between items-start mb-4">
                                <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight truncate flex-1 pr-4">{item.name}</h4>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive bg-rose-50 -mt-1 -mr-1" onClick={() => setSelectedItems(selectedItems.filter((_, idx) => idx !== i))}>
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Cantidad</Label>
                                  <Input 
                                    type="number" 
                                    value={item.qty} 
                                    className="h-12 text-center font-black text-xl bg-slate-50 border-slate-200" 
                                    onChange={(e) => { const n = [...selectedItems]; n[i].qty = Number(e.target.value); setSelectedItems(n); }} 
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Precio Unit.</Label>
                                  <Input 
                                    type="number" 
                                    value={item.price} 
                                    className="h-12 text-center font-black text-xl bg-slate-50 border-slate-200" 
                                    onChange={(e) => { const n = [...selectedItems]; n[i].price = Number(e.target.value); setSelectedItems(n); }} 
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 items-end mb-4">
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Descuento (%)</Label>
                                  <Input 
                                    type="number" 
                                    value={item.discount} 
                                    className="h-11 text-center font-bold bg-white border-slate-200" 
                                    onChange={(e) => { const n = [...selectedItems]; n[i].discount = Number(e.target.value); setSelectedItems(n); }} 
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Moneda</Label>
                                  <Tabs value={item.currency} onValueChange={(v) => { const n = [...selectedItems]; n[i].currency = v; setSelectedItems(n); }} className="w-full">
                                    <TabsList className="grid grid-cols-2 h-11 p-1 border bg-muted/20">
                                      <TabsTrigger value="ARS" className="text-[9px] font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white">ARS</TabsTrigger>
                                      <TabsTrigger value="USD" className="text-[9px] font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                                    </TabsList>
                                  </Tabs>
                                </div>
                              </div>

                              <div className="pt-3 border-t border-dashed flex justify-between items-center bg-slate-50/50 -mx-4 px-4 pb-1 mt-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Subtotal Ítem:</span>
                                <span className="font-black text-primary text-xl">
                                  {item.currency === 'USD' ? 'u$s' : '$'} {(item.price * item.qty * (1 - item.discount/100)).toLocaleString()}
                                </span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2 pt-4 border-t border-dashed">
                    <Label className="font-bold uppercase text-[10px] tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                      <Receipt className="h-3 w-3" /> Notas / Concepto de Operación
                    </Label>
                    <Input value={txDescription} onChange={(e) => setTxDescription(e.target.value)} placeholder="Ej: Pago de factura #123, Reposición zona norte..." className="bg-white h-12 italic border-primary/10 shadow-inner" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-card h-fit sticky top-8 border-primary/20 shadow-2xl">
                <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-xs uppercase font-black tracking-widest text-primary">Resumen de Operación</CardTitle></CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {!['cobro', 'adjustment', 'Expense'].includes(activeTab) && (
                    <div className="space-y-4">
                      {['ARS', 'USD'].map(curr => {
                        const total = cartTotals[curr as 'ARS'|'USD'];
                        if (total <= 0) return null;
                        const paid = paidAmounts[curr];
                        const debt = total - paid;
                        return (
                          <div key={curr} className="p-4 rounded-2xl border bg-muted/10 space-y-3 shadow-inner">
                            <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-muted-foreground">Total {curr}:</span><span className="text-2xl font-black">{curr==='USD'?'u$s':'$'} {total.toLocaleString()}</span></div>
                            <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-emerald-700">Abonado hoy ({curr}):</Label><Input type="number" value={paid} onChange={(e) => setPaidAmounts({...paidAmounts, [curr]: Number(e.target.value)})} className="h-12 border-emerald-200 font-black text-2xl text-emerald-700 bg-white" /></div>
                            <div className="space-y-1"><Label className="text-[10px] uppercase font-black">Caja de Cobro:</Label><Select value={destinationAccounts[curr]} onValueChange={(v) => setDestinationAccounts({...destinationAccounts, [curr]: v})}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">A CUENTA / SIN CAJA</SelectItem>{accounts?.filter(a => a.currency === curr).map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select></div>
                            {debt > 0 && (
                              <div className="pt-2 border-t border-dashed mt-2 text-rose-600 font-black text-[10px] flex justify-between uppercase italic">
                                <span>Quedará a cuenta:</span>
                                <span>{curr==='USD'?'u$s':'$'} {debt.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {['cobro', 'adjustment', 'Expense'].includes(activeTab) && (
                    <div className="p-5 rounded-2xl border bg-emerald-50 mb-4 shadow-inner space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest mb-2">Monto de Operación ({manualCurrency})</p>
                        <p className="text-4xl font-black text-emerald-800">{manualCurrency === 'USD' ? 'u$s' : '$'} {manualAmount.toLocaleString()}</p>
                      </div>
                      {isCrossCurrency && selectedAccountForManual && (
                        <div className="pt-3 border-t border-emerald-200">
                          <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Monto real a mover en Caja ({selectedAccountForManual.currency})</p>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-primary">{selectedAccountForManual.currency === 'USD' ? 'u$s' : '$'}</span>
                            <Input 
                              type="number" 
                              value={convertedAmountOverride !== null ? convertedAmountOverride : Math.abs(finalConvertedAmount)} 
                              onChange={(e) => setConvertedAmountOverride(Number(e.target.value))}
                              className="bg-white border-primary/30 text-2xl font-black text-primary h-12"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <Button className="w-full h-16 font-black shadow-xl text-xl uppercase tracking-tighter" onClick={handleSaveTransaction}>{editingTx ? 'GUARDAR CAMBIOS' : 'REGISTRAR OPERACIÓN'}</Button>
                  <Button variant="outline" className="w-full h-12 border-rose-600 text-rose-600 hover:bg-rose-50 font-bold uppercase text-xs" onClick={() => { resetRegisterForm(); setMainView("history"); }}>CANCELAR</Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-primary/5 border-l-4 border-l-primary shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Flujo Neto ARS</p><h3 className={cn("text-2xl font-black mt-1", filteredTotals.ars < 0 ? "text-rose-600" : "text-emerald-600")}>${filteredTotals.ars.toLocaleString()}</h3></div><Calculator className="h-8 w-8 text-primary/20" /></CardContent></Card>
                <Card className="bg-emerald-50 border-l-4 border-l-emerald-500 shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase text-emerald-700/60 tracking-widest">Flujo Neto USD</p><h3 className={cn("text-2xl font-black mt-1", filteredTotals.usd < 0 ? "text-rose-600" : "text-emerald-600")}>u$s {filteredTotals.usd.toLocaleString()}</h3></div><TrendingUp className="h-8 w-8 text-emerald-500/20" /></CardContent></Card>
              </div>
              <Card className="glass-card p-4 flex flex-wrap gap-4 items-end border-dashed border-primary/20">
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Cliente</Label><Select value={filterCustomer} onValueChange={setFilterCustomer}><SelectTrigger className="w-[180px] h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los clientes</SelectItem>{sortedCustomers.map(c => (<SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre}</SelectItem>))}</SelectContent></Select></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Caja</Label><Select value={filterAccount} onValueChange={setFilterAccount}><SelectTrigger className="w-[160px] h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas las cajas</SelectItem><SelectItem value="null">Sin Caja / A Cuenta</SelectItem>{accounts?.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Flujo</Label><Select value={filterFlow} onValueChange={setFilterFlow}><SelectTrigger className="w-[120px] h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los flujos</SelectItem><SelectItem value="income" className="text-emerald-600 font-bold">Ingresos</SelectItem><SelectItem value="expense" className="text-rose-600 font-bold">Egresos</SelectItem></SelectContent></Select></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Operación</Label><Select value={filterOpType} onValueChange={setFilterOpType}><SelectTrigger className="w-[140px] h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>
                     {Object.keys(txTypeMap)
                      .filter(k => !['Adjustment','Expense', 'refill', 'adjustment'].includes(k))
                      .concat(['adjustment'])
                      .map(k => <SelectItem key={k} value={k}>{txTypeMap[k].label}</SelectItem>)}
                   </SelectContent></Select></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Desde</Label><Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="h-10 w-[140px] bg-white" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Hasta</Label><Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="h-10 w-[140px] bg-white" /></div>
                   <div className="flex gap-2">
                     <Button variant="outline" size="icon" className="h-10 w-10 border-primary/20" onClick={() => { setFilterCustomer("all"); setFilterAccount("all"); setFilterStartDate(""); setFilterEndDate(""); setFilterOpType("all"); setFilterFlow("all"); }}><FilterX className="h-4 w-4" /></Button>
                     <Button variant="outline" size="icon" className="h-10 w-10 border-emerald-200 text-emerald-700 bg-emerald-50" onClick={handlePrintPDF} title="Generar reporte PDF de la selección"><Printer className="h-4 w-4" /></Button>
                   </div>
              </Card>

              <div className="hidden md:block">
                <Card className="glass-card overflow-hidden shadow-md border-primary/10">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase">Fecha</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Tipo</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Caja</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase">Monto Real</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase">Abonado</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase">Pendiente</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase">Saldo Caja</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((tx: any) => {
                        const cust = customers?.find(c => c.id === tx.clientId);
                        const acc = accounts?.find(a => a.id === tx.financialAccountId);
                        const info = txTypeMap[tx.type] || { label: tx.type, icon: ShoppingBag, color: "text-slate-600 bg-slate-50" };
                        const Icon = info.icon;
                        const pendingAmt = Number(tx.pendingAmount || 0);
                        return (
                          <TableRow key={tx.id} className="cursor-pointer hover:bg-primary/5 transition-colors group" onClick={() => setSelectedTxDetails(tx)}>
                            <TableCell className="text-xs font-bold text-slate-600">{formatLocalDate(tx.date)}</TableCell>
                            <TableCell><span className="font-black text-slate-800">{cust ? `${cust.apellido}, ${cust.nombre}` : 'Global'}</span></TableCell>
                            <TableCell><Badge variant="outline" className={cn("text-[9px] gap-1 px-2 font-black uppercase", info.color)}><Icon className="h-3 w-3" />{info.label}</Badge></TableCell>
                            <TableCell><span className="text-[10px] font-black text-muted-foreground uppercase">{acc?.name || "---"}</span></TableCell>
                            <TableCell className="text-right font-black text-slate-800">{tx.currency==='USD'?'u$s':'$'} {Math.abs(tx.amount || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-xs font-bold text-emerald-700">{tx.currency==='USD'?'u$s':'$'} {Number(tx.paidAmount || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-xs">
                              <span className={cn(
                                "px-2 py-0.5 rounded border text-[10px] font-black",
                                Math.abs(pendingAmt) < 0.01 
                                  ? "text-black border-transparent bg-transparent" 
                                  : pendingAmt < 0 
                                    ? "bg-rose-50 text-rose-700 border-rose-200" 
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              )}>
                                {tx.currency==='USD'?'u$s':'$'} {Math.abs(pendingAmt).toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-[10px] font-mono font-bold text-primary">{tx.currency==='USD'?'u$s':'$'} {Number(tx.accountBalanceAfter || 0).toLocaleString()}</TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="opacity-40 group-hover:opacity-100">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 font-bold">
                                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => setSelectedTxDetails(tx), 100); }}><Info className="h-4 w-4 mr-2" /> Ficha completa</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleOpenCommDialog(tx, 'ws'); }} className="text-emerald-600"><MessageSquare className="h-4 w-4 mr-2" /> WhatsApp</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleOpenCommDialog(tx, 'mail'); }}><Mail className="h-4 w-4 mr-2" /> Enviar mail</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleCopyTxDetail(tx); }}><Copy className="h-4 w-4 mr-2" /> Copiar Detalle</DropdownMenuItem>
                                  {isAdmin && (
                                    <>
                                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => handleStartEdit(tx), 100); }}><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive font-black" onSelect={(e) => { e.preventDefault(); setTimeout(() => setTxToDelete(tx), 100); }}><Trash2 className="h-4 w-4 mr-2" /> Eliminar</DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              <div className="md:hidden space-y-4">
                {filteredTransactions.map((tx: any) => {
                  const cust = customers?.find(c => c.id === tx.clientId);
                  const acc = accounts?.find(a => a.id === tx.financialAccountId);
                  const info = txTypeMap[tx.type] || { label: tx.type, icon: ShoppingBag, color: "text-slate-600 bg-slate-50" };
                  const Icon = info.icon;
                  const pendingAmt = Number(tx.pendingAmount || 0);
                  const symbol = tx.currency === 'USD' ? 'u$s' : '$';

                  return (
                    <Card key={tx.id} className="glass-card shadow-md active:scale-[0.98] transition-transform border-primary/5" onClick={() => setSelectedTxDetails(tx)}>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{formatLocalDate(tx.date)}</p>
                            <h4 className="font-black text-slate-800 leading-tight truncate max-w-[200px] text-base">
                              {cust ? `${cust.apellido}, ${cust.nombre}` : 'Global'}
                            </h4>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10">
                                  <MoreVertical className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 font-bold">
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => setSelectedTxDetails(tx), 100); }}><Info className="h-4 w-4 mr-2" /> Ver Ficha</DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleOpenCommDialog(tx, 'ws'); }} className="text-emerald-600"><MessageSquare className="h-4 w-4 mr-2" /> WhatsApp</DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleOpenCommDialog(tx, 'mail'); }}><Mail className="h-4 w-4 mr-2" /> Enviar mail</DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleCopyTxDetail(tx); }}><Copy className="h-4 w-4 mr-2" /> Copiar</DropdownMenuItem>
                                {isAdmin && (
                                  <>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => handleStartEdit(tx), 100); }}><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive font-black" onSelect={(e) => { e.preventDefault(); setTimeout(() => setTxToDelete(tx), 100); }}><Trash2 className="h-4 w-4 mr-2" /> Eliminar</DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-[9px] font-black uppercase gap-1 px-2 py-0.5 shadow-sm", info.color)}>
                            <Icon className="h-3 w-3" /> {info.label}
                          </Badge>
                          <span className="text-[9px] font-black text-muted-foreground uppercase bg-muted/30 px-2 py-0.5 rounded border">
                            {acc?.name || "A cuenta"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed">
                          <div>
                            <p className="text-[8px] font-black uppercase text-slate-400">Pagado Real</p>
                            <p className="text-lg font-black text-slate-800">{symbol} {Math.abs(tx.amount || 0).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-black uppercase text-slate-400">Pendiente</p>
                            <div className={cn(
                              "inline-block px-2 py-0.5 rounded border text-[10px] font-black",
                              Math.abs(pendingAmt) < 0.01 
                                ? "text-black border-transparent" 
                                : pendingAmt < 0 
                                  ? "bg-rose-50 text-rose-700 border-rose-200" 
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}>
                              {symbol} {Math.abs(pendingAmt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl text-[10px] font-bold border shadow-inner">
                          <div className="flex gap-2">
                            <span className="text-slate-400 uppercase font-black text-[8px]">Abonado:</span>
                            <span className="text-emerald-700">{symbol} {Number(tx.paidAmount || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-slate-400 uppercase font-black text-[8px]">Caja:</span>
                            <span className="text-primary font-mono font-black">{symbol} {Number(tx.accountBalanceAfter || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          <Dialog open={!!selectedTxDetails} onOpenChange={(o) => !o && setSelectedTxDetails(null)}>
            <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto p-0 md:p-6">
              <DialogHeader className="p-4 pb-2 border-b md:border-none">
                <div className="flex justify-between items-start w-full">
                  <div className="space-y-1 pr-8 text-left">
                    <DialogTitle className="text-xl font-black uppercase flex items-center gap-2 text-primary">
                      {selectedTxDetails && (
                        <>
                          {(() => { const Icon = txTypeMap[selectedTxDetails.type]?.icon || Info; return <Icon className="h-5 w-5" /> })()}
                          {txTypeMap[selectedTxDetails.type]?.label || 'Detalle'}
                        </>
                      )}
                    </DialogTitle>
                    <DialogDescription className="font-bold text-slate-800 text-base">{selectedTxDetails && formatLocalDate(selectedTxDetails.date)}</DialogDescription>
                  </div>
                  <div className="hidden md:flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopyTxDetail(selectedTxDetails)} className="h-8 font-bold gap-2"><Copy className="h-3.5 w-3.5" /> COPIAR</Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenCommDialog(selectedTxDetails, 'ws')} className="h-8 font-bold gap-2 border-emerald-200 text-emerald-700 bg-emerald-50"><MessageSquare className="h-3.5 w-3.5" /> WHATSAPP</Button>
                  </div>
                </div>
              </DialogHeader>
              {selectedTxDetails && (
                <div className="px-4 py-6 md:py-4 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-muted/20 rounded-2xl border space-y-1 shadow-inner">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Monto Pagado (Real)</p>
                      <p className="text-3xl font-black">{selectedTxDetails.currency === 'USD' ? 'u$s' : '$'} {Math.abs(selectedTxDetails.amount).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-1 shadow-inner">
                      <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Abonado</p>
                      <p className="text-3xl font-black text-emerald-800">{selectedTxDetails.currency === 'USD' ? 'u$s' : '$'} {Number(selectedTxDetails.paidAmount || 0).toLocaleString()}</p>
                    </div>
                    <div className={cn(
                      "p-4 border rounded-2xl space-y-1 shadow-inner",
                      Math.abs(selectedTxDetails.pendingAmount || 0) < 0.01 
                        ? "bg-slate-50 border-slate-200" 
                        : selectedTxDetails.pendingAmount < 0 
                          ? "bg-rose-50 border-rose-100" 
                          : "bg-emerald-50 border-emerald-100"
                    )}>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Saldo Pendiente</p>
                      <p className={cn(
                        "text-3xl font-black",
                        Math.abs(selectedTxDetails.pendingAmount || 0) < 0.01 
                          ? "text-black" 
                          : selectedTxDetails.pendingAmount < 0 
                            ? "text-rose-800" 
                            : "text-emerald-800"
                      )}>{selectedTxDetails.currency === 'USD' ? 'u$s' : '$'} {Math.abs(selectedTxDetails.pendingAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2"><User className="h-3 w-3" /> Cliente y Caja</p>
                    <div className="p-4 border rounded-2xl bg-white flex flex-col md:flex-row md:justify-between md:items-center gap-3 shadow-sm">
                      <span className="font-black text-slate-800 text-lg">{customers?.find(c => c.id === selectedTxDetails.clientId)?.apellido || 'Global'}, {customers?.find(c => c.id === selectedTxDetails.clientId)?.nombre || ''}</span>
                      <Badge variant="secondary" className="w-fit font-black uppercase text-[10px] py-1 px-3 border-primary/10">{selectedTxDetails.financialAccountId ? (accounts?.find(a => a.id === selectedTxDetails.financialAccountId)?.name || 'Caja') : 'A CUENTA'}</Badge>
                    </div>
                  </div>

                  {selectedTxDetails.originalAmount && (
                    <div className="p-4 bg-primary/5 border rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Valor de Referencia (Original)</p>
                      <p className="text-xl font-black text-primary">
                        {selectedTxDetails.originalCurrency === 'USD' ? 'u$s' : '$'} {Math.abs(selectedTxDetails.originalAmount).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedTxDetails.imputations && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Imputaciones Realizadas</p>
                      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                        <Table>
                          <TableHeader className="bg-emerald-50"><TableRow><TableHead className="text-[10px] font-black uppercase">Fecha Factura</TableHead><TableHead className="text-right text-[10px] font-black uppercase">Monto Aplicado</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {Object.entries(selectedTxDetails.imputations as Record<string, number>).map(([tid, amount]) => {
                              const originalTx = transactions?.find(t => t.id === tid);
                              return (
                                <TableRow key={tid}>
                                  <TableCell className="text-xs">
                                    <p className="font-black">{originalTx ? formatLocalDate(originalTx.date) : "---"}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{originalTx ? (txTypeMap[originalTx.type]?.label || originalTx.type) : "Factura"}</p>
                                  </TableCell>
                                  <TableCell className="text-right font-black text-emerald-700">{selectedTxDetails.currency === 'USD' ? 'u$s' : '$'} {amount.toLocaleString()}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {selectedTxDetails.items && selectedTxDetails.items.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2"><ShoppingBag className="h-3 w-3" /> Detalle de Productos</p>
                      <div className="border rounded-2xl bg-white overflow-hidden shadow-sm">
                        <div className="hidden md:block">
                          <Table>
                            <TableHeader className="bg-muted/10"><TableRow><TableHead className="text-[10px] font-black">Ítem</TableHead><TableHead className="text-center text-[10px] font-black">Cant.</TableHead><TableHead className="text-right text-[10px] font-black">Subtotal</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {selectedTxDetails.items.map((item: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-xs font-bold">{item.name}</TableCell>
                                  <TableCell className="text-center text-xs font-black">{item.qty}</TableCell>
                                  <TableCell className="text-right text-xs font-black">{selectedTxDetails.currency === 'USD' ? 'u$s' : '$'} {(item.price * item.qty * (1 - (item.discount || 0)/100)).toLocaleString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="md:hidden divide-y">
                          {selectedTxDetails.items.map((item: any, idx: number) => (
                            <div key={idx} className="p-4 flex justify-between items-center bg-white">
                              <div className="space-y-1">
                                <p className="text-sm font-black text-slate-800 leading-tight">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">{item.qty} x {selectedTxDetails.currency === 'USD' ? 'u$s' : '$'} {item.price.toLocaleString()}</p>
                              </div>
                              <span className="text-sm font-black text-primary">{selectedTxDetails.currency === 'USD' ? 'u$s' : '$'} {(item.price * item.qty * (1 - (item.discount || 0)/100)).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTxDetails.description && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Notas Adicionales</p>
                      <div className="p-4 bg-muted/5 border border-dashed rounded-2xl italic text-sm text-slate-700 leading-relaxed shadow-inner">"{selectedTxDetails.description}"</div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 md:hidden pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => handleCopyTxDetail(selectedTxDetails)} className="h-12 font-black gap-2 text-xs uppercase"><Copy className="h-4 w-4" /> COPIAR</Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenCommDialog(selectedTxDetails, 'ws')} className="h-12 font-black gap-2 border-emerald-200 text-emerald-700 bg-emerald-50 text-xs uppercase"><MessageSquare className="h-4 w-4" /> WHATSAPP</Button>
                  </div>
                </div>
              )}
              <DialogFooter className="p-4 border-t bg-slate-50 md:bg-transparent">
                <Button onClick={() => setSelectedTxDetails(null)} className="w-full font-black h-12 uppercase tracking-widest">Cerrar Ficha</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isWsDialogOpen || isMailDialogOpen} onOpenChange={(o) => { if(!o) { setIsWsDialogOpen(false); setIsEmailDialogOpen(false); } }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tight">{isWsDialogOpen ? <MessageSquare className="h-5 w-5 text-emerald-600" /> : <Mail className="h-5 w-5 text-primary" />} Notificación de Operación</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                {!isWsDialogOpen && (
                  <Card className="bg-amber-50 border-amber-100 p-4 space-y-2">
                    <p className="text-xs font-bold text-amber-800 flex items-center gap-2 uppercase tracking-widest"><AlertTriangle className="h-4 w-4" /> Verificar Remitente</p>
                    <p className="text-[11px] leading-relaxed text-amber-700 font-bold italic">Asegurate de seleccionar la cuenta DOSIMAT antes de enviar.</p>
                  </Card>
                )}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Seleccionar Plantilla</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="bg-white h-11"><SelectValue placeholder="Elegir..." /></SelectTrigger>
                    <SelectContent>{(isWsDialogOpen ? wsTemplates : emailTemplates)?.map((t: any) => (<SelectItem key={t.id} value={t.id} className="font-bold">{t.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                {dynamicKeys.length > 0 && (
                  <div className="space-y-4 p-4 bg-muted/20 rounded-2xl border border-dashed">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Datos Requeridos</p>
                    <div className="grid grid-cols-1 gap-4">
                      {dynamicKeys.map(key => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs font-bold">{key}</Label>
                          <Input value={dynamicValues[key] || ""} onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})} className="bg-white h-10 font-bold" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeTemplate && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vista Previa</Label>
                    <ScrollArea className="h-48 border rounded-2xl bg-white p-4 italic text-sm text-slate-700 shadow-inner">
                      {isMailDialogOpen && <p className="font-black mb-2 text-primary">Asunto: {replaceMarkers(activeTemplate.subject || "", selectedTxForComm, dynamicValues)}</p>}
                      <div className="whitespace-pre-wrap leading-relaxed">{replaceMarkers(activeTemplate.body, selectedTxForComm, dynamicValues)}</div>
                    </ScrollArea>
                  </div>
                )}
              </div>
              <DialogFooter className="border-t pt-4">
                <Button variant="outline" onClick={() => { setIsWsDialogOpen(false); setIsEmailDialogOpen(false); }} className="font-bold">Cerrar</Button>
                <Button onClick={() => handleSendComm(isWsDialogOpen ? 'ws' : 'mail')} disabled={!selectedTemplateId || dynamicKeys.some(k => !dynamicValues[k])} className={cn("font-black h-12 md:h-11 uppercase text-xs tracking-widest", isWsDialogOpen ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary")}>
                  {isWsDialogOpen ? <Send className="mr-2 h-4 w-4" /> : <Mail className="mr-2 h-4 w-4" />} Abrir {isWsDialogOpen ? 'WhatsApp' : 'Mail App'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!txToDelete} onOpenChange={(o) => { if(!o) setTxToDelete(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle className="text-rose-600 font-black flex items-center gap-2"><Trash2 className="h-5 w-5" /> ¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription className="font-bold text-slate-700">Se revertirán todos los saldos asociados e imputaciones. Esta acción es irreversible.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel className="font-bold">Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTx} className="bg-destructive font-black uppercase">Eliminar y Revertir</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </SidebarInset>
        <MobileNav />
      </div>

      {/* VISTA DE IMPRESIÓN (PDF) */}
      <div className="print-only w-full p-8 bg-white text-slate-900 font-sans">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Reporte de Operaciones</h1>
            <p className="text-sm font-bold text-slate-600">Dosimat Pro System</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black uppercase text-slate-400">Fecha de emisión</p>
            <p className="text-sm font-bold">{new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="mb-6 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
            <h2 className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Filtros Aplicados</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {activeFilters.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{f.label}:</span>
                  <span className="text-xs font-black text-slate-800">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 border-2 border-slate-900 rounded-2xl bg-slate-50">
            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Flujo Neto ARS</p>
            <p className={cn("text-2xl font-black", filteredTotals.ars < 0 ? "text-rose-700" : "text-emerald-700")}>
              ${filteredTotals.ars.toLocaleString('es-AR')}
            </p>
          </div>
          <div className="p-4 border-2 border-slate-900 rounded-2xl bg-slate-50">
            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Flujo Neto USD</p>
            <p className={cn("text-2xl font-black", filteredTotals.usd < 0 ? "text-rose-700" : "text-emerald-700")}>
              u$s {filteredTotals.usd.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        <table className="w-full border-collapse border-2 border-slate-900 text-[10px]">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="border border-slate-900 p-2 text-left uppercase font-black">Fecha</th>
              <th className="border border-slate-900 p-2 text-left uppercase font-black">Cliente</th>
              <th className="border border-slate-900 p-2 text-left uppercase font-black">Operación</th>
              <th className="border border-slate-900 p-2 text-left uppercase font-black">Caja</th>
              <th className="border border-slate-900 p-2 text-right uppercase font-black">Total Pagado</th>
              <th className="border border-slate-900 p-2 text-right uppercase font-black">Abonado</th>
              <th className="border border-slate-900 p-2 text-right uppercase font-black">Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx: any) => {
              const cust = customers?.find(c => c.id === tx.clientId);
              const acc = accounts?.find(a => a.id === tx.financialAccountId);
              const symbol = tx.currency === 'USD' ? 'u$s' : '$';
              return (
                <tr key={tx.id} className="border-b border-slate-300">
                  <td className="border border-slate-900 p-2 font-bold">{formatLocalDate(tx.date)}</td>
                  <td className="border border-slate-900 p-2 font-black">{cust ? `${cust.apellido}, ${cust.nombre}` : 'Global'}</td>
                  <td className="border border-slate-900 p-2 uppercase font-bold">{txTypeMap[tx.type]?.label || tx.type}</td>
                  <td className="border border-slate-900 p-2 uppercase font-medium">{acc?.name || 'A Cuenta'}</td>
                  <td className="border border-slate-900 p-2 text-right font-black">{symbol} {Math.abs(tx.amount).toLocaleString('es-AR')}</td>
                  <td className="border border-slate-900 p-2 text-right font-bold text-emerald-700">{symbol} {Number(tx.paidAmount || 0).toLocaleString('es-AR')}</td>
                  <td className="border border-slate-900 p-2 text-right font-black">
                    {Math.abs(tx.pendingAmount || 0) < 0.01 ? '-' : `${symbol} ${Math.abs(tx.pendingAmount).toLocaleString('es-AR')}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="mt-12 pt-6 border-t border-dashed border-slate-300 flex justify-between items-end italic text-[9px] text-slate-400">
          <p>Este reporte refleja la situación financiera según los criterios de búsqueda aplicados.</p>
          <p>Página 1 de 1</p>
        </div>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <TransactionsContent />
    </Suspense>
  )
}
