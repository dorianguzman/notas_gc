/**
 * Cloudflare Pages Function: Update Remision
 * POST /api/update-remision - Update remision (delete/restore)
 */

export async function onRequest(context) {
    const { request, env } = context;
    const { method } = request;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS (preflight)
    if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST
    if (method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: corsHeaders
        });
    }

    try {
        // Get update data from request
        const { remisionNumber, deleted } = await request.json();

        if (!remisionNumber || typeof deleted !== 'boolean') {
            throw new Error('Invalid request: remisionNumber and deleted fields required');
        }

        // GitHub configuration
        const GITHUB_OWNER = 'dorianguzman';
        const GITHUB_REPO = 'notas_gc';
        const GITHUB_BRANCH = 'main';
        const GITHUB_TOKEN = env.GITHUB_TOKEN;

        if (!GITHUB_TOKEN) {
            throw new Error('GITHUB_TOKEN not configured');
        }

        // 1. Get current history
        const historyResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/historial.json?ref=${GITHUB_BRANCH}`,
            {
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!historyResponse.ok) {
            throw new Error(`Failed to fetch history: ${historyResponse.status}`);
        }

        const historyFile = await historyResponse.json();
        const historyContent = JSON.parse(atob(historyFile.content));

        // 2. Find and update the remision
        const remisionIndex = historyContent.findIndex(
            item => item.remision === remisionNumber
        );

        if (remisionIndex === -1) {
            throw new Error(`Remision ${remisionNumber} not found`);
        }

        historyContent[remisionIndex].deleted = deleted;

        // 3. Update history file
        const updateHistoryResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/historial.json`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `${deleted ? 'Delete' : 'Restore'} remision ${remisionNumber}`,
                    content: btoa(JSON.stringify(historyContent, null, 2)),
                    sha: historyFile.sha,
                    branch: GITHUB_BRANCH
                })
            }
        );

        if (!updateHistoryResponse.ok) {
            throw new Error(`Failed to update history: ${updateHistoryResponse.status}`);
        }

        return new Response(JSON.stringify({
            success: true,
            remisionNumber,
            deleted
        }), {
            headers: corsHeaders
        });

    } catch (error) {
        console.error('Update remision error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
