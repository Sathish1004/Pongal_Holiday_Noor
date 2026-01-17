-- Noor Workforce Database Setup - Enhanced Schema
-- Run this script to create required tables

-- Drop existing tables for fresh start (comment out if you want to keep data)
-- DROP TABLE IF EXISTS tasks;
-- DROP TABLE IF EXISTS phases;
-- DROP TABLE IF EXISTS site_assignments;
-- DROP TABLE IF EXISTS sites;
-- DROP TABLE IF EXISTS employees;

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    role ENUM('admin', 'employee') DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500) NOT NULL,
    start_date DATE,
    end_date DATE,
    duration VARCHAR(100),
    budget DECIMAL(15, 2) DEFAULT 0,
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    client_company VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    status ENUM('active', 'completed', 'delayed', 'pending') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Site Assignments (links employees to sites)
CREATE TABLE IF NOT EXISTS site_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    employee_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Phases table (construction phases per site)
CREATE TABLE IF NOT EXISTS phases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    order_num INT DEFAULT 1,
    status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Tasks table (enhanced with amount and phase)
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT,
    phase_id INT,
    employee_id INT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    due_date DATE,
    amount DECIMAL(12, 2) DEFAULT 0,
    progress INT DEFAULT 0,
    status ENUM('pending', 'in_progress', 'completed', 'delayed', 'waiting_for_approval') DEFAULT 'pending',
    completed_by INT,
    completed_at DATETIME,
    delay_reason TEXT,
    proof_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
    FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE SET NULL
);

-- Insert default employees for testing
INSERT IGNORE INTO employees (id, name, email, role) VALUES
(1, 'Administrator', 'admin@noor.com', 'admin'),
(2, 'John Employee', 'employee@noor.com', 'employee'),
(3, 'Rajesh Kumar', 'rajesh@noor.com', 'employee'),
(4, 'Suresh Sharma', 'suresh@noor.com', 'employee');

-- Default Phases Template (will be created per site)
-- Planning & Site Preparation
-- Foundation
-- Structure
-- Finishing
