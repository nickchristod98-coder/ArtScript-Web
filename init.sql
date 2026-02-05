-- ArtScript Database Schema
-- PostgreSQL 16+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    format VARCHAR(50) NOT NULL CHECK (format IN ('Film', 'TV Show', 'Book')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Project metadata
    title_page JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    
    -- Stats
    page_count INTEGER DEFAULT 0,
    scene_count INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0
);

-- Project content (lines)
CREATE TABLE project_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    episode_id UUID, -- NULL for films/books
    line_order INTEGER NOT NULL,
    line_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id, episode_id, line_order)
);

-- Episodes (for TV Shows)
CREATE TABLE episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    episode_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id, episode_order)
);

-- Characters
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    notes TEXT,
    aliases TEXT[], -- Array of alternative names
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id, name)
);

-- Notes
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    line_id UUID REFERENCES project_lines(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Revisions/Version history
CREATE TABLE revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    revision_name VARCHAR(255) NOT NULL,
    snapshot JSONB NOT NULL, -- Full project snapshot
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Collaboration (shared projects)
CREATE TABLE project_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer', 'commenter')),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(project_id, user_id)
);

-- Sessions (optional - for JWT tracking)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX idx_project_lines_project_id ON project_lines(project_id);
CREATE INDEX idx_project_lines_episode_id ON project_lines(episode_id);
CREATE INDEX idx_project_lines_order ON project_lines(project_id, episode_id, line_order);
CREATE INDEX idx_episodes_project_id ON episodes(project_id);
CREATE INDEX idx_characters_project_id ON characters(project_id);
CREATE INDEX idx_notes_project_id ON notes(project_id);
CREATE INDEX idx_notes_line_id ON notes(line_id);
CREATE INDEX idx_revisions_project_id ON revisions(project_id);
CREATE INDEX idx_collaborators_project_id ON project_collaborators(project_id);
CREATE INDEX idx_collaborators_user_id ON project_collaborators(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_lines_updated_at BEFORE UPDATE ON project_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON episodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert dummy data
-- User 1: Demo User
INSERT INTO users (id, email, password_hash, full_name, email_verified) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'demo@artscript.com', '$2b$10$rKZLvHXqbQ3Y5kX5FXnMOuGzX3fFW3XqQ8Hg3F3gH3gH3gH3gH3gHO', 'Demo User', TRUE),
('550e8400-e29b-41d4-a716-446655440002', 'writer@artscript.com', '$2b$10$rKZLvHXqbQ3Y5kX5FXnMOuGzX3fFW3XqQ8Hg3F3gH3gH3gH3gH3gHO', 'Jane Writer', TRUE);
-- Password for both: "password123"

-- Project 1: Film Script
INSERT INTO projects (id, user_id, name, format, title_page, page_count, scene_count, word_count) VALUES
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'The Last Mission', 'Film', 
'{"title": "THE LAST MISSION", "author": "Demo User", "contact": "demo@artscript.com", "draft": "First Draft"}', 
120, 45, 28500);

-- Lines for Film
INSERT INTO project_lines (project_id, episode_id, line_order, line_type, content) VALUES
('650e8400-e29b-41d4-a716-446655440001', NULL, 0, 'scene-heading', 'INT. COMMAND CENTER - NIGHT'),
('650e8400-e29b-41d4-a716-446655440001', NULL, 1, 'action', 'A massive wall of screens flickers with global satellite feeds. COMMANDER SARAH CHEN (40s, sharp) studies a holographic map.'),
('650e8400-e29b-41d4-a716-446655440001', NULL, 2, 'character', 'CHEN'),
('650e8400-e29b-41d4-a716-446655440001', NULL, 3, 'dialogue', 'We have less than 72 hours. If we don''t shut down the signal, it''s over.'),
('650e8400-e29b-41d4-a716-446655440001', NULL, 4, 'action', 'LIEUTENANT MARCUS REID (30s, determined) enters, carrying a tablet.'),
('650e8400-e29b-41d4-a716-446655440001', NULL, 5, 'character', 'REID'),
('650e8400-e29b-41d4-a716-446655440001', NULL, 6, 'dialogue', 'The team is ready. But Commander... the odds aren''t good.');

-- Characters
INSERT INTO characters (project_id, name, description, notes) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'CHEN', 'Commander Sarah Chen - 40s, experienced military leader', 'Lead protagonist. Has personal connection to the mission.'),
('650e8400-e29b-41d4-a716-446655440001', 'REID', 'Lieutenant Marcus Reid - 30s, tech specialist', 'Chen''s right-hand. Provides technical expertise.');

-- Project 2: TV Show
INSERT INTO projects (id, user_id, name, format, title_page, page_count, scene_count, word_count) VALUES
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'City Lights', 'TV Show', 
'{"title": "CITY LIGHTS", "author": "Jane Writer", "contact": "writer@artscript.com"}', 
55, 22, 13000);

-- Episode
INSERT INTO episodes (id, project_id, name, episode_order) VALUES
('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', 'Pilot', 1);

-- Lines for TV Show
INSERT INTO project_lines (project_id, episode_id, line_order, line_type, content) VALUES
('650e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 0, 'scene-heading', 'INT. COFFEE SHOP - MORNING'),
('650e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 1, 'action', 'Sunlight streams through floor-to-ceiling windows. EMMA (28, barista) wipes down the espresso machine.'),
('650e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 2, 'action', 'The door chimes. JAKE (30, writer) enters, laptop bag slung over his shoulder.');

-- Note
INSERT INTO notes (project_id, line_id, content, note_type) VALUES
('650e8400-e29b-41d4-a716-446655440001', 
(SELECT id FROM project_lines WHERE project_id = '650e8400-e29b-41d4-a716-446655440001' AND line_order = 3), 
'Consider adding more urgency to this line', 'revision');

-- Collaborator
INSERT INTO project_collaborators (project_id, user_id, role, accepted_at) VALUES
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'editor', CURRENT_TIMESTAMP);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO artscript;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO artscript;