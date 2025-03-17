import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {concat, toHex} from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function dnsEncode(label: string) {
  const prefix = toHex(label.length, { size: 1 });
  const text = toHex(label);
  const suffix = toHex(0, { size: 1 }); // 1-byte hex encoding
  return  concat([prefix, text, suffix]);
}

export function resolverUrl(ensName: string, isTest: boolean = true) {
  const ensWithoutEth = ensName.endsWith(".eth") ? ensName.slice(0, -4) : ensName;
  let url = `https://${ensWithoutEth}.istest.eth.limo`
  if (!isTest) {
    url = `https://${ensWithoutEth}.eth.limo`
  }
  return url;
}