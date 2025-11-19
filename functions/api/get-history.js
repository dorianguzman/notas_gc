/**
 * Cloudflare Pages Function: Get History
 * GET /api/get-history - Get all remisions
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

        // Get all remisiones ordered by remision number (newest first)
        const result = await db.prepare(`
            SELECT
                remision, fecha, cliente, ciudad, conceptos,
                subtotal, iva, total, deleted
            FROM remisiones
            ORDER BY remision DESC
        `).all();

        // Parse conceptos JSON for each remision
        const remisiones = result.results.map(item => ({
            ...item,
            conceptos: JSON.parse(item.conceptos),
            deleted: item.deleted === 1
        }));

        return new Response(JSON.stringify(remisiones), {
            headers: corsHeaders
        });

    } catch (error) {
        console.error('Get history error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
