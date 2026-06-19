-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Junctions Table
CREATE TABLE junctions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    base_capacity INTEGER NOT NULL
);

-- Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    junction_id UUID REFERENCES junctions(id),
    type VARCHAR(100) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_time TIMESTAMP WITH TIME ZONE,
    severity INTEGER CHECK (severity >= 1 AND severity <= 5),
    is_active BOOLEAN DEFAULT TRUE
);

-- Officer Notes Table (To be used with FAISS)
CREATE TABLE officer_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id),
    raw_note TEXT NOT NULL,
    extracted_cause TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Predictions Table
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id),
    high_impact BOOLEAN,
    duration_class VARCHAR(50),
    tow_truck_needed BOOLEAN,
    shap_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
