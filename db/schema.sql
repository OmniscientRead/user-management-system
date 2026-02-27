CREATE DATABASE IF NOT EXISTS `user-management-system` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `user-management-system`;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NULL,
  role ENUM('boss','hr','team-lead','admin') NOT NULL,
  createdAt DATETIME NOT NULL,
  lastLogin DATETIME NULL,
  tlAssignmentLimit INT NULL,
  tlCurrentAssignments INT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_users_email (email)
);

CREATE TABLE IF NOT EXISTS applicants (
  id INT NOT NULL AUTO_INCREMENT,
  data JSON NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id INT NOT NULL AUTO_INCREMENT,
  data JSON NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS manpower_requests (
  id INT NOT NULL AUTO_INCREMENT,
  data JSON NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS settings (
  id INT NOT NULL,
  data JSON NOT NULL,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

INSERT INTO users (id, email, password, role, createdAt)
VALUES
  (1, 'boss@constantinolawoffice.com', 'boss123', 'boss', NOW()),
  (2, 'hr@constantinolawoffice.com', 'hr123', 'hr', NOW()),
  (3, 'tl@constantinolawoffice.com', 'tl123', 'team-lead', NOW()),
  (4, 'admin@constantinolawoffice.com', 'admin123', 'admin', NOW())
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role = VALUES(role),
  createdAt = VALUES(createdAt);

INSERT INTO settings (id, data)
VALUES (1, JSON_OBJECT('manPowerLimit', 50))
ON DUPLICATE KEY UPDATE
  data = VALUES(data);

