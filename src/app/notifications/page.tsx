"use client"

import { useState } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Send, Copy, RefreshCw, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generatePersonalizedNotification, type GenerateNotificationOutput } from "@/ai/flows/generate-personalized-notifications"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

export default function NotificationsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<GenerateNotificationOutput | null>(null)
  
  const [formData, setFormData] = useState({
    customerName: "",
    eventType: "chlorineRefill" as const,
    eventDetails: ""
  })

  const handleGenerate = async () => {
    if (!formData.customerName || !formData.eventDetails) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el nombre del cliente y los detalles del evento.",
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

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      
      <SidebarInset className="flex-1 w-full pb-20 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex items-center gap-4">
          <SidebarTrigger className="hidden md:flex" />
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-accent-foreground" />
              Notificaciones IA
            </h1>
            <p className="text-muted-foreground">Genera mensajes personalizados y efectivos para tus clientes.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Configurar Evento</CardTitle>
              <CardDescription>Describe la situación para que la IA redacte el mensaje.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Nombre del Cliente</Label>
                <Select onValueChange={(v) => setFormData({...formData, customerName: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Carlos Rodríguez">Carlos Rodríguez</SelectItem>
                    <SelectItem value="Ana Martínez">Ana Martínez</SelectItem>
                    <SelectItem value="Estancia La Paz">Estancia La Paz</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Alerta</Label>
                <Select 
                  defaultValue="chlorineRefill" 
                  onValueChange={(v: any) => setFormData({...formData, eventType: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chlorineRefill">Reposición de Cloro</SelectItem>
                    <SelectItem value="overduePayment">Pago Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Detalles Específicos</Label>
                <Textarea 
                  id="details" 
                  placeholder={formData.eventType === 'overduePayment' ? "Monto: $5000, Fecha vto: 15/08" : "Última reposición hace 15 días, piscina de 50.000L"}
                  className="min-h-[100px]"
                  value={formData.eventDetails}
                  onChange={(e) => setFormData({...formData, eventDetails: e.target.value})}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleGenerate} 
                disabled={isLoading}
                className="w-full bg-primary font-bold shadow-lg shadow-primary/20"
              >
                {isLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {isLoading ? "Generando..." : "Generar Mensaje con IA"}
              </Button>
            </CardFooter>
          </Card>

          <div className="space-y-6">
            {result ? (
              <Card className="border-primary/30 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Contenido del resultado IA omitido para brevedad */}
              </Card>
            ) : (
              <div className="h-full min-h-[300px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-white/50">
                <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-2">IA Lista para Ayudar</h3>
                <p className="text-sm max-w-[300px]">Completa los detalles a la izquierda para generar una comunicación profesional.</p>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>

      <MobileNav />
    </div>
  )
}