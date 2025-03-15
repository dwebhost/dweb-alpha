import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Github, GitMerge} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useRouter} from "next/navigation";

export interface Project {
  id: string;
  projectName: string;
  githubRepo: string;
  branch: string;
  status: string;
  commitHash: string;
}

type ProjectProps = {
  projects: Project[];
}
export default function ProjectList(props: ProjectProps) {
  const {projects} = props;
  const router = useRouter();

  if (!projects || !projects.length) {
    return (
      <div className="flex items-center justify-center h-30">
        <p className="text-muted-foreground">No deployments found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {projects.map((project, index) => (
        <Card key={index} className="w-full min-w-1/2 hover:border-blue-100 cursor-pointer" onClick={() => router.push(`/${project.id}`)}>
          <CardHeader>
            <CardTitle>{project.projectName.split("/").pop()}</CardTitle>
            <CardDescription>{project.status}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="mr-2 flex items-center gap-2"
              onClick={() => window.open(project.githubRepo, "_blank")}
            >
              <Github className="w-4 h-4"/> {project.projectName}
            </Button>
            <div className="flex items-center gap-2 mt-4">
              <GitMerge className="w-4 h-4"/>
              <p className="italic">{project.branch}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}