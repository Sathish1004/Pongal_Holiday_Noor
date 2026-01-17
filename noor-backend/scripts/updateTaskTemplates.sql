-- Clear existing templates to replace with the reference image data
TRUNCATE TABLE task_templates;

-- Insert Master Predefined Tasks from Reference Image
INSERT INTO task_templates (phase_name, task_name, order_num) VALUES
('Initial Planning and Site Preparation', 'Site plan', 1),
('Initial Planning and Site Preparation', 'Architectural drawings', 2),
('Initial Planning and Site Preparation', 'Elevation', 3),
('Initial Planning and Site Preparation', 'Site pooja', 4),

('Basement Construction Stages', 'Site clearance', 5),
('Basement Construction Stages', 'Marking', 6),
('Basement Construction Stages', 'Excavation', 7),
('Basement Construction Stages', 'PCC', 8),
('Basement Construction Stages', 'Bar bending', 9),
('Basement Construction Stages', 'Pillar marking and placing', 10),
('Basement Construction Stages', 'Footing concrete', 11),
('Basement Construction Stages', 'Earth pit column concrete below GL', 12),
('Basement Construction Stages', 'Earth pit soil filling and soil tightening', 13),
('Basement Construction Stages', 'Plinth level marking', 14),
('Basement Construction Stages', 'Plinth beam bar bending and shuttering', 15),
('Basement Construction Stages', 'Concreting and de-shuttering', 16),
('Basement Construction Stages', 'Basement level brick work - inner plastering', 17),
('Basement Construction Stages', 'Gravel filling', 18),
('Basement Construction Stages', 'Soil consolidation', 19),
('Basement Construction Stages', 'DPC concrete and PCC', 20),
('Basement Construction Stages', 'Water tank and septic tank', 21),

('Lintel Level Construction', 'Lintel level', 22),
('Lintel Level Construction', 'Column shoe marking', 23),
('Lintel Level Construction', 'Rod lapping if needed', 24),
('Lintel Level Construction', 'Column box fixing and concreting', 25),
('Lintel Level Construction', 'Sill level brick work 3\'', 26),
('Lintel Level Construction', 'Sill concrete', 27),
('Lintel Level Construction', 'Lintel level brick work', 28),
('Lintel Level Construction', 'Lintel level shuttering', 29),
('Lintel Level Construction', 'Bar bending and concreting', 30),

('Roof Level Construction', 'Roof level', 31),
('Roof Level Construction', 'Rod lapping if needed', 32),
('Roof Level Construction', 'Brick work', 33),
('Roof Level Construction', 'Roof centering', 34),
('Roof Level Construction', 'Bar bending', 35),
('Roof Level Construction', 'Electrical pipeline fixing', 36),
('Roof Level Construction', 'Concreting', 37),
('Roof Level Construction', 'Concrete de-shuttering', 38),
('Roof Level Construction', 'Electrical pipeline gady work', 39),

('Wall and Finishing Works', 'Parapet wall brick work and sill concrete', 40),
('Wall and Finishing Works', 'Doors and windows frame fixing', 41),
('Wall and Finishing Works', 'Inner plastering', 42),
('Wall and Finishing Works', 'Kitchen tabletop concreting', 43),
('Wall and Finishing Works', 'Outer plastering', 44),
('Wall and Finishing Works', 'Rooftop surki concrete', 45),
('Wall and Finishing Works', 'Elevation work', 46),

('Compound Wall Construction', 'Compound wall basement', 47),
('Compound Wall Construction', 'Brick work', 48),
('Compound Wall Construction', 'Plastering', 49),

('Electrical and Plumbing Rough-in', 'Electrical wiring', 50);
