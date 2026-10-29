BEGIN;

INSERT INTO facilities (name)
VALUES
  ('projector'),
  ('smart-board'),
  ('whiteboard')
ON CONFLICT (name) DO NOTHING;

INSERT INTO rooms (code, building, capacity)
VALUES
  ('A-101', 'Academic Block A', 40),
  ('A-204', 'Academic Block A', 60),
  ('B-105', 'Academic Block B', 30),
  ('C-301', 'Academic Block C', 80)
ON CONFLICT (code) DO UPDATE
SET
  building = EXCLUDED.building,
  capacity = EXCLUDED.capacity;

INSERT INTO room_facilities (room_id, facility_id)
SELECT rooms.id, facilities.id
FROM (
  VALUES
    ('A-101', 'whiteboard'),
    ('A-204', 'projector'),
    ('A-204', 'whiteboard'),
    ('B-105', 'smart-board'),
    ('C-301', 'projector'),
    ('C-301', 'whiteboard')
) AS requested_facilities (room_code, facility_name)
JOIN rooms ON rooms.code = requested_facilities.room_code
JOIN facilities ON facilities.name = requested_facilities.facility_name
ON CONFLICT (room_id, facility_id) DO NOTHING;

INSERT INTO timetable_entries (
  room_id,
  course_code,
  course_name,
  weekday,
  starts_at,
  ends_at
)
SELECT
  rooms.id,
  timetable.course_code,
  timetable.course_name,
  timetable.weekday,
  timetable.starts_at::TIME,
  timetable.ends_at::TIME
FROM (
  VALUES
    ('A-101', 'CS-201', 'Data Structures', 1, '09:00', '10:00'),
    ('A-101', 'CS-204', 'Operating Systems', 3, '11:00', '12:00'),
    ('A-204', 'MA-202', 'Discrete Mathematics', 1, '10:00', '11:30'),
    ('A-204', 'CS-206', 'Database Systems', 4, '14:00', '15:00'),
    ('B-105', 'EC-101', 'Digital Electronics', 2, '09:00', '10:00'),
    ('B-105', 'HS-103', 'Professional Communication', 5, '12:00', '13:00'),
    ('C-301', 'CS-310', 'Computer Networks', 3, '15:00', '16:00')
) AS timetable (
  room_code,
  course_code,
  course_name,
  weekday,
  starts_at,
  ends_at
)
JOIN rooms ON rooms.code = timetable.room_code
ON CONFLICT (room_id, weekday, starts_at, ends_at, course_code) DO UPDATE
SET course_name = EXCLUDED.course_name;

COMMIT;
