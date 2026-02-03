'use client'

import { Button } from "@/components/ui/button";
import useProject from "@/hooks/use-project";
import useRefetch from "@/hooks/use-refetch";
import { api } from "@/trpc/react";
import { redirect } from "next/dist/server/api-utils";
import { useRouter } from "next/router";
import { toast } from "sonner";

export default function ArchiveButton() {
    const archiveProject = api.project.archiveProject.useMutation();
    const { project, setSelectedProjectId } = useProject();
    const refetch = useRefetch()

    return <Button variant={'destructive'} size='sm' disabled={archiveProject.isPending} onClick={() => {
        const confirmed = window.confirm('Are you sure you want to archive this project?');
        if (!confirmed) return;
        archiveProject.mutate({ projectId: project?.id ?? '' }, {
            onSuccess: () => {
                toast.success('Project archived successfully');
                setSelectedProjectId(''); 
                refetch()
            },
            onError: () => {
                toast.error('Failed to archive project');
            },
        })
    }}>Archive</Button>
}   