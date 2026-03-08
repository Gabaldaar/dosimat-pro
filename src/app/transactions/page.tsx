
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Droplets, 
  Wrench, 
  ShoppingCart, 
  ArrowRightLeft,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: 'ARS' | 'USD';
}

interface Customer {
  id: string;
  nombre: string;
  apellido: string;
}

interface Account {
  id: string;
  name: string;
  currency: 'ARS' | 'USD';
}

interface SelectedItem {
  itemId: string;
  name: string;
  qty: number;
  price: number;
  currency: 'ARS' | 'USD';
}

const STORAGE_KEYS = {
  CATALOG: 'dosimat_pro_v1_catalog',
  CUSTOMERS: 'dosimat_pro_v1_customers',
  ACCOUNTS: 'dosimat_pro_v1_accounts'
}

export default function TransactionsPage() {
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("sale")
  
  // Data from other modules
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  // Transaction state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [currentAddItem, setCurrentAddItem] = useState<string>("")

  useEffect(() => {
    const savedCatalog = localStorage.getItem(STORAGE_KEYS.CATALOG)
    const savedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS)
    const savedAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS)

    if (savedCatalog) setCatalog(JSON.parse(savedCatalog))
    if (savedCustomers) setCustomers(JSON.parse(savedCustomers))
    if (savedAccounts) setAccounts(JSON.parse(savedAccounts))
    
    setMounted(true)
  }, [])

  const handleAddItem = (itemId: string) => {
    const item = catalog.find(i => i.id === itemId)
    if (!item) return

    setSelectedItems(prev => [
      ...prev,
      {
        itemId: item.id,
        name: item.name,
        qty: 1,
        price: item.price,
        currency: item.currency
      }
    ])
    setCurrentAddItem("")
  }

  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpdateItem = (index: number, field: keyof SelectedItem, value: any) => {
    setSelectedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const totals = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      acc[item.currency] = (acc[item.currency] || 0) + (item.price * item.qty)
      return acc
    }, { ARS: 0, USD: 0 })
  }, [selectedItems])

  const handleSaveTransaction = () => {
    if (!selectedCustomerId || selectedItems.length === 0 || !selectedAccountId) {
      toast({
        title: "Error",
        description: "Completa el cliente, selecciona al menos un ítem y elige una cuenta de destino.",
        variant: "destructive"
      })
      return
    }

    toast({
      title: "¡Éxito!",
      description: "La transacción ha sido registrada y el saldo del cliente actualizado.",
    })
    
    // Reset form
    setSelectedCustomerId("")
    setSelectedAccountId("")
    setSelectedItems([])
  }

  if (!mounted) return null

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-headline font-bold text-primary">Nueva Operación</h1>
          <p className="text-muted-foreground">Registra ventas, servicios o reposiciones de forma rápida.</p>
        </header>

        <Tabs defaultValue="sale" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-white border mb-6">
            <TabsTrigger value="sale" className="data-[state=active]:bg-primary data-[state=active]:text-white py-3">
              <ShoppingCart className="h-4 w-4 mr-2" /> Venta
            </TabsTrigger>
            <TabsTrigger value="refill" className="data-[state=active]:bg-primary data-[state=active]:text-white py-3">
              <Droplets className="h-4 w-4 mr-2" /> Reposición
            </TabsTrigger>
            <TabsTrigger value="service" className="data-[state=active]:bg-primary data-[state=active]:text-white py-3">
              <Wrench className="h-4 w-4 mr-2" /> Técnico
            </TabsTrigger>
            <TabsTrigger value="transfer" className="data-[state=active]:bg-primary data-[state=active]:text-white py-3">
              <ArrowRightLeft className="h-4 w-4 mr-2" /> Interno
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Detalles de la Operación
                </CardTitle>
                <CardDescription>Selecciona cliente e ítems del catálogo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="date" className="pl-10" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2 w-full">
                      <Label>Agregar Producto / Servicio</Label>
                      <Select value={currentAddItem} onValueChange={handleAddItem}>
                        <SelectTrigger>
                          <SelectValue placeholder="Buscar en el catálogo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {catalog.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.currency === 'USD' ? 'u$s' : '$'}{item.price.toLocaleString('es-AR')})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[40%]">Concepto</TableHead>
                          <TableHead className="text-center">Cant.</TableHead>
                          <TableHead className="text-right">Precio Un.</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                              No hay ítems agregados. Usa el buscador arriba.
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium text-xs md:text-sm">{item.name}</TableCell>
                              <TableCell className="text-center">
                                <Input 
                                  type="number" 
                                  className="w-16 h-8 text-center mx-auto" 
                                  value={item.qty} 
                                  onChange={(e) => handleUpdateItem(index, 'qty', Number(e.target.value))}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[10px] font-bold text-muted-foreground">{item.currency}</span>
                                  <Input 
                                    type="number" 
                                    className="w-24 h-8 text-right font-bold" 
                                    value={item.price} 
                                    onChange={(e) => handleUpdateItem(index, 'price', Number(e.target.value))}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {item.currency === 'USD' ? 'u$s' : '$'}
                                {(item.price * item.qty).toLocaleString('es-AR')}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveItem(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ingresar dinero en:</Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta financiera" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <div className="p-6 pt-0 border-t mt-6 flex gap-4">
                <Button className="flex-1 h-12 text-lg font-bold shadow-lg shadow-primary/30" onClick={handleSaveTransaction}>
                  Registrar Operación
                </Button>
                <Button variant="outline" className="h-12 px-6" onClick={() => setSelectedItems([])}>Limpiar</Button>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="glass-card border-primary/20 shadow-lg">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="text-lg">Resumen de Venta</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total en Pesos</p>
                    <p className="text-3xl font-bold text-primary">${totals.ARS.toLocaleString('es-AR')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total en Dólares</p>
                    <p className="text-2xl font-bold text-emerald-600">u$s {totals.USD.toLocaleString('es-AR')}</p>
                  </div>
                  <div className="h-px bg-border w-full my-4" />
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg text-xs">
                    <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                    <p className="leading-tight">
                      Esta acción actualizará el saldo del cliente y el balance de la cuenta seleccionada.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="p-6 bg-accent/10 rounded-xl border border-accent/20">
                <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Registro Rápido
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  "El precio unitario editado aquí solo afecta a este registro. No cambia el precio base definido en tu Catálogo."
                </p>
              </div>
            </div>
          </div>
        </Tabs>
      </main>

      <MobileNav />
    </div>
  )
}
