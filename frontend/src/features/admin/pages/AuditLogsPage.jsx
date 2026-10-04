import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AuditLogsPage = () => {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('ALL');
  const [action, setAction] = useState('');
  const limit = 20;

  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, entityType, action],
    queryFn: () =>
      adminApi.getAuditLogs({
        page,
        limit,
        entityType: entityType === 'ALL' ? '' : entityType,
        action,
      }),
  });

  const logs = result?.data || [];
  const meta = result?.meta || { page: 1, total: 0 };
  const totalPages = Math.ceil(meta.total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">View system activity and admin actions.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select
          value={entityType}
          onValueChange={(val) => {
            setEntityType(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Entities</SelectItem>
            <SelectItem value="Appointment">Appointment</SelectItem>
            <SelectItem value="Payment">Payment</SelectItem>
            <SelectItem value="DoctorProfile">DoctorProfile</SelectItem>
            <SelectItem value="User">User</SelectItem>
            <SelectItem value="Subscription">Subscription</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Filter by action (e.g. UPDATE, CANCEL)"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="w-full max-w-sm"
        />
      </div>

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.at || log.createdAt), 'dd MMM yyyy, HH:mm')}
                  </TableCell>
                  <TableCell>
                    {log.actor?.name || log.actorRole}
                    <div className="text-xs text-muted-foreground">{log.actorRole}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-xs bg-slate-100 px-2 py-1 rounded">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell className="text-xs font-mono">{log.entityId}</TableCell>
                  <TableCell className="max-w-xs truncate" title={log.note}>
                    {log.note || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
