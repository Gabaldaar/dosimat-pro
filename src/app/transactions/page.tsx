"use client"

import { useState } from "react"
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
  DollarSign
} from "lucide-react"

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState("sale")

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-headline font-bold text-primary">Registrar Operación</h1>
          <p className="text-muted-foreground">Entrada rápida de transacciones comerciales.</p>
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
                  {activeTab === 'sale' && <ShoppingCart className="h-5 w-5" />}
                  {activeTab === 'refill' && <Droplets className="h-5 w-5" />}
                  {activeTab === 'service' && <Wrench className="h-5 w-5" />}
                  {activeTab === 'transfer' && <ArrowRightLeft className="h-5 w-5" />}
                  Detalles de la {activeTab === 'sale' ? 'Venta' : activeTab === 'refill' ? 'Reposición' : activeTab === 'service' ? 'Service' : 'Transferencia'}
                </CardTitle>
                <CardDescription>Completa los datos para registrar el movimiento financiero.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Carlos Rodríguez</SelectItem>
                        <SelectItem value="2">Ana Martínez</SelectItem>
                        <SelectItem value="3">Estancia La Paz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="date" className="pl-10" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Producto / Servicio</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ítem del catálogo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="p1">Cloro Líquido x 20L</SelectItem>
                      <SelectItem value="p2">Cloro Granulado x 10Kg</SelectItem>
                      <SelectItem value="s1">Mantenimiento Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monto Total</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="number" placeholder="0.00" className="pl-10 font-bold text-lg" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cuenta Destino</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="¿Dónde ingresa el dinero?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="c1">Caja Efectivo ARS</SelectItem>
                        <SelectItem value="c2">Banco Galicia</SelectItem>
                        <SelectItem value="c3">Mercado Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0 border-t mt-6 flex gap-4">
                <Button className="flex-1 h-12 text-lg font-bold shadow-lg shadow-primary/30">Guardar Transacción</Button>
                <Button variant="outline" className="h-12 px-6">Limpiar</Button>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-base">Resumen de Hoy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Ventas Registradas</span>
                    <span className="font-bold">12</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Ingreso Total Hoy</span>
                    <span className="font-bold text-emerald-600">+$245.000</span>
                  </div>
                  <div className="h-px bg-border w-full" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Próxima Visita</span>
                    <span className="font-bold text-primary">Quinta María (14:00)</span>
                  </div>
                </CardContent>
              </Card>

              <div className="p-6 bg-primary/10 rounded-xl border border-primary/20">
                <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Tip Pro
                </h4>
                <p className="text-xs text-primary/80 leading-relaxed">
                  Recuerda que si el cliente paga en dólares, debes registrar el monto en la cuenta "Caja Efectivo USD" para mantener los saldos correctos.
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