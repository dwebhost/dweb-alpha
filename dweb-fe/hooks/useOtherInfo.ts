"use client";

import {decodeFunctionResult, encodeFunctionData, hexToString} from "viem";
import { resolverABI } from "@/lib/abi/resolver";
import { dnsEncode } from "@/lib/utils";
import { useReadContract } from "wagmi";
import { useEffect, useRef, useState } from "react";
import { multicallABI } from "@/lib/abi/multical";

export function useOtherInfo(activeTab: string, label: string, resolverAddress: `0x${string}`) {
  const [dataDecoded, setDataDecoded] = useState(["", ""]);
  const callOther = useRef<`0x${string}`[]>([]);

  useEffect(() => {
    if (activeTab !== "other") {
      callOther.current = [];
      return;
    }

    callOther.current = [
      encodeFunctionData({ abi: resolverABI, functionName: "contenthash", args: [dnsEncode(label)] }),
      encodeFunctionData({ abi: resolverABI, functionName: "getData", args: [dnsEncode(label), "abi"] }),
    ];
  }, [activeTab, label]);

  const { data, isSuccess, refetch } = useReadContract({
    address: resolverAddress,
    abi: multicallABI,
    functionName: "multicall",
    args: [callOther.current],
    query: { enabled: callOther.current.length > 0 },
  });

  useEffect(() => {
    if (isSuccess && data) {
      const results = data as `0x${string}`[];
      if (results.length >= 2) {
        const hexContentHash = decodeFunctionResult({
          abi: resolverABI,
          functionName: "contenthash",
          data: results[0]
        }) as `0x${string}`;
        const contentHash = hexToString(hexContentHash);
        const hexABI = decodeFunctionResult({
          abi: resolverABI,
          functionName: "getData",
          data: results[1]
        }) as `0x${string}`;
        const abi = hexToString(hexABI);

        setDataDecoded([
          contentHash,
          abi,
        ]);
      }
    }
  }, [isSuccess, data]);

  return { dataDecoded, isUpdate: isSuccess, refetchOther: refetch };
}