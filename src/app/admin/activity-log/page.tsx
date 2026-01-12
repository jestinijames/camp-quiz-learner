'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Activity, 
  Download, 
  Filter, 
  RefreshCw,
  TrendingUp,
  Users,
  AlertTriangle,
  UserCheck,
  UserX,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ActivityLog = {
  id: string;
  type: string;
  member: string;
  memberId: number;
  team: string;
  teamId: number | null;
  activity: string;
  details: string;
  pointsAwarded: number;
  timestamp: string;
  icon: string;
};

type Summary = {
  totalActivities: number;
  totalPoints: number;
  byType: {
    quiz: number;
    wordle: number;
    emoji: number;
    versedrop: number;
    reading: number;
    insight: number;
  };
  byTeam: Record<string, number>;
};

type ParticipationMember = {
  id: number;
  name: string;
  teamId: number | null;
  teamName: string;
  quiz: number;
  wordle: number;
  emoji: number;
  verseDrop: number;
  reading: number;
  insight: number;
  totalPoints: number;
  totalActivities: number;
};

type ParticipationSummary = {
  totalMembers: number;
  quizParticipation: number;
  wordleParticipation: number;
  emojiParticipation: number;
  verseDropParticipation: number;
  readingParticipation: number;
  insightParticipation: number;
  fullyParticipated: number;
  notParticipated: number;
  totalQuizPoints: number;
  totalWordlePoints: number;
  totalEmojiPoints: number;
  totalVerseDropPoints: number;
  totalReadingPoints: number;
  totalInsightPoints: number;
};

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [memberSearch, setMemberSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Participation tracking state
  const [participationData, setParticipationData] = useState<ParticipationMember[]>([]);
  const [participationSummary, setParticipationSummary] = useState<ParticipationSummary | null>(null);
  const [participationLoading, setParticipationLoading] = useState(false);
  const [participationTeamFilter, setParticipationTeamFilter] = useState('all');
  const [participationActivityFilter, setParticipationActivityFilter] = useState('all');
  const [participationSearch, setParticipationSearch] = useState('');
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);

  const fetchActivityLog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (teamFilter && teamFilter !== 'all') params.append('team', teamFilter);
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(`/api/admin/activity-log?${params}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching activity log:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityLog();
  }, [teamFilter, typeFilter, dateFrom, dateTo]);

  const fetchParticipation = async () => {
    setParticipationLoading(true);
    try {
      const response = await fetch('/api/admin/participation');
      if (response.ok) {
        const data = await response.json();
        setParticipationData(data.participation);
        setParticipationSummary(data.summary);
        setAvailableTeams(data.teams);
      }
    } catch (error) {
      console.error('Error fetching participation data:', error);
    } finally {
      setParticipationLoading(false);
    }
  };

  const filteredActivities = memberSearch
    ? activities.filter(a => 
        a.member.toLowerCase().includes(memberSearch.toLowerCase())
      )
    : activities;

  // Detect potential duplicates (same member, same type, within 5 minutes)
  const detectAnomalies = () => {
    const anomalies: string[] = [];
    const grouped: Record<string, ActivityLog[]> = {};

    activities.forEach(activity => {
      const key = `${activity.memberId}-${activity.type}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(activity);
    });

    Object.entries(grouped).forEach(([key, group]) => {
      if (group.length > 1) {
        // Check for activities within 5 minutes of each other
        for (let i = 0; i < group.length - 1; i++) {
          const time1 = new Date(group[i].timestamp).getTime();
          const time2 = new Date(group[i + 1].timestamp).getTime();
          const diffMinutes = Math.abs(time1 - time2) / 1000 / 60;
          
          if (diffMinutes < 5) {
            anomalies.push(`${group[i].member} - Multiple ${group[i].type} entries within 5 minutes`);
          }
        }
      }
    });

    return anomalies;
  };

  const anomalies = detectAnomalies();

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Type', 'Member', 'Team', 'Activity', 'Details', 'Points'];
    const rows = filteredActivities.map(a => [
      new Date(a.timestamp).toLocaleString(),
      a.type,
      a.member,
      a.team,
      a.activity,
      a.details.replace(/,/g, ';'), // Replace commas in details
      a.pointsAwarded.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const teams = summary ? Object.keys(summary.byTeam) : [];

  // Filter participation data
  const filteredParticipation = participationData.filter(member => {
    // Search filter
    if (participationSearch && !member.name.toLowerCase().includes(participationSearch.toLowerCase())) {
      return false;
    }
    
    // Team filter
    if (participationTeamFilter !== 'all' && member.teamName !== participationTeamFilter) {
      return false;
    }
    
    // Activity filter
    if (participationActivityFilter !== 'all') {
      switch (participationActivityFilter) {
        case 'quiz':
          return member.quiz === 0; // Show who didn't participate in quiz
        case 'wordle':
          return member.wordle === 0;
        case 'emoji':
          return member.emoji === 0;
        case 'versedrop':
          return member.verseDrop === 0;
        case 'reading':
          return member.reading === 0;
        case 'insight':
          return member.insight === 0;
        case 'none':
          return member.totalActivities === 0; // Show who didn't participate in any
        case 'all-participated':
          return member.totalActivities === 6; // Show who participated in all
        default:
          return true;
      }
    }
    
    return true;
  });

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="w-8 h-8" />
            Activity Audit Log
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor all point-earning activities and member participation
          </p>
        </div>
        <Button onClick={fetchActivityLog} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="activity-log" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="activity-log">Activity Log</TabsTrigger>
          <TabsTrigger value="participation" onClick={() => {
            if (participationData.length === 0) fetchParticipation();
          }}>
            Member Participation
          </TabsTrigger>
        </TabsList>

        {/* Activity Log Tab */}
        <TabsContent value="activity-log" className="space-y-6">

      {/* Anomalies Alert */}
      {anomalies.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="w-5 h-5" />
              Potential Anomalies Detected ({anomalies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {anomalies.slice(0, 5).map((anomaly, idx) => (
                <li key={idx} className="text-orange-600 dark:text-orange-300">{anomaly}</li>
              ))}
              {anomalies.length > 5 && (
                <li className="text-orange-500">...and {anomalies.length - 5} more</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalActivities}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Points Awarded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.totalPoints}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Most Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {Object.entries(summary.byType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Leading Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {Object.entries(summary.byTeam).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
              </div>
              <div className="text-sm text-gray-500">
                {Object.entries(summary.byTeam).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} pts
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search member..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
            
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team} value={team}>{team}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="quiz">Quiz</SelectItem>
                <SelectItem value="wordle">Wordle</SelectItem>
                <SelectItem value="emoji">Emoji Game</SelectItem>
                <SelectItem value="versedrop">Verse Drop</SelectItem>
                <SelectItem value="reading">Read Passage</SelectItem>
                <SelectItem value="insight">Shared Insight</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From Date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />

            <Input
              type="date"
              placeholder="To Date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setTeamFilter('all');
                setTypeFilter('all');
                setMemberSearch('');
                setDateFrom('');
                setDateTo('');
              }}
            >
              Clear Filters
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({filteredActivities.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading activities...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No activities found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Member</th>
                    <th className="px-4 py-2 text-left">Team</th>
                    <th className="px-4 py-2 text-left">Activity</th>
                    <th className="px-4 py-2 text-left">Details</th>
                    <th className="px-4 py-2 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivities.map((activity) => (
                    <tr 
                      key={activity.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {activity.icon} {activity.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{activity.member}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{activity.team}</Badge>
                      </td>
                      <td className="px-4 py-3">{activity.activity}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {activity.details}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-green-600 dark:text-green-400">
                          +{activity.pointsAwarded}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Participation Tracking Tab */}
        <TabsContent value="participation" className="space-y-6">
          {/* Participation Summary Cards */}
          {participationSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    {participationSummary.totalMembers}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Quiz</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {participationSummary.quizParticipation}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round((participationSummary.quizParticipation / participationSummary.totalMembers) * 100)}%
                  </div>
                  <div className="text-xs font-semibold text-purple-600 mt-1">
                    {participationSummary.totalQuizPoints} pts
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Wordle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {participationSummary.wordleParticipation}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round((participationSummary.wordleParticipation / participationSummary.totalMembers) * 100)}%
                  </div>
                  <div className="text-xs font-semibold text-green-600 mt-1">
                    {participationSummary.totalWordlePoints} pts
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Emoji</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {participationSummary.emojiParticipation}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round((participationSummary.emojiParticipation / participationSummary.totalMembers) * 100)}%
                  </div>
                  <div className="text-xs font-semibold text-yellow-600 mt-1">
                    {participationSummary.totalEmojiPoints} pts
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Verse Drop</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {participationSummary.verseDropParticipation}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round((participationSummary.verseDropParticipation / participationSummary.totalMembers) * 100)}%
                  </div>
                  <div className="text-xs font-semibold text-blue-600 mt-1">
                    {participationSummary.totalVerseDropPoints} pts
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Reading</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {participationSummary.readingParticipation}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round((participationSummary.readingParticipation / participationSummary.totalMembers) * 100)}%
                  </div>
                  <div className="text-xs font-semibold text-orange-600 mt-1">
                    {participationSummary.totalReadingPoints} pts
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-pink-600">
                    {participationSummary.insightParticipation}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round((participationSummary.insightParticipation / participationSummary.totalMembers) * 100)}%
                  </div>
                  <div className="text-xs font-semibold text-pink-600 mt-1">
                    {participationSummary.totalInsightPoints} pts
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Not Participating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
                    <UserX className="w-5 h-5" />
                    {participationSummary.notParticipated}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Participation Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Search member..."
                  value={participationSearch}
                  onChange={(e) => setParticipationSearch(e.target.value)}
                />
                
                <Select value={participationTeamFilter} onValueChange={setParticipationTeamFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {availableTeams.map(team => (
                      <SelectItem key={team} value={team}>{team}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={participationActivityFilter} onValueChange={setParticipationActivityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Activity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Show All</SelectItem>
                    <SelectItem value="none">Not Participating (0 activities)</SelectItem>
                    <SelectItem value="all-participated">Participated in All (6 activities)</SelectItem>
                    <SelectItem value="quiz">Missing Quiz</SelectItem>
                    <SelectItem value="wordle">Missing Wordle</SelectItem>
                    <SelectItem value="emoji">Missing Emoji</SelectItem>
                    <SelectItem value="versedrop">Missing Verse Drop</SelectItem>
                    <SelectItem value="reading">Missing Reading</SelectItem>
                    <SelectItem value="insight">Missing Insight</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setParticipationTeamFilter('all');
                    setParticipationActivityFilter('all');
                    setParticipationSearch('');
                  }}
                >
                  Clear Filters
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchParticipation}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Participation Table */}
          <Card>
            <CardHeader>
              <CardTitle>Member Participation ({filteredParticipation.length} members)</CardTitle>
            </CardHeader>
            <CardContent>
              {participationLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading participation data...</p>
                </div>
              ) : filteredParticipation.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No members found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left">Member</th>
                        <th className="px-4 py-2 text-left">Team</th>
                        <th className="px-4 py-2 text-center">Quiz</th>
                        <th className="px-4 py-2 text-center">Wordle</th>
                        <th className="px-4 py-2 text-center">Emoji</th>
                        <th className="px-4 py-2 text-center">Verse Drop</th>
                        <th className="px-4 py-2 text-center">Reading</th>
                        <th className="px-4 py-2 text-center">Insights</th>
                        <th className="px-4 py-2 text-center">Activities</th>
                        <th className="px-4 py-2 text-center">Total Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParticipation.map((member) => (
                        <tr 
                          key={member.id}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="px-4 py-3 font-medium">{member.name}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{member.teamName}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {member.quiz > 0 ? (
                              <span className="font-semibold text-purple-600">{member.quiz}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {member.wordle > 0 ? (
                              <span className="font-semibold text-green-600">{member.wordle}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {member.emoji > 0 ? (
                              <span className="font-semibold text-yellow-600">{member.emoji}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {member.verseDrop > 0 ? (
                              <span className="font-semibold text-blue-600">{member.verseDrop}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {member.reading > 0 ? (
                              <span className="font-semibold text-orange-600">{member.reading}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {member.insight > 0 ? (
                              <span className="font-semibold text-pink-600">{member.insight}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge 
                              variant={member.totalActivities === 6 ? "default" : member.totalActivities === 0 ? "destructive" : "outline"}
                              className="font-bold"
                            >
                              {member.totalActivities}/6
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-lg text-green-600">
                              {member.totalPoints}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {participationSummary && filteredParticipation.length > 0 && (
                      <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold">
                        <tr>
                          <td colSpan={2} className="px-4 py-3 text-right">Total Points:</td>
                          <td className="px-4 py-3 text-center text-purple-600">
                            {filteredParticipation.reduce((sum, m) => sum + m.quiz, 0)}
                          </td>
                          <td className="px-4 py-3 text-center text-green-600">
                            {filteredParticipation.reduce((sum, m) => sum + m.wordle, 0)}
                          </td>
                          <td className="px-4 py-3 text-center text-yellow-600">
                            {filteredParticipation.reduce((sum, m) => sum + m.emoji, 0)}
                          </td>
                          <td className="px-4 py-3 text-center text-blue-600">
                            {filteredParticipation.reduce((sum, m) => sum + m.verseDrop, 0)}
                          </td>
                          <td className="px-4 py-3 text-center text-orange-600">
                            {filteredParticipation.reduce((sum, m) => sum + m.reading, 0)}
                          </td>
                          <td className="px-4 py-3 text-center text-pink-600">
                            {filteredParticipation.reduce((sum, m) => sum + m.insight, 0)}
                          </td>
                          <td className="px-4 py-3 text-center">-</td>
                          <td className="px-4 py-3 text-center text-green-600 text-lg">
                            {filteredParticipation.reduce((sum, m) => sum + m.totalPoints, 0)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
