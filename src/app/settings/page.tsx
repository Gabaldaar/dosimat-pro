"use client"

import { useState, useEffect } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Building2, 
  Mail, 
  MessageSquare, 
  Globe, 
  MapPin, 
  Save, 
  Loader2, 
  Droplets,
  ShieldCheck,
  Smartphone,
  CheckCircle2
} from "lucide-react"
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useUser } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'

  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'company'), [db])
  const { data: settings, isLoading: loadingSettings } = useDoc(settingsRef)

  const [formData, setFormData] = useState({
    name: "Dosimat Pro",
    supportEmail: "",
    supportWhatsapp: "",
    address: "",
    website: ""
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name || "Dosimat Pro",
        supportEmail: settings.supportEmail || "",
        supportWhatsapp: settings.supportWhatsapp || "",
        address: settings.address || "",
        website: settings.website || ""
      })
    }
  }, [settings])

  const handleSave = () => {
    if (!isAdmin) return
    setDocumentNonBlocking(settingsRef, {
      ...formData,
      id: 'company',
      updatedAt: new Date().toISOString()
    }, { merge: true })
    toast({ title: "Configuración guardada", description: "Los datos de la empresa han sido actualizados." })
  }

  if (isUserLoading || loadingSettings) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full pb-32 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex items-center gap-4">
          <SidebarTrigger className="flex" />
          <div className="flex items-center gap-2 md:hidden pr-2 border-r">
             <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
               <Droplets className="h-4 w-4 text-white" />
             </div>
             <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">DosimatPro</span>
          </div>
          <h1 className="text-xl md:text-3xl font-headline font-bold text-primary">Configuración</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card border-l-4 border-l-primary overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-3 text-primary mb-1">
                  <Building2 className="h-6 w-6" />
                  <CardTitle>Datos de la Empresa</CardTitle>
                </div>
                <CardDescription>
                  Configura los datos que tus clientes verán en su panel de autogestión y comprobantes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nombre Comercial</Label>
                      <Input 
                        value={formData.name} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        className="bg-white font-bold"
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sitio Web</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          value={formData.website} 
                          onChange={(e) => setFormData({...formData, website: e.target.value})} 
                          className="bg-white pl-10"
                          placeholder="www.dosimat.com.ar"
                          disabled={!isAdmin}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-primary tracking-widest">WhatsApp de Soporte (Clientes)</Label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                        <Input 
                          value={formData.supportWhatsapp} 
                          onChange={(e) => setFormData({...formData, supportWhatsapp: e.target.value})} 
                          className="bg-white pl-10 border-emerald-100"
                          placeholder="54911..."
                          disabled={!isAdmin}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Email de Soporte (Clientes)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                        <Input 
                          value={formData.supportEmail} 
                          onChange={(e) => setFormData({...formData, supportEmail: e.target.value})} 
                          className="bg-white pl-10 border-primary/10"
                          placeholder="administracion@dosimat.pro"
                          disabled={!isAdmin}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Dirección / Depósito</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        value={formData.address} 
                        onChange={(e) => setFormData({...formData, address: e.target.value})} 
                        className="bg-white pl-10"
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              {isAdmin && (
                <CardFooter className="bg-slate-50 border-t p-4 flex justify-end">
                  <Button onClick={handleSave} className="gap-2 font-bold px-8">
                    <Save className="h-4 w-4" /> Guardar Cambios
                  </Button>
                </CardFooter>
              )}
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-3 text-emerald-700 mb-1">
                  <ShieldCheck className="h-6 w-6" />
                  <CardTitle>Seguridad y Acceso</CardTitle>
                </div>
                <CardDescription>Resumen de las políticas de acceso programadas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-3">
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-800 font-medium">
                      <b>Validación de Clientes:</b> El sistema está programado para verificar automáticamente si los nuevos correos registrados pertenecen a tu lista de clientes autorizados.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-800 font-medium">
                      <b>Aislamiento de Datos:</b> Cada cliente tiene un "túnel" de datos único; la programación impide que un usuario vea reposiciones o pagos que no le correspondan.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass-card bg-primary text-primary-foreground border-none overflow-hidden relative group">
              <Smartphone className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10 group-hover:scale-110 transition-transform" />
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">Próximamente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm opacity-90 leading-relaxed">
                  Estamos configurando las bases para el nuevo <b>Panel de Autogestión del Cliente</b>.
                </p>
                <div className="pt-2 space-y-2">
                  <div className="bg-white/10 p-3 rounded-lg text-xs">
                    Los datos que guardes aquí serán los que aparezcan en los botones de "Contacto" del panel de tus clientes.
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase text-slate-500">Ayuda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  Si dejas los campos de WhatsApp o Email vacíos, los clientes no verán los botones de acceso rápido para contactarte desde su panel.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
      <MobileNav />
    </div>
  )
}
