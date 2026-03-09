"use client"

import { useEffect, useState } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  ShieldCheck, 
  UserCircle, 
  MoreVertical,
  Trash2,
  ShieldAlert,
  UserPlus,
  Info
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

export default function TeamPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user: currentUser } = useUser()
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  
  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db])
  const { data: team, isLoading } = useCollection(usersQuery)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        if (!isInviteOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isInviteOpen]);

  const handleUpdateRole = (userId: string, newRole: string) => {
    updateDocumentNonBlocking(doc(db, 'users', userId), { role: newRole })
    toast({ title: "Rol actualizado", description: `Usuario ahora es ${newRole}` })
  }

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser?.uid) {
      toast({ title: "Error", description: "No puedes eliminar tu propio usuario", variant: "destructive" })
      return
    }
    if (confirm("¿Estás seguro de eliminar a este usuario del sistema?")) {
      deleteDocumentNonBlocking(doc(db, 'users', userId))
      toast({ title: "Usuario eliminado" })
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full pb-20 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="hidden md:flex" />
            <div>
              <h1 className="text-3xl font-headline font-bold text-primary">Gestión de Equipo</h1>
              <p className="text-muted-foreground">Administra los usuarios habilitados y sus permisos.</p>
            </div>
          </div>
          <Button onClick={() => setIsInviteOpen(true)} className="font-bold">
            <UserPlus className="mr-2 h-4 w-4" /> Invitar Colaborador
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <p className="text-center py-10 text-muted-foreground">Cargando equipo...</p>
          ) : (team && team.length > 0) ? (
            team.map((member: any) => (
              <Card key={member.id} className="glass-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-primary/10">
                      <AvatarImage src={`https://picsum.photos/seed/${member.id}/100/100`} />
                      <AvatarFallback>{member.name ? member.name[0] : (member.email ? member.email[0] : '?')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{member.name || 'Usuario sin nombre'}</h3>
                        <Badge variant={member.role === 'Admin' ? 'default' : 'secondary'} className="text-[10px]">
                          {member.role === 'Admin' ? <ShieldCheck className="h-3 w-3 mr-1" /> : <UserCircle className="h-3 w-3 mr-1" />}
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'Admin')}>
                        <ShieldCheck className="mr-2 h-4 w-4" /> Hacer Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'Employee')}>
                        <UserCircle className="mr-2 h-4 w-4" /> Hacer Empleado
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(member.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center border-dashed">
              <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-semibold">No hay usuarios registrados</h3>
              <p className="text-muted-foreground">Invita a tus colaboradores a registrarse en la App.</p>
            </Card>
          )}
        </div>

        <Card className="bg-accent/5 border-accent/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-accent-foreground" />
              Seguridad de Roles
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>• Los <b>Administradores</b> pueden gestionar el equipo, el catálogo y las cuentas financieras.</p>
            <p>• Los <b>Empleados</b> solo pueden registrar operaciones y ver clientes.</p>
            <p>• Solo usuarios registrados y presentes en esta lista tienen acceso a los datos de la nube.</p>
          </CardContent>
        </Card>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" /> ¿Cómo agregar un colaborador?
              </DialogTitle>
              {/* Fix: Using asChild to allow div nesting inside DialogDescription (which is a p tag) */}
              <DialogDescription asChild>
                <div className="pt-4 space-y-4">
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs shrink-0">1</div>
                    <p className="text-sm text-foreground">
                      Pide a tu colaborador que abra la aplicación y haga clic en <b>"Registrate aquí"</b> en la pantalla de inicio.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs shrink-0">2</div>
                    <p className="text-sm text-foreground">
                      Una vez que complete su registro, su nombre aparecerá automáticamente en esta lista de <b>Equipo</b>.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs shrink-0">3</div>
                    <p className="text-sm text-foreground">
                      Desde esta pantalla, podrás cambiar su rol a <b>Admin</b> o mantenerlo como <b>Empleado</b> según lo necesites.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button onClick={() => setIsInviteOpen(false)} className="w-full font-bold">Entendido</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
      <MobileNav />
    </div>
  )
}
