/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { DailyWordleSection } from "../components/DailyWordleSection";
import { Award, Trophy } from "lucide-react";

type TeamScore = {
  id: number;
  name: string;
  memberCount: number;
  totalScore: number;
  completedQuizzes: number;
  averageScore: number;
};

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [personalTrivia, setPersonalTrivia] = useState([]);

  const fetchTeamScores = async () => {
    try {
      const response = await fetch("/api/leaderboard");
      if (response.ok) {
        const scores = await response.json();
        setTeamScores(scores);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch team scores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamScores();
  }, []);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!user || user.isAdmin) return;

      setLoadingQuizzes(true);
      try {
        const response = await fetch("/api/quiz/available");
        if (response.ok) {
          const quizzes = await response.json();
          setAvailableQuizzes(quizzes);
        }
      } catch (error) {
        console.error("Failed to fetch quizzes:", error);
      } finally {
        setLoadingQuizzes(false);
      }
    };

    fetchQuizzes();
  }, [user]);

  useEffect(() => {
    const fetchPersonalTrivia = async () => {
      if (!user || user.isAdmin) return;

      try {
        const response = await fetch("/api/member/personal-trivia");
        if (response.ok) {
          const trivia = await response.json();
          console.log("Personal trivia loaded:", trivia);
          setPersonalTrivia(trivia);
        } else {
          console.error("Failed to fetch trivia:", await response.text());
        }
      } catch (error) {
        console.error("Failed to load trivia:", error);
      }
    };

    fetchPersonalTrivia();
  }, [user]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-500" />;
      case 1:
        return <Award className="h-4 w-4 sm:h-6 sm:w-6 text-gray-400" />;
      case 2:
        return <Award className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600" />;
      default:
        return (
          <div className="h-4 w-4 sm:h-6 sm:w-6 flex items-center justify-center text-xs sm:text-sm font-bold text-gray-600">
            #{index + 1}
          </div>
        );
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600";
      case 1:
        return "bg-gradient-to-r from-gray-300 to-gray-500";
      case 2:
        return "bg-gradient-to-r from-amber-400 to-amber-600";
      default:
        return "bg-gradient-to-r from-blue-400 to-blue-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
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

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8 max-w-4xl">
      {/* Welcome Section */}
      <div className="text-center px-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Welcome, {user.name}!
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Team:{" "}
          <span className="font-semibold wrap-break-word">
            {user.team?.name}
          </span>
        </p>
      </div>

      {/* Live Team Standings */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 text-base sm:text-lg">
            🏆 Scoreboard
            <Badge variant="secondary" className="text-xs w-fit sm:mx-auto">
              Updated:{" "}
              {new Date(lastUpdated).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {teamScores
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((team, index) => (
              <div
                key={team.id}
                className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border ${
                  user.team?.name === team.name
                    ? "border-blue-300 bg-blue-50 ring-1 sm:ring-2 ring-blue-200"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                  <div
                    className={`flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded-full text-white font-bold ${getRankColor(
                      index
                    )}`}
                  >
                    {getRankIcon(index)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <h3 className="font-semibold text-sm sm:text-lg wrap-break-word leading-tight">
                        {team.name}
                      </h3>
                      {user.team?.name === team.name && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-100 text-blue-700 w-fit"
                        >
                          Your Team
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="text-lg sm:text-2xl font-bold text-gray-900">
                    {team.totalScore}
                  </div>
                </div>
              </div>
            ))}

          {teamScores.length === 0 && (
            <div className="text-center py-6 sm:py-8">
              <p className="text-gray-500 text-sm sm:text-base">
                No team scores available yet.
              </p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Complete some quizzes to see the leaderboard!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Bible Wordle */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
            📝 Daily Bible Wordle
            <Badge variant="secondary" className="text-xs w-fit">
              +2 to +10 points
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DailyWordleSection />
        </CardContent>
      </Card>

      {/* Available Quizzes */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">
            📋 Available Quizzes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingQuizzes ? (
            <div className="text-center py-6 sm:py-8">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm sm:text-base text-gray-600">
                Loading quizzes...
              </p>
            </div>
          ) : availableQuizzes.length > 0 ? (
            <div className="space-y-3">
              {availableQuizzes.map((quiz: any) => (
                <div
                  key={quiz.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg bg-white space-y-3 sm:space-y-0"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-lg wrap-break-word leading-tight">
                      {quiz.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                      {quiz.book?.name} {quiz.fromChapter}:{quiz.fromVerse} -{" "}
                      {quiz.toChapter}:{quiz.toVerse}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {quiz.questions?.length || 0} questions • Created{" "}
                      {new Date(quiz.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push(`/quiz/${quiz.id}`)}
                    className="w-full sm:w-auto sm:ml-4"
                    size="sm"
                  >
                    Start Quiz
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <p className="text-gray-500 text-sm sm:text-base">
                No quizzes available right now.
              </p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Check back later for new Bible quizzes!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Trivia Section */}
      {personalTrivia.length > 0 && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">
              🎯 Your Personal Bible Journey
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {personalTrivia.map((item: any, index) => (
                <div
                  key={index}
                  className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                    item.type === "ENCOURAGEMENT"
                      ? "border-l-green-500 bg-green-50"
                      : item.type === "INSIGHT"
                      ? "border-l-blue-500 bg-blue-50"
                      : "border-l-orange-500 bg-orange-50"
                  }`}
                >
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base break-words">
                    {item.title}
                  </h4>
                  <p className="text-gray-700 mb-3 text-sm sm:text-base leading-relaxed">
                    {item.content}
                  </p>

                  {item.insight && (
                    <div className="bg-white p-2 sm:p-3 rounded border-l-2 border-l-purple-300 mb-3">
                      <p className="text-purple-700 text-xs sm:text-sm font-medium">
                        💝 Personal Note:
                      </p>
                      <p className="text-purple-600 text-xs sm:text-sm leading-relaxed">
                        {item.insight}
                      </p>
                    </div>
                  )}

                  {item.studyTips && (
                    <div className="bg-blue-50 p-2 sm:p-3 rounded border-l-2 border-l-blue-300 mb-3">
                      <p className="text-blue-700 text-xs sm:text-sm font-medium">
                        📖 Study Action:
                      </p>
                      <p className="text-blue-600 text-xs sm:text-sm leading-relaxed">
                        {item.studyTips}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mt-3">
                    {item.suggestedReading && (
                      <Badge variant="outline" className="text-xs w-fit">
                        📖 {item.suggestedReading}
                      </Badge>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
