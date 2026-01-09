-- Refined MySQL Schema for CRM System Migration

CREATE TABLE users (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'STAFF') NOT NULL DEFAULT 'STAFF',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE lead_sources (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(20),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE leads (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    companyName VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    website VARCHAR(255),
    leadValue DECIMAL(15, 2),
    description TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    sourceId VARCHAR(128),
    assignedToId VARCHAR(128),
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    FOREIGN KEY (sourceId) REFERENCES lead_sources(id) ON DELETE SET NULL,
    FOREIGN KEY (assignedToId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE lead_tags (
    leadId VARCHAR(128),
    tagId VARCHAR(128),
    PRIMARY KEY (leadId, tagId),
    FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE clients (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    serviceType VARCHAR(255),
    address TEXT,
    notes TEXT,
    createdBy VARCHAR(128),
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE tasks (
    id VARCHAR(128) PRIMARY KEY,
    userId VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATETIME NOT NULL,
    hoursWorked DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    clientId VARCHAR(128),
    leadId VARCHAR(128),
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE SET NULL
);

CREATE TABLE task_notes (
    id VARCHAR(128) PRIMARY KEY,
    taskId VARCHAR(128) NOT NULL,
    userId VARCHAR(128),
    text TEXT NOT NULL,
    createdAt DATETIME NOT NULL,
    FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    leadId VARCHAR(128) NOT NULL,
    oldStatus VARCHAR(50),
    newStatus VARCHAR(50),
    changedBy VARCHAR(255),
    changedAt DATETIME NOT NULL,
    FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE attendance (
    id VARCHAR(128) PRIMARY KEY,
    userId VARCHAR(128) NOT NULL,
    date DATE NOT NULL,
    checkIn TIME,
    checkOut TIME,
    status VARCHAR(50),
    note TEXT,
    approvalStatus VARCHAR(50) DEFAULT 'PENDING',
    ipAddress VARCHAR(50),
    location JSON,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE leave_requests (
    id VARCHAR(128) PRIMARY KEY,
    userId VARCHAR(128) NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    leaveType VARCHAR(100),
    reason TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    approvedBy VARCHAR(128),
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE settings (
    id VARCHAR(128) PRIMARY KEY,
    `key` VARCHAR(255) UNIQUE NOT NULL,
    `value` JSON,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Chat System
CREATE TABLE chats (
    id VARCHAR(128) PRIMARY KEY,
    type ENUM('direct', 'group') NOT NULL,
    name VARCHAR(255),
    participantIds JSON,
    lastMessage TEXT,
    lastMessageTime BIGINT,
    lastMessageSender VARCHAR(255),
    createdAt BIGINT NOT NULL
);

CREATE TABLE messages (
    id VARCHAR(128) PRIMARY KEY,
    chatId VARCHAR(128) NOT NULL,
    senderId VARCHAR(128) NOT NULL,
    senderName VARCHAR(255),
    senderRole VARCHAR(50),
    text TEXT,
    timestamp BIGINT NOT NULL,
    readBy JSON,
    FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE TABLE user_presence (
    userId VARCHAR(128) PRIMARY KEY,
    status ENUM('online', 'offline') DEFAULT 'offline',
    lastSeen BIGINT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
