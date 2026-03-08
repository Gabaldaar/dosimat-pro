"use client"

import { useState, useMemo } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  User, 
  ClipboardCheck, 
  Calendar as CalendarIcon, 
  Wallet, 
  FilterX,
  Plus,
  Trash2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  TrendingUp,
  Banknote,
  CalendarDays,
  ShoppingBag,
  Droplet,
  Wrench,
  Settings2,
  Receipt
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { cn } from "@/lib/utils"

const txTypeMap: Record<string, { label: string, icon: any, color: string, description: string }> = {
  sale: { label: "Venta", icon: ShoppingBag, color: "text-blue-600 bg-blue-50", description: "Venta general de productos, insumos o accesorios de piscina." },
  refill: { label: "Reposición", icon: Droplet, color: "text-cyan-600 bg-cyan-50", description: "Registro de servicio de reposición de cloro y químicos." },
  service: { label: "Técnico", icon: Wrench, color: "text-indigo-600 bg-indigo-50", description: "Servicios técnicos, reparaciones o visitas de mantenimiento." },
  adjustment: { label: "Interno", icon: Settings2, color: "text-slate-600 bg-slate-50", description: "Ajustes manuales de saldo o correcciones administrativas." },
  cobro: { label: "Cobro", icon: Receipt, color: "text-emerald-600 bg-emerald-50", description: "Registro de pago recibido del cliente para cancelar deuda." },
  FinancialTransferOut: { label: "Transferencia (Salida)", icon: ArrowRightLeft, color: "text-amber-600 bg-amber-50", description: "" },
  FinancialTransferIn: { label: "Transferencia (Entrada)", icon: ArrowRightLeft, color: "text-emerald-600 bg-emerald-50", description: "" },
  Adjustment: { label: "Ajuste de Saldo", icon: RefreshCw, color: "text-slate-600 bg-slate-50", description: "" },
  Expense: { label: "Gasto Manual", icon: ArrowDownLeft, color: "text-rose-600 bg-rose-50", description: "" },
}

