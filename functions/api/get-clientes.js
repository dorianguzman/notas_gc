/**
 * Cloudflare Pages Function: Get Clientes
 * GET /api/get-clientes - Get all clients
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

        // Get all clients ordered by name
        const result = await db.prepare(`
            SELECT nombre, ciudad
            FROM clientes
            ORDER BY nombre ASC
        `).all();

        return new Response(JSON.stringify(result.results), {
            headers: corsHeaders
        });

    } catch (error) {
        console.error('Get clientes error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
