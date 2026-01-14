/* eslint-disable react-hooks/immutability */
import React, { useState, useEffect } from "react";
import { Users, BookOpen, Trash2, Edit2, Save, X } from "lucide-react";

// ==================== SIMPLIFIED RDBMS CORE ====================

class SimpleRDBMS {
  constructor() {
    this.tables = {};
    this.indexes = {};
  }

  execute(sql) {
    const trimmed = sql.trim();

    if (trimmed.toUpperCase().startsWith("CREATE TABLE")) {
      return this.createTable(trimmed);
    } else if (trimmed.toUpperCase().startsWith("INSERT INTO")) {
      return this.insert(trimmed);
    } else if (trimmed.toUpperCase().startsWith("SELECT")) {
      return this.select(trimmed);
    } else if (trimmed.toUpperCase().startsWith("UPDATE")) {
      return this.update(trimmed);
    } else if (trimmed.toUpperCase().startsWith("DELETE")) {
      return this.delete(trimmed);
    }

    throw new Error("Unknown command");
  }

  createTable(sql) {
    const match = sql.match(/CREATE TABLE (\w+)\s*\((.*)\)/i);
    if (!match) throw new Error("Invalid CREATE TABLE syntax");

    const tableName = match[1];
    const columnDefs = match[2].split(",").map((c) => c.trim());

    const columns = [];
    const constraints = { primaryKey: null, unique: [] };

    columnDefs.forEach((def) => {
      const parts = def.split(/\s+/);
      const colName = parts[0];
      const colType = parts[1];

      columns.push({ name: colName, type: colType });

      if (def.toUpperCase().includes("PRIMARY KEY")) {
        constraints.primaryKey = colName;
      }
      if (def.toUpperCase().includes("UNIQUE")) {
        constraints.unique.push(colName);
      }
    });

    this.tables[tableName] = {
      columns,
      constraints,
      rows: [],
      nextId: 1,
    };

    return { success: true, message: `Table ${tableName} created` };
  }

  insert(sql) {
    const match = sql.match(
      /INSERT INTO (\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i
    );
    if (!match) throw new Error("Invalid INSERT syntax");

    const tableName = match[1];
    const columns = match[2].split(",").map((c) => c.trim());
    const values = this.parseValues(match[3]);

    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} does not exist`);

    const row = {};

    if (
      table.constraints.primaryKey &&
      !columns.includes(table.constraints.primaryKey)
    ) {
      row[table.constraints.primaryKey] = table.nextId++;
    }

    columns.forEach((col, i) => {
      row[col] = this.castValue(
        values[i],
        table.columns.find((c) => c.name === col)?.type
      );
    });

    if (table.constraints.primaryKey) {
      const pkValue = row[table.constraints.primaryKey];
      if (table.rows.some((r) => r[table.constraints.primaryKey] === pkValue)) {
        throw new Error("Primary key violation");
      }
    }

    table.constraints.unique.forEach((col) => {
      if (
        row[col] !== undefined &&
        table.rows.some((r) => r[col] === row[col])
      ) {
        throw new Error(`Unique constraint violation on ${col}`);
      }
    });

    table.rows.push(row);

    return { success: true, message: "Row inserted", rowsAffected: 1 };
  }

  select(sql) {
    const whereParts = sql.split(/WHERE/i);
    const selectPart = whereParts[0];
    const whereClause = whereParts[1]?.trim();

    const match = selectPart.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)/i);
    if (!match) throw new Error("Invalid SELECT syntax");

    const columns =
      match[1].trim() === "*" ? "*" : match[1].split(",").map((c) => c.trim());
    const tableName = match[2];

    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} does not exist`);

    let rows = [...table.rows];

    if (whereClause) {
      rows = rows.filter((row) => this.evaluateWhere(row, whereClause));
    }

    if (columns !== "*") {
      rows = rows.map((row) => {
        const projected = {};
        columns.forEach((col) => {
          projected[col] = row[col];
        });
        return projected;
      });
    }

    return { success: true, data: rows, rowCount: rows.length };
  }

  update(sql) {
    const match = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.*?)\s+WHERE\s+(.*)/i);
    if (!match) throw new Error("Invalid UPDATE syntax");

    const tableName = match[1];
    const setPart = match[2];
    const whereClause = match[3];

    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} does not exist`);

    const updates = {};
    setPart.split(",").forEach((s) => {
      const [col, val] = s.split("=").map((v) => v.trim());
      updates[col] = this.parseValue(val);
    });

    let count = 0;
    table.rows.forEach((row) => {
      if (this.evaluateWhere(row, whereClause)) {
        Object.assign(row, updates);
        count++;
      }
    });

    return {
      success: true,
      message: `Updated ${count} rows`,
      rowsAffected: count,
    };
  }

  delete(sql) {
    const match = sql.match(/DELETE FROM\s+(\w+)\s+WHERE\s+(.*)/i);
    if (!match) throw new Error("Invalid DELETE syntax");

    const tableName = match[1];
    const whereClause = match[2];

    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} does not exist`);

    const initialLength = table.rows.length;
    table.rows = table.rows.filter(
      (row) => !this.evaluateWhere(row, whereClause)
    );
    const deleted = initialLength - table.rows.length;

    return {
      success: true,
      message: `Deleted ${deleted} rows`,
      rowsAffected: deleted,
    };
  }

  evaluateWhere(row, whereClause) {
    const operators = {
      ">=": (a, b) => a >= b,
      "<=": (a, b) => a <= b,
      "!=": (a, b) => a != b,
      "=": (a, b) => a == b,
      ">": (a, b) => a > b,
      "<": (a, b) => a < b,
    };

    for (const [op, fn] of Object.entries(operators)) {
      if (whereClause.includes(op)) {
        const [col, val] = whereClause.split(op).map((s) => s.trim());
        return fn(row[col], this.parseValue(val));
      }
    }

    return true;
  }

  parseValues(str) {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === "'" || char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return values.map((v) => this.parseValue(v));
  }

  parseValue(val) {
    val = val.trim();
    if (
      (val.startsWith("'") && val.endsWith("'")) ||
      (val.startsWith('"') && val.endsWith('"'))
    ) {
      return val.slice(1, -1);
    }
    if (!isNaN(val) && val !== "") return Number(val);
    return val;
  }

  castValue(val, type) {
    if (type === "INTEGER") return parseInt(val);
    if (type === "REAL") return parseFloat(val);
    return String(val);
  }
}

