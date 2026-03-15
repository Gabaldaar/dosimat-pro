
"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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
  TrendingUp,
  Banknote,
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
  Fingerprint,
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
  Sparkles
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
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
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, increment } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

const txTypeMap: Record<string, { label: string, icon: any, color: string, description: string }> = {
  sale: { label: "Venta", icon: ShoppingBag, color: "text-blue-600 bg-blue-50", description: "Venta general de productos, insumos o accesorios de piscina." },
  refill: { label: "Reposición", icon: Droplet, color: "text-cyan-600 bg-cyan-50", description: "Registro de servicio de reposición de cloro y químicos." },
  service: { label: "Técnico", icon: Wrench, color: "text-indigo-600 bg-indigo-50", description: "Servicios técnicos, reparaciones o visitas de mantenimiento." },
  cobro: { label: "Cobro", icon: Receipt, color: "text-emerald-600 bg-emerald-50", description: "Registro de pago recibido del cliente para cancelar deuda." },
  adjustment: { label: "Ajuste", icon: Settings2, color: "text-slate-600 bg-slate-50", description: "Corrección manual de saldo (Ingresos o Egresos) en la cuenta del cliente." },
  cobro_manual: { label: "Ingreso Manual", icon: Receipt, color: "text-emerald-600 bg-emerald-50", description: "Ingreso directo a caja." },
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
  const { userData } = useUser()
  const isAdmin = userData?.role === 'Admin'
  const searchParams = useSearchParams()
  const clientIdParam = searchParams.get('clientId')
  const accountIdParam = searchParams.get('accountId')
  const modeParam = searchParams.get('mode')

  const [mainView, setMainView] = useState("history")
  const [activeTab, setActiveTab] = useState("refill")
  
  const [editingTx, setEditingTx] = useState<any | null>(null)
  const [txToDelete, setTxToDelete] = useState<any | null>(null)
  const [selectedTxForNote, setSelectedTxForNote] = useState<any | null>(null)

  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [selectedTxForEmail, setSelectedTxForEmail] = useState<any | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [processedEmail, setProcessedEmail] = useState({ subject: "", body: "" })

  const [isWsDialogOpen, setIsWsDialogOpen] = useState(false)
  const [selectedTxForWs, setSelectedTxForWs] = useState<any | null>(null)
  const [selectedWsTemplateId, setSelectedWsTemplateId] = useState("")
  const [processedWs, setProcessedWs] = useState("")

  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({})
  const [dynamicKeys, setDynamicKeys] = useState<string[]>([])

  const [filterCustomer, setFilterCustomer] = useState("all")
  const [filterAccount, setFilterAccount] = useState("all")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterOpType, setFilterOpType] = useState("all") 
  const [filterCategory, setFilterCategory] = useState("all") 
  const [filterExpenseCategory, setFilterExpenseCategory] = useState("all")

  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const txQuery = useMemoFirebase(() => collection(db, 'transactions'), [db])
  const emailTemplatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db])
  const wsTemplatesQuery = useMemoFirebase(() => collection(db, 'whatsapp_templates'), [db])
  const expenseCatsQuery = useMemoFirebase(() => collection(db, 'expense_categories'), [db])

  const { data: customers } = useCollection(clientsQuery)
  const { data: catalog } = useCollection(catalogQuery)
  const { data: accounts } = useCollection(accountsQuery)
  const { data: transactions, isLoading: loadingTx } = useCollection(txQuery)
  const { data: emailTemplates } = useCollection(emailTemplatesQuery)
  const { data: wsTemplates } = useCollection(wsTemplatesQuery)
  const { data: expenseCategories } = useCollection(expenseCatsQuery)

  const sortedCatalog = useMemo(() => {
    if (!catalog) return []
    return [...catalog].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [catalog])

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

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        if (!isEmailDialogOpen && !txToDelete && !selectedTxForNote && !isWsDialogOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isEmailDialogOpen, txToDelete, selectedTxForNote, isWsDialogOpen]);

  const selectedClient = useMemo(() => {
    return customers?.find(c => c.id === (selectedCustomerId || editingTx?.clientId));
  }, [customers, selectedCustomerId, editingTx]);

  useEffect(() => {
    if (clientIdParam) {
      setFilterCustomer(clientIdParam)
      setSelectedCustomerId(clientIdParam)
      if (modeParam === 'new') setMainView("register")
    }
    if (accountIdParam) {
      setFilterAccount(accountIdParam)
      setMainView("history")
    }
  }, [clientIdParam, accountIdParam, modeParam])

  const cartTotals = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      const subtotal = (Number(item.price) || 0) * (Number(item.qty) || 0)
      const discountAmount = subtotal * ((Number(item.discount) || 0) / 100)
      const amount = subtotal - discountAmount
      acc[item.currency as 'ARS' | 'USD'] = (acc[item.currency as 'ARS' | 'USD'] || 0) + amount
      return acc
    }, { ARS: 0, USD: 0 })
  }, [selectedItems])

  const extractDynamicKeys = (text: string) => {
    const regex = /\{\{\?([^}]+)\}\}/g;
    const keys = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
      keys.add(match[1]);
    }
    return Array.from(keys);
  };

  useEffect(() => {
    let combinedText = "";
    if (isEmailDialogOpen && selectedTemplateId) {
      const tpl = emailTemplates?.find(t => t.id === selectedTemplateId);
      if (tpl) combinedText = (tpl.subject || "") + " " + (tpl.body || "");
    } else if (isWsDialogOpen && selectedWsTemplateId) {
      const tpl = wsTemplates?.find(t => t.id === selectedWsTemplateId);
      if (tpl) combinedText = tpl.body || "";
    }

    const keys = extractDynamicKeys(combinedText);
    setDynamicKeys(keys);
    setDynamicValues(prev => {
      const next: Record<string, string> = {};
      keys.forEach(k => {
        next[k] = prev[k] || "";
      });
      return next;
    });
  }, [selectedTemplateId, selectedWsTemplateId, isEmailDialogOpen, isWsDialogOpen, emailTemplates, wsTemplates]);

  const processMarkers = (text: string, tx: any, templateType: 'email' | 'whatsapp') => {
    if (!text || !tx) return text;
    let result = text;
    const client = tx.clientId ? customers?.find(c => c.id === tx.clientId) : null;
    const currencySymbol = tx.currency === 'ARS' ? '$' : 'u$s';
    
    const listaItems = tx.items?.map((i: any) => {
      const itemSubtotal = (Number(i.qty) || 0) * (Number(i.price) || 0);
      const itemDiscountAmt = itemSubtotal * ((Number(i.discount) || 0) / 100);
      const itemTotal = itemSubtotal - itemDiscountAmt;
      let line = `- ${i.qty} x ${i.name} (${currencySymbol}${Number(i.price).toLocaleString('es-AR')})`;
      if (i.discount > 0) line += ` [Bonif ${i.discount}%: -${currencySymbol}${itemDiscountAmt.toLocaleString('es-AR')}]`;
      line += ` = ${currencySymbol}${itemTotal.toLocaleString('es-AR')}`;
      return line;
    }).join('\n') || "N/A";

    const totalDiscount = tx.items?.reduce((sum: number, i: any) => {
      const sub = (Number(i.qty) || 0) * (Number(i.price) || 0);
      return sum + (sub * ((Number(i.discount) || 0) / 100));
    }, 0) || 0;

    let formattedBalance = "Global";
    if (client) {
      const balanceValue = tx.currency === 'ARS' ? (client.saldoActual || 0) : (client.saldoUSD || 0);
      let balanceStatus = "(Sin Deuda)";
      if (balanceValue > 0) balanceStatus = "(Acreedor)";
      if (balanceValue < 0) balanceStatus = "(Deudor)";
      formattedBalance = `${currencySymbol} ${Math.abs(balanceValue).toLocaleString('es-AR')} ${balanceStatus}`;
    }

    const acc = accounts?.find(a => a.id === tx.financialAccountId);
    let metodoPago = "A Cuenta / Pendiente";
    if (acc) {
      if (acc.type === 'Bank') metodoPago = "Transferencia/Depósito bancario";
      else if (acc.type === 'Cash') metodoPago = "Efectivo";
      else metodoPago = acc.name || "Otro";
    }

    const info = txTypeMap[tx.type] || { label: tx.type };
    const expenseCat = tx.expenseCategoryId ? expenseCategories?.find(ec => ec.id === tx.expenseCategoryId) : null;

    const replacements: Record<string, string> = {
      "{{Apellido}}": client?.apellido || "Global",
      "{{Nombre}}": client?.nombre || "Global",
      "{{Fecha}}": formatLocalDate(tx.date),
      "{{Tipo_Operacion}}": info.label,
      "{{Categoria_Gasto}}": expenseCat ? expenseCat.name : "N/A",
      "{{Descripción}}": tx.description || "",
      "{{Total}}": `${currencySymbol} ${Math.abs(tx.amount).toLocaleString('es-AR')}`,
      "{{Total_Descuento}}": `${currencySymbol} ${totalDiscount.toLocaleString('es-AR')}`,
      "{{Monto_Abonado}}": `${currencySymbol} ${(tx.paidAmount || 0).toLocaleString('es-AR')}`,
      "{{Caja_Destino}}": acc ? acc.name : "A Cuenta",
      "{{Saldo_Caja_Final}}": tx.accountBalanceAfter !== undefined && tx.accountBalanceAfter !== null 
        ? `${currencySymbol} ${Number(tx.accountBalanceAfter).toLocaleString('es-AR')}` 
        : "N/A",
      "{{Moneda}}": tx.currency || "",
      "{{Detalle_Items}}": listaItems,
      "{{Item}}": tx.items?.[0]?.name || "N/A",
      "{{Cantidad}}": tx.items?.[0]?.qty?.toString() || "N/A",
      "{{Precio}}": tx.items?.[0]?.price?.toString() || "N/A",
      "{{Subtotal}}": tx.items?.[0] ? ((tx.items[0].qty * tx.items[0].price) * (1 - (tx.items[0].discount / 100))).toLocaleString('es-AR') : "N/A",
      "{{Saldo_ARS}}": `$${(client?.saldoActual || 0).toLocaleString('es-AR')}`,
      "{{Saldo_USD}}": `u$s ${(client?.saldoUSD || 0).toLocaleString('es-AR')}`,
      "{{Saldo_Cuenta}}": formattedBalance,
      "{{Direccion}}": client?.direccion || "N/A",
      "{{Localidad}}": client?.localidad || "N/A",
      "{{Metodo_Pago}}": metodoPago
    }

    Object.entries(replacements).forEach(([marker, value]) => {
      result = result.replaceAll(marker, value);
    });

    const markerRegex = /{{Precio(ARS|USD)_([^}]+)}}/gi;
    result = result.replace(markerRegex, (match, currency, prodName) => {
      const product = catalog?.find(p => p.name.trim().toLowerCase() === prodName.trim().toLowerCase());
      if (product) {
        const price = currency.toUpperCase() === 'USD' ? (product.priceUSD || 0) : (product.priceARS || 0);
        return `${currency.toUpperCase() === 'USD' ? 'u$s' : '$'} ${price.toLocaleString('es-AR')}`;
      }
      return match;
    });

    // Process dynamic inputs {{?Label}}
    const dynamicRegex = /\{\{\?([^}]+)\}\}/g;
    result = result.replace(dynamicRegex, (match, key) => {
      return dynamicValues[key] || match;
    });

    return result;
  };

  useEffect(() => {
    if (selectedTxForEmail && selectedTemplateId && emailTemplates) {
      const tpl = emailTemplates.find(t => t.id === selectedTemplateId)
      if (tpl) {
        setProcessedEmail({ 
          subject: processMarkers(tpl.subject, selectedTxForEmail, 'email'), 
          body: processMarkers(tpl.body, selectedTxForEmail, 'email') 
        });
      }
    }
  }, [selectedTxForEmail, selectedTemplateId, emailTemplates, customers, accounts, catalog, expenseCategories, dynamicValues])

  useEffect(() => {
    if (selectedTxForWs && selectedWsTemplateId && wsTemplates) {
      const tpl = wsTemplates.find(t => t.id === selectedWsTemplateId)
      if (tpl) {
        setProcessedWs(processMarkers(tpl.body, selectedTxForWs, 'whatsapp'));
      }
    }
  }, [selectedTxForWs, selectedWsTemplateId, wsTemplates, customers, accounts, catalog, expenseCategories, dynamicValues])

  const handleAddItem = (itemId: string) => {
    const item = catalog?.find((i: any) => i.id === itemId)
    if (!item) return
    const defaultCurrency = (item.priceARS || 0) > 0 ? 'ARS' : 'USD'
    const defaultPrice = (item.priceARS || 0) > 0 ? item.priceARS : item.priceUSD
    setSelectedItems(prev => [...prev, { itemId: item.id, name: item.name, qty: 1, price: defaultPrice, currency: defaultCurrency, discount: 0 }])
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...selectedItems]
    newItems[index] = { ...newItems[index], [field]: field === 'currency' ? value : Number(value) }
    setSelectedItems(newItems)
  }

  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index))
  }

  const isLatestForAccount = (tx: any) => {
    if (!tx || !tx.financialAccountId || !transactions) return true;
    const accountTxs = transactions.filter(t => t.financialAccountId === tx.financialAccountId);
    if (accountTxs.length <= 1) return true;
    const txTime = new Date(tx.date).getTime();
    return !accountTxs.some(t => new Date(t.date).getTime() > txTime && t.id !== tx.id);
  };

  const handleEditTx = (tx: any) => {
    if (!isAdmin) {
      toast({ title: "Acceso denegado", description: "Solo administradores pueden editar operaciones.", variant: "destructive" })
      return
    }
    if (!isLatestForAccount(tx)) {
      toast({ 
        title: "Operación bloqueada", 
        description: "Solo se puede editar el último movimiento de esta caja para mantener la integridad del saldo acumulado.", 
        variant: "destructive" 
      })
      return
    }
    setEditingTx(tx)
    setSelectedCustomerId(tx.clientId)
    setOperationDate(tx.date.split('T')[0])
    setActiveTab(tx.type)
    setTxDescription(tx.description || "")

    if (tx.type === 'cobro' || tx.type === 'adjustment' || tx.type === 'Expense' || tx.type === 'Adjustment') {
      setManualAmount(Math.abs(tx.amount))
      setManualCurrency(tx.currency)
      setManualAccountId(tx.financialAccountId || "pending")
      if (tx.type === 'adjustment' || tx.type === 'Adjustment') setAdjustmentSign(tx.amount >= 0 ? "1" : "-1")
      setSelectedExpenseCategoryId(tx.expenseCategoryId || "")
      if (tx.type === 'cobro') setCobroSource(tx.relatedType || 'sale')
    } else {
      setSelectedItems(tx.items || [])
      setDestinationAccounts({ [tx.currency]: tx.financialAccountId || "pending" })
      setPaidAmounts({ [tx.currency]: tx.paidAmount || 0 })
    }
    setMainView("register")
  }

  const revertTxBalances = (tx: any) => {
    const balanceField = tx.currency === 'ARS' ? 'saldoActual' : 'saldoUSD'
    const type = tx.type?.toLowerCase()
    
    if (['cobro', 'adjustment', 'expense'].includes(type)) {
      const amount = Number(tx.amount) || 0
      if (tx.financialAccountId) {
        updateDocumentNonBlocking(doc(db, 'financial_accounts', tx.financialAccountId), { initialBalance: increment(-amount) })
      }
      if (tx.clientId) {
        updateDocumentNonBlocking(doc(db, 'clients', tx.clientId), { [balanceField]: increment(-amount) })
      }
    } else {
      const total = Number(tx.amount) || 0
      const paid = Number(tx.paidAmount) || 0
      const debt = total - paid
      if (tx.financialAccountId && paid !== 0) {
        updateDocumentNonBlocking(doc(db, 'financial_accounts', tx.financialAccountId), { initialBalance: increment(-paid) })
      }
      if (tx.clientId && debt !== 0) {
        updateDocumentNonBlocking(doc(db, 'clients', tx.clientId), { [balanceField]: increment(debt) })
      }
    }
  }

  const confirmDeleteTx = () => {
    if (!txToDelete?.id) return
    if (!isAdmin) {
      toast({ title: "Acceso denegado", description: "Solo administradores pueden eliminar operaciones.", variant: "destructive" })
      return
    }
    if (!isLatestForAccount(txToDelete)) {
      toast({ 
        title: "Eliminación bloqueada", 
        description: "Solo se puede eliminar el último movimiento de esta caja.", 
        variant: "destructive" 
      })
      return
    }
    revertTxBalances(txToDelete)
    deleteDocumentNonBlocking(doc(db, 'transactions', txToDelete.id))
    setTxToDelete(null)
    toast({ title: "Operación eliminada" })
  }

  const handleSaveTransaction = () => {
    const client = selectedCustomerId ? customers?.find(c => c.id === selectedCustomerId) : null;

    if (editingTx) {
      revertTxBalances(editingTx)
      deleteDocumentNonBlocking(doc(db, 'transactions', editingTx.id))
    }

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

      const txData = {
        id: txId,
        date: finalDateStr,
        clientId: selectedCustomerId || null,
        type: activeTab,
        amount: finalAmount,
        currency: manualCurrency,
        description: txDescription || `${txTypeMap[activeTab]?.label || activeTab} manual`,
        financialAccountId: manualAccountId === "pending" ? null : manualAccountId,
        paidAmount: (activeTab === 'cobro' || activeTab === 'Expense') ? finalAmount : 0,
        expenseCategoryId: (activeTab === 'Expense') ? (selectedExpenseCategoryId || null) : null,
        relatedType: activeTab === 'cobro' ? cobroSource : null,
        accountBalanceAfter: balanceAfter
      }

      setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })
      
      if (manualAccountId !== "pending") {
        updateDocumentNonBlocking(doc(db, 'financial_accounts', manualAccountId), { initialBalance: increment(finalAmount) })
      }
      
      if (client) {
        const balanceField = manualCurrency === 'ARS' ? 'saldoActual' : 'saldoUSD'
        updateDocumentNonBlocking(doc(db, 'clients', client.id), { [balanceField]: increment(finalAmount) })
      }
    } else {
      if (selectedItems.length === 0) return

      ['ARS', 'USD'].forEach(curr => {
        const total = cartTotals[curr as 'ARS' | 'USD']
        if (total > 0) {
          const txId = Math.random().toString(36).substring(2, 11)
          const accId = destinationAccounts[curr]
          const paid = Number(paidAmounts[curr] || 0)
          const debt = total - paid
          const isPending = !accId || accId === "pending"
          
          let balanceAfter = null;
          if (!isPending && paid !== 0) {
            const acc = accounts?.find(a => a.id === accId)
            if (acc) balanceAfter = Number(acc.initialBalance || 0) + paid;
          }

          const txData = {
            id: txId,
            date: finalDateStr,
            clientId: selectedCustomerId || null,
            type: activeTab,
            amount: Number(total),
            paidAmount: paid,
            debtAmount: debt,
            currency: curr,
            description: txDescription || `Operación ${txTypeMap[activeTab]?.label.toUpperCase()}`,
            financialAccountId: (isPending || paid === 0) ? null : accId,
            items: selectedItems.filter(item => item.currency === curr),
            accountBalanceAfter: balanceAfter
          }

          setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })

          if (!isPending && paid !== 0) {
            updateDocumentNonBlocking(doc(db, 'financial_accounts', accId), { initialBalance: increment(paid) })
          }
          
          if (client && debt !== 0) {
            const balanceField = curr === 'ARS' ? 'saldoActual' : 'saldoUSD'
            updateDocumentNonBlocking(doc(db, 'clients', client.id), { [balanceField]: increment(-debt) })
          }
        }
      })
    }

    toast({ title: "Operación registrada" })
    resetRegisterForm()
    setMainView("history")
  }

  const resetRegisterForm = () => {
    setEditingTx(null)
    setSelectedCustomerId("")
    setSelectedItems([])
    setTxDescription("")
    setManualAmount(0)
    setOperationDate(new Date().toISOString().split('T')[0])
    setPaidAmounts({ ARS: 0, USD: 0 })
    setDestinationAccounts({ ARS: "pending", USD: "pending" })
    setSelectedExpenseCategoryId("")
    setCobroSource("sale")
  }

  const resetFilters = () => {
    setFilterCustomer("all")
    setFilterAccount("all")
    setFilterStartDate("")
    setFilterEndDate("")
    setFilterOpType("all")
    setFilterCategory("all")
    setFilterExpenseCategory("all")
  }

  const handleOpenEmailDialog = (tx: any) => {
    setSelectedTxForEmail(tx)
    setSelectedTemplateId("")
    setDynamicValues({})
    setProcessedEmail({ subject: "", body: "" })
    setIsEmailDialogOpen(true)
  }

  const handleSendEmail = () => {
    const client = selectedTxForEmail.clientId ? customers?.find(c => c.id === selectedTxForEmail.clientId) : null;
    const tpl = emailTemplates?.find(t => t.id === selectedTemplateId)
    if (!processedEmail.subject || !processedEmail.body || !tpl) return
    const recipient = client?.mail || ""
    let mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(processedEmail.subject)}&body=${encodeURIComponent(processedEmail.body)}`
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
    const client = selectedTxForWs.clientId ? customers?.find(c => c.id === selectedTxForWs.clientId) : null;
    const phone = client?.telefono?.replace(/\D/g, '')
    if (!phone || !processedWs) return
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(processedWs)}`, '_blank')
    setIsWsDialogOpen(false)
  }

  const handleCopyWhatsApp = (tx: any) => {
    const client = tx.clientId ? customers?.find(c => c.id === tx.clientId) : null;
    const info = txTypeMap[tx.type] || { label: tx.type };
    const dateStr = formatLocalDate(tx.date);
    const currencySymbol = tx.currency === 'USD' ? 'u$s' : '$';
    let text = `*DOSIMAT PRO - DETALLE DE OPERACIÓN*\n\n`;
    text += `*Fecha:* ${dateStr}\n`;
    text += `*Cliente:* ${client ? `${client.apellido}, ${client.nombre}` : 'Global'}\n`;
    text += `*Tipo:* ${info.label}\n`;
    if (tx.expenseCategoryId && expenseCategories) {
      const cat = expenseCategories.find(c => c.id === tx.expenseCategoryId);
      if (cat) text += `*Categoría:* ${cat.name}\n`;
    }
    if (tx.description) text += `*Nota:* ${tx.description}\n`;
    if (tx.items && tx.items.length > 0) {
      text += `\n*Detalle:*\n`;
      tx.items.forEach((item: any) => {
        const lineSubtotal = (item.qty || 0) * (item.price || 0);
        const lineDiscountAmt = lineSubtotal * ((item.discount || 0) / 100);
        const lineTotal = lineSubtotal - lineDiscountAmt;
        text += `- ${item.qty} x ${item.name} (${currencySymbol}${item.price.toLocaleString('es-AR')})`;
        if (item.discount > 0) text += ` [Bonif ${item.discount}%: -${currencySymbol}${lineDiscountAmt.toLocaleString('es-AR')}]`;
        text += ` = ${currencySymbol}${lineTotal.toLocaleString('es-AR')}\n`;
      });
    }
    text += `\n*Total:* ${currencySymbol}${Math.abs(tx.amount || 0).toLocaleString('es-AR')}\n`;
    if (tx.paidAmount !== undefined) {
      text += `*Abonado:* ${currencySymbol}${tx.paidAmount.toLocaleString('es-AR')}\n`;
      const debt = (tx.amount || 0) - (tx.paidAmount || 0);
      if (debt > 0) text += `*Pendiente:* ${currencySymbol}${debt.toLocaleString('es-AR')}\n`;
    }
    const acc = accounts?.find(a => a.id === tx.financialAccountId);
    if (acc) text += `*Caja:* ${acc.name}\n`;
    else if (tx.type !== 'adjustment' && tx.type !== 'Adjustment' && tx.type !== 'Expense' && (!tx.paidAmount || tx.paidAmount === 0)) text += `*Estado:* A Cuenta\n`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Detalles de la operación copiados al portapapeles." });
  }

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    return transactions.filter((tx: any) => {
      const matchCustomer = filterCustomer === "all" || tx.clientId === filterCustomer
      const matchAccount = filterAccount === "all" || (filterAccount === "null" ? !tx.financialAccountId : tx.financialAccountId === filterAccount)
      const txDateStr = tx.date.split('T')[0]
      const matchStart = !filterStartDate || txDateStr >= filterStartDate
      const matchEnd = !filterEndDate || txDateStr <= filterEndDate
      let matchFlow = true
      if (filterOpType === 'income') matchFlow = tx.amount > 0 || tx.type === 'cobro'
      if (filterOpType === 'expense') matchFlow = tx.amount < 0 && tx.type !== 'cobro'
      const matchCategory = filterCategory === "all" || tx.type === filterCategory
      const matchExpenseCat = filterExpenseCategory === "all" || tx.expenseCategoryId === filterExpenseCategory
      return matchCustomer && matchAccount && matchStart && matchEnd && matchFlow && matchCategory && matchExpenseCat
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, filterCustomer, filterAccount, filterStartDate, filterEndDate, filterOpType, filterCategory, filterExpenseCategory])

  const filteredTotals = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      acc[tx.currency as 'ARS' | 'USD'] = (acc[tx.currency as 'ARS' | 'USD'] || 0) + (tx.amount || 0)
      return acc
    }, { ARS: 0, USD: 0 })
  }, [filteredTransactions])

  const isManualForm = useMemo(() => ['cobro', 'adjustment', 'Adjustment', 'Expense'].includes(activeTab), [activeTab]);

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 pb-48 md:pb-12 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <div className="flex items-center gap-2 md:hidden pr-2 border-r">
               <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20"><Droplets className="h-4 w-4 text-white" /></div>
               <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">Dosimat<span className="text-accent-foreground">Pro</span></span>
            </div>
            <h1 className="text-xl md:text-3xl font-bold text-primary font-headline">{editingTx ? "Editar" : "Operaciones"}</h1>
          </div>
          <Tabs value={mainView} onValueChange={(v) => { if(v === "register" && !editingTx) resetRegisterForm(); setMainView(v); }}>
            <TabsList>
              <TabsTrigger value="register">{editingTx ? "Modificando" : "Nueva"}</TabsTrigger>
              <TabsTrigger value="history">Operaciones</TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        {mainView === "register" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            <Card className="lg:col-span-2 glass-card border-t-4 border-t-primary">
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div className="space-y-1">
                     <CardTitle className="text-xl flex items-center gap-2">
                       {activeTab === 'cobro' ? <Receipt className="h-5 w-5 text-emerald-600" /> : 
                        (activeTab === 'adjustment' || activeTab === 'Adjustment') ? <Settings2 className="h-5 w-5 text-slate-600" /> :
                        activeTab === 'sale' ? <ShoppingBag className="h-5 w-5 text-blue-600" /> :
                        activeTab === 'refill' ? <Droplet className="h-5 w-5 text-cyan-600" /> :
                        activeTab === 'Expense' ? <ArrowDownLeft className="h-5 w-5 text-rose-600" /> :
                        <Wrench className="h-5 w-5 text-indigo-600" />}
                       {txTypeMap[activeTab]?.label || activeTab}
                     </CardTitle>
                     <p className="text-xs text-muted-foreground">{txTypeMap[activeTab]?.description}</p>
                   </div>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                      <TabsList className="grid grid-cols-5 w-full h-auto p-1 bg-muted/50 border shadow-inner">
                          {Object.entries(txTypeMap).filter(([k]) => !['Adjustment', 'Expense', 'cobro_manual'].includes(k)).map(([key, info]) => {
                            const Icon = info.icon
                            return (
                              <TabsTrigger key={key} value={key} className={`data-[state=active]:bg-primary data-[state=active]:text-white py-2 flex flex-col gap-1`}>
                                <Icon className="h-4 w-4" />
                                <span className="text-[9px] font-black tracking-tighter uppercase">{info.label}</span>
                              </TabsTrigger>
                            )
                          })}
                      </TabsList>
                    </Tabs>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/20 rounded-xl">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary font-bold"><User className="h-4 w-4" /> Cliente</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Buscar cliente..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">SIN CLIENTE (OPERACIÓN GLOBAL)</SelectItem>
                        {sortedCustomers.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.apellido}, {c.nombre} (Saldo: ${Number(c.saldoActual || 0).toLocaleString('es-AR')} / u$s {Number(c.saldoUSD || 0).toLocaleString('es-AR')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary font-bold"><CalendarIcon className="h-4 w-4" /> Fecha</Label>
                    <Input type="date" value={operationDate} onChange={(e) => setOperationDate(e.target.value)} className="bg-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Descripción / Notas</Label>
                  <Input placeholder="Detalles adicionales..." value={txDescription} onChange={(e) => setTxDescription(e.target.value)} className="bg-white" />
                </div>
                {isManualForm ? (
                  <div className={cn("p-6 border rounded-xl space-y-4 bg-muted/5")}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Monto</Label>
                        <Input type="number" value={manualAmount} onChange={(e) => setManualAmount(Number(e.target.value))} className="bg-white font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label>Moneda</Label>
                        <Select value={manualCurrency} onValueChange={setManualCurrency}>
                          <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="ARS">Pesos ($)</SelectItem><SelectItem value="USD">Dólares (u$s)</SelectItem></SelectContent>
                        </Select>
                      </div>
                      {(activeTab === 'adjustment' || activeTab === 'Adjustment') && (
                        <div className="space-y-2">
                          <Label>Tipo de Ajuste</Label>
                          <Select value={adjustmentSign} onValueChange={(v: any) => setAdjustmentSign(v)}>
                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="1">A FAVOR (+)</SelectItem><SelectItem value="-1">A CARGO (-)</SelectItem></SelectContent>
                          </Select>
                        </div>
                      )}
                      {activeTab === 'Expense' && (
                        <div className="space-y-2">
                          <Label>Categoría de Gasto</Label>
                          <Select value={selectedExpenseCategoryId} onValueChange={setSelectedExpenseCategoryId}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>{expenseCategories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      )}
                      {activeTab === 'cobro' && (
                        <div className="space-y-2">
                          <Label className="text-emerald-700 font-bold">Origen del Ingreso</Label>
                          <Select value={cobroSource} onValueChange={setCobroSource}>
                            <SelectTrigger className="bg-white border-emerald-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sale">VENTA</SelectItem>
                              <SelectItem value="refill">REPOSICIÓN</SelectItem>
                              <SelectItem value="service">SERVICIO TÉCNICO</SelectItem>
                              <SelectItem value="adjustment">AJUSTES / OTROS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Caja Destino / Origen</Label>
                        <Select value={manualAccountId} onValueChange={setManualAccountId}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Caja..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">A CUENTA</SelectItem>
                            {accounts?.filter(a => a.currency === manualCurrency).map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="font-bold">Agregar ítems</Label>
                        <Select onValueChange={handleAddItem}>
                          <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                          <SelectContent>
                            {sortedCatalog?.map((i: any) => {
                              const priceStr = (i.priceARS || 0) > 0 ? `$${i.priceARS.toLocaleString('es-AR')}` : `u$s ${i.priceUSD.toLocaleString('es-AR')}`;
                              return <SelectItem key={i.id} value={i.id}>{i.name} ({priceStr})</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    <div className="hidden md:block border rounded-xl overflow-x-auto">
                      <Table className="min-w-[800px]">
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead>Ítem</TableHead>
                            <TableHead className="w-20 text-center">Cant.</TableHead>
                            <TableHead className="w-28 text-center">Precio</TableHead>
                            <TableHead className="w-24 text-center">Desc. (%)</TableHead>
                            <TableHead className="w-20 text-center">Moneda</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.map((item, i) => {
                            const sub = (item.price * item.qty) * (1 - (item.discount || 0) / 100);
                            return (
                              <TableRow key={i}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell><Input type="number" value={item.qty} className="h-8 text-center" onChange={(e) => updateItem(i, 'qty', e.target.value)} /></TableCell>
                                <TableCell><Input type="number" value={item.price} className="h-8 text-center" onChange={(e) => updateItem(i, 'price', e.target.value)} /></TableCell>
                                <TableCell>
                                  <div className="relative">
                                    <Input type="number" value={item.discount || 0} className="h-8 text-center pr-5 border-rose-200 text-rose-600 font-bold" onChange={(e) => updateItem(i, 'discount', e.target.value)} />
                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-rose-400">%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Select value={item.currency} onValueChange={(v) => updateItem(i, 'currency', v)}>
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="ARS">$</SelectItem><SelectItem value="USD">u$s</SelectItem></SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-right font-black">{item.currency === 'ARS' ? '$' : 'u$s'} {sub.toLocaleString('es-AR')}</TableCell>
                                <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="md:hidden space-y-3">
                      {selectedItems.map((item, i) => {
                        const sub = (item.price * item.qty) * (1 - (item.discount || 0) / 100);
                        return (
                          <Card key={i} className="p-4 bg-white/50 border-primary/10 relative">
                            <div className="flex justify-between items-start mb-3 pr-8">
                              <div className="font-bold text-sm">{item.name}</div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive absolute top-2 right-2" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cant.</Label>
                                <Input type="number" value={item.qty} className="h-9" onChange={(e) => updateItem(i, 'qty', e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Precio</Label>
                                <Input type="number" value={item.price} className="h-9" onChange={(e) => updateItem(i, 'price', e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-rose-600">Desc. %</Label>
                                <Input type="number" value={item.discount || 0} className="h-9 border-rose-200 text-rose-600" onChange={(e) => updateItem(i, 'discount', e.target.value)} />
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                              <div className="w-24">
                                <Select value={item.currency} onValueChange={(v) => updateItem(i, 'currency', v)}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="ARS">$ (ARS)</SelectItem><SelectItem value="USD">u$s (USD)</SelectItem></SelectContent>
                                </Select>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Subtotal</p>
                                <p className="font-black text-primary">{item.currency === 'ARS' ? '$' : 'u$s'} {sub.toLocaleString('es-AR')}</p>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="glass-card h-fit sticky top-8">
              <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Resumen</CardTitle></CardHeader>
              <CardContent className="space-y-6 pt-6">
                {!isManualForm && (
                  <div className="space-y-4">
                    {['ARS', 'USD'].map(curr => {
                      const total = cartTotals[curr as 'ARS' | 'USD']
                      if (total <= 0) return null
                      return (
                        <div key={curr} className="p-4 rounded-xl border space-y-3 bg-muted/5">
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black uppercase tracking-widest">Total {curr}</p>
                            <p className="text-xl font-black">{curr === 'ARS' ? '$' : 'u$s'} {total.toLocaleString('es-AR')}</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase">Monto a abonar</Label>
                            <Input type="number" value={paidAmounts[curr]} onChange={(e) => setPaidAmounts(prev => ({...prev, [curr]: Number(e.target.value)}))} className="h-9 font-bold bg-white" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase">Caja de destino</Label>
                            <Select value={destinationAccounts[curr]} onValueChange={(v) => setDestinationAccounts(p => ({...p, [curr]: v}))}>
                              <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Pendiente / A Cuenta" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">A CUENTA (Deuda)</SelectItem>
                                {accounts?.filter((a: any) => a.currency === curr).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {paidAmounts[curr] < total && <div className="text-[10px] font-bold text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">Quedará a cuenta: {curr === 'ARS' ? '$' : 'u$s'} {(total - paidAmounts[curr]).toLocaleString('es-AR')}</div>}
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <Button className="w-full h-14 font-black text-md shadow-xl" disabled={(!isManualForm && selectedItems.length === 0) || (isManualForm && manualAmount <= 0)} onClick={handleSaveTransaction}>{editingTx ? 'GUARDAR CAMBIOS' : 'REGISTRAR OPERACIÓN'}</Button>
                  <Button variant="outline" className="w-full h-12 font-bold border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => { resetRegisterForm(); setMainView("history"); }}>{editingTx ? 'CANCELAR EDICIÓN' : 'CANCELAR'}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass-card border-l-4 border-l-primary bg-primary/5">
                <CardContent className="pt-6">
                  <p className="text-[10px] font-bold text-primary uppercase">Total Filtrado ARS</p>
                  <h3 className="text-2xl font-black">${filteredTotals.ARS.toLocaleString('es-AR')}</h3>
                </CardContent>
              </Card>
              <Card className="glass-card border-l-4 border-l-emerald-500 bg-emerald-50/50">
                <CardContent className="pt-6">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">Total Filtrado USD</p>
                  <h3 className="text-2xl font-black">u$s {filteredTotals.USD.toLocaleString('es-AR')}</h3>
                </CardContent>
              </Card>
            </section>
            <Card className="glass-card p-4 flex flex-wrap gap-4 items-end">
                 <div className="space-y-1">
                   <Label className="text-xs">Cliente</Label>
                   <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                     <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Todos</SelectItem>
                       {sortedCustomers.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre}</SelectItem>))}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs">Caja / Destino</Label>
                   <Select value={filterAccount} onValueChange={setFilterAccount}>
                     <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Todas las Cajas</SelectItem>
                       <SelectItem value="null">A CUENTA (Deuda)</SelectItem>
                       {accounts?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs">Flujo</Label>
                   <Select value={filterOpType} onValueChange={setFilterOpType}>
                     <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Todos</SelectItem>
                       <SelectItem value="income" className="text-emerald-600 font-bold">Ingresos</SelectItem>
                       <SelectItem value="expense" className="text-rose-600 font-bold">Egresos</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs">Operación</Label>
                   <Select value={filterCategory} onValueChange={setFilterCategory}>
                     <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Cualquier Tipo</SelectItem>
                       {Object.entries(txTypeMap).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs">Desde</Label>
                   <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-[140px] h-9" />
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs">Hasta</Label>
                   <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-[140px] h-9" />
                 </div>
                 <Button variant="ghost" size="icon" onClick={resetFilters} title="Limpiar Filtros"><FilterX className="h-4 w-4" /></Button>
            </Card>
            <Card className="glass-card overflow-hidden hidden md:block">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Monto Total</TableHead>
                    <TableHead className="text-right">Abonado</TableHead>
                    <TableHead>Caja</TableHead>
                    <TableHead className="text-right">Saldo en Caja</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx: any) => {
                    const cust = customers?.find(c => c.id === tx.clientId);
                    const acc = accounts?.find(a => a.id === tx.financialAccountId);
                    const info = txTypeMap[tx.type] || { label: tx.type, icon: ShoppingBag, color: "text-slate-600 bg-slate-50" };
                    const expenseCat = tx.expenseCategoryId ? expenseCategories?.find(ec => ec.id === tx.expenseCategoryId) : null;
                    const isLatest = isLatestForAccount(tx);
                    
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs font-medium">{formatLocalDate(tx.date)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold">{cust ? `${cust.apellido}, ${cust.nombre}` : 'Global'}</span>
                            {cust?.cuit_dni && <span className="text-[10px] text-muted-foreground uppercase">ID: {cust.cuit_dni}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className={cn("text-[10px] gap-1 w-fit", info.color)}><info.icon className="h-3 w-3" />{info.label}</Badge>
                            {tx.relatedType && <span className="text-[9px] font-bold text-emerald-600 uppercase">{txTypeMap[tx.relatedType]?.label || tx.relatedType}</span>}
                            {expenseCat && <span className="text-[9px] font-bold text-rose-600 flex items-center gap-1"><Tag className="h-2.5 w-2.5" /> {expenseCat.name}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {tx.description ? (
                            <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors" onClick={() => setSelectedTxForNote(tx)}>
                              <span className="text-xs truncate">{tx.description}</span>
                              <Info className="h-3 w-3 shrink-0 text-muted-foreground opacity-50" />
                            </div>
                          ) : <span className="text-[10px] text-muted-foreground italic">Sin nota</span>}
                        </TableCell>
                        <TableCell className="text-right font-black">
                          <span className="flex items-center justify-end gap-1">
                            {tx.amount > 0 ? <ArrowUpCircle className="h-3 w-3 text-emerald-500" /> : <ArrowDownCircle className="h-3 w-3 text-rose-500" />}
                            {tx.currency === 'USD' ? 'u$s' : '$'} {Math.abs(tx.amount || 0).toLocaleString('es-AR')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("text-xs font-bold", tx.paidAmount > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                            {tx.currency === 'USD' ? 'u$s' : '$'} {(tx.paidAmount || 0).toLocaleString('es-AR')}
                          </span>
                        </TableCell>
                        <TableCell>
                          {acc ? <Badge variant="secondary" className="text-[9px] font-bold bg-slate-100 hover:bg-slate-200"><Wallet className="h-3 w-3 mr-1 text-slate-500" /> {acc.name}</Badge> : <span className="text-[10px] text-muted-foreground italic">A Cuenta</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.accountBalanceAfter !== undefined && tx.accountBalanceAfter !== null ? (
                            <span className="text-xs font-black text-slate-600">{tx.currency === 'USD' ? 'u$s' : '$'} {Number(tx.accountBalanceAfter).toLocaleString('es-AR')}</span>
                          ) : <span className="text-[10px] text-muted-foreground">---</span>}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenWsDialog(tx)}><MessageSquare className="h-4 w-4 mr-2 text-emerald-600" /> WhatsApp (Plantilla)</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyWhatsApp(tx)}><Copy className="h-4 w-4 mr-2" /> Copiar Detalle</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEmailDialog(tx)}><Mail className="h-4 w-4 mr-2" /> Enviar Email</DropdownMenuItem>
                              {isAdmin && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleEditTx(tx)} 
                                    disabled={!isLatest} 
                                    className={!isLatest ? "opacity-50" : ""}
                                  >
                                    {isLatest ? <Edit className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                                    Editar {!isLatest && "(Bloqueado)"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className={cn("text-destructive", !isLatest && "opacity-50")} 
                                    onClick={() => setTxToDelete(tx)} 
                                    disabled={!isLatest}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> 
                                    Eliminar {!isLatest && "(Bloqueado)"}
                                  </DropdownMenuItem>
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
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredTransactions.map((tx: any) => {
                const cust = customers?.find(c => c.id === tx.clientId);
                const acc = accounts?.find(a => a.id === tx.financialAccountId);
                const info = txTypeMap[tx.type] || { label: tx.type, icon: ShoppingBag, color: "text-slate-600 bg-slate-50" };
                const debt = (tx.amount || 0) - (tx.paidAmount || 0);
                const expenseCat = tx.expenseCategoryId ? expenseCategories?.find(ec => ec.id === tx.expenseCategoryId) : null;
                const isLatest = isLatestForAccount(tx);
                
                return (
                  <Card key={tx.id} className="glass-card p-4 relative border-l-4 border-l-primary hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/50 px-2 py-0.5 rounded">{formatLocalDate(tx.date)}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-1"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenWsDialog(tx)}><MessageSquare className="h-4 w-4 mr-2 text-emerald-600" /> WhatsApp (Plantilla)</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyWhatsApp(tx)}><Copy className="h-4 w-4 mr-2" /> Copiar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEmailDialog(tx)}><Mail className="h-4 w-4 mr-2" /> Email</DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuItem onClick={() => handleEditTx(tx)} disabled={!isLatest} className={!isLatest ? "opacity-50" : ""}>
                                {isLatest ? <Edit className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className={cn("text-destructive", !isLatest && "opacity-50")} onClick={() => setTxToDelete(tx)} disabled={!isLatest}>
                                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-bold text-md leading-tight">{cust ? `${cust.apellido}, ${cust.nombre}` : 'Global'}{cust?.cuit_dni && <span className="text-[10px] font-normal text-muted-foreground ml-2">({cust.cuit_dni})</span>}</h4>
                      {tx.description && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 bg-muted/10 p-1.5 rounded" onClick={() => setSelectedTxForNote(tx)}>{tx.description}</p>}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className={cn("text-[10px] gap-1", info.color)}><info.icon className="h-3 w-3" />{info.label}</Badge>
                        {tx.relatedType && <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 border-emerald-200 bg-emerald-50 px-2 h-5">{txTypeMap[tx.relatedType]?.label || tx.relatedType}</Badge>}
                        {expenseCat && <Badge variant="outline" className="text-[9px] font-bold text-rose-600 border-rose-200 bg-rose-50 px-2 h-5"><Tag className="h-2.5 w-2.5 mr-1" /> {expenseCat.name}</Badge>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-3 mb-4">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Total</p>
                        <p className="font-black text-sm flex items-center gap-1">{tx.amount > 0 ? <ArrowUpCircle className="h-3 w-3 text-emerald-500" /> : <ArrowDownCircle className="h-3 w-3 text-rose-500" />}{tx.currency === 'USD' ? 'u$s' : '$'} {Math.abs(tx.amount || 0).toLocaleString('es-AR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Abonado</p>
                        <p className={cn("font-black text-sm", tx.paidAmount > 0 ? "text-emerald-600" : "text-slate-400")}>{tx.currency === 'USD' ? 'u$s' : '$'} {(tx.paidAmount || 0).toLocaleString('es-AR')}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-muted/20 -mx-4 -mb-4 p-2 px-4 rounded-b-lg border-t border-primary/5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-[10px] font-bold text-slate-700">{acc ? acc.name : "A Cuenta"}</span>
                        </div>
                        {tx.accountBalanceAfter !== undefined && tx.accountBalanceAfter !== null && (
                          <p className="text-[9px] font-black text-slate-500 mt-0.5">Saldo: {tx.currency === 'USD' ? 'u$s' : '$'}{Number(tx.accountBalanceAfter).toLocaleString('es-AR')}</p>
                        )}
                      </div>
                      {debt > 0 && <Badge variant="destructive" className="text-[9px] h-5 font-bold uppercase tracking-tighter px-2">DEUDA</Badge>}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        <Dialog open={!!selectedTxForNote} onOpenChange={(o) => { if(!o) setSelectedTxForNote(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" /> Detalle de la Operación</DialogTitle><DialogDescription>Información adicional registrada.</DialogDescription></DialogHeader>
            <div className="py-4">
              <div className="p-4 bg-muted/30 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap">{selectedTxForNote?.description || "Sin descripción adicional."}</div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                <div><p>Fecha:</p><p className="text-foreground">{selectedTxForNote && formatLocalDate(selectedTxForNote.date)}</p></div>
                <div><p>Operación:</p><p className="text-foreground">{selectedTxForNote && txTypeMap[selectedTxForNote.type]?.label}</p></div>
              </div>
            </div>
            <DialogFooter><Button onClick={() => setSelectedTxForNote(null)}>Cerrar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Notificación por Email</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Label>Seleccionar Plantilla de Mail</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{emailTemplates?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
              </Select>

              {dynamicKeys.length > 0 && (
                <Card className="border-primary/20 bg-primary/5 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-primary tracking-widest">
                    <Sparkles className="h-4 w-4" /> Datos de la plantilla
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dynamicKeys.map(key => (
                      <div key={key} className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase">{key}</Label>
                        <Input 
                          value={dynamicValues[key] || ""} 
                          onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})}
                          placeholder={`Ingresar ${key}...`}
                          className="h-9 bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {selectedTemplateId && (
                <div className="p-4 bg-muted/20 rounded border space-y-2 max-h-[350px] overflow-y-auto">
                  <div className="sticky top-0 bg-muted/20 pb-2 border-b mb-4"><p className="text-sm font-bold text-primary">Asunto: {processedEmail.subject}</p></div>
                  <p className="text-xs whitespace-pre-wrap italic leading-relaxed">{processedEmail.body}</p>
                </div>
              )}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cerrar</Button><Button onClick={handleSendEmail} disabled={!selectedTemplateId}>Preparar Email</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isWsDialogOpen} onOpenChange={setIsWsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-emerald-600" /> Notificación por WhatsApp</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Label>Seleccionar Plantilla de WhatsApp</Label>
              <Select value={selectedWsTemplateId} onValueChange={setSelectedWsTemplateId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{wsTemplates?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
              </Select>

              {dynamicKeys.length > 0 && (
                <Card className="border-emerald-200 bg-emerald-50/30 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-700 tracking-widest">
                    <Sparkles className="h-4 w-4" /> Datos de la plantilla
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dynamicKeys.map(key => (
                      <div key={key} className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase">{key}</Label>
                        <Input 
                          value={dynamicValues[key] || ""} 
                          onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})}
                          placeholder={`Ingresar ${key}...`}
                          className="h-9 bg-white border-emerald-100"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {selectedWsTemplateId && (
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2 max-h-[350px] overflow-y-auto shadow-inner">
                  <p className="text-sm whitespace-pre-wrap italic leading-relaxed text-slate-700">{processedWs}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsWsDialogOpen(false)}>Cerrar</Button>
              <Button onClick={handleSendWs} disabled={!selectedWsTemplateId} className="bg-emerald-600 hover:bg-emerald-700">
                <Send className="mr-2 h-4 w-4" /> Abrir WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!txToDelete} onOpenChange={(o) => { if(!o) setTxToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Se revertirán todos los saldos asociados y el dinero de la caja involucrada.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteTx} className="bg-destructive">Eliminar</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
      <MobileNav />
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