export default function TransactionsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [mainView, setMainView] = useState("register")
  const [activeTab, setActiveTab] = useState("sale")
  
  // Filtros Historial
  const [filterCustomer, setFilterCustomer] = useState("all")
  const [filterAccount, setFilterAccount] = useState("all")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterOpType, setFilterOpType] = useState("all") 

  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const txQuery = useMemoFirebase(() => collection(db, 'transactions'), [db])

  const { data: customers } = useCollection(clientsQuery)
  const { data: catalog } = useCollection(catalogQuery)
  const { data: accounts } = useCollection(accountsQuery)
  const { data: transactions, isLoading: loadingTx } = useCollection(txQuery)

  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [destinationAccounts, setDestinationAccounts] = useState<Record<string, string>>({ ARS: "pending", USD: "pending" })
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0])
  
  const [cobroAmount, setCobroAmount] = useState(0)
  const [cobroCurrency, setCobroCurrency] = useState("ARS")
  const [cobroAccountId, setCobroAccountId] = useState("")

  const handleAddItem = (itemId: string) => {
    const item = catalog?.find((i: any) => i.id === itemId)
    if (!item) return
    
    const defaultCurrency = item.priceARS > 0 ? 'ARS' : 'USD'
    const defaultPrice = item.priceARS > 0 ? item.priceARS : item.priceUSD

    setSelectedItems(prev => [...prev, { 
      itemId: item.id, 
      name: item.name, 
      qty: 1, 
      price: defaultPrice, 
      currency: defaultCurrency 
    }])
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...selectedItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setSelectedItems(newItems)
  }

  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index))
  }

  const cartTotals = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      const amount = (Number(item.price) || 0) * (Number(item.qty) || 0)
      acc[item.currency as 'ARS' | 'USD'] = (acc[item.currency as 'ARS' | 'USD'] || 0) + amount
      return acc
    }, { ARS: 0, USD: 0 })
  }, [selectedItems])

  const handleSaveTransaction = () => {
    if (!selectedCustomerId) {
      toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" })
      return
    }

    const client = customers?.find(c => c.id === selectedCustomerId)
    if (!client) return

    if (activeTab === 'cobro') {
      if (cobroAmount <= 0 || !cobroAccountId) return
      
      const txData = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date(operationDate).toISOString(),
        clientId: selectedCustomerId,
        type: 'cobro',
        amount: cobroAmount,
        currency: cobroCurrency,
        description: `Cobro de saldo - ${cobroCurrency}`,
        financialAccountId: cobroAccountId
      }

      addDocumentNonBlocking(collection(db, 'transactions'), txData)
      
      const acc = accounts?.find(a => a.id === cobroAccountId)
      if (acc) updateDocumentNonBlocking(doc(db, 'financial_accounts', acc.id), { initialBalance: (acc.initialBalance || 0) + cobroAmount })
      
      const balanceField = cobroCurrency === 'ARS' ? 'saldoActual' : 'saldoUSD'
      updateDocumentNonBlocking(doc(db, 'clients', client.id), { [balanceField]: (client[balanceField] || 0) + cobroAmount })

      toast({ title: "Cobro registrado correctamente" })
    } else {
      if (selectedItems.length === 0) return

      ['ARS', 'USD'].forEach(curr => {
        const total = cartTotals[curr as 'ARS' | 'USD']
        if (total > 0) {
          const accId = destinationAccounts[curr]
          const isPending = !accId || accId === "pending"
          
          const txData = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date(operationDate).toISOString(),
            clientId: selectedCustomerId,
            type: activeTab,
            amount: total,
            currency: curr,
            description: `Operación ${txTypeMap[activeTab].label} - ${curr}`,
            financialAccountId: isPending ? null : accId
          }

          addDocumentNonBlocking(collection(db, 'transactions'), txData)

          if (!isPending) {
            const acc = accounts?.find(a => a.id === accId)
            if (acc) updateDocumentNonBlocking(doc(db, 'financial_accounts', acc.id), { initialBalance: (acc.initialBalance || 0) + total })
          } else {
            const balanceField = curr === 'ARS' ? 'saldoActual' : 'saldoUSD'
            updateDocumentNonBlocking(doc(db, 'clients', client.id), { [balanceField]: (client[balanceField] || 0) - total })
          }
        }
      })
      toast({ title: "Operación registrada" })
    }

    setSelectedItems([])
    setMainView("history")
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

      return matchCustomer && matchAccount && matchStart && matchEnd && matchType
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, filterCustomer, filterAccount, filterStartDate, filterEndDate, filterOpType])

  const filteredTotals = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      const amount = tx.amount || 0
      acc[tx.currency as 'ARS' | 'USD'] = (acc[tx.currency as 'ARS' | 'USD'] || 0) + amount
      return acc
    }, { ARS: 0, USD: 0 })
  }, [filteredTransactions])

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-primary font-headline">Operaciones Cloud</h1>
          <Tabs value={mainView} onValueChange={setMainView}>
            <TabsList><TabsTrigger value="register">Nueva</TabsTrigger><TabsTrigger value="history">Historial</TabsTrigger></TabsList>
          </Tabs>
        </header>

        {mainView === "register" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            <Card className="lg:col-span-2 glass-card border-t-4 border-t-primary">
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div className="space-y-1">
                     <CardTitle className="text-xl flex items-center gap-2">
                       {activeTab === 'cobro' ? <Receipt className="h-5 w-5 text-emerald-600" /> : <PlusCircle className="h-5 w-5 text-primary" />}
                       {txTypeMap[activeTab].label}
                     </CardTitle>
                     <p className="text-xs text-muted-foreground">{txTypeMap[activeTab].description}</p>
                   </div>
                   <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                     <TabsList className="grid grid-cols-5 w-full">
                        <TabsTrigger value="sale">Venta</TabsTrigger>
                        <TabsTrigger value="refill">Repo</TabsTrigger>
                        <TabsTrigger value="service">Técnico</TabsTrigger>
                        <TabsTrigger value="cobro">Cobro</TabsTrigger>
                        <TabsTrigger value="adjustment">Interno</TabsTrigger>
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
                        {customers?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.apellido}, {c.nombre} (ARS: ${Number(c.saldoActual || 0).toLocaleString('es-AR')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary font-bold"><CalendarIcon className="h-4 w-4" /> Fecha de Operación</Label>
                    <Input type="date" value={operationDate} onChange={(e) => setOperationDate(e.target.value)} className="bg-white" />
                  </div>
                </div>

                {activeTab === 'cobro' ? (
                  <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <h3 className="font-bold text-emerald-800 flex items-center gap-2"><Wallet className="h-4 w-4" /> Registrar Pago de Cliente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Monto a cobrar</Label>
                        <Input type="number" value={cobroAmount} onChange={(e) => setCobroAmount(Number(e.target.value))} className="bg-white font-bold text-lg" />
                      </div>
                      <div className="space-y-2">
                        <Label>Moneda</Label>
                        <Select value={cobroCurrency} onValueChange={setCobroCurrency}>
                          <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ARS">Pesos ($)</SelectItem>
                            <SelectItem value="USD">Dólares (u$s)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Cuenta Destino</Label>
                        <Select value={cobroAccountId} onValueChange={setCobroAccountId}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Caja/Banco..." /></SelectTrigger>
                          <SelectContent>
                            {accounts?.filter(a => a.currency === cobroCurrency).map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-2">
                      <Label className="font-bold">Agregar ítems a la {txTypeMap[activeTab].label}</Label>
                      <Select onValueChange={handleAddItem}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar producto o servicio..." /></SelectTrigger>
                        <SelectContent>
                          {catalog?.map((i: any) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.name} ({i.priceARS > 0 ? '$' : 'u$s'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="font-bold">Ítem</TableHead>
                            <TableHead className="w-24 font-bold text-center">Cant.</TableHead>
                            <TableHead className="w-32 font-bold text-center">Precio</TableHead>
                            <TableHead className="w-24 font-bold text-center">Moneda</TableHead>
                            <TableHead className="text-right font-bold">Subtotal</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12 italic">El carrito está vacío. Agrega ítems para continuar.</TableCell></TableRow>
                          ) : (
                            selectedItems.map((item, i) => (
                              <TableRow key={i} className="hover:bg-muted/10">
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell><Input type="number" value={item.qty} className="h-8 text-center" onChange={(e) => updateItem(i, 'qty', e.target.value)} /></TableCell>
                                <TableCell><Input type="number" value={item.price} className="h-8 text-center" onChange={(e) => updateItem(i, 'price', e.target.value)} /></TableCell>
                                <TableCell>
                                  <Select value={item.currency} onValueChange={(v) => updateItem(i, 'currency', v)}>
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ARS">$</SelectItem>
                                      <SelectItem value="USD">u$s</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-right font-black text-sm">{item.currency === 'ARS' ? '$' : 'u$s'} {((Number(item.price) || 0) * (Number(item.qty) || 0)).toLocaleString('es-AR')}</TableCell>
                                <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card h-fit sticky top-8 shadow-lg">
              <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Confirmación</CardTitle></CardHeader>
              <CardContent className="space-y-6 pt-6">
                {activeTab !== 'cobro' && (
                  <div className="space-y-4">
                    {cartTotals.ARS > 0 && (
                      <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Total en ARS</p>
                          <p className="text-xl font-black text-blue-700">${cartTotals.ARS.toLocaleString('es-AR')}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">Forma de pago</Label>
                          <Select value={destinationAccounts.ARS} onValueChange={(v) => setDestinationAccounts(p => ({...p, ARS: v}))}>
                            <SelectTrigger className="h-9 text-xs bg-white"><SelectValue placeholder="Pendiente / A Cuenta" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">A CUENTA (Deuda del cliente)</SelectItem>
                              {accounts?.filter((a: any) => a.currency === 'ARS').map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    {cartTotals.USD > 0 && (
                      <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Total en USD</p>
                          <p className="text-xl font-black text-emerald-700">u$s {cartTotals.USD.toLocaleString('es-AR')}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">Forma de pago</Label>
                          <Select value={destinationAccounts.USD} onValueChange={(v) => setDestinationAccounts(p => ({...p, USD: v}))}>
                            <SelectTrigger className="h-9 text-xs bg-white"><SelectValue placeholder="Pendiente / A Cuenta" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">A CUENTA (Deuda del cliente)</SelectItem>
                              {accounts?.filter((a: any) => a.currency === 'USD').map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <Button 
                  className="w-full h-14 font-black text-md shadow-xl transition-all hover:scale-[1.02]" 
                  disabled={(activeTab !== 'cobro' && selectedItems.length === 0) || (activeTab === 'cobro' && cobroAmount <= 0) || !selectedCustomerId} 
                  onClick={handleSaveTransaction}
                >
                  {activeTab === 'cobro' ? 'REGISTRAR PAGO RECIBIDO' : `GUARDAR ${txTypeMap[activeTab].label.toUpperCase()}`}
                </Button>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <p className="text-[10px] text-muted-foreground italic leading-tight">
                    * Al usar "A CUENTA", el monto se restará del saldo disponible del cliente. Las ventas directas a cajas/bancos actualizan el saldo de la cuenta elegida.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass-card border-l-4 border-l-primary bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Total Filtrado ARS</p>
                      <h3 className="text-2xl font-black">${filteredTotals.ARS.toLocaleString('es-AR')}</h3>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-full"><TrendingUp className="h-5 w-5 text-primary" /></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card border-l-4 border-l-emerald-500 bg-emerald-50/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Filtrado USD</p>
                      <h3 className="text-2xl font-black">u$s {filteredTotals.USD.toLocaleString('es-AR')}</h3>
                    </div>
                    <div className="p-2 bg-emerald-100 rounded-full"><Banknote className="h-5 w-5 text-emerald-600" /></div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Card className="glass-card">
              <CardContent className="p-4 flex flex-wrap gap-4 items-end">
                 <div className="space-y-1">
                   <Label className="text-xs">Cliente</Label>
                   <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                     <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Todos los clientes</SelectItem>
                       {customers?.map((c: any) => (
                         <SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs">Forma de Pago / Cuenta</Label>
                   <Select value={filterAccount} onValueChange={setFilterAccount}>
                     <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Todas</SelectItem>
                       <SelectItem value="null">A Cuenta (Pendiente)</SelectItem>
                       {accounts?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs">Tipo de Movimiento</Label>
                   <Select value={filterOpType} onValueChange={setFilterOpType}>
                     <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Todos</SelectItem>
                       <SelectItem value="income">Ingresos (+)</SelectItem>
                       <SelectItem value="expense">Egresos (-)</SelectItem>
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
                 <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={() => { setFilterCustomer("all"); setFilterAccount("all"); setFilterStartDate(""); setFilterEndDate(""); setFilterOpType("all"); }}>
                   <FilterX className="h-4 w-4" />
                 </Button>
              </CardContent>
            </Card>

            <Card className="glass-card shadow-sm">
              <CardContent className="p-0">
                {loadingTx ? (
                  <div className="p-12 text-center text-muted-foreground animate-pulse">Sincronizando operaciones...</div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground italic">No se encontraron registros para estos filtros.</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-bold">Fecha</TableHead>
                        <TableHead className="font-bold">Cliente</TableHead>
                        <TableHead className="font-bold">Categoría</TableHead>
                        <TableHead className="font-bold">Detalle</TableHead>
                        <TableHead className="text-right font-bold">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((tx: any) => {
                        const customer = customers?.find(c => c.id === tx.clientId);
                        const typeInfo = txTypeMap[tx.type] || { label: tx.type, icon: PlusCircle, color: "text-slate-600 bg-slate-50" };
                        const Icon = typeInfo.icon;
                        const isIncome = tx.amount > 0 || tx.type === 'cobro';
                        
                        return (
                          <TableRow key={tx.id} className={cn("group hover:bg-muted/5", tx.type === 'cobro' && "bg-emerald-50/10")}>
                            <TableCell className="text-xs whitespace-nowrap font-medium">{new Date(tx.date).toLocaleDateString('es-AR')}</TableCell>
                            <TableCell className="font-bold text-sm">{customer ? `${customer.apellido}, ${customer.nombre}` : 'Sin cliente'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={cn("p-1.5 rounded-full", typeInfo.color)}>
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-tighter">{typeInfo.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-[11px] max-w-[250px] truncate italic text-muted-foreground group-hover:text-foreground transition-colors">{tx.description}</TableCell>
                            <TableCell className={cn("text-right font-black text-sm", isIncome ? "text-emerald-600" : "text-rose-600")}>
                              {tx.currency === 'USD' ? 'u$s' : '$'} {Math.abs(tx.amount || 0).toLocaleString('es-AR')}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  )
}
