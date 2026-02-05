
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Mail, CheckCircle, ArrowRight, AlertCircle, Timer } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { isValidEmail } from '@/utils/securityUtils';
import { getUpdatePasswordRedirectUrl } from '@/utils/redirectUrlHelper';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  
  // Cooldown state
  const [cooldown, setCooldown] = useState(0);

  // Handle cooldown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handlePasswordResetError = (error) => {
    console.error("Password reset error details:", error);
    
    let errorMessage = "An error occurred. Please try again later.";
    const errString = error?.message?.toLowerCase() || "";
    const errStatus = error?.status;

    // Handle Rate Limiting specifically
    if (errStatus === 429 || errString.includes("rate_limit") || errString.includes("security purposes")) {
      // Extract seconds if available in message, otherwise default to 60
      const secondsMatch = errString.match(/after (\d+) seconds/);
      const waitTime = secondsMatch ? parseInt(secondsMatch[1], 10) : 60;
      
      setCooldown(waitTime);
      errorMessage = `Please wait ${waitTime} seconds before requesting another email.`;
    } else if (errStatus === 500 || errString.includes("unexpected_failure")) {
      errorMessage = "Server error sending email. Please contact support or try again later.";
    } else if (errString.includes("invalid_email") || errString.includes("validation failed")) {
      errorMessage = "This email address is invalid.";
    } else if (errString.includes("user_not_found")) {
      errorMessage = "No account found with this email address.";
    } else if (errString.includes("network") || errString.includes("fetch")) {
      errorMessage = "Network connection error. Please check your internet.";
    }

    toast({ 
      variant: "destructive", 
      title: "Request Failed", 
      description: errorMessage 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (cooldown > 0) {
        toast({
            title: "Please wait",
            description: `You can request another email in ${cooldown} seconds.`,
            variant: "default"
        });
        return;
    }

    // 1. Validation
    if (!email || !isValidEmail(email)) {
        toast({ 
            variant: "destructive", 
            title: "Invalid Email", 
            description: "Please enter a valid email address." 
        });
        return;
    }

    setIsLoading(true);
    
    try {
        // 2. Dynamic Redirect URL
        const redirectUrl = getUpdatePasswordRedirectUrl();
        console.log("Initiating password reset for:", email);
        console.log("Using redirect URL:", redirectUrl);

        // 3. Supabase Call
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { 
            redirectTo: redirectUrl
        });
        
        if (error) {
             throw error;
        }

        // 4. Success
        setIsSent(true);
        setCooldown(60); // Start cooldown on success to prevent spamming immediately
        toast({ 
            title: "Email Sent", 
            description: "Check your inbox for the password reset link." 
        });

    } catch (err) {
        handlePasswordResetError(err);
    } finally {
        setIsLoading(false);
    }
  };

  const handleClose = () => {
      if (!isSent) setEmail(''); 
      setIsSent(false);
      onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border border-slate-200 dark:border-olive/20 shadow-premium bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#055b4f]">
              {isSent ? "Check your inbox" : "Reset Password"}
          </DialogTitle>
          <DialogDescription>
             {isSent 
                ? `We have sent a secure password reset link to ${email}. Click the link in the email to create a new password.`
                : "Enter the email associated with your account and we'll send you a link to reset your password."
             }
          </DialogDescription>
        </DialogHeader>

        {isSent ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-center space-y-2">
                    <p className="text-sm text-slate-500 max-w-xs mx-auto">
                        Did not receive the email? Check your spam folder or try again in a few minutes.
                    </p>
                    {cooldown > 0 && (
                        <p className="text-xs text-orange-600 font-medium flex items-center justify-center gap-1">
                            <Timer className="w-3 h-3" />
                            Resend available in {cooldown}s
                        </p>
                    )}
                </div>
                <div className="flex flex-col w-full gap-2">
                    <Button onClick={handleClose} className="w-full bg-[#17a277] hover:bg-[#055b4f] text-white">
                        Return to Login
                    </Button>
                    {cooldown === 0 && (
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsSent(false)} 
                            className="w-full text-slate-500 hover:text-slate-700"
                        >
                            Try another email
                        </Button>
                    )}
                </div>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
                <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-slate-700">Email Address</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input 
                            id="reset-email" 
                            type="email" 
                            placeholder="name@example.com" 
                            className="pl-9"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading || cooldown > 0}
                        />
                    </div>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-md flex gap-2 items-start">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700">
                        For security, the link will expire in 1 hour.
                    </p>
                </div>

                <DialogFooter className="pt-2 gap-2 flex-col sm:flex-row">
                    <Button type="button" variant="ghost" onClick={handleClose} className="w-full sm:w-auto">Cancel</Button>
                    <Button 
                        type="submit" 
                        disabled={isLoading || cooldown > 0}
                        className="w-full sm:w-auto bg-gradient-to-r from-[#055b4f] to-[#17a277] text-white hover:shadow-md transition-all disabled:opacity-70"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        ) : cooldown > 0 ? (
                            <span className="flex items-center"><Timer className="mr-2 h-4 w-4"/> Wait {cooldown}s</span>
                        ) : (
                            <span className="flex items-center"><ArrowRight className="mr-2 h-4 w-4"/> Send Reset Link</span>
                        )}
                    </Button>
                </DialogFooter>
            </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordModal;
