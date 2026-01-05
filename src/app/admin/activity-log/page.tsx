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
  AlertTriangle
} from 'lucide-react';

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
    reading: number;
    insight: number;
  };
  byTeam: Record<string, number>;
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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="w-8 h-8" />
            Activity Audit Log
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor all point-earning activities across the platform
          </p>
        </div>
        <Button onClick={fetchActivityLog} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

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
    </div>
  );
}
