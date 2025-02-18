"use client";

import { encodeFunctionData } from "viem";
import { resolverABI } from "@/lib/abi/resolver";
import { dnsEncode } from "@/lib/utils";
import { useReadContract } from "wagmi";
import { useEffect, useRef, useState } from "react";

export function useAddressInfo(activeTab: string, label: string, resolverAddress: `0x${string}`) {
  const [addr, setAddr] = useState<string>("");
  const callAddr = useRef<`0x${string}`>("0x");

  useEffect(() => {
    if (activeTab !== "address") {
      callAddr.current = "0x";
      return;
    }

    callAddr.current = encodeFunctionData({
      abi: resolverABI,
      functionName: "addr",
      args: [dnsEncode(label)],
    });
  }, [activeTab, label]);

  const { data, isSuccess, refetch } = useReadContract({
    address: resolverAddress,
    abi: resolverABI,
    functionName: "addr",
    args: [dnsEncode(label)],
    query: { enabled: activeTab === "address" },
  });

  useEffect(() => {
    if (isSuccess && data) {
      const tempData = data as `0x${string}`;
      setAddr(tempData);
    }
  }, [isSuccess, data]);

  return { addr, hasAddr: isSuccess, refetchAddress: refetch };
}