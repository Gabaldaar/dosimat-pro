
"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  ClipboardCheck, 
  Calendar as CalendarIcon, 
  Wallet, 
  FilterX,
  Trash2,
  ArrowRightLeft,
  PlusCircle,
  ShoppingBag,
  Droplet,
  Wrench,
  Settings2,
  Receipt,
  MoreVertical,
  Edit,
  AlertTriangle,
  Mail,
  Send,
  Eye,
  Droplets,
  RefreshCw,
  Copy,
  Loader2,
  ArrowDownLeft,
  Tag,
  Info,
  ArrowUpCircle,
  ArrowDownCircle,
  Minus,
  Lock,
  MessageSquare,
  Sparkles,
  ChevronRight,
  History,
  Star,
  Link as LinkIcon,
  CheckCircle2,
  ArrowRight,
  Package,
  Banknote,
  Landmark
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
  sale: { label: "Venta", icon: ShoppingBag, color: "text-blue-600 bg-blue-50", description: "Venta general de productos, insumos o accesorios de piscina." },
  refill: { label: "Reposición", icon: Droplet, color: "text-cyan-600 bg-cyan-50", description: "Registro de servicio de reposición de cloro y químicos." },
  service: { label: "Técnico", icon: Wrench, color: "text-indigo-600 bg-indigo-50", description: "Servicios técnicos, reparaciones o visitas de mantenimiento." },
  cobro: { label: "Cobro", icon: Receipt, color: "text-emerald-600 bg-emerald-50", description: "Registro de pago recibido del cliente para cancelar deuda." },
  adjustment: { label: "Ajuste", icon: Settings2, color: "text-slate-600 bg-slate-50", description: "Corrección manual de saldo en la cuenta del cliente." },
  Adjustment: { label: "Ajuste", icon: RefreshCw, color: "text-slate-600 bg-slate-50", description: "Ajuste de saldo manual." },
  Expense: { label: "Gasto", icon: ArrowDownLeft, color: "text-rose-600 bg-rose-50", description: "Gasto manual registrado." },
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
  
  const clientIdParam = searchParams.get('clientId')
  const accountIdParam = searchParams.get('accountId')
  const modeParam = searchParams.get('mode')
  const preCloro = searchParams.get('cloro')
  const preAcido = searchParams.get('acido')
  const preCash = searchParams.get('cash')
  const preNotes = searchParams.get('notes')

  const [mainView, setMainView] = useState("history")
  const [activeTab, setActiveTab] = useState("refill")
  const [editingTx, setEditingTx] = useState<any | null>(null)
  const [txToDelete, setTxToDelete] = useState<any | null>(null)
  const [selectedTxDetails, setSelectedTxDetails] = useState<any | null>(null)

  const [isWsDialogOpen, setIsWsDialogOpen] = useState(false)
  const [selectedTxForWs, setSelectedTxForWs] = useState<any | null>(null)
  const [selectedWsTemplateId, setSelectedWsTemplateId] = useState("")
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({})
  const [dynamicKeys, setDynamicKeys] = useState<string[]>([])

  const [filterCustomer, setFilterCustomer] = useState("all")
  const [filterAccount, setFilterAccount] = useState("all")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterOpType, setFilterOpType] = useState("all") 
  const [filterCategory, setFilterCategory] = useState("all") 
  const [filterExpenseCategory, setFilterExpenseCategory] = useState("all")
  const [itemFilterCategory, setItemFilterCategory] = useState("all")

  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc')), [db])
  const wsTemplatesQuery = useMemoFirebase(() => collection(db, 'whatsapp_templates'), [db])
  const expenseCatsQuery = useMemoFirebase(() => collection(db, 'expense_categories'), [db])
  const productCatsQuery = useMemoFirebase(() => collection(db, 'product_categories'), [db])

  const { data: customers } = useCollection(clientsQuery)
  const { data: catalog } = useCollection(catalogQuery)
  const { data: accounts } = useCollection(accountsQuery)
  const { data: transactions, isLoading: loadingTx } = useCollection(txQuery)
  const { data: wsTemplates } = useCollection(wsTemplatesQuery)
  const { data: expenseCategories } = useCollection(expenseCatsQuery)
  const { data: productCategories } = useCollection(productCatsQuery)

  // Observador de pointer-events
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        if (mainView !== 'register' && !txToDelete && !selectedTxDetails && !isWsDialogOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [mainView, txToDelete, selectedTxDetails, isWsDialogOpen]);

  const sortedCatalog = useMemo(() => {
    if (!catalog) return []
    return [...catalog].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [catalog])

  const sortedProductCategories = useMemo(() => {
    if (!productCategories) return []
    return [...productCategories].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
  }, [productCategories]);

  const filteredCatalogItems = useMemo(() => {
    if (!sortedCatalog) return []
    if (itemFilterCategory === "all") return sortedCatalog
    return sortedCatalog.filter((item: any) => item.categoryId === itemFilterCategory)
  }, [sortedCatalog, itemFilterCategory])

  const sortedCustomers = useMemo(() => {
    if (!customers) return []
    return [...customers].sort((a: any, b: any) => {
      const nameA = `${a.apellido || ""} ${a.nombre || ""}`.toLowerCase();
      const nameB = `${b.apellido || ""} ${b.nombre || ""}`.toLowerCase();
      return nameA.localeCompare(nameB);
    })
  }, [customers])

  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [destinationAccounts, setDestinationAccounts] = useState<Record<string, string>>({ ARS: "pending", USD: "pending" })
  const [paidAmounts, setPaidAmounts] = useState<Record<string, number>>({ ARS: 0, USD: 0 })
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0])
  const [manualAmount, setManualAmount] = useState(0)
  const [manualCurrency, setManualCurrency] = useState("ARS")
  const [manualAccountId, setManualAccountId] = useState("pending")
  const [adjustmentSign, setAdjustmentSign] = useState<"1" | "-1">("1")
  const [selectedExpenseCategoryId, setSelectedExpenseCategoryId] = useState("")
  const [txDescription, setTxDescription] = useState("")
  const [cobroSource, setCobroSource] = useState("sale")
  const [allocations, setAllocations] = useState<Record<string, number>>({})

  useEffect(() => {
    if (clientIdParam && modeParam !== 'new') {
      setFilterCustomer(clientIdParam)
      setMainView("history")
    }
    if (modeParam === 'new' && catalog && catalog.length > 0) {
      setMainView("register")
      if (clientIdParam) setSelectedCustomerId(clientIdParam)
      const itemsToLoad: any[] = []
      const findProduct = (searchTerm: string) => {
        const normalizedSearch = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return catalog.find(p => {
          const name = p.name || "";
          const normalizedName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return normalizedName.includes(normalizedSearch);
        });
      };
      if (preCloro && Number(preCloro) > 0) {
        let cloroProd = findProduct("cloro") || findProduct("hipoclorito");
        if (cloroProd) {
          const defaultCurrency = (cloroProd.priceARS || 0) > 0 ? 'ARS' : 'USD';
          const defaultPrice = (cloroProd.priceARS || 0) > 0 ? cloroProd.priceARS : cloroProd.priceUSD;
          itemsToLoad.push({ itemId: cloroProd.id, name: cloroProd.name, qty: Number(preCloro), price: defaultPrice || 0, currency: defaultCurrency, discount: 0 });
        }
      }
      if (preAcido && Number(preAcido) > 0) {
        const acidoProd = findProduct("acido");
        if (acidoProd) {
          const defaultCurrency = (acidoProd.priceARS || 0) > 0 ? 'ARS' : 'USD';
          const defaultPrice = (acidoProd.priceARS || 0) > 0 ? acidoProd.priceARS : acidoProd.priceUSD;
          itemsToLoad.push({ itemId: acidoProd.id, name: acidoProd.name, qty: Number(preAcido), price: defaultPrice || 0, currency: defaultCurrency, discount: 0 });
        }
      }
      if (itemsToLoad.length > 0) { setSelectedItems(itemsToLoad); setActiveTab("refill"); }
      if (preCash && Number(preCash) > 0) setPaidAmounts(prev => ({ ...prev, ARS: Number(preCash) }))
      if (preNotes) setTxDescription(`Ruta Reposición. ${preNotes}`)
    }
    if (accountIdParam) { setFilterAccount(accountIdParam); setMainView("history"); }
  }, [modeParam, catalog, clientIdParam, preCloro, preAcido, preCash, preNotes, accountIdParam])

  const cartTotals = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      const subtotal = (Number(item.price) || 0) * (Number(item.qty) || 0)
      const discountAmount = subtotal * ((Number(item.discount) || 0) / 100)
      const amount = subtotal - discountAmount
      acc[item.currency as 'ARS' | 'USD'] = (acc[item.currency as 'ARS' | 'USD'] || 0) + amount
      return acc
    }, { ARS: 0, USD: 0 })
  }, [selectedItems])

  const pendingTxsForClient = useMemo(() => {
    if (!selectedCustomerId || !transactions || activeTab !== 'cobro') return [];
    return transactions.filter(tx => 
      tx.clientId === selectedCustomerId && 
      (tx.pendingAmount !== undefined && tx.pendingAmount !== null && Math.abs(tx.pendingAmount) > 0.01) &&
      tx.currency === manualCurrency &&
      ['sale', 'refill', 'service', 'adjustment'].includes(tx.type)
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedCustomerId, transactions, activeTab, manualCurrency]);

  const allocatedTotal = useMemo(() => Object.values(allocations).reduce((sum, val) => sum + val, 0), [allocations]);

  const handleAddItem = (itemId: string) => {
    const item = catalog?.find((i: any) => i.id === itemId)
    if (!item) return
    const defaultCurrency = (item.priceARS || 0) > 0 ? 'ARS' : 'USD'
    const defaultPrice = (item.priceARS || 0) > 0 ? item.priceARS : item.priceUSD
    setSelectedItems(prev => [...prev, { itemId: item.id, name: item.name, qty: 1, price: defaultPrice, currency: defaultCurrency, discount: 0 }])
  }

  const isLatestForAccount = (tx: any) => {
    if (!tx || !tx.financialAccountId || !transactions) return true;
    const accountTxs = transactions.filter(t => t.financialAccountId === tx.financialAccountId);
    if (accountTxs.length <= 1) return true;
    const txTime = new Date(tx.date).getTime();
    return !accountTxs.some(t => new Date(t.date).getTime() > txTime && t.id !== tx.id);
  };

  const handleEditTx = (tx: any) => {
    if (!isAdmin) { toast({ title: "Acceso denegado", variant: "destructive" }); return; }
    if (!isLatestForAccount(tx)) { toast({ title: "Operación bloqueada", description: "Solo se puede editar el último movimiento de esta caja.", variant: "destructive" }); return; }
    setEditingTx(tx); setSelectedCustomerId(tx.clientId); setOperationDate(tx.date.split('T')[0]); setActiveTab(tx.type); setTxDescription(tx.description || "");
    if (tx.type === 'cobro' || tx.type === 'adjustment' || tx.type === 'Expense' || tx.type === 'Adjustment') {
      setManualAmount(Math.abs(tx.amount)); setManualCurrency(tx.currency); setManualAccountId(tx.financialAccountId || "pending");
      if (tx.type === 'adjustment' || tx.type === 'Adjustment') setAdjustmentSign(tx.amount >= 0 ? "1" : "-1");
      setSelectedExpenseCategoryId(tx.expenseCategoryId || "");
      if (tx.type === 'cobro') setCobroSource(tx.relatedType || 'sale');
    } else {
      setSelectedItems(tx.items || []); setDestinationAccounts({ [tx.currency]: tx.financialAccountId || "pending" }); setPaidAmounts({ [tx.currency]: tx.paidAmount || 0 });
    }
    setMainView("register");
  }

  const revertTxBalances = (tx: any) => {
    const balanceField = tx.currency === 'ARS' ? 'saldoActual' : 'saldoUSD'
    if (tx.items) {
      tx.items.forEach((item: any) => {
        const catalogItem = catalog?.find(ci => ci.id === item.itemId);
        if (catalogItem?.trackStock !== false) updateDocumentNonBlocking(doc(db, 'products_services', item.itemId), { stock: increment(item.qty) });
      });
    }
    if (['cobro', 'adjustment', 'Expense', 'Adjustment'].includes(tx.type)) {
      const amount = Number(tx.amount) || 0
      if (tx.financialAccountId) updateDocumentNonBlocking(doc(db, 'financial_accounts', tx.financialAccountId), { initialBalance: increment(-amount) });
      if (tx.clientId) updateDocumentNonBlocking(doc(db, 'clients', tx.clientId), { [balanceField]: increment(-amount) });
      if (tx.allocations) {
        tx.allocations.forEach((alloc: any) => {
          updateDocumentNonBlocking(doc(db, 'transactions', alloc.txId), { pendingAmount: increment(Math.abs(alloc.amount)) });
        });
      }
    } else {
      const total = Number(tx.amount) || 0; const paid = Number(tx.paidAmount) || 0; const debt = total - paid;
      if (tx.financialAccountId && paid !== 0) updateDocumentNonBlocking(doc(db, 'financial_accounts', tx.financialAccountId), { initialBalance: increment(-paid) });
      if (tx.clientId && debt !== 0) updateDocumentNonBlocking(doc(db, 'clients', tx.clientId), { [balanceField]: increment(debt) });
    }
  }

  const confirmDeleteTx = () => {
    if (!txToDelete?.id) return
    revertTxBalances(txToDelete)
    deleteDocumentNonBlocking(doc(db, 'transactions', txToDelete.id))
    setTxToDelete(null)
    setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100);
    toast({ title: "Operación eliminada" })
  }

  const handleSaveTransaction = () => {
    const client = selectedCustomerId ? customers?.find(c => c.id === selectedCustomerId) : null;
    if (editingTx) { revertTxBalances(editingTx); deleteDocumentNonBlocking(doc(db, 'transactions', editingTx.id)); }
    const finalDateStr = new Date(operationDate + 'T12:00:00').toISOString();

    if (activeTab === 'cobro' || activeTab === 'adjustment' || activeTab === 'Expense' || activeTab === 'Adjustment') {
      if (manualAmount <= 0) return
      const txId = Math.random().toString(36).substring(2, 11)
      const multiplier = (activeTab === 'adjustment' || activeTab === 'Adjustment') ? Number(adjustmentSign) : (activeTab === 'Expense' ? -1 : 1)
      const finalAmount = Number(manualAmount) * multiplier
      let balanceAfter = null;
      if (manualAccountId !== "pending") {
        const acc = accounts?.find(a => a.id === manualAccountId)
        if (acc) balanceAfter = Number(acc.initialBalance || 0) + finalAmount;
      }
      const finalAllocations = activeTab === 'cobro' ? 
        Object.entries(allocations).filter(([_, val]) => val > 0).map(([txId, val]) => ({ txId, amount: val, date: new Date().toISOString() }))
        : null;

      const txData = { id: txId, date: finalDateStr, clientId: selectedCustomerId || null, type: activeTab, amount: finalAmount, currency: manualCurrency, description: txDescription || `${txTypeMap[activeTab]?.label || activeTab} manual`, financialAccountId: manualAccountId === "pending" ? null : manualAccountId, paidAmount: (activeTab === 'cobro' || activeTab === 'Expense') ? finalAmount : 0, expenseCategoryId: (activeTab === 'Expense') ? (selectedExpenseCategoryId || null) : null, relatedType: activeTab === 'cobro' ? cobroSource : null, accountBalanceAfter: balanceAfter, allocations: finalAllocations, pendingAmount: (activeTab === 'adjustment' && finalAmount < 0) ? finalAmount : 0 }
      setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })
      if (finalAllocations) finalAllocations.forEach(alloc => updateDocumentNonBlocking(doc(db, 'transactions', alloc.txId), { pendingAmount: increment(alloc.amount) }));
      if (manualAccountId !== "pending") updateDocumentNonBlocking(doc(db, 'financial_accounts', manualAccountId), { initialBalance: increment(finalAmount) });
      if (client) { const balanceField = manualCurrency === 'ARS' ? 'saldoActual' : 'saldoUSD'; updateDocumentNonBlocking(doc(db, 'clients', client.id), { [balanceField]: increment(finalAmount) }); }
    } else {
      if (selectedItems.length === 0) return
      ['ARS', 'USD'].forEach(curr => {
        const total = cartTotals[curr as 'ARS' | 'USD']; if (total <= 0) return;
        const txId = Math.random().toString(36).substring(2, 11); const accId = destinationAccounts[curr]; const paid = Number(paidAmounts[curr] || 0); const debt = total - paid; const isPending = !accId || accId === "pending";
        let balanceAfter = null; if (!isPending && paid !== 0) { const acc = accounts?.find(a => a.id === accId); if (acc) balanceAfter = Number(acc.initialBalance || 0) + paid; }
        const currentItems = selectedItems.filter(item => item.currency === curr);
        const txData = { id: txId, date: finalDateStr, clientId: selectedCustomerId || null, type: activeTab, amount: -Number(total), paidAmount: paid, debtAmount: debt, currency: curr, description: txDescription || `Operación ${txTypeMap[activeTab]?.label.toUpperCase()}`, financialAccountId: (isPending || paid === 0) ? null : accId, items: currentItems, accountBalanceAfter: balanceAfter, pendingAmount: -debt }
        setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })
        currentItems.forEach(item => { const ci = catalog?.find(c => c.id === item.itemId); if (ci?.trackStock !== false) updateDocumentNonBlocking(doc(db, 'products_services', item.itemId), { stock: increment(-item.qty) }); });
        if (!isPending && paid !== 0) updateDocumentNonBlocking(doc(db, 'financial_accounts', accId), { initialBalance: increment(paid) });
        if (client && debt !== 0) { const balanceField = curr === 'ARS' ? 'saldoActual' : 'saldoUSD'; updateDocumentNonBlocking(doc(db, 'clients', client.id), { [balanceField]: increment(-debt) }); }
      })
    }
    toast({ title: "Operación registrada" }); resetRegisterForm(); setMainView("history");
  }

  const resetRegisterForm = () => {
    setEditingTx(null); setSelectedCustomerId(""); setSelectedItems([]); setTxDescription(""); setManualAmount(0); setOperationDate(new Date().toISOString().split('T')[0]); setPaidAmounts({ ARS: 0, USD: 0 }); setDestinationAccounts({ ARS: "pending", USD: "pending" }); setSelectedExpenseCategoryId(""); setCobroSource("sale"); setItemFilterCategory("all"); setAllocations({});
  }

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    return transactions.filter((tx: any) => {
      const matchCustomer = filterCustomer === "all" || tx.clientId === filterCustomer
      const matchAccount = filterAccount === "all" || (filterAccount === "null" ? !tx.financialAccountId : tx.financialAccountId === filterAccount)
      const txDateStr = tx.date.split('T')[0]; const matchStart = !filterStartDate || txDateStr >= filterStartDate; const matchEnd = !filterEndDate || txDateStr <= filterEndDate;
      let matchFlow = true; if (filterOpType === 'income') matchFlow = tx.amount > 0 || tx.type === 'cobro'; if (filterOpType === 'expense') matchFlow = tx.amount < 0 && tx.type !== 'cobro';
      const matchCategory = filterCategory === "all" || tx.type === filterCategory; const matchExpenseCat = filterExpenseCategory === "all" || tx.expenseCategoryId === filterExpenseCategory;
      return matchCustomer && matchAccount && matchStart && matchEnd && matchFlow && matchCategory && matchExpenseCat
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, filterCustomer, filterAccount, filterStartDate, filterEndDate, filterOpType, filterCategory, filterExpenseCategory])

  const handleOpenWsDialog = (tx: any) => {
    setSelectedTxForWs(tx); setSelectedWsTemplateId(""); setDynamicValues({}); setDynamicKeys([]); setIsWsDialogOpen(true);
  }

  const handleSendWs = () => {
    if (!selectedTxForWs || !selectedWsTemplateId) return
    const template = wsTemplates?.find(t => t.id === selectedWsTemplateId)
    const client = customers?.find(c => c.id === selectedTxForWs.clientId)
    if (!template || !client) return
    let message = template.body
    const symbol = selectedTxForWs.currency === 'USD' ? 'u$s' : '$';
    const replacements: Record<string, string> = { "{{Apellido}}": client.apellido || "", "{{Nombre}}": client.nombre || "", "{{Fecha}}": formatLocalDate(selectedTxForWs.date), "{{Tipo_Operacion}}": txTypeMap[selectedTxForWs.type]?.label || selectedTxForWs.type, "{{Total}}": `${symbol} ${Math.abs(selectedTxForWs.amount).toLocaleString('es-AR')}`, "{{Pendiente_Operacion}}": `${symbol} ${Math.abs(selectedTxForWs.pendingAmount || 0).toLocaleString('es-AR')}`, "{{Saldo_ARS}}": `$ ${Number(client.saldoActual || 0).toLocaleString('es-AR')}`, "{{Saldo_USD}}": `u$s ${Number(client.saldoUSD || 0).toLocaleString('es-AR')}`, "{{Descripción}}": selectedTxForWs.description || "Sin descripción" }
    Object.entries(replacements).forEach(([key, val]) => { message = message.split(key).join(val) })
    Object.entries(dynamicValues).forEach(([key, val]) => { message = message.split(`{{?${key}}}`).join(val) })
    const phone = client.telefono?.replace(/\D/g, ''); window.open(`https://wa.me/${phone || ''}?text=${encodeURIComponent(message)}`, '_blank'); setIsWsDialogOpen(false);
  }

  useEffect(() => {
    if (selectedWsTemplateId) {
      const template = wsTemplates?.find(t => t.id === selectedWsTemplateId)
      if (template) {
        const matches = template.body.match(/\{\{\?([^}]+)\}\}/g) || []
        const keys = matches.map(m => m.replace(/\{\{\?|\}\}/g, ""))
        setDynamicKeys(keys); const initialVals: Record<string, string> = {}; keys.forEach(k => initialVals[k] = ""); setDynamicValues(initialVals);
      }
    }
  }, [selectedWsTemplateId, wsTemplates])

  const allDynamicFieldsFilled = useMemo(() => dynamicKeys.every(k => dynamicValues[k] && dynamicValues[k].trim() !== ""), [dynamicKeys, dynamicValues])

  if (isUserLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 pb-48 md:pb-12 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <h1 className="text-xl md:text-3xl font-bold text-primary font-headline">{editingTx ? "Editar" : "Operaciones"}</h1>
          </div>
          <Tabs value={mainView} onValueChange={(v) => { if(v === "register" && !editingTx) resetRegisterForm(); setMainView(v); }}>
            <TabsList className="bg-muted/40 h-10 p-1 rounded-xl shadow-inner border">
              <TabsTrigger value="register" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary uppercase">NUEVA</TabsTrigger>
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
                     <CardTitle className="text-xl flex items-center gap-2">Registrar {txTypeMap[activeTab]?.label}</CardTitle>
                     <p className="text-xs text-muted-foreground">{txTypeMap[activeTab]?.description}</p>
                   </div>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                      <TabsList className="grid grid-cols-5 w-full h-auto p-1 bg-muted/50 border">
                          {Object.entries(txTypeMap).filter(([k]) => !['Adjustment', 'Expense'].includes(k)).map(([key, info]) => (
                            <TabsTrigger key={key} value={key} className="data-[state=active]:bg-primary data-[state=active]:text-white py-2 flex flex-col gap-1">
                              <info.icon className="h-4 w-4" /><span className="text-[9px] font-black uppercase">{info.label}</span>
                            </TabsTrigger>
                          ))}
                      </TabsList>
                    </Tabs>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/20 rounded-xl">
                  <div className="space-y-2"><Label className="flex items-center gap-2 text-primary font-bold"><User className="h-4 w-4" /> Cliente</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Buscar cliente..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">GLOBAL / SIN CLIENTE</SelectItem>
                        {sortedCustomers.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre} (${Number(c.saldoActual || 0).toLocaleString()})</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label className="flex items-center gap-2 text-primary font-bold"><CalendarIcon className="h-4 w-4" /> Fecha</Label>
                    <Input type="date" value={operationDate} onChange={(e) => setOperationDate(e.target.value)} className="bg-white" />
                  </div>
                </div>
                {['cobro', 'adjustment', 'Adjustment', 'Expense'].includes(activeTab) ? (
                  <div className="p-6 border rounded-xl space-y-4 bg-muted/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2"><Label>Monto</Label><Input type="number" value={manualAmount} onChange={(e) => setManualAmount(Number(e.target.value))} className="bg-white font-bold" /></div>
                      <div className="space-y-2"><Label>Moneda</Label>
                        <Select value={manualCurrency} onValueChange={setManualCurrency}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="ARS">PESOS ($)</SelectItem><SelectItem value="USD">DÓLARES (u$s)</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Caja Destino</Label>
                        <Select value={manualAccountId} onValueChange={setManualAccountId}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="pending">A CUENTA</SelectItem>{accounts?.filter(a => a.currency === manualCurrency).map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    {activeTab === 'cobro' && pendingTxsForClient.length > 0 && (
                      <div className="pt-4 border-t space-y-3">
                        <Label className="font-black text-rose-600 uppercase text-xs">Imputar a facturas pendientes</Label>
                        <div className="border rounded-xl bg-white overflow-hidden">
                          <Table>
                            <TableHeader className="bg-muted/30"><TableRow><TableHead>Fecha</TableHead><TableHead>Operación</TableHead><TableHead className="text-right">Saldo</TableHead><TableHead className="w-32">Monto Aplicar</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {pendingTxsForClient.map(tx => (
                                <TableRow key={tx.id}><TableCell className="text-xs">{formatLocalDate(tx.date)}</TableCell><TableCell><Badge variant="outline" className="text-[9px] uppercase">{txTypeMap[tx.type]?.label}</Badge></TableCell><TableCell className="text-right text-xs font-black text-rose-600">{manualCurrency==='USD'?'u$s':'$'} {Math.abs(tx.pendingAmount).toLocaleString()}</TableCell>
                                  <TableCell><Input type="number" className="h-8 text-center" value={allocations[tx.id] || ""} onChange={(e) => setAllocations({...allocations, [tx.id]: Number(e.target.value)})} /></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Select onValueChange={setItemFilterCategory}><SelectTrigger><SelectValue placeholder="Categoría..." /></SelectTrigger><SelectContent><SelectItem value="all">TODAS</SelectItem>{sortedProductCategories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select>
                      <Select onValueChange={handleAddItem}><SelectTrigger><SelectValue placeholder="Añadir producto..." /></SelectTrigger><SelectContent>{filteredCatalogItems.map(i => (<SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>))}</SelectContent></Select>
                    </div>
                    <div className="border rounded-xl overflow-hidden bg-white/50"><Table><TableHeader className="bg-muted/30"><TableRow><TableHead>Ítem</TableHead><TableHead className="w-20 text-center">Cant.</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader><TableBody>{selectedItems.map((item, i) => (<TableRow key={i}><TableCell className="font-bold text-xs">{item.name}</TableCell><TableCell><Input type="number" value={item.qty} className="h-8 text-center" onChange={(e) => { const n = [...selectedItems]; n[i].qty = Number(e.target.value); setSelectedItems(n); }} /></TableCell><TableCell className="text-right font-black">{(item.price * item.qty).toLocaleString()}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => setSelectedItems(selectedItems.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>))}</TableBody></Table></div>
                  </div>
                )}
                <div className="space-y-2"><Label className="font-bold">Notas</Label><Input value={txDescription} onChange={(e) => setTxDescription(e.target.value)} className="bg-white h-11" /></div>
              </CardContent>
            </Card>
            <Card className="glass-card h-fit sticky top-8">
              <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-base">Confirmar Registro</CardTitle></CardHeader>
              <CardContent className="space-y-6 pt-6">
                {!['cobro', 'adjustment', 'Expense'].includes(activeTab) && (
                  <div className="space-y-4">
                    {['ARS', 'USD'].map(curr => cartTotals[curr as 'ARS'|'USD'] > 0 && (
                      <div key={curr} className="p-4 rounded-xl border bg-primary/5">
                        <div className="flex justify-between mb-2"><span className="text-xs font-bold">Total {curr}:</span><span className="text-lg font-black">{curr==='USD'?'u$s':'$'} {cartTotals[curr as 'ARS'|'USD'].toLocaleString()}</span></div>
                        <Label className="text-[10px] uppercase font-bold">Abonado hoy:</Label><Input type="number" value={paidAmounts[curr]} onChange={(e) => setPaidAmounts({...paidAmounts, [curr]: Number(e.target.value)})} className="h-9 mb-2" />
                        <Label className="text-[10px] uppercase font-bold">Caja:</Label><Select value={destinationAccounts[curr]} onValueChange={(v) => setDestinationAccounts({...destinationAccounts, [curr]: v})}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">A CUENTA</SelectItem>{accounts?.filter(a => a.currency === curr).map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select>
                      </div>
                    ))}
                  </div>
                )}
                <Button className="w-full h-14 font-black shadow-xl" onClick={handleSaveTransaction}>{editingTx ? 'GUARDAR' : 'REGISTRAR'}</Button>
                <Button variant="outline" className="w-full h-12" onClick={() => { resetRegisterForm(); setMainView("history"); }}>CANCELAR</Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="glass-card p-4 flex flex-wrap gap-4 items-end">
                 <div className="space-y-1"><Label className="text-xs">Cliente</Label><Select value={filterCustomer} onValueChange={setFilterCustomer}><SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{sortedCustomers.map(c => (<SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre}</SelectItem>))}</SelectContent></Select></div>
                 <div className="space-y-1"><Label className="text-xs">Caja</Label><Select value={filterAccount} onValueChange={setFilterAccount}><SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{accounts?.map(a => (<SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>))}</SelectContent></Select></div>
                 <Button variant="ghost" size="icon" onClick={() => { setFilterCustomer("all"); setFilterAccount("all"); }}><FilterX className="h-4 w-4" /></Button>
            </Card>
            <Card className="glass-card overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Abonado</TableHead>
                    <TableHead className="text-right">Saldo Caja Post</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx: any) => {
                    const cust = customers?.find(c => c.id === tx.clientId);
                    const info = txTypeMap[tx.type] || { label: tx.type, icon: ShoppingBag, color: "text-slate-600 bg-slate-50" };
                    const symbol = tx.currency === 'USD' ? 'u$s' : '$';
                    return (
                      <TableRow key={tx.id} className="cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => setSelectedTxDetails(tx)}>
                        <TableCell className="text-xs font-medium">{formatLocalDate(tx.date)}</TableCell>
                        <TableCell><span className="font-bold">{cust ? `${cust.apellido}, ${cust.nombre}` : 'Global'}</span></TableCell>
                        <TableCell><Badge variant="outline" className={cn("text-[9px] gap-1", info.color)}><info.icon className="h-3 w-3" />{info.label}</Badge></TableCell>
                        <TableCell className="text-right font-bold">{symbol} {Math.abs(tx.amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs text-emerald-600 font-bold">{symbol} {(tx.paidAmount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs font-mono text-muted-foreground">{tx.accountBalanceAfter !== null ? `${symbol} ${tx.accountBalanceAfter.toLocaleString()}` : "---"}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedTxDetails(tx)}><Info className="h-4 w-4 mr-2" /> Detalle</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenWsDialog(tx)}><MessageSquare className="h-4 w-4 mr-2 text-emerald-600" /> Notificar</DropdownMenuItem>
                              {isAdmin && isLatestForAccount(tx) && (
                                <><DropdownMenuItem onClick={() => handleEditTx(tx)}><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setTxToDelete(tx)}><Trash2 className="h-4 w-4 mr-2" /> Eliminar</DropdownMenuItem></>
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
        )}

        <Dialog open={!!selectedTxDetails} onOpenChange={(o) => !o && setSelectedTxDetails(null)}>
          <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-2xl font-black text-primary">Detalle de Operación</DialogTitle></DialogHeader>
            {selectedTxDetails && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/20 rounded-2xl border">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Cliente</Label>
                    <p className="font-bold">{customers?.find(c => c.id === selectedTxDetails.clientId)?.apellido || "Global"}</p>
                  </div>
                  <div className="p-4 bg-muted/20 rounded-2xl border">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Caja Destino</Label>
                    <p className="font-bold">{accounts?.find(a => a.id === selectedTxDetails.financialAccountId)?.name || "A Cuenta"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 border rounded-2xl text-center"><p className="text-[9px] font-black text-blue-700 uppercase">Total</p><p className="text-xl font-black">${Math.abs(selectedTxDetails.amount).toLocaleString()}</p></div>
                  <div className="p-4 bg-emerald-50 border rounded-2xl text-center"><p className="text-[9px] font-black text-emerald-700 uppercase">Abonado</p><p className="text-xl font-black">${(selectedTxDetails.paidAmount || 0).toLocaleString()}</p></div>
                  <div className="p-4 bg-rose-50 border rounded-2xl text-center"><p className="text-[9px] font-black text-rose-700 uppercase">Pendiente</p><p className="text-xl font-black">${Math.abs(selectedTxDetails.pendingAmount || 0).toLocaleString()}</p></div>
                </div>
                {selectedTxDetails.items?.length > 0 && (
                  <div className="border rounded-xl bg-white"><Table><TableHeader className="bg-muted/30"><TableRow><TableHead>Descripción</TableHead><TableHead className="text-center">Cant.</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                    <TableBody>{selectedTxDetails.items.map((it:any, i:number)=>(<TableRow key={i}><TableCell className="text-xs font-bold">{it.name}</TableCell><TableCell className="text-center font-black">{it.qty}</TableCell><TableCell className="text-right font-bold">${(it.price * it.qty).toLocaleString()}</TableCell></TableRow>))}</TableBody></Table></div>
                )}
                {selectedTxDetails.allocations?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase text-emerald-700">Facturas canceladas con este cobro</h4>
                    <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-emerald-50"><TableRow><TableHead>Fecha Factura</TableHead><TableHead>Operación Original</TableHead><TableHead className="text-right">Monto Aplicado</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {selectedTxDetails.allocations.map((alloc: any, i: number) => {
                            const original = transactions?.find(t => t.id === alloc.txId);
                            return (
                              <TableRow key={i}>
                                <TableCell className="text-xs">{original ? formatLocalDate(original.date) : "---"}</TableCell>
                                <TableCell className="text-xs font-bold">{original ? `${txTypeMap[original.type]?.label}: ${original.description}` : "---"}</TableCell>
                                <TableCell className="text-right text-xs font-black text-emerald-700">${alloc.amount.toLocaleString()}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                <div className="p-4 bg-muted/20 rounded-xl border text-sm italic">{selectedTxDetails.description}</div>
              </div>
            )}
            <DialogFooter><Button onClick={() => setSelectedTxDetails(null)} className="w-full font-bold h-12">Cerrar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isWsDialogOpen} onOpenChange={setIsWsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-emerald-600" /> Notificación WhatsApp</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Select value={selectedWsTemplateId} onValueChange={setSelectedWsTemplateId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar Plantilla..." /></SelectTrigger>
                <SelectContent>{wsTemplates?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
              </Select>
              {dynamicKeys.length > 0 && (
                <div className="p-4 bg-blue-50 border rounded-xl space-y-3">
                  {dynamicKeys.map(k => (<div key={k} className="space-y-1"><Label className="text-xs font-bold">{k}</Label><Input value={dynamicValues[k] || ""} onChange={(e) => setDynamicValues({...dynamicValues, [k]: e.target.value})} className="bg-white" /></div>))}
                </div>
              )}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsWsDialogOpen(false)}>Cerrar</Button><Button onClick={handleSendWs} disabled={!selectedWsTemplateId || !allDynamicFieldsFilled} className="bg-emerald-600 hover:bg-emerald-700">Abrir WhatsApp</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!txToDelete} onOpenChange={(o) => !o && setTxToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Se revertirán todos los saldos asociados y el dinero de la caja involucrada.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteTx} className="bg-destructive text-white">Eliminar</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
      <MobileNav />
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><TransactionsContent /></Suspense>
  )
}
