"use client"

import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Wallet, 
  AlertCircle, 
  ArrowRight,
  Droplet,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"

const chartData = [
  { month: "Ene", sales: 4500, expenses: 3200 },
  { month: "Feb", sales: 5200, expenses: 3800 },
  { month: "Mar", sales: 4800, expenses: 3500 },
  { month: "Abr", sales: 6100, expenses: 4200 },
  { month: "May", sales: 5900, expenses: 3900 },
  { month: "Jun", sales: 7200, expenses: 4500 },
]

const chartConfig = {
  sales: {
    label: "Ingresos",
    color: "hsl(var(--primary))",
  },
  expenses: {
    label: "Gastos",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig

export default function Dashboard() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar - Desktop */}
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Dashboard</h1>
            <p className="text-muted-foreground">Resumen financiero y de operaciones del día.</p>
          </div>
          <div className="flex gap-2">
            <Button className="shadow-lg rounded-full px-6">
              <Plus className="mr-2 h-4 w-4" /> Nueva Transacción
            </Button>
          </div>
        </header>

        {/* Financial Highlights */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Saldo Total ARS</p>
                  <h3 className="text-2xl font-bold mt-1">$1.240.500</h3>
                </div>
                <div className="bg-primary/10 p-2 rounded-full">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-emerald-600 font-medium">
                <TrendingUp className="h-3 w-3 mr-1" /> +12% vs mes anterior
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Saldo Total USD</p>
                  <h3 className="text-2xl font-bold mt-1">u$s 4.250</h3>
                </div>
                <div className="bg-accent/20 p-2 rounded-full">
                  <Wallet className="h-5 w-5 text-accent-foreground" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-emerald-600 font-medium">
                <TrendingUp className="h-3 w-3 mr-1" /> +3% vs mes anterior
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Clientes con Deuda</p>
                  <h3 className="text-2xl font-bold mt-1">12</h3>
                </div>
                <div className="bg-destructive/10 p-2 rounded-full">
                  <Users className="h-5 w-5 text-destructive" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-destructive font-medium">
                <AlertCircle className="h-3 w-3 mr-1" /> Requiere atención inmediata
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reposiciones Pendientes</p>
                  <h3 className="text-2xl font-bold mt-1">8</h3>
                </div>
                <div className="bg-blue-100 p-2 rounded-full">
                  <Droplet className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-blue-600 font-medium">
                <ArrowRight className="h-3 w-3 mr-1" /> Ver calendario
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Charts & Details */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 glass-card">
            <CardHeader>
              <CardTitle>Flujo de Caja</CardTitle>
              <CardDescription>Comparativa de ingresos y gastos mensuales (ARS)</CardDescription>
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
              <CardTitle>Alertas Críticas</CardTitle>
              <CardDescription>Acciones recomendadas hoy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 flex gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Deuda vencida: Juan Pérez</p>
                  <p className="text-xs text-muted-foreground">Monto: $45.000 (30 días de atraso)</p>
                  <Link href="/notifications" className="text-xs text-primary font-bold mt-2 inline-block">Enviar recordatorio IA</Link>
                </div>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex gap-3">
                <Droplet className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Reposición de Cloro: Quinta María</p>
                  <p className="text-xs text-muted-foreground">Estimado hoy según historial de uso.</p>
                  <Link href="/transactions" className="text-xs text-amber-700 font-bold mt-2 inline-block">Registrar servicio</Link>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex gap-3">
                <Users className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Nuevo Cliente Potencial</p>
                  <p className="text-xs text-muted-foreground">Contacto desde WhatsApp pendiente.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <MobileNav />
    </div>
  )
}
