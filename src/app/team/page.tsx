
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
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
  Clock,
  Ban,
  CheckCircle2,
  Droplets,
  Loader2,
  MessageSquare,
  Shield
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const roleDisplay: Record<string, { label: string, icon: any, color: string }> = {
  'Admin': { label: 'Administrador', icon: ShieldCheck, color: 'default' },
  'Employee': { label: 'Empleado', icon: UserCircle, color: 'secondary' },
  'Communicator': { label: 'Comunicador', icon: MessageSquare, color: 'outline' },
  'Pending': { label: 'Pendiente', icon: Clock, color: 'outline' },
  'Blocked': { label: 'Bloqueado', icon: Ban, color: 'destructive' }
}

export default function TeamPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const { user: currentUser, userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'

  // Redirección para el rol Comunicador (No puede ver equipo)
  useEffect(() => {
    if (!isUserLoading && userData?.role === 'Communicator') {
      router.replace('/customers')
    }
  }, [userData, isUserLoading, router])

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
    if (!isAdmin) {
      toast({ 
        title: "Acceso denegado", 
        description: "Solo administradores pueden gestionar roles.", 
        variant: "destructive" 
      })
      return
    }

    const adminCount = team?.filter((m: any) => m.role === 'Admin').length || 0;
    if (userId === currentUser?.uid && newRole !== 'Admin') {
      if (adminCount <= 1) {
        toast({ 
          title: "Acción no permitida", 
          description: "Debe haber al menos un administrador activo.", 
          variant: "destructive" 
        });
        return;
      }
    }

    updateDocumentNonBlocking(doc(db, 'users', userId), { 
      role: newRole,
      updatedAt: new Date().toISOString()
    })
    setDocumentNonBlocking(doc(db, 'user_roles', userId), { 
      roleIds: [newRole.toLowerCase()] 
    }, { merge: true })

    const msg = `Rol actualizado a ${roleDisplay[newRole]?.label || newRole}`;
    toast({ title: msg })
  }

  const handleBlockUser = (userId: string) => {
    if (!isAdmin) return;
    if (userId === currentUser?.uid) {
      toast({ title: "Error", description: "No puedes bloquearte a ti mismo", variant: "destructive" });
      return;
    }
    handleUpdateRole(userId, 'Blocked');
    toast({ title: "Usuario bloqueado", description: "El acceso ha sido revocado." });
  }

  const sortedTeam = useMemo(() => {
    if (!team) return [];
    return [...team].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [team]);

  const pendingCount = useMemo(() => team?.filter(m => m.role === 'Pending').length || 0, [team]);

  if (isUserLoading || (userData?.role === 'Communicator')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-medium">Accediendo...</p>
      </div>
    )
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
            <Button onClick={() => setIsInviteOpen(true)} className="font-bold gap-2">
              <UserPlus className="h-4 w-4" /> Invitar
            </Button>
          )}
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Cargando colaboradores...</p>
          </div>
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="bg-muted/50 p-1 mb-6">
              <TabsTrigger value="active" className="font-bold">Activos</TabsTrigger>
              <TabsTrigger value="pending" className="font-bold relative">
                Pendientes 
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="blocked" className="font-bold">Bloqueados</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {sortedTeam.filter(m => m.role === 'Admin' || m.role === 'Employee' || m.role === 'Communicator').map((member: any) => (
                <MemberCard key={member.id} member={member} isAdmin={isAdmin} currentUid={currentUser?.uid} onUpdateRole={handleUpdateRole} onBlock={handleBlockUser} />
              ))}
              {sortedTeam.filter(m => m.role === 'Admin' || m.role === 'Employee' || m.role === 'Communicator').length === 0 && (
                <EmptyState icon={Users} text="No hay colaboradores activos." />
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {sortedTeam.filter(m => m.role === 'Pending').map((member: any) => (
                <MemberCard key={member.id} member={member} isAdmin={isAdmin} currentUid={currentUser?.uid} onUpdateRole={handleUpdateRole} onBlock={handleBlockUser} />
              ))}
              {sortedTeam.filter(m => m.role === 'Pending').length === 0 && (
                <EmptyState icon={Clock} text="No hay solicitudes pendientes de aprobación." />
              )}
            </TabsContent>

            <TabsContent value="blocked" className="space-y-4">
              {sortedTeam.filter(m => m.role === 'Blocked').map((member: any) => (
                <MemberCard key={member.id} member={member} isAdmin={isAdmin} currentUid={currentUser?.uid} onUpdateRole={handleUpdateRole} onBlock={handleBlockUser} />
              ))}
              {sortedTeam.filter(m => m.role === 'Blocked').length === 0 && (
                <EmptyState icon={Ban} text="No hay usuarios bloqueados." />
              )}
            </TabsContent>
          </Tabs>
        )}

        <Card className="bg-accent/5 border-accent/20 mt-8">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-accent-foreground" />
              Gestión de Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>• <b>Pendientes</b>: Usuarios que se registraron pero no tienen permiso aún. Debes aprobarlos.</p>
            <p>• <b>Comunicadores</b>: Solo pueden ver la sección de Clientes para contactarlos. No ven operaciones ni cajas.</p>
            <p>• <b>Empleados</b>: Pueden operar y ver registros financieros.</p>
            <p>• <b>Administradores</b>: Control total, gestión de equipo y eliminación de cajas/registros.</p>
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
                    Pide a tu colaborador que se registre con su email en la pantalla de inicio.
                  </p>
                  <div className="p-3 bg-muted/50 rounded-lg border text-xs italic">
                    Una vez registrado, aparecerá en la pestaña de <b>"Pendientes"</b> y podrás habilitar su acceso con el rol correspondiente.
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

