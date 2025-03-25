import useSWR from 'swr';

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