// ==================== SIMPLE STUDENT MANAGEMENT WEBSITE ====================

export default function StudentManagementApp() {
  const [db] = useState(() => new SimpleRDBMS());
  const [students, setStudents] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    grade: "",
    email: "",
  });

  useEffect(() => {
    try {
      db.execute(
        "CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, age INTEGER, grade TEXT, email TEXT UNIQUE)"
      );

      db.execute(
        "INSERT INTO students (name, age, grade, email) VALUES ('John Doe', 20, 'A', 'john@school.com')"
      );
      db.execute(
        "INSERT INTO students (name, age, grade, email) VALUES ('Jane Smith', 22, 'B', 'jane@school.com')"
      );
      db.execute(
        "INSERT INTO students (name, age, grade, email) VALUES ('Bob Johnson', 19, 'A', 'bob@school.com')"
      );

      loadStudents();
    } catch (e) {
      console.error("Init error:", e);
    }
  }, []);

  const loadStudents = () => {
    try {
      const result = db.execute("SELECT * FROM students");
      setStudents(result.data || []);
    } catch (e) {
      console.error("Load error:", e);
      setStudents([]);
    }
  };

  const addStudent = () => {
    if (!formData.name || !formData.age || !formData.grade || !formData.email) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const query = `INSERT INTO students (name, age, grade, email) VALUES ('${formData.name}', ${formData.age}, '${formData.grade}', '${formData.email}')`;
      db.execute(query);

      setFormData({ name: "", age: "", grade: "", email: "" });
      loadStudents();
      alert("Student added successfully!");
    } catch (e) {
      alert("Error adding student: " + e.message);
    }
  };

  const startEdit = (student) => {
    setEditingId(student.id);
    setFormData({
      name: student.name,
      age: student.age,
      grade: student.grade,
      email: student.email,
    });
  };

  const saveEdit = () => {
    try {
      const query = `UPDATE students SET name = '${formData.name}', age = ${formData.age}, grade = '${formData.grade}', email = '${formData.email}' WHERE id = ${editingId}`;
      db.execute(query);

      setFormData({ name: "", age: "", grade: "", email: "" });
      setEditingId(null);
      loadStudents();
      alert("Student updated successfully!");
    } catch (e) {
      alert("Error updating student: " + e.message);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", age: "", grade: "", email: "" });
  };

  const deleteStudent = (id) => {
    if (!confirm("Are you sure you want to delete this student?")) {
      return;
    }

    try {
      db.execute(`DELETE FROM students WHERE id = ${id}`);
      loadStudents();
      alert("Student deleted successfully!");
    } catch (e) {
      alert("Error deleting student: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-10 h-10 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              Student Management System
            </h1>
          </div>
          <p className="text-gray-600">
            Add, edit, and manage student records using a simple database
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            {editingId ? "Edit Student" : "Add New Student"}
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Student Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Enter age"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Grade
                </label>
                <select
                  value={formData.grade}
                  onChange={(e) =>
                    setFormData({ ...formData, grade: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select grade</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="F">F</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="student@school.com"
                />
              </div>
            </div>

            {editingId ? (
              <div className="flex gap-3">
                <button
                  onClick={saveEdit}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={addStudent}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                Add Student
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            All Students ({students.length})
          </h2>

          {students.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No students found. Add one above!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      ID
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Age
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Grade
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-4 text-gray-600">{student.id}</td>
                      <td className="py-4 px-4 text-gray-800 font-medium">
                        {student.name}
                      </td>
                      <td className="py-4 px-4 text-gray-600">{student.age}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            student.grade === "A"
                              ? "bg-green-100 text-green-800"
                              : student.grade === "B"
                              ? "bg-blue-100 text-blue-800"
                              : student.grade === "C"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {student.grade}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {student.email}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(student)}
                            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteStudent(student.id)}
                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6 mt-6">
          <h3 className="font-bold text-indigo-900 mb-3">How This Works:</h3>
          <ul className="space-y-2 text-indigo-800">
            <li>
              <strong>CREATE:</strong> Fill the form and click "Add Student" to
              insert into database
            </li>
            <li>
              <strong>READ:</strong> All students are loaded from the database
              and displayed in the table
            </li>
            <li>
              <strong>UPDATE:</strong> Click the edit button (pencil icon) to
              modify a student's information
            </li>
            <li>
              <strong>DELETE:</strong> Click the delete button (trash icon) to
              remove a student
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
