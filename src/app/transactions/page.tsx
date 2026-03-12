
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
  Tag
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
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

const txTypeMap: Record<string, { label: string, icon: any, color: string, description: string }> = {
  sale: { label: "Venta", icon: ShoppingBag, color: "text-blue-600 bg-blue-50", description: "Venta general de productos, insumos o accesorios de piscina." },
  refill: { label: "Reposición", icon: Droplet, color: "text-cyan-600 bg-cyan-50", description: "Registro de servicio de reposición de cloro y químicos." },
  service: { label: "Técnico", icon: Wrench, color: "text-indigo-600 bg-indigo-50", description: "Servicios técnicos, reparaciones o visitas de mantenimiento." },
  adjustment: { label: "Ajuste", icon: Settings2, color: "text-slate-600 bg-slate-50", description: "Corrección manual de saldo (Ingresos o Egresos) en la cuenta del cliente." },
  cobro: { label: "Cobro", icon: Receipt, color: "text-emerald-600 bg-emerald-50", description: "Registro de pago recibido del cliente para cancelar deuda." },
  Adjustment: { label: "Ajuste", icon: RefreshCw, color: "text-slate-600 bg-slate-50", description: "Ajuste de saldo manual." },
  Expense: { label: "Gasto", icon: ArrowDownLeft, color: "text-rose-600 bg-rose-50", description: "Gasto manual registrado." },
}

