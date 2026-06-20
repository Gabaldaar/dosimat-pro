
"use client"

import { useState, useMemo, useEffect, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  ExternalLink,
  Coins, 
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
  ArrowRightLeft,
  ArrowUpRight,
  ArrowUpCircle,
  ArrowDownCircle,
  Tag,
  HelpCircle,
  Lock,
  Sparkles,
  Plus
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "../../firebase"
import { collection, doc, increment, query, orderBy } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

const txTypeMap: Record<string, { label: string, icon: any, color: string, description: string }> = {
  sale: { label: "Venta", icon: ShoppingBag, color: "text-blue-600 bg-blue-50", description: "Venta general de productos o accesorios." },
  refill: { label: "Reposición", icon: Droplet, color: "text-cyan-600 bg-cyan-50", description: "Servicio de reposición de químicos." },
  service: { label: "Técnico", icon: Wrench, color: "text-indigo-600 bg-indigo-50", description: "Reparaciones o visitas de mantenimiento." },
  cobro: { label: "Cobro", icon: ArrowUpRight, color: "text-emerald-600 bg-emerald-50", description: "Pago recibido del cliente." },
  adjustment: { label: "Ajuste", icon: Settings2, color: "text-slate-600 bg-slate-50", description: "Corrección manual de saldo." },
  Adjustment: { label: "Ajuste", icon: RefreshCw, color: "text-slate-600 bg-slate-50", description: "Ajuste manual." },
  Expense: { label: "Gasto", icon: ArrowDownLeft, color: "text-rose-600 bg-rose-50", description: "Gasto manual registrado." },
  Reposición: { label: "Reposición", icon: Droplet, color: "text-cyan-600 bg-cyan-50", description: "Servicio de reposición de químicos." },
  FinancialTransferOut: { label: "Transferencia (Salida)", icon: ArrowRightLeft, color: "text-amber-600 bg-amber-50", description: "Movimiento entre cajas." },
  FinancialTransferIn: { label: "Transferencia (Entrada)", icon: ArrowRightLeft, color: "text-emerald-600 bg-emerald-50", description: "Movimiento entre cajas." },
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

function getMovementAmount(tx: any): number {
  if (typeof tx.accountMovementAmount === 'number') return tx.accountMovementAmount;
  if (['cobro', 'adjustment', 'Adjustment', 'Expense', 'FinancialTransferIn', 'FinancialTransferOut'].includes(tx.type)) {
    return Number(tx.amount || 0);
  }
  return Number(tx.paidAmount || 0);
}

function getTotalOperationAmount(tx: any): number {
  return Math.abs(Number(tx.amount || 0));
}

function getPendingAmount(tx: any): number {
  const pending = Number(tx.pendingAmount ?? 0);
  return Math.abs(pending) > 0.01 ? Math.abs(pending) : 0;
}

function getEffectivePendingAmount(tx: any, editingTx: any): number {
  let pending = getPendingAmount(tx);
  if (editingTx && editingTx.type === 'cobro' && editingTx.imputations && editingTx.imputations[tx.id]) {
    pending += Number(editingTx.imputations[tx.id]);
  }
  return pending;
}

function TransactionsContent() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const { userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'
  const isStaff = useMemo(() => userData && ['Admin', 'Employee', 'Collaborator', 'Communicator', 'Replenisher'].includes(userData.role), [userData]);
  const searchParams = useSearchParams()
  
  const [mainView, setMainView] = useState("history")
  const [activeTab, setActiveTab] = useState("refill")
  const [editingTx, setEditingTx] = useState<any | null>(null)
  const [txToDelete, setTxToDelete] = useState<any | null>(null)
  const [selectedTxDetails, setSelectedTxDetails] = useState<any | null>(null)

  const [isWsDialogOpen, setIsWsDialogOpen] = useState(false)
  const [isMailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [selectedTxForEmail, setSelectedTxForEmail] = useState<any | null>(null)
  const [selectedTxForWs, setSelectedTxForWs] = useState<any | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [selectedWsTemplateId, setSelectedWsTemplateId] = useState("")
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({})
  const [dynamicKeys, setDynamicKeys] = useState<string[]>([])
  const [processedEmail, setProcessedEmail] = useState({ subject: "", body: "" })
  const [processedWs, setProcessedWs] = useState("")

  const [filterCustomer, setFilterCustomer] = useState("all")
  const [filterAccount, setFilterAccount] = useState("all")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterOpType, setFilterOpType] = useState("all") 
  const [filterFlow, setFilterFlow] = useState("all")
  const [itemFilterCategory, setItemFilterCategory] = useState("all")

  const [exchangeRate, setExchangeRate] = useState(1)
  const [convertedAmountOverride, setConvertedAmountOverride] = useState<number | null>(null)

  const clientsQuery = useMemoFirebase(() => isStaff ? collection(db, 'clients') : null, [db, isStaff])
  const catalogQuery = useMemoFirebase(() => isStaff ? collection(db, 'products_services') : null, [db, isStaff])
  const accountsQuery = useMemoFirebase(() => isStaff ? collection(db, 'financial_accounts') : null, [db, isStaff])
  const txQuery = useMemoFirebase(() => isStaff ? query(collection(db, 'transactions'), orderBy('date', 'desc')) : null, [db, isStaff])
  const wsTemplatesQuery = useMemoFirebase(() => isStaff ? collection(db, 'whatsapp_templates') : null, [db, isStaff])
  const emailTemplatesQuery = useMemoFirebase(() => isStaff ? collection(db, 'email_templates') : null, [db, isStaff])
  const productCatsQuery = useMemoFirebase(() => isStaff ? collection(db, 'product_categories') : null, [db, isStaff])
  const expenseCatsQuery = useMemoFirebase(() => isStaff ? collection(db, 'expense_categories') : null, [db, isStaff])
  const payoutsQuery = useMemoFirebase(() => isStaff ? collection(db, 'payouts') : null, [db, isStaff])

  const { data: customers } = useCollection(clientsQuery)
  const { data: catalog } = useCollection(catalogQuery)
  const { data: accounts } = useCollection(accountsQuery)
  const { data: transactions } = useCollection(txQuery)
  const { data: wsTemplates } = useCollection(wsTemplatesQuery)
  const { data: emailTemplates } = useCollection(emailTemplatesQuery)
  const { data: productCategories } = useCollection(productCatsQuery)
  const { data: expenseCategories } = useCollection(expenseCatsQuery)
  const { data: payouts } = useCollection(payoutsQuery)

  const [hasAutoPopulated, setHasAutoPopulated] = useState(false)

  const getTransferAccountName = useCallback((tx: any, role: 'from' | 'to') => {
    if (!tx) return "Desconocido";
    if (role === 'from') {
      if (tx.transferFromAccountId) {
        const acc = accounts?.find(a => a.id === tx.transferFromAccountId);
        if (acc) return `${acc.name} (${acc.currency})`;
      }
      if (tx.type === 'FinancialTransferOut') {
        const acc = accounts?.find(a => a.id === tx.financialAccountId);
        if (acc) return `${acc.name} (${acc.currency})`;
      } else if (tx.type === 'FinancialTransferIn') {
        const pair = transactions?.find(t => 
          t.type === 'FinancialTransferOut' && 
          t.date === tx.date
        );
        if (pair) {
          const acc = accounts?.find(a => a.id === pair.financialAccountId);
          if (acc) return `${acc.name} (${acc.currency})`;
        }
        const match = tx.description?.match(/Transferencia desde (.+?)(?:\s*\((?:ARS|USD)\))?$/);
        if (match) return match[1];
      }
      return "Desconocido";
    } else {
      if (tx.transferToAccountId) {
        const acc = accounts?.find(a => a.id === tx.transferToAccountId);
        if (acc) return `${acc.name} (${acc.currency})`;
      }
      if (tx.type === 'FinancialTransferIn') {
        const acc = accounts?.find(a => a.id === tx.financialAccountId);
        if (acc) return `${acc.name} (${acc.currency})`;
      } else if (tx.type === 'FinancialTransferOut') {
        const pair = transactions?.find(t => 
          t.type === 'FinancialTransferIn' && 
          t.date === tx.date
        );
        if (pair) {
          const acc = accounts?.find(a => a.id === pair.financialAccountId);
          if (acc) return `${acc.name} (${acc.currency})`;
        }
        const match = tx.description?.match(/Transferencia a (.+?)(?:\s*\((?:ARS|USD)\))?$/);
        if (match) return match[1];
      }
      return "Desconocido";
    }
  }, [accounts, transactions]);

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

  useEffect(() => {
    const txIdParam = searchParams.get('id');
    if (txIdParam && transactions) {
      const found = transactions.find(t => t.id === txIdParam);
      if (found) {
        setSelectedTxDetails(found);
        setMainView("history");
      }
    }
  }, [searchParams, transactions]);

  useEffect(() => {
    if (!catalog || hasAutoPopulated || searchParams.get('fromRoute') !== 'true') return;

    const cloroQty = Number(searchParams.get('cloro') || 0);
    const acidoQty = Number(searchParams.get('acido') || 0);
    const cash = Number(searchParams.get('cash') || 0);
    const notes = searchParams.get('notes') || '';

    const newItems: any[] = [];
    if (cloroQty > 0) {
      const prod = catalog.find((i: any) => i.name.toLowerCase().includes('cloro') && !i.isService);
      if (prod) {
        const curr = (prod.priceARS || 0) > 0 ? 'ARS' : 'USD';
        newItems.push({ itemId: prod.id, name: prod.name, qty: cloroQty, price: curr === 'ARS' ? prod.priceARS : prod.priceUSD, currency: curr, discount: 0 });
      }
    }
    if (acidoQty > 0) {
      const prod = catalog.find((i: any) => (i.name.toLowerCase().includes('acido') || i.name.toLowerCase().includes('ácido')) && !i.isService);
      if (prod) {
        const curr = (prod.priceARS || 0) > 0 ? 'ARS' : 'USD';
        newItems.push({ itemId: prod.id, name: prod.name, qty: acidoQty, price: curr === 'ARS' ? prod.priceARS : prod.priceUSD, currency: curr, discount: 0 });
      }
    }
    if (newItems.length > 0) setSelectedItems(newItems);
    if (cash > 0) setPaidAmounts(prev => ({ ...prev, ARS: cash }));
    if (notes) setTxDescription(notes);
    setHasAutoPopulated(true);
  }, [catalog, searchParams, hasAutoPopulated]);

  const [isEditTransferDialogOpen, setIsEditTransferDialogOpen] = useState(false)
  const [editingTransferData, setEditingTransferData] = useState<any | null>(null)
  const [editExchangeRate, setEditExchangeRate] = useState(1)

  const editFromAcc = useMemo(() => accounts?.find((a: any) => a.id === editingTransferData?.fromId), [accounts, editingTransferData?.fromId]);
  const editToAcc = useMemo(() => accounts?.find((a: any) => a.id === editingTransferData?.toId), [accounts, editingTransferData?.toId]);

  const sortedAccounts = useMemo(() => {
    if (!accounts) return [];
    return [...accounts].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
  }, [accounts]);

  useEffect(() => {
    if (isEditTransferDialogOpen && editFromAcc && editToAcc && editFromAcc.currency !== editToAcc.currency) {
      fetch('https://dolarapi.com/v1/dolares/oficial')
        .then(res => res.json())
        .then(data => {
          if (data && data.venta) {
            setEditExchangeRate(data.venta);
          }
        })
        .catch(err => console.error("Error fetching rate:", err));
    }
  }, [isEditTransferDialogOpen, editFromAcc, editToAcc]);

  const correspondingPayout = useMemo(() => {
    if (!selectedTxDetails || !payouts) return null;
    return payouts.find((p: any) => 
      p.transactionId === selectedTxDetails.id || 
      p.id === selectedTxDetails.payoutId ||
      (selectedTxDetails.description && selectedTxDetails.description.includes(`#${p.id.toUpperCase().slice(0, 6)}`))
    ) || null;
  }, [selectedTxDetails, payouts]);

  const sortedCustomers = useMemo(() => {
    if (!customers) return [];
    return [...customers].sort((a, b) => (a.apellido || "").toLowerCase().localeCompare((b.apellido || "").toLowerCase()));
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
  const [manualCategoryId, setManualCategoryId] = useState("")
  const [adjustmentSign, setAdjustmentSign] = useState<"1" | "-1">("1")
  const [txDescription, setTxDescription] = useState("")
  const [imputations, setImputations] = useState<Record<string, number>>({})

  const selectedAccountForManual = useMemo(() => accounts?.find(a => a.id === manualAccountId), [accounts, manualAccountId]);
  const [showCurrencyMismatch, setShowCurrencyMismatch] = useState(false);
  const isCrossCurrency = useMemo(() => selectedAccountForManual && selectedAccountForManual.currency !== manualCurrency, [selectedAccountForManual, manualCurrency]);
  
  useEffect(() => {
    if (selectedItems.length === 0) return;
    const baseCurr = selectedItems[0].currency;
    const mixed = selectedItems.some(it => it.currency !== baseCurr);
    if (mixed) setShowCurrencyMismatch(true);
  }, [selectedItems]);

  useEffect(() => {
    if (isCrossCurrency) {
      fetch('https://dolarapi.com/v1/dolares/oficial')
        .then(res => res.json())
        .then(data => { if (data?.venta) setExchangeRate(data.venta); })
        .catch(err => console.error("Error fetching rate:", err));
    }
  }, [isCrossCurrency]);

  const finalConvertedAmount = useMemo(() => {
    if (!isCrossCurrency || !selectedAccountForManual) return manualAmount;
    const baseAmount = manualAmount * (activeTab === 'adjustment' ? Number(adjustmentSign) : activeTab === 'Expense' ? -1 : 1);
    if (manualCurrency === 'USD' && selectedAccountForManual.currency === 'ARS') return baseAmount * exchangeRate;
    if (manualCurrency === 'ARS' && selectedAccountForManual.currency === 'USD') return baseAmount / exchangeRate;
    return baseAmount;
  }, [isCrossCurrency, selectedAccountForManual, manualAmount, manualCurrency, exchangeRate, activeTab, adjustmentSign]);

  const customerPendingTxs = useMemo(() => {
    if (!selectedCustomerId || !transactions || selectedCustomerId === "none") return []
    return transactions.filter(tx => {
      if (tx.clientId !== selectedCustomerId || tx.type === 'cobro') return false;
      return getEffectivePendingAmount(tx, editingTx) > 0;
    }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [selectedCustomerId, transactions, editingTx])

  const handleAutoAssign = () => {
    let remaining = manualAmount;
    const newImputations: Record<string, number> = {};
    for (const tx of customerPendingTxs) {
      if (remaining <= 0) break;
      const effectiveDebt = getEffectivePendingAmount(tx, editingTx);
      const assign = Math.min(effectiveDebt, remaining);
      if (assign > 0) {
        newImputations[tx.id] = assign;
        remaining -= assign;
      }
    }
    setImputations(newImputations);
  };

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

    if (tx.type === 'FinancialTransferOut' || tx.type === 'FinancialTransferIn') {
      const isOut = tx.type === 'FinancialTransferOut';
      const txOut = isOut ? tx : transactions?.find((t: any) => t.type === 'FinancialTransferOut' && t.date === tx.date);
      const txIn = !isOut ? tx : transactions?.find((t: any) => t.type === 'FinancialTransferIn' && t.date === tx.date);

      if (!txOut || !txIn) {
        toast({ title: "Error", description: "No se encontró la contrapartida de la transferencia para poder editarla.", variant: "destructive" });
        return;
      }

      const fromId = txOut.transferFromAccountId || txOut.financialAccountId;
      const toId = txIn.transferToAccountId || txIn.financialAccountId;
      const amount = Math.abs(txOut.amount);

      setEditingTransferData({
        txOutId: txOut.id,
        txInId: txIn.id,
        fromId: fromId,
        toId: toId,
        amount: amount,
        description: txOut.description || txIn.description || "",
        date: txOut.date.split('T')[0],
        originalFromId: fromId,
        originalToId: toId,
        originalAmount: amount,
        originalFinalAmountTo: Math.abs(txIn.amount)
      });
      setIsEditTransferDialogOpen(true);
      return;
    }

    setEditingTx(tx);
    setSelectedCustomerId(tx.clientId || "none");
    setOperationDate(tx.date.split('T')[0]);
    setActiveTab(tx.type === 'Reposición' ? 'refill' : tx.type);
    setTxDescription(tx.description || "");
    if (['cobro', 'adjustment', 'Expense'].includes(tx.type)) {
      setManualAmount(Math.abs(tx.originalAmount || tx.amount));
      setManualCurrency(tx.originalCurrency || tx.currency);
      setConvertedAmountOverride(tx.originalAmount ? Math.abs(tx.amount) : null);
      setManualAccountId(tx.financialAccountId || "pending");
      setManualCategoryId(tx.expenseCategoryId || "");
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
    // Prevent saving if items have mixed currencies
    if (selectedItems.length > 0) {
      const baseCurr = selectedItems[0].currency;
      const mixed = selectedItems.some(it => it.currency !== baseCurr);
      if (mixed) {
        toast({ title: "Error", description: "Los ítems contienen diferentes monedas. Por favor, usa operaciones separadas." });
        return;
      }
    }
    if (editingTx) {
      const tx = editingTx;
      if (tx.clientId) {
        const field = (tx.originalCurrency || tx.currency) === 'USD' ? 'saldoUSD' : 'saldoActual';
        const amountToRevert = ['cobro', 'adjustment', 'Expense'].includes(tx.type) ? -Number(tx.originalAmount || tx.amount || 0) : Number(tx.debtAmount || 0);
        updateDocumentNonBlocking(doc(db, 'clients', tx.clientId), { [field]: increment(amountToRevert) });
      }
      if (tx.financialAccountId) {
        const amountToRevert = -Number(getMovementAmount(tx));
        updateDocumentNonBlocking(doc(db, 'financial_accounts', tx.financialAccountId), { initialBalance: increment(amountToRevert) });
      }
      if (tx.type === 'cobro' && tx.imputations) {
        Object.entries(tx.imputations).forEach(([targetId, amount]) => { updateDocumentNonBlocking(doc(db, 'transactions', targetId), { pendingAmount: increment(-Number(amount)) }); });
      }
    }

    const client = selectedCustomerId && selectedCustomerId !== "none" ? customers?.find(c => c.id === selectedCustomerId) : null;
    const finalDateStr = new Date(operationDate + 'T12:00:00').toISOString();

    if (['cobro', 'adjustment', 'Expense'].includes(activeTab)) {
      const txId = editingTx?.id || Math.random().toString(36).substring(2, 11)
      const baseManualAmount = Number(manualAmount) * (activeTab === 'adjustment' ? Number(adjustmentSign) : activeTab === 'Expense' ? -1 : 1);
      const acc = selectedAccountForManual;
      let finalAmountValue = baseManualAmount;
      let finalCurrency = manualCurrency;
      let accountMovementAmount = baseManualAmount;
      if (isCrossCurrency && acc) {
        const sign = (activeTab === 'adjustment' ? Number(adjustmentSign) : activeTab === 'Expense' ? -1 : 1);
        const overrideVal = convertedAmountOverride !== null ? convertedAmountOverride * sign : finalConvertedAmount;
        finalAmountValue = overrideVal; finalCurrency = acc.currency; accountMovementAmount = overrideVal;
      }
      const txData = { id: txId, date: finalDateStr, clientId: selectedCustomerId === "none" ? null : selectedCustomerId, type: activeTab, amount: finalAmountValue, currency: finalCurrency, originalAmount: isCrossCurrency ? baseManualAmount : null, originalCurrency: isCrossCurrency ? manualCurrency : null, description: txDescription || `${txTypeMap[activeTab].label} manual`, financialAccountId: manualAccountId === "pending" ? null : manualAccountId, expenseCategoryId: (activeTab === 'Expense' || activeTab === 'adjustment') ? (manualCategoryId || null) : null, paidAmount: Math.abs(accountMovementAmount), pendingAmount: (activeTab === 'adjustment' && baseManualAmount < 0) ? baseManualAmount : 0, imputations: activeTab === 'cobro' ? imputations : null, accountBalanceAfter: (Number(acc?.initialBalance || 0)) + accountMovementAmount, accountMovementAmount };
      setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })
      if (manualAccountId !== "pending") updateDocumentNonBlocking(doc(db, 'financial_accounts', manualAccountId), { initialBalance: increment(accountMovementAmount) });
      if (client) { const field = manualCurrency === 'ARS' ? 'saldoActual' : 'saldoUSD'; updateDocumentNonBlocking(doc(db, 'clients', client.id), { [field]: increment(baseManualAmount) }); }
      if (activeTab === 'cobro') { Object.entries(imputations).forEach(([targetTxId, amount]) => { updateDocumentNonBlocking(doc(db, 'transactions', targetTxId), { pendingAmount: increment(Number(amount)) }); }); }
    } else {
      ['ARS', 'USD'].forEach(curr => {
        const total = cartTotals[curr as 'ARS' | 'USD']; if (total <= 0) return;
        const paid = Number(paidAmounts[curr] || 0); 
        const debt = total - paid;
        const txId = editingTx?.id || Math.random().toString(36).substring(2, 11);
        const acc = destinationAccounts[curr] !== "pending" ? accounts?.find(a => a.id === destinationAccounts[curr]) : null;
        const txData = { id: txId, date: finalDateStr, clientId: selectedCustomerId === "none" ? null : selectedCustomerId, type: activeTab === 'refill' ? 'Reposición' : activeTab, amount: -Number(total), paidAmount: paid, debtAmount: debt, currency: curr, description: txDescription || `Operación ${txTypeMap[activeTab].label}`, financialAccountId: (destinationAccounts[curr]==="pending" || paid === 0) ? null : destinationAccounts[curr], items: selectedItems.filter(i => i.currency === curr), pendingAmount: -debt, accountBalanceAfter: (Number(acc?.initialBalance || 0)) + paid, accountMovementAmount: paid };
        setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })
        if (destinationAccounts[curr] !== "pending" && paid !== 0) updateDocumentNonBlocking(doc(db, 'financial_accounts', destinationAccounts[curr]), { initialBalance: increment(paid) });
        if (client && debt !== 0) { const field = curr === 'ARS' ? 'saldoActual' : 'saldoUSD'; updateDocumentNonBlocking(doc(db, 'clients', client.id), { [field]: increment(-debt) }); }
      })
    }
    toast({ title: editingTx ? "Operación actualizada" : "Operación registrada" }); resetRegisterForm(); setMainView("history");
  }

  const resetRegisterForm = () => {
    setEditingTx(null); setSelectedCustomerId(""); setSelectedItems([]); setTxDescription(""); setManualAmount(0); setPaidAmounts({ ARS: 0, USD: 0 }); setDestinationAccounts({ ARS: "pending", USD: "pending" }); setImputations({}); setOperationDate(getLocalDateString()); setHasAutoPopulated(false); setConvertedAmountOverride(null); setManualCategoryId("");
  }

  const handleDeleteTx = () => {
    if (!txToDelete) return;
    const tx = txToDelete;

    if (tx.type === 'FinancialTransferOut' || tx.type === 'FinancialTransferIn') {
      const isOut = tx.type === 'FinancialTransferOut';
      const txOut = isOut ? tx : transactions?.find((t: any) => t.type === 'FinancialTransferOut' && t.date === tx.date);
      const txIn = !isOut ? tx : transactions?.find((t: any) => t.type === 'FinancialTransferIn' && t.date === tx.date);

      if (txOut) {
        const fromId = txOut.transferFromAccountId || txOut.financialAccountId;
        updateDocumentNonBlocking(doc(db, 'financial_accounts', fromId), { initialBalance: increment(Math.abs(txOut.amount)) });
        deleteDocumentNonBlocking(doc(db, 'transactions', txOut.id));
      }
      if (txIn) {
        const toId = txIn.transferToAccountId || txIn.financialAccountId;
        updateDocumentNonBlocking(doc(db, 'financial_accounts', toId), { initialBalance: increment(-Math.abs(txIn.amount)) });
        deleteDocumentNonBlocking(doc(db, 'transactions', txIn.id));
      }
      toast({ title: "Transferencia eliminada", description: "Se borraron ambos movimientos y se revirtieron los saldos." });
      setTxToDelete(null);
      return;
    }

    if (tx.clientId) {
      const field = (tx.originalCurrency || tx.currency) === 'USD' ? 'saldoUSD' : 'saldoActual';
      const amountToRevert = ['cobro', 'adjustment', 'Expense'].includes(tx.type) ? -Number(tx.originalAmount || tx.amount || 0) : Number(tx.debtAmount || 0);
      updateDocumentNonBlocking(doc(db, 'clients', tx.clientId), { [field]: increment(amountToRevert) });
    }
    if (tx.financialAccountId) {
      const amountToRevert = -Number(getMovementAmount(tx));
      updateDocumentNonBlocking(doc(db, 'financial_accounts', tx.financialAccountId), { initialBalance: increment(amountToRevert) });
    }
    if (tx.type === 'cobro' && tx.imputations) {
      Object.entries(tx.imputations).forEach(([targetId, amount]) => {
        updateDocumentNonBlocking(doc(db, 'transactions', targetId), { pendingAmount: increment(-Number(amount)) });
      });
    }
    deleteDocumentNonBlocking(doc(db, 'transactions', tx.id));
    toast({ title: "Operación eliminada", description: "Los saldos fueron revertidos." });
    setTxToDelete(null);
  }

  const handleSaveEditedTransfer = () => {
    if (!editingTransferData) return;
    const { 
      txOutId, txInId, fromId, toId, amount, description, date,
      originalFromId, originalToId, originalAmount, originalFinalAmountTo 
    } = editingTransferData;

    const fromAcc = accounts?.find((a: any) => a.id === fromId);
    const toAcc = accounts?.find((a: any) => a.id === toId);

    if (!fromId) {
      toast({ title: "Error", description: "Debe seleccionar la caja de origen", variant: "destructive" });
      return;
    }
    if (!toId) {
      toast({ title: "Error", description: "Debe seleccionar la caja de destino", variant: "destructive" });
      return;
    }
    if (fromId === toId) {
      toast({ title: "Error", description: "La caja de origen y de destino no pueden ser iguales", variant: "destructive" });
      return;
    }
    if (Number(amount) <= 0) {
      toast({ title: "Error", description: "El monto a transferir debe ser mayor a cero", variant: "destructive" });
      return;
    }
    if (!fromAcc || !toAcc) return;

    let finalAmountTo = Number(amount);
    if (fromAcc.currency !== toAcc.currency) {
      if (fromAcc.currency === 'ARS' && toAcc.currency === 'USD') {
        finalAmountTo = Number(amount) / editExchangeRate;
      } else if (fromAcc.currency === 'USD' && toAcc.currency === 'ARS') {
        finalAmountTo = Number(amount) * editExchangeRate;
      }
    }

    setIsEditTransferDialogOpen(false);

    // Revert original balances
    updateDocumentNonBlocking(doc(db, 'financial_accounts', originalFromId), { initialBalance: increment(Number(originalAmount)) });
    updateDocumentNonBlocking(doc(db, 'financial_accounts', originalToId), { initialBalance: increment(-Number(originalFinalAmountTo)) });

    // Apply new balances
    updateDocumentNonBlocking(doc(db, 'financial_accounts', fromId), { initialBalance: increment(-Number(amount)) });
    updateDocumentNonBlocking(doc(db, 'financial_accounts', toId), { initialBalance: increment(finalAmountTo) });

    const finalDate = new Date(date + 'T12:00:00').toISOString();

    // Update transactions
    updateDocumentNonBlocking(doc(db, 'transactions', txOutId), {
      date: finalDate,
      amount: -Number(amount),
      currency: fromAcc.currency,
      financialAccountId: fromId,
      transferFromAccountId: fromId,
      transferToAccountId: toId,
      description: description || `Transferencia a ${toAcc.name} (${toAcc.currency})`,
      accountBalanceAfter: Number(fromAcc.initialBalance || 0) + Number(originalAmount) - Number(amount)
    });

    updateDocumentNonBlocking(doc(db, 'transactions', txInId), {
      date: finalDate,
      amount: finalAmountTo,
      currency: toAcc.currency,
      financialAccountId: toId,
      transferFromAccountId: fromId,
      transferToAccountId: toId,
      description: description || `Transferencia desde ${fromAcc.name} (${fromAcc.currency})`,
      accountBalanceAfter: Number(toAcc.initialBalance || 0) - Number(originalFinalAmountTo) + finalAmountTo
    });

    toast({ title: "Transferencia actualizada con éxito" });
    setEditingTransferData(null);
  };

  const resetFilters = () => {
    setFilterCustomer("all")
    setFilterAccount("all")
    setFilterStartDate("")
    setFilterEndDate("")
    setFilterOpType("all")
    setFilterFlow("all")
  }

  const handlePrintHistory = useCallback(() => {
    if (typeof window !== "undefined") window.print()
  }, [])

  const isLatestForAccount = useCallback((tx: any) => {
    if (!tx?.financialAccountId || !transactions) return true
    const accountTxs = transactions.filter(t => t.financialAccountId === tx.financialAccountId)
    if (accountTxs.length <= 1) return true
    const txTime = new Date(tx.date).getTime()
    return !accountTxs.some(t => new Date(t.date).getTime() > txTime && t.id !== tx.id)
  }, [transactions])

  const extractDynamicKeys = (text: string) => {
    const regex = /\{\{\?([^}]+)\}\}/g
    const keys = new Set<string>()
    let match
    while ((match = regex.exec(text)) !== null) keys.add(match[1])
    return Array.from(keys)
  }

  useEffect(() => {
    let combinedText = ""
    if (isMailDialogOpen && selectedTemplateId) {
      const tpl = emailTemplates?.find(t => t.id === selectedTemplateId)
      if (tpl) combinedText = `${tpl.subject || ""} ${tpl.body || ""}`
    } else if (isWsDialogOpen && selectedWsTemplateId) {
      const tpl = wsTemplates?.find(t => t.id === selectedWsTemplateId)
      if (tpl) combinedText = tpl.body || ""
    }
    const keys = extractDynamicKeys(combinedText)
    setDynamicKeys(prev => {
      if (prev.length === keys.length && prev.every((k, i) => k === keys[i])) return prev;
      return keys;
    })
    setDynamicValues(prev => {
      let hasChanges = false;
      const next: Record<string, string> = {}
      keys.forEach(k => { 
        next[k] = prev[k] || "" 
        if (next[k] !== prev[k]) hasChanges = true;
      })
      if (Object.keys(prev).length !== keys.length) hasChanges = true;
      return hasChanges ? next : prev;
    })
  }, [selectedTemplateId, selectedWsTemplateId, isMailDialogOpen, isWsDialogOpen, emailTemplates, wsTemplates])

  const allDynamicFieldsFilled = useMemo(() => {
    if (dynamicKeys.length === 0) return true
    return dynamicKeys.every(key => dynamicValues[key]?.trim() !== "")
  }, [dynamicKeys, dynamicValues])

  const processMarkers = useCallback((text: string, tx: any) => {
    if (!text || !tx) return text
    let result = text
    const client = tx.clientId ? customers?.find(c => c.id === tx.clientId) : null
    const currencySymbol = tx.currency === "ARS" ? "$" : "u$s"
    const info = txTypeMap[tx.type] || { label: tx.type }
    const acc = accounts?.find(a => a.id === tx.financialAccountId)
    const expenseCat = tx.expenseCategoryId ? expenseCategories?.find(ec => ec.id === tx.expenseCategoryId) : null
    const replacements: Record<string, string> = {
      "{{Apellido}}": client?.apellido || "Global",
      "{{Nombre}}": client?.nombre || "",
      "{{Fecha}}": formatLocalDate(tx.date),
      "{{Tipo_Operacion}}": info.label,
      "{{Categoria_Gasto}}": expenseCat?.name || "N/A",
      "{{Descripción}}": tx.description || "",
      "{{Total}}": `${currencySymbol} ${getTotalOperationAmount(tx).toLocaleString("es-AR")}`,
      "{{Pendiente_Operacion}}": `${currencySymbol} ${getPendingAmount(tx).toLocaleString("es-AR")}`,
      "{{Monto_Abonado}}": `${currencySymbol} ${(tx.paidAmount || 0).toLocaleString("es-AR")}`,
      "{{Caja_Destino}}": acc?.name || "A Cuenta",
      "{{Saldo_Caja_Final}}": tx.accountBalanceAfter != null
        ? `${currencySymbol} ${Number(tx.accountBalanceAfter).toLocaleString("es-AR")}`
        : "N/A",
      "{{Moneda}}": tx.currency || "",
      "{{Metodo_Pago}}": acc?.name || "A Cuenta",
      "{{Saldo_Cuenta}}": `${currencySymbol} ${Number(tx.currency === 'ARS' ? (client?.saldoActual || 0) : (client?.saldoUSD || 0)).toLocaleString("es-AR")}`,
      "{{Saldo_ARS}}": `$ ${Number(client?.saldoActual || 0).toLocaleString("es-AR")}`,
      "{{Saldo_USD}}": `u$s ${Number(client?.saldoUSD || 0).toLocaleString("es-AR")}`,
      "{{Direccion}}": client?.direccion || "",
      "{{Localidad}}": client?.localidad || "",
      "{{Detalle_Items}}": tx.items && tx.items.length > 0 ? tx.items.map((i: any) => `${i.qty}x ${i.name} (${tx.currency === "ARS" ? "$" : "u$s"} ${Number(i.price).toLocaleString("es-AR")})`).join(", ") : "N/A",
      "{{Item}}": tx.items?.[0]?.name || "N/A",
      "{{Cantidad}}": tx.items?.[0]?.qty?.toString() || "N/A",
      "{{Precio}}": `${tx.currency === "ARS" ? "$" : "u$s"} ${Number(tx.items?.[0]?.price || 0).toLocaleString("es-AR")}`,
      "{{Subtotal}}": `${tx.currency === "ARS" ? "$" : "u$s"} ${Number((tx.items?.[0]?.price || 0) * (tx.items?.[0]?.qty || 0)).toLocaleString("es-AR")}`,
      "{{Total_Descuento}}": `${tx.currency === "ARS" ? "$" : "u$s"} ${Number(getTotalOperationAmount(tx) * (tx.items?.[0]?.discount || 0) / 100).toLocaleString("es-AR")}`,
    }
    Object.entries(replacements).forEach(([marker, value]) => { result = result.replaceAll(marker, value) })
    result = result.replace(/\{\{\?([^}]+)\}\}/g, (match, key) => dynamicValues[key] || match)
    return result
  }, [customers, accounts, expenseCategories, dynamicValues])

  useEffect(() => {
    if (!selectedTxForEmail || !selectedTemplateId || !emailTemplates) return
    const tpl = emailTemplates.find(t => t.id === selectedTemplateId)
    if (tpl) {
      setProcessedEmail(prev => {
        const newSubject = processMarkers(tpl.subject, selectedTxForEmail);
        const newBody = processMarkers(tpl.body, selectedTxForEmail);
        if (prev.subject === newSubject && prev.body === newBody) return prev;
        return { subject: newSubject, body: newBody };
      })
    }
  }, [selectedTxForEmail, selectedTemplateId, emailTemplates, processMarkers])

  useEffect(() => {
    if (!selectedTxForWs || !selectedWsTemplateId || !wsTemplates) return
    const tpl = wsTemplates.find(t => t.id === selectedWsTemplateId)
    if (tpl) {
      setProcessedWs(prev => {
        const newBody = processMarkers(tpl.body, selectedTxForWs);
        if (prev === newBody) return prev;
        return newBody;
      })
    }
  }, [selectedTxForWs, selectedWsTemplateId, wsTemplates, processMarkers])

  const handleOpenEmailDialog = (tx: any) => {
    setSelectedTxForEmail(tx)
    setSelectedTemplateId("")
    setDynamicValues({})
    setProcessedEmail({ subject: "", body: "" })
    setIsEmailDialogOpen(true)
  }

  const handleSendEmail = () => {
    if (!allDynamicFieldsFilled || !selectedTxForEmail) return
    const client = selectedTxForEmail.clientId ? customers?.find(c => c.id === selectedTxForEmail.clientId) : null
    const tpl = emailTemplates?.find(t => t.id === selectedTemplateId)
    if (!processedEmail.subject || !processedEmail.body || !tpl) return
    let mailtoLink = `mailto:${client?.mail || ""}?subject=${encodeURIComponent(processedEmail.subject)}&body=${encodeURIComponent(processedEmail.body)}`
    if (tpl.bcc) mailtoLink += `&bcc=${encodeURIComponent(tpl.bcc)}`
    window.location.href = mailtoLink
    setIsEmailDialogOpen(false)
  }

  const handleOpenWsDialog = (tx: any) => {
    setSelectedTxForWs(tx)
    setSelectedWsTemplateId("")
    setDynamicValues({})
    setProcessedWs("")
    setIsWsDialogOpen(true)
  }

  const handleSendWs = () => {
    if (!allDynamicFieldsFilled || !selectedTxForWs) return
    const client = selectedTxForWs.clientId ? customers?.find(c => c.id === selectedTxForWs.clientId) : null
    const phone = client?.telefono?.replace(/\D/g, "")
    if (!phone || !processedWs) return
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(processedWs)}`, "_blank")
    setIsWsDialogOpen(false)
  }

  const handleCopyWhatsApp = (tx: any) => {
    const client = tx.clientId ? customers?.find(c => c.id === tx.clientId) : null
    const info = txTypeMap[tx.type] || { label: tx.type }
    const symbol = tx.currency === "USD" ? "u$s" : "$"
    let text = `*DOSIMAT PRO - DETALLE DE OPERACIÓN*\n\n`
    text += `*Fecha:* ${formatLocalDate(tx.date)}\n`
    text += `*Cliente:* ${client ? `${client.apellido}, ${client.nombre}` : "Global"}\n`
    text += `*Tipo:* ${info.label}\n`
    if (tx.description) text += `*Nota:* ${tx.description}\n`
    text += `\n*Total Operación:* ${symbol} ${getTotalOperationAmount(tx).toLocaleString("es-AR")}\n`
    text += `*Movimiento Caja:* ${symbol} ${getMovementAmount(tx).toLocaleString("es-AR")}\n`
    const pending = getPendingAmount(tx)
    if (pending > 0) text += `*Pendiente:* ${symbol} ${pending.toLocaleString("es-AR")}\n`
    const acc = accounts?.find(a => a.id === tx.financialAccountId)
    if (acc) text += `*Caja:* ${acc.name}\n`
    navigator.clipboard.writeText(text)
    toast({ title: "Copiado al portapapeles" })
  }

  const renderTxActions = (tx: any, isLatest: boolean) => (
    <div className="flex items-center gap-1 justify-end">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); setSelectedTxDetails(tx); }}>
            <Info className="h-4 w-4 text-primary" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-[10px] font-black uppercase">Ficha Completa</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); handleOpenWsDialog(tx); }}>
            <MessageSquare className="h-4 w-4 text-emerald-600" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-[10px] font-black uppercase">WhatsApp</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); handleCopyWhatsApp(tx); }}>
            <Copy className="h-4 w-4 text-slate-600" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-[10px] font-black uppercase">Copiar Detalle</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); handleOpenEmailDialog(tx); }}>
            <Mail className="h-4 w-4 text-blue-600" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-[10px] font-black uppercase">Enviar Email</TooltipContent>
      </Tooltip>
      {isAdmin && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("h-7 w-7 hover:bg-amber-50", !isLatest && "opacity-50")} onClick={(e) => { e.stopPropagation(); handleStartEdit(tx); }} disabled={!isLatest}>
                {isLatest ? <Edit className="h-4 w-4 text-amber-600" /> : <Lock className="h-4 w-4 text-slate-400" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] font-black uppercase">{isLatest ? "Editar" : "Editar (Bloqueado)"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("h-7 w-7 hover:bg-rose-50", !isLatest && "opacity-50")} onClick={(e) => { e.stopPropagation(); setTxToDelete(tx); }} disabled={!isLatest}>
                <Trash2 className="h-4 w-4 text-rose-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] font-black uppercase text-rose-600">{isLatest ? "Eliminar" : "Eliminar (Bloqueado)"}</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  )

  const transactionsWithDynamicBalances = useMemo(() => {
    if (!transactions || filterAccount === "all" || filterAccount === "null") return transactions || [];
    const targetAccount = accounts?.find(a => a.id === filterAccount);
    if (!targetAccount) return transactions;
    const accountTxs = transactions.filter(tx => tx.financialAccountId === filterAccount);
    let runningBalance = Number(targetAccount.initialBalance || 0);
    return accountTxs.map((tx: any) => {
      const movement = getMovementAmount(tx);
      const balanceAtThisPoint = runningBalance;
      runningBalance -= movement;
      return { ...tx, dynamicBalance: balanceAtThisPoint };
    });
  }, [transactions, filterAccount, accounts]);

  const filteredTransactions = useMemo(() => {
    const base = transactionsWithDynamicBalances || [];
    return base.filter((tx: any) => {
      const matchCustomer = filterCustomer === "all" || tx.clientId === filterCustomer
      const matchAccount = filterAccount === "all" || (filterAccount === "null" ? !tx.financialAccountId : tx.financialAccountId === filterAccount)
      const txDateStr = tx.date.split('T')[0];
      const matchStart = !filterStartDate || txDateStr >= filterStartDate;
      const matchEnd = !filterEndDate || txDateStr <= filterEndDate;
      const matchType = filterOpType === "all" || (
        filterOpType === 'Reposición' 
          ? (tx.type === 'Reposición' || tx.type === 'refill') 
          : filterOpType === 'transfer'
            ? (tx.type === 'FinancialTransferIn' || tx.type === 'FinancialTransferOut')
            : tx.type === filterOpType
      );
      const m = getMovementAmount(tx);
      const matchFlow = filterFlow === 'all' || (filterFlow === 'income' ? m > 0 : m < 0);
      return matchCustomer && matchAccount && matchStart && matchEnd && matchType && matchFlow;
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactionsWithDynamicBalances, filterCustomer, filterAccount, filterStartDate, filterEndDate, filterOpType, filterFlow]);

  const filteredTotals = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      const movement = getMovementAmount(tx);
      if (tx.currency === 'ARS') acc.ars += movement;
      if (tx.currency === 'USD') acc.usd += movement;
      return acc;
    }, { ars: 0, usd: 0 })
  }, [filteredTransactions]);

  if (isUserLoading || !isStaff) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-xs font-bold text-muted-foreground uppercase">Verificando acceso...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <AlertDialog open={showCurrencyMismatch} onOpenChange={setShowCurrencyMismatch}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advertencia de moneda</AlertDialogTitle>
            <AlertDialogDescription>Has seleccionado ítems con diferentes monedas. Por favor, asegúrate de que el total y la moneda sean correctos antes de proceder.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex min-h-screen bg-background w-full">
        <div className="no-print w-full flex">
          <Sidebar />
          <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 pb-48 overflow-x-hidden">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="flex" />
                <h1 className="text-xl md:text-3xl font-bold text-primary font-headline uppercase tracking-tighter italic">Operaciones</h1>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <Tabs value={mainView} onValueChange={setMainView} className="shrink-0">
                  <TabsList className="bg-muted/40 h-10 p-1 rounded-xl shadow-inner border">
                    <TabsTrigger value="register" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary uppercase">{editingTx ? 'EDITAR' : 'NUEVA'}</TabsTrigger>
                    <TabsTrigger value="history" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary uppercase">HISTORIAL</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button 
                  onClick={() => { resetRegisterForm(); setMainView("register"); }}
                  className="shadow-lg rounded-full px-6 bg-primary font-bold shrink-0 hidden md:flex"
                >
                  <Plus className="mr-2 h-4 w-4" /> Nueva Operación
                </Button>
              </div>
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
                        <Select value={selectedCustomerId || ""} onValueChange={setSelectedCustomerId}>
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="text-xs font-bold uppercase flex items-center gap-1.5 mb-2">Monto</div>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black opacity-40">{manualCurrency === 'USD' ? 'u$s' : '$'}</span>
                                <Input type="number" value={manualAmount ?? 0} onChange={(e) => setManualAmount(Number(e.target.value))} className="bg-white font-black text-xl h-12 pl-10" />
                              </div>
                            </div>
                            <div className="space-y-2"><Label className="text-xs font-bold uppercase">Moneda</Label>
                              <Tabs value={manualCurrency} onValueChange={setManualCurrency} className="w-full">
                                <TabsList className="grid grid-cols-2 h-12 p-1 border">
                                  <TabsTrigger value="ARS" className="text-[10px] font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white">ARS</TabsTrigger>
                                  <TabsTrigger value="USD" className="text-[10px] font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                                </TabsList>
                              </Tabs>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase">Caja Destino</Label>
                              <Select value={manualAccountId || "pending"} onValueChange={setManualAccountId}>
                                <SelectTrigger className="bg-white h-12"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">A CUENTA (No mueve caja)</SelectItem>
                                  {accounts?.filter(a => a.currency === manualCurrency).map(a => (<SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                            {(activeTab === 'Expense' || activeTab === 'adjustment') && (
                              <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase">Rubro</Label>
                                <Select value={manualCategoryId || ""} onValueChange={setManualCategoryId}>
                                  <SelectTrigger className="bg-white h-12"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                  <SelectContent>{expenseCategories?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                          {activeTab === 'adjustment' && (
                            <div className="pt-4 border-t border-dashed">
                              <Label className="text-xs font-bold uppercase mb-2 block">Sentido</Label>
                              <Select value={adjustmentSign} onValueChange={(v: any) => setAdjustmentSign(v)}>
                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="1">Ingreso (+)</SelectItem><SelectItem value="-1">Egreso (-)</SelectItem></SelectContent>
                              </Select>
                            </div>
                          )}
                          {activeTab === 'cobro' && selectedCustomerId && selectedCustomerId !== "none" && customerPendingTxs.length > 0 && (
                            <div className="pt-4 border-t border-dashed space-y-4">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase">Imputar a Deudas Pendientes</Label>
                                <Button type="button" variant="outline" size="sm" onClick={handleAutoAssign} className="h-7 text-[10px] uppercase font-bold" disabled={manualAmount <= 0}>
                                  <Sparkles className="h-3 w-3 mr-1" /> Auto-asignar
                                </Button>
                              </div>
                              <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
                                <Table>
                                  <TableHeader className="bg-muted/30">
                                    <TableRow>
                                      <TableHead className="text-[9px] font-black uppercase">Fecha / Detalle</TableHead>
                                      <TableHead className="text-right text-[9px] font-black uppercase">Deuda Pendi.</TableHead>
                                      <TableHead className="w-32 text-center text-[9px] font-black uppercase">A Imputar</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {customerPendingTxs.map(tx => {
                                      const effectiveDebt = getEffectivePendingAmount(tx, editingTx);
                                      return (
                                        <TableRow key={tx.id}>
                                          <TableCell>
                                            <div className="font-bold text-xs">{formatLocalDate(tx.date)}</div>
                                            <div className="text-[10px] text-muted-foreground line-clamp-1">{txTypeMap[tx.type]?.label} {tx.description ? `- ${tx.description}` : ''}</div>
                                          </TableCell>
                                          <TableCell className="text-right font-bold text-xs text-rose-600">
                                            {tx.currency === 'USD' ? 'u$s' : '$'} {effectiveDebt.toLocaleString("es-AR")}
                                          </TableCell>
                                          <TableCell>
                                            <Input 
                                              type="number" 
                                              min={0}
                                              max={effectiveDebt}
                                              value={imputations[tx.id] || ''}
                                              onChange={(e) => {
                                                const val = Number(e.target.value);
                                                if (val <= 0) {
                                                  const newImp = { ...imputations };
                                                  delete newImp[tx.id];
                                                  setImputations(newImp);
                                                } else {
                                                  setImputations(prev => ({ ...prev, [tx.id]: val > effectiveDebt ? effectiveDebt : val }));
                                                }
                                              }}
                                              placeholder="0"
                                              className="h-8 text-right font-black"
                                            />
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Categoría</Label>
                            <Select value={itemFilterCategory} onValueChange={setItemFilterCategory}>
                              <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Todas" /></SelectTrigger>
                              <SelectContent className="max-h-60">
                                <SelectItem value="all">TODAS</SelectItem>
                                {sortedProductCategories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-primary">Añadir Ítem</Label>
                            <Select onValueChange={handleAddItem}>
                              <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Buscar..." /></SelectTrigger>
                              <SelectContent className="max-h-60">
                                {filteredCatalogItems.map(i => (<SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="border rounded-xl bg-white shadow-sm overflow-x-auto">
                          <Table className="min-w-[650px]">
                            <TableHeader className="bg-muted/30">
                              <TableRow>
                                <TableHead className="min-w-[150px] text-[9px] font-black uppercase">Ítem</TableHead>
                                <TableHead className="w-[80px] md:w-[100px] text-center text-[9px] uppercase px-1">Cant.</TableHead>
                                <TableHead className="w-[100px] md:w-[120px] text-center text-[9px] uppercase px-1">Precio</TableHead>
                                <TableHead className="w-[140px] md:w-[160px] text-center text-[9px] uppercase px-1">Moneda</TableHead>
                                <TableHead className="w-[80px] md:w-[100px] text-center text-[9px] uppercase px-1">Desc.%</TableHead>
                                <TableHead className="w-[100px] text-right text-[9px] uppercase px-1">Subtotal</TableHead>
                                <TableHead className="w-10 px-1"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedItems.map((item, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-bold text-xs">{item.name}</TableCell>
                                  <TableCell className="p-1">
                                    <Input type="number" min={1} value={item.qty} className="h-8 text-center px-1" onChange={(e) => { const n = [...selectedItems]; n[i].qty = Number(e.target.value); setSelectedItems(n); }} />
                                  </TableCell>
                                  <TableCell className="p-1">
                                    <Input type="number" min={0} value={item.price} className="h-8 text-center px-1" onChange={(e) => { const n = [...selectedItems]; n[i].price = Number(e.target.value); setSelectedItems(n); }} />
                                  </TableCell>
                                  <TableCell className="text-center p-1">
                                    <RadioGroup value={item.currency} onValueChange={(v) => { const n = [...selectedItems]; n[i].currency = v; setSelectedItems(n); }}>
                                      <div className="flex items-center space-x-1 md:space-x-2 justify-center">
                                        <RadioGroupItem value="ARS" id={`currency-ars-${i}`} />
                                        <Label htmlFor={`currency-ars-${i}`} className="text-xs">ARS</Label>
                                        <RadioGroupItem value="USD" id={`currency-usd-${i}`} />
                                        <Label htmlFor={`currency-usd-${i}`} className="text-xs">USD</Label>
                                      </div>
                                    </RadioGroup>
                                  </TableCell>
                                  <TableCell className="p-1">
                                    <Input type="number" min={0} max={100} value={item.discount || 0} className="h-8 text-center px-1" onChange={(e) => { const n = [...selectedItems]; n[i].discount = Number(e.target.value); setSelectedItems(n); }} />
                                  </TableCell>
                                  <TableCell className="text-right font-black text-xs p-1">
                                    {(item.price * item.qty * (1 - (item.discount || 0) / 100)).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="p-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setSelectedItems(selectedItems.filter((_, idx) => idx !== i))}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2 pt-4 border-t border-dashed">
                      <Label className="text-[10px] font-black uppercase">Concepto / Notas</Label>
                      <Input value={txDescription} onChange={(e) => setTxDescription(e.target.value)} className="bg-white h-12 italic" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card h-fit sticky top-8 border-primary/20 shadow-2xl">
                  <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-xs uppercase font-black tracking-widest text-primary">Resumen</CardTitle></CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    {activeTab !== 'cobro' && activeTab !== 'adjustment' && activeTab !== 'Expense' ? (
                      ['ARS', 'USD'].map(curr => {
                        const total = cartTotals[curr as 'ARS'|'USD'];
                        if (total <= 0) return null;
                        return (
                          <div key={curr} className="p-4 rounded-xl border bg-muted/10 space-y-3">
                            <div className="flex justify-between items-center"><span className="text-xs font-black uppercase">Total {curr}:</span><span className="text-xl font-black">{curr==='USD'?'u$s':'$'} {total.toLocaleString()}</span></div>
                            <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-emerald-700">Abonó en el acto:</Label><Input type="number" value={paidAmounts[curr]} onChange={(e) => setPaidAmounts({...paidAmounts, [curr]: Number(e.target.value)})} className="h-10 border-emerald-200 font-black text-emerald-700" /></div>
                            <div className="space-y-1"><Label className="text-[10px] uppercase font-black">Caja:</Label><Select value={destinationAccounts[curr]} onValueChange={(v) => setDestinationAccounts({...destinationAccounts, [curr]: v})}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">A CUENTA</SelectItem>{accounts?.filter(a => a.currency === curr).map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select></div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-5 rounded-2xl border bg-emerald-50 text-emerald-800"><p className="text-[10px] font-black uppercase mb-1">Monto Final</p><p className="text-4xl font-black">{manualCurrency === 'USD' ? 'u$s' : '$'} {manualAmount.toLocaleString()}</p></div>
                    )}
                    <Button className="w-full h-16 font-black text-xl" onClick={handleSaveTransaction}>REGISTRAR</Button>
                    <Button variant="outline" className="w-full h-12 border-rose-600 text-rose-600" onClick={() => { resetRegisterForm(); setMainView("history"); }}>CANCELAR</Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-primary/5 border-l-4 border-l-primary shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Flujo Neto ARS</p><h3 className={cn("text-2xl font-black mt-1", filteredTotals.ars < 0 ? "text-rose-600" : "text-emerald-600")}>${filteredTotals.ars.toLocaleString()}</h3></div><Calculator className="h-8 w-8 text-primary/20" /></CardContent></Card>
                  <Card className="bg-emerald-50 border-l-4 border-l-emerald-500 shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase text-emerald-700/60 tracking-widest">Flujo Neto USD</p><h3 className={cn("text-2xl font-black mt-1", filteredTotals.usd < 0 ? "text-rose-600" : "text-emerald-600")}>u$s {filteredTotals.usd.toLocaleString()}</h3></div><TrendingUp className="h-8 w-8 text-emerald-500/20" /></CardContent></Card>
                </div>

                <Card className="glass-card p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
                    <div className="space-y-1 col-span-2 md:col-span-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Cliente</Label>
                      <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                        <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Todos los clientes" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los clientes</SelectItem>
                          {sortedCustomers.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 col-span-2 md:col-span-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Caja</Label>
                      <Select value={filterAccount} onValueChange={setFilterAccount}>
                        <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Todas las cajas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las cajas</SelectItem>
                          <SelectItem value="null">A CUENTA (Deuda)</SelectItem>
                          {accounts?.map((a: any) => (<SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Flujo</Label>
                      <Select value={filterFlow} onValueChange={setFilterFlow}>
                        <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los flujos</SelectItem>
                          <SelectItem value="income" className="text-emerald-600 font-bold">Ingresos</SelectItem>
                          <SelectItem value="expense" className="text-rose-600 font-bold">Egresos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Operación</Label>
                      <Select value={filterOpType} onValueChange={setFilterOpType}>
                        <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="Reposición">Reposición</SelectItem>
                          <SelectItem value="sale">Venta</SelectItem>
                          <SelectItem value="service">Técnico</SelectItem>
                          <SelectItem value="cobro">Cobro</SelectItem>
                          <SelectItem value="Expense">Gasto</SelectItem>
                          <SelectItem value="adjustment">Ajuste</SelectItem>
                          <SelectItem value="transfer">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Desde</Label>
                      <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="h-10 bg-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Hasta</Label>
                      <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="h-10 bg-white" />
                    </div>
                    <div className="flex gap-2 col-span-2 md:col-span-1">
                      <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={resetFilters} title="Limpiar filtros"><FilterX className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 border-emerald-200 text-emerald-700 bg-emerald-50" onClick={handlePrintHistory} title="Imprimir"><Printer className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredTransactions.map((tx: any) => {
                    const cust = customers?.find(c => c.id === tx.clientId)
                    const acc = accounts?.find(a => a.id === tx.financialAccountId)
                    const info = txTypeMap[tx.type] || { label: tx.type, icon: ShoppingBag, color: "text-slate-600 bg-slate-50" }
                    const Icon = info.icon
                    const symbol = tx.currency === "USD" ? "u$s" : "$"
                    const movement = getMovementAmount(tx)
                    const pending = getPendingAmount(tx)
                    const isLatest = isLatestForAccount(tx)
                    const boxBalance = tx.dynamicBalance ?? tx.accountBalanceAfter
                    return (
                      <Card key={tx.id} className="glass-card p-4 border-l-4 border-l-primary cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTxDetails(tx)}>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-black text-muted-foreground uppercase bg-muted/50 px-2 py-0.5 rounded">{formatLocalDate(tx.date)}</span>
                          <div onClick={(e) => e.stopPropagation()}>{renderTxActions(tx, isLatest)}</div>
                        </div>
                        <h4 className="font-black text-sm mb-2">{cust ? `${cust.apellido}, ${cust.nombre}` : "Global"}</h4>
                        <div className="flex flex-col gap-1 mb-3">
                          <Badge variant="outline" className={cn("text-[9px] font-black uppercase w-fit gap-1", info.color)}><Icon className="h-3 w-3" />{info.label}</Badge>
                          {tx.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{tx.description}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                          <div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Total Operación</p>
                            <p className="font-black">{symbol} {getTotalOperationAmount(tx).toLocaleString("es-AR")}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Mov. Caja</p>
                            <p className={cn("font-black", movement >= 0 ? "text-emerald-600" : "text-rose-600")}>{movement >= 0 ? "+" : "-"}{symbol} {Math.abs(movement).toLocaleString("es-AR")}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Caja</p>
                            <p className="text-xs font-bold">{acc?.name || "A Cuenta"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Saldo Final</p>
                            <p className="text-xs font-black">{boxBalance != null ? `${symbol} ${Number(boxBalance).toLocaleString("es-AR")}` : "—"}</p>
                          </div>
                        </div>
                        {pending > 0 && (
                          <div className="mt-3 pt-3 border-t border-dashed flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-rose-600">Pendiente</span>
                            <span className="text-sm font-black text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">{symbol} {pending.toLocaleString("es-AR")}</span>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            <Dialog open={!!selectedTxDetails} onOpenChange={(o) => { if (!o) setSelectedTxDetails(null) }}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black font-headline text-primary">Ficha de Operación</DialogTitle>
                  <DialogDescription className="font-bold flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3" /> {selectedTxDetails && formatLocalDate(selectedTxDetails.date)}
                  </DialogDescription>
                </DialogHeader>
                {selectedTxDetails && (
                  <div className="space-y-6 py-4">
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['FinancialTransferIn', 'FinancialTransferOut'].includes(selectedTxDetails.type) ? (
                        <>
                          <div className="p-4 bg-rose-50/40 rounded-xl border border-rose-100/50 flex flex-col justify-between relative overflow-hidden group hover:shadow-sm transition-all duration-200">
                            <div className="absolute right-2 top-2 opacity-5">
                              <ArrowUpCircle className="h-16 w-16 text-rose-500 rotate-45" />
                            </div>
                            <Label className="text-[10px] font-bold uppercase text-rose-600 tracking-wider">Caja de Origen</Label>
                            <p className="font-extrabold text-base mt-2 text-rose-700 tracking-tight flex items-center gap-1.5">
                              <ArrowDownCircle className="h-4 w-4 text-rose-500 shrink-0" />
                              {getTransferAccountName(selectedTxDetails, 'from')}
                            </p>
                          </div>
                          <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100/50 flex flex-col justify-between relative overflow-hidden group hover:shadow-sm transition-all duration-200">
                            <div className="absolute right-2 top-2 opacity-5">
                              <ArrowDownCircle className="h-16 w-16 text-emerald-500 -rotate-45" />
                            </div>
                            <Label className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Caja de Destino</Label>
                            <p className="font-extrabold text-base mt-2 text-emerald-700 tracking-tight flex items-center gap-1.5">
                              <ArrowUpCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                              {getTransferAccountName(selectedTxDetails, 'to')}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-3 bg-muted/20 rounded-xl border">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Cliente</Label>
                            <p className="font-bold text-sm mt-1">
                              {customers?.find(c => c.id === selectedTxDetails.clientId)?.apellido || "Global"},{" "}
                              {customers?.find(c => c.id === selectedTxDetails.clientId)?.nombre || ""}
                            </p>
                          </div>
                          <div className="p-3 bg-muted/20 rounded-xl border">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Caja</Label>
                            <p className="font-bold text-sm mt-1">{accounts?.find(a => a.id === selectedTxDetails.financialAccountId)?.name || "A Cuenta"}</p>
                          </div>
                        </>
                      )}
                    </section>
                    <Card className="border-none bg-primary/5 shadow-none">
                      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div>
                          <p className="text-[10px] font-black uppercase text-primary tracking-widest">Total Operación</p>
                          <p className="text-2xl font-black">{selectedTxDetails.currency === "USD" ? "u$s" : "$"} {getTotalOperationAmount(selectedTxDetails).toLocaleString("es-AR")}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Movimiento Caja</p>
                          <p className="text-2xl font-black text-emerald-600">{selectedTxDetails.currency === "USD" ? "u$s" : "$"} {getMovementAmount(selectedTxDetails).toLocaleString("es-AR")}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-rose-600 tracking-widest">Pendiente</p>
                          <p className="text-2xl font-black text-rose-600">{selectedTxDetails.currency === "USD" ? "u$s" : "$"} {getPendingAmount(selectedTxDetails).toLocaleString("es-AR")}</p>
                        </div>
                      </CardContent>
                    </Card>
                    {selectedTxDetails.items?.length > 0 && (
                      <div className="border rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="text-[10px] font-black uppercase">Concepto</TableHead>
                              <TableHead className="text-center text-[10px] font-black uppercase">Cant.</TableHead>
                              <TableHead className="text-right text-[10px] font-black uppercase">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedTxDetails.items.map((item: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell className="text-xs font-medium">{item.name}</TableCell>
                                <TableCell className="text-center text-xs font-bold">{item.qty}</TableCell>
                                <TableCell className="text-right text-xs font-black">
                                  {selectedTxDetails.currency === "USD" ? "u$s" : "$"} {((item.price * item.qty) * (1 - (item.discount || 0) / 100)).toLocaleString("es-AR")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {selectedTxDetails.isPayout && correspondingPayout && (
                      <div className="space-y-4">
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between hover:shadow-sm transition-all duration-200">
                          <div className="space-y-0.5">
                            <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Liquidación Vinculada</Label>
                            <p className="text-xs font-bold text-slate-700">Liquidación de {correspondingPayout.userName}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 font-black uppercase text-xs border-primary text-primary hover:bg-primary/5 gap-1.5"
                            onClick={() => {
                              setSelectedTxDetails(null);
                              router.push(`/payouts?payoutId=${correspondingPayout.id}`);
                            }}
                          >
                            Ver Liquidación <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Coins className="h-3.5 w-3.5" /> Desglose de Conceptos de la Liquidación</Label>
                          <div className="border rounded-xl overflow-hidden bg-white shadow-sm divide-y">
                            {correspondingPayout.items?.filter((it: any) => it.amount !== 0).map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center p-3 text-xs">
                                <span className="font-medium text-slate-700">{item.description}</span>
                                <span className="font-extrabold text-rose-600">
                                  - {item.currency === 'USD' ? 'u$s' : '$'} {Number(item.amount || 0).toLocaleString('es-AR')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-4 bg-muted/30 rounded-xl border text-sm italic text-slate-700 min-h-[60px]">
                      {selectedTxDetails.description || "Sin descripción adicional."}
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" size="sm" onClick={() => handleCopyWhatsApp(selectedTxDetails)}><Copy className="h-4 w-4 mr-2" /> Copiar</Button>
                      <Button variant="outline" size="sm" className="text-emerald-700 border-emerald-200" onClick={() => handleOpenWsDialog(selectedTxDetails)}><MessageSquare className="h-4 w-4 mr-2" /> WhatsApp</Button>
                    </div>
                  </div>
                )}
                <DialogFooter><Button onClick={() => setSelectedTxDetails(null)} className="w-full font-black uppercase">Cerrar</Button></DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isEditTransferDialogOpen} onOpenChange={setIsEditTransferDialogOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle className="text-2xl font-black font-headline text-primary">Editar Transferencia entre Cajas</DialogTitle></DialogHeader>
                {editingTransferData && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Fecha</Label>
                      <Input 
                        type="date" 
                        value={editingTransferData.date} 
                        onChange={(e) => setEditingTransferData({...editingTransferData, date: e.target.value})} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Origen</Label>
                        <Select 
                          value={editingTransferData.fromId} 
                          onValueChange={(v) => setEditingTransferData({...editingTransferData, fromId: v})}
                        >
                          <SelectTrigger><SelectValue placeholder="Caja..." /></SelectTrigger>
                          <SelectContent>
                            {sortedAccounts?.map((a: any) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name} ({a.currency}) - Saldo: {a.currency === 'USD' ? 'u$s' : '$'}{a.initialBalance.toLocaleString('es-AR')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Destino</Label>
                        <Select 
                          value={editingTransferData.toId} 
                          onValueChange={(v) => setEditingTransferData({...editingTransferData, toId: v})}
                        >
                          <SelectTrigger><SelectValue placeholder="Caja..." /></SelectTrigger>
                          <SelectContent>
                            {sortedAccounts?.map((a: any) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name} ({a.currency}) - Saldo: {a.currency === 'USD' ? 'u$s' : '$'}{a.initialBalance.toLocaleString('es-AR')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Monto a transferir ({editFromAcc?.currency || '...' })</Label>
                      <Input 
                        type="number" 
                        value={editingTransferData.amount} 
                        onChange={(e) => setEditingTransferData({...editingTransferData, amount: Number(e.target.value)})} 
                      />
                    </div>
                    {editFromAcc && editToAcc && editFromAcc.currency !== editToAcc.currency && (
                      <div className="p-3 bg-accent/5 rounded border text-xs font-bold flex justify-between">
                        <span>Recibirá estimado en destino ({editToAcc.currency}):</span>
                        <span>
                          {editToAcc.currency === 'USD' ? 'u$s' : '$'}
                          {(editFromAcc.currency === 'ARS' 
                            ? Number(editingTransferData.amount) / editExchangeRate 
                            : Number(editingTransferData.amount) * editExchangeRate
                          ).toLocaleString('es-AR')}
                        </span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Descripción / Notas</Label>
                      <Input 
                        placeholder="Ej: Retiro para sueldos, Pago proveedor..." 
                        value={editingTransferData.description} 
                        onChange={(e) => setEditingTransferData({...editingTransferData, description: e.target.value})} 
                      />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditTransferDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveEditedTransfer}>Guardar Cambios</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isMailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Notificación por Email</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar plantilla..." /></SelectTrigger>
                    <SelectContent>{emailTemplates?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
                  </Select>
                  {dynamicKeys.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-primary/5 rounded-xl border">
                      {dynamicKeys.map(key => (
                        <div key={key} className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase">{key}</Label>
                          <Input value={dynamicValues[key] || ""} onChange={(e) => setDynamicValues({ ...dynamicValues, [key]: e.target.value })} className="h-9 bg-white" />
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedTemplateId && (
                    <div className="p-4 bg-muted/20 rounded border text-xs whitespace-pre-wrap max-h-[240px] overflow-y-auto">
                      <p className="font-bold text-primary mb-2">Asunto: {processedEmail.subject}</p>
                      {processedEmail.body}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cerrar</Button>
                  <Button onClick={handleSendEmail} disabled={!selectedTemplateId || !allDynamicFieldsFilled}>Preparar Email</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isWsDialogOpen} onOpenChange={setIsWsDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-emerald-600" /> WhatsApp</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <Select value={selectedWsTemplateId} onValueChange={setSelectedWsTemplateId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar plantilla..." /></SelectTrigger>
                    <SelectContent>{wsTemplates?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
                  </Select>
                  {dynamicKeys.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      {dynamicKeys.map(key => (
                        <div key={key} className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase">{key}</Label>
                          <Input value={dynamicValues[key] || ""} onChange={(e) => setDynamicValues({ ...dynamicValues, [key]: e.target.value })} className="h-9 bg-white" />
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedWsTemplateId && (
                    <div className="p-4 bg-emerald-50/50 rounded-xl border text-sm whitespace-pre-wrap max-h-[240px] overflow-y-auto">{processedWs}</div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsWsDialogOpen(false)}>Cerrar</Button>
                  <Button onClick={handleSendWs} disabled={!selectedWsTemplateId || !allDynamicFieldsFilled} className="bg-emerald-600 hover:bg-emerald-700"><Send className="mr-2 h-4 w-4" /> Abrir WhatsApp</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog open={!!txToDelete} onOpenChange={(o) => !o && setTxToDelete(null)}>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Confirmar eliminación</AlertDialogTitle><AlertDialogDescription>Se revertirán los saldos. Esta acción es irreversible.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTx} className="bg-destructive">Eliminar y Revertir</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarInset>
        </div>
        <MobileNav />
      </div>
    </TooltipProvider>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <TransactionsContent />
    </Suspense>
  )
}
