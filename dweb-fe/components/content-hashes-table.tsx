"use client";

import {useEffect, useState} from 'react';
import {Input} from '@/components/ui/input';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Skeleton} from '@/components/ui/skeleton';
import {format} from 'date-fns';
import {PINNING_SERVICE_URL, useContentHashes} from "@/hooks/useStats";
import TablePagination from "@/components/table-pagination";
import {StatusBadge} from "@/components/status-badge";
import {namehash} from "viem";

type ContentHashType = {
  id: string;
  node: string;
  ensName: string;
  hash: string;
  cid: string;
  status: string;
  retry: number;
  updatedAt: string;
}

export default function ContentHashTable() {
  const [searchResults, setSearchResults] = useState<ContentHashType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const {
    contentHashes,
    totalPages,
    page,
    setPage,
    isLoading,
  } = useContentHashes();

  const [search, setSearch] = useState('');
  const merged = [...contentHashes, ...searchResults].filter((item: ContentHashType) =>
    item.ensName.toLowerCase().includes(search.toLowerCase())
  );

  const uniqueItemsMap = new Map<string, ContentHashType>();
  merged.forEach((item) => {
    uniqueItemsMap.set(item.id.toString(), item); // or item.node or `${item.node}-${item.hash}`
  });
  const filtered = Array.from(uniqueItemsMap.values());

  const fetchEnsName = async (ensName: string) => {
    const response = await fetch(`${PINNING_SERVICE_URL}/pinning/contenthash?node=${namehash(ensName)}`);
    return await response.json();
  }

  useEffect(() => {
    const fetchIfEth = async () => {
      if (search.endsWith('.eth')) {
        setIsSearching(true);
        try {
          const res = await fetchEnsName(search);
          if (res?.items?.length > 0) {
            setSearchResults(res.items);
          } else {
            setSearchResults([]);
          }
        } catch (err) {
          console.error("Failed to fetch ENS name:", err);
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    };

    fetchIfEth().catch(console.error);
  }, [search]);

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
              <TableHead>ENS Name</TableHead>
              <TableHead>CID</TableHead>
              <TableHead>Status</TableHead>
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
              filtered.map((item: ContentHashType) => (
                <TableRow key={item.id}>
                  <TableCell
                    className="truncate max-w-[250px]">{item.ensName !== '' ? item.ensName : item.node}</TableCell>
                  <TableCell>{item.cid}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status}/>
                  </TableCell>
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

      {!isSearching && (
      <div className="flex justify-center">
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </div>)}
    </div>
  );
}