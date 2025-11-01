import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { UserCircle, Shield, Loader2, MapPin } from "lucide-react";

type UserRole = "citizen" | "admin" | "guest";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("citizen");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Check for saved session on mount
  useEffect(() => {
    const savedRole = localStorage.getItem("userRole");
    const savedTimestamp = localStorage.getItem("loginTimestamp");

    // Auto-login if session is less than 24 hours old
    if (savedRole && savedTimestamp) {
      const hoursSinceLogin = (Date.now() - parseInt(savedTimestamp)) / (1000 * 60 * 60);

      if (hoursSinceLogin < 24) {
        toast.info(`Resuming session as ${savedRole}`);
        setTimeout(() => {
          if (savedRole === "admin") {
            navigate("/admin-dashboard");
          } else {
            navigate("/user-dashboard");
          }
        }, 1000);
      } else {
        // Clear expired session
        localStorage.removeItem("userRole");
        localStorage.removeItem("loginTimestamp");
      }
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate loading animation
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test credentials based on selected role
    let isValid = false;
    let destination = "/user-dashboard";

    if (selectedRole === "citizen") {
      if (email === "user@test.com" && password === "user123") {
        isValid = true;
        destination = "/user-dashboard";
        saveSession("citizen");
      }
    } else if (selectedRole === "admin") {
      if (email === "admin@test.com" && password === "admin123") {
        isValid = true;
        destination = "/admin-dashboard";
        saveSession("admin");
      }
    }

    if (isValid) {
      toast.success(`Welcome! Logging in as ${selectedRole}...`);
      setTimeout(() => {
        navigate(destination);
      }, 500);
    } else {
      setIsLoading(false);
      toast.error(`Invalid credentials for ${selectedRole}. Check the test credentials below.`);
    }
  };

  const handleGuestMode = () => {
    setIsLoading(true);
    toast.success("Entering Guest Mode...");
    saveSession("guest");

    setTimeout(() => {
      navigate("/user-dashboard");
    }, 1500);
  };

  const handleQuickLogin = (role: UserRole) => {
    setIsLoading(true);
    toast.success(`Quick login as ${role}...`);
    saveSession(role);

    setTimeout(() => {
      if (role === "admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/user-dashboard");
      }
    }, 1500);
  };

  const saveSession = (role: string) => {
    localStorage.setItem("userRole", role);
    localStorage.setItem("loginTimestamp", Date.now().toString());
  };

  const clearSession = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("loginTimestamp");
    toast.info("Session cleared");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/10 to-muted/20">
        {/* City Silhouette Animation */}
        <div className="absolute bottom-0 left-0 right-0 h-48 opacity-10">
          <svg viewBox="0 0 1200 200" className="w-full h-full" preserveAspectRatio="none">
            <path
              d="M0,200 L0,100 L50,100 L50,60 L100,60 L100,100 L150,100 L150,40 L250,40 L250,100 L300,100 L300,80 L350,80 L350,100 L400,100 L400,50 L500,50 L500,100 L550,100 L550,70 L600,70 L600,100 L700,100 L700,30 L800,30 L800,100 L900,100 L900,60 L950,60 L950,100 L1050,100 L1050,45 L1100,45 L1100,100 L1200,100 L1200,200 Z"
              fill="currentColor"
              className="text-primary"
            />
          </svg>
        </div>

        {/* Floating Icons */}
        <div className="absolute top-20 left-20 animate-bounce opacity-5">
          <MapPin className="w-16 h-16 text-primary" />
        </div>
        <div className="absolute top-40 right-32 animate-pulse opacity-5">
          <UserCircle className="w-20 h-20 text-primary" />
        </div>
        <div className="absolute bottom-32 right-20 animate-bounce opacity-5" style={{ animationDelay: "1s" }}>
          <Shield className="w-12 h-12 text-primary" />
        </div>
      </div>

      {/* Main Login Card */}
      <Card className="w-full max-w-md shadow-2xl relative z-10 backdrop-blur-sm bg-background/95">
        <CardHeader className="space-y-1 text-center pb-4">
          {/* Logo */}
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-2xl flex items-center justify-center mb-4 shadow-lg animate-pulse">
            <svg className="w-10 h-10 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Civic Issue Reporter
          </CardTitle>
          <CardDescription className="text-base">
            Report and manage community issues with AI-powered detection
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Role Selector */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium">Select Your Role</Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="citizen">
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-4 h-4" />
                    <span>Citizen - Report Issues</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Admin - Manage Issues</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={selectedRole === "citizen" ? "user@test.com" : "admin@test.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={selectedRole === "citizen" ? "user123" : "admin123"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="transition-all"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                `Login as ${selectedRole === "citizen" ? "Citizen" : "Admin"}`
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Quick Access Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleQuickLogin("citizen")}
              disabled={isLoading}
            >
              <UserCircle className="w-4 h-4 mr-2" />
              Quick Access as Citizen
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleQuickLogin("admin")}
              disabled={isLoading}
            >
              <Shield className="w-4 h-4 mr-2" />
              Quick Access as Admin
            </Button>
            <Button
              variant="ghost"
              className="w-full border border-dashed"
              onClick={handleGuestMode}
              disabled={isLoading}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Continue as Guest (No Login)
            </Button>
          </div>

          {/* Test Credentials Info */}
          <div className="mt-6 p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg text-sm border">
            <p className="font-semibold mb-2 text-foreground flex items-center gap-2">
              🔑 Test Credentials:
            </p>
            <div className="space-y-1 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Citizen:</span> user@test.com / user123
              </p>
              <p>
                <span className="font-medium text-foreground">Admin:</span> admin@test.com / admin123
              </p>
            </div>
          </div>

          {/* Session Management */}
          {localStorage.getItem("userRole") && (
            <Button
              variant="link"
              className="w-full text-xs text-muted-foreground"
              onClick={clearSession}
            >
              Clear saved session
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-4 text-center text-xs text-muted-foreground">
        <p>🏙️ Powered by AI-driven civic engagement</p>
      </div>
    </div>
  );
};

export default Login;
