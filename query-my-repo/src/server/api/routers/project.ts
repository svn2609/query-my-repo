import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { pollCommits } from "@/lib/github";
import { indexGithubRepo } from "@/lib/github-loader";

export const projectRouter = createTRPCRouter ({
  
    createProject: protectedProcedure
    .input(z.object({
        name: z.string(),
        githubUrl: z.string(),
        githubToken: z.string().optional()
    }))
    .mutation(async({ctx,input}) => {
        const project = await ctx.db.project.create({
            data: {
                gitHubUrl: input.githubUrl,
                name: input.name,
                userToProjects: {
                    create: {
                        userId: ctx.user.userId!,
                    }
                }
            }
        })
        await indexGithubRepo(project.id, input.githubUrl, input.githubToken)
        await pollCommits(project.id);
        return project;
    }),

    getProjects: protectedProcedure
    .query(async ({ctx}) => {
        return await ctx.db.project.findMany({
            where: {
                userToProjects: {
                    some: {
                        userId: ctx.user.userId!
                    }
                },
                deletedAt: null
            }
        })
    }),

    getCommits: protectedProcedure.input(
        z.object({
          selectedProjectId: z.string(),
        })
      ).query(async ({ ctx, input }) => {
        pollCommits(input.selectedProjectId).then().catch(console.error)
        return await ctx.db.commit.findMany({
          where: {
            projectId: input.selectedProjectId,
          },
        });
      }),

      saveAnswer: protectedProcedure
      .input(z.object({ 
        projectId: z.string(), 
        question: z.string().min(1), 
        answer: z.string().min(1), 
        filesReferenced: z.array(z.object({ fileName: z.string().min(1), sourceCode: z.string().min(1) })).optional() }))
      .mutation(async ({ ctx, input }) => {
          await ctx.db.question.create({
              data: {
                  question: input.question,
                  answer: input.answer,
                  projectId: input.projectId,
                  userId: ctx.user.userId!,
                  filesReferenced: input.filesReferenced
              }
          })
      }),

      getQuestions: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
          return await ctx.db.question.findMany({ 
            where: { projectId: input.projectId }, 
            include: { user: true }, 
            orderBy: { createdAt: 'desc' } })
      }),

      uploadMeeting: protectedProcedure.input(z.object({ 
            projectId: z.string(), 
            audio_url: z.string(), 
            name: z.string() })).mutation(async ({ ctx, input }) => {
        const meeting = await ctx.db.meeting.create({
          data: {
            projectId: input.projectId,
            meetingUrl: input.audio_url,
            name: input.name,
            status: "PROCESSING"
          },
        });
        return meeting;
      }),

      getMeetings: protectedProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
        return await ctx.db.meeting.findMany({
          where: { projectId: input.projectId },
          include: {issues: true}
        });
      }),

      getMeetingById: protectedProcedure.input(z.object({ meetingId: z.string() })).query(async ({ ctx, input }) => {
        return await ctx.db.meeting.findUnique({
          where: { id: input.meetingId },
          include: { issues: true}
        });
      }),

      deleteMeeting: protectedProcedure.input(z.object({ meetingId: z.string() })).mutation(async ({ ctx, input }) => {
        return await ctx.db.meeting.delete({ where: { id: input.meetingId } });
      }),

      getTeamMembers: protectedProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
        return await ctx.db.userToProject.findMany({ where: { projectId: input.projectId }, include: { user: true } });
      }),

      archiveProject: protectedProcedure.input(z.object({ projectId: z.string() })).mutation(async ({ ctx, input }) => {
        await ctx.db.project.update({ where: { id: input.projectId }, data: { deletedAt: new Date() } });
      }),
      
})