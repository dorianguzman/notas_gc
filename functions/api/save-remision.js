/**
 * Cloudflare Pages Function: Save Remision
 * POST /api/save-remision - Save a new remision
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
        // Get remision data from request
        const remisionData = await request.json();

        // GitHub configuration
        const GITHUB_OWNER = 'dorianguzman';
        const GITHUB_REPO = 'notas_gc';
        const GITHUB_BRANCH = 'main';
        const GITHUB_TOKEN = env.GITHUB_TOKEN;

        if (!GITHUB_TOKEN) {
            throw new Error('GITHUB_TOKEN not configured');
        }

        // 1. Get current sequence
        const sequenceResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/secuencia.json?ref=${GITHUB_BRANCH}`,
            {
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!sequenceResponse.ok) {
            throw new Error(`Failed to fetch sequence: ${sequenceResponse.status}`);
        }

        const sequenceFile = await sequenceResponse.json();
        const sequenceContent = JSON.parse(atob(sequenceFile.content));
        const currentSequence = sequenceContent.ultima;
        const nextSequence = String(parseInt(currentSequence) + 1).padStart(8, '0');

        // 2. Get current history
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

        // 3. Add new remision to history (at the beginning)
        const newRemision = {
            fecha: remisionData.fecha,
            remision: nextSequence,
            cliente: remisionData.cliente,
            ciudad: remisionData.ciudad,
            conceptos: remisionData.conceptos,
            subtotal: remisionData.subtotal,
            iva: remisionData.iva,
            total: remisionData.total,
            deleted: false
        };

        historyContent.unshift(newRemision);

        // 4. Update sequence file
        const updateSequenceResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/secuencia.json`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Update sequence to ${nextSequence}`,
                    content: btoa(JSON.stringify({ ultima: nextSequence }, null, 2)),
                    sha: sequenceFile.sha,
                    branch: GITHUB_BRANCH
                })
            }
        );

        if (!updateSequenceResponse.ok) {
            throw new Error(`Failed to update sequence: ${updateSequenceResponse.status}`);
        }

        // 5. Update history file
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
                    message: `Add remision ${nextSequence}`,
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
            remision: nextSequence
        }), {
            headers: corsHeaders
        });

    } catch (error) {
        console.error('Save remision error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
