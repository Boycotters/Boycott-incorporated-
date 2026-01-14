import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, ArrowLeft, Gift, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneVerification } from "@/components/auth/PhoneVerification";

// Validation schemas
const loginSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

const signupSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/[a-z]/, { message: "Password must contain a lowercase letter" })
    .regex(/[A-Z]/, { message: "Password must contain an uppercase letter" })
    .regex(/[0-9]/, { message: "Password must contain a number" }),
  fullName: z.string().trim().min(1, { message: "Full name is required" }).max(100, { message: "Full name is too long" }),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }),
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  
  // Get referral code from URL
  const referralCode = searchParams.get('ref');

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupErrors, setSignupErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState<string | null>(null);

  // Password strength indicators
  const passwordChecks = {
    minLength: signupPassword.length >= 8,
    hasLowercase: /[a-z]/.test(signupPassword),
    hasUppercase: /[A-Z]/.test(signupPassword),
    hasNumber: /[0-9]/.test(signupPassword),
  };
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotEmailError(null);

    const result = forgotPasswordSchema.safeParse({ email: forgotEmail });
    if (!result.success) {
      setForgotEmailError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
      setShowForgotPassword(false);
      setForgotEmail("");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') errors.email = err.message;
        if (err.path[0] === 'password') errors.password = err.message;
      });
      setLoginErrors(errors);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(result.data.email, result.data.password);
    setIsLoading(false);
    
    if (error) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});
    setTermsError(false);
    
    // Check terms agreement
    if (!agreedToTerms) {
      setTermsError(true);
      return;
    }
    
    const result = signupSchema.safeParse({ 
      email: signupEmail, 
      password: signupPassword, 
      fullName: signupFullName 
    });
    
    if (!result.success) {
      const errors: { email?: string; password?: string; fullName?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') errors.email = err.message;
        if (err.path[0] === 'password') errors.password = err.message;
        if (err.path[0] === 'fullName') errors.fullName = err.message;
      });
      setSignupErrors(errors);
      return;
    }

    setIsLoading(true);
    const { error, data } = await signUp(result.data.email, result.data.password, result.data.fullName);
    
    if (error) {
      setIsLoading(false);
      toast({
        title: "Signup failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    } else {
      // Process referral if code exists and user was created
      if (referralCode && data?.user?.id) {
        try {
          await supabase.rpc('process_referral', {
            referrer_code: referralCode,
            new_user_id: data.user.id
          });
        } catch (refError) {
          console.error('Referral processing failed:', refError);
        }
      }
      
      setIsLoading(false);
      
      // Show phone verification step
      if (data?.user?.id) {
        setNewUserId(data.user.id);
        setShowPhoneVerification(true);
      } else {
        // Fallback: go to home
        toast({
          title: "Account created!",
          description: "Welcome to the app!",
        });
        navigate("/");
      }
    }
  };

  const handlePhoneVerified = () => {
    toast({
      title: "Welcome!",
      description: "Your account is set up and phone verified.",
    });
    navigate("/");
  };

  const handleSkipPhoneVerification = () => {
    toast({
      title: "Account created!",
      description: "You can verify your phone later in Settings.",
    });
    navigate("/");
  };

  // Phone verification screen
  if (showPhoneVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-2">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Almost done!</CardTitle>
            <CardDescription>
              Verify your phone number for added security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PhoneVerification
              userId={newUserId || undefined}
              onVerified={handlePhoneVerified}
              onSkip={handleSkipPhoneVerification}
              showSkip={true}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-2">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className={forgotEmailError ? "border-destructive" : ""}
                />
                {forgotEmailError && (
                  <p className="text-sm text-destructive">{forgotEmailError}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setShowForgotPassword(false)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-2">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralCode && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              <span className="text-sm">You were invited! Sign up to get started.</span>
            </div>
          )}

          <Tabs defaultValue={referralCode ? "signup" : "login"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className={loginErrors.email ? "border-destructive" : ""}
                  />
                  {loginErrors.email && (
                    <p className="text-sm text-destructive">{loginErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className={`pr-10 ${loginErrors.password ? "border-destructive" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-sm text-destructive">{loginErrors.password}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : "Sign In"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot your password?
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    required
                    className={signupErrors.fullName ? "border-destructive" : ""}
                  />
                  {signupErrors.fullName && (
                    <p className="text-sm text-destructive">{signupErrors.fullName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    className={signupErrors.email ? "border-destructive" : ""}
                  />
                  {signupErrors.email && (
                    <p className="text-sm text-destructive">{signupErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      className={`pr-10 ${signupErrors.password ? "border-destructive" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {signupErrors.password && (
                    <p className="text-sm text-destructive">{signupErrors.password}</p>
                  )}
                  
                  {/* Password strength indicator */}
                  {signupPassword.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              passwordStrength >= level
                                ? passwordStrength <= 2 ? 'bg-red-500' : passwordStrength === 3 ? 'bg-yellow-500' : 'bg-green-500'
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className={`flex items-center gap-1 ${passwordChecks.minLength ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {passwordChecks.minLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          8+ characters
                        </div>
                        <div className={`flex items-center gap-1 ${passwordChecks.hasLowercase ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {passwordChecks.hasLowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          Lowercase
                        </div>
                        <div className={`flex items-center gap-1 ${passwordChecks.hasUppercase ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {passwordChecks.hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          Uppercase
                        </div>
                        <div className={`flex items-center gap-1 ${passwordChecks.hasNumber ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {passwordChecks.hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          Number
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Terms agreement */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox 
                      id="terms" 
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => {
                        setAgreedToTerms(checked === true);
                        setTermsError(false);
                      }}
                      className={termsError ? "border-destructive" : ""}
                    />
                    <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                      I agree to the Terms of Service and Privacy Policy
                    </label>
                  </div>
                  {termsError && (
                    <p className="text-sm text-destructive">You must agree to the terms to continue</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
