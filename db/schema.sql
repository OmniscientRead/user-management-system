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
  name VARCHAR(255) NULL,
  age INT NULL,
  education VARCHAR(255) NULL,
  course VARCHAR(255) NULL,
  positionAppliedFor VARCHAR(255) NULL,
  collectionExperience VARCHAR(255) NULL,
  referral VARCHAR(255) NULL,
  resumeUrl VARCHAR(500) NULL,
  pictureUrl VARCHAR(500) NULL,
  status VARCHAR(50) NULL,
  addedDate VARCHAR(50) NULL,
  addedBy VARCHAR(255) NULL,
  assignedTL VARCHAR(255) NULL,
  assignedUserId INT NULL,
  assignedDate VARCHAR(50) NULL,
  hrIntroductionStatus VARCHAR(50) NULL,
  hrIntroductionAt VARCHAR(50) NULL,
  approvedBy VARCHAR(255) NULL,
  approvedDate VARCHAR(50) NULL,
  rejectedBy VARCHAR(255) NULL,
  rejectedDate VARCHAR(50) NULL,
  deletedBy VARCHAR(255) NULL,
  deletedDate VARCHAR(50) NULL,
  data JSON NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id INT NOT NULL AUTO_INCREMENT,
  applicantId INT NULL,
  applicantName VARCHAR(255) NULL,
  positionAppliedFor VARCHAR(255) NULL,
  tlEmail VARCHAR(255) NULL,
  tlName VARCHAR(255) NULL,
  assignedBy VARCHAR(255) NULL,
  assignedDate VARCHAR(50) NULL,
  status VARCHAR(50) NULL,
  resumeUrl VARCHAR(500) NULL,
  pictureUrl VARCHAR(500) NULL,
  age INT NULL,
  education VARCHAR(255) NULL,
  course VARCHAR(255) NULL,
  collectionExperience VARCHAR(255) NULL,
  referral VARCHAR(255) NULL,
  requestId INT NULL,
  data JSON NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS manpower_requests (
  id INT NOT NULL AUTO_INCREMENT,
  teamLeadEmail VARCHAR(255) NULL,
  teamLeadName VARCHAR(255) NULL,
  tlId INT NULL,
  position VARCHAR(255) NULL,
  requestedCount INT NULL,
  `limit` INT NULL,
  status VARCHAR(50) NULL,
  date VARCHAR(50) NULL,
  pdfUrl VARCHAR(500) NULL,
  assignedCount INT NULL,
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

CREATE TABLE IF NOT EXISTS sessions (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  token VARCHAR(128) NOT NULL,
  createdAt DATETIME NOT NULL,
  expiresAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_sessions_token (token),
  KEY ix_sessions_user (userId)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT NOT NULL AUTO_INCREMENT,
  actorUserId INT NOT NULL,
  actorEmail VARCHAR(255) NOT NULL,
  actorRole VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entityId VARCHAR(50) NOT NULL,
  beforeData LONGTEXT NULL,
  afterData LONGTEXT NULL,
  createdAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_audit_entity (entity, entityId),
  KEY ix_audit_actor (actorUserId)
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
