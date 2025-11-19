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

        const db = env.DB;

        // 1. Get or create client
        let cliente = await db.prepare(
            'SELECT id FROM clientes WHERE nombre = ?'
        ).bind(remisionData.cliente).first();

        if (!cliente) {
            // Insert new client
            const insertResult = await db.prepare(
                'INSERT INTO clientes (nombre, ciudad, created_at) VALUES (?, ?, ?)'
            ).bind(remisionData.cliente, remisionData.ciudad, Date.now()).run();

            cliente = { id: insertResult.meta.last_row_id };
        }

        // 2. Get the next sequence number from max remision
        const maxResult = await db.prepare(
            'SELECT MAX(remision) as maxRemision FROM remisiones'
        ).first();

        const currentSequence = maxResult.maxRemision || '00000000';
        const nextSequence = String(parseInt(currentSequence) + 1).padStart(8, '0');

        // 3. Insert new remision
        await db.prepare(`
            INSERT INTO remisiones (
                remision, fecha, cliente_id, ciudad, conceptos,
                subtotal, iva, total, deleted, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `).bind(
            nextSequence,
            remisionData.fecha,
            cliente.id,
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
