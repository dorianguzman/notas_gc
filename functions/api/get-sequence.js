/**
 * Cloudflare Pages Function: Get Sequence
 * GET /api/get-sequence - Get next remision number
 */

export async function onRequest(context) {
    const { request, env } = context;
    const { method } = request;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS (preflight)
    if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // Only allow GET
    if (method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: corsHeaders
        });
    }

    try {
        const db = env.DB;

        // Get current sequence
        const result = await db.prepare(
            'SELECT ultima FROM secuencia WHERE id = 1'
        ).first();

        const currentSequence = result.ultima;
        const nextSequence = String(parseInt(currentSequence) + 1).padStart(8, '0');

        return new Response(JSON.stringify({
            ultima: currentSequence,
            next: nextSequence
        }), {
            headers: corsHeaders
        });

    } catch (error) {
        console.error('Get sequence error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
