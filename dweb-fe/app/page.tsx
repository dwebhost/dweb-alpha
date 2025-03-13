"use client";

import {useEffect, useState} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {useFileSrv} from "@/hooks/useFileSrv";
import {toast} from "sonner";
import {BaseError, useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract} from "wagmi";
import {ConnectButton} from "@rainbow-me/rainbowkit";
import {useDeploySrv} from "@/hooks/useDeploySrv";
import ComboboxComponent from "@/components/combobox";
import {ENS_REGISTRY_ABI, ENS_RESOLVER_ABI} from "@/lib/abi";
import {namehash} from "viem";
import {encode} from "@ensdomains/content-hash";
import {Loader2} from "lucide-react";
import {Textarea} from "@/components/ui/textarea";

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [uploadId, setUploadId] = useState("");
  const [deployed, setDeployed] = useState(false);
  const [deployedFailed, setDeployedFailed] = useState(false);
  const [ensName, setEnsName] = useState<{ value: string; label: string; }[]>([]);
  const [selectedEnsName, setSelectedEnsName] = useState<string | null>(null);

  // hooks
  const {address, isConnected} = useAccount()
  const {uploadGithub, isMutating: isUploading, data: respUpload, clearFilesCache} = useFileSrv();
  const {deploy, useDeployStatus, clearDeployCache} = useDeploySrv();
  const {data: statusResp} = useDeployStatus(uploadId);
  const {data: hash, error, writeContract} = useWriteContract();
  const {isLoading: isConfirming, isSuccess: isConfirmed} =
    useWaitForTransactionReceipt({
      hash,
    })
  const ENS_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_ENS_REGISTRY_ADDRESS || "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e") as `0x${string}`;
  const {data: resolver} = useReadContract({
    address: ENS_REGISTRY_ADDRESS,
    abi: ENS_REGISTRY_ABI,
    functionName: 'resolver',
    args: [namehash(selectedEnsName!)],
    query: {
      enabled: !!selectedEnsName,
    }
  });

  // functions
  const fetchData = async () => {
    try {
      const res = await fetch(`/api/ens?owner=${address?.toLowerCase()}`)
      const data = await res.json()

      const unwrappedOwner = data.domains || [];
      const wrappedOwner = data.nameWrappeds || [];

      const fetchedDomains = [...unwrappedOwner, ...wrappedOwner];

      console.log('Fetched domains:', fetchedDomains);

      // Convert the data to the shape needed by DomainList
      const mapped = fetchedDomains
        .filter((d : { expiryDate: string; name: string; }) => {
          return d.name.toLowerCase().endsWith(".eth") && !d.name.toLowerCase().startsWith("[");
        })
        .map((d: { expiryDate: string; name: string; }) => {
        return {
          value: d.name,
          label: d.name,
        };
      })

      console.log("mapped", mapped);

      setEnsName(mapped);
    } catch (err) {
      console.error("Error fetching ENS:", err)
      toast.error("Failed to fetch ENS domains.")
    }
  }

  const formatCidToContenthash = (cid: string) => `0x${encode("ipfs", cid)}`;


  // actions
  const handleUpload = async () => {
    if (!repoUrl) {
      toast.error("Please enter a valid GitHub repository URL");
      return
    }
    if (!repoUrl.startsWith("https://github.com")) {
      toast.error("Please enter a valid GitHub repository URL");
      return
    }

    try {
      await uploadGithub({url: repoUrl});
    } catch (e) {
        console.error(e);
        toast.dismiss()
        toast.error((e as Error).message);
    }
  }

  const handleSelection = (value: string) => {
    setSelectedEnsName(value);
  };

  const publishWeb = async () => {
    if (!statusResp || !selectedEnsName || !isConnected) return;
    try {
      writeContract({
        address: resolver as `0x${string}`,
        abi: ENS_RESOLVER_ABI,
        functionName: 'setContenthash',
        args: [namehash(selectedEnsName), formatCidToContenthash(statusResp.ipfsCid)],
      })
    } catch (error) {
      console.error("ENS update failed", error);
    }
  };

  const retryDeployment = () => {
    if (!uploadId) return;
    setDeployed(false);
    setDeployedFailed(false);
    deploy({uploadId}).catch(console.error);
  }

  useEffect(() => {
    if (isConnected && address) {
      fetchData().catch(console.error);
    } else {
      setRepoUrl("");
      setUploadId("");
      setDeployed(false);
      setDeployedFailed(false);
      setSelectedEnsName(null);

      clearFilesCache().then(() => {
        clearDeployCache().then(() => {
          setEnsName([]);
        });
      }).catch(console.error);
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (!isUploading && respUpload && repoUrl) {
      setUploadId(respUpload.id);
    }
    if (statusResp) {
      console.log("statusResp", statusResp);
      if (statusResp.status === "failed") {
        setDeployedFailed(true);
      }
      if (statusResp.status === "completed") {
        setDeployed(true);
      }
    }
  }, [isUploading, statusResp]);

  useEffect(() => {
    if (error) {
      toast.dismiss();
      toast.error("ENS update failed", {
        description: (error as BaseError).shortMessage || error.message
      })
      console.error("ENS update failed", error);
    }
    if (isConfirming) {
      toast.loading("Confirming transaction", {
        description: "Please wait while the transaction is being confirmed",
      });
    }
    if (isConfirmed) {
      toast.dismiss();
      toast.success("ENS updated successfully", {
        description: `Transaction Hash: ${hash}`,
      });
    }
  }, [error, isConfirmed, isConfirming]);

  return (
    <main className="flex flex-col items-center max-w-screen-xl pt-14 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Deploy your Decentralize Website via dWeb</CardTitle>
          <CardDescription>Enter the URL of your GitHub repository to deploy with dWeb</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="github-url">GitHub Repository URL</Label>
              <Input
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                }}
                placeholder="https://github.com/username/repo"
                value={repoUrl}
                disabled={!isConnected}
              />
            </div>
            {isConnected ?
              <Button onClick={handleUpload} disabled={uploadId !== "" || isUploading} className="w-full">
                {uploadId ? `Deploy (${uploadId})` : isUploading ? "Deploying..." : "Deploy"}
              </Button> :
              <ConnectButton.Custom>
                {({openConnectModal}) => (
                  <Button
                    onClick={openConnectModal}
                    className="mt-2 w-full"
                  >
                    Connect Wallet
                  </Button>
                )}
              </ConnectButton.Custom>
            }
          </div>
        </CardContent>
      </Card>
      {uploadId && isConnected && <Card className="w-full max-w-md mt-8">
          <CardHeader>
              <CardTitle className="text-xl">Deployment Status</CardTitle>
              {deployed ? <CardDescription>Your website is successfully deployed to IPFS!</CardDescription> : <CardDescription>Deploying your website...to IPFS</CardDescription>}
          </CardHeader>
        {deployed ?
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="ipfs-cid">CID</Label>
              <Input id="ipfs-cid" readOnly type="url" value={statusResp.ipfsCid} />
            </div>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="ipfs-cid">ENS</Label>
                <ComboboxComponent options={ensName} onSelect={handleSelection} disabled={!deployed} />
              </div>
              {isConfirmed ?
                <Button className="w-full" variant="outline">
                  <a href={`https://${selectedEnsName?.split('.')[0]}.istest.eth.limo`} target="_blank">
                    Visit Website
                  </a>
                </Button> :
                <Button className="w-full" onClick={publishWeb} disabled={isConfirmed}>
                  {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Publish Website"}
                </Button>
              }
            </div>
          </CardContent> : deployedFailed ?
          <CardContent>
            <div className="flex flex-col justify-center">
              <Label className="text-red-500 my-4">Deployment failed. Please try again.</Label>
              <Textarea
                value={statusResp?.error}
                readOnly
                className="bg-black text-green-400 font-mono text-sm border border-gray-700 p-2 resize-none h-40 overflow-auto"
              />
              <Button className="w-full mt-4" onClick={retryDeployment}>
                Try Again
              </Button>
            </div>
          </CardContent> :
            <CardContent>
            <div className="flex justify-center">
              <Loader2 className="h-24 w-24 animate-spin"/>
            </div>
          </CardContent>
        }
      </Card>}
    </main>
  );
}
