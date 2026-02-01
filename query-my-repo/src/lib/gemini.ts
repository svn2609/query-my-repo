import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';
import {Document} from '@langchain/core/documents'

const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

export const aiSummariseCommit = async (diff: string) => {

    try {
        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents:`You are an expert programmer, and you are trying to summarize a git diff.
            Reminders about the git diff format:
            For every file, there are a few metadata lines, like (for example):
            \`\`\`
            diff --git a/lib/index.js b/lib/index.js
            index aadf691..bfef603 100644
            --- a/lib/index.js
            +++ b/lib/index.js
            \`\`\`
            This means that \`lib/index.js\` was modified in this commit. Note that this is only an example.
            
            Then there is a specifier of the lines that were modified.
            A line starting with '+' means it was added.
            A line that starting with '-' means that line was deleted.
            A line that starts with neither '+' nor '-' is code given for context and better understanding.
            It is not part of the diff.
            [...]
            
            EXAMPLE SUMMARY COMMENTS:
            \`\`\`
            * Raised the amount of returned recordings from \`10\` to \`100\` [packages/server/recordings_api.ts], [packages/server/constants.ts]
            * Fixed a typo in the github action name [.github/workflows/gpt-commit-summarizer.yml]
            * Moved the \`octokit\` initialization to a separate file [src/octokit.ts], [src/index.ts]
            * Added an OpenAI API for completions [packages/utils/apis/openai.ts]
            * Lowered numeric tolerance for test files
            \`\`\`
            
            Most commits will have less comments than this examples list.
            
            The last comment does not include the file names,
            because there were more than two relevant files in the hypothetical commit.
            
            Do not include parts of the example in your summary.
            It is given only as an example of appropriate comments.
            \`Please summarise the following diff file: \n\n${diff}\`
        `});
        return response.text;
    }
    catch (error) {
        console.error("Gemini Error:", error);
        return 'Gemini threw error';
    }
    
}

export async function summariseCode (doc: Document) {
    //console.log("getting summary for", doc.metadata.source);
    try {
        const code = doc.pageContent.slice(0, 10000); // Limit to 10000 characters to prevent context window limit exhaustion
        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are an intelligent senior software engineer who specialises in onboarding junior software engineers onto projects. You are onboarding a junior software engineer and explaining to them the purpose of the ${doc.metadata.source} file
            Here is the code:
            ---
            ${code}
            ---
            Give a summary of 100 words or less of the code above`
        });
        return response.text?? 'no response found';
    }
    catch (error) {
        console.error("Gemini Error:", error);
        return 'no response found';
    }
}

export async function generateEmbedding (summary: string) {
    const AI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = await AI.getGenerativeModel({
        model: 'text-embedding-004',
    });
    const result = await model.embedContent(summary)
    const embedding = result.embedding
    return embedding.values
}