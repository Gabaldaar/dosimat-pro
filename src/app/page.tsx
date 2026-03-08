
"use client"

import { useMemo } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  TrendingUp, 
  Users, 
  Wallet, 
  AlertCircle, 
  ArrowRight,
  Droplet,
  Plus,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"

export default function Dashboard() {
  const db = useFirestore()

  // Queries a Firestore
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(50)), [db])
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])

  const { data: accounts, isLoading: loadingAccounts } = useCollection(accountsQuery)
  const { data: transactions, isLoading: loadingTx } = useCollection(txQuery)
  const { data: clients, isLoading: loadingClients } = useCollection(clientsQuery)

  // Cálculos de Saldos
  const totals = useMemo(() => {
    if (!accounts) return { ARS: 0, USD: 0 }
    return accounts.reduce((acc: any, curr: any) => {
      acc[curr.currency] = (acc[curr.currency] || 0) + (curr.initialBalance || 0)
      return acc
    }, { ARS: 0, USD: 0 })
  }, [accounts])

  // Procesamiento para el Gráfico (Agrupado por mes)
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

  const isLoading = loadingAccounts || loadingTx || loadingClients

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Dashboard</h1>
            <p className="text-muted-foreground">Resumen financiero de Dosimat Pro sincronizado en la nube.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/transactions">
              <Button className="shadow-lg rounded-full px-6">
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
                      <p className="text-sm font-medium text-muted-foreground">Saldo Total ARS</p>
                      <h3 className="text-2xl font-bold mt-1">${totals.ARS.toLocaleString('es-AR')}</h3>
                    </div>
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Saldo Total USD</p>
                      <h3 className="text-2xl font-bold mt-1">u$s {totals.USD.toLocaleString('es-AR')}</h3>
                    </div>
                    <div className="bg-accent/20 p-2 rounded-full">
                      <Wallet className="h-5 w-5 text-accent-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Clientes Activos</p>
                      <h3 className="text-2xl font-bold mt-1">{clients?.length || 0}</h3>
                    </div>
                    <div className="bg-emerald-100 p-2 rounded-full">
                      <Users className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Operaciones Realizadas</p>
                      <h3 className="text-2xl font-bold mt-1">{transactions?.length || 0}</h3>
                    </div>
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Droplet className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 glass-card">
                <CardHeader>
                  <CardTitle>Flujo de Caja (ARS)</CardTitle>
                  <CardDescription>Comparativa de ingresos y gastos mensuales reales.</CardDescription>
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

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Estado Actual</CardTitle>
                  <CardDescription>Resumen de actividad reciente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {transactions && transactions.length > 0 ? (
                    <div className="space-y-4">
                      {transactions.slice(0, 3).map((tx: any) => (
                        <div key={tx.id} className="p-3 bg-muted/30 rounded-lg flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold uppercase text-muted-foreground">{tx.type}</p>
                            <p className="text-sm font-medium">{tx.description || 'Sin descripción'}</p>
                          </div>
                          <p className={`font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.currency} {Math.abs(tx.amount).toLocaleString()}
                          </p>
                        </div>
                      ))}
                      <Link href="/transactions" className="text-sm text-primary font-bold flex items-center justify-center gap-1 mt-4">
                        Ver todo el historial <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground italic">
                      No hay operaciones registradas todavía.
                    </div>
                  )}
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm font-bold mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-accent-foreground" />
                      Accesos Directos
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/accounts" className="p-2 text-center text-xs bg-accent/10 hover:bg-accent/20 rounded-md transition-colors">
                        Gestionar Cuentas
                      </Link>
                      <Link href="/catalog" className="p-2 text-center text-xs bg-accent/10 hover:bg-accent/20 rounded-md transition-colors">
                        Ver Catálogo
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>

      <MobileNav />
    </div>
  )
}
