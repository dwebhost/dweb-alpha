"use client";

import {fileSrvUrl} from "@/hooks/useFileSrv";
import {useAccount} from "wagmi";
import {useEffect, useState} from "react";
import ProjectList, {Project} from "@/components/project";

export default function Deployments() {
  const [projects, setProjects] = useState<Project[]>([]);

  const {address} = useAccount();
  const getAllProjects = async (address: string) => {
    try {
      const apiUrl = `${fileSrvUrl}/files/upload/github/address/${address}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      return await response.json();
    } catch (err) {
      console.error("Error fetching all projects:", err)
    }
  }

  useEffect(() => {
    if (address) {
      getAllProjects(address).then((data) => {
        if (data) {
          const projects = data.map((d: {
            id: string;
            githubUrl: string;
            githubBranch: string;
            deployments: { commitHash: string; status: string }[]
          }) => {
            return {
              id: d.id,
              projectName: d.githubUrl.replace("https://github.com/", ""),
              githubRepo: d.githubUrl,
              branch: d.githubBranch,
              status: d.deployments[0].status,
              commitHash: d.deployments[0].commitHash
            }
          });
          setProjects(projects);
        }
      });
    }
  }, [address]);

  return (
    <div className="flex flex-col w-full">
      <h1 className="text-3xl font-semibold mb-10">Deployments</h1>
      <ProjectList projects={projects}/>
    </div>
  );
}