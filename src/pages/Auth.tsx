import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, ArrowLeft, Gift, Eye, EyeOff, Check, X, Loader2, Phone, Mail } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneVerification } from "@/components/auth/PhoneVerification";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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

type AuthMethod = "email" | "phone";
type ForgotPasswordMethod = "email" | "phone";
type PhoneAuthStep = "phone" | "otp";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  
  // Auth method toggle
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  
  // Phone login state
  const [phoneAuthStep, setPhoneAuthStep] = useState<PhoneAuthStep>("phone");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  
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
  const [signupPhone, setSignupPhone] = useState("");
  const [signupErrors, setSignupErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState<string | null>(null);
  const [forgotPasswordMethod, setForgotPasswordMethod] = useState<ForgotPasswordMethod>("email");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotPhoneOtp, setForgotPhoneOtp] = useState("");
  const [forgotPhoneStep, setForgotPhoneStep] = useState<"phone" | "otp">("phone");

  // Password strength indicators
  const passwordChecks = {
    minLength: signupPassword.length >= 8,
    hasLowercase: /[a-z]/.test(signupPassword),
    hasUppercase: /[A-Z]/.test(signupPassword),
    hasNumber: /[0-9]/.test(signupPassword),
  };
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const formatPhoneNumber = (value: string) => {
    return value.replace(/[^\d+]/g, "");
  };

  const validatePhone = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length < 10) {
      return "Phone number must be at least 10 digits";
    }
    if (cleaned.length > 15) {
      return "Phone number is too long";
    }
    return null;
  };

  const handleSendPhoneOtp = async () => {
    setPhoneError(null);
    
    const error = validatePhone(loginPhone);
    if (error) {
      setPhoneError(error);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-sms-otp", {
        body: { phone_number: loginPhone },
        headers: { "Content-Type": "application/json" },
      });

      if (error) {
        throw new Error(error.message || "Failed to send verification code");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Code sent!",
        description: "Check your phone for the verification code.",
      });
      
      setPhoneAuthStep("otp");
      setCountdown(60);
    } catch (err: any) {
      toast({
        title: "Failed to send code",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneLogin = async () => {
    if (loginOtp.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-sms-otp", {
        body: { phone_number: loginPhone, otp_code: loginOtp },
        headers: { "Content-Type": "application/json" },
      });

      if (error) {
        throw new Error(error.message || "Verification failed");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Phone verified - now check if user exists with this phone
      const { data: userData } = await supabase
        .from('users')
        .select('id, email')
        .eq('phone', loginPhone)
        .eq('phone_verified', true)
        .single();

      if (userData) {
        // User exists - they need to login with email/password
        toast({
          title: "Phone verified!",
          description: "Please use your email and password to sign in.",
        });
        setAuthMethod("email");
        setPhoneAuthStep("phone");
        setLoginOtp("");
      } else {
        toast({
          title: "No account found",
          description: "Please sign up first with your email, then verify your phone.",
          variant: "destructive",
        });
        setPhoneAuthStep("phone");
        setLoginOtp("");
      }
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
      setLoginOtp("");
    } finally {
      setIsLoading(false);
    }
  };

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
    
    try {
      const { error, data } = await signUp(result.data.email, result.data.password, result.data.fullName);
      
      if (error) {
        toast({
          title: "Signup failed",
          description: error.message || "Could not create account",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
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
      
      // After signup, try to auto-login the user immediately
      if (data?.user?.id) {
        // If email confirmation is not required, the session should be active
        // Check if we have an active session
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session) {
          // User is logged in, show phone verification or go to home
          setNewUserId(data.user.id);
          setShowPhoneVerification(true);
        } else {
          // Session not active - might need email confirmation
          // Try to sign in with the credentials we just used
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: result.data.email,
            password: result.data.password,
          });
          
          if (signInError) {
            // Email confirmation might be required
            toast({
              title: "Account created!",
              description: "Please check your email to verify your account, then login.",
            });
            setIsLoading(false);
            return;
          }
          
          // Successfully signed in
          setNewUserId(data.user.id);
          setShowPhoneVerification(true);
        }
      } else {
        // Fallback: go to home
        toast({
          title: "Account created!",
          description: "Welcome to the app!",
        });
        navigate("/");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  // Phone verification screen after signup
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
              {/* Auth Method Toggle */}
              <div className="flex gap-2 mb-4 p-1 bg-secondary/50 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("email");
                    setPhoneAuthStep("phone");
                    setLoginOtp("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    authMethod === "email" 
                      ? "bg-background shadow-sm" 
                      : "hover:bg-background/50"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod("phone")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    authMethod === "phone" 
                      ? "bg-background shadow-sm" 
                      : "hover:bg-background/50"
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  Phone
                </button>
              </div>

              {authMethod === "email" ? (
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
              ) : (
                <div className="space-y-4">
                  {phoneAuthStep === "phone" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="login-phone">Phone Number</Label>
                        <Input
                          id="login-phone"
                          type="tel"
                          placeholder="+260 XXX XXX XXX"
                          value={loginPhone}
                          onChange={(e) => {
                            setLoginPhone(formatPhoneNumber(e.target.value));
                            setPhoneError(null);
                          }}
                          className={phoneError ? "border-destructive" : ""}
                          disabled={isLoading}
                        />
                        {phoneError && (
                          <p className="text-sm text-destructive">{phoneError}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Include country code (e.g., +260 for Zambia)
                        </p>
                      </div>
                      <Button 
                        onClick={handleSendPhoneOtp} 
                        className="w-full" 
                        disabled={isLoading || !loginPhone}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending code...
                          </>
                        ) : (
                          "Send Verification Code"
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                          We sent a 6-digit code to {loginPhone}
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={loginOtp}
                          onChange={setLoginOtp}
                          disabled={isLoading}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <Button 
                        onClick={handleVerifyPhoneLogin} 
                        className="w-full" 
                        disabled={isLoading || loginOtp.length !== 6}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Verify
                          </>
                        )}
                      </Button>
                      <div className="flex items-center justify-between text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPhoneAuthStep("phone");
                            setLoginOtp("");
                          }}
                          disabled={isLoading}
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          Change number
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSendPhoneOtp}
                          disabled={isLoading || countdown > 0}
                        >
                          {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
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
                  <Label htmlFor="signup-phone">Phone Number (Optional)</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+260 XXX XXX XXX"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(formatPhoneNumber(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    You'll verify this after signing up
                  </p>
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
                                ? level <= 2
                                  ? "bg-destructive"
                                  : level === 3
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="space-y-1 text-xs">
                        {Object.entries(passwordChecks).map(([key, valid]) => (
                          <div key={key} className="flex items-center gap-2">
                            {valid ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <X className="w-3 h-3 text-muted-foreground" />
                            )}
                            <span className={valid ? "text-green-600" : "text-muted-foreground"}>
                              {key === "minLength" && "At least 8 characters"}
                              {key === "hasLowercase" && "One lowercase letter"}
                              {key === "hasUppercase" && "One uppercase letter"}
                              {key === "hasNumber" && "One number"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Terms checkbox */}
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
                    <label
                      htmlFor="terms"
                      className="text-sm text-muted-foreground leading-none cursor-pointer"
                    >
                      I agree to the Terms of Service and Privacy Policy
                    </label>
                  </div>
                  {termsError && (
                    <p className="text-sm text-destructive">You must agree to continue</p>
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