
"use client"

import { useState, useMemo, useEffect } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, FileText, Info, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

export default function TemplatesPage() {
  const { toast } = useToast()
  const db = useFirestore()
  
  const templatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db])
  const { data: templates, isLoading } = useCollection(templatesQuery)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: ""
  })

  // Evitar bloqueo de puntero
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        if (!isDialogOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen]);

  const handleOpenDialog = (template?: any) => {
    if (template) {
      setEditingTemplateId(template.id)
      setFormData({
        name: template.name,
        subject: template.subject,
        body: template.body
      })
    } else {
      setEditingTemplateId(null)
      setFormData({ name: "", subject: "", body: "" })
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.name || !formData.subject || !formData.body) {
      toast({ title: "Error", description: "Todos los campos son obligatorios", variant: "destructive" })
      return
    }

    const id = editingTemplateId || Math.random().toString(36).substr(2, 9)
    
    setDocumentNonBlocking(doc(db, 'email_templates', id), { ...formData, id }, { merge: true })
    setIsDialogOpen(false)
    toast({ title: editingTemplateId ? "Plantilla actualizada" : "Plantilla creada" })
  }

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta plantilla?")) {
      deleteDocumentNonBlocking(doc(db, 'email_templates', id))
      toast({ title: "Plantilla eliminada" })
    }
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full pb-20 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="hidden md:flex" />
            <div>
              <h1 className="text-3xl font-bold text-primary font-headline">Plantillas de Mail</h1>
              <p className="text-muted-foreground">Configura formatos para comunicación automática.</p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()} className="shadow-lg font-bold">
            <Plus className="mr-2 h-4 w-4" /> Nueva Plantilla
          </Button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando plantillas...</p>
            </div>
          ) : templates && templates.length > 0 ? (
            templates.map((tpl: any) => (
              <Card key={tpl.id} className="glass-card group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <FileText className="h-6 w-6 text-primary/40" />
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(tpl)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(tpl.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2 truncate">{tpl.name}</CardTitle>
                  <CardDescription className="truncate italic text-xs">Asunto: {tpl.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/20 p-3 rounded-lg border">
                    {tpl.body}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl bg-muted/5">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground">No tienes plantillas creadas todavía.</p>
              <Button variant="link" onClick={() => handleOpenDialog()}>Crear la primera</Button>
            </div>
          )}
        </section>

        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
              <Info className="h-4 w-4" /> Marcadores Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              "Apellido", 
              "Nombre", 
              "Fecha", 
              "Descripción", 
              "Detalle_Items", 
              "Item", 
              "Cantidad", 
              "Precio", 
              "Moneda", 
              "Subtotal", 
              "Total"
            ].map(m => (
              <div key={m} className="text-[10px] font-mono bg-white border border-blue-100 rounded px-2 py-1 flex justify-between">
                <span className="text-blue-600">{"{{"}{m}{"}}"}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTemplateId ? 'Editar Plantilla' : 'Nueva Plantilla'}</DialogTitle>
              <DialogDescription>Configura el contenido del mensaje y usa marcadores para datos dinámicos.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre Interno</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ej: Factura de Reposición" />
              </div>
              <div className="space-y-2">
                <Label>Asunto del Mail</Label>
                <Input value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} placeholder="Hola {{Nombre}}, aquí tienes tu factura..." />
              </div>
              <div className="space-y-2">
                <Label>Cuerpo del Mensaje</Label>
                <Textarea 
                  value={formData.body} 
                  onChange={(e) => setFormData({...formData, body: e.target.value})} 
                  placeholder="Escribe el mensaje aquí. Usa {{Nombre}}, {{Detalle_Items}}, {{Total}}, etc..."
                  className="min-h-[200px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="font-bold">Guardar Plantilla</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
      <MobileNav />
    </div>
  )
}