function TransactionsContent() {
  const { toast } = useToast()
  const db = useFirestore()
  const searchParams = useSearchParams()
  const clientIdParam = searchParams.get('clientId')
  const accountIdParam = searchParams.get('accountId')
  const modeParam = searchParams.get('mode')

  const [mainView, setMainView] = useState("history")
  const [activeTab, setActiveTab] = useState("sale")
  
  const [editingTx, setEditingTx] = useState<any | null>(null)
  const [txToDelete, setTxToDelete] = useState<any | null>(null)

  // Email States
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [selectedTxForEmail, setSelectedTxForEmail] = useState<any | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [processedEmail, setProcessedEmail] = useState({ subject: "", body: "" })

  // Filters State
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
  const templatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db])
  const expenseCatsQuery = useMemoFirebase(() => collection(db, 'expense_categories'), [db])

  const { data: customers } = useCollection(clientsQuery)
  const { data: catalog } = useCollection(catalogQuery)
  const { data: accounts } = useCollection(accountsQuery)
  const { data: transactions, isLoading: loadingTx } = useCollection(txQuery)
  const { data: templates } = useCollection(templatesQuery)
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
  const [txDescription, setTxDescription] = useState("")

  // Set default dates on mount: First day of current month to Today
  useEffect(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    
    setFilterStartDate(formatDate(firstDay))
    setFilterEndDate(formatDate(now))
  }, [])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        if (!isEmailDialogOpen && !txToDelete) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isEmailDialogOpen, txToDelete]);

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

  // Cálculo de totales del carrito
  const cartTotals = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      const amount = (Number(item.price) || 0) * (Number(item.qty) || 0)
      acc[item.currency as 'ARS' | 'USD'] = (acc[item.currency as 'ARS' | 'USD'] || 0) + amount
      return acc
    }, { ARS: 0, USD: 0 })
  }, [selectedItems])

  useEffect(() => {
    if (selectedTxForEmail && selectedTemplateId && templates && customers && accounts) {
      const tpl = templates.find(t => t.id === selectedTemplateId)
      const client = customers.find(c => c.id === selectedTxForEmail.clientId)
      
      if (tpl && client) {
        let subject = tpl.subject
        let body = tpl.body
        
        const currencySymbol = selectedTxForEmail.currency === 'ARS' ? '$' : 'u$s';
        
        const listaItems = selectedTxForEmail.items?.map((i: any) => {
          const itemSubtotal = (Number(i.qty) || 0) * (Number(i.price) || 0);
          return `- ${i.qty} x ${i.name} (${currencySymbol}${Number(i.price).toLocaleString('es-AR')}) - ${currencySymbol}${itemSubtotal.toLocaleString('es-AR')}`;
        }).join('\n') || "N/A";

        const balanceValue = selectedTxForEmail.currency === 'ARS' ? (client.saldoActual || 0) : (client.saldoUSD || 0);
        let balanceStatus = "(Sin Deuda)";
        if (balanceValue > 0) balanceStatus = "(Acreedor)";
        if (balanceValue < 0) balanceStatus = "(Deudor)";
        
        const formattedBalance = `${currencySymbol} ${Math.abs(balanceValue).toLocaleString('es-AR')} ${balanceStatus}`;

        const acc = accounts.find(a => a.id === selectedTxForEmail.financialAccountId);
        let metodoPago = "A Cuenta / Pendiente";
        if (acc) {
          if (acc.type === 'Bank') metodoPago = "Transferencia/Depósito bancario";
          else if (acc.type === 'Cash') metodoPago = "Efectivo";
          else metodoPago = acc.name || "Otro";
        }

        const replacements: Record<string, string> = {
          "{{Apellido}}": client.apellido || "",
          "{{Nombre}}": client.nombre || "",
          "{{Fecha}}": new Date(selectedTxForEmail.date).toLocaleDateString('es-AR'),
          "{{Descripción}}": selectedTxForEmail.description || "",
          "{{Total}}": `${currencySymbol} ${Math.abs(selectedTxForEmail.amount).toLocaleString('es-AR')}`,
          "{{Monto_Abonado}}": `${currencySymbol} ${(selectedTxForEmail.paidAmount || 0).toLocaleString('es-AR')}`,
          "{{Caja_Destino}}": acc ? acc.name : "A Cuenta",
          "{{Moneda}}": selectedTxForEmail.currency || "",
          "{{Detalle_Items}}": listaItems,
          "{{Item}}": selectedTxForEmail.items?.[0]?.name || "N/A",
          "{{Cantidad}}": selectedTxForEmail.items?.[0]?.qty?.toString() || "N/A",
          "{{Precio}}": selectedTxForEmail.items?.[0]?.price?.toString() || "N/A",
          "{{Subtotal}}": selectedTxForEmail.items?.[0] ? (selectedTxForEmail.items[0].qty * selectedTxForEmail.items[0].price).toLocaleString('es-AR') : "N/A",
          "{{Saldo_Cuenta}}": formattedBalance,
          "{{Metodo_Pago}}": metodoPago
        }

        Object.entries(replacements).forEach(([marker, value]) => {
          subject = subject.replaceAll(marker, value)
          body = body.replaceAll(marker, value)
        })

        setProcessedEmail({ subject, body })
      }
    }
  }, [selectedTxForEmail, selectedTemplateId, templates, customers, accounts])

  const handleAddItem = (itemId: string) => {
    const item = catalog?.find((i: any) => i.id === itemId)
    if (!item) return
    const defaultCurrency = (item.priceARS || 0) > 0 ? 'ARS' : 'USD'
    const defaultPrice = (item.priceARS || 0) > 0 ? item.priceARS : item.priceUSD
    setSelectedItems(prev => [...prev, { itemId: item.id, name: item.name, qty: 1, price: defaultPrice, currency: defaultCurrency }])
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...selectedItems]
    newItems[index] = { ...newItems[index], [field]: field === 'currency' ? value : Number(value) }
    setSelectedItems(newItems)
  }

  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleEditTx = (tx: any) => {
    setEditingTx(tx)
    setSelectedCustomerId(tx.clientId)
    setOperationDate(tx.date.split('T')[0])
    setActiveTab(tx.type)
    setTxDescription(tx.description || "")

    if (tx.type === 'cobro' || tx.type === 'adjustment') {
      setManualAmount(Math.abs(tx.amount))
      setManualCurrency(tx.currency)
      setManualAccountId(tx.financialAccountId || "pending")
      if (tx.type === 'adjustment') setAdjustmentSign(tx.amount >= 0 ? "1" : "-1")
    } else {
      setSelectedItems(tx.items || [])
      setDestinationAccounts({ [tx.currency]: tx.financialAccountId || "pending" })
      setPaidAmounts({ [tx.currency]: tx.paidAmount || 0 })
    }
    setMainView("register")
  }

  const revertTxBalances = (tx: any) => {
    const client = customers?.find(c => c.id === tx.clientId)
    const acc = accounts?.find(a => a.id === tx.financialAccountId)
    const balanceField = tx.currency === 'ARS' ? 'saldoActual' : 'saldoUSD'
    
    if (tx.type === 'cobro' || tx.type === 'adjustment') {
      const amount = Number(tx.amount) || 0
      if (acc) updateDocumentNonBlocking(doc(db, 'financial_accounts', acc.id), { initialBalance: Number(acc.initialBalance || 0) - amount })
      if (client) updateDocumentNonBlocking(doc(db, 'clients', client.id), { [balanceField]: Number(client[balanceField] || 0) - amount })
    } else {
      const total = Number(tx.amount) || 0
      const paid = Number(tx.paidAmount) || 0
      const debt = total - paid
      if (acc) updateDocumentNonBlocking(doc(db, 'financial_accounts', acc.id), { initialBalance: Number(acc.initialBalance || 0) - paid })
      if (client) updateDocumentNonBlocking(doc(db, 'clients', client.id), { [balanceField]: Number(client[balanceField] || 0) + debt })
    }
  }

  const confirmDeleteTx = () => {
    if (!txToDelete?.id) return
    revertTxBalances(txToDelete)
    deleteDocumentNonBlocking(doc(db, 'transactions', txToDelete.id))
    setTxToDelete(null)
    toast({ title: "Operación eliminada" })
  }

  const handleSaveTransaction = () => {
    if (!selectedCustomerId) {
      toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" })
      return
    }

    const client = customers?.find(c => c.id === selectedCustomerId)
    if (!client) return

    if (editingTx) {
      revertTxBalances(editingTx)
      deleteDocumentNonBlocking(doc(db, 'transactions', editingTx.id))
    }

    if (activeTab === 'cobro' || activeTab === 'adjustment') {
      if (manualAmount <= 0) return
      const txId = Math.random().toString(36).substring(2, 11)
      const multiplier = activeTab === 'adjustment' ? Number(adjustmentSign) : 1
      const finalAmount = Number(manualAmount) * multiplier

      const txData = {
        id: txId,
        date: new Date(operationDate).toISOString(),
        clientId: selectedCustomerId,
        type: activeTab,
        amount: finalAmount,
        currency: manualCurrency,
        description: txDescription || `${txTypeMap[activeTab].label} manual`,
        financialAccountId: manualAccountId === "pending" ? null : manualAccountId,
        paidAmount: activeTab === 'cobro' ? finalAmount : 0
      }

      setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })
      if (manualAccountId !== "pending") {
        const acc = accounts?.find(a => a.id === manualAccountId)
        if (acc) updateDocumentNonBlocking(doc(db, 'financial_accounts', acc.id), { initialBalance: Number(acc.initialBalance || 0) + finalAmount })
      }
      const balanceField = manualCurrency === 'ARS' ? 'saldoActual' : 'saldoUSD'
      updateDocumentNonBlocking(doc(db, 'clients', client.id), { [balanceField]: Number(client[balanceField] || 0) + finalAmount })
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
          
          const txData = {
            id: txId,
            date: new Date(operationDate).toISOString(),
            clientId: selectedCustomerId,
            type: activeTab,
            amount: Number(total),
            paidAmount: paid,
            debtAmount: debt,
            currency: curr,
            description: txDescription || `Operación ${txTypeMap[activeTab]?.label.toUpperCase()}`,
            financialAccountId: (isPending || paid === 0) ? null : accId,
            items: selectedItems.filter(item => item.currency === curr)
          }

          setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })

          if (!isPending && paid > 0) {
            const acc = accounts?.find(a => a.id === accId)
            if (acc) updateDocumentNonBlocking(doc(db, 'financial_accounts', acc.id), { initialBalance: Number(acc.initialBalance || 0) + paid })
          }
          
          if (debt !== 0) {
            const balanceField = curr === 'ARS' ? 'saldoActual' : 'saldoUSD'
            updateDocumentNonBlocking(doc(db, 'clients', client.id), { [balanceField]: Number(client[balanceField] || 0) - debt })
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
  }

  const resetFilters = () => {
    setFilterCustomer("all")
    setFilterAccount("all")
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    setFilterStartDate(formatDate(firstDay))
    setFilterEndDate(formatDate(now))
    setFilterOpType("all")
    setFilterCategory("all")
    setFilterExpenseCategory("all")
  }

  const handleOpenEmailDialog = (tx: any) => {
    const client = customers?.find(c => c.id === tx.clientId)
    if (!client?.mail) {
      toast({ title: "Sin Email", description: "El cliente no tiene un correo registrado.", variant: "destructive" })
      return
    }
    setSelectedTxForEmail(tx)
    setSelectedTemplateId("")
    setProcessedEmail({ subject: "", body: "" })
    setIsEmailDialogOpen(true)
  }

  const handleSendEmail = () => {
    const client = customers?.find(c => c.id === selectedTxForEmail.clientId)
    const tpl = templates?.find(t => t.id === selectedTemplateId)
    if (!client?.mail || !processedEmail.subject || !processedEmail.body || !tpl) return

    let mailtoLink = `mailto:${client.mail}?subject=${encodeURIComponent(processedEmail.subject)}&body=${encodeURIComponent(processedEmail.body)}`
    if (tpl.bcc) mailtoLink += `&bcc=${encodeURIComponent(tpl.bcc)}`
    window.location.href = mailtoLink
    setIsEmailDialogOpen(false)
  }

  const handleCopyWhatsApp = (tx: any) => {
    const client = customers?.find(c => c.id === tx.clientId);
    const info = txTypeMap[tx.type] || { label: tx.type };
    const dateStr = new Date(tx.date).toLocaleDateString('es-AR');
    const currencySymbol = tx.currency === 'USD' ? 'u$s' : '$';

    let text = `*DOSIMAT PRO - DETALLE DE OPERACIÓN*\n\n`;
    text += `📅 *Fecha:* ${dateStr}\n`;
    text += `👤 *Cliente:* ${client ? `${client.apellido}, ${client.nombre}` : 'N/A'}\n`;
    text += `📝 *Tipo:* ${info.label}\n`;
    
    if (tx.expenseCategoryId && expenseCategories) {
      const cat = expenseCategories.find(c => c.id === tx.expenseCategoryId);
      if (cat) text += `🏷️ *Categoría:* ${cat.name}\n`;
    }

    if (tx.description) {
      text += `ℹ️ *Nota:* ${tx.description}\n`;
    }

    if (tx.items && tx.items.length > 0) {
      text += `\n*Detalle:*\n`;
      tx.items.forEach((item: any) => {
        const subtotal = (item.qty || 0) * (item.price || 0);
        text += `- ${item.qty} x ${item.name} (${currencySymbol}${item.price.toLocaleString('es-AR')}) = ${currencySymbol}${subtotal.toLocaleString('es-AR')}\n`;
      });
    }

    text += `\n💰 *Total:* ${currencySymbol}${Math.abs(tx.amount || 0).toLocaleString('es-AR')}\n`;
    
    if (tx.paidAmount !== undefined) {
      text += `✅ *Abonado:* ${currencySymbol}${tx.paidAmount.toLocaleString('es-AR')}\n`;
      const debt = (tx.amount || 0) - (tx.paidAmount || 0);
      if (debt > 0) {
        text += `⚖️ *Pendiente:* ${currencySymbol}${debt.toLocaleString('es-AR')}\n`;
      }
    }

    const acc = accounts?.find(a => a.id === tx.financialAccountId);
    if (acc) {
      text += `🏦 *Caja:* ${acc.name}\n`;
    } else if (tx.type !== 'adjustment' && tx.type !== 'Adjustment' && tx.type !== 'Expense' && (!tx.paidAmount || tx.paidAmount === 0)) {
      text += `💳 *Estado:* A Cuenta\n`;
    }

    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Detalles de la operación copiados al portapapeles."
    });
  }

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    return transactions.filter((tx: any) => {
      const matchCustomer = filterCustomer === "all" || tx.clientId === filterCustomer
      const matchAccount = filterAccount === "all" || (filterAccount === "null" ? !tx.financialAccountId : tx.financialAccountId === filterAccount)
      const txDateStr = tx.date.split('T')[0]
      const matchStart = !filterStartDate || txDateStr >= filterStartDate
      const matchEnd = !filterEndDate || txDateStr <= filterEndDate
      let matchType = true
      if (filterOpType === 'income') matchType = tx.amount > 0 || tx.type === 'cobro'
      if (filterOpType === 'expense') matchType = tx.amount < 0 && tx.type !== 'cobro'
      
      const matchCategory = filterCategory === "all" || tx.type === filterCategory
      const matchExpenseCat = filterExpenseCategory === "all" || tx.expenseCategoryId === filterExpenseCategory

      return matchCustomer && matchAccount && matchStart && matchEnd && matchType && matchCategory && matchExpenseCat
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, filterCustomer, filterAccount, filterStartDate, filterEndDate, filterOpType, filterCategory, filterExpenseCategory])

  const filteredTotals = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      acc[tx.currency as 'ARS' | 'USD'] = (acc[tx.currency as 'ARS' | 'USD'] || 0) + (tx.amount || 0)
      return acc
    }, { ARS: 0, USD: 0 })
  }, [filteredTransactions])

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 pb-48 md:pb-12 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <div className="flex items-center gap-2 md:hidden pr-2 border-r">
               <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
                 <Droplets className="h-4 w-4 text-white" />
               </div>
               <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">Dosimat<span className="text-accent-foreground">Pro</span></span>
            </div>
            <h1 className="text-xl md:text-3xl font-bold text-primary font-headline">
              {editingTx ? "Editar" : "Operaciones"}
            </h1>
          </div>
          <Tabs value={mainView} onValueChange={(v) => { if(v === "register" && !editingTx) resetRegisterForm(); setMainView(v); }}>
            <TabsList>
              <TabsTrigger value="register">{editingTx ? "Modificando" : "Nueva"}</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
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
                        activeTab === 'adjustment' ? <Settings2 className="h-5 w-5 text-slate-600" /> :
                        activeTab === 'sale' ? <ShoppingBag className="h-5 w-5 text-blue-600" /> :
                        activeTab === 'refill' ? <Droplet className="h-5 w-5 text-cyan-600" /> :
                        <Wrench className="h-5 w-5 text-indigo-600" />}
                       {txTypeMap[activeTab]?.label || activeTab}
                     </CardTitle>
                     <p className="text-xs text-muted-foreground">{txTypeMap[activeTab]?.description}</p>
                   </div>
                   {!editingTx && (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                      <TabsList className="grid grid-cols-5 w-full h-auto p-1 bg-muted/50 border shadow-inner">
                          {Object.entries(txTypeMap).filter(([k]) => !['Adjustment', 'Expense'].includes(k)).map(([key, info]) => {
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
                   )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/20 rounded-xl">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary font-bold"><User className="h-4 w-4" /> Cliente</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} disabled={!!editingTx}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Buscar cliente..." /></SelectTrigger>
                      <SelectContent>
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

                {(activeTab === 'cobro' || activeTab === 'adjustment') ? (
                  <div className={cn("p-6 border rounded-xl space-y-4 bg-muted/5")}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Monto</Label>
                        <Input type="number" value={manualAmount} onChange={(e) => setManualAmount(Number(e.target.value))} className="bg-white font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label>Moneda</Label>
                        <Select value={manualCurrency} onValueChange={setManualCurrency} disabled={!!editingTx}>
                          <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="ARS">Pesos ($)</SelectItem><SelectItem value="USD">Dólares (u$s)</SelectItem></SelectContent>
                        </Select>
                      </div>
                      {activeTab === 'adjustment' && (
                        <div className="space-y-2">
                          <Label>Tipo de Ajuste</Label>
                          <Select value={adjustmentSign} onValueChange={(v: any) => setAdjustmentSign(v)}>
                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="1">A FAVOR (+)</SelectItem><SelectItem value="-1">A CARGO (-)</SelectItem></SelectContent>
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
                    {!editingTx && (
                      <div className="space-y-2">
                        <Label className="font-bold">Agregar ítems</Label>
                        <Select onValueChange={handleAddItem}>
                          <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                          <SelectContent>
                            {sortedCatalog?.map((i: any) => {
                              const priceStr = i.priceARS > 0 
                                ? `$${i.priceARS.toLocaleString('es-AR')}` 
                                : `u$s ${i.priceUSD.toLocaleString('es-AR')}`;
                              return (
                                <SelectItem key={i.id} value={i.id}>
                                  {i.name} ({priceStr})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* Items Desktop Table */}
                    <div className="hidden md:block border rounded-xl overflow-x-auto">
                      <Table className="min-w-[700px]">
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead>Ítem</TableHead>
                            <TableHead className="w-24 text-center">Cant.</TableHead>
                            <TableHead className="w-32 text-center">Precio</TableHead>
                            <TableHead className="w-24 text-center">Moneda</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            {!editingTx && <TableHead className="w-12"></TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell><Input type="number" value={item.qty} className="h-8 text-center" onChange={(e) => updateItem(i, 'qty', e.target.value)} /></TableCell>
                              <TableCell><Input type="number" value={item.price} className="h-8 text-center" onChange={(e) => updateItem(i, 'price', e.target.value)} /></TableCell>
                              <TableCell>
                                <Select value={item.currency} onValueChange={(v) => updateItem(i, 'currency', v)} disabled={!!editingTx}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="ARS">$</SelectItem><SelectItem value="USD">u$s</SelectItem></SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right font-black">{item.currency === 'ARS' ? '$' : 'u$s'} {(item.price * item.qty).toLocaleString('es-AR')}</TableCell>
                              {!editingTx && <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></Button></TableCell>}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Items Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {selectedItems.map((item, i) => (
                        <Card key={i} className="p-4 bg-white/50 border-primary/10 relative">
                          <div className="flex justify-between items-start mb-3 pr-8">
                            <div className="font-bold text-sm">{item.name}</div>
                            {!editingTx && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive absolute top-2 right-2" onClick={() => removeItem(i)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cant.</Label>
                              <Input type="number" value={item.qty} className="h-9" onChange={(e) => updateItem(i, 'qty', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Precio</Label>
                              <Input type="number" value={item.price} className="h-9" onChange={(e) => updateItem(i, 'price', e.target.value)} />
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t">
                            <div className="w-24">
                              <Select value={item.currency} onValueChange={(v) => updateItem(i, 'currency', v)} disabled={!!editingTx}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="ARS">$ (ARS)</SelectItem><SelectItem value="USD">u$s (USD)</SelectItem></SelectContent>
                              </Select>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Subtotal</p>
                              <p className="font-black text-primary">
                                {item.currency === 'ARS' ? '$' : 'u$s'} {(item.price * item.qty).toLocaleString('es-AR')}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card h-fit sticky top-8">
              <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Resumen</CardTitle></CardHeader>
              <CardContent className="space-y-6 pt-6">
                {(activeTab !== 'cobro' && activeTab !== 'adjustment') && (
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
                            <Input 
                              type="number" 
                              value={paidAmounts[curr]} 
                              onChange={(e) => setPaidAmounts(prev => ({...prev, [curr]: Number(e.target.value)}))} 
                              className="h-9 font-bold bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase">Caja de destino</Label>
                            <Select value={destinationAccounts[curr]} onValueChange={(v) => setDestinationAccounts(p => ({...p, [curr]: v}))}>
                              <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Pendiente / A Cuenta" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">A CUENTA (Deuda)</SelectItem>
                                {accounts?.filter((a: any) => a.currency === curr).map((a: any) => (
                                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {paidAmounts[curr] < total && (
                            <div className="text-[10px] font-bold text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">
                              Quedará a cuenta: {curr === 'ARS' ? '$' : 'u$s'} {(total - paidAmounts[curr]).toLocaleString('es-AR')}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <Button 
                    className="w-full h-14 font-black text-md shadow-xl" 
                    disabled={((activeTab !== 'cobro' && activeTab !== 'adjustment') && selectedItems.length === 0) || ((activeTab === 'cobro' || activeTab === 'adjustment') && manualAmount <= 0) || !selectedCustomerId} 
                    onClick={handleSaveTransaction}
                  >
                    {editingTx ? 'GUARDAR CAMBIOS' : 'REGISTRAR OPERACIÓN'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 font-bold border-rose-200 text-rose-600 hover:bg-rose-50" 
                    onClick={() => { resetRegisterForm(); setMainView("history"); }}
                  >
                    {editingTx ? 'CANCELAR EDICIÓN' : 'CANCELAR'}
                  </Button>
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
                 <div className="space-y-1"><Label className="text-xs">Cliente</Label><Select value={filterCustomer} onValueChange={setFilterCustomer}><SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{sortedCustomers.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre}</SelectItem>))}</SelectContent></Select></div>
                 <div className="space-y-1"><Label className="text-xs">Tipo Operación</Label><Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{Object.entries(txTypeMap).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}</SelectContent></Select></div>
                 <div className="space-y-1"><Label className="text-xs">Rubro Gasto</Label><Select value={filterExpenseCategory} onValueChange={setFilterExpenseCategory}><SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Cualquiera</SelectItem>{expenseCategories?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select></div>
                 <div className="space-y-1"><Label className="text-xs">Desde</Label><Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-[140px] h-9" /></div>
                 <div className="space-y-1"><Label className="text-xs">Hasta</Label><Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-[140px] h-9" /></div>
                 <Button variant="ghost" size="icon" onClick={resetFilters}><FilterX className="h-4 w-4" /></Button>
            </Card>

            {/* Desktop History View */}
            <Card className="glass-card overflow-hidden hidden md:block">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead className="text-right">Monto Total</TableHead>
                    <TableHead className="text-right">Abonado</TableHead>
                    <TableHead>Caja</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx: any) => {
                    const cust = customers?.find(c => c.id === tx.clientId);
                    const acc = accounts?.find(a => a.id === tx.financialAccountId);
                    const info = txTypeMap[tx.type] || { label: tx.type, icon: ShoppingBag, color: "text-slate-600 bg-slate-50" };
                    const expenseCat = tx.expenseCategoryId ? expenseCategories?.find(ec => ec.id === tx.expenseCategoryId) : null;
                    
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs font-medium">{new Date(tx.date).toLocaleDateString('es-AR')}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold">{cust ? `${cust.apellido}, ${cust.nombre}` : '---'}</span>
                            {cust?.cuit_dni && <span className="text-[10px] text-muted-foreground uppercase">ID: {cust.cuit_dni}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className={cn("text-[10px] gap-1 w-fit", info.color)}>
                              <info.icon className="h-3 w-3" />{info.label}
                            </Badge>
                            {expenseCat && (
                              <span className="text-[9px] font-bold text-rose-600 flex items-center gap-1">
                                <Tag className="h-2.5 w-2.5" /> {expenseCat.name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-black">{tx.currency === 'USD' ? 'u$s' : '$'} {Math.abs(tx.amount || 0).toLocaleString('es-AR')}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn("text-xs font-bold", tx.paidAmount > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                            {tx.currency === 'USD' ? 'u$s' : '$'} {(tx.paidAmount || 0).toLocaleString('es-AR')}
                          </span>
                        </TableCell>
                        <TableCell>
                          {acc ? (
                            <Badge variant="secondary" className="text-[9px] font-bold bg-slate-100 hover:bg-slate-200">
                              <Wallet className="h-3 w-3 mr-1 text-slate-500" /> {acc.name}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">A Cuenta</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleCopyWhatsApp(tx)}><Copy className="h-4 w-4 mr-2" /> Copiar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEmailDialog(tx)}><Mail className="h-4 w-4 mr-2" /> Email</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditTx(tx)}><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setTxToDelete(tx)}><Trash2 className="h-4 w-4 mr-2" /> Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>

            {/* Mobile History View (Cards) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredTransactions.map((tx: any) => {
                const cust = customers?.find(c => c.id === tx.clientId);
                const acc = accounts?.find(a => a.id === tx.financialAccountId);
                const info = txTypeMap[tx.type] || { label: tx.type, icon: ShoppingBag, color: "text-slate-600 bg-slate-50" };
                const debt = (tx.amount || 0) - (tx.paidAmount || 0);
                const expenseCat = tx.expenseCategoryId ? expenseCategories?.find(ec => ec.id === tx.expenseCategoryId) : null;
                
                return (
                  <Card key={tx.id} className="glass-card p-4 relative border-l-4 border-l-primary hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/50 px-2 py-0.5 rounded">
                        {new Date(tx.date).toLocaleDateString('es-AR')}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-1">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyWhatsApp(tx)}><Copy className="h-4 w-4 mr-2" /> Copiar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEmailDialog(tx)}><Mail className="h-4 w-4 mr-2" /> Email</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditTx(tx)}><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setTxToDelete(tx)}><Trash2 className="h-4 w-4 mr-2" /> Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-bold text-md leading-tight">
                        {cust ? `${cust.apellido}, ${cust.nombre}` : 'Sin Cliente'}
                        {cust?.cuit_dni && <span className="text-[10px] font-normal text-muted-foreground ml-2">({cust.cuit_dni})</span>}
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className={cn("text-[10px] gap-1", info.color)}>
                          <info.icon className="h-3 w-3" />{info.label}
                        </Badge>
                        {expenseCat && (
                          <Badge variant="outline" className="text-[9px] font-bold text-rose-600 border-rose-200 bg-rose-50 px-2 h-5">
                            <Tag className="h-2.5 w-2.5 mr-1" /> {expenseCat.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-3 mb-4">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Total</p>
                        <p className="font-black text-sm">{tx.currency === 'USD' ? 'u$s' : '$'} {Math.abs(tx.amount || 0).toLocaleString('es-AR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Abonado</p>
                        <p className={cn("font-black text-sm", tx.paidAmount > 0 ? "text-emerald-600" : "text-slate-400")}>
                          {tx.currency === 'USD' ? 'u$s' : '$'} {(tx.paidAmount || 0).toLocaleString('es-AR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-muted/20 -mx-4 -mb-4 p-2 px-4 rounded-b-lg border-t border-primary/5">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-700">
                          {acc ? acc.name : "A Cuenta"}
                        </span>
                      </div>
                      {debt > 0 && (
                        <Badge variant="destructive" className="text-[9px] h-5 font-bold uppercase tracking-tighter px-2">DEUDA</Badge>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Notificación al Cliente</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Label>Plantilla</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{templates?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
              </Select>
              {selectedTemplateId && (
                <div className="p-4 bg-muted/20 rounded border space-y-2 max-h-[350px] overflow-y-auto">
                  <div className="sticky top-0 bg-muted/20 pb-2 border-b mb-4">
                    <p className="text-sm font-bold text-primary">Asunto: {processedEmail.subject}</p>
                  </div>
                  <p className="text-xs whitespace-pre-wrap italic leading-relaxed">{processedEmail.body}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cerrar</Button>
              <Button onClick={handleSendEmail} disabled={!selectedTemplateId}>Preparar Email</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!txToDelete} onOpenChange={(o) => { if(!o) setTxToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Se revertirán todos los saldos asociados.</AlertDialogDescription></AlertDialogHeader>
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
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  )
}
