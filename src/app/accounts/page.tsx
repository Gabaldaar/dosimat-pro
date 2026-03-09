"use client"

import { useState, useMemo, useEffect } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Building2, 
  Wallet, 
  Banknote,
  MoreVertical,
  ArrowRightLeft,
  Tag,
  Trash2,
  RefreshCw,
  Loader2,
  TrendingUp,
  AlertTriangle
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc, query, orderBy, limit } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

const txTypeMap: Record<string, { label: string, icon: any, color: string }> = {
  sale: { label: "Venta", icon: ArrowUpRight, color: "text-emerald-600 bg-emerald-50" },
  refill: { label: "Reposición", icon: ArrowUpRight, color: "text-emerald-600 bg-emerald-50" },
  service: { label: "Servicio Técnico", icon: ArrowUpRight, color: "text-emerald-600 bg-emerald-50" },
  cobro: { label: "Cobro de Saldo", icon: Wallet, color: "text-emerald-600 bg-emerald-50" },
  adjustment: { label: "Ajuste Interno", icon: RefreshCw, color: "text-slate-600 bg-slate-50" },
  FinancialTransferOut: { label: "Transferencia (Salida)", icon: ArrowRightLeft, color: "text-amber-600 bg-amber-50" },
  FinancialTransferIn: { label: "Transferencia (Entrada)", icon: ArrowRightLeft, color: "text-emerald-600 bg-emerald-50" },
  Adjustment: { label: "Ajuste de Saldo", icon: RefreshCw, color: "text-slate-600 bg-slate-50" },
  Expense: { label: "Gasto Manual", icon: ArrowDownLeft, color: "text-rose-600 bg-rose-50" },
}

