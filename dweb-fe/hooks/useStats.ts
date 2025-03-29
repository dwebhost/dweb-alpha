"use client";

import useSWR from 'swr';
import {useState} from "react";

const PINNING_SERVICE_URL = process.env.NEXT_PUBLIC_PINNING_SERVICE_URL || 'http://localhost:5300';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useStats() {
  const { data, error, isLoading } = useSWR(`${PINNING_SERVICE_URL}/pinning/statistics`, fetcher, {
    refreshInterval: 10000, // 10 seconds
  });

  return {
    data,
    error,
    isLoading,
  };
}

const contentHashFetcher = (url: string) => fetch(url).then((res) => res.json());

export function useContentHashes(defaultLimit = 10) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);

  const {data, error, isLoading, mutate} = useSWR(
    `${PINNING_SERVICE_URL}/pinning/contenthashes?page=${page}&limit=${limit}`,
    contentHashFetcher,
    {
      refreshInterval: 10000, // Auto refresh every 10s
    }
  );

  return {
    contentHashes: data?.items || [],
    totalPages: data?.totalPages || 1,
    page,
    setPage,
    limit,
    setLimit,
    isLoading,
    error,
    refresh: mutate,
  };
}