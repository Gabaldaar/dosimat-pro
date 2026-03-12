
"use client"

import { useState, useMemo, useEffect } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Target
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function AnalysisPage() {
  const db = useFirestore()
  
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

  // Filtered Transactions for Totals and Pie Charts
  const filteredTxs = useMemo(() => {
    if (!transactions) return []
    return transactions.filter(tx => {
      const txDate = tx.date.split('T')[0]
      const matchStart = !startDate || txDate >= startDate
      const matchEnd = !endDate || txDate <= endDate
      
      const isIncome = tx.amount > 0 || tx.type === 'cobro'
      const isExpense = tx.amount < 0 && tx.type !== 'cobro'

      let matchCategory = true
      if (isIncome) {
        matchCategory = incomeTypeFilter === 'all' || tx.type === incomeTypeFilter
      } else if (isExpense) {
        matchCategory = expenseCatFilter === 'all' || tx.expenseCategoryId === expenseCatFilter
      }

      return matchStart && matchEnd && matchCategory
    })
  }, [transactions, startDate, endDate, incomeTypeFilter, expenseCatFilter])

  // Summary Calculations
  const summary = useMemo(() => {
    return filteredTxs.reduce((acc, tx) => {
      const curr = tx.currency === 'USD' ? 'USD' : 'ARS'
      if (tx.amount > 0 || tx.type === 'cobro') {
        acc[curr].income += Math.abs(tx.amount)
      } else {
        acc[curr].expense += Math.abs(tx.amount)
      }
      return acc
    }, { 
      ARS: { income: 0, expense: 0 }, 
      USD: { income: 0, expense: 0 } 
    })
  }, [filteredTxs])

  // Data for Annual Bar Chart (Always last 12 months, ARS only for simplicity or combined)
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
      if (point && tx.currency === 'ARS') {
        if (tx.amount > 0 || tx.type === 'cobro') point.ingresos += Math.abs(tx.amount)
        else point.gastos += Math.abs(tx.amount)
      }
    })

    return last12.map(p => ({ ...p, saldo: p.ingresos - p.gastos }))
  }, [transactions])

  // Data for Income Distribution Pie
  const incomePieData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredTxs.forEach(tx => {
      if (tx.amount > 0 || tx.type === 'cobro') {
        const label = tx.type === 'sale' ? 'Ventas' : 
                      tx.type === 'refill' ? 'Reposiciones' : 
                      tx.type === 'service' ? 'Servicio Técnico' : 
                      tx.type === 'cobro' ? 'Cobros' : 'Otros';
        counts[label] = (counts[label] || 0) + Math.abs(tx.amount)
      }
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredTxs])

  // Data for Expense Distribution Pie
  const expensePieData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredTxs.forEach(tx => {
      if (tx.amount < 0 && tx.type !== 'cobro') {
        const cat = expenseCategories?.find(c => c.id === tx.expenseCategoryId)
        const label = cat ? cat.name : (tx.type === 'Adjustment' || tx.type === 'adjustment' ? 'Ajustes' : 'General');
        counts[label] = (counts[label] || 0) + Math.abs(tx.amount)
      }
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredTxs, expenseCategories])

  // Sugerencia: Ingresos por Zona
  const zoneRevenue = useMemo(() => {
    const revenue: Record<string, number> = {}
    filteredTxs.forEach(tx => {
      if (tx.amount > 0 || tx.type === 'cobro') {
        const client = clients?.find(c => c.id === tx.clientId)
        const zone = zones?.find(z => z.id === client?.zonaId)
        const label = zone ? zone.name : 'Sin Zona'
        revenue[label] = (revenue[label] || 0) + Math.abs(tx.amount)
      }
    })
    return Object.entries(revenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [filteredTxs, clients, zones])

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
                  <SelectItem value="cobro">Cobros</SelectItem>
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
                 <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Total Ingresos</p>
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
                 <p className="text-[10px] font-black uppercase text-rose-700 tracking-widest">Total Gastos</p>
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
          {/* Bar Chart Annual */}
          <Card className="glass-card col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Evolución Anual (ARS)</CardTitle>
              <CardDescription>Comparativa de ingresos vs gastos últimos 12 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={annualData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(v) => `$${v/1000}k`} />
                    <RechartsTooltip 
                      formatter={(v: any) => [`$${v.toLocaleString('es-AR')}`, '']}
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

          {/* Pie Chart Income */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-emerald-500" /> Distribución de Ingresos</CardTitle>
              <CardDescription>Basado en los filtros de fecha aplicados</CardDescription>
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
                      <RechartsTooltip formatter={(v: any) => `$${v.toLocaleString('es-AR')}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center italic text-muted-foreground">No hay datos de ingresos en este periodo.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pie Chart Expense */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-rose-500" /> Distribución de Gastos</CardTitle>
              <CardDescription>Basado en los filtros de fecha aplicados</CardDescription>
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
                      <RechartsTooltip formatter={(v: any) => `$${v.toLocaleString('es-AR')}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center italic text-muted-foreground">No hay datos de gastos en este periodo.</div>
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
                  <MapPin className="h-5 w-5 text-primary" /> Top 5 Zonas por Ingresos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {zoneRevenue.length > 0 ? zoneRevenue.map((z, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-primary/40">#{idx + 1}</span>
                        <span className="font-bold text-sm">{z.name}</span>
                      </div>
                      <span className="font-black text-sm">${z.value.toLocaleString('es-AR')}</span>
                    </div>
                  )) : (
                    <p className="text-center italic text-muted-foreground py-10">Sin datos de zonas.</p>
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
                   <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Ticket Promedio (Periodo)</p>
                   <h3 className="text-3xl font-black mt-1">
                     ${filteredTxs.length > 0 ? (summary.ARS.income / filteredTxs.filter(t => t.amount > 0).length || 1).toLocaleString('es-AR') : '0'}
                   </h3>
                </div>
                <div className="pt-4 border-t border-white/10">
                   <p className="text-xs leading-relaxed opacity-90">
                     El ticket promedio te ayuda a entender cuánto estás cobrando en promedio por visita. Un aumento aquí suele indicar mayor rentabilidad por cliente.
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
