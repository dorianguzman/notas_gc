-- Notas GC Database Schema

-- Table: clientes
-- Stores unique clients
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL,
    ciudad TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- Table: remisiones
-- Stores all remision notes
CREATE TABLE IF NOT EXISTS remisiones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remision TEXT UNIQUE NOT NULL,
    fecha TEXT NOT NULL,
    cliente_id INTEGER NOT NULL,
    ciudad TEXT NOT NULL,
    conceptos TEXT NOT NULL,  -- JSON array
    subtotal REAL NOT NULL,
    iva REAL NOT NULL,
    total REAL NOT NULL,
    deleted INTEGER DEFAULT 0,  -- 0 = active, 1 = deleted
    created_at INTEGER NOT NULL,  -- Unix timestamp
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Indexes for better performance
-- remision DESC: Used for MAX(remision) and ORDER BY remision DESC
CREATE INDEX IF NOT EXISTS idx_remisiones_remision ON remisiones(remision DESC);

-- deleted + remision DESC: Used for filtering active/deleted notes while sorting
CREATE INDEX IF NOT EXISTS idx_remisiones_deleted_remision ON remisiones(deleted, remision DESC);
