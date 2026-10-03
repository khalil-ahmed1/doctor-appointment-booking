import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '../api/doctor.api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Loader2, CalendarX2, Clock } from 'lucide-react';
import dayjs from 'dayjs';

const ExceptionsEditor = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    dateStr: '',
    kind: 'LEAVE',
    appliesTo: ['NORMAL', 'PREMIUM', 'HOME_VISIT'],
    reason: '',
    windows: [{ start: '10:00', end: '14:00' }],
  });

  const { data: exceptions, isLoading } = useQuery({
    queryKey: ['doctorExceptions'],
    queryFn: doctorApi.getExceptions,
  });

  const addMutation = useMutation({
    mutationFn: doctorApi.addException,
    onSuccess: () => {
      toast.success('Exception added successfully');
      queryClient.invalidateQueries(['doctorExceptions']);
      setFormData({
        ...formData,
        dateStr: '',
        reason: '',
      });
    },
    onError: (error) => {
      const msg = error.response?.data?.error?.message || 'Failed to add exception';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: doctorApi.deleteException,
    onSuccess: () => {
      toast.success('Exception removed');
      queryClient.invalidateQueries(['doctorExceptions']);
    },
    onError: (error) => toast.error('Failed to remove exception'),
  });

  const handleAdd = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (payload.kind === 'LEAVE') {
      delete payload.windows;
    }
    addMutation.mutate(payload);
  };

  const handleTypeToggle = (type) => {
    const newAppliesTo = formData.appliesTo.includes(type)
      ? formData.appliesTo.filter((t) => t !== type)
      : [...formData.appliesTo, type];
    setFormData({ ...formData, appliesTo: newAppliesTo });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Add New Exception Form */}
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle>Add Exception</CardTitle>
          <CardDescription>Block dates for holidays or set custom working hours</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input 
                type="date" 
                required 
                min={dayjs().format('YYYY-MM-DD')}
                value={formData.dateStr} 
                onChange={(e) => setFormData({...formData, dateStr: e.target.value})} 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={formData.kind} 
                onValueChange={(val) => setFormData({...formData, kind: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEAVE">Full Day Leave</SelectItem>
                  <SelectItem value="CUSTOM_HOURS">Custom Working Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-2">
              <Label>Applies to</Label>
              <div className="flex flex-col gap-2">
                {['NORMAL', 'PREMIUM', 'HOME_VISIT'].map((t) => (
                  <div key={t} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`type-${t}`} 
                      checked={formData.appliesTo.includes(t)}
                      onCheckedChange={() => handleTypeToggle(t)}
                    />
                    <label htmlFor={`type-${t}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {t.replace('_', ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {formData.kind === 'CUSTOM_HOURS' && (
              <div className="space-y-3 pt-2 border-t mt-4">
                <Label>Custom Windows</Label>
                {formData.windows.map((win, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input 
                      type="time" 
                      required 
                      value={win.start} 
                      onChange={(e) => {
                        const w = [...formData.windows];
                        w[i].start = e.target.value;
                        setFormData({...formData, windows: w});
                      }} 
                    />
                    <span>to</span>
                    <Input 
                      type="time" 
                      required 
                      value={win.end} 
                      onChange={(e) => {
                        const w = [...formData.windows];
                        w[i].end = e.target.value;
                        setFormData({...formData, windows: w});
                      }} 
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive shrink-0"
                      onClick={() => {
                        const w = [...formData.windows];
                        w.splice(i, 1);
                        setFormData({...formData, windows: w});
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {formData.windows.length < 4 && (
                   <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-primary"
                    onClick={() => {
                      setFormData({...formData, windows: [...formData.windows, { start: '10:00', end: '12:00' }]});
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Window
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Label>Reason (Optional)</Label>
              <Input 
                value={formData.reason} 
                onChange={(e) => setFormData({...formData, reason: e.target.value})} 
                placeholder="e.g., Diwali, Sick Leave" 
              />
            </div>

            <Button type="submit" className="w-full" disabled={addMutation.isPending || formData.appliesTo.length === 0}>
              {addMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Exception
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List of Upcoming Exceptions */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Upcoming Exceptions</CardTitle>
          <CardDescription>Your planned leaves and custom hours</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : !exceptions || exceptions.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg bg-card/30">
              <CalendarX2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              No upcoming exceptions found
            </div>
          ) : (
            <div className="space-y-4">
              {exceptions.map((exc) => (
                <div key={exc._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-card/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">{dayjs(exc.dateStr).format('MMM D, YYYY')}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${exc.kind === 'LEAVE' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                        {exc.kind.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Applies to: {exc.appliesTo.join(', ')}
                    </div>
                    {exc.kind === 'CUSTOM_HOURS' && exc.windows && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {exc.windows.map((w, i) => (
                          <div key={i} className="flex items-center text-xs bg-secondary/50 px-2 py-1 rounded">
                            <Clock className="w-3 h-3 mr-1" />
                            {w.start} - {w.end}
                          </div>
                        ))}
                      </div>
                    )}
                    {exc.reason && <div className="text-sm mt-1 italic opacity-80">"{exc.reason}"</div>}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => deleteMutation.mutate(exc._id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExceptionsEditor;
