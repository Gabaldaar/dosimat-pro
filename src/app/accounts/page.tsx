"use client"

import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Building2, 
  Wallet, 
  Banknote,
  MoreVertical,
  ArrowRightLeft
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"

const accounts = [
  { id: 1, name: "Caja Efectivo ARS", type: "Cash", balance: 145000, currency: "ARS", status: "ok" },
  { id: 2, name: "Banco Galicia", type: "Bank", balance: 850300, currency: "ARS", status: "ok" },
  { id: 3, name: "Caja Efectivo USD", type: "Cash", balance: 2450, currency: "USD", status: "ok" },
  { id: 4, name: "Mercado Pago", type: "Digital", balance: -2500, currency: "ARS", status: "negative" },
]

export default function AccountsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Cuentas Financieras</h1>
            <p className="text-muted-foreground">Estado de saldos y cajas en tiempo real.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferencia
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nueva Cuenta
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.map((account) => (
            <Card key={account.id} className={`glass-card relative overflow-hidden ${account.status === 'negative' ? 'border-destructive/30' : ''}`}>
              {account.status === 'negative' && (
                <div className="absolute top-0 right-0 p-2">
                  <Badge variant="destructive" className="animate-pulse">Saldo Negativo</Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${
                    account.type === 'Bank' ? 'bg-blue-100 text-blue-700' : 
                    account.type === 'Cash' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {account.type === 'Bank' ? <Building2 className="h-5 w-5" /> : 
                     account.type === 'Cash' ? <Banknote className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Ver Movimientos</DropdownMenuItem>
                      <DropdownMenuItem>Ajuste Financiero</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Inactivar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-base mt-2">{account.name}</CardTitle>
                <CardDescription className="text-xs uppercase font-bold tracking-tighter">{account.currency}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    {account.currency === 'USD' ? 'u$s' : '$'}
                    {account.balance.toLocaleString()}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                    <Plus className="h-3 w-3 mr-1" /> INGRESO
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100">
                    <ArrowDownLeft className="h-3 w-3 mr-1" /> GASTO
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-8">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Últimos Movimientos</CardTitle>
              <CardDescription>Resumen de transacciones recientes en todas las cuentas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { desc: "Pago Cliente: Carlos R.", amount: "+$12.500", account: "Banco Galicia", type: "income" },
                  { desc: "Compra Cloro Granulado", amount: "-$45.000", account: "Caja Efectivo ARS", type: "expense" },
                  { desc: "Venta Reposición Líquida", amount: "+$8.200", account: "Caja Efectivo ARS", type: "income" },
                  { desc: "Servicio Técnico: Quinta Paz", amount: "+u$s 50", account: "Caja Efectivo USD", type: "income" },
                ].map((move, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${move.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {move.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{move.desc}</p>
                        <p className="text-xs text-muted-foreground">{move.account}</p>
                      </div>
                    </div>
                    <span className={`font-bold ${move.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {move.amount}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <MobileNav />
    </div>
  )
}