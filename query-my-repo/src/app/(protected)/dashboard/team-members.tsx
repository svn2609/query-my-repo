'use client'
import useProject from '@/hooks/use-project'
import { api } from '@/trpc/react'
import Image from 'next/image'
import React from 'react'

const TeamMembers = () => {
    const { selectedProjectId} = useProject()
    const { data: members } = api.project.getTeamMembers.useQuery({ projectId: selectedProjectId })
    return (
        <div className='flex items-center gap-2'>
            {members?.map((member) => (
                <img key={member.id} src={member.user.imageUrl ?? '/default-avatar.png'} alt={member.user.firstName || ''} width={30} height={30} className="rounded-full" />
            ))}
        </div>
    )
}

export default TeamMembers