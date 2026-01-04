'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  // Unified login states
  const [identifier, setIdentifier] = useState(''); // Can be email or username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Registration states
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  
  const { login, user, loading: authLoading } = useAuth();

  // Redirect immediately if user is authenticated
  useEffect(() => {
    if (user) {
      if (user.isAdmin) {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/';
      }
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const success = await login({
      identifier,
      password,
    });

    if (success) {
      // Redirect will be handled by the useEffect above based on user type
    } else {
      setError('Invalid credentials. Please check your email/username and password.');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: regFirstName,
          lastName: regLastName,
          email: regEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Auto-login the user
      await login({ identifier: regEmail, password: regEmail });
      
      // Redirect will be handled by useEffect
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Registration failed');
      setRegLoading(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Redirecting...</p>
        </div>
      </div>
    );
  } else {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">CQL</span>
              </div>
              <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Camp Quiz Learner
              </CardTitle>
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Sign in or create an account
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="identifier">Email</Label>
                    <Input
                      id="identifier"
                      type="email"
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      required
                      placeholder="Enter your email"
                      className="h-10"
                      autoComplete="email"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Use your email address
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      className="h-10"
                      autoComplete="current-password"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Use your email address (same as above)
                    </p>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    className="w-full h-10"
                    disabled={loading || !identifier || !password}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Enter your first name"
                      value={regFirstName}
                      onChange={(e) => setRegFirstName(e.target.value)}
                      required
                      disabled={regLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Enter your last name"
                      value={regLastName}
                      onChange={(e) => setRegLastName(e.target.value)}
                      required
                      disabled={regLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      disabled={regLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your email will be used as your password for initial login
                    </p>
                  </div>

                  {regError && (
                    <Alert variant="destructive">
                      <AlertDescription>{regError}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={regLoading}>
                    {regLoading ? 'Registering...' : 'Register'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }
}