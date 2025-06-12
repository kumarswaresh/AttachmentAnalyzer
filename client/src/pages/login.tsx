import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Lock, User, Apple } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        usernameOrEmail: formData.email,
        password: formData.password,
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("sessionToken", data.sessionToken);
        toast({
          title: "Login Successful",
          description: "Welcome back to the platform",
        });

        // Redirect to dashboard
        window.location.href = "/";
      } else {
        toast({
          title: "Login Failed",
          description: data.message || "Please check your credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast({
      title: "Redirecting to Google",
      description: "You'll be redirected to complete authentication",
    });

    // In production, this would redirect to /api/auth/google
    window.location.href = "/api/auth/google";
  };

  const handleAppleLogin = () => {
    toast({
      title: "Redirecting to Apple",
      description: "You'll be redirected to complete authentication",
    });

    // In production, this would redirect to /api/auth/apple
    window.location.href = "/api/auth/apple";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AI Agent Platform
          </div>
          <p className="text-gray-600 dark:text-gray-400">Sign in to your account</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1">
            {/* 
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Choose your preferred sign-in method
            </CardDescription>
            */}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* OAuth Buttons */}
            {/* 
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-2 h-11"
              >
                <Mail className="h-4 w-4" />
                Google
              </Button>
              
              <Button
                variant="outline"
                onClick={handleAppleLogin}
                className="flex items-center justify-center gap-2 h-11"
              >
                <Apple className="h-4 w-4" />
                Apple
              </Button>
            </div>
            */}

            {/* 
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>
            */}

            {/* Email Login Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Signing in...
                  </div>
                ) : (
                  <>
                    <User className="h-4 w-4 mr-2" />
                    Sign in with Email
                  </>
                )}
              </Button>
            </form>

            {/* 
            <div className="text-center text-sm">
              <a href="/forgot-password" className="text-blue-600 hover:underline">
                Forgot your password?
              </a>
            </div>
            */}

            <Separator />

            {/* 
            <div className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <button 
                onClick={() => setLocation("/register")}
                className="text-blue-600 hover:underline font-medium"
              >
                Sign up for free
              </button>
            </div>
            */}
          </CardContent>
        </Card>

        {/* 
        <div className="text-center text-xs text-gray-500">
          By signing in, you agree to our{" "}
          <a href="/terms" className="underline">Terms of Service</a> and{" "}
          <a href="/privacy" className="underline">Privacy Policy</a>
        </div>
        */}
      </div>
    </div>
  );
}
