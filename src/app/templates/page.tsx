
"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, FileText, Info, Loader2, MessageSquare, Copy, Droplets, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "../../hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "../../firebase"
import { collection, doc } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const AVAILABLE_MARKERS = [
  "Apellido", 
  "Nombre", 
  "Fecha", 
  "Tipo_Operacion",
  "Categoria_Gasto",
  "Descripción", 
  "Total",
  "Pendiente_Operacion",
  "Detalle_Items", 
  "Item", 
  "Cantidad", 
  "Precio", 
  "Moneda", 
  "Subtotal", 
  "Total_Descuento",
  "Monto_Abonado",
  "Caja_Destino",
  "Saldo_Caja_Final",
  "Saldo_ARS",
  "Saldo_USD",
  "Saldo_Cuenta",
  "Direccion",
  "Localidad",
  "Metodo_Pago"
]

export default function TemplatesPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const { userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'
  const isStaff = useMemo(() => userData && ['Admin', 'Employee', 'Collaborator', 'Communicator', 'Replenisher'].includes(userData.role), [userData]);

  // Redirecciones por Rol
  useEffect(() => {
    if (!isUserLoading && userData) {
      if (!isStaff) {
        router.replace('/')
      }
    }
  }, [userData, isUserLoading, router, isStaff])
  
  const [templateType, setTemplateType] = useState<"email" | "whatsapp">("email")
  
  // Queries Protegidas
  const emailTemplatesQuery = useMemoFirebase(() => isStaff ? collection(db, 'email_templates') : null, [db, isStaff])
  const wsTemplatesQuery = useMemoFirebase(() => isStaff ? collection(db, 'whatsapp_templates') : null, [db, isStaff])
  
  const { data: emailTemplates, isLoading: isLoadingEmail } = useCollection(emailTemplatesQuery)
  const { data: wsTemplates, isLoading: isLoadingWs } = useCollection(wsTemplatesQuery)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string, type: "email" | "whatsapp" } | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    bcc: ""
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        if (!isDialogOpen && !templateToDelete) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen, templateToDelete]);

  const handleOpenDialog = (template?: any) => {
    if (!isAdmin) {
      toast({ title: "Acceso denegado", variant: "destructive" })
      return
    }
    if (template) {
      setEditingTemplateId(template.id)
      setFormData({ name: template.name, subject: template.subject || "", body: template.body, bcc: template.bcc || "" })
    } else {
      setEditingTemplateId(null)
      setFormData({ name: "", subject: "", body: "", bcc: "" })
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.name || !formData.body || (templateType === 'email' && !formData.subject)) {
      toast({ title: "Error", description: "Completa todos los campos", variant: "destructive" }); return;
    }
    const id = editingTemplateId || Math.random().toString(36).substr(2, 9)
    const col = templateType === 'email' ? 'email_templates' : 'whatsapp_templates'
    setDocumentNonBlocking(doc(db, col, id), { ...formData, id }, { merge: true })
    setIsDialogOpen(false)
    toast({ title: editingTemplateId ? "Plantilla actualizada" : "Plantilla creada" })
  }

  const confirmDelete = () => {
    if (!isAdmin || !templateToDelete) return
    const col = templateToDelete.type === 'email' ? 'email_templates' : 'whatsapp_templates'
    deleteDocumentNonBlocking(doc(db, col, templateToDelete.id))
    setTemplateToDelete(null); toast({ title: "Plantilla eliminada" })
  }

  if (isUserLoading || !isStaff) return <div className="flex flex-col items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full pb-32 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3"><SidebarTrigger className="flex" /><h1 className="text-xl md:text-3xl font-bold text-primary font-headline">Plantillas</h1></div>
          {isAdmin && (<Button onClick={() => handleOpenDialog()} className="shadow-lg font-bold"><Plus className="mr-2 h-4 w-4" /> Nueva</Button>)}
        </header>
        <Tabs value={templateType} onValueChange={(v: any) => setTemplateType(v)} className="w-full">
          <TabsList className="bg-muted/50 p-1 mb-6"><TabsTrigger value="email" className="font-bold flex items-center gap-2"><FileText className="h-4 w-4" /> Emails</TabsTrigger><TabsTrigger value="whatsapp" className="font-bold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> WhatsApp</TabsTrigger></TabsList>
          <TabsContent value="email"><section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{isLoadingEmail ? (<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>) : (emailTemplates || []).map((tpl: any) => (<TemplateCard key={tpl.id} tpl={tpl} isAdmin={isAdmin} onEdit={handleOpenDialog} onDelete={() => setTemplateToDelete({ id: tpl.id, type: "email" })} type="email" />))}</section></TabsContent>
          <TabsContent value="whatsapp"><section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{isLoadingWs ? (<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>) : (wsTemplates || []).map((tpl: any) => (<TemplateCard key={tpl.id} tpl={tpl} isAdmin={isAdmin} onEdit={handleOpenDialog} onDelete={() => setTemplateToDelete({ id: tpl.id, type: "whatsapp" })} type="whatsapp" />))}</section></TabsContent>
        </Tabs>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingTemplateId ? 'Editar Plantilla' : 'Nueva Plantilla'}</DialogTitle></DialogHeader>
            <div className="space-y-6 py-4"><div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-4"><div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{AVAILABLE_MARKERS.map(m => (<button key={m} type="button" onClick={() => { navigator.clipboard.writeText(`{{${m}}}`); toast({ title: "Copiado" }); }} className="text-[10px] bg-white border rounded p-1.5 truncate">{"{{"}{m}{"}}"}</button>))}</div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Nombre Interno</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>{templateType === 'email' && (<div className="space-y-2"><Label>CCO</Label><Input value={formData.bcc} onChange={(e) => setFormData({...formData, bcc: e.target.value})} /></div>)}</div>{templateType === 'email' && (<div className="space-y-2"><Label>Asunto</Label><Input value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} /></div>)}<div className="space-y-2"><Label>Mensaje</Label><Textarea value={formData.body} onChange={(e) => setFormData({...formData, body: e.target.value})} className="min-h-[300px]" /></div></div>
            <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="font-bold px-8">Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog open={!!templateToDelete} onOpenChange={(o) => { if(!o) setTemplateToDelete(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </SidebarInset><MobileNav />
    </div>
  )
}

function TemplateCard({ tpl, isAdmin, onEdit, onDelete, type }: any) {
  return (
    <Card className="glass-card group relative overflow-hidden"><div className={cn("absolute top-0 left-0 w-1 h-full", type === 'email' ? "bg-primary" : "bg-emerald-500")} /><CardHeader className="pb-3"><div className="flex justify-between items-start">{type === 'email' ? <FileText className="h-6 w-6 text-primary/40" /> : <MessageSquare className="h-6 w-6 text-emerald-500/40" />}{isAdmin && (<div className="flex gap-2 opacity-0 group-hover:opacity-100"><Button variant="ghost" size="icon" onClick={() => onEdit(tpl)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button></div>)}</div><CardTitle className="text-lg mt-2 truncate">{tpl.name}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground line-clamp-3 bg-muted/20 p-3 rounded-lg border">{tpl.body}</p></CardContent></Card>
  )
}
