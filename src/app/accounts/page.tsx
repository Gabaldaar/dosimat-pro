
"use client"

import { useState, useMemo } from "react"
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
  Trash2
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
import { collection, doc } from "firebase/firestore"

export default function AccountsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const categoriesQuery = useMemoFirebase(() => collection(db, 'expense_categories'), [db])
  const txQuery = useMemoFirebase(() => collection(db, 'transactions'), [db])

  const { data: accounts, isLoading: loadingAccounts } = useCollection(accountsQuery)
  const { data: expenseCategories } = useCollection(categoriesQuery)
  const { data: recentTxs } = useCollection(txQuery)
  
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [txType, setTxType] = useState<'income' | 'expense'>('income')
  const [newCategoryName, setNewCategoryName] = useState("")
  
  const selectedAccount = useMemo(() => accounts?.find(a => a.id === selectedAccountId), [accounts, selectedAccountId])

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

  const handleOpenAccountDialog = (account?: any) => {
    if (account) {
      setEditingAccountId(account.id)
      setAccountFormData({
        name: account.name,
        type: account.type,
        initialBalance: account.initialBalance || 0,
        currency: account.currency
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

    const id = editingAccountId || Math.random().toString(36).substr(2, 9)
    setDocumentNonBlocking(doc(db, 'financial_accounts', id), { ...accountFormData, id }, { merge: true })
    
    setIsAccountDialogOpen(false)
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
    const newBalance = (selectedAccount.initialBalance || 0) + (txFormData.amount * multiplier)

    updateDocumentNonBlocking(doc(db, 'financial_accounts', selectedAccount.id), {
      initialBalance: newBalance
    })

    addDocumentNonBlocking(collection(db, 'transactions'), {
      date: new Date().toISOString(),
      type: txType === 'income' ? 'Adjustment' : 'Expense',
      amount: txFormData.amount * multiplier,
      currency: selectedAccount.currency,
      description: txFormData.description,
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

    updateDocumentNonBlocking(doc(db, 'financial_accounts', fromId), { initialBalance: fromAcc.initialBalance - amount })
    updateDocumentNonBlocking(doc(db, 'financial_accounts', toId), { initialBalance: toAcc.initialBalance + amount })

    addDocumentNonBlocking(collection(db, 'transactions'), {
      date: new Date().toISOString(),
      type: 'FinancialTransferOut',
      amount: -amount,
      currency: fromAcc.currency,
      financialAccountId: fromId,
      description: `Transferencia a ${toAcc.name}`
    })

    setIsTransferDialogOpen(false)
    toast({ title: "Transferencia completada" })
  }

  const handleAddCategory = () => {
    if (!newCategoryName) return
    const id = Math.random().toString(36).substr(2, 9)
    setDocumentNonBlocking(doc(db, 'expense_categories', id), { id, name: newCategoryName }, { merge: true })
    setNewCategoryName("")
  }

  const handleDeleteCategory = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'expense_categories', id))
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Cuentas Financieras</h1>
            <p className="text-muted-foreground">Estado de saldos y cajas en tiempo real en la nube.</p>
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
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Cargando cuentas...</p>
          </div>
        ) : !accounts || accounts.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-semibold">No hay cuentas registradas</h3>
            <p className="text-muted-foreground mb-6">Crea tu primera caja o cuenta bancaria para empezar.</p>
            <Button onClick={() => handleOpenAccountDialog()}><Plus className="mr-2 h-4 w-4" /> Agregar Cuenta</Button>
          </Card>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map((account: any) => (
              <Card key={account.id} className="glass-card">
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
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenAccountDialog(account)}>Editar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-base mt-2">{account.name}</CardTitle>
                  <CardDescription className="text-xs font-bold">{account.currency}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {account.currency === 'USD' ? 'u$s' : '$'}
                    {(account.initialBalance || 0).toLocaleString('es-AR')}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="ghost" className="flex-1 bg-emerald-50 text-emerald-700" onClick={() => handleOpenTxDialog(account, 'income')}>
                      <Plus className="h-3 w-3 mr-1" /> INGRESO
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 bg-rose-50 text-rose-700" onClick={() => handleOpenTxDialog(account, 'expense')}>
                      <ArrowDownLeft className="h-3 w-3 mr-1" /> GASTO
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 glass-card">
            <CardHeader><CardTitle>Últimos Movimientos</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!recentTxs || recentTxs.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-8">No hay transacciones registradas.</p>
                ) : (
                  recentTxs.slice(0, 5).map((move: any) => (
                    <div key={move.id} className="flex items-center justify-between p-3 border-b">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${move.amount > 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                          {move.amount > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{move.description || move.type}</p>
                          <p className="text-xs text-muted-foreground">{new Date(move.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`font-bold ${move.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {move.currency === 'USD' ? 'u$s' : '$'}{Math.abs(move.amount).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Tag className="h-5 w-5" /> Categorías</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {expenseCategories?.map((cat: any) => (
                <div key={cat.id} className="flex justify-between items-center p-2 rounded bg-muted/20">
                  <span className="text-sm">{cat.name}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setIsCategoryManagerOpen(true)}>ADMINISTRAR</Button>
            </CardFooter>
          </Card>
        </section>
      </main>

      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingAccountId ? "Editar Cuenta" : "Nueva Cuenta"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={accountFormData.name} onChange={(e) => setAccountFormData({...accountFormData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={accountFormData.type} onValueChange={(v) => setAccountFormData({...accountFormData, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Efectivo</SelectItem>
                    <SelectItem value="Bank">Banco</SelectItem>
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
              <Label>Saldo Inicial / Actual</Label>
              <Input type="number" value={accountFormData.initialBalance} onChange={(e) => setAccountFormData({...accountFormData, initialBalance: Number(e.target.value)})} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveAccount} className="w-full">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Categorías de Gasto</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input placeholder="Nueva categoría..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              <Button size="icon" onClick={handleAddCategory}><Plus className="h-4 w-4" /></Button>
            </div>
            <ScrollArea className="h-[200px]">
              {expenseCategories?.map((cat: any) => (
                <div key={cat.id} className="flex items-center justify-between p-2 border-b">
                  <span>{cat.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTxDialogOpen} onOpenChange={setIsTxDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{txType === 'income' ? 'Registrar Ingreso' : 'Registrar Gasto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" value={txFormData.amount} onChange={(e) => setTxFormData({...txFormData, amount: Number(e.target.value)})} />
            </div>
            {txType === 'expense' && (
              <div className="space-y-2">
                <Label>Categoría</Label>
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
              <Input placeholder="Ej: Compra de cloro, Pago de cliente..." value={txFormData.description} onChange={(e) => setTxFormData({...txFormData, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleProcessTx} className="w-full">Procesar Operación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  )
}
