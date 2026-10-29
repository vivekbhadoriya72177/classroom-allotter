BEGIN;

CREATE TABLE rooms (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  building VARCHAR(100) NOT NULL,
  capacity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT rooms_code_format_check
    CHECK (code = UPPER(BTRIM(code)) AND CHAR_LENGTH(code) > 0),
  CONSTRAINT rooms_building_not_blank_check
    CHECK (CHAR_LENGTH(BTRIM(building)) > 0),
  CONSTRAINT rooms_capacity_positive_check
    CHECK (capacity > 0)
);

CREATE TABLE facilities (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,

  CONSTRAINT facilities_name_format_check
    CHECK (name = LOWER(BTRIM(name)) AND CHAR_LENGTH(name) > 0)
);

CREATE TABLE room_facilities (
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  facility_id BIGINT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,

  PRIMARY KEY (room_id, facility_id)
);

CREATE TABLE timetable_entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  course_code VARCHAR(30) NOT NULL,
  course_name VARCHAR(120) NOT NULL,
  weekday SMALLINT NOT NULL,
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT timetable_weekday_check CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT timetable_time_order_check CHECK (starts_at < ends_at),
  CONSTRAINT timetable_course_code_not_blank_check
    CHECK (CHAR_LENGTH(BTRIM(course_code)) > 0),
  CONSTRAINT timetable_course_name_not_blank_check
    CHECK (CHAR_LENGTH(BTRIM(course_name)) > 0),
  UNIQUE (room_id, weekday, starts_at, ends_at, course_code)
);

CREATE TABLE empty_room_reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  reporter_name VARCHAR(100) NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  note VARCHAR(300),
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT reports_reporter_not_blank_check
    CHECK (CHAR_LENGTH(BTRIM(reporter_name)) > 0),
  CONSTRAINT reports_expiry_order_check CHECK (observed_at < expires_at),
  CONSTRAINT reports_note_not_blank_check
    CHECK (note IS NULL OR CHAR_LENGTH(BTRIM(note)) > 0),
  CONSTRAINT reports_photo_url_not_blank_check
    CHECK (photo_url IS NULL OR CHAR_LENGTH(BTRIM(photo_url)) > 0)
);

CREATE TABLE room_activities (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  activity_type VARCHAR(30) NOT NULL,
  title VARCHAR(120) NOT NULL,
  organizer_name VARCHAR(100) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT activities_type_check
    CHECK (activity_type IN ('rescheduled-lecture', 'extra-class', 'study-session', 'other')),
  CONSTRAINT activities_title_not_blank_check
    CHECK (CHAR_LENGTH(BTRIM(title)) > 0),
  CONSTRAINT activities_organizer_not_blank_check
    CHECK (CHAR_LENGTH(BTRIM(organizer_name)) > 0),
  CONSTRAINT activities_time_order_check CHECK (start_time < end_time),
  CONSTRAINT activities_status_check CHECK (status IN ('active', 'released')),
  CONSTRAINT activities_release_state_check
    CHECK (
      (status = 'active' AND released_at IS NULL)
      OR (status = 'released' AND released_at IS NOT NULL)
    )
);

CREATE INDEX timetable_entries_room_schedule_idx
  ON timetable_entries (room_id, weekday, starts_at, ends_at);

CREATE INDEX empty_room_reports_room_expiry_idx
  ON empty_room_reports (room_id, expires_at DESC);

CREATE INDEX room_activities_room_interval_idx
  ON room_activities (room_id, start_time, end_time)
  WHERE status = 'active';

COMMIT;
