"use client";

import {Button} from "@/components/ui/button";
import {Loader2, Plus} from "lucide-react";
import {
  AlertDialog, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import EnvManager, {EnvVar} from "@/components/envmanager";
import {useEffect, useState} from "react";
import {toast} from "sonner";
import {useFileSrv} from "@/hooks/useFileSrv";
import {useAccount, useSignMessage} from "wagmi";
import ComboboxComponent from "@/components/combobox";

export default function Dashboard() {
  const [repoUrl, setRepoUrl] = useState("");
  const [branchName, setBranchName] = useState("main");
  const [outputDir, setOutputDir] = useState("dist");
  const [envVars, setEnvVars] = useState<EnvVar[]>([{key: "", value: ""}]);
  const [isOpened, setIsOpened] = useState(false);
  const [branches, setBranches] = useState<{ value: string; label: string; }[]>([]);
  const [disabledBranch, setDisabledBranch] = useState(true);

  const {address} = useAccount()
  const {signMessageAsync} = useSignMessage();
  const {uploadGithub, isMutating: isUploading, data: respUpload} = useFileSrv();

  const clearState = () => {
    setRepoUrl("");
    setBranchName("main");
    setOutputDir("dist");
    setEnvVars([{key: "", value: ""}]);
  }

  const getBranches = async (url: string) => {
    try {
      let owner = url.replace("https://github.com/", "");
      owner = owner.replace(".git", "");
      const apiUrl = `https://api.github.com/repos/${owner}/branches`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      return await response.json();
    } catch (err) {
      console.error("Error fetching branches:", err)
    }
  }

  const handleBlur = async () => {
    if (!repoUrl) {
      return
    }
    try {
      const branches = await getBranches(repoUrl);
      const listBranches: { value: string; label: string; }[] =[];
      if (branches) {
        branches.map((branch: { name: string }) => {
          listBranches.push({label: branch.name, value: branch.name});
        });
        if (listBranches.length > 0) {
          setBranches(listBranches);
          setDisabledBranch(false);
        }
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  }

  // Handle deploy
  const handleDeploy = async () => {
    if (!repoUrl) {
      toast.error("Please enter a valid GitHub repository URL");
      return
    }
    if (!repoUrl.startsWith("https://github.com")) {
      toast.error("Please enter a valid GitHub repository URL");
      return
    }

    try {
      const message = `Deploy ${repoUrl} on branch ${branchName} at ${Date.now()}`;
      const signature = await signMessageAsync({message});
      await uploadGithub({
        url: repoUrl,
        branch: branchName,
        envJson: envVars.length > 1 ? JSON.stringify(envVars) : "",
        outputDir,
        address: address!,
        message,
        signature
      });
    } catch (e) {
      console.error(e);
      toast.dismiss()
      toast.error((e as Error).message);
    }
  };

  useEffect(() => {
    if (!isUploading && respUpload) {
      setIsOpened(false);
      clearState();
      toast.success("Project will be deployed shortly");
    }
  }, [isUploading]);

  return (
    <AlertDialog open={isOpened} onOpenChange={setIsOpened}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary"> <Plus className="w-4 h-4"/> New Project</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="mb-8">New Project</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="flex flex-col space-y-4">
              <div className="grid w-full items-center gap-2">
                <Label className="font-bold">Github Repo</Label>
                <Input id="repo"
                       placeholder="https://github.com/username/repo"
                       value={repoUrl}
                       onChange={(e) => setRepoUrl(e.target.value)}
                       onBlur={handleBlur}
                       onPaste={handleBlur}/>
              </div>
              <div className="grid w-full items-center gap-2">
                <Label className="font-bold">Branch</Label>
                <ComboboxComponent options={branches} onSelect={setBranchName} disabled={disabledBranch}/>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="build-settings">
                  <AccordionTrigger className="font-bold">Build Settings</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col space-y-4">
                      <div className="grid w-full items-center gap-2">
                        <Label className="font-bold">Output Directory</Label>
                        <Input id="repo"
                               placeholder="dist"
                               value={outputDir}
                               onChange={(e) => setOutputDir(e.target.value)}/>
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
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="w-1/3"
                             onClick={() => setEnvVars([{key: "", value: ""}])}>
            Cancel
          </AlertDialogCancel>
          <Button className="w-2/3" onClick={handleDeploy} disabled={isUploading}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Deploy"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}