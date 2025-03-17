"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function NotConnected() {
  return (
    <div className="flex flex-col items-center justify-center text-white md:pt-36">
      <Card className="max-w-md text-center bg-gray-800 border border-gray-700 shadow-lg">
        <CardHeader>
          <Wallet className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
          <CardDescription className="text-gray-400">
            To use this dApp, you need to connect your wallet. This allows you to interact with Web3 features securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <Button onClick={openConnectModal} className="w-full">
                Connect Wallet
              </Button>
            )}
          </ConnectButton.Custom>
          <p className="text-xs text-gray-500 mt-3">
            Don't have a wallet? Get one using <a href="https://metamask.io" target="_blank" className="text-blue-400 hover:underline">MetaMask</a> or <a href="https://rainbow.me" target="_blank" className="text-blue-400 hover:underline">Rainbow</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}