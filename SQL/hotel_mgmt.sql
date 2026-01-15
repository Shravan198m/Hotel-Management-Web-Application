-- ===================================================
-- HOTEL MANAGEMENT SYSTEM (MySQL)
-- ===================================================
DROP DATABASE IF EXISTS hotel_mgmt;
CREATE DATABASE hotel_mgmt;
USE hotel_mgmt;

-- ---------- Tables ----------
CREATE TABLE rooms (
  room_id INT AUTO_INCREMENT PRIMARY KEY,
  room_number VARCHAR(10) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,           -- Single, Double, Deluxe, Suite
  price DECIMAL(10,2) NOT NULL,
  status ENUM('available','occupied','maintenance') DEFAULT 'available',
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120),
  phone VARCHAR(20),
  city VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  room_id INT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('booked','checked_in','checked_out','cancelled') DEFAULT 'booked',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bk_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT fk_bk_room     FOREIGN KEY (room_id)     REFERENCES rooms(room_id)     ON DELETE CASCADE,
  CONSTRAINT ck_dates CHECK (check_out > check_in)
);

CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('cash','card','upi','online') NOT NULL,
  payment_date DATE NOT NULL,
  CONSTRAINT fk_pay_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
);

CREATE TABLE staff (
  staff_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50),
  salary DECIMAL(10,2),
  phone VARCHAR(20),
  shift ENUM('morning','evening','night'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Sample Data (Rooms: 10, Customers: 15, Bookings: 12+, etc.) ----------
INSERT INTO rooms (room_number, type, price, status, description) VALUES
('101','Single',1200.00,'available','Single bed, AC'),
('102','Single',1200.00,'available','Single bed, Non-AC'),
('103','Double',2000.00,'occupied','Double bed, Balcony'),
('104','Double',2200.00,'available','Double bed, Sea view'),
('201','Suite',5000.00,'available','Luxury Suite, Sea View'),
('202','Suite',4800.00,'maintenance','King Suite under repair'),
('203','Deluxe',3500.00,'available','Deluxe room with balcony'),
('301','Single',1300.00,'available','Single bed, Mountain view'),
('302','Double',2100.00,'occupied','Double room'),
('303','Suite',5500.00,'available','Presidential Suite');

INSERT INTO customers (name, email, phone, city) VALUES
('John Doe','john@example.com','9876543210','Mumbai'),
('Anita Rao','anita@example.com','9988776655','Bengaluru'),
('Ravi Kumar','ravi@gmail.com','9845012345','Chennai'),
('Neha Singh','neha@gmail.com','9876549999','Delhi'),
('Priya Mehta','priya@gmail.com','9123456789','Pune'),
('Karan Patel','karan@gmail.com','9234567890','Ahmedabad'),
('Rahul Nair','rahul@gmail.com','9345678901','Kochi'),
('Deepika Sharma','deepika@gmail.com','9456789012','Jaipur'),
('Suresh Reddy','suresh@gmail.com','9567890123','Hyderabad'),
('Meena Das','meena@gmail.com','9678901234','Kolkata'),
('Ishaan Khanna','ishaan@gmail.com','9811122233','Noida'),
('Aarav Jain','aarav@gmail.com','9822244455','Surat'),
('Pooja Kulkarni','pooja@gmail.com','9833366677','Nashik'),
('Vikram Shetty','vikram@gmail.com','9844488899','Mangaluru'),
('Shruti Verma','shruti@gmail.com','9855511111','Lucknow');

INSERT INTO bookings (customer_id, room_id, check_in, check_out, total_amount, status) VALUES
(1, 3, '2025-11-01','2025-11-03', 4000.00, 'checked_out'),
(2, 4, '2025-11-05','2025-11-08', 6600.00, 'booked'),
(3, 1, '2025-11-02','2025-11-04', 2400.00, 'booked'),
(4, 2, '2025-11-10','2025-11-11', 1200.00, 'cancelled'),
(5, 5, '2025-11-07','2025-11-09',10000.00, 'booked'),
(6, 9, '2025-11-05','2025-11-10',10500.00, 'booked'),
(7,10, '2025-11-01','2025-11-05',22000.00, 'checked_out'),
(8, 7, '2025-11-11','2025-11-13', 7000.00, 'booked'),
(9, 8, '2025-11-02','2025-11-03', 1300.00, 'booked'),
(10,6, '2025-11-15','2025-11-17', 9600.00, 'booked'),
(11,1, '2025-11-20','2025-11-22', 2400.00, 'booked'),
(12,4, '2025-11-25','2025-11-27', 6600.00, 'booked');

INSERT INTO payments (booking_id, amount, method, payment_date) VALUES
(1, 4000.00, 'card',   '2025-11-03'),
(2, 6600.00, 'cash',   '2025-11-08'),
(3, 2400.00, 'upi',    '2025-11-04'),
(5,10000.00, 'card',   '2025-11-09'),
(6,10500.00, 'online', '2025-11-10'),
(7,22000.00, 'card',   '2025-11-05');

INSERT INTO staff (name, role, salary, phone, shift) VALUES
('Rajesh Kumar','Manager',35000.00,'9998887777','morning'),
('Anil Sharma','Receptionist',18000.00,'9997776666','morning'),
('Sonia Gupta','Receptionist',18000.00,'9996665555','evening'),
('Mohan Das','Cleaner',12000.00,'8887776666','morning'),
('Ravi Verma','Chef',25000.00,'7776665555','evening'),
('Seema Nair','Waitress',15000.00,'6665554444','night');

-- ---------- View ----------
CREATE OR REPLACE VIEW v_booking_details AS
SELECT 
  b.booking_id,
  c.name AS customer_name,
  c.city,
  r.room_number,
  r.type AS room_type,
  b.check_in, b.check_out,
  b.total_amount, b.status
FROM bookings b
JOIN customers c ON b.customer_id = c.customer_id
JOIN rooms r     ON b.room_id = r.room_id
ORDER BY b.created_at DESC;

-- ---------- Procedure ----------
DELIMITER //
CREATE PROCEDURE GetBookingsByCity(IN cityName VARCHAR(50))
BEGIN
  SELECT * FROM v_booking_details WHERE city = cityName;
END //
DELIMITER ;

-- ---------- Trigger ----------
DELIMITER //
CREATE TRIGGER trg_after_booking_insert
AFTER INSERT ON bookings
FOR EACH ROW
BEGIN
  UPDATE rooms SET status = 'occupied' WHERE room_id = NEW.room_id;
END //
DELIMITER ;

SELECT * FROM rooms;
SELECT * FROM customers;
SELECT * FROM bookings;

