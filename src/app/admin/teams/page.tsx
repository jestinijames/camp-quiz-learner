'use client';

import  { useState, useEffect } from 'react';

import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type Member = { firstName: string; email: string };
type Team = {
  id?: number;
  name: string;
  members: Member[];
};

  const [teams, setTeams] = useState<Team[]>([
    { name: '', members: [{ firstName: '', email: '' }, { firstName: '', email: '' }] },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTeams() {
      try {
        const response = await axios.get<Team[]>('/api/admin/teams');
        if (response.data.length > 0) setTeams(response.data);
      } catch {
        // ignore or show error
      }
    }
    fetchTeams();
  }, []);

  function updateTeamField(i: number, field: keyof Team, value: string) {
    const newTeams = [...teams];
    (newTeams[i][field] as string) = value;
    setTeams(newTeams);
  }

  function updateMemberField(teamIndex: number, memberIndex: number, field: keyof Member, value: string) {
    const newTeams = [...teams];
    newTeams[teamIndex].members[memberIndex][field] = value;
    setTeams(newTeams);
  }

  function addMember(teamIndex: number) {
    const newTeams = [...teams];
    newTeams[teamIndex].members.push({ firstName: '', email: '' });
    setTeams(newTeams);
  }

  function addTeam() {
    setTeams([...teams, { name: '', members: [{ firstName: '', email: '' }, { firstName: '', email: '' }] }]);
  }

  async function saveTeams() {
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/admin/teams', { teams });
      alert('Teams saved successfully');
    } catch {
      setError('Failed to save teams');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold mb-4">Admin: Manage Teams & Members</h1>

      {teams.map((team, ti) => (
        <div key={ti} className="border rounded p-4 space-y-4">
          <Input
            placeholder="Team Name"
            value={team.name}
            onChange={e => updateTeamField(ti, 'name', e.target.value)}
          />
          <Label className="font-semibold">Members</Label>
          {team.members.map((member, mi) => (
            <div key={mi} className="flex gap-2 mb-2">
              <Input
                placeholder={`First Name`}
                value={member.firstName}
                onChange={e => updateMemberField(ti, mi, 'firstName', e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder={`Email`}
                value={member.email}
                onChange={e => updateMemberField(ti, mi, 'email', e.target.value)}
                className="flex-1"
              />
            </div>
          ))}
          <Button variant="outline" onClick={() => addMember(ti)}>
            + Add Member
          </Button>
        </div>
      ))}

      <Button variant="secondary" onClick={addTeam}>
        + Add Team
      </Button>

      <div>
        <Button size="lg" onClick={saveTeams} disabled={loading}>
          {loading ? 'Saving...' : 'Save Teams'}
        </Button>
        {error && <p className="text-destructive mt-2">{error}</p>}
      </div>
    </div>
  );
}
