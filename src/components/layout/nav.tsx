
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutDashboard, 
  Users, 
  ArrowLeftRight, 
  Package, 
  Wallet, 
  Droplets,
  LogOut,
  Shield,
  FileText,
  BarChart3,
  Truck,
  Banknote,
  BellRing,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase, useDoc, useMemoFirebase, useUser, useCollection } from "../../firebase"
import { signOut } from "firebase/auth"
import { doc, collection, query, where } from "firebase/firestore"
import { requestNotificationPermission } from "@/firebase/messaging"
import { useToast } from "@/hooks/use-toast"
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarMenuBadge,
} from "@/components/ui/sidebar"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/routes", label: "Rutas", icon: Truck },
  { href: "/transactions", label: "Operaciones", icon: ArrowLeftRight },
  { href: "/analysis", label: "Análisis", icon: BarChart3 },
  { href: "/accounts", label: "Cajas", icon: Wallet },
  { href: "/payouts", label: "Liquidaciones", icon: Banknote },
  { href: "/catalog", label: "Catálogo", icon: Package },
  { href: "/templates", label: "Plantillas", icon: FileText },
  { href: "/team", label: "Equipo", icon: Shield },
]

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const { auth, firestore, user, messaging } = useFirebase()
  const db = firestore!
  const router = useRouter()
  const { toast } = useToast()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const [isLinking, setIsLinking] = React.useState(false)

  const userDocRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [user, db])
  const { data: userData } = useDoc(userDocRef)

  // Consultas para Badges de Notificación
  const routesQ = useMemoFirebase(() => query(collection(db, 'route_sheets'), where('status', '==', 'active')), [db])
  const prodQ = useMemoFirebase(() => query(collection(db, 'production_orders'), where('status', '!=', 'completed')), [db])
  const purchQ = useMemoFirebase(() => query(collection(db, 'purchase_orders'), where('status', '!=', 'completed')), [db])

  const { data: activeRoutes } = useCollection(routesQ)
  const { data: openProd } = useCollection(prodQ)
  const { data: openPurch } = useCollection(purchQ)

  const activeRoutesCount = activeRoutes?.length || 0;
  const catalogCount = (openProd?.length || 0) + (openPurch?.length || 0);
  
  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const handleEnableNotifications = async () => {
    if (!user || !db) return;
    
    if (!messaging) {
      toast({
        title: "Servicio no disponible",
        description: "No se pudo iniciar el sistema de mensajes. Prueba refrescando o usando otro navegador.",
        variant: "destructive"
      });
      return;
    }

    setIsLinking(true);
    const result = await requestNotificationPermission(messaging, db, user);
    setIsLinking(false);

    if (result.success) {
      toast({
        title: "Vínculo Exitoso",
        description: "Este dispositivo ya está registrado para recibir alertas.",
      });
    } else {
      toast({
        title: "Error de Vinculación",
        description: result.error || "Asegúrate de permitir las notificaciones.",
        variant: "destructive"
      });
    }
  }

  const filteredNavItems = React.useMemo(() => {
    if (!userData) return [];
    
    const role = userData.role;

    let items = [];
    if (role === 'Communicator') {
      items = navItems.filter(item => ['/customers', '/routes'].includes(item.href));
    } else if (role === 'Replenisher') {
      items = navItems.filter(item => item.href === '/routes');
    } else if (role === 'Employee' || role === 'Admin' || role === 'Collaborator') {
      if (role === 'Employee' || role === 'Collaborator') {
        items = navItems.filter(item => item.href !== '/team');
      } else {
        items = navItems;
      }
    }

    return items.map(item => {
      let badgeCount = 0;
      if (item.href === '/routes') badgeCount = activeRoutesCount;
      if (item.href === '/catalog') badgeCount = catalogCount;
      return { ...item, badgeCount };
    });
  }, [userData, activeRoutesCount, catalogCount]);

  return (
    <SidebarUI collapsible="icon" className={cn("border-r no-print", className)}>
      <SidebarHeader className="p-4 flex flex-row items-center gap-2 overflow-hidden">
        <div className="bg-primary p-2 rounded-lg shrink-0">
          <Droplets className="h-6 w-6 text-white" />
        </div>
        {state === "expanded" && (
          <span className="font-headline font-bold text-xl tracking-tight text-primary truncate">
            Dosimat<span className="text-accent-foreground font-medium">Pro</span>
          </span>
        )}
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarMenu>
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
                onClick={handleLinkClick}
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
              {item.badgeCount > 0 && (
                <SidebarMenuBadge className="bg-rose-500 text-white rounded-full text-[9px] min-w-4 h-4 flex items-center justify-center p-0 font-black animate-in fade-in zoom-in">
                  {item.badgeCount}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className={cn("p-4 border-t space-y-4", isMobile && "pb-12")}>
        {state === "expanded" && (
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLinking}
            className="w-full justify-start text-[10px] font-black uppercase tracking-widest gap-2 bg-primary/5 text-primary border-primary/20"
            onClick={handleEnableNotifications}
          >
            {isLinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
            {isLinking ? 'Vinculando...' : 'Vincular Dispositivo'}
          </Button>
        )}
        {user && (
          <div className="flex items-center gap-3 py-1">
            <Avatar className="h-8 w-8 border border-primary/20 shrink-0">
              <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} />
              <AvatarFallback>{user.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            {state === "expanded" && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold truncate">{userData?.name || 'Usuario'}</span>
                <span className="text-[10px] text-muted-foreground truncate uppercase font-bold">
                  {userData?.role === 'Employee' ? 'Socio' : 
                   userData?.role === 'Collaborator' ? 'Colaborador' : 
                   userData?.role || 'Sin Rol'}
                </span>
              </div>
            )}
          </div>
        )}
        <Button variant="ghost" className="w-full text-destructive justify-start px-2" onClick={handleLogout}>
          <LogOut className={cn("h-4 w-4", state === "expanded" && "mr-2")} />
          {state === "expanded" && <span>Cerrar sesión</span>}
        </Button>
      </SidebarFooter>
    </SidebarUI>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const { userData } = useUser()
  const { firestore } = useFirebase()
  const db = firestore!

  // Consultas para Badges
  const routesQ = useMemoFirebase(() => query(collection(db, 'route_sheets'), where('status', '==', 'active')), [db])

  const { data: activeRoutes } = useCollection(routesQ)

  const activeRoutesCount = activeRoutes?.length || 0;
  
  const mobileItems = React.useMemo(() => {
    if (!userData) return [];
    const role = userData.role;

    let base = [];
    if (role === 'Replenisher') {
      base = [{ href: "/routes", label: "Rutas", icon: Truck }];
    } else if (role === 'Communicator') {
      base = [
        { href: "/customers", label: "Clientes", icon: Users },
        { href: "/routes", label: "Rutas", icon: Truck }
      ];
    } else {
      base = [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/customers", label: "Clientes", icon: Users },
        { href: "/routes", label: "Rutas", icon: Truck },
        { href: "/transactions", label: "Operaciones", icon: ArrowLeftRight },
        { href: "/payouts", label: "Pagos", icon: Banknote },
      ];
    }

    return base.map(item => {
      let count = 0;
      if (item.href === '/routes') count = activeRoutesCount;
      return { ...item, count };
    });
  }, [userData, activeRoutesCount]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/60 backdrop-blur-xl border-t flex items-center justify-around px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden no-print">
      {mobileItems.map((item) => (
        <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1.5 relative", pathname === item.href ? "text-primary font-bold" : "text-muted-foreground")}>
          <item.icon className="h-6 w-6" />
          <span className="text-[9px] uppercase tracking-wider font-bold">{item.label}</span>
          {item.count > 0 && (
            <span className="absolute top-0 right-0 -mr-1 -mt-1 bg-rose-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
              !
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}