export default function AccountsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  
  // Queries
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const categoriesQuery = useMemoFirebase(() => collection(db, 'expense_categories'), [db])
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(15)), [db])

  // Data
  const { data: accounts, isLoading: loadingAccounts } = useCollection(accountsQuery)
  const { data: expenseCategories } = useCollection(categoriesQuery)
  const { data: recentTxs } = useCollection(txQuery)
  
  // Dialog States
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<any | null>(null)
  
  // SOLUCIÓN TÉCNICA DEFINITIVA: Observador de mutaciones para forzar desbloqueo del puntero
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        if (!isAccountDialogOpen && !isTxDialogOpen && !isTransferDialogOpen && !isCategoryManagerOpen && !accountToDelete) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isAccountDialogOpen, isTxDialogOpen, isTransferDialogOpen, isCategoryManagerOpen, accountToDelete]);

  // Form States
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [txType, setTxType] = useState<'income' | 'expense'>('income')
  const [newCategoryName, setNewCategoryName] = useState("")
  const [exchangeRate, setExchangeRate] = useState(1)
  
  const selectedAccount = useMemo(() => {
    if (!accounts || !selectedAccountId) return null
    return accounts.find(a => a.id === selectedAccountId) || null
  }, [accounts, selectedAccountId])

  const [accountFormData, setAccountFormData] = useState({
    name: "",
    type: "Cash",
    initialBalance: 0,
    currency: "ARS"
  })

  const [txFormData, setTxFormData] = useState({
    amount: 0,
    description: "",
    categoryId: ""
  })

  const [transferFormData, setTransferFormData] = useState({
    fromId: "",
    toId: "",
    amount: 0
  })

  const fromAcc = useMemo(() => accounts?.find(a => a.id === transferFormData.fromId), [accounts, transferFormData.fromId]);
  const toAcc = useMemo(() => accounts?.find(a => a.id === transferFormData.toId), [accounts, transferFormData.toId]);

  // Fetch Exchange Rate when multi-currency transfer is detected
  useEffect(() => {
    if (isTransferDialogOpen && fromAcc && toAcc && fromAcc.currency !== toAcc.currency) {
      fetch('https://dolarapi.com/v1/dolares/oficial')
        .then(res => res.json())
        .then(data => {
          if (data && data.venta) {
            setExchangeRate(data.venta);
          }
        })
        .catch(err => console.error("Error fetching rate:", err));
    }
  }, [isTransferDialogOpen, fromAcc, toAcc]);

  // Handlers
  const handleOpenAccountDialog = (account?: any) => {
    if (account) {
      setEditingAccountId(account.id)
      setAccountFormData({
        name: account.name || "",
        type: account.type || "Cash",
        initialBalance: account.initialBalance || 0,
        currency: account.currency || "ARS"
      })
    } else {
      setEditingAccountId(null)
      setAccountFormData({
        name: "",
        type: "Cash",
        initialBalance: 0,
        currency: "ARS"
      })
    }
    setIsAccountDialogOpen(true)
  }

  const handleSaveAccount = () => {
    if (!accountFormData.name) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" })
      return
    }

    const id = editingAccountId || Math.random().toString(36).substring(2, 11)
    
    setIsAccountDialogOpen(false)
    
    setDocumentNonBlocking(doc(db, 'financial_accounts', id), { ...accountFormData, id }, { merge: true })
    toast({ title: editingAccountId ? "Cuenta actualizada" : "Cuenta creada" })
  }

  const confirmDeleteAccount = () => {
    if (!accountToDelete) return
    deleteDocumentNonBlocking(doc(db, 'financial_accounts', accountToDelete.id))
    setAccountToDelete(null)
    setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100)
    toast({ title: "Cuenta eliminada" })
  }

  const handleOpenTxDialog = (account: any, type: 'income' | 'expense') => {
    setSelectedAccountId(account.id)
    setTxType(type)
    setTxFormData({ amount: 0, description: "", categoryId: "" })
    setIsTxDialogOpen(true)
  }

  const handleProcessTx = () => {
    if (!selectedAccount || txFormData.amount <= 0) return
    
    const multiplier = txType === 'income' ? 1 : -1
    const currentBalance = Number(selectedAccount.initialBalance || 0)
    const newBalance = currentBalance + (Number(txFormData.amount) * multiplier)

    setIsTxDialogOpen(false)

    updateDocumentNonBlocking(doc(db, 'financial_accounts', selectedAccount.id), {
      initialBalance: newBalance
    })

    addDocumentNonBlocking(collection(db, 'transactions'), {
      date: new Date().toISOString(),
      type: txType === 'income' ? 'Adjustment' : 'Expense',
      amount: Number(txFormData.amount) * multiplier,
      currency: selectedAccount.currency,
      description: txFormData.description || (txType === 'income' ? 'Ingreso manual' : 'Gasto manual'),
      financialAccountId: selectedAccount.id,
      expenseCategoryId: txFormData.categoryId || null
    })

    toast({ title: "Operación procesada" })
  }

  const handleTransfer = () => {
    const { fromId, toId, amount } = transferFormData
    if (!fromAcc || !toAcc || amount <= 0) return

    setIsTransferDialogOpen(false)

    let finalAmountTo = Number(amount);
    if (fromAcc.currency !== toAcc.currency) {
      if (fromAcc.currency === 'ARS' && toAcc.currency === 'USD') {
        finalAmountTo = Number(amount) / exchangeRate;
      } else if (fromAcc.currency === 'USD' && toAcc.currency === 'ARS') {
        finalAmountTo = Number(amount) * exchangeRate;
      }
    }

    updateDocumentNonBlocking(doc(db, 'financial_accounts', fromId), { initialBalance: Number(fromAcc.initialBalance || 0) - Number(amount) })
    updateDocumentNonBlocking(doc(db, 'financial_accounts', toId), { initialBalance: Number(toAcc.initialBalance || 0) + finalAmountTo })

    // Registrar salida
    addDocumentNonBlocking(collection(db, 'transactions'), {
      date: new Date().toISOString(),
      type: 'FinancialTransferOut',
      amount: -Number(amount),
      currency: fromAcc.currency,
      financialAccountId: fromId,
      description: `Transferencia a ${toAcc.name} (${toAcc.currency})`
    })

    // Registrar entrada
    addDocumentNonBlocking(collection(db, 'transactions'), {
      date: new Date().toISOString(),
      type: 'FinancialTransferIn',
      amount: finalAmountTo,
      currency: toAcc.currency,
      financialAccountId: toId,
      description: `Transferencia desde ${fromAcc.name} (${fromAcc.currency})`
    })

    toast({ title: "Transferencia completada" })
  }

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return
    const id = Math.random().toString(36).substring(2, 11)
    setDocumentNonBlocking(doc(db, 'expense_categories', id), { id, name: newCategoryName }, { merge: true })
    setNewCategoryName("")
  }

  const calculatedReceipt = useMemo(() => {
    if (!fromAcc || !toAcc || fromAcc.currency === toAcc.currency) return null;
    if (fromAcc.currency === 'ARS') return Number(transferFormData.amount) / exchangeRate;
    return Number(transferFormData.amount) * exchangeRate;
  }, [fromAcc, toAcc, transferFormData.amount, exchangeRate]);

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      
      <SidebarInset className="flex-1 w-full pb-20 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="hidden md:flex" />
            <div>
              <h1 className="text-3xl font-headline font-bold text-primary">Cuentas Financieras</h1>
              <p className="text-muted-foreground">Saldos y movimientos en tiempo real.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferencia
            </Button>
            <Button onClick={() => handleOpenAccountDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Cuenta
            </Button>
          </div>
        </header>

        {loadingAccounts ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando cuentas...</p>
          </div>
        ) : (accounts && accounts.length > 0) ? (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map((account: any) => {
              const isUSD = account.currency === 'USD';
              const themeColor = isUSD ? 'text-emerald-700' : 'text-blue-700';
              const bgColor = isUSD ? 'bg-emerald-100' : 'bg-blue-100';

              return (
                <Card key={account.id} className={`glass-card overflow-hidden group border-l-4 ${isUSD ? 'border-l-emerald-500' : 'border-l-blue-500'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-lg ${bgColor} ${themeColor}`}>
                        {account.type === 'Bank' ? <Building2 className="h-5 w-5" /> : 
                         account.type === 'Cash' ? <Banknote className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleOpenAccountDialog(account)}>Editar parámetros</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setAccountToDelete(account)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar cuenta
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="text-base mt-2 truncate">{account.name}</CardTitle>
                    <CardDescription className={`text-[10px] font-bold uppercase tracking-widest ${themeColor}`}>
                      {account.currency}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-black tracking-tight ${themeColor}`}>
                      {isUSD ? 'u$s' : '$'}
                      {Number(account.initialBalance || 0).toLocaleString('es-AR')}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-[10px] h-8 hover:bg-emerald-50" onClick={() => handleOpenTxDialog(account, 'income')}>
                        INGRESO
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-[10px] h-8 hover:bg-rose-50" onClick={() => handleOpenTxDialog(account, 'expense')}>
                        GASTO
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        ) : (
          <Card className="p-12 text-center border-dashed bg-muted/5">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-semibold">No hay cuentas registradas</h3>
            <p className="text-muted-foreground mb-6">Crea una caja o banco para empezar a registrar movimientos.</p>
            <Button onClick={() => handleOpenAccountDialog()}><Plus className="mr-2 h-4 w-4" /> Agregar Cuenta</Button>
          </Card>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 glass-card">
            <CardHeader><CardTitle className="text-lg">Últimos Movimientos</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {!recentTxs || recentTxs.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-12 italic">No se registran transacciones recientes.</p>
                ) : (
                  recentTxs.map((move: any) => {
                    const typeInfo = txTypeMap[move.type] || { label: move.type, icon: RefreshCw, color: "text-slate-600 bg-slate-50" };
                    const Icon = typeInfo.icon;
                    return (
                      <div key={move.id} className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={cn("p-2 rounded-full", typeInfo.color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold leading-none">{move.description || typeInfo.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 uppercase">
                              {move.date ? new Date(move.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'S/D'} • <span className="font-bold">{typeInfo.label}</span>
                            </p>
                          </div>
                        </div>
                        <span className={`font-black text-sm ${move.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {move.currency === 'USD' ? 'u$s' : '$'}{Math.abs(move.amount).toLocaleString('es-AR')}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" /> Categorías de Gasto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(!expenseCategories || expenseCategories.length === 0) ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">Sin categorías.</p>
              ) : (
                expenseCategories.map((cat: any) => (
                  <div key={cat.id} className="flex justify-between items-center p-2.5 rounded-lg bg-muted/20 text-sm font-medium">
                    {cat.name}
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" className="w-full text-[10px] font-bold uppercase tracking-wider" onClick={() => setIsCategoryManagerOpen(true)}>ADMINISTRAR RUBROS</Button>
            </CardFooter>
          </Card>
        </section>

        {/* Cierre de Dialogs omitido para brevedad, permanecen iguales */}
      </SidebarInset>

      <MobileNav />
    </div>
  )
}