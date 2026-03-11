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
  Info,
  Droplets
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
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

export default function TeamPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user: currentUser, userData } = useUser()
  const isAdmin = userData?.role === 'Admin'
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
    // Verificación de permisos en la aplicación
    if (!isAdmin) {
      toast({ 
        title: "Acceso denegado", 
        description: "Su usuario no tiene permisos de Administrador para realizar esta acción.", 
        variant: "destructive" 
      })
      return
    }

    // Validar que no sea el último administrador quitándose el rol a sí mismo
    const adminCount = team?.filter((m: any) => m.role === 'Admin').length || 0;
    if (userId === currentUser?.uid && newRole !== 'Admin') {
      if (adminCount <= 1) {
        toast({ 
          title: "Acción no permitida", 
          description: "Debe haber al menos un administrador activo en el sistema.", 
          variant: "destructive" 
        });
        return;
      }
    }

    updateDocumentNonBlocking(doc(db, 'users', userId), { role: newRole })
    
    // También actualizamos el documento auxiliar de roles por si acaso
    setDocumentNonBlocking(doc(db, 'user_roles', userId), { 
      roleIds: [newRole.toLowerCase()] 
    }, { merge: true })

    toast({ title: "Rol actualizado", description: `Usuario ahora es ${newRole}` })
  }

  const handleDeleteUser = (userId: string) => {
    if (!isAdmin) {
      toast({ 
        title: "Acceso denegado", 
        description: "Su usuario no tiene permisos de Administrador.", 
        variant: "destructive" 
      })
      return
    }
    
    if (userId === currentUser?.uid) {
      toast({ title: "Error", description: "No puedes eliminar tu propio usuario", variant: "destructive" })
      return
    }

    const memberToDelete = team?.find((m: any) => m.id === userId);
    if (memberToDelete?.role === 'Admin') {
      const adminCount = team?.filter((m: any) => m.role === 'Admin').length || 0;
      if (adminCount <= 1) {
        toast({ 
          title: "Acción no permitida", 
          description: "No se puede eliminar al único administrador.", 
          variant: "destructive" 
        });
        return;
      }
    }

    if (confirm("¿Estás seguro de eliminar a este usuario del sistema?")) {
      deleteDocumentNonBlocking(doc(db, 'users', userId))
      deleteDocumentNonBlocking(doc(db, 'user_roles', userId))
      toast({ title: "Usuario eliminado" })
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full pb-32 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <div className="flex items-center gap-2 md:hidden pr-2 border-r">
               <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
                 <Droplets className="h-4 w-4 text-white" />
               </div>
               <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">Dosimat<span className="text-accent-foreground">Pro</span></span>
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-headline font-bold text-primary">Equipo</h1>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsInviteOpen(true)} className="font-bold">
              <UserPlus className="mr-2 h-4 w-4" /> Invitar
            </Button>
          )}
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

                  {isAdmin && (
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
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center border-dashed">
              <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-semibold">No hay usuarios registrados</h3>
            </Card>
          )}
        </div>

        <Card className="bg-accent/5 border-accent/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-accent-foreground" />
              Gestión de Permisos (App-Side)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>• Los <b>Administradores</b> tienen acceso total a la gestión financiera, catálogo y equipo.</p>
            <p>• Los <b>Empleados</b> pueden operar y registrar, pero no borrar registros sensibles.</p>
            <p>• Este sistema de permisos se gestiona directamente desde la aplicación para mayor flexibilidad.</p>
          </CardContent>
        </Card>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" /> Agregar colaborador
              </DialogTitle>
              <DialogDescription asChild>
                <div className="pt-4 space-y-4">
                  <p className="text-sm text-foreground">
                    Pide a tu colaborador que se registre con su email. Una vez registrado, aparecerá en esta lista y podrás asignarle el rol necesario.
                  </p>
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