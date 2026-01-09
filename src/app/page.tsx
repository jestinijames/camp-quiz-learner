/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/button";

// Import our components
import { WelcomeSection } from "../components/WelcomeSection";
import { TodaysTasks } from "@/components/TodaysTasks";
import { QuizReviewSection } from "@/components/QuizReviewSection";
import PendingApproval from "@/components/PendingApproval";
import { SessionClosed } from "@/components/SessionClosed";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const redirectedRef = useRef(false);
  const [sessionActive, setSessionActive] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  // Check session status
  useEffect(() => {
    const checkSessionStatus = async () => {
      try {
        const response = await fetch('/api/session-status');
        if (response.ok) {
          const data = await response.json();
          setSessionActive(data.sessionActive);
          setSessionMessage(data.sessionMessage);
        }
      } catch (error) {
        console.error('Failed to check session status:', error);
        // Default to active on error
        setSessionActive(true);
      } finally {
        setCheckingSession(false);
      }
    };

    if (!loading && user && !user.isAdmin) {
      checkSessionStatus();
    } else {
      setCheckingSession(false);
    }
  }, [user, loading]);

  useEffect(() => {
    if (!loading && !user && !redirectedRef.current) {
      redirectedRef.current = true;
      router.push("/login");
    }
  }, [user, loading, router]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-sm sm:text-base text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (user.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">
            Welcome, Admin!
          </h1>
          <Button
            onClick={() => router.push("/admin/dashboard")}
            size="lg"
            className="w-full sm:w-auto"
          >
            Go to Admin Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Check if member is not approved yet
  if (!user.isApproved) {
    return <PendingApproval />;
  }

  // Show session closed message for regular users (not admin)
  if (!sessionActive && !user.isAdmin) {
    return <SessionClosed message={sessionMessage} />;
  }

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 max-w-4xl">
        {/* Welcome Section */}
        <WelcomeSection user={{ ...user, team: user.team ?? undefined }} />

        {/* Today's Tasks - Unified Section */}
        <TodaysTasks user={user} />

        {/* Quiz Review Section */}
        <QuizReviewSection user={user} />
      </div>
    </div>
  );
}
