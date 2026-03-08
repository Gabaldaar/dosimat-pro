
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
  FilterX 
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { cn } from "@/lib/utils"

export default function TransactionsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [mainView, setMainView] = useState("register")
  const [activeTab, setActiveTab] = useState("sale")
  
  const [filterCustomer, setFilterCustomer] = useState("all")
  const [filterMonth, setFilterMonth] = useState("all")
  const [filterAccount, setFilterAccount] = useState("all")

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
  const [destinationAccounts, setDestinationAccounts] = useState<Record<string, string>>({ ARS: "", USD: "" })
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0])
  
  const [cobroAmount, setCobroAmount] = useState(0)
  const [cobroCurrency, setCobroCurrency] = useState("ARS")
  const [cobroAccountId, setCobroAccountId] = useState("")

  const handleAddItem = (itemId: string) => {
    const item = catalog?.find((i: any) => i.id === itemId)
    if (!item) return
    setSelectedItems(prev => [...prev, { 
      itemId: item.id, 
      name: item.name, 
      qty: 1, 
      price: item.priceARS > 0 ? item.priceARS : item.priceUSD, 
      currency: item.priceARS > 0 ? 'ARS' : 'USD' 
    }])
  }

  const cartTotals = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      acc[item.currency] = (acc[item.currency] || 0) + (item.price * item.qty)
      return acc
    }, { ARS: 0, USD: 0 })
  }, [selectedItems])

  const handleSaveTransaction = () => {
    if (!selectedCustomerId) {
      toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" })
      return
    }

    const txId = Math.random().toString(36).substr(2, 9)
    const client = customers?.find(c => c.id === selectedCustomerId)
    if (!client) return

    if (activeTab === 'cobro') {
      if (cobroAmount <= 0 || !cobroAccountId) return
      
      const txData = {
        id: txId,
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

      toast({ title: "Cobro registrado" })
    } else {
      if (selectedItems.length === 0) return

      // Registrar por cada moneda del carrito
      ['ARS', 'USD'].forEach(curr => {
        const total = cartTotals[curr as 'ARS' | 'USD']
        if (total > 0) {
          const accId = destinationAccounts[curr]
          const txData = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date(operationDate).toISOString(),
            clientId: selectedCustomerId,
            type: activeTab,
            amount: total,
            currency: curr,
            description: `Operación ${activeTab} - ${curr}`,
            financialAccountId: accId || null // NULL = "A Cuenta / Pendiente"
          }

          addDocumentNonBlocking(collection(db, 'transactions'), txData)

          if (accId) {
            const acc = accounts?.find(a => a.id === accId)
            if (acc) updateDocumentNonBlocking(doc(db, 'financial_accounts', acc.id), { initialBalance: (acc.initialBalance || 0) + total })
          } else {
            // "A Cuenta" -> El saldo del cliente baja (debe dinero)
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
      const matchAccount = filterAccount === "all" || tx.financialAccountId === filterAccount
      const matchMonth = filterMonth === "all" || tx.date.startsWith(filterMonth)
      return matchCustomer && matchAccount && matchMonth
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, filterCustomer, filterAccount, filterMonth])

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-primary">Operaciones Cloud</h1>
          <Tabs value={mainView} onValueChange={setMainView}>
            <TabsList><TabsTrigger value="register">Nueva</TabsTrigger><TabsTrigger value="history">Historial</TabsTrigger></TabsList>
          </Tabs>
        </header>

        {mainView === "register" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 glass-card">
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <CardTitle>Detalle de Operación</CardTitle>
                   <Tabs value={activeTab} onValueChange={setActiveTab}>
                     <TabsList>
                        <TabsTrigger value="sale">Venta</TabsTrigger>
                        <TabsTrigger value="refill">Reposición</TabsTrigger>
                        <TabsTrigger value="service">Técnico</TabsTrigger>
                        <TabsTrigger value="cobro">Cobro</TabsTrigger>
                        <TabsTrigger value="adjustment">Interno</TabsTrigger>
                     </TabsList>
                   </Tabs>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><User className="h-4 w-4" /> Cliente</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {customers?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.apellido}, {c.nombre} (ARS: ${c.saldoActual || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Fecha de Operación</Label>
                    <Input type="date" value={operationDate} onChange={(e) => setOperationDate(e.target.value)} />
                  </div>
                </div>

                {activeTab === 'cobro' ? (
                  <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-xl space-y-4">
                    <h3 className="font-bold text-emerald-800 flex items-center gap-2"><Wallet className="h-4 w-4" /> Registrar Pago de Cliente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Monto</Label>
                        <Input type="number" value={cobroAmount} onChange={(e) => setCobroAmount(Number(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Moneda</Label>
                        <Select value={cobroCurrency} onValueChange={setCobroCurrency}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ARS">Pesos ($)</SelectItem>
                            <SelectItem value="USD">Dólares (u$s)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Cuenta Destino</Label>
                        <Select value={cobroAccountId} onValueChange={setCobroAccountId}>
                          <SelectTrigger><SelectValue placeholder="Cuenta..." /></SelectTrigger>
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Agregar Ítems al Carrito</Label>
                      <Select onValueChange={handleAddItem}>
                        <SelectTrigger><SelectValue placeholder="Buscar producto o servicio..." /></SelectTrigger>
                        <SelectContent>{catalog?.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.priceARS > 0 ? '$' : 'u$s'})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Table>
                      <TableHeader><TableRow><TableHead>Ítem</TableHead><TableHead>Cant</TableHead><TableHead className="text-right">Precio</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {selectedItems.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8 italic">El carrito está vacío</TableCell></TableRow>
                        ) : (
                          selectedItems.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.qty}</TableCell>
                              <TableCell className="text-right">{item.currency === 'ARS' ? '$' : 'u$s'} {(item.price || 0).toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card h-fit sticky top-8">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Resumen de Cobro</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {activeTab !== 'cobro' && (
                  <>
                    {cartTotals.ARS > 0 && (
                      <div className="p-4 bg-primary/5 rounded-xl border space-y-2">
                        <p className="text-[10px] font-black text-primary uppercase">Subtotal ARS</p>
                        <p className="text-2xl font-black">${cartTotals.ARS.toLocaleString()}</p>
                        <Select value={destinationAccounts.ARS} onValueChange={(v) => setDestinationAccounts(p => ({...p, ARS: v}))}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pendiente / A Cuenta" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Dejar pendiente (A cuenta)</SelectItem>
                            {accounts?.filter((a: any) => a.currency === 'ARS').map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {cartTotals.USD > 0 && (
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-2">
                        <p className="text-[10px] font-black text-emerald-700 uppercase">Subtotal USD</p>
                        <p className="text-2xl font-black">u$s {cartTotals.USD.toLocaleString()}</p>
                        <Select value={destinationAccounts.USD} onValueChange={(v) => setDestinationAccounts(p => ({...p, USD: v}))}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pendiente / A Cuenta" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Dejar pendiente (A cuenta)</SelectItem>
                            {accounts?.filter((a: any) => a.currency === 'USD').map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
                <Button 
                  className="w-full h-12 font-bold shadow-lg" 
                  disabled={(activeTab !== 'cobro' && selectedItems.length === 0) || (activeTab === 'cobro' && cobroAmount <= 0)} 
                  onClick={handleSaveTransaction}
                >
                  {activeTab === 'cobro' ? 'REGISTRAR COBRO' : 'CONFIRMAR OPERACIÓN'}
                </Button>
                <p className="text-[10px] text-muted-foreground italic text-center">
                  Las operaciones sin cuenta seleccionada se restarán del saldo del cliente.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="glass-card">
              <CardContent className="p-4 flex flex-wrap gap-4 items-end">
                 <div className="space-y-1">
                   <Label className="text-xs">Cliente</Label>
                   <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                     <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Todos</SelectItem>
                       {customers?.map((c: any) => (
                         <SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs">Cuenta Financiera</Label>
                   <Select value={filterAccount} onValueChange={setFilterAccount}>
                     <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Todas</SelectItem>
                       <SelectItem value="null">A Cuenta (Pendiente)</SelectItem>
                       {accounts?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => { setFilterCustomer("all"); setFilterAccount("all"); }}><FilterX className="h-4 w-4" /></Button>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-0">
                {loadingTx ? (
                  <div className="p-12 text-center text-muted-foreground animate-pulse">Cargando transacciones...</div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground italic">No hay transacciones registradas.</div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Fecha</TableHead> <TableHead>Cliente</TableHead><TableHead>Tipo</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredTransactions.map((tx: any) => {
                        const customer = customers?.find(c => c.id === tx.clientId);
                        const isCobro = tx.type === 'cobro';
                        return (
                          <TableRow key={tx.id} className={cn(isCobro && "bg-emerald-50/30")}>
                            <TableCell className="text-xs whitespace-nowrap">{new Date(tx.date).toLocaleDateString('es-AR')}</TableCell>
                            <TableCell className="font-medium">{customer ? `${customer.apellido}, ${customer.nombre}` : 'N/A'}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px] uppercase">{tx.type}</Badge></TableCell>
                            <TableCell className="text-[11px] max-w-[200px] truncate">{tx.description}</TableCell>
                            <TableCell className={cn("text-right font-black", isCobro ? "text-emerald-600" : "text-foreground")}>
                              {tx.currency === 'ARS' ? '$' : 'u$s'} {Math.abs(tx.amount || 0).toLocaleString('es-AR')}
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
