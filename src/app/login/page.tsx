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
        router.push("/")
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user
        
        // Al registrarse, creamos el perfil del usuario.
        // Hacemos que el usuario sea Admin por defecto para esta fase de configuración inicial
        setDocumentNonBlocking(doc(firestore, 'users', user.uid), {
          id: user.uid,
          name: name || email.split('@')[0],
          email: email,
          role: 'Admin' 
        }, { merge: true })

        // Creamos el registro de rol para que la seguridad de Firestore lo reconozca
        setDocumentNonBlocking(doc(firestore, 'user_roles', user.uid), {
          roleIds: ['admin']
        }, { merge: true })
        
        toast({ title: "Cuenta creada", description: "Has sido registrado como Administrador." })
        router.push("/")
      }
    } catch (error: any) {
      console.error("Auth error:", error)
      let message = "Verifica tus datos o regístrate si no tienes cuenta."
      
      if (error.code === 'auth/invalid-credential') {
        message = "Email o contraseña incorrectos. Si es tu primera vez, haz clic en 'Registrate aquí'."
      } else if (error.code === 'auth/user-not-found') {
        message = "Usuario no encontrado. Por favor, regístrate."
      } else if (error.code === 'auth/wrong-password') {
        message = "Contraseña incorrecta."
      } else if (error.code === 'auth/email-already-in-use') {
        message = "Este email ya está en uso. Intenta iniciar sesión."
      } else if (error.code === 'auth/weak-password') {
        message = "La contraseña debe tener al menos 6 caracteres."
      }
      
      toast({ 
        title: "Error de acceso", 
        description: message,
        variant: "destructive" 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-card border-primary/20 shadow-2xl">
        <CardHeader className="text-center space-y-1">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
              <Droplets className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold font-headline tracking-tight">Dosimat Pro</CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLogin ? "Ingresa tus credenciales para continuar" : "Crea tu cuenta de administrador"}
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
            <Button type="submit" className="w-full font-bold h-12" disabled={isLoading}>
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              {isLogin ? "Iniciar Sesión" : "Registrarse como Admin"}
            </Button>
            <Button 
              type="button" 
              variant="link" 
              className="text-sm text-primary" 
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