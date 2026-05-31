
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFirebase, useUser } from "../../firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Droplets, RefreshCw } from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import Link from "next/link"
import { getHomeRouteForRole, normalizeEmail } from "@/lib/auth-routing"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const { auth } = useFirebase()
  const { user, userData } = useUser()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (user && userData?.role) {
      router.replace(getHomeRouteForRole(userData.role))
    }
  }, [user, userData, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, normalizeEmail(email), password)
      toast({ 
        title: "Acceso Exitoso", 
        description: "Entrando al sistema..." 
      })
    } catch (error: any) {
      console.error("Login Error:", error);
      let message = "Credenciales incorrectas."
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Email o contraseña no válidos."
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "El inicio de sesión por email no está habilitado en Firebase Console."
      }
      toast({ title: "Error de Acceso", description: message, variant: "destructive" })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC] p-4">
      <Card className="w-full max-w-[400px] border-none shadow-xl rounded-3xl overflow-hidden p-6">
        <CardHeader className="text-center space-y-4 pt-4 pb-8">
          <div className="flex justify-center">
            <div className="bg-[#1D77FF] p-4 rounded-[22px] shadow-lg shadow-blue-200">
              <Droplets className="h-10 w-10 text-white fill-white/20" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-4xl font-bold tracking-tight text-[#1A1F36]">Dosimat Pro</CardTitle>
            <CardDescription className="text-[#697386] font-medium">Ingresa tus credenciales para continuar</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#1A1F36] ml-1">Email</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="gab.aldazabal@gmail.com"
                required 
                className="h-14 bg-[#EDF2F7] border-none rounded-2xl px-4 text-base focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#1A1F36] ml-1">Contraseña</Label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••••"
                required 
                className="h-14 bg-[#EDF2F7] border-none rounded-2xl px-4 text-base focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                disabled={isLoading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-16 bg-[#1D77FF] hover:bg-[#1565D8] text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-100 transition-all mt-4" 
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-6 w-6 animate-spin" />
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>

          <div className="text-center pt-4">
            <Link href="/register" className="text-[#1D77FF] font-semibold text-sm hover:underline">
              ¿No tienes cuenta? Regístrate aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
