import React from 'react'
import IssuesList from './issues-list'

type Props = {
    params: Promise<{ meetingId: string }>
}

const MeetingPage = async (props: Props) => {
    const { meetingId } = await props.params
    return (
        <IssuesList meetingId = {meetingId}/>
    )
}

export default MeetingPage