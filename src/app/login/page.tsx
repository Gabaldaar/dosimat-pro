
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useFirebase, setDocumentNonBlocking } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { doc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Droplets, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const { auth, firestore } = useFirebase()
  const router = useRouter()
  const { toast } = useToast()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
        toast({ title: "Bienvenido", description: "Iniciando sesión..." })
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user
        
        // Al registrarse, creamos el perfil del usuario.
        // Importante: Hacemos que el primer registro sea 'Admin' para que puedas gestionar la app.
        setDocumentNonBlocking(doc(firestore, 'users', user.uid), {
          id: user.uid,
          name: name || email.split('@')[0],
          email: email,
          role: 'Admin' 
        }, { merge: true })
        
        toast({ title: "Cuenta creada", description: "Tu perfil de Administrador ha sido registrado." })
      }
      router.push("/")
    } catch (error: any) {
      toast({ 
        title: "Error de autenticación", 
        description: error.message.includes("auth/user-not-found") ? "Usuario no encontrado" : "Verifica tus credenciales", 
        variant: "destructive" 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-card border-primary/20">
        <CardHeader className="text-center space-y-1">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
              <Droplets className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold font-headline">Dosimat Pro</CardTitle>
          <CardDescription>
            {isLogin ? "Ingresa tus credenciales para continuar" : "Crea tu cuenta de Administrador"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input 
                  id="name" 
                  placeholder="Ej: Juan Pérez" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@dosimat.pro" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full font-bold" disabled={isLoading}>
              {isLoading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
              {isLogin ? "Iniciar Sesión" : "Registrarse como Admin"}
            </Button>
            <Button 
              type="button" 
              variant="link" 
              className="text-xs" 
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "¿No tienes cuenta? Regístrate aquí" : "¿Ya tienes cuenta? Ingresa aquí"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
