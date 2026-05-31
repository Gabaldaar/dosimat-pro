/**
 * @fileOverview Página de Ayuda y Centro de Documentación de Dosimat Pro.
 * Integra el "Manual Vivo" con capacidades de lectura interactiva y exportación a PDF.
 */

"use client"

import { useState } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  HelpCircle, 
  Truck, 
  Wallet, 
  Users, 
  Package, 
  Banknote, 
  Info, 
  ArrowRight,
  Droplets,
  Calculator,
  CheckCircle2,
  FileText,
  Printer,
  ChevronRight,
  ShieldCheck,
  MessageSquare,
  Search,
  BookOpen
} from "lucide-react"
import { MANUAL_CONTENT, ManualSection } from "@/lib/manual-content"
import { cn } from "@/lib/utils"

export default function HelpPage() {
  const [activeManualSection, setActiveManualSection] = useState<string>("general")

  const handlePrintManual = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <div className="no-print w-full flex">
        <Sidebar />
        <SidebarInset className="flex-1 w-full pb-32 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="flex" />
              <div className="flex items-center gap-2 md:hidden pr-2 border-r">
                 <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
                   <Droplets className="h-4 w-4 text-white" />
                 </div>
                 <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">Dosimat<span className="text-accent-foreground">Pro</span></span>
              </div>
              <h1 className="text-xl md:text-3xl font-headline font-bold text-primary flex items-center gap-2">
                <HelpCircle className="h-7 w-7 text-accent-foreground" />
                Centro de Ayuda
              </h1>
            </div>
            <Button variant="outline" className="font-bold gap-2 border-primary/20 text-primary" onClick={handlePrintManual}>
              <Printer className="h-4 w-4" /> IMPRIMIR MANUAL COMPLETO
            </Button>
          </header>

          <section className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
              <Card className="glass-card border-l-4 border-l-primary overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" /> Manual de Usuario Integrado
                  </CardTitle>
                  <CardDescription>Documentación oficial de Dosimat Pro actualizada en tiempo real.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeManualSection} onValueChange={setActiveManualSection} className="w-full">
                    <ScrollArea className="w-full whitespace-nowrap pb-4">
                      <TabsList className="inline-flex w-full md:w-auto h-auto p-1 bg-muted/50">
                        {MANUAL_CONTENT.map(section => (
                          <TabsTrigger 
                            key={section.id} 
                            value={section.id} 
                            className="text-[10px] font-black uppercase py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-white"
                          >
                            {section.title.split(' ')[0]}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </ScrollArea>

                    {MANUAL_CONTENT.map(section => (
                      <TabsContent key={section.id} value={section.id} className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="space-y-4">
                          <h3 className="text-2xl font-black text-primary">{section.title}</h3>
                          <p className="text-sm leading-relaxed text-slate-600">{section.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-4">
                              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <ChevronRight className="h-4 w-4 text-primary" /> Procesos y Pasos
                              </h4>
                              <div className="space-y-3">
                                {section.steps.map((step, i) => (
                                  <div key={i} className="flex gap-3 p-3 bg-muted/20 rounded-xl border border-white/50">
                                    <div className="h-5 w-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                      {i + 1}
                                    </div>
                                    <p className="text-xs font-medium text-slate-700 leading-snug">{step}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {section.tips && (
                              <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                  <Droplets className="h-4 w-4" /> Tips de Expertos
                                </h4>
                                <div className="space-y-3">
                                  {section.tips.map((tip, i) => (
                                    <div key={i} className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-3">
                                      <Info className="h-4 w-4 text-emerald-600 shrink-0" />
                                      <p className="text-xs italic text-emerald-800">{tip}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h2 className="text-lg font-black uppercase tracking-widest text-muted-foreground">Preguntas Frecuentes (FAQ)</h2>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="font-bold">¿Cómo envío un estado de cuenta a un cliente?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      Ve a <b>Clientes</b>, busca al cliente y presiona el icono de la factura (Recibo). Allí verás su saldo y facturas pendientes. Tienes un botón <b>"COPIAR"</b> que genera un texto profesional listo para pegar en WhatsApp.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger className="font-bold">Eliminé una operación por error, ¿qué pasa con el saldo?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      Al eliminar una operación, el sistema revierte automáticamente el impacto en la caja y en el saldo del cliente. Todo vuelve al estado anterior como si la operación nunca hubiera ocurrido.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger className="font-bold">¿Cómo funcionan las transferencias entre cajas?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      En la pantalla de <b>Cajas</b>, usa el botón "Transferencia". Puedes mover dinero entre cajas de distinta moneda (ej: de Banco ARS a Caja USD). El sistema te pedirá el tipo de cambio para hacer la conversión exacta.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="glass-card bg-primary text-primary-foreground border-none relative overflow-hidden group">
                <Droplets className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 group-hover:scale-110 transition-transform" />
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> Soporte Técnico
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs opacity-90 leading-relaxed">
                    Si encuentras algún error o necesitas una funcionalidad nueva, contacta al administrador del sistema.
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-t-4 border-t-amber-500">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase text-amber-700">Guía de Iconos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-1.5 rounded text-blue-700"><Truck className="h-3.5 w-3.5" /></div>
                    <span className="text-[10px] font-bold uppercase">Logística / Rutas</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-1.5 rounded text-emerald-700"><Wallet className="h-3.5 w-3.5" /></div>
                    <span className="text-[10px] font-bold uppercase">Finanzas / Cajas</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-rose-100 p-1.5 rounded text-rose-700"><Calculator className="h-3.5 w-3.5" /></div>
                    <span className="text-[10px] font-bold uppercase">Deudas / Saldos</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </SidebarInset>
      </div>

      {/* VISTA DE IMPRESIÓN DEL MANUAL (PDF) */}
      <div className="print-only w-full p-12 bg-white text-slate-900 font-sans">
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-10">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Manual de Usuario</h1>
            <p className="text-xl font-bold text-slate-600">Dosimat Pro System v2.0</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black uppercase text-slate-400">Emisión Documental</p>
            <p className="text-sm font-bold">{new Date().toLocaleDateString('es-AR')}</p>
          </div>
        </div>

        <div className="space-y-12">
          {MANUAL_CONTENT.map((section, idx) => (
            <div key={section.id} className="space-y-6 break-inside-avoid pt-6">
              <div className="flex items-baseline gap-4">
                <span className="text-5xl font-black text-slate-200">{String(idx + 1).padStart(2, '0')}</span>
                <h2 className="text-3xl font-black uppercase text-slate-900 border-b-2 border-slate-900 pb-1 flex-1">
                  {section.title}
                </h2>
              </div>
              
              <p className="text-base text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 border-l-4 border-slate-400">
                {section.description}
              </p>

              <div className="grid grid-cols-1 gap-4">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Procedimiento paso a paso</h3>
                <div className="space-y-3">
                  {section.steps.map((step, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="h-6 w-6 rounded bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-1">
                        {i + 1}
                      </div>
                      <p className="text-sm font-bold text-slate-800 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {section.tips && (
                <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recomendaciones del sistema</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    {section.tips.map((tip, i) => (
                      <li key={i} className="text-xs italic text-slate-600 font-medium">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-20 pt-10 border-t border-slate-200 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dosimat Pro © {new Date().getFullYear()} - Documento Confidencial de Uso Interno</p>
        </div>
      </div>

      <MobileNav />
    </div>
  )
}
