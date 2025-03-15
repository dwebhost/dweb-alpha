"use client";

import {fileSrvUrl} from "@/hooks/useFileSrv";
import {useEffect, useState} from "react";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {CircleCheck, CircleDotDashed, Github, GitMerge, Plus} from "lucide-react";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import EnvManager, {EnvVar} from "@/components/envmanager";
import {useAccount} from "wagmi";
import {Input} from "@/components/ui/input";
import {AddEnsDialog} from "@/components/add-ens-dialog";

type ProjectInfo = {
  githubUrl: string;
  githubBranch: string;
  address: string;
  ensName?: string;
  envJson?: string;
}

type Deployment = {
  commitHash?: string;
  ipfsCid?: string;
  status: string;
  deployedAt: string;
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat("en", {numeric: "auto"});

  const intervals: { [key: string]: number } = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, seconds] of Object.entries(intervals)) {
    const diff = Math.floor(diffInSeconds / seconds);
    if (diff >= 1) {
      return rtf.format(-diff, unit as Intl.RelativeTimeFormatUnit);
    }
  }

  return "Just now";
}

export default function ProjectDetails({projectId}: { projectId: string }) {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [envVars, setEnvVars] = useState<EnvVar[]>([{key: "", value: ""}]);
  const [rootDir, setRootDir] = useState("./");

  const {isConnected} = useAccount();

  const getProject = async (projectId: string) => {
    try {
      const apiUrl = `${fileSrvUrl}/files/project/${projectId}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      return await response.json();
    } catch (err) {
      console.error("Error fetching project:", err)
    }
  }

  useEffect(() => {
    if (isConnected && projectId) {
      getProject(projectId).then((data) => {
        const projectInfo: ProjectInfo = {
          githubUrl: data.githubUrl,
          githubBranch: data.githubBranch,
          address: data.address,
          ensName: data.ensName,
          envJson: data.environment?.jsonText,
        };
        const deployment: Deployment = {
          commitHash: data.deployments[0].commitHash,
          ipfsCid: data.deployments[0].ipfsCid,
          status: data.deployments[0].status,
          deployedAt: data.deployments[0].createdAt,
        }
        const envVars: EnvVar[] = projectInfo.envJson ? JSON.parse(projectInfo.envJson) : [{key: "", value: ""}];

        setProjectInfo(projectInfo);
        setDeployment(deployment);
        setEnvVars(envVars);
      });
    }
  }, [isConnected, projectId]);

  if (!projectInfo || !deployment) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col w-full space-y-8 md:px-24">
      <div className="flex flex-col space-y-8 md:max-w-2xl md:mx-auto">
        <div className="mb-10">
          <Label className="font-bold text-3xl">{projectInfo.githubUrl.split("/").pop()}</Label>
        </div>
        <div className="flex flex-row md:space-x-20 space-x-5">
          <div className={"flex flex-col space-y-2"}>
            <Label className="font-semibold">Status</Label>
            {deployment.status === "completed" ?
              <div className="flex items-center gap-2">
                <CircleCheck className="w-4 h-4"/> <span>{deployment.status}</span>
              </div> :
              <div className="flex items-center gap-2">
                <CircleDotDashed className="w-4 h-4"/> <span>{deployment.status}</span>
              </div>
            }
          </div>
          <div className={"flex flex-col space-y-2"}>
            <Label className="font-semibold">Deployed At</Label>
            <p>{timeAgo(deployment.deployedAt)}</p>
          </div>
          <div className={"flex flex-col space-y-2"}>
            <Label className="font-semibold">Deployed By</Label>
            <p>{shortenAddress(projectInfo.address)}</p>
          </div>
        </div>
        <div className="flex flex-col space-y-4">
          <Label className="font-semibold">IPFS CID</Label>
          {deployment.ipfsCid ? (
            <Input id="ipfs_cid" disabled={true} value={deployment.ipfsCid}/>
          ) : (
            <Button variant="secondary">Claim ENS</Button>
          )}
        </div>
        <div className="flex flex-col space-y-4">
          <Label className="font-semibold">Ens Domain</Label>
          {projectInfo.ensName ? (
            <p>{projectInfo.ensName}</p>
          ) : (
            <AddEnsDialog ipfsCid={deployment.ipfsCid} address={projectInfo.address}/>
          )}
        </div>
        <div className="flex flex-col space-y-4">
          <Label className="font-semibold">Source</Label>
          <div>
            <Button
              variant="secondary"
              className="mr-2 flex items-center gap-2"
              onClick={() => window.open(projectInfo.githubUrl, "_blank")}
            >
              <Github className="w-4 h-4"/> {projectInfo.githubUrl.replace("https://github.com/", "")}
            </Button>
            <div className="flex items-center gap-2">
              <GitMerge className="w-4 h-4"/>
              <p className="italic">{projectInfo.githubBranch}</p>
            </div>
          </div>
        </div>
      </div>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="build-settings">
          <AccordionTrigger className="font-bold">Build Settings</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col space-y-4">
              <div className="grid w-full items-center gap-2">
                <Label className="font-bold">Root Directory</Label>
                <Input id="root_dir" value={rootDir} onChange={e => setRootDir(e.target.value)}/>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="envrionment-variables">
          <AccordionTrigger className="font-bold">Environment Variables</AccordionTrigger>
          <AccordionContent>
            <EnvManager envVars={envVars} setEnvVars={setEnvVars}/>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}