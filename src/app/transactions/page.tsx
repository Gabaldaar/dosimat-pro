"use client"

import { useState, useMemo } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShoppingCart, Droplets, Wrench, RefreshCw, Trash2, ClipboardCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"

export default function TransactionsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [mainView, setMainView] = useState("register")
  const [activeTab, setActiveTab] = useState("sale")
  
  // Firestore Data
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const txQuery = useMemoFirebase(() => collection(db, 'transactions'), [db])

  const { data: customers = [] } = useCollection(clientsQuery)
  const { data: catalog = [] } = useCollection(catalogQuery)
  const { data: accounts = [] } = useCollection(accountsQuery)
  const { data: transactions = [] } = useCollection(txQuery)

  // Registration state
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [destinationAccounts, setDestinationAccounts] = useState<Record<string, string>>({ ARS: "", USD: "" })

  const handleAddItem = (itemId: string) => {
    const item = catalog?.find((i: any) => i.id === itemId)
    if (!item) return
    setSelectedItems(prev => [...prev, { itemId: item.id, name: item.name, qty: 1, price: item.priceARS || item.priceUSD, currency: item.priceARS ? 'ARS' : 'USD' }])
  }

  const cartTotals = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      acc[item.currency] = (acc[item.currency] || 0) + (item.price * item.qty)
      return acc
    }, { ARS: 0, USD: 0 })
  }, [selectedItems])

  const handleSaveTransaction = () => {
    if (!selectedCustomerId || selectedItems.length === 0) return

    const txId = Math.random().toString(36).substr(2, 9)
    const txData = {
      id: txId,
      date: new Date().toISOString(),
      clientId: selectedCustomerId,
      type: activeTab,
      amount: cartTotals.ARS || cartTotals.USD,
      currency: cartTotals.ARS > 0 ? 'ARS' : 'USD',
      description: `Operación ${activeTab} - ${selectedItems.length} ítems`,
      productOrServiceIds: selectedItems.map(i => i.itemId)
    }

    addDocumentNonBlocking(collection(db, 'transactions'), txData)
    
    // Actualizar saldos de cuenta
    if (destinationAccounts.ARS) {
      const acc = accounts?.find((a: any) => a.id === destinationAccounts.ARS)
      if (acc) updateDocumentNonBlocking(doc(db, 'financial_accounts', acc.id), { initialBalance: acc.initialBalance + cartTotals.ARS })
    }
    if (destinationAccounts.USD) {
      const acc = accounts?.find((a: any) => a.id === destinationAccounts.USD)
      if (acc) updateDocumentNonBlocking(doc(db, 'financial_accounts', acc.id), { initialBalance: acc.initialBalance + cartTotals.USD })
    }

    toast({ title: "Transacción registrada en la nube" })
    setSelectedItems([])
    setMainView("history")
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary">Operaciones Cloud</h1>
          <Tabs value={mainView} onValueChange={setMainView}>
            <TabsList><TabsTrigger value="register">Nueva</TabsTrigger><TabsTrigger value="history">Historial</TabsTrigger></TabsList>
          </Tabs>
        </header>

        {mainView === "register" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 glass-card">
              <CardHeader><CardTitle>Detalle de Operación</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>{customers?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Agregar al Carrito</Label>
                    <Select onValueChange={handleAddItem}>
                      <SelectTrigger><SelectValue placeholder="Buscar ítem..." /></SelectTrigger>
                      <SelectContent>{catalog?.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Ítem</TableHead><TableHead>Cant</TableHead><TableHead className="text-right">Precio</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {selectedItems.map((item, i) => (
                      <TableRow key={i}><TableCell>{item.name}</TableCell><TableCell>{item.qty}</TableCell><TableCell className="text-right">{item.currency} {item.price}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Resumen</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {cartTotals.ARS > 0 && (
                  <div className="p-4 bg-primary/5 rounded-xl border">
                    <p className="text-xs font-bold text-muted-foreground">TOTAL ARS</p>
                    <p className="text-2xl font-black">${cartTotals.ARS.toLocaleString()}</p>
                    <Select onValueChange={(v) => setDestinationAccounts(p => ({...p, ARS: v}))}>
                      <SelectTrigger className="mt-2 h-8 text-xs"><SelectValue placeholder="Cuenta de cobro" /></SelectTrigger>
                      <SelectContent>{accounts?.filter((a: any) => a.currency === 'ARS').map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <Button className="w-full" onClick={handleSaveTransaction}>CONFIRMAR OPERACIÓN</Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                <TableBody>
                  {transactions?.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs">{new Date(tx.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{tx.description}</TableCell>
                      <TableCell className="text-right font-bold">{tx.currency} {Math.abs(tx.amount).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
      <MobileNav />
    </div>
  )
}