function MemberCard({ member, isAdmin, currentUid, onUpdateRole, onBlock }: any) {
  const roleInfo = roleDisplay[member.role] || { label: member.role, icon: UserCircle, color: 'secondary' };
  const Icon = roleInfo.icon;
  const isMe = member.id === currentUid;

  return (
    <Card className={cn(
      "glass-card border-l-4 transition-all",
      member.role === 'Pending' ? "border-l-amber-400" : 
      member.role === 'Blocked' ? "border-l-rose-500" : 
      member.role === 'Communicator' ? "border-l-cyan-500" : "border-l-primary"
    )}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-primary/10">
            <AvatarImage src={`https://picsum.photos/seed/${member.id}/100/100`} />
            <AvatarFallback>{member.name ? member.name[0] : (member.email ? member.email[0] : '?')}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold truncate max-w-[150px] md:max-w-none">{member.name || 'Sin nombre'} {isMe && "(Tú)"}</h3>
              <Badge variant={roleInfo.color as any} className="text-[9px] uppercase font-black tracking-widest px-2 h-5">
                <Icon className="h-2.5 w-2.5 mr-1" />
                {roleInfo.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
          </div>
        </div>

        {isAdmin && !isMe && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {member.role === 'Pending' && (
                <>
                  <DropdownMenuItem className="text-cyan-600 font-bold" onClick={() => onUpdateRole(member.id, 'Communicator')}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Aprobar como Comunicador
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-emerald-600 font-bold" onClick={() => onUpdateRole(member.id, 'Employee')}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Aprobar como Empleado
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Admin')}>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Aprobar como Administrador
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              {(member.role === 'Admin' || member.role === 'Employee' || member.role === 'Communicator') && (
                <>
                  <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Communicator')}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Cambiar a Comunicador
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Employee')}>
                    <UserCircle className="mr-2 h-4 w-4" /> Cambiar a Empleado
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Admin')}>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Cambiar a Administrador
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-rose-600" onClick={() => onBlock(member.id)}>
                    <Ban className="mr-2 h-4 w-4" /> Bloquear acceso
                  </DropdownMenuItem>
                </>
              )}

              {member.role === 'Blocked' && (
                <DropdownMenuItem className="text-emerald-600" onClick={() => onUpdateRole(member.id, 'Employee')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Desbloquear (Hacer Empleado)
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, text }: any) {
  return (
    <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-muted/5">
      <Icon className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
      <p className="text-sm text-muted-foreground italic">{text}</p>
    </div>
  );
}
