import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, Plus, Loader2 } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ScheduleEditor = ({ type, isExpired }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(null);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['doctorSchedule', type],
    queryFn: () => doctorApi.getSchedule(type),
  });

  useEffect(() => {
    if (schedule) {
      setFormData({
        slotDurationMin: schedule.slotDurationMin || 30,
        bufferMin: schedule.bufferMin || 0,
        advanceBookingDays: schedule.advanceBookingDays || 30,
        minNoticeMinutes: schedule.minNoticeMinutes || 60,
        weeklyRules:
          schedule.weeklyRules ||
          DAYS.map((_, i) => ({ dayOfWeek: i, isWorking: false, windows: [] })),
      });
    }
  }, [schedule]);

  const mutation = useMutation({
    mutationFn: (data) => doctorApi.updateSchedule(type, data),
    onSuccess: () => {
      toast.success(
        `${type === 'PREMIUM' ? 'Premium' : 'Home Visit'} schedule updated successfully`,
      );
      queryClient.invalidateQueries(['doctorSchedule', type]);
    },
    onError: (error) => {
      const msg = error.response?.data?.error?.message || 'Failed to update schedule';
      toast.error(msg);
    },
  });

  const handleSave = () => {
    mutation.mutate(formData);
  };

  if (isLoading || !formData)
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Settings</CardTitle>
          <CardDescription>
            Configure rules for {type === 'PREMIUM' ? 'Premium clinic appointments' : 'Home visits'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Slot Duration (minutes)</Label>
            <Input
              type="number"
              value={formData.slotDurationMin}
              onChange={(e) =>
                setFormData({ ...formData, slotDurationMin: parseInt(e.target.value) || 30 })
              }
              step="5"
              min="10"
              max="120"
              disabled={isExpired}
            />
          </div>
          <div className="space-y-2">
            <Label>Buffer between slots (minutes)</Label>
            <Input
              type="number"
              value={formData.bufferMin}
              onChange={(e) =>
                setFormData({ ...formData, bufferMin: parseInt(e.target.value) || 0 })
              }
              min="0"
              max="60"
              disabled={isExpired}
            />
          </div>
          <div className="space-y-2">
            <Label>Advance Booking (days)</Label>
            <Input
              type="number"
              value={formData.advanceBookingDays}
              onChange={(e) =>
                setFormData({ ...formData, advanceBookingDays: parseInt(e.target.value) || 30 })
              }
              min="1"
              max="90"
              disabled={isExpired}
            />
          </div>
          <div className="space-y-2">
            <Label>Minimum Notice (minutes)</Label>
            <Input
              type="number"
              value={formData.minNoticeMinutes}
              onChange={(e) =>
                setFormData({ ...formData, minNoticeMinutes: parseInt(e.target.value) || 0 })
              }
              min="0"
              disabled={isExpired}
            />
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Working Hours</CardTitle>
          <CardDescription>
            Define your regular working hours. You can add multiple windows (e.g. Morning, Evening)
            per day.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {formData.weeklyRules.map((rule, index) => (
            <div
              key={rule.dayOfWeek}
              className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg bg-card/50"
            >
              <div className="flex items-center gap-3 w-40">
                <Switch
                  checked={rule.isWorking}
                  onCheckedChange={(checked) => {
                    const newRules = [...formData.weeklyRules];
                    newRules[index].isWorking = checked;
                    if (checked && newRules[index].windows.length === 0) {
                      newRules[index].windows.push({ start: '09:00', end: '17:00' });
                    }
                    setFormData({ ...formData, weeklyRules: newRules });
                  }}
                  disabled={isExpired}
                />
                <span className="font-medium">{DAYS[rule.dayOfWeek]}</span>
              </div>

              <div className="flex-1 space-y-3">
                {rule.isWorking ? (
                  <>
                    {rule.windows.map((win, wIndex) => (
                      <div key={wIndex} className="flex items-center gap-3">
                        <Input
                          type="time"
                          value={win.start}
                          onChange={(e) => {
                            const newRules = [...formData.weeklyRules];
                            newRules[index].windows[wIndex].start = e.target.value;
                            setFormData({ ...formData, weeklyRules: newRules });
                          }}
                          className="w-32"
                          disabled={isExpired}
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={win.end}
                          onChange={(e) => {
                            const newRules = [...formData.weeklyRules];
                            newRules[index].windows[wIndex].end = e.target.value;
                            setFormData({ ...formData, weeklyRules: newRules });
                          }}
                          className="w-32"
                          disabled={isExpired}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            const newRules = [...formData.weeklyRules];
                            newRules[index].windows.splice(wIndex, 1);
                            setFormData({ ...formData, weeklyRules: newRules });
                          }}
                          disabled={isExpired}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {rule.windows.length < 4 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newRules = [...formData.weeklyRules];
                          newRules[index].windows.push({ start: '10:00', end: '12:00' });
                          setFormData({ ...formData, weeklyRules: newRules });
                        }}
                        className="text-primary"
                        disabled={isExpired}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Hours
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm flex items-center h-10">
                    Closed
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={mutation.isPending || isExpired} size="lg">
          {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save Schedule
        </Button>
      </div>
    </div>
  );
};

export default ScheduleEditor;
