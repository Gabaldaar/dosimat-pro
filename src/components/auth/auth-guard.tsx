
"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useUser, useFirebase } from "../../firebase"
import { signOut } from "firebase/auth"
import { Droplets, Clock, Ban, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getHomeRouteForRole, isStaffRole } from "@/lib/auth-routing"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userData, isUserLoading } = useUser()
  const { auth } = useFirebase()
  const pathname = usePathname()
  const router = useRouter()
  
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const role = userData?.role || 'Pending'
  const isClient = role === 'Client'
  const isStaff = isStaffRole(role)
  const isPortalRoute = pathname.startsWith('/portal')
  const isAuthRoute = pathname === '/login' || pathname === '/register'

  useEffect(() => {
    if (!mounted || isUserLoading) return

    if (!user && !isAuthRoute) {
      router.replace('/login')
      return
    }

    if (user && isAuthRoute && userData?.role) {
      router.replace(getHomeRouteForRole(userData.role))
      return
    }

    if (user && isClient && !isPortalRoute && !isAuthRoute) {
      router.replace('/portal')
    }
  }, [user, isUserLoading, pathname, router, mounted, userData, isAuthRoute, isClient, isPortalRoute])

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Droplets className="h-10 w-10 text-primary animate-pulse" />
      </div>
    )
  }

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
      </div>
    )
  }

  if (isAuthRoute) {
    return <>{children}</>
  }

  if (!user) return null

  if (isClient) {
    if (isPortalRoute) return <>{children}</>
    return null
  }

  if (!isStaff) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <Card className="max-w-md w-full p-8 glass-card border-amber-200 text-center space-y-6">
          {role === 'Blocked' ? (
            <Ban className="h-16 w-16 text-rose-500 mx-auto" />
          ) : (
            <Clock className="h-16 w-16 text-amber-500 mx-auto" />
          )}
          <h2 className="text-xl font-bold">
            {role === 'Blocked' ? 'Acceso Bloqueado' : 'Acceso en Revisión'}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {role === 'Blocked' 
              ? 'Tu cuenta ha sido inhabilitada por la administración.' 
              : `Tu usuario (${user.email}) ha sido registrado correctamente, pero aún debe ser autorizado por un administrador para acceder al panel.`}
          </p>
          <div className="pt-4 space-y-3">
            <Button variant="outline" className="w-full font-bold" onClick={() => signOut(auth!)}>
              Cerrar Sesión
            </Button>
            <p className="text-[10px] text-muted-foreground uppercase font-black">Dosimat Pro Security</p>
          </div>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
