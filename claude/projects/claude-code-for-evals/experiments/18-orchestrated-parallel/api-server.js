#!/usr/bin/env node

/**
 * Production API server for document analysis
 * Provides REST endpoints and handles long-running analysis jobs
 */

const express = require('express');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// In-memory job store (use Redis/DB in production)
const jobs = new Map();

// Create a job
app.post('/analyze', async (req, res) => {
    const { documentPath, documentContent } = req.body;
    
    if (!documentPath && !documentContent) {
        return res.status(400).json({ error: 'Provide documentPath or documentContent' });
    }
    
    const jobId = crypto.randomBytes(16).toString('hex');
    const job = {
        id: jobId,
        status: 'queued',
        createdAt: new Date(),
        documentPath: documentPath
    };
    
    jobs.set(jobId, job);
    
    // Start analysis in background
    processJob(jobId, documentPath || null, documentContent || null);
    
    res.json({
        jobId,
        status: 'queued',
        statusUrl: `/status/${jobId}`
    });
});

// Get job status
app.get('/status/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        outputDir: job.outputDir,
        error: job.error,
        reportUrl: job.status === 'completed' ? `/report/${job.id}` : null
    });
});

// Get final report
app.get('/report/:jobId', async (req, res) => {
    const job = jobs.get(req.params.jobId);
    
    if (!job || job.status !== 'completed') {
        return res.status(404).json({ error: 'Report not found' });
    }
    
    try {
        const reportPath = path.join(job.outputDir, 'final-report.md');
        const report = await fs.readFile(reportPath, 'utf8');
        res.type('text/markdown').send(report);
    } catch (error) {
        res.status(500).json({ error: 'Could not read report' });
    }
});

// Get all findings
app.get('/findings/:jobId', async (req, res) => {
    const job = jobs.get(req.params.jobId);
    
    if (!job || job.status !== 'completed') {
        return res.status(404).json({ error: 'Findings not found' });
    }
    
    try {
        const findingsPath = path.join(job.outputDir, 'all-findings.json');
        const findings = JSON.parse(await fs.readFile(findingsPath, 'utf8'));
        res.json(findings);
    } catch (error) {
        res.status(500).json({ error: 'Could not read findings' });
    }
});

// Process job in background
async function processJob(jobId, documentPath, documentContent) {
    const job = jobs.get(jobId);
    job.status = 'processing';
    job.startedAt = new Date();
    
    try {
        // If content provided, save to temp file
        if (documentContent && !documentPath) {
            const tempDir = path.join(__dirname, 'temp');
            await fs.mkdir(tempDir, { recursive: true });
            documentPath = path.join(tempDir, `${jobId}.md`);
            await fs.writeFile(documentPath, documentContent);
            job.tempFile = documentPath;
        }
        
        // Run analysis
        const scriptPath = path.join(__dirname, 'orchestrate-analysis.sh');
        
        // Set environment to avoid tty issues
        const env = {
            ...process.env,
            PARALLEL_SHELL: '/bin/bash',
            PARALLEL: '--no-notice --will-cite'
        };
        
        await new Promise((resolve, reject) => {
            const child = exec(
                `"${scriptPath}" "${documentPath}"`,
                {
                    env,
                    maxBuffer: 10 * 1024 * 1024, // 10MB
                    timeout: 900000 // 15 minutes
                },
                (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                    } else {
                        // Parse output directory from stdout
                        const outputMatch = stdout.match(/Output directory: (.+)/);
                        if (outputMatch) {
                            job.outputDir = outputMatch[1].trim();
                        }
                        resolve({ stdout, stderr });
                    }
                }
            );
        });
        
        job.status = 'completed';
        job.completedAt = new Date();
        
        // Cleanup temp file
        if (job.tempFile) {
            await fs.unlink(job.tempFile).catch(() => {});
        }
        
    } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
    }
}

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`📡 Document Analysis API running on port ${PORT}`);
    console.log();
    console.log('Endpoints:');
    console.log(`  POST   http://localhost:${PORT}/analyze`);
    console.log(`  GET    http://localhost:${PORT}/status/:jobId`);
    console.log(`  GET    http://localhost:${PORT}/report/:jobId`);
    console.log(`  GET    http://localhost:${PORT}/findings/:jobId`);
    console.log();
    console.log('Example:');
    console.log(`  curl -X POST http://localhost:${PORT}/analyze \\`);
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"documentPath": "test-documents/doc1.md"}\'');
});