
"use client"

import { useState, useEffect } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  ShieldCheck, 
  UserCircle, 
  MoreVertical,
  UserPlus,
  Trash2,
  ShieldAlert
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function TeamPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user: currentUser } = useUser()
  
  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db])
  const { data: team, isLoading } = useCollection(usersQuery)

  // Desbloqueo forzado del puntero
  useEffect(() => {
    const timeout = setTimeout(() => {
      document.body.style.pointerEvents = 'auto';
    }, 100);
    return () => clearTimeout(timeout);
  }, [team, isLoading]);

  const handleUpdateRole = (userId: string, newRole: string) => {
    updateDocumentNonBlocking(doc(db, 'users', userId), { role: newRole })
    toast({ title: "Rol actualizado", description: `Usuario ahora es ${newRole}` })
  }

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser?.uid) {
      toast({ title: "Error", description: "No puedes eliminar tu propio usuario", variant: "destructive" })
      return
    }
    deleteDocumentNonBlocking(doc(db, 'users', userId))
    toast({ title: "Usuario eliminado" })
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Gestión de Equipo</h1>
            <p className="text-muted-foreground">Administra los usuarios habilitados y sus permisos.</p>
          </div>
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
      </main>
      <MobileNav />
    </div>
  )
}
