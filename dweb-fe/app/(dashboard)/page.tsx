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
import {useAccount} from "wagmi";

export default function Dashboard() {
  const [repoUrl, setRepoUrl] = useState("");
  const [branchName, setBranchName] = useState("main");
  const [rootDir, setRootDir] = useState("./");
  const [envVars, setEnvVars] = useState<EnvVar[]>([{key: "", value: ""}]);
  const [isOpened, setIsOpened] = useState(false);

  const {address} = useAccount()
  const {uploadGithub, isMutating: isUploading, data: respUpload} = useFileSrv();

  const clearState = () => {
    setRepoUrl("");
    setBranchName("main");
    setRootDir("./");
    setEnvVars([{key: "", value: ""}]);
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
      await uploadGithub({
        url: repoUrl,
        branch: branchName,
        envJson: envVars.length > 1 ? JSON.stringify(envVars) : "",
        address: address!
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
                       onChange={(e) => setRepoUrl(e.target.value)}/>
              </div>
              <div className="grid w-full items-center gap-2">
                <Label className="font-bold">Branch</Label>
                <Input id="branch"
                       placeholder="main"
                       value={branchName}
                       onChange={(e) => setBranchName(e.target.value)}/>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="build-settings">
                  <AccordionTrigger className="font-bold">Build Settings</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col space-y-4">
                      <div className="grid w-full items-center gap-2">
                        <Label className="font-bold">Root Directory</Label>
                        <Input id="repo"
                               placeholder="./"
                               value={rootDir}
                               onChange={(e) => setRootDir(e.target.value)}/>
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
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> :"Deploy"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}