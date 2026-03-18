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
  Truck
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase, useDoc, useMemoFirebase, useUser } from "../../firebase"
import { signOut } from "firebase/auth"
import { doc } from "firebase/firestore"
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/routes", label: "Rutas", icon: Truck },
  { href: "/transactions", label: "Operaciones", icon: ArrowLeftRight },
  { href: "/analysis", label: "Análisis", icon: BarChart3 },
  { href: "/accounts", label: "Cajas", icon: Wallet },
  { href: "/catalog", label: "Catálogo", icon: Package },
  { href: "/templates", label: "Plantillas", icon: FileText },
  { href: "/team", label: "Equipo", icon: Shield },
]

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const { auth, firestore, user } = useFirebase()
  const router = useRouter()
  const { state, isMobile, setOpenMobile } = useSidebar()

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore])
  const { data: userData } = useDoc(userDocRef)
  
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

  const filteredNavItems = React.useMemo(() => {
    if (!userData) return [];
    if (userData.role === 'Communicator') {
      return navItems.filter(item => ['/customers', '/routes'].includes(item.href));
    }
    if (userData.role === 'Replenisher') {
      return navItems.filter(item => item.href === '/routes');
    }
    return navItems;
  }, [userData]);

  return (
    <SidebarUI collapsible="icon" className={cn("border-r", className)}>
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
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t space-y-4">
        {user && (
          <div className="flex items-center gap-3 py-1">
            <Avatar className="h-8 w-8 border border-primary/20 shrink-0">
              <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} />
              <AvatarFallback>{user.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            {state === "expanded" && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold truncate">{userData?.name || 'Usuario'}</span>
                <span className="text-[10px] text-muted-foreground truncate uppercase font-bold">{userData?.role || 'Sin Rol'}</span>
              </div>
            )}
          </div>
        )}
        <Button variant="ghost" className="w-full text-destructive" onClick={handleLogout}>
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
  
  const mobileItems = React.useMemo(() => {
    if (!userData) return [];
    if (userData.role === 'Replenisher') return [{ href: "/routes", label: "Rutas", icon: Truck }];
    if (userData.role === 'Communicator') return [
      { href: "/customers", label: "Clientes", icon: Users },
      { href: "/routes", label: "Rutas", icon: Truck }
    ];
    return [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/customers", label: "Clientes", icon: Users },
      { href: "/routes", label: "Rutas", icon: Truck },
      { href: "/transactions", label: "Operaciones", icon: ArrowLeftRight },
      { href: "/accounts", label: "Cajas", icon: Wallet },
    ];
  }, [userData]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-background/60 backdrop-blur-xl border-t flex items-center justify-around px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden">
      {mobileItems.map((item) => (
        <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1.5", pathname === item.href ? "text-primary font-bold" : "text-muted-foreground")}>
          <item.icon className="h-6 w-6" />
          <span className="text-[9px] uppercase tracking-wider font-bold">{item.label}</span>
        </Link>
      ))}
    </div>
  )
}
