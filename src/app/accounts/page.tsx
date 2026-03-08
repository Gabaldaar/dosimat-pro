
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Save,
  DollarSign,
  History,
  Tag
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface FinancialAccount {
  id: string;
  name: string;
  type: 'Cash' | 'Bank' | 'Digital';
  balance: number;
  currency: 'ARS' | 'USD';
  status: 'active' | 'inactive';
}

interface ExpenseCategory {
  id: string;
  name: string;
  totalSpent: number;
  currency: 'ARS' | 'USD';
}

const STORAGE_KEY = 'dosimat_pro_accounts_v2'
const EXPENSE_KEY = 'dosimat_pro_expense_categories_v2'

const initialAccounts: FinancialAccount[] = [
  { id: '1', name: "Caja Efectivo ARS", type: "Cash", balance: 145000, currency: "ARS", status: "active" },
  { id: '2', name: "Banco Galicia", type: "Bank", balance: 850300, currency: "ARS", status: "active" },
  { id: '3', name: "Caja Efectivo USD", type: "Cash", balance: 2450, currency: "USD", status: "active" },
  { id: '4', name: "Mercado Pago", type: "Digital", balance: -2500, currency: "ARS", status: "active" },
]

const initialExpenseCategories: ExpenseCategory[] = [
  { id: 'e1', name: "Insumos Químicos", totalSpent: 120400, currency: 'ARS' },
  { id: 'e2', name: "Combustible / Viáticos", totalSpent: 45000, currency: 'ARS' },
  { id: 'e3', name: "Publicidad y Marketing", totalSpent: 12000, currency: 'ARS' },
]

