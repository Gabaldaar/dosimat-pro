
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  AlertTriangle,
  Calculator,
  ExternalLink,
  Droplets,
  Settings,
  Copy,
  Edit
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
  DialogDescription,
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
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, query, orderBy, limit, increment } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

const txTypeMap: Record<string, { label: string, icon: any, color: string }> = {
  sale: { label: "Venta", icon: ArrowUpRight, color: "text-emerald-600 bg-emerald-50" },
  refill: { label: "Reposición", icon: ArrowUpRight, color: "text-emerald-600 bg-emerald-50" },
  service: { label: "Servicio Técnico", icon: ArrowUpRight, color: "text-emerald-600 bg-emerald-50" },
  cobro: { label: "Cobro de Saldo", icon: Wallet, color: "text-emerald-600 bg-emerald-50" },
  adjustment: { label: "Ajuste", icon: RefreshCw, color: "text-slate-600 bg-slate-50" },
  FinancialTransferOut: { label: "Transferencia (Salida)", icon: ArrowRightLeft, color: "text-amber-600 bg-amber-50" },
  FinancialTransferIn: { label: "Transferencia (Entrada)", icon: ArrowRightLeft, color: "text-emerald-600 bg-emerald-50" },
  Adjustment: { label: "Ajuste", icon: RefreshCw, color: "text-slate-600 bg-slate-50" },
  Expense: { label: "Gasto", icon: ArrowDownLeft, color: "text-rose-600 bg-rose-50" },
}

