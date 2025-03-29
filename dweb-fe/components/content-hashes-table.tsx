"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {useContentHashes} from "@/hooks/useStats";
import TablePagination from "@/components/table-pagination";

export default function ContentHashTable() {
  const {
    contentHashes,
    totalPages,
    page,
    setPage,
    isLoading,
  } = useContentHashes();

  const [search, setSearch] = useState('');
  const filtered = contentHashes.filter((item: { node: string; id: string; hash: string; status: string; retry: number; updatedAt: string }) =>
    item.node.toLowerCase().includes(search.toLowerCase())
  );

  console.log('filtered', filtered);
  console.log('totalPages', totalPages);
  console.log('page', page);

  return (
    <div className="space-y-2 rounded-xl md:mt-16 mt-4">
      <h2 className="text-2xl font-bold">ENS Indexing</h2>
      <div className="flex justify-end">
        <Input
          type="text"
          placeholder="Search ENS name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm text-right"
        />
      </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ENS Node</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Retry</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="w-full h-10"/>
                  </TableCell>
                </TableRow>
              ) : filtered.length > 0 ? (
                filtered.map((item: {
                  node: string;
                  id: string;
                  hash: string;
                  status: string;
                  retry: number;
                  updatedAt: string
                }) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.node}</TableCell>
                    <TableCell className="truncate max-w-[200px]">{item.hash}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.retry}</TableCell>
                    <TableCell>{format(new Date(item.updatedAt), 'PPpp')}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No content hashes found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-center">
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      </div>
      );
      }