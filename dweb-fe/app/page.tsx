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

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/hkirat/react-boilerplate");
  const [uploadId, setUploadId] = useState("");
  const [deployed, setDeployed] = useState(false);
  const [ensName, setEnsName] = useState([]);
  const [selectedEnsName, setSelectedEnsName] = useState<string | null>(null);

  // hooks
  const {address, isConnected} = useAccount()
  const {uploadGithub, isMutating: isUploading, data: respUpload} = useFileSrv();
  const {useDeployStatus} = useDeploySrv();
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

      const fetchedDomains = data.domains || []

      console.log('Fetched domains:', fetchedDomains);

      // Convert the data to the shape needed by DomainList
      const mapped = fetchedDomains.map((d: { expiryDate: string; name: string; }) => {
        return {
          value: d.name,
          label: d.name,
        };
      })
      mapped.push({value: "ez42.eth", label: "ez42.eth"})

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

  useEffect(() => {
    if (isConnected) {
      fetchData().catch(console.error);
    }
  }, [isConnected]);

  useEffect(() => {
    if (respUpload) {
      setUploadId(respUpload.id);
    }
    if (statusResp && statusResp.status ==="completed") {
      setDeployed(true);
    }
  }, [respUpload, statusResp]);

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
          <CardTitle className="text-xl">Deploy your Website via dWeb</CardTitle>
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
              />
            </div>
            {isConnected ?
              <Button onClick={handleUpload} disabled={uploadId !== "" || isUploading} className="w-full">
                {uploadId ? `Deploying (${uploadId})` : isUploading ? "Uploading..." : "Upload"}
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
      {uploadId && <Card className="w-full max-w-md mt-8">
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
              <Button className="w-full" onClick={publishWeb}>Publish Website</Button>
            </div>
          </CardContent> :
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="deployed-url">Deploy....</Label>
              <Input id="deployed-url" readOnly type="url" value={`http://${uploadId}.dev.100xdevs.com:3001/index.html`} />
            </div>
            <br />
            <Button className="w-full" variant="outline">
              <a href={`http://${uploadId}.10kdevs.com/index.html`} target="_blank">
                Visit Website
              </a>
            </Button>
          </CardContent>
        }
      </Card>}
    </main>
  );
}
