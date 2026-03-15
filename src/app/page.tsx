
"use client"

import { useMemo, useEffect } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  TrendingUp, 
  Users, 
  Wallet, 
  AlertCircle, 
  Droplet,
  Plus,
  Loader2,
  MapPin,
  Calendar,
  Droplets,
  ArrowRight,
  Calculator
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export default function Dashboard() {
  const db = useFirestore()
  const router = useRouter()
  const { userData, isUserLoading } = useUser()

  // Redirección para el rol Comunicador
  useEffect(() => {
    if (!isUserLoading && userData?.role === 'Communicator') {
      router.replace('/customers')
    }
  }, [userData, isUserLoading, router])

  // Queries
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(50)), [db])
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  
  // Real-time Data
  const { data: accounts, isLoading: loadingAccounts } = useCollection(accountsQuery)
  const { data: transactions, isLoading: loadingTx } = useCollection(txQuery)
  const { data: clients, isLoading: loadingClients } = useCollection(clientsQuery)

  const totals = useMemo(() => {
    if (!accounts) return { ARS: 0, USD: 0 }
    return accounts.reduce((acc: any, curr: any) => {
      acc[curr.currency] = (acc[curr.currency] || 0) + (curr.initialBalance || 0)
      return acc
    }, { ARS: 0, USD: 0 })
  }, [accounts])

  // Cálculo de Deudas a Cobrar (Suma de saldos negativos de clientes)
  const debtTotals = useMemo(() => {
    if (!clients) return { ARS: 0, USD: 0 }
    return clients.reduce((acc: any, curr: any) => {
      const ars = Number(curr.saldoActual || 0)
      const usd = Number(curr.saldoUSD || 0)
      if (ars < 0) acc.ARS += Math.abs(ars)
      if (usd < 0) acc.USD += Math.abs(usd)
      return acc
    }, { ARS: 0, USD: 0 })
  }, [clients])

  const chartData = useMemo(() => {
    if (!transactions) return []
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      return { 
        month: months[d.getMonth()], 
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        sales: 0, 
        expenses: 0 
      }
    })

    transactions.forEach((tx: any) => {
      const txDate = new Date(tx.date)
      const dataPoint = last6Months.find(p => p.monthIndex === txDate.getMonth() && p.year === txDate.getFullYear())
      if (dataPoint && tx.currency === 'ARS') {
        if (tx.amount > 0) dataPoint.sales += tx.amount
        else dataPoint.expenses += Math.abs(tx.amount)
      }
    })

    return last6Months
  }, [transactions])

  const chartConfig = {
    sales: { label: "Ingresos (ARS)", color: "hsl(var(--primary))" },
    expenses: { label: "Gastos (ARS)", color: "hsl(var(--accent))" },
  } satisfies ChartConfig

  const isLoading = loadingAccounts || loadingTx || loadingClients || isUserLoading

  if (isUserLoading || (userData?.role === 'Communicator')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-medium">Cargando aplicación...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      
      <SidebarInset className="flex-1 w-full pb-48 md:pb-12 p-4 md:p-8 space-y-8 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <div className="flex items-center gap-2 md:hidden pr-2 border-r">
               <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
                 <Droplets className="h-4 w-4 text-white" />
               </div>
               <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">Dosimat<span className="text-accent-foreground">Pro</span></span>
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-headline font-bold text-primary">Dashboard</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/transactions?mode=new">
              <Button className="shadow-lg rounded-full px-6 bg-primary font-bold">
                <Plus className="mr-2 h-4 w-4" /> Nueva Operación
              </Button>
            </Link>
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Sincronizando con Firestore...</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saldo Total ARS</p>
                      <h3 className={cn(
                        "text-2xl font-black mt-1",
                        totals.ARS < 0 ? "text-rose-600" : "text-emerald-600"
                      )}>
                        ${totals.ARS.toLocaleString('es-AR')}
                      </h3>
                    </div>
                    <div className={cn("p-2 rounded-full", totals.ARS < 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600")}>
                      <Wallet className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saldo Total USD</p>
                      <h3 className={cn(
                        "text-2xl font-black mt-1",
                        totals.USD < 0 ? "text-rose-600" : "text-emerald-600"
                      )}>
                        u$s {totals.USD.toLocaleString('es-AR')}
                      </h3>
                    </div>
                    <div className={cn("p-2 rounded-full", totals.USD < 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600")}>
                      <Wallet className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clientes Registrados</p>
                      <h3 className="text-2xl font-black mt-1">{clients?.length || 0}</h3>
                    </div>
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-l-4 border-l-accent">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clientes Reposición</p>
                      <h3 className="text-2xl font-black mt-1">
                        {clients?.filter((c: any) => c.esClienteReposicion).length || 0}
                      </h3>
                    </div>
                    <div className="bg-cyan-100 p-2 rounded-full text-cyan-600">
                      <Droplet className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Nueva sección: Cobranzas Pendientes (Deudas a Cobrar) */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Card 
                className="glass-card bg-rose-50 border-l-4 border-l-rose-500 cursor-pointer hover:bg-rose-100/80 transition-all group overflow-hidden relative"
                onClick={() => router.push('/customers?filterBalance=debt')}
               >
                 <Calculator className="absolute right-4 top-1/2 -translate-y-1/2 h-16 w-16 text-rose-500/10 -rotate-12 group-hover:rotate-0 transition-transform" />
                 <CardContent className="pt-6">
                   <div className="flex justify-between items-center">
                     <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Deudas a Cobrar (ARS)</p>
                       <h3 className="text-3xl font-black mt-1 text-rose-800">
                         ${debtTotals.ARS.toLocaleString('es-AR')}
                       </h3>
                       <p className="text-[10px] mt-1 font-bold text-rose-600 flex items-center gap-1">
                         Ver listado de deudores <ArrowRight className="h-3 w-3" />
                       </p>
                     </div>
                   </div>
                 </CardContent>
               </Card>

               <Card 
                className="glass-card bg-rose-50 border-l-4 border-l-rose-500 cursor-pointer hover:bg-rose-100/80 transition-all group overflow-hidden relative"
                onClick={() => router.push('/customers?filterBalance=debt')}
               >
                 <TrendingUp className="absolute right-4 top-1/2 -translate-y-1/2 h-16 w-16 text-rose-500/10 -rotate-12 group-hover:rotate-0 transition-transform" />
                 <CardContent className="pt-6">
                   <div className="flex justify-between items-center">
                     <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Deudas a Cobrar (USD)</p>
                       <h3 className="text-3xl font-black mt-1 text-rose-800">
                         u$s {debtTotals.USD.toLocaleString('es-AR')}
                       </h3>
                       <p className="text-[10px] mt-1 font-bold text-rose-600 flex items-center gap-1">
                         Ver listado de deudores <ArrowRight className="h-3 w-3" />
                       </p>
                     </div>
                   </div>
                 </CardContent>
               </Card>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 glass-card">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Flujo de Caja Mensual (ARS)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" /> Clientes Recientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {clients && clients.length > 0 ? (
                      clients.slice(0, 4).map((c: any) => (
                        <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                            {c.nombre?.[0] || ''}{c.apellido?.[0] || ''}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{c.apellido}, {c.nombre}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase font-bold tracking-tight">
                              <MapPin className="h-2.5 w-2.5 text-primary" /> {c.localidad || 'S/D'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-center py-4 italic text-muted-foreground">Sin clientes registrados.</p>
                    )}
                    <Link href="/customers" className="block text-center text-xs font-bold text-primary hover:underline mt-2">
                      Gestionar todos los clientes
                    </Link>
                  </CardContent>
                </Card>

                <Card className="glass-card bg-primary text-primary-foreground border-none relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Droplets className="h-24 w-24" />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                      <AlertCircle className="h-5 w-5" /> Alertas Operativas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-white/10 rounded-lg text-xs flex items-center gap-2 backdrop-blur-sm">
                      <Calendar className="h-4 w-4" /> 
                      Próxima revisión de reposiciones: Lunes
                    </div>
                    <div className="p-3 bg-white/10 rounded-lg text-xs flex items-center gap-2 backdrop-blur-sm">
                      <Droplet className="h-4 w-4" /> 
                      {clients?.filter((c: any) => c.equipoInstalado?.enComodato).length || 0} Equipos en comodato activos.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        )}
      </SidebarInset>

      <MobileNav />
    </div>
  )
}
