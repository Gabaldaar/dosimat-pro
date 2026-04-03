
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Bar, 
  BarChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell, 
  Pie, 
  PieChart,
  Legend,
  Line,
  LineChart
} from "recharts"
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  FilterX, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Droplets,
  MapPin,
  Target,
  Coins,
  Info,
  HandCoins,
  AlertCircle,
  Clock,
  Award,
  Users,
  ShieldCheck,
  Zap,
  Search,
  ChevronRight,
  Table as TableIcon,
  Receipt
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "../../firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const LABEL_MAP: Record<string, string> = {
  sale: 'Ventas',
  refill: 'Reposiciones',
  'Reposición': 'Reposiciones',
  service: 'Servicio Técnico',
  adjustment: 'Ajustes / Otros',
  Adjustment: 'Ajustes / Otros',
  Expense: 'Gastos Operativos',
  cobro_saldo: 'Cobro de Saldo Histórico'
}

export default function AnalysisPage() {
  const db = useFirestore()
  const router = useRouter()
  const { userData, isUserLoading } = useUser()

  // Redirección por Rol
  useEffect(() => {
    if (!isUserLoading && userData) {
      if (userData.role === 'Replenisher') {
        router.replace('/routes')
      } else if (userData.role === 'Communicator') {
        router.replace('/customers')
      }
    }
  }, [userData, isUserLoading, router])
  
  // Queries
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc')), [db])
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const expenseCatsQuery = useMemoFirebase(() => collection(db, 'expense_categories'), [db])
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const payoutsQuery = useMemoFirebase(() => query(collection(db, 'payouts'), orderBy('date', 'desc')), [db])

  const { data: transactions, isLoading: loadingTx } = useCollection(txQuery)
  const { data: clients } = useCollection(clientsQuery)
  const { data: expenseCategories } = useCollection(expenseCatsQuery)
  const { data: catalog } = useCollection(catalogQuery)
  const { data: payouts } = useCollection(payoutsQuery)

  // Filters State
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [incomeTypeFilter, setIncomeTypeFilter] = useState("all")
  const [expenseCatFilter, setExpenseCatFilter] = useState("all")
  const [analysisCurrency, setAnalysisCurrency] = useState("ARS")

  // Initialize dates
  useEffect(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(now.toISOString().split('T')[0])
  }, [])

  const resetFilters = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(now.toISOString().split('T')[0])
    setIncomeTypeFilter("all")
    setExpenseCatFilter("all")
  }

  const filteredTxsForSummary = useMemo(() => {
    if (!transactions) return []
    return transactions.filter(tx => {
      const txDate = tx.date.split('T')[0]
      const matchStart = !startDate || txDate >= startDate
      const matchEnd = !endDate || txDate <= endDate
      return matchStart && matchEnd
    })
  }, [transactions, startDate, endDate])

  const filteredPayouts = useMemo(() => {
    if (!payouts) return []
    return payouts.filter(p => {
      const pDate = p.date.split('T')[0]
      const matchStart = !startDate || pDate >= startDate
      const matchEnd = !endDate || pDate <= endDate
      return matchStart && matchEnd
    })
  }, [payouts, startDate, endDate])

  // Cálculo de Deudas a Cobrar (Créditos de Clientes)
  const accountsReceivable = useMemo(() => {
    if (!clients) return { ARS: 0, USD: 0 }
    return clients.reduce((acc, curr) => {
      const ars = Number(curr.saldoActual || 0)
      const usd = Number(curr.saldoUSD || 0)
      // Si el saldo es negativo, el cliente debe dinero (es deuda a cobrar)
      if (ars < 0) acc.ARS += Math.abs(ars)
      if (usd < 0) acc.USD += Math.abs(usd)
      return acc
    }, { ARS: 0, USD: 0 })
  }, [clients])

  const summary = useMemo(() => {
    const result = { 
      ARS: { income: 0, expense: 0, honorarios: 0 }, 
      USD: { income: 0, expense: 0, honorarios: 0 } 
    }

    filteredTxsForSummary.forEach(tx => {
      const curr = tx.currency === 'USD' ? 'USD' : 'ARS'
      
      const isPayoutTx = tx.isPayout === true || (tx.type === 'Expense' && !tx.clientId && tx.description?.toLowerCase().includes('liquidación'))
      
      if (tx.type === 'cobro') {
        result[curr].income += Math.abs(tx.amount)
      } else if (['sale', 'refill', 'service', 'Reposición'].includes(tx.type)) {
        result[curr].income += Number(tx.paidAmount || 0)
      } else if ((tx.type === 'adjustment' || tx.type === 'Adjustment') && tx.amount > 0) {
        result[curr].income += tx.amount
      }

      if (isPayoutTx) {
        result[curr].honorarios += Math.abs(tx.amount)
      } else if (tx.type === 'Expense' || ((tx.type === 'adjustment' || tx.type === 'Adjustment') && tx.amount < 0)) {
        result[curr].expense += Math.abs(tx.amount)
      }
    })

    return result
  }, [filteredTxsForSummary])

  const annualData = useMemo(() => {
    if (!transactions) return []
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    
    const last12 = Array.from({ length: 12 }, (_, i) => {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - (11 - i))
      return { 
        name: months[d.getMonth()], 
        month: d.getMonth(), 
        year: d.getFullYear(), 
        ingresos: 0, 
        gastos: 0,
        honorarios: 0,
        saldo: 0
      }
    })

    transactions.forEach(tx => {
      const txDate = new Date(tx.date)
      const point = last12.find(p => p.month === txDate.getMonth() && p.year === txDate.getFullYear())
      if (point && tx.currency === analysisCurrency) {
        const isPayoutTx = tx.isPayout === true || (tx.type === 'Expense' && !tx.clientId && tx.description?.toLowerCase().includes('liquidación'))

        if (tx.type === 'cobro') point.ingresos += Math.abs(tx.amount)
        else if (['sale', 'refill', 'service', 'Reposición'].includes(tx.type)) point.ingresos += Number(tx.paidAmount || 0)
        else if ((tx.type === 'adjustment' || tx.type === 'Adjustment') && tx.amount > 0) point.ingresos += tx.amount
        
        if (isPayoutTx) {
          point.honorarios += Math.abs(tx.amount)
        } else if (tx.type === 'Expense' || ((tx.type === 'adjustment' || tx.type === 'Adjustment') && tx.amount < 0)) {
          point.gastos += Math.abs(tx.amount)
        }
      }
    })

    return last12.map(p => ({ ...p, saldo: p.ingresos - (p.gastos + p.honorarios) }))
  }, [transactions, analysisCurrency])

  const honorariosTransactions = useMemo(() => {
    return filteredTxsForSummary
      .filter(tx => {
        const isPayout = tx.isPayout === true || (tx.type === 'Expense' && !tx.clientId && tx.description?.toLowerCase().includes('liquidación'))
        return isPayout && tx.currency === analysisCurrency
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [filteredTxsForSummary, analysisCurrency])

  const productProfitability = useMemo(() => {
    const data: Record<string, { facturado: number, honorarios: number, unidades: number }> = {
      'Cloro': { facturado: 0, honorarios: 0, unidades: 0 },
      'Ácido': { facturado: 0, honorarios: 0, unidades: 0 }
    }

    filteredTxsForSummary.forEach(tx => {
      if (tx.currency !== analysisCurrency) return
      if (['sale', 'refill', 'Reposición'].includes(tx.type) && tx.items) {
        tx.items.forEach((item: any) => {
          const name = item.name.toLowerCase()
          let key = ""
          if (name.includes('cloro')) key = 'Cloro'
          else if (name.includes('acido') || name.includes('ácido')) key = 'Ácido'
          
          if (key) {
            const subtotal = item.price * item.qty * (1 - (item.discount || 0) / 100)
            data[key].facturado += subtotal
            data[key].unidades += item.qty
          }
        })
      }
    })

    filteredPayouts.forEach(p => {
      if (analysisCurrency !== 'ARS') return 
      
      p.routeItemsSnapshot?.forEach((item: any) => {
        const itemPayment = p.items?.find((i: any) => i.type === 'items')
        if (itemPayment) {
          const totalBidones = p.routeItemsSnapshot.reduce((sum: number, it: any) => sum + (it.cloro || 0) + (it.acido || 0), 0)
          const paymentPerBidon = itemPayment.amount / (totalBidones || 1)
          
          data['Cloro'].honorarios += (item.cloro || 0) * paymentPerBidon
          data['Ácido'].honorarios += (item.acido || 0) * paymentPerBidon
        }
      })
    })

    return Object.entries(data).map(([name, vals]) => ({
      name,
      ...vals,
      margen: vals.facturado - vals.honorarios
    }))
  }, [filteredTxsForSummary, filteredPayouts, analysisCurrency])

  const honorsByConcept = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredPayouts.forEach(p => {
      p.items?.forEach((it: any) => {
        if (it.currency === analysisCurrency) {
          const label = it.type === 'items' ? 'Por Bidones' : it.type === 'base' ? 'Sueldo Base' : it.description
          counts[label] = (counts[label] || 0) + Number(it.amount)
        }
      })
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredPayouts, analysisCurrency])

  if (isUserLoading || userData?.role === 'Communicator' || userData?.role === 'Replenisher') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-medium">Accediendo...</p>
      </div>
    )
  }

  const currencySymbol = analysisCurrency === 'ARS' ? '$' : 'u$s';
  const currentSummary = summary[analysisCurrency as 'ARS' | 'USD'];

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-8 overflow-x-hidden pb-32">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <div className="flex items-center gap-2 md:hidden pr-2 border-r">
               <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20"><Droplets className="h-4 w-4 text-white" /></div>
               <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">DosimatPro</span>
            </div>
            <h1 className="text-xl md:text-3xl font-bold text-primary font-headline flex items-center gap-2">
              <BarChart3 className="h-7 w-7" /> Análisis Estratégico
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-2xl border shadow-inner">
            <Coins className="h-4 w-4 text-muted-foreground ml-2" />
            <Tabs value={analysisCurrency} onValueChange={setAnalysisCurrency} className="w-auto">
              <TabsList className="bg-transparent h-9 p-0 gap-1">
                <TabsTrigger value="ARS" className="text-[10px] font-black h-7 px-5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">PESOS</TabsTrigger>
                <TabsTrigger value="USD" className="text-[10px] font-black h-7 px-5 rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white">DÓLARES</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </header>

        {/* Filters */}
        <Card className="glass-card p-4 border-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Desde</Label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Hasta</Label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Rubro Ingresos</Label>
              <Select value={incomeTypeFilter} onValueChange={setIncomeTypeFilter}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sale">Ventas</SelectItem>
                  <SelectItem value="refill">Reposiciones</SelectItem>
                  <SelectItem value="service">Servicio Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Rubro Gastos</Label>
              <Select value={expenseCatFilter} onValueChange={setExpenseCatFilter}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {expenseCategories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="h-10 font-bold border-dashed" onClick={resetFilters}>
              <FilterX className="h-4 w-4 mr-2" /> Limpiar Filtros
            </Button>
          </div>
        </Card>

        {/* Totals Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-card bg-emerald-50/30 border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest mb-4">Ingresos Totales ({analysisCurrency})</p>
              <h3 className="text-3xl font-black text-emerald-800">
                {currencySymbol} {currentSummary.income.toLocaleString('es-AR')}
              </h3>
            </CardContent>
          </Card>

          <Card className="glass-card bg-rose-50/30 border-l-4 border-l-rose-500">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-rose-700 tracking-widest mb-4">Gastos Operativos</p>
              <h3 className="text-3xl font-black text-rose-800">
                {currencySymbol} {currentSummary.expense.toLocaleString('es-AR')}
              </h3>
            </CardContent>
          </Card>

          <Card className="glass-card bg-blue-50/30 border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-blue-700 tracking-widest mb-4">Honorarios Personal</p>
              <h3 className="text-3xl font-black text-blue-800">
                {currencySymbol} {currentSummary.honorarios.toLocaleString('es-AR')}
              </h3>
            </CardContent>
          </Card>

          <Card className={cn(
            "glass-card border-l-4 relative overflow-hidden",
            (currentSummary.income - currentSummary.expense - currentSummary.honorarios) >= 0 ? "bg-primary/5 border-l-primary" : "bg-rose-100/20 border-l-rose-600"
          )}>
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest mb-4">Margen Neto Real</p>
              <h3 className={cn(
                "text-3xl font-black",
                (currentSummary.income - currentSummary.expense - currentSummary.honorarios) >= 0 ? "text-primary" : "text-rose-600"
              )}>
                {currencySymbol} {(currentSummary.income - currentSummary.expense - currentSummary.honorarios).toLocaleString('es-AR')}
              </h3>
            </CardContent>
          </Card>
        </div>

        {/* Sección de Deudas a Cobrar (NUEVO) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-card bg-rose-50 border-l-4 border-l-rose-600 overflow-hidden relative">
            <Receipt className="absolute right-4 top-1/2 -translate-y-1/2 h-16 w-16 text-rose-600/10 -rotate-12" />
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-rose-700 tracking-widest mb-2">Deuda Total Clientes (ARS)</p>
                  <h3 className="text-4xl font-black text-rose-800">
                    $ {accountsReceivable.ARS.toLocaleString('es-AR')}
                  </h3>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-[10px] font-black text-rose-600 uppercase mt-2 gap-1"
                    onClick={() => router.push('/customers?filterBalance=debt')}
                  >
                    GESTIONAR COBROS <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card bg-rose-50 border-l-4 border-l-rose-600 overflow-hidden relative">
            <Coins className="absolute right-4 top-1/2 -translate-y-1/2 h-16 w-16 text-rose-600/10 -rotate-12" />
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-rose-700 tracking-widest mb-2">Deuda Total Clientes (USD)</p>
                  <h3 className="text-4xl font-black text-rose-800">
                    u$s {accountsReceivable.USD.toLocaleString('es-AR')}
                  </h3>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-[10px] font-black text-rose-600 uppercase mt-2 gap-1"
                    onClick={() => router.push('/customers?filterBalance=debt')}
                  >
                    GESTIONAR COBROS <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-card col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Evolución Financiera Detallada ({analysisCurrency})
              </CardTitle>
              <CardDescription>Análisis del flujo mensual separando honorarios de gastos operativos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={annualData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} />
                    <RechartsTooltip 
                      formatter={(v: any) => [`${currencySymbol} ${v.toLocaleString('es-AR')}`, '']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="honorarios" name="Honorarios" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" name="Gastos Operativos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Zap className="h-5 w-5" /> Margen por Producto (Honorarios)
              </CardTitle>
              <CardDescription>Comparación entre el total facturado y el honorario pagado por la entrega</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productProfitability} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                    <XAxis type="number" axisLine={false} tickLine={false} fontSize={10} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={60} fontSize={12} fontStyle="bold" />
                    <RechartsTooltip formatter={(v: any) => `${currencySymbol} ${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="facturado" name="Total Facturado" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="honorarios" name="Honorarios Pagados" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Users className="h-5 w-5" /> Distribución de Costos de Personal
              </CardTitle>
              <CardDescription>En qué conceptos se invierte el presupuesto de honorarios en {analysisCurrency}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {honorsByConcept.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={honorsByConcept}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {honorsByConcept.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(v: any) => `${currencySymbol} ${v.toLocaleString('es-AR')}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center italic text-muted-foreground gap-2">
                    <Info className="h-8 w-8 opacity-20" />
                    No hay liquidaciones registradas en este periodo.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sección de Auditoría Detallada */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2"><TableIcon className="h-5 w-5 text-blue-600" /> Auditoría de Honorarios</CardTitle>
                <CardDescription>Listado exacto de transacciones clasificadas estructuralmente como Honorarios (Sin clientes asociados)</CardDescription>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">{honorariosTransactions.length} Movimientos</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-xl overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Fecha</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Descripción / Nota</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Monto ({analysisCurrency})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {honorariosTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 italic text-muted-foreground">
                        No se encontraron transacciones de honorarios en este rango de fechas.
                      </TableCell>
                    </TableRow>
                  ) : honorariosTransactions.map(tx => (
                    <TableRow key={tx.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell className="text-xs font-bold text-slate-600">{new Date(tx.date).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell>
                        <p className="text-xs font-bold">{tx.description}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">{tx.isPayout ? 'LIQUIDACIÓN SISTEMA' : 'AJUSTE MANUAL INTERNO'}</p>
                      </TableCell>
                      <TableCell className="text-right font-black text-blue-700">
                        {currencySymbol} {Math.abs(tx.amount).toLocaleString('es-AR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Inteligencia de Personal Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <Card className="glass-card bg-primary text-primary-foreground border-none overflow-hidden relative group">
              <Target className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10" />
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">Inteligencia de Personal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Costo Entrega Avg.</p>
                    <h3 className="text-xl font-black mt-1">
                      {currencySymbol} {filteredPayouts.length > 0 ? (currentSummary.honorarios / (filteredPayouts.reduce((sum, p) => sum + p.routeItemsSnapshot?.length || 0, 0) || 1)).toFixed(0) : '0'}
                    </h3>
                  </div>
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Ratios de Comis.</p>
                    <h3 className="text-xl font-black mt-1">
                      {currentSummary.income > 0 ? ((currentSummary.honorarios / currentSummary.income) * 100).toFixed(1) : '0'}%
                    </h3>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/10 space-y-3">
                   <div className="flex gap-3">
                     <div className="bg-white/20 p-2 rounded-lg h-fit"><Award className="h-4 w-4" /></div>
                     <p className="text-xs leading-relaxed">
                       <b>Eficiencia de Costo:</b> El costo promedio por entrega incluye honorarios base + extras (KM/Horas) divididos por los bidones entregados.
                     </p>
                   </div>
                   <div className="flex gap-3">
                     <div className="bg-white/20 p-2 rounded-lg h-fit"><AlertCircle className="h-4 w-4" /></div>
                     <p className="text-xs leading-relaxed">
                       <b>Ratio de Honorarios:</b> Representa qué porcentaje de lo facturado se destina a pagar al personal. Lo ideal es mantenerlo bajo el 30%.
                     </p>
                   </div>
                </div>
              </CardContent>
           </Card>

           <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" /> Control de Márgenes
                </CardTitle>
                <CardDescription>Alertas de rentabilidad por producto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {productProfitability.map((p, idx) => {
                  const ratio = (p.honorarios / (p.facturado || 1)) * 100;
                  const isHigh = ratio > 25;
                  return (
                    <div key={idx} className="p-3 bg-muted/20 rounded-xl border border-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{p.name}</span>
                        <Badge variant={isHigh ? "destructive" : "secondary"} className="text-[9px]">
                          Honorarios: {ratio.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                        <span>Margen Bruto:</span>
                        <span className={cn(isHigh ? "text-rose-600" : "text-emerald-600")}>
                          {currencySymbol} {p.margen.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
           </Card>

           <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-primary" /> Eficiencia por Colaborador
                </CardTitle>
                <CardDescription>Top 3 colaboradores por volumen de entrega</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredPayouts.length > 0 ? (
                  (() => {
                    const collabData: Record<string, number> = {}
                    filteredPayouts.forEach(p => {
                      const units = p.routeItemsSnapshot?.reduce((sum: number, it: any) => sum + (it.cloro || 0) + (it.acido || 0), 0) || 0
                      collabData[p.userName] = (collabData[p.userName] || 0) + units
                    })
                    return Object.entries(collabData)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([name, units], idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-xs">#{idx+1}</div>
                            <span className="font-bold text-sm">{name}</span>
                          </div>
                          <span className="font-black text-sm text-primary">{units} <span className="text-[10px] opacity-60">UNID.</span></span>
                        </div>
                      ))
                  })()
                ) : (
                  <p className="text-center italic text-muted-foreground py-10">Sin datos de actividad.</p>
                )}
              </CardContent>
           </Card>
        </section>
      </SidebarInset>
      <MobileNav />
    </div>
  )
}
