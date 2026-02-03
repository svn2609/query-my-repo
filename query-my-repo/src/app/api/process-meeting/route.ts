import { processMeeting } from "@/lib/assembly";
import { generateEmbedding } from "@/lib/gemini";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import pLimit from "p-limit";
import { z } from "zod";

export const maxDuration = 300; // 5 minutes

const bodyParser = z.object({
    meetingUrl: z.string(),
    projectId: z.string(),
    meetingId: z.string()
})

export async function POST(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json();
        const { meetingUrl, projectId, meetingId } = bodyParser.parse(body);
        
        // get the transcript and summaries
        const { summaries } = await processMeeting(meetingUrl);

        await db.issue.createMany({
            data: summaries.map((summary) => ({
                start: summary.start,
                end: summary.end,
                gist: summary.gist,
                headline: summary.headline,
                summary: summary.summary,
                meetingId,
            })),
        });
        await db.meeting.update({
            where: { id: meetingId },
            data: {
                status: "COMPLETED",
                name: summaries[0]?.headline || "Untitled Meeting"
            },
        });
        return NextResponse.json({ meetingId }, { status: 200 })
    } 
    catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 })
        }

        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}