export default function AccountsPage() {
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [accounts, setAccounts] = useState<FinancialAccount[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  
  // Dialog States
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  
  // Form States
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [txType, setTxType] = useState<'income' | 'expense'>('income')
  
  const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId])

  const [accountFormData, setAccountFormData] = useState<Omit<FinancialAccount, 'id'>>({
    name: "",
    type: "Cash",
    balance: 0,
    currency: "ARS",
    status: "active"
  })

  const [txFormData, setTxFormData] = useState({
    amount: 0,
    description: ""
  })

  const [transferFormData, setTransferFormData] = useState({
    fromId: "",
    toId: "",
    amount: 0
  })

  useEffect(() => {
    setMounted(true)
    const savedAccounts = localStorage.getItem(STORAGE_KEY)
    const savedExpenses = localStorage.getItem(EXPENSE_KEY)
    
    if (savedAccounts) {
      setAccounts(JSON.parse(savedAccounts))
    } else {
      setAccounts(initialAccounts)
    }
    
    if (savedExpenses) {
      setExpenseCategories(JSON.parse(savedExpenses))
    } else {
      setExpenseCategories(initialExpenseCategories)
    }
  }, [])

  useEffect(() => {
    if (mounted && accounts.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
    }
    if (mounted && expenseCategories.length > 0) {
      localStorage.setItem(EXPENSE_KEY, JSON.stringify(expenseCategories))
    }
  }, [accounts, expenseCategories, mounted])

  const handleOpenAccountDialog = (account?: FinancialAccount) => {
    if (account) {
      setEditingAccountId(account.id)
      setAccountFormData({
        name: account.name,
        type: account.type,
        balance: account.balance,
        currency: account.currency,
        status: account.status
      })
    } else {
      setEditingAccountId(null)
      setAccountFormData({
        name: "",
        type: "Cash",
        balance: 0,
        currency: "ARS",
        status: "active"
      })
    }
    setIsAccountDialogOpen(true)
  }

  const handleSaveAccount = () => {
    if (!accountFormData.name) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" })
      return
    }

    const isEdit = !!editingAccountId;

    if (isEdit) {
      setAccounts(prev => prev.map(a => a.id === editingAccountId ? { ...a, ...accountFormData } : a))
    } else {
      const newAccount: FinancialAccount = {
        ...accountFormData,
        id: Math.random().toString(36).substr(2, 9)
      }
      setAccounts(prev => [...prev, newAccount])
    }

    setIsAccountDialogOpen(false)
    
    // Mostramos el toast después de cerrar para evitar conflictos de UI
    setTimeout(() => {
      toast({ 
        title: isEdit ? "Cuenta actualizada" : "Cuenta creada", 
        description: isEdit ? "Los cambios se guardaron correctamente." : "La cuenta financiera ha sido agregada." 
      })
      // Limpiamos el ID de edición después de que el diálogo se haya cerrado por completo
      setEditingAccountId(null)
    }, 200)
  }

  const handleOpenTxDialog = (account: FinancialAccount, type: 'income' | 'expense') => {
    setSelectedAccountId(account.id)
    setTxType(type)
    setTxFormData({ amount: 0, description: "" })
    setIsTxDialogOpen(true)
  }

  const handleProcessTx = () => {
    if (!selectedAccount || txFormData.amount <= 0) return

    const multiplier = txType === 'income' ? 1 : -1
    setAccounts(prev => prev.map(a => 
      a.id === selectedAccountId 
        ? { ...a, balance: a.balance + (txFormData.amount * multiplier) } 
        : a
    ))

    setIsTxDialogOpen(false)
    
    setTimeout(() => {
      toast({ 
        title: txType === 'income' ? "Ingreso registrado" : "Gasto registrado", 
        description: `Se procesó el movimiento en ${selectedAccount.name}` 
      })
      setSelectedAccountId(null)
    }, 200)
  }

  const handleTransfer = () => {
    const { fromId, toId, amount } = transferFormData
    if (!fromId || !toId || amount <= 0) {
      toast({ title: "Error", description: "Completa todos los campos de transferencia", variant: "destructive" })
      return
    }

    if (fromId === toId) {
      toast({ title: "Error", description: "No puedes transferir a la misma cuenta", variant: "destructive" })
      return
    }

    const fromAcc = accounts.find(a => a.id === fromId)
    const toAcc = accounts.find(a => a.id === toId)

    if (fromAcc?.currency !== toAcc?.currency) {
      toast({ title: "Error", description: "Solo se pueden transferir entre cuentas de la misma moneda", variant: "destructive" })
      return
    }

    setAccounts(prev => prev.map(a => {
      if (a.id === fromId) return { ...a, balance: a.balance - amount }
      if (a.id === toId) return { ...a, balance: a.balance + amount }
      return a
    }))

    setIsTransferDialogOpen(false)

    setTimeout(() => {
      toast({ title: "Transferencia exitosa", description: "El dinero ha sido movido correctamente." })
      setTransferFormData({ fromId: "", toId: "", amount: 0 })
    }, 200)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Cuentas Financieras</h1>
            <p className="text-muted-foreground">Estado de saldos y cajas en tiempo real.</p>
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

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.map((account) => (
            <Card key={account.id} className={`glass-card relative overflow-hidden transition-all hover:shadow-md ${account.balance < 0 ? 'border-destructive/30' : ''}`}>
              {account.balance < 0 && (
                <div className="absolute top-0 right-0 p-2">
                  <Badge variant="destructive" className="animate-pulse">Saldo Negativo</Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${
                    account.type === 'Bank' ? 'bg-blue-100 text-blue-700' : 
                    account.type === 'Cash' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {account.type === 'Bank' ? <Building2 className="h-5 w-5" /> : 
                     account.type === 'Cash' ? <Banknote className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenAccountDialog(account)}>Editar Cuenta</DropdownMenuItem>
                      <DropdownMenuItem>Ver Historial</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-base mt-2">{account.name}</CardTitle>
                <CardDescription className="text-xs uppercase font-bold tracking-tighter">{account.currency}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${account.balance < 0 ? 'text-destructive' : ''}`}>
                    {account.currency === 'USD' ? 'u$s' : '$'}
                    {mounted ? account.balance.toLocaleString('es-AR') : account.balance}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="flex-1 h-8 text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    onClick={() => handleOpenTxDialog(account, 'income')}
                  >
                    <Plus className="h-3 w-3 mr-1" /> INGRESO
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="flex-1 h-8 text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100"
                    onClick={() => handleOpenTxDialog(account, 'expense')}
                  >
                    <ArrowDownLeft className="h-3 w-3 mr-1" /> GASTO
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Últimos Movimientos</CardTitle>
                <CardDescription>Resumen de transacciones recientes</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs font-bold">VER TODO</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { desc: "Pago Cliente: Carlos R.", amount: "+$12.500", account: "Banco Galicia", type: "income" },
                  { desc: "Compra Cloro Granulado", amount: "-$45.000", account: "Caja Efectivo ARS", type: "expense" },
                  { desc: "Venta Reposición Líquida", amount: "+$8.200", account: "Caja Efectivo ARS", type: "income" },
                  { desc: "Servicio Técnico: Quinta Paz", amount: "+u$s 50", account: "Caja Efectivo USD", type: "income" },
                ].map((move, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${move.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {move.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{move.desc}</p>
                        <p className="text-xs text-muted-foreground">{move.account}</p>
                      </div>
                    </div>
                    <span className={`font-bold ${move.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {move.amount}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Cuentas de Gastos
                </CardTitle>
                <CardDescription>Gastos operativos acumulados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {expenseCategories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-2 rounded bg-muted/20">
                    <span className="text-sm">{cat.name}</span>
                    <span className="font-bold text-rose-600">
                      {cat.currency === 'USD' ? 'u$s' : '$'}
                      {mounted ? cat.totalSpent.toLocaleString('es-AR') : cat.totalSpent}
                    </span>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold">ADMINISTRAR CATEGORÍAS</Button>
              </CardFooter>
            </Card>
            
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
              <h4 className="font-bold text-primary mb-1 flex items-center gap-2">
                <History className="h-4 w-4" /> Resumen de Cierres
              </h4>
              <p className="text-xs text-primary/80 leading-relaxed">
                El último cierre de caja fue realizado hoy al iniciar la jornada. Todos los saldos están conciliados.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Account Dialog */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAccountId ? "Editar Cuenta" : "Nueva Cuenta"}</DialogTitle>
            <DialogDescription>
              Configura los detalles de tu cuenta financiera o caja.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Cuenta</Label>
              <Input 
                id="name" 
                placeholder="Ej: Banco Macro, Caja Chica..." 
                value={accountFormData.name}
                onChange={(e) => setAccountFormData({...accountFormData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select 
                  value={accountFormData.type} 
                  onValueChange={(v: any) => setAccountFormData({...accountFormData, type: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Efectivo / Caja</SelectItem>
                    <SelectItem value="Bank">Banco / CBU</SelectItem>
                    <SelectItem value="Digital">Digital / CVU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select 
                  value={accountFormData.currency} 
                  onValueChange={(v: any) => setAccountFormData({...accountFormData, currency: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance">Saldo Inicial</Label>
              <Input 
                id="balance" 
                type="number" 
                value={accountFormData.balance}
                onChange={(e) => setAccountFormData({...accountFormData, balance: Number(e.target.value)})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveAccount} className="w-full">
              <Save className="mr-2 h-4 w-4" /> Guardar Cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={isTxDialogOpen} onOpenChange={setIsTxDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {txType === 'income' ? <Plus className="text-emerald-600" /> : <ArrowDownLeft className="text-rose-600" />}
              Registrar {txType === 'income' ? 'Ingreso' : 'Gasto'}
            </DialogTitle>
            <DialogDescription>
              Registrar movimiento rápido en <strong>{selectedAccount?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto ({selectedAccount?.currency})</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="amount" 
                  type="number" 
                  className="pl-10 font-bold text-lg"
                  value={txFormData.amount}
                  onChange={(e) => setTxFormData({...txFormData, amount: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Descripción / Motivo</Label>
              <Input 
                id="desc" 
                placeholder="Ej: Pago servicio, Compra insumos..." 
                value={txFormData.description}
                onChange={(e) => setTxFormData({...txFormData, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleProcessTx} className={`w-full ${txType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
              Confirmar Movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Transferencia entre Cuentas</DialogTitle>
            <DialogDescription>Mueve dinero internamente entre tus cajas y bancos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Desde Cuenta</Label>
              <Select onValueChange={(v) => setTransferFormData({...transferFormData, fromId: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar origen" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hacia Cuenta</Label>
              <Select onValueChange={(v) => setTransferFormData({...transferFormData, toId: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar destino" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto a Transferir</Label>
              <Input 
                type="number" 
                value={transferFormData.amount}
                onChange={(e) => setTransferFormData({...transferFormData, amount: Number(e.target.value)})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleTransfer} className="w-full">Procesar Transferencia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  )
}
