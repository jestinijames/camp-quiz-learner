'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus, UserX, RefreshCw } from 'lucide-react';

type PendingMember = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

type Team = {
  id: number;
  name: string;
};

export default function PendingMembersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [membersRes, teamsRes] = await Promise.all([
        fetch('/api/admin/pending-members'),
        fetch('/api/teams')
      ]);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setPendingMembers(membersData);
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
      }
    } catch {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (memberId: number) => {
    const teamId = selectedTeams[memberId];
    if (!teamId) {
      alert('Please select a team first');
      return;
    }

    setProcessingId(memberId);
    try {
      const response = await fetch('/api/admin/approve-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, teamId }),
      });

      if (response.ok) {
        // Remove from pending list
        setPendingMembers(prev => prev.filter(m => m.id !== memberId));
        // Clear selected team
        setSelectedTeams(prev => {
          const updated = { ...prev };
          delete updated[memberId];
          return updated;
        });
      } else {
        alert('Failed to approve member');
      }
    } catch {
      alert('Failed to approve member');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (memberId: number) => {
    if (!confirm('Are you sure you want to reject this member? This will permanently delete their account.')) {
      return;
    }

    setProcessingId(memberId);
    try {
      const response = await fetch('/api/admin/reject-member', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      if (response.ok) {
        // Remove from pending list
        setPendingMembers(prev => prev.filter(m => m.id !== memberId));
      } else {
        alert('Failed to reject member');
      }
    } catch {
      alert('Failed to reject member');
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pending Member Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve new member registrations
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {pendingMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Members</h3>
            <p className="text-muted-foreground">
              All registered members have been approved or rejected.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingMembers.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {member.firstName} {member.lastName}
                      <Badge variant="secondary" className="text-xs">
                        Pending
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <span className="font-medium">Email:</span> {member.email}
                    </CardDescription>
                    <CardDescription className="text-xs mt-1">
                      Password: {member.email} (same as email)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="text-sm font-medium mb-2 block">
                      Assign Team
                    </label>
                    <Select
                      value={selectedTeams[member.id]?.toString() || ''}
                      onValueChange={(value) =>
                        setSelectedTeams(prev => ({ ...prev, [member.id]: parseInt(value) }))
                      }
                      disabled={processingId === member.id}
                    >
                      <SelectTrigger className="w-full sm:w-[250px]">
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      onClick={() => handleApprove(member.id)}
                      disabled={!selectedTeams[member.id] || processingId === member.id}
                      className="flex-1 sm:flex-initial"
                      title={!selectedTeams[member.id] ? "Please select a team first" : ""}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(member.id)}
                      variant="destructive"
                      disabled={processingId === member.id}
                      className="flex-1 sm:flex-initial"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
