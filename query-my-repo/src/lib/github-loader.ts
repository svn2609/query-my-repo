import {GithubRepoLoader} from '@langchain/community/document_loaders/web/github'
import {Document} from '@langchain/core/documents'
import { generateEmbedding, summariseCode } from './gemini';
import { db } from '@/server/db';
import { Octokit } from 'octokit';

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

export const checkCredits = async (githubUrl: string, githubToken?: string) => {
    const octokit = new Octokit({
        auth: githubToken,
    });
    const githubOwner = githubUrl.split('/')[3]
    const githubRepo = githubUrl.split('/')[4]
    if (!githubOwner || !githubRepo) return 0
    const fileCount = await getFileCount('', octokit, githubOwner, githubRepo, 0)
    return fileCount
}

const getFileCount = async (path: string, octokit: Octokit, githubOwner: string, githubRepo: string, acc: number = 0) => {
    const { data } = await octokit.rest.repos.getContent({
        owner: githubOwner,
        repo: githubRepo,
        path: path
    })

    if (!Array.isArray(data) && data.type === 'file') {
        return acc + 1
    }

    if (Array.isArray(data)) {
        let fileCount = 0
        const directories: string[] = []

        // Count files and collect directories in current level
        for (const item of data) {
            if (item.type === 'dir') {
                directories.push(item.path)
            } else {
                fileCount += 1
            }
        }

        // Process all directories at this level in parallel
        if (directories.length > 0) {
            const directoryCounts = await Promise.all(
                directories.map(dirPath =>
                    getFileCount(dirPath, octokit, githubOwner, githubRepo, 0)
                )
            )
            fileCount += directoryCounts.reduce((sum, count) => sum + count, 0)
        }

        return acc + fileCount
    }

    return acc
}