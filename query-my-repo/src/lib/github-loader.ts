import {GithubRepoLoader} from '@langchain/community/document_loaders/web/github'
import {Document} from '@langchain/core/documents'
import { generateEmbedding, summariseCode } from './gemini';
import { db } from '@/server/db';

export const loadGithubRepo = async (githubUrl: string, githubToken?: string) => {
    const loader = new GithubRepoLoader(
        githubUrl,
        {
            branch: "main",
            ignoreFiles: ['package-lock.json', 'bun.lockb', 'yarn.lock'],
            recursive: true,
            accessToken: githubToken || '',
            unknown: "warn",
            maxConcurrency: 5, 
        }
    );
    const docs = await loader.load();
    return docs
};

// console.log(await loadGithubRepo('https://github.com/svn2609/reactDashboard'));

// Document {
//     pageContent: "import React from 'react'\n" +
//       '\n' +
//       'const Stacked = () => {\n' +
//       '  return (\n' +
//       '    <div>Stacked</div>\n' +
//       '  )\n' +
//       '}\n' +
//       '\n' +
//       'export default Stacked',
//     metadata: {
//       source: 'src/pages/Charts/Stacked.jsx',
//       repository: 'https://github.com/svn2609/reactDashboard',
//       branch: 'main'
//     },
//     id: undefined
//   }

export const indexGithubRepo = async (projectId: string, githubUrl: string, gihubToken?: string) => {
    const docs = await loadGithubRepo(githubUrl, gihubToken)
    const allEmbeddings = await generateEmbeddings(docs)
    await Promise.allSettled(allEmbeddings.map(async (embedding,index) => {
        console.log(`processing ${index} of ${allEmbeddings.length}`)
        if (!embedding) return
        const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
            data: {
                summary: embedding.summary,
                sourceCode: embedding.sourceCode,
                fileName: embedding.fileName,
                projectId,
            }
        })
        await db.$executeRaw`
        UPDATE "SourceCodeEmbedding"
        SET "summaryEmbedding" = ${embedding.embedding}::vector
        WHERE id = ${sourceCodeEmbedding.id}
    `;
    }))
}

export const generateEmbeddings = async (docs: Document[]) => {
    return await Promise.all(docs.map(async doc => {
        const summary = await summariseCode(doc)
        const embedding = await generateEmbedding(summary);
        return {
            summary,
            embedding,
            sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
            fileName: doc.metadata.source
        }
    }))
}