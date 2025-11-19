-- Notas GC Database Schema

-- Table: remisiones
-- Stores all remision notes
CREATE TABLE IF NOT EXISTS remisiones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remision TEXT UNIQUE NOT NULL,
    fecha TEXT NOT NULL,
    cliente TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    conceptos TEXT NOT NULL,  -- JSON array
    subtotal REAL NOT NULL,
    iva REAL NOT NULL,
    total REAL NOT NULL,
    deleted INTEGER DEFAULT 0,  -- 0 = active, 1 = deleted
    created_at INTEGER NOT NULL  -- Unix timestamp
);

-- Table: secuencia
-- Stores the current sequence number
CREATE TABLE IF NOT EXISTS secuencia (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- Only one row allowed
    ultima TEXT NOT NULL,  -- e.g., "00000001"
    updated_at INTEGER NOT NULL  -- Unix timestamp
);

-- Initialize sequence
INSERT OR IGNORE INTO secuencia (id, ultima, updated_at)
VALUES (1, '00000000', strftime('%s', 'now'));

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_remisiones_fecha ON remisiones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_remisiones_deleted ON remisiones(deleted);
CREATE INDEX IF NOT EXISTS idx_remisiones_remision ON remisiones(remision);
