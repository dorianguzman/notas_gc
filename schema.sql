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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_remisiones_remision ON remisiones(remision DESC);
CREATE INDEX IF NOT EXISTS idx_remisiones_deleted ON remisiones(deleted);
CREATE INDEX IF NOT EXISTS idx_remisiones_fecha ON remisiones(fecha DESC);
