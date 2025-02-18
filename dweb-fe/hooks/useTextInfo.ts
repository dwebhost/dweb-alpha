"use client";

import { decodeFunctionResult, encodeFunctionData } from "viem";
import { resolverABI } from "@/lib/abi/resolver";
import { multicallABI } from "@/lib/abi/multical";
import { dnsEncode } from "@/lib/utils";
import { useReadContract } from "wagmi";
import { useState, useEffect, useRef } from "react";

const initialRecords = [
  { label: "avatar", value: "" },
  { label: "url", value: "" },
  { label: "twitter", value: "" },
  { label: "github", value: "" },
  { label: "description", value: "" },
];

export function useTextInfo(
  activeTab: string,
  label: string,
  resolverAddress: `0x${string}`
) {
  // Local state to store final decoded text data
  const [textDecoded, setTextDecoded] = useState(initialRecords);

  // Build the array of calls for multicall
  const callTexts = useRef<`0x${string}`[]>([]);

  useEffect(() => {
    if (activeTab !== "text") {
      callTexts.current = [];
      return;
    }

    // For each record label, encode resolver's text(...) call
    callTexts.current = initialRecords.map((record) =>
      encodeFunctionData({
        abi: resolverABI,
        functionName: "text",
        args: [dnsEncode(label), record.label],
      })
    );
  }, [activeTab, label]);

  // Perform the multicall on the array of "text(...)" calls
  const { data, isSuccess, refetch } = useReadContract({
    address: resolverAddress,
    abi: multicallABI,
    functionName: "multicall",
    args: [callTexts.current],
    query: { enabled: callTexts.current.length > 0 }, // only run if we have calls
  });

  // Once we get 'data', decode each text result and update local state
  useEffect(() => {
    if (isSuccess && data) {
      const results = data as `0x${string}`[];
      if (results.length === initialRecords.length) {
        const decoded = results.map((res, i) => {
          const value = decodeFunctionResult({
            abi: resolverABI,
            functionName: "text",
            data: res,
          }) as string;

          return {
            label: initialRecords[i].label,
            value,
          };
        });

        setTextDecoded(decoded);
      }
    }
  }, [isSuccess, data]);

  return {
    textDecoded,       // your array of { label, value }
    isUpdate: isSuccess,
    refetchText: refetch,
  };
}
