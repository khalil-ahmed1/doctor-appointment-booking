import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
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

const EmailLogsPage = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const limit = 20;

  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-email-logs', page, status],
    queryFn: () =>
      adminApi.getEmailLogs({
        page,
        limit,
        status: status === 'ALL' ? '' : status,
      }),
  });

  const logs = result?.data || [];
  const meta = result?.meta || { page: 1, total: 0 };
  const totalPages = Math.ceil(meta.total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Logs</h1>
        <p className="text-muted-foreground">Monitor transactional email delivery.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select
          value={status}
          onValueChange={(val) => {
            setStatus(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="SENT">SENT</SelectItem>
            <SelectItem value="FAILED">FAILED</SelectItem>
            <SelectItem value="PENDING">PENDING</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Subject / Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  No email logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm')}
                  </TableCell>
                  <TableCell>{log.to}</TableCell>
                  <TableCell>
                    <div className="font-medium">{log.subject}</div>
                    <div className="text-xs text-muted-foreground">{log.template}</div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-semibold text-xs px-2 py-1 rounded-full ${
                        log.status === 'SENT'
                          ? 'bg-green-100 text-green-800'
                          : log.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {log.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs max-w-xs truncate" title={log.error}>
                    {log.error || '-'}
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

export default EmailLogsPage;
