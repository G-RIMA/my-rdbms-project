# Simple Relational Database Management System (RDBMS)

A minimal relational database management system implemented in JavaScript with SQL support and a web-based interface.

## Author

[Your Name]

## Credits

- **Development Assistance**: Built with assistance from Claude (Anthropic AI) for code structure, debugging, and implementation guidance
- **Libraries Used**:
  - React (UI framework)
  - Vite (build tool)
  - Tailwind CSS (styling)
  - Lucide React (icons)

## Features Implemented

### Core RDBMS Features

- ✅ Table creation with schema definition
- ✅ Multiple column data types (INTEGER, TEXT, REAL)
- ✅ Primary key constraints with auto-increment
- ✅ Unique constraints
- ✅ Basic indexing (CREATE INDEX)
- ✅ CRUD operations (INSERT, SELECT, UPDATE, DELETE)
- ✅ JOIN support (INNER JOIN)
- ✅ WHERE clause filtering
- ✅ Data persistence using localStorage

### SQL Commands Supported

- `CREATE TABLE table_name (columns...)`
- `INSERT INTO table_name (cols) VALUES (vals)`
- `SELECT * FROM table_name WHERE condition`
- `UPDATE table_name SET col=val WHERE condition`
- `DELETE FROM table_name WHERE condition`
- `CREATE INDEX idx_name ON table_name (column)`
- `SHOW TABLES`
- `DESCRIBE table_name`

### User Interface

- **Student Management System**: Full CRUD interface for managing student records
- **SQL Console**: Interactive REPL for executing raw SQL commands
- Clean, modern UI with real-time updates

## Project Structure

```
my-rdbms-project/
├── src/
│   ├── database.js    # RDBMS core engine
│   ├── App.jsx        # Web application UI
│   ├── main.jsx       # React entry point
│   └── index.css      # Styling
├── package.json       # Dependencies
└── README.md         # This file
```

## Installation & Running

1. **Install Node.js** (if not already installed)

   - Download from: https://nodejs.org/

2. **Install dependencies:**

```bash
   npm install
```

3. **Run the development server:**

```bash
   npm run dev
```

4. **Open in browser:**
   - Navigate to `http://localhost:5173/`

## How It Works

### Database Engine (`database.js`)

The RDBMS core implements:

- **Table Management**: Stores table schemas with column definitions and constraints
- **SQL Parser**: Parses SQL commands using regex pattern matching
- **Query Execution**: Executes operations and enforces constraints
- **Persistence**: Saves/loads data from browser localStorage
- **Indexing**: Maintains hash-based indexes for faster lookups

### Data Storage

- **In-Memory**: Active data stored in JavaScript objects
- **Persistent**: Automatically saved to localStorage after write operations
- **Structure**: Tables contain schema metadata and row arrays

### Demo Application

The Student Management System demonstrates:

- **CREATE**: Add new students via form (INSERT INTO)
- **READ**: Display all students in table (SELECT)
- **UPDATE**: Edit student information (UPDATE)
- **DELETE**: Remove students (DELETE FROM)

## Example Usage

### Via SQL Console:

```sql
-- Create a table
CREATE TABLE courses (id INTEGER PRIMARY KEY, name TEXT, credits INTEGER)

-- Insert data
INSERT INTO courses (name, credits) VALUES ('Database Systems', 3)

-- Query data
SELECT * FROM courses WHERE credits >= 3

-- Update data
UPDATE courses SET credits = 4 WHERE name = 'Database Systems'

-- Delete data
DELETE FROM courses WHERE credits < 2

-- Show all tables
SHOW TABLES

-- Describe table structure
DESCRIBE courses
```

### Via Web Interface:

1. Click "Student Management" tab
2. Fill in the form (Name, Age, Grade, Email)
3. Click "Add Student"
4. View students in the table below
5. Click pencil icon to edit
6. Click trash icon to delete

## Technical Implementation Details

### Constraint Enforcement

- **Primary Keys**: Auto-increment, uniqueness checked on INSERT
- **Unique Constraints**: Validated before INSERT/UPDATE
- **Type Casting**: Values cast to column type (INTEGER, TEXT, REAL)

### Query Processing

1. SQL string parsed using regex
2. Command routed to appropriate handler
3. Validation performed (table exists, constraints met)
4. Operation executed on in-memory data
5. Changes saved to localStorage
6. Result returned to caller

### Join Implementation

- Uses nested loop join algorithm
- Matches rows based on join condition
- Returns combined result set with prefixed column names

## Limitations & Future Enhancements

### Current Limitations

- In-memory only (no true file system)
- Single-user (no concurrency control)
- Basic JOIN support (only INNER JOIN)
- No transactions or rollback
- No query optimization

### Possible Enhancements

- LEFT/RIGHT JOIN support
- GROUP BY and aggregate functions
- ORDER BY sorting
- LIMIT and OFFSET pagination
- Multiple WHERE conditions with AND/OR
- Foreign key constraints
- Transaction support

## Testing

To test the database:

1. **Test Persistence:**

   - Add a student
   - Refresh the page
   - Student should still be there

2. **Test Constraints:**

   - Try adding duplicate email (should fail)
   - Try adding student without required fields (should fail)

3. **Test SQL Console:**

   - Run `SHOW TABLES` to see all tables
   - Run `DESCRIBE students` to see schema
   - Run custom queries

4. **Test CRUD:**
   - Add multiple students
   - Edit one
   - Delete one
   - Verify changes persist

## License

This is a learning project created for educational purposes.

```

### **2. Add Comments to Your Code**

The code I provided already has good comments, but make sure both files (`database.js` and `App.jsx`) are well-commented.

### **3. Test Everything One More Time**

Open your app and test:

**Test 1: CRUD via UI**
- ✓ Add a student named "Test Student"
- ✓ Edit the student
- ✓ Delete the student

**Test 2: SQL Console**
- ✓ Run `SHOW TABLES`
- ✓ Run `DESCRIBE students`
- ✓ Run `SELECT * FROM students WHERE age > 20`
- ✓ Try to create an index: `CREATE INDEX idx_grade ON students (grade)`

**Test 3: Persistence**
- ✓ Add a student
- ✓ Refresh the page
- ✓ Student should still be there

**Test 4: Constraints**
- ✓ Try to add two students with the same email (should fail with "Unique constraint violation")

### **4. Create the README**

1. Create a new file in your project root called `README.md`
2. Copy the README content from above
3. Replace `[Your Name]` with your actual name
4. Save the file

---

## **Final Package Structure**

Your submission should have:
```

my-rdbms-project/
├── src/
│ ├── database.js ← RDBMS engine
│ ├── App.jsx ← Web UI
│ ├── main.jsx
│ └── index.css
├── package.json
├── README.md ← Documentation
└── tailwind.config.js
