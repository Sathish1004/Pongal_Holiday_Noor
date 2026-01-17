-- Project Task Templates Schema
CREATE TABLE IF NOT EXISTS task_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phase_name VARCHAR(255) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    order_num INT DEFAULT 0
);

-- Insert Master Predefined Tasks
INSERT IGNORE INTO task_templates (phase_name, task_name, order_num) VALUES
('Planning', 'Site Survey', 1),
('Planning', 'Permission & Documentation', 2),
('Planning', 'Project Mobilization', 3),
('Basement/Foundation', 'Excavation', 4),
('Basement/Foundation', 'PCC Work', 5),
('Basement/Foundation', 'Footing & Foundation', 6),
('Basement/Foundation', 'PCC for Basement', 7),
('Structure', 'Pillar Casting', 8),
('Structure', 'Lintel Casting', 9),
('Structure', 'Roof Slab Casting', 10),
('Finishing', 'Electrical Rough-in', 11),
('Finishing', 'Plumbing Rough-in', 12),
('Finishing', 'Plastering Internal', 13),
('Finishing', 'Plastering External', 14),
('Finishing', 'Electrical Final Fitting', 15),
('Finishing', 'Plumbing Final Fitting', 16),
('Painting', 'Wall Putty Application', 17),
('Painting', 'Base Coat Painting', 18),
('Painting', 'Final Coat Painting', 19),
('Tiles/Flooring', 'Floor Tiles Installation', 20),
('Tiles/Flooring', 'Wall Tiles Installation', 21),
('Carpentry', 'Door Frame Installation', 22),
('Carpentry', 'Window Shutter Installation', 23),
('Optional Works', 'Landscaping', 24),
('Optional Works', 'Compound Wall Construction', 25);

-- Update phases status enum to matches requirements if needed
ALTER TABLE phases MODIFY COLUMN status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending';

-- Update tasks status enum
ALTER TABLE tasks MODIFY COLUMN status ENUM('Not Started', 'In Progress', 'Completed') DEFAULT 'Not Started';
