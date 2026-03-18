
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
  Legend
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
  Coins
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "../../firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const LABEL_MAP: Record<string, string> = {
  sale: 'Ventas',
  refill: 'Reposiciones',
  service: 'Servicio Técnico',
  adjustment: 'Ajustes / Otros',
  Expense: 'Gastos Generales'
}

export default function AnalysisPage() {
  const db = useFirestore()
  const router = useRouter()
  const { userData, isUserLoading } = useUser()

  // Redirección para el rol Comunicador: No debe ver análisis
  useEffect(() => {
    if (!isUserLoading && userData?.role === 'Communicator') {
      router.replace('/customers')
    }
  }, [userData, isUserLoading, router])
  
  // Queries
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc')), [db])
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const expenseCatsQuery = useMemoFirebase(() => collection(db, 'expense_categories'), [db])
  const zonesQuery = useMemoFirebase(() => collection(db, 'zones'), [db])

  const { data: transactions, isLoading: loadingTx } = useCollection(txQuery)
  const { data: clients } = useCollection(clientsQuery)
  const { data: expenseCategories } = useCollection(expenseCatsQuery)
  const { data: zones } = useCollection(zonesQuery)

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

  const filteredTxsByCurrency = useMemo(() => {
    return filteredTxsForSummary.filter(tx => {
      if (tx.currency !== analysisCurrency) return false
      
      const isIncome = (tx.type !== 'Expense' && tx.type !== 'adjustment' && tx.type !== 'Adjustment') || tx.type === 'cobro'
      const isExpense = tx.type === 'Expense' || (tx.type === 'adjustment' && tx.amount < 0)

      let matchCategory = true
      if (isIncome) {
        const source = tx.type === 'cobro' ? (tx.relatedType || 'sale') : tx.type
        matchCategory = incomeTypeFilter === 'all' || source === incomeTypeFilter
      } else if (isExpense) {
        matchCategory = expenseCatFilter === 'all' || tx.expenseCategoryId === expenseCatFilter
      }

      return matchCategory
    })
  }, [filteredTxsForSummary, analysisCurrency, incomeTypeFilter, expenseCatFilter])

  const summary = useMemo(() => {
    return filteredTxsForSummary.reduce((acc, tx) => {
      const curr = tx.currency === 'USD' ? 'USD' : 'ARS'
      
      if (tx.type === 'cobro') {
        acc[curr].income += Math.abs(tx.amount)
      } else if (tx.type === 'sale' || tx.type === 'refill' || tx.type === 'service') {
        acc[curr].income += Number(tx.paidAmount || 0)
      } else if ((tx.type === 'adjustment' || tx.type === 'Adjustment') && tx.amount > 0) {
        acc[curr].income += tx.amount
      }

      if (tx.type === 'Expense' || ((tx.type === 'adjustment' || tx.type === 'Adjustment') && tx.amount < 0)) {
        acc[curr].expense += Math.abs(tx.amount)
      }
      
      return acc
    }, { 
      ARS: { income: 0, expense: 0 }, 
      USD: { income: 0, expense: 0 } 
    })
  }, [filteredTxsForSummary])

  const annualData = useMemo(() => {
    if (!transactions) return []
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    const last12 = Array.from({ length: 12 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (11 - i))
      return { 
        name: months[d.getMonth()], 
        month: d.getMonth(), 
        year: d.getFullYear(), 
        ingresos: 0, 
        gastos: 0,
        saldo: 0
      }
    })

    transactions.forEach(tx => {
      const txDate = new Date(tx.date)
      const point = last12.find(p => p.month === txDate.getMonth() && p.year === txDate.getFullYear())
      if (point && tx.currency === analysisCurrency) {
        if (tx.type === 'cobro') point.ingresos += Math.abs(tx.amount)
        else if (['sale', 'refill', 'service'].includes(tx.type)) point.ingresos += Number(tx.paidAmount || 0)
        else if ((tx.type === 'adjustment' || tx.type === 'Adjustment') && tx.amount > 0) point.ingresos += tx.amount
        
        if (tx.type === 'Expense' || ((tx.type === 'adjustment' || tx.type === 'Adjustment') && tx.amount < 0)) {
          point.gastos += Math.abs(tx.amount)
        }
      }
    })

    return last12.map(p => ({ ...p, saldo: p.ingresos - p.gastos }))
  }, [transactions, analysisCurrency])

  const incomePieData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredTxsByCurrency.forEach(tx => {
      let amount = 0
      let source = ''

      if (tx.type === 'cobro') {
        amount = Math.abs(tx.amount)
        source = tx.relatedType || 'sale'
      } else if (['sale', 'refill', 'service'].includes(tx.type)) {
        amount = Number(tx.paidAmount || 0)
        source = tx.type
      } else if ((tx.type === 'adjustment' || tx.type === 'Adjustment') && tx.amount > 0) {
        amount = tx.amount
        source = 'adjustment'
      }

      if (amount > 0) {
        const label = LABEL_MAP[source] || source
        counts[label] = (counts[label] || 0) + amount
      }
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredTxsByCurrency])

  const expensePieData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredTxsByCurrency.forEach(tx => {
      if (tx.type === 'Expense' || ((tx.type === 'adjustment' || tx.type === 'Adjustment') && tx.amount < 0)) {
        const cat = expenseCategories?.find(c => c.id === tx.expenseCategoryId)
        const label = cat ? cat.name : 'Ajustes / General'
        counts[label] = (counts[label] || 0) + Math.abs(tx.amount)
      }
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredTxsByCurrency, expenseCategories])

  const zoneRevenue = useMemo(() => {
    const revenue: Record<string, number> = {}
    filteredTxsByCurrency.forEach(tx => {
      let amount = 0
      if (tx.type === 'cobro') amount = Math.abs(tx.amount)
      else if (['sale', 'refill', 'service'].includes(tx.type)) amount = Number(tx.paidAmount || 0)

      if (amount > 0) {
        const client = clients?.find(c => c.id === tx.clientId)
        const zone = zones?.find(z => z.id === client?.zonaId)
        const label = zone ? zone.name : 'Sin Zona'
        revenue[label] = (revenue[label] || 0) + amount
      }
    })
    return Object.entries(revenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [filteredTxsByCurrency, clients, zones])

  if (isUserLoading || userData?.role === 'Communicator') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-medium">
          {userData?.role === 'Communicator' ? 'Redirigiendo a Clientes...' : 'Accediendo...'}
        </p>
      </div>
    )
  }

  if (loadingTx) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

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
              <BarChart3 className="h-7 w-7" /> Análisis Financiero
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
            <Coins className="h-4 w-4 text-muted-foreground ml-2" />
            <Tabs value={analysisCurrency} onValueChange={setAnalysisCurrency} className="w-auto">
              <TabsList className="bg-transparent h-8">
                <TabsTrigger value="ARS" className="text-[10px] font-bold h-7 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">PESOS (ARS)</TabsTrigger>
                <TabsTrigger value="USD" className="text-[10px] font-bold h-7 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">DÓLARES (USD)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </header>

        {/* Filters */}
        <Card className="glass-card p-4 border-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Desde</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Hasta</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Rubro Ingresos</Label>
              <Select value={incomeTypeFilter} onValueChange={setIncomeTypeFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sale">Ventas</SelectItem>
                  <SelectItem value="refill">Reposiciones</SelectItem>
                  <SelectItem value="service">Servicio Técnico</SelectItem>
                  <SelectItem value="adjustment">Ajustes / Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Rubro Gastos</Label>
              <Select value={expenseCatFilter} onValueChange={setExpenseCatFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {expenseCategories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="h-9 font-bold" onClick={resetFilters}>
              <FilterX className="h-4 w-4 mr-2" /> Limpiar
            </Button>
          </div>
        </Card>

        {/* Totals Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card bg-emerald-50/30 border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                 <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Ingresos Reales (Caja)</p>
                 <div className="bg-emerald-100 p-2 rounded-full text-emerald-600"><ArrowUpRight className="h-5 w-5" /></div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-emerald-800">${summary.ARS.income.toLocaleString('es-AR')}</h3>
                <p className="text-sm font-bold text-emerald-600">u$s {summary.USD.income.toLocaleString('es-AR')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card bg-rose-50/30 border-l-4 border-l-rose-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                 <p className="text-[10px] font-black uppercase text-rose-700 tracking-widest">Gastos Reales</p>
                 <div className="bg-rose-100 p-2 rounded-full text-rose-600"><ArrowDownLeft className="h-5 w-5" /></div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-rose-800">${summary.ARS.expense.toLocaleString('es-AR')}</h3>
                <p className="text-sm font-bold text-rose-600">u$s {summary.USD.expense.toLocaleString('es-AR')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card bg-primary/5 border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                 <p className="text-[10px] font-black uppercase text-primary tracking-widest">Resultado Operativo</p>
                 <div className="bg-primary/10 p-2 rounded-full text-primary"><Wallet className="h-5 w-5" /></div>
              </div>
              <div className="space-y-1">
                <h3 className={cn("text-2xl font-black", (summary.ARS.income - summary.ARS.expense) >= 0 ? "text-primary" : "text-rose-600")}>
                  ${(summary.ARS.income - summary.ARS.expense).toLocaleString('es-AR')}
                </h3>
                <p className={cn("text-sm font-bold", (summary.USD.income - summary.USD.expense) >= 0 ? "text-primary" : "text-rose-600")}>
                  u$s {(summary.USD.income - summary.USD.expense).toLocaleString('es-AR')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-card col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Evolución Anual ({analysisCurrency})</CardTitle>
              <CardDescription>Comparativa de ingresos vs gastos reales últimos 12 meses en {analysisCurrency === 'ARS' ? 'Pesos' : 'Dólares'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={annualData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(v) => analysisCurrency === 'ARS' ? `$${v/1000}k` : `u$s${v}`} />
                    <RechartsTooltip 
                      formatter={(v: any) => [analysisCurrency === 'ARS' ? `$${v.toLocaleString('es-AR')}` : `u$s ${v.toLocaleString('es-AR')}`, '']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="top" align="right" />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saldo" name="Saldo" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-emerald-500" /> Ingresos por Rubro ({analysisCurrency})</CardTitle>
              <CardDescription>Distribución del dinero real cobrado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {incomePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {incomePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(v: any) => analysisCurrency === 'ARS' ? `$${v.toLocaleString('es-AR')}` : `u$s ${v.toLocaleString('es-AR')}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center italic text-muted-foreground">No hay datos en {analysisCurrency} para este periodo.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-rose-500" /> Gastos por Categoría ({analysisCurrency})</CardTitle>
              <CardDescription>Distribución basada en rubros de gasto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {expensePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(v: any) => analysisCurrency === 'ARS' ? `$${v.toLocaleString('es-AR')}` : `u$s ${v.toLocaleString('es-AR')}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center italic text-muted-foreground">No hay gastos en {analysisCurrency} para este periodo.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Extra Insights Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Top 5 Zonas ({analysisCurrency})
                </CardTitle>
                <CardDescription>Zonas con mayor recaudación real</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {zoneRevenue.length > 0 ? zoneRevenue.map((z, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-primary/40">#{idx + 1}</span>
                        <span className="font-bold text-sm">{z.name}</span>
                      </div>
                      <span className="font-black text-sm">{analysisCurrency === 'ARS' ? '$' : 'u$s'} {z.value.toLocaleString('es-AR')}</span>
                    </div>
                  )) : (
                    <p className="text-center italic text-muted-foreground py-10">Sin datos de zonas en {analysisCurrency}.</p>
                  )}
                </div>
              </CardContent>
           </Card>

           <Card className="glass-card bg-primary text-primary-foreground border-none overflow-hidden relative group">
              <Target className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10 group-hover:scale-110 transition-transform" />
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">Métricas de Rendimiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                   <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Ticket Promedio ({analysisCurrency})</p>
                   <h3 className="text-3xl font-black mt-1">
                     {analysisCurrency === 'ARS' ? '$' : 'u$s'} {filteredTxsByCurrency.length > 0 ? (summary[analysisCurrency as 'ARS'|'USD'].income / (filteredTxsByCurrency.filter(t => t.amount > 0).length || 1)).toLocaleString('es-AR') : '0'}
                   </h3>
                </div>
                <div className="pt-4 border-t border-white/10">
                   <p className="text-xs leading-relaxed opacity-90">
                     Estás viendo el análisis en <b>{analysisCurrency === 'ARS' ? 'Pesos' : 'Dólares'}</b>. <br/>
                     Este panel utiliza el <b>Criterio de Caja</b>: solo se cuenta el dinero que realmente ingresó o egresó de tus cuentas.
                   </p>
                </div>
              </CardContent>
           </Card>
        </section>
      </SidebarInset>
      <MobileNav />
    </div>
  )
}