export default function AccountsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const { userData } = useUser()
  const isAdmin = userData?.role === 'Admin'
  
  // Queries
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const categoriesQuery = useMemoFirebase(() => collection(db, 'expense_categories'), [db])
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(15)), [db])

  // Data
  const { data: accounts, isLoading: loadingAccounts } = useCollection(accountsQuery)
  const { data: rawExpenseCategories } = useCollection(categoriesQuery)
  const { data: recentTxs } = useCollection(txQuery)
  
  // Sorted Accounts Logic
  const sortedAccounts = useMemo(() => {
    if (!accounts) return []
    return [...accounts].sort((a: any, b: any) => {
      // Primary Sort: Currency (ARS before USD)
      if (a.currency !== b.currency) {
        return (a.currency || "").localeCompare(b.currency || "")
      }
      // Secondary Sort: Alphabetical Name
      return (a.name || "").localeCompare(b.name || "")
    })
  }, [accounts])

  // Sorted Categories
  const expenseCategories = useMemo(() => {
    if (!rawExpenseCategories) return []
    return [...rawExpenseCategories].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
  }, [rawExpenseCategories])

  // Totals Calculation
  const globalTotals = useMemo(() => {
    if (!accounts) return { ARS: 0, USD: 0 }
    return accounts.reduce((acc, curr) => {
      const currency = curr.currency as 'ARS' | 'USD'
      acc[currency] = (acc[currency] || 0) + (Number(curr.initialBalance) || 0)
      return acc
    }, { ARS: 0, USD: 0 })
  }, [accounts])

  // Dialog States
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<any | null>(null)
  
  // Observador de mutaciones para forzar desbloqueo del puntero
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
    categoryId: "",
    date: new Date().toISOString().split('T')[0]
  })

  const [transferFormData, setTransferFormData] = useState({
    fromId: "",
    toId: "",
    amount: 0,
    description: ""
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
    if (!isAdmin) {
      toast({ title: "Acceso denegado", description: "Su usuario no tiene permisos de Administrador.", variant: "destructive" })
      return
    }
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
    if (!isAdmin) {
      toast({ title: "Acceso denegado", description: "Su usuario no tiene permisos para realizar esta acción.", variant: "destructive" })
      return
    }
    if (!accountFormData.name) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" })
      return
    }

    const id = editingAccountId || Math.random().toString(36).substring(2, 11)
    
    setIsAccountDialogOpen(false)
    
    setDocumentNonBlocking(doc(db, 'financial_accounts', id), { ...accountFormData, id }, { merge: true })
    toast({ title: editingAccountId ? "Caja actualizada" : "Caja creada" })
  }

  const confirmDeleteAccount = () => {
    if (!isAdmin) {
      toast({ title: "Acceso denegado", description: "Su usuario no tiene permisos para realizar esta acción.", variant: "destructive" })
      return
    }
    if (!accountToDelete) return
    deleteDocumentNonBlocking(doc(db, 'financial_accounts', accountToDelete.id))
    setAccountToDelete(null)
    setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100)
    toast({ title: "Caja eliminada" })
  }

  const handleOpenTxDialog = (account: any, type: 'income' | 'expense') => {
    setSelectedAccountId(account.id)
    setTxType(type)
    setTxFormData({ 
      amount: 0, 
      description: "", 
      categoryId: "", 
      date: new Date().toISOString().split('T')[0] 
    })
    setIsTxDialogOpen(true)
  }

  const handleProcessTx = () => {
    if (!selectedAccount || txFormData.amount <= 0) return
    
    const multiplier = txType === 'income' ? 1 : -1
    const amount = Number(txFormData.amount) * multiplier
    const finalDate = new Date(txFormData.date + 'T12:00:00').toISOString();

    setIsTxDialogOpen(false)

    // Usar increment para el saldo de la caja
    updateDocumentNonBlocking(doc(db, 'financial_accounts', selectedAccount.id), {
      initialBalance: increment(amount)
    })

    addDocumentNonBlocking(collection(db, 'transactions'), {
      date: finalDate,
      type: txType === 'income' ? 'Adjustment' : 'Expense',
      amount: amount,
      currency: selectedAccount.currency,
      description: txFormData.description || (txType === 'income' ? 'Ingreso manual' : 'Gasto manual'),
      financialAccountId: selectedAccount.id,
      expenseCategoryId: txFormData.categoryId || null,
      accountBalanceAfter: Number(selectedAccount.initialBalance || 0) + amount
    })

    toast({ title: "Operación procesada" })
  }

  const handleTransfer = () => {
    const { fromId, toId, amount, description } = transferFormData
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

    // Usar increment para transferencias
    updateDocumentNonBlocking(doc(db, 'financial_accounts', fromId), { initialBalance: increment(-Number(amount)) })
    updateDocumentNonBlocking(doc(db, 'financial_accounts', toId), { initialBalance: increment(finalAmountTo) })

    // Registrar salida
    addDocumentNonBlocking(collection(db, 'transactions'), {
      date: new Date().toISOString(),
      type: 'FinancialTransferOut',
      amount: -Number(amount),
      currency: fromAcc.currency,
      financialAccountId: fromId,
      description: description || `Transferencia a ${toAcc.name} (${toAcc.currency})`,
      accountBalanceAfter: Number(fromAcc.initialBalance || 0) - Number(amount)
    })

    // Registrar entrada
    addDocumentNonBlocking(collection(db, 'transactions'), {
      date: new Date().toISOString(),
      type: 'FinancialTransferIn',
      amount: finalAmountTo,
      currency: toAcc.currency,
      financialAccountId: toId,
      description: description || `Transferencia desde ${fromAcc.name} (${fromAcc.currency})`,
      accountBalanceAfter: Number(toAcc.initialBalance || 0) + finalAmountTo
    })

    toast({ title: "Transferencia completada" })
  }

  const handleAddCategory = () => {
    if (!isAdmin) {
      toast({ title: "Sin permisos", description: "Solo un administrador puede crear categorías.", variant: "destructive" })
      return
    }
    if (!newCategoryName.trim()) return
    const id = Math.random().toString(36).substring(2, 11)
    setDocumentNonBlocking(doc(db, 'expense_categories', id), { id, name: newCategoryName }, { merge: true })
    setNewCategoryName("")
  }

  const handleCopyAllAccounts = () => {
    if (!sortedAccounts || sortedAccounts.length === 0) return;
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-AR');
    
    let text = `Saldos de Cajas al ${dateStr}\n\n`;
    
    text += sortedAccounts.map((acc: any) => {
      const balance = acc.currency === 'USD' 
        ? `u$s ${Number(acc.initialBalance || 0).toLocaleString('es-AR')}`
        : `$${Number(acc.initialBalance || 0).toLocaleString('es-AR')}`;
      
      return `*${acc.name}*\n${balance}`;
    }).join('\n\n');

    // Agregar totales generales al final
    text += `\n\n---\n`;
    text += `*TOTAL ARS:* $${globalTotals.ARS.toLocaleString('es-AR')}\n`;
    text += `*TOTAL USD:* u$s ${globalTotals.USD.toLocaleString('es-AR')}`;

    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Resumen de saldos con totales copiado al portapapeles."
    });
  }

  const calculatedReceipt = useMemo(() => {
    if (!fromAcc || !toAcc || fromAcc.currency === toAcc.currency) return null;
    if (fromAcc.currency === 'ARS') return Number(transferFormData.amount) / exchangeRate;
    return Number(transferFormData.amount) * exchangeRate;
  }, [fromAcc, toAcc, transferFormData.amount, exchangeRate]);

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      
      <SidebarInset className="flex-1 w-full pb-32 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <div className="flex items-center gap-2 md:hidden pr-2 border-r">
               <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
                 <Droplets className="h-4 w-4 text-white" />
               </div>
               <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">Dosimat<span className="text-accent-foreground">Pro</span></span>
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-headline font-bold text-primary">Cajas</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleCopyAllAccounts} title="Copiar resumen de saldos">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferencia
            </Button>
            {isAdmin && (
              <Button onClick={() => handleOpenAccountDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Nueva Caja
              </Button>
            )}
          </div>
        </header>

        {/* Global Totals Section */}
        {!loadingAccounts && accounts && accounts.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-card bg-primary/5 border-l-4 border-l-primary overflow-hidden relative">
              <Calculator className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 text-primary/10 -rotate-12" />
              <CardContent className="p-4">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Saldo Total ARS</p>
                <h3 className="text-2xl font-black mt-1 text-primary">
                  ${globalTotals.ARS.toLocaleString('es-AR')}
                </h3>
              </CardContent>
            </Card>
            <Card className="glass-card bg-emerald-50/50 border-l-4 border-l-emerald-500 overflow-hidden relative">
              <TrendingUp className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 text-emerald-500/10 -rotate-12" />
              <CardContent className="p-4">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Saldo Total USD</p>
                <h3 className="text-2xl font-black mt-1 text-emerald-700">
                  u$s {globalTotals.USD.toLocaleString('es-AR')}
                </h3>
              </CardContent>
            </Card>
          </section>
        )}

        {loadingAccounts ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando cajas...</p>
          </div>
        ) : (sortedAccounts && sortedAccounts.length > 0) ? (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedAccounts.map((account: any) => {
              const isUSD = account.currency === 'USD';
              const themeColor = isUSD ? 'text-emerald-700' : 'text-blue-700';
              const bgColor = isUSD ? 'bg-emerald-100' : 'bg-blue-100';

              return (
                <Card 
                  key={account.id} 
                  className={cn(
                    "glass-card overflow-hidden group border-l-4 cursor-pointer hover:shadow-md transition-all",
                    isUSD ? 'border-l-emerald-500' : 'border-l-blue-500'
                  )}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('[role="menuitem"]')) return;
                    router.push(`/transactions?accountId=${account.id}`);
                  }}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-4 rounded-xl flex items-center justify-center shrink-0", bgColor, themeColor)}>
                          {account.type === 'Bank' ? <Building2 className="h-10 w-10" /> : 
                           account.type === 'Cash' ? <Banknote className="h-10 w-10" /> : <Wallet className="h-10 w-10" />}
                        </div>
                        <div className="flex flex-col justify-center min-w-0">
                          <CardTitle className="text-xl font-black leading-tight truncate">{account.name}</CardTitle>
                          <span className={cn("text-xs font-black uppercase tracking-widest", themeColor)}>
                            {account.currency}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10"
                            >
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isAdmin && (
                              <>
                                <DropdownMenuItem onSelect={() => handleOpenAccountDialog(account)}>
                                  <Edit className="mr-2 h-4 w-4" /> Editar parámetros
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onSelect={() => setAccountToDelete(account)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar caja
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onSelect={() => router.push(`/transactions?accountId=${account.id}`)}>
                              <RefreshCw className="mr-2 h-4 w-4" /> Ver movimientos
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={cn("text-4xl font-black tracking-tighter mb-6", themeColor)}>
                      {isUSD ? 'u$s' : '$'}{Number(account.initialBalance || 0).toLocaleString('es-AR')}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-[10px] h-8 font-bold hover:bg-emerald-50" 
                        onClick={(e) => { e.stopPropagation(); handleOpenTxDialog(account, 'income'); }}
                      >
                        INGRESO
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-[10px] h-8 font-bold hover:bg-rose-50" 
                        onClick={(e) => { e.stopPropagation(); handleOpenTxDialog(account, 'expense'); }}
                      >
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
            <h3 className="text-lg font-semibold">No hay cajas registradas</h3>
            {isAdmin && <Button onClick={() => handleOpenAccountDialog()}><Plus className="mr-2 h-4 w-4" /> Agregar Caja</Button>}
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

          <Card className="glass-card flex flex-col">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" /> Categorías de Gasto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 flex-1">
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
            <CardFooter className="pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full font-black uppercase tracking-wider border-primary text-primary hover:bg-primary/5 gap-2 h-10" 
                onClick={() => {
                  if (!isAdmin) {
                    toast({ title: "Acceso denegado", description: "Su usuario no tiene permisos de Administrador.", variant: "destructive" })
                    return
                  }
                  setIsCategoryManagerOpen(true)
                }}
              >
                <Settings className="h-4 w-4" /> GESTIONAR CATEGORÍAS
              </Button>
            </CardFooter>
          </Card>
        </section>

        {/* Diálogos */}
        <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccountId ? 'Editar Caja' : 'Nueva Caja'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre de la Caja / Banco</Label>
                <Input value={accountFormData.name} onChange={(e) => setAccountFormData({...accountFormData, name: e.target.value})} placeholder="Ej: Caja Central" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={accountFormData.type} onValueChange={(v) => setAccountFormData({...accountFormData, type: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Efectivo</SelectItem>
                      <SelectItem value="Bank">Banco / Digital</SelectItem>
                      <SelectItem value="Other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={accountFormData.currency} onValueChange={(v) => setAccountFormData({...accountFormData, currency: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar moneda..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Saldo Inicial / Actual</Label>
                <Input 
                  type="number" 
                  value={accountFormData.initialBalance} 
                  onChange={(e) => setAccountFormData({...accountFormData, initialBalance: Number(e.target.value)})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveAccount}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isTxDialogOpen} onOpenChange={setIsTxDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{txType === 'income' ? 'Ingreso Manual' : 'Gasto Manual'}</DialogTitle>
              {selectedAccount && (
                <DialogDescription className="font-bold text-primary flex items-center gap-2">
                  <Wallet className="h-3 w-3" />
                  {selectedAccount.name} • Saldo Actual: {selectedAccount.currency === 'USD' ? 'u$s' : '$'}{Number(selectedAccount.initialBalance || 0).toLocaleString('es-AR')}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={txFormData.date} onChange={(e) => setTxFormData({...txFormData, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input type="number" value={txFormData.amount} onChange={(e) => setTxFormData({...txFormData, amount: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={txFormData.description} onChange={(e) => setTxFormData({...txFormData, description: e.target.value})} />
              </div>
              {txType === 'expense' && (
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={txFormData.categoryId} onValueChange={(v) => setTxFormData({...txFormData, categoryId: v})}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar rubro..." /></SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleProcessTx}>Procesar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Transferencia entre Cajas</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origen</Label>
                  <Select value={transferFormData.fromId} onValueChange={(v) => setTransferFormData({...transferFormData, fromId: v})}>
                    <SelectTrigger><SelectValue placeholder="Caja..." /></SelectTrigger>
                    <SelectContent>
                      {sortedAccounts?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency}) - Saldo: {a.currency === 'USD' ? 'u$s' : '$'}{a.initialBalance.toLocaleString('es-AR')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Select value={transferFormData.toId} onValueChange={(v) => setTransferFormData({...transferFormData, toId: v})}>
                    <SelectTrigger><SelectValue placeholder="Caja..." /></SelectTrigger>
                    <SelectContent>
                      {sortedAccounts?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency}) - Saldo: {a.currency === 'USD' ? 'u$s' : '$'}{a.initialBalance.toLocaleString('es-AR')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Monto a transferir ({fromAcc?.currency || '...' })</Label>
                <Input type="number" value={transferFormData.amount} onChange={(e) => setTransferFormData({...transferFormData, amount: Number(e.target.value)})} />
              </div>
              {calculatedReceipt !== null && (
                <div className="p-3 bg-accent/5 rounded border text-xs font-bold flex justify-between">
                  <span>Recibirá en destino ({toAcc?.currency}):</span>
                  <span>{toAcc?.currency === 'USD' ? 'u$s' : '$'}{calculatedReceipt.toLocaleString('es-AR')}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label>Descripción / Notas</Label>
                <Input 
                  placeholder="Ej: Retiro para sueldos, Pago proveedor..." 
                  value={transferFormData.description} 
                  onChange={(e) => setTransferFormData({...transferFormData, description: e.target.value})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleTransfer}>Transferir</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Categorías de Gasto</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Input placeholder="Nueva categoría..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                <Button onClick={handleAddCategory}><Plus className="h-4 w-4" /></Button>
              </div>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {expenseCategories?.map((cat: any) => (
                  <div key={cat.id} className="flex justify-between items-center p-2 border-b last:border-0">
                    <span className="text-sm">{cat.name}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                      if (!isAdmin) {
                        toast({ title: "Acceso denegado", variant: "destructive" })
                        return
                      }
                      deleteDocumentNonBlocking(doc(db, 'expense_categories', cat.id))
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!accountToDelete} onOpenChange={(o) => { if(!o) setAccountToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar eliminación de caja?</AlertDialogTitle>
              <AlertDialogDescription>
                Se borrará "{accountToDelete?.name}". Asegúrate de que el saldo sea 0 o de haber transferido los fondos antes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteAccount} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </SidebarInset>

      <MobileNav />
    </div>
  )
}
