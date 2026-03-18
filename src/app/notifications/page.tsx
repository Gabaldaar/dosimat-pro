"use client"

import { useState, useMemo } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Send, Copy, RefreshCw, MessageSquare, Mail, Phone, Info, Droplets, AlertTriangle } from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import { generatePersonalizedNotification, type GenerateNotificationOutput } from "@/ai/flows/generate-personalized-notifications"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { useCollection, useMemoFirebase, useFirestore } from "../../firebase"
import { collection } from "firebase/firestore"

export default function NotificationsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<GenerateNotificationOutput | null>(null)
  
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const { data: customers } = useCollection(clientsQuery)

  const sortedCustomers = useMemo(() => {
    if (!customers) return []
    return [...customers].sort((a: any, b: any) => {
      const nameA = `${a.apellido || ""} ${a.nombre || ""}`.toLowerCase();
      const nameB = `${b.apellido || ""} ${b.nombre || ""}`.toLowerCase();
      return nameA.localeCompare(nameB);
    })
  }, [customers])

  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    eventType: "chlorineRefill" as const,
    eventDetails: ""
  })

  const selectedCustomer = customers?.find(c => c.id === formData.customerId)

  const handleGenerate = async () => {
    if (!formData.customerName || !formData.eventDetails) {
      toast({
        title: "Campos requeridos",
        description: "Por favor selecciona un cliente y escribe los detalles del evento.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const output = await generatePersonalizedNotification({
        customerName: formData.customerName,
        eventType: formData.eventType,
        eventDetails: formData.eventDetails
      })
      setResult(output)
    } catch (error) {
      toast({
        title: "Error de IA",
        description: "No se pudo generar la notificación. Intenta de nuevo.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.notificationMessage)
      toast({
        title: "Copiado",
        description: "Mensaje copiado al portapapeles."
      })
    }
  }

  const sendWhatsApp = () => {
    if (!result) return
    const phone = selectedCustomer?.telefono?.replace(/\D/g, '')
    const text = encodeURIComponent(result.notificationMessage)
    window.open(`https://wa.me/${phone || ''}?text=${text}`, '_blank')
  }

  const sendMail = () => {
    if (!result || !selectedCustomer?.mail) {
      if (!selectedCustomer?.mail) {
        toast({ title: "Sin Email", description: "Este cliente no tiene correo registrado.", variant: "destructive" })
      }
      return
    }
    const subject = formData.eventType === 'overduePayment' ? 'Recordatorio de Pago - Dosimat Pro' : 'Aviso de Reposición de Cloro - Dosimat Pro'
    const mailtoLink = `mailto:${selectedCustomer.mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(result.notificationMessage)}`
    window.location.href = mailtoLink
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      
      <SidebarInset className="flex-1 w-full pb-32 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex items-center gap-4">
          <SidebarTrigger className="flex" />
          <div className="flex items-center gap-2 md:hidden pr-2 border-r">
             <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
               <Droplets className="h-4 w-4 text-white" />
             </div>
             <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">Dosimat<span className="text-accent-foreground">Pro</span></span>
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-headline font-bold text-primary flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-accent-foreground hidden md:block" />
              IA Notificaciones
            </h1>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-card shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">1. ¿Qué pasó?</CardTitle>
              <CardDescription>Completa la situación para que la IA sepa qué escribir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Cliente Destinatario</Label>
                <Select onValueChange={(v) => {
                  const c = sortedCustomers?.find(cust => cust.id === v)
                  setFormData({...formData, customerId: v, customerName: c ? `${c.nombre} ${c.apellido}` : ""})
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedCustomers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.apellido}, {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Motivo del Mensaje</Label>
                <Select 
                  defaultValue="chlorineRefill" 
                  onValueChange={(v: any) => setFormData({...formData, eventType: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chlorineRefill">Aviso de Reposición de Cloro</SelectItem>
                    <SelectItem value="overduePayment">Recordatorio de Pago Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Datos de la situación</Label>
                <Textarea 
                  id="details" 
                  placeholder={formData.eventType === 'overduePayment' ? "Ej: Debe $5000 de la visita de la semana pasada." : "Ej: Mañana pasamos por la zona de Pilar y le toca reposición."}
                  className="min-h-[120px] bg-white/50"
                  value={formData.eventDetails}
                  onChange={(e) => setFormData({...formData, eventDetails: e.target.value})}
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-800">
                <Info className="h-5 w-5 shrink-0" />
                <p className="text-[11px] leading-snug">
                  <b>Tip:</b> No necesitas escribir un mail perfecto. Solo pon los datos y la IA hará el resto.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleGenerate} 
                disabled={isLoading}
                className="w-full bg-primary font-bold shadow-xl shadow-primary/20 h-12"
              >
                {isLoading ? (
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-5 w-5" />
                )}
                {isLoading ? "Redactando..." : "Redactar Mensaje"}
              </Button>
            </CardFooter>
          </Card>

          <div className="space-y-6">
            {result ? (
              <Card className="border-primary/30 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white">
                <CardHeader className="bg-primary/5 border-b pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black flex items-center gap-2 text-primary uppercase tracking-widest">
                      <MessageSquare className="h-4 w-4" /> Propuesta de la IA
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-8 gap-2 font-bold text-[10px]">
                      <Copy className="h-3.5 w-3.5" /> COPIAR
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="p-5 bg-slate-50 rounded-xl italic text-sm text-slate-800 whitespace-pre-wrap border leading-relaxed shadow-inner">
                    "{result.notificationMessage}"
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Acción Sugerida
                    </p>
                    <div className="text-sm font-bold text-emerald-900 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                      {result.suggestedAction}
                    </div>
                  </div>

                  <Card className="bg-amber-50 border-amber-200 p-3 shadow-none border-dashed">
                    <div className="flex gap-2 text-amber-800 italic text-[10px]">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <p>Al abrir tu aplicación de correo, asegurate de seleccionar la cuenta <b>Remitente (De:)</b> correspondiente a <b>DOSIMAT</b> antes de enviar este mensaje.</p>
                    </div>
                  </Card>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button onClick={sendWhatsApp} className="bg-emerald-600 hover:bg-emerald-700 font-bold h-11 gap-2">
                      <Phone className="h-4 w-4" /> WhatsApp
                    </Button>
                    <Button onClick={sendMail} variant="outline" className="border-primary text-primary hover:bg-primary/5 font-bold h-11 gap-2">
                      <Mail className="h-4 w-4" /> Email
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50 border-t py-3">
                  <p className="text-[10px] text-muted-foreground italic w-full text-center">
                    Puedes editar el mensaje antes de enviarlo.
                  </p>
                </CardFooter>
              </Card>
            ) : (
              <div className="h-full min-h-[400px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-muted-foreground p-12 text-center bg-white/30 backdrop-blur-sm">
                <div className="bg-primary/10 p-6 rounded-full mb-6">
                  <Sparkles className="h-12 w-12 text-primary/40" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Asistente de Redacción</h3>
                <p className="text-sm max-w-[320px] leading-relaxed">
                  Completa los datos de la izquierda y haz clic en el botón. La IA generará un mensaje profesional listo para enviar.
                </p>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>

      <MobileNav />
    </div>
  )
}
