import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Clock } from 'lucide-react';

export default function PendingApproval() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Account Pending Approval</CardTitle>
          <CardDescription className="text-base">
            Thank you for registering with Camp Quiz Learner!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                  Your account is currently under review
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Our admin team will review your registration and assign you to a team shortly. 
                  You&apos;ll receive access to all quizzes, games, and features once approved.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              What happens next?
            </h3>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Admin reviews your account</p>
                  <p className="text-sm text-muted-foreground">
                    The administrator will verify your details
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Team assignment</p>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll be assigned to your appropriate team
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Access granted</p>
                  <p className="text-sm text-muted-foreground">
                    Start participating in quizzes, emoji games, and wordle challenges!
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Please check back later or refresh this page to see if your account has been approved.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
