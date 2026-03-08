"use client"

import { useState, useMemo } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Plus, MapPin, ChevronRight, Phone, Mail, Save } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"

export default function CustomersPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
  
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const { data: customers = [] } = useCollection(clientsQuery)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: ""
  })

  const filteredCustomers = useMemo(() => {
    return customers?.filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [customers, searchTerm])

  const handleOpenDialog = (customer?: any) => {
    if (customer) {
      setEditingCustomer(customer)
      setFormData({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        notes: customer.notes || ""
      })
    } else {
      setEditingCustomer(null)
      setFormData({ name: "", email: "", phone: "", address: "", notes: "" })
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.name) return
    const id = editingCustomer?.id || Math.random().toString(36).substr(2, 9)
    setDocumentNonBlocking(doc(db, 'clients', id), { ...formData, id }, { merge: true })
    setIsDialogOpen(false)
    toast({ title: "Cliente guardado" })
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary">Clientes Firestore</h1>
          <Button onClick={() => handleOpenDialog()}><Plus className="mr-2 h-4 w-4" /> Nuevo</Button>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCustomers?.map((customer: any) => (
            <Card key={customer.id} className="glass-card cursor-pointer" onClick={() => handleOpenDialog(customer)}>
              <CardContent className="p-5 flex items-start gap-4">
                <Avatar className="h-12 w-12"><AvatarFallback>{customer.name[0]}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <h3 className="font-bold">{customer.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {customer.address}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nombre Completo</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
            <div className="space-y-2"><Label>Teléfono</Label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
            <div className="space-y-2"><Label>Dirección</Label><Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave} className="w-full">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <MobileNav />
    </div>
  )
}
