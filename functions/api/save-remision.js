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

        // Start transaction
        const db = env.DB;

        // 1. Get and increment sequence
        const sequenceResult = await db.prepare(
            'SELECT ultima FROM secuencia WHERE id = 1'
        ).first();

        const currentSequence = sequenceResult.ultima;
        const nextSequence = String(parseInt(currentSequence) + 1).padStart(8, '0');

        // 2. Update sequence
        await db.prepare(
            'UPDATE secuencia SET ultima = ?, updated_at = ? WHERE id = 1'
        ).bind(nextSequence, Date.now()).run();

        // 3. Insert new remision
        await db.prepare(`
            INSERT INTO remisiones (
                remision, fecha, cliente, ciudad, conceptos,
                subtotal, iva, total, deleted, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `).bind(
            nextSequence,
            remisionData.fecha,
            remisionData.cliente,
            remisionData.ciudad,
            JSON.stringify(remisionData.conceptos),
            remisionData.subtotal,
            remisionData.iva,
            remisionData.total,
            Date.now()
        ).run();

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
