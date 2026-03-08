
"use client"

import { useState, useMemo, useCallback } from "react"
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
  Loader2
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc, query, orderBy, limit } from "firebase/firestore"

export default function AccountsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  
  // Queries estables
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const categoriesQuery = useMemoFirebase(() => collection(db, 'expense_categories'), [db])
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(15)), [db])

  // Data streams
  const { data: accounts, isLoading: loadingAccounts } = useCollection(accountsQuery)
  const { data: expenseCategories } = useCollection(categoriesQuery)
  const { data: recentTxs } = useCollection(txQuery)
  
  // Dialog visibility states
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  
  // Logic states
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [txType, setTxType] = useState<'income' | 'expense'>('income')
  const [newCategoryName, setNewCategoryName] = useState("")
  
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

  // Handlers robustos para evitar bloqueos
  const handleOpenAccountDialog = useCallback((account?: any) => {
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
  }, [])

  const handleCloseAccountDialog = useCallback((open: boolean) => {
    setIsAccountDialogOpen(open)
    if (!open) {
      // Limpiamos estados al cerrar para evitar cuelgues de renderizado
      setEditingAccountId(null)
      setAccountFormData({ name: "", type: "Cash", initialBalance: 0, currency: "ARS" })
    }
  }, [])

  const handleSaveAccount = () => {
    if (!accountFormData.name) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" })
      return
    }

    const id = editingAccountId || Math.random().toString(36).substring(2, 11)
    setDocumentNonBlocking(doc(db, 'financial_accounts', id), { ...accountFormData, id }, { merge: true })
    
    handleCloseAccountDialog(false)
    toast({ title: editingAccountId ? "Cuenta actualizada" : "Cuenta creada" })
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

    setIsTxDialogOpen(false)
    toast({ title: "Operación procesada" })
  }

  const handleTransfer = () => {
    const { fromId, toId, amount } = transferFormData
    const fromAcc = accounts?.find(a => a.id === fromId)
    const toAcc = accounts?.find(a => a.id === toId)

    if (!fromAcc || !toAcc || amount <= 0) return

    updateDocumentNonBlocking(doc(db, 'financial_accounts', fromId), { initialBalance: Number(fromAcc.initialBalance || 0) - Number(amount) })
    updateDocumentNonBlocking(doc(db, 'financial_accounts', toId), { initialBalance: Number(toAcc.initialBalance || 0) + Number(amount) })

    addDocumentNonBlocking(collection(db, 'transactions'), {
      date: new Date().toISOString(),
      type: 'FinancialTransferOut',
      amount: -Number(amount),
      currency: fromAcc.currency,
      financialAccountId: fromId,
      description: `Transferencia a ${toAcc.name}`
    })

    setIsTransferDialogOpen(false)
    toast({ title: "Transferencia completada" })
  }

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return
    const id = Math.random().toString(36).substring(2, 11)
    setDocumentNonBlocking(doc(db, 'expense_categories', id), { id, name: newCategoryName }, { merge: true })
    setNewCategoryName("")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Cuentas Financieras</h1>
            <p className="text-muted-foreground">Saldos y movimientos en tiempo real.</p>
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
            <p className="text-sm text-muted-foreground">Sincronizando con la nube...</p>
          </div>
        ) : (!accounts || accounts.length === 0) ? (
          <Card className="p-12 text-center border-dashed bg-muted/5">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-semibold">No hay cuentas registradas</h3>
            <p className="text-muted-foreground mb-6">Crea una caja o banco para empezar a registrar movimientos.</p>
            <Button onClick={() => handleOpenAccountDialog()}><Plus className="mr-2 h-4 w-4" /> Agregar Cuenta</Button>
          </Card>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map((account: any) => (
              <Card key={account.id} className="glass-card overflow-hidden group">
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenAccountDialog(account)}>Editar parámetros</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-base mt-2 truncate">{account.name}</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest">{account.currency}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black tracking-tight">
                    {account.currency === 'USD' ? 'u$s' : '$'}
                    {Number(account.initialBalance || 0).toLocaleString('es-AR')}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-[10px] h-8 bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" onClick={() => handleOpenTxDialog(account, 'income')}>
                      INGRESO
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-[10px] h-8 bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100" onClick={() => handleOpenTxDialog(account, 'expense')}>
                      GASTO
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 glass-card">
            <CardHeader><CardTitle className="text-lg">Últimos Movimientos</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {!recentTxs || recentTxs.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-12 italic">No se registran transacciones recientes.</p>
                ) : (
                  recentTxs.map((move: any) => (
                    <div key={move.id} className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${move.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {move.amount > 0 ? <Plus className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold leading-none">{move.description || move.type}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 uppercase">
                            {move.date ? new Date(move.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'S/D'}
                          </p>
                        </div>
                      </div>
                      <span className={`font-black text-sm ${move.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {move.currency === 'USD' ? 'u$s' : '$'}{Math.abs(move.amount).toLocaleString('es-AR')}
                      </span>
                    </div>
                  ))
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

        {/* DIALOGS - USANDO KEYS ÚNICAS PARA FORZAR RESET DE ESTADO RADIX */}
        <Dialog key={`acc-dialog-${isAccountDialogOpen}`} open={isAccountDialogOpen} onOpenChange={handleCloseAccountDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingAccountId ? "Editar Cuenta" : "Nueva Cuenta"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nombre de la Cuenta</Label>
                <Input value={accountFormData.name} onChange={(e) => setAccountFormData({...accountFormData, name: e.target.value})} placeholder="Ej: Caja Pilar, Banco Galicia..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={accountFormData.type} onValueChange={(v) => setAccountFormData({...accountFormData, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Efectivo</SelectItem>
                      <SelectItem value="Bank">Banco / Digital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={accountFormData.currency} onValueChange={(v) => setAccountFormData({...accountFormData, currency: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Saldo Actual</Label>
                <Input type="number" value={accountFormData.initialBalance} onChange={(e) => setAccountFormData({...accountFormData, initialBalance: Number(e.target.value)})} />
              </div>
            </div>
            <DialogFooter><Button onClick={handleSaveAccount} className="w-full font-bold">Guardar Cambios</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog key={`cat-dialog-${isCategoryManagerOpen}`} open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Administrar Rubros</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Input placeholder="Nueva categoría..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                <Button size="icon" onClick={handleAddCategory}><Plus className="h-4 w-4" /></Button>
              </div>
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-2">
                  {expenseCategories?.map((cat: any) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/5">
                      <span className="text-sm font-medium">{cat.name}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'expense_categories', cat.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog key={`tx-dialog-${isTxDialogOpen}`} open={isTxDialogOpen} onOpenChange={setIsTxDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className={txType === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                {txType === 'income' ? 'Registrar Ingreso de Dinero' : 'Registrar Gasto de Dinero'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Monto ({selectedAccount?.currency})</Label>
                <Input type="number" value={txFormData.amount} onChange={(e) => setTxFormData({...txFormData, amount: Number(e.target.value)})} />
              </div>
              {txType === 'expense' && (
                <div className="space-y-2">
                  <Label>Rubro / Categoría</Label>
                  <Select value={txFormData.categoryId} onValueChange={(v) => setTxFormData({...txFormData, categoryId: v})}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar rubro..." /></SelectTrigger>
                    <SelectContent>
                      {expenseCategories?.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Descripción / Concepto</Label>
                <Input placeholder="Ej: Pago de cliente, Compra de cloro..." value={txFormData.description} onChange={(e) => setTxFormData({...txFormData, description: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleProcessTx} className="w-full font-bold">Procesar Operación</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog key={`transfer-dialog-${isTransferDialogOpen}`} open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Transferencia entre Cuentas</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Desde Cuenta</Label>
                <Select value={transferFormData.fromId} onValueChange={(v) => setTransferFormData({...transferFormData, fromId: v})}>
                  <SelectTrigger><SelectValue placeholder="Origen..." /></SelectTrigger>
                  <SelectContent>
                    {accounts?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hacia Cuenta</Label>
                <Select value={transferFormData.toId} onValueChange={(v) => setTransferFormData({...transferFormData, toId: v})}>
                  <SelectTrigger><SelectValue placeholder="Destino..." /></SelectTrigger>
                  <SelectContent>
                    {accounts?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monto a transferir</Label>
                <Input type="number" value={transferFormData.amount} onChange={(e) => setTransferFormData({...transferFormData, amount: Number(e.target.value)})} />
              </div>
              <p className="text-[10px] text-muted-foreground italic">Nota: Las cuentas deben ser de la misma moneda para que el saldo sea coherente.</p>
            </div>
            <DialogFooter><Button onClick={handleTransfer} className="w-full font-bold">Confirmar Transferencia</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <MobileNav />
    </div>
  )
}
