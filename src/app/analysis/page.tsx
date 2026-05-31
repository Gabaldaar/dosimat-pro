
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
  Legend
} from "recharts"
import { 
  TrendingUp, 
  FilterX, 
  BarChart3, 
  Calendar,
  Loader2,
  Droplets,
  Target,
  Coins,
  Info,
  Award,
  Users,
  ShieldCheck,
  Zap,
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

export default function AnalysisPage() {
  const db = useFirestore()
  const router = useRouter()
  const { userData, isUserLoading } = useUser()
  const isStaff = useMemo(() => userData && ['Admin', 'Employee', 'Collaborator', 'Communicator', 'Replenisher'].includes(userData.role), [userData]);

  // Redirección por Rol
  useEffect(() => {
    if (!isUserLoading && userData) {
      if (userData.role === 'Replenisher') {
        router.replace('/routes')
      } else if (userData.role === 'Communicator') {
        router.replace('/customers')
      } else if (userData.role === 'Client') {
        router.replace('/portal')
      }
    }
  }, [userData, isUserLoading, router])
  
  // Queries Protegidas
  const txQuery = useMemoFirebase(() => isStaff ? query(collection(db, 'transactions'), orderBy('date', 'desc')) : null, [db, isStaff])
  const clientsQuery = useMemoFirebase(() => isStaff ? collection(db, 'clients') : null, [db, isStaff])
  const expenseCatsQuery = useMemoFirebase(() => isStaff ? collection(db, 'expense_categories') : null, [db, isStaff])
  const payoutsQuery = useMemoFirebase(() => isStaff ? query(collection(db, 'payouts'), orderBy('date', 'desc')) : null, [db, isStaff])

  const { data: transactions, isLoading: loadingTx } = useCollection(txQuery)
  const { data: clients } = useCollection(clientsQuery)
  const { data: expenseCategories } = useCollection(expenseCatsQuery)
  const { data: payouts } = useCollection(payoutsQuery)

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [incomeTypeFilter, setIncomeTypeFilter] = useState("all")
  const [expenseCatFilter, setExpenseCatFilter] = useState("all")
  const [analysisCurrency, setAnalysisCurrency] = useState("ARS")

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

  const accountsReceivable = useMemo(() => {
    if (!clients) return { ARS: 0, USD: 0 }
    return clients.reduce((acc, curr) => {
      const ars = Number(curr.saldoActual || 0)
      const usd = Number(curr.saldoUSD || 0)
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

  if (isUserLoading || !isStaff) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Validando acceso administrativo...</p>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-card bg-emerald-50/30 border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest mb-4">Ingresos Totales ({analysisCurrency})</p>
              <h3 className="text-3xl font-black text-emerald-800">{currencySymbol} {currentSummary.income.toLocaleString('es-AR')}</h3>
            </CardContent>
          </Card>
          <Card className="glass-card bg-rose-50/30 border-l-4 border-l-rose-500">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-rose-700 tracking-widest mb-4">Gastos Operativos</p>
              <h3 className="text-3xl font-black text-rose-800">{currencySymbol} {currentSummary.expense.toLocaleString('es-AR')}</h3>
            </CardContent>
          </Card>
          <Card className="glass-card bg-blue-50/30 border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-blue-700 tracking-widest mb-4">Honorarios Personal</p>
              <h3 className="text-3xl font-black text-blue-800">{currencySymbol} {currentSummary.honorarios.toLocaleString('es-AR')}</h3>
            </CardContent>
          </Card>
          <Card className={cn("glass-card border-l-4", (currentSummary.income - currentSummary.expense - currentSummary.honorarios) >= 0 ? "bg-primary/5 border-l-primary" : "bg-rose-100/20 border-l-rose-600")}>
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest mb-4">Margen Neto Real</p>
              <h3 className={cn("text-3xl font-black", (currentSummary.income - currentSummary.expense - currentSummary.honorarios) >= 0 ? "text-primary" : "text-rose-600")}>
                {currencySymbol} {(currentSummary.income - currentSummary.expense - currentSummary.honorarios).toLocaleString('es-AR')}
              </h3>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-card bg-rose-50 border-l-4 border-l-rose-600 overflow-hidden relative">
            <Receipt className="absolute right-4 top-1/2 -translate-y-1/2 h-16 w-16 text-rose-600/10 -rotate-12" />
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-rose-700 tracking-widest mb-2">Deuda Total Clientes (ARS)</p>
              <h3 className="text-4xl font-black text-rose-800">$ {accountsReceivable.ARS.toLocaleString('es-AR')}</h3>
              <Button variant="link" className="p-0 h-auto text-[10px] font-black text-rose-600 uppercase mt-2 gap-1" onClick={() => router.push('/customers?filterBalance=debt')}>GESTIONAR COBROS <ChevronRight className="h-3 w-3" /></Button>
            </CardContent>
          </Card>
          <Card className="glass-card bg-rose-50 border-l-4 border-l-rose-600 overflow-hidden relative">
            <Coins className="absolute right-4 top-1/2 -translate-y-1/2 h-16 w-16 text-rose-600/10 -rotate-12" />
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-rose-700 tracking-widest mb-2">Deuda Total Clientes (USD)</p>
              <h3 className="text-4xl font-black text-rose-800">u$s {accountsReceivable.USD.toLocaleString('es-AR')}</h3>
              <Button variant="link" className="p-0 h-auto text-[10px] font-black text-rose-600 uppercase mt-2 gap-1" onClick={() => router.push('/customers?filterBalance=debt')}>GESTIONAR COBROS <ChevronRight className="h-3 w-3" /></Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-card col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Evolución Financiera Detallada ({analysisCurrency})</CardTitle>
              <CardDescription>Análisis del flujo mensual separando honorarios de gastos operativos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={annualData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} />
                    <RechartsTooltip formatter={(v: any) => [`${currencySymbol} ${v.toLocaleString('es-AR')}`, '']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="top" align="right" iconType="circle" />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="honorarios" name="Honorarios" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" name="Gastos Operativos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><TableIcon className="h-5 w-5 text-blue-600" /> Auditoría de Honorarios</CardTitle>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">{honorariosTransactions.length} Movimientos</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-xl overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50"><TableRow><TableHead className="text-[10px] font-black uppercase">Fecha</TableHead><TableHead className="text-[10px] font-black uppercase">Descripción / Nota</TableHead><TableHead className="text-right text-[10px] font-black uppercase">Monto ({analysisCurrency})</TableHead></TableRow></TableHeader>
                <TableBody>
                  {honorariosTransactions.length === 0 ? (<TableRow><TableCell colSpan={3} className="text-center py-12 italic text-muted-foreground">Sin transacciones registradas.</TableCell></TableRow>) : honorariosTransactions.map(tx => (
                    <TableRow key={tx.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell className="text-xs font-bold text-slate-600">{new Date(tx.date).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell><p className="text-xs font-bold">{tx.description}</p><p className="text-[9px] text-muted-foreground uppercase">{tx.isPayout ? 'LIQUIDACIÓN SISTEMA' : 'AJUSTE MANUAL'}</p></TableCell>
                      <TableCell className="text-right font-black text-blue-700">{currencySymbol} {Math.abs(tx.amount).toLocaleString('es-AR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </SidebarInset>
      <MobileNav />
    </div>
  )
}
