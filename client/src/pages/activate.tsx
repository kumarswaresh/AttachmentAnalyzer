import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function Activate() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid activation link - no token provided');
      return;
    }

    // Activate account
    const activateAccount = async () => {
      try {
        const response = await apiRequest('GET', `/api/auth/activate?token=${token}`);
        
        if (response.success) {
          setStatus('success');
          setMessage(response.message || 'Account activated successfully');
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            setLocation(response.redirectUrl || '/dashboard');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.message || 'Account activation failed');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Failed to activate account');
      }
    };

    activateAccount();
  }, [setLocation]);

  const handleReturnToLogin = () => {
    setLocation('/login');
  };

  const handleGoToDashboard = () => {
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AI Agent Platform
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Account Activation
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {status === 'loading' && (
                <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
              )}
              {status === 'success' && (
                <CheckCircle className="h-16 w-16 text-green-500" />
              )}
              {status === 'error' && (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
            
            <CardTitle className="text-2xl">
              {status === 'loading' && 'Activating Account...'}
              {status === 'success' && 'Account Activated!'}
              {status === 'error' && 'Activation Failed'}
            </CardTitle>
            
            <CardDescription className="text-center">
              {status === 'loading' && 'Please wait while we activate your account'}
              {status === 'success' && 'Your account has been successfully activated'}
              {status === 'error' && 'There was a problem activating your account'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center text-gray-600 dark:text-gray-400">
              {message}
            </div>

            {status === 'success' && (
              <div className="space-y-3">
                <div className="text-center text-sm text-gray-500">
                  You will be redirected to the dashboard in a few seconds...
                </div>
                <Button onClick={handleGoToDashboard} className="w-full">
                  Go to Dashboard Now
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <Button onClick={handleReturnToLogin} className="w-full">
                  Return to Login
                </Button>
                <div className="text-center text-sm text-gray-500">
                  If you continue to have issues, please contact support
                </div>
              </div>
            )}

            {status === 'loading' && (
              <div className="text-center text-sm text-gray-500">
                This should only take a moment...
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-500 mt-6">
          Having trouble? Contact our{" "}
          <a href="/support" className="underline">support team</a>
        </div>
      </div>
    </div>
  );
}