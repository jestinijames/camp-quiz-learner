'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Settings, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '../ui/switch';

export function SessionControl() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionActive, setSessionActive] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSessionActive(data.settings.sessionActive);
        setSessionMessage(data.settings.sessionMessage);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setError('Failed to load current settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionActive,
          sessionMessage
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to update settings');
      }
    } catch (error) {
      setError('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <span>Session Control</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Session Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Session Status</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                When OFF, users will see a maintenance message instead of tasks
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${sessionActive ? 'text-green-600' : 'text-orange-600'}`}>
                {sessionActive ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> ACTIVE
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-4 w-4" /> CLOSED
                  </span>
                )}
              </span>
              <Switch
                checked={sessionActive}
                onCheckedChange={setSessionActive}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Custom Message (shown when session is closed)</Label>
            <Textarea
              id="message"
              value={sessionMessage}
              onChange={(e) => setSessionMessage(e.target.value)}
              placeholder="Enter the message users will see when session is closed..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              This message will be displayed to users when the session is closed
            </p>
          </div>

          {/* Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <AlertDescription className="text-green-800 dark:text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 How it works
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li>When OFF: Users see only the maintenance message</li>
            <li>When ON: Users see their normal dashboard with all tasks</li>
            <li>Admins always see the full dashboard regardless of status</li>
            <li>Changes take effect immediately for all users</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
