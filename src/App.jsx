/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/immutability */
import React, { useState, useEffect } from "react";
import { Play, Database, Table, Plus } from "lucide-react";
import { SimpleRDBMS } from "./database";

export default function App() {
  const [db] = useState(() => new SimpleRDBMS());
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("repl");

  // Demo data for the task manager
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "Medium",
  });

  // Initialize demo tables
  useEffect(() => {
    try {
      db.execute(
        "CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT, description TEXT, priority TEXT, completed INTEGER, created_at TEXT)"
      );
      db.execute(
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE)"
      );
      db.execute(
        "INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')"
      );
      db.execute(
        "INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com')"
      );
      loadTasks();
    } catch (e) {
      console.error("Init error:", e);
    }
  }, []);

  const executeQuery = () => {
    try {
      const res = db.execute(query);
      setResult(res);

      if (query.toUpperCase().includes("TASKS")) {
        loadTasks();
      }
    } catch (error) {
      setResult({ success: false, error: error.message });
    }
  };

  const loadTasks = () => {
    try {
      const res = db.execute("SELECT * FROM tasks");
      setTasks(res.data || []);
    } catch (e) {
      setTasks([]);
    }
  };

  const addTask = () => {
    if (!newTask.title) return;

    const now = new Date().toISOString();
    const query = `INSERT INTO tasks (title, description, priority, completed, created_at) VALUES ('${newTask.title}', '${newTask.description}', '${newTask.priority}', 0, '${now}')`;

    try {
      db.execute(query);
      setNewTask({ title: "", description: "", priority: "Medium" });
      loadTasks();
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const toggleTask = (id) => {
    try {
      const task = tasks.find((t) => t.id === id);
      const newCompleted = task.completed ? 0 : 1;
      db.execute(
        `UPDATE tasks SET completed = ${newCompleted} WHERE id = ${id}`
      );
      loadTasks();
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const deleteTask = (id) => {
    try {
      db.execute(`DELETE FROM tasks WHERE id = ${id}`);
      loadTasks();
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const exampleQueries = [
    "SHOW TABLES",
    "DESCRIBE tasks",
    "SELECT * FROM tasks",
    "SELECT * FROM users",
    "INSERT INTO tasks (title, description, priority, completed, created_at) VALUES ('Learn SQL', 'Study database basics', 'High', 0, '2026-01-13')",
    "UPDATE tasks SET completed = 1 WHERE id = 1",
    "DELETE FROM tasks WHERE completed = 1",
    "CREATE INDEX idx_priority ON tasks (priority)",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-white" />
              <h1 className="text-3xl font-bold text-white">Simple RDBMS</h1>
            </div>
            <p className="text-purple-100 mt-2">
              A minimal relational database with SQL support
            </p>
          </div>

          <div className="flex border-b border-white/20">
            <button
              onClick={() => setActiveTab("repl")}
              className={`flex-1 px-6 py-3 font-semibold transition ${
                activeTab === "repl"
                  ? "bg-white/20 text-white border-b-2 border-purple-400"
                  : "text-purple-200 hover:bg-white/5"
              }`}
            >
              SQL REPL
            </button>
            <button
              onClick={() => setActiveTab("app")}
              className={`flex-1 px-6 py-3 font-semibold transition ${
                activeTab === "app"
                  ? "bg-white/20 text-white border-b-2 border-purple-400"
                  : "text-purple-200 hover:bg-white/5"
              }`}
            >
              Task Manager Demo
            </button>
          </div>

          {activeTab === "repl" && (
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-purple-200 font-semibold mb-2">
                  Enter SQL Query:
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full h-32 bg-slate-800/50 text-white border border-purple-500/30 rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="SELECT * FROM users"
                />
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={executeQuery}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition"
                >
                  <Play className="w-4 h-4" />
                  Execute
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-purple-200 font-semibold mb-2">
                  Example Queries:
                </label>
                <div className="flex flex-wrap gap-2">
                  {exampleQueries.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(q)}
                      className="bg-slate-700/50 text-purple-200 px-3 py-1 rounded text-xs hover:bg-slate-600/50 transition"
                    >
                      {q.substring(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>

              {result && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/30">
                  <h3 className="text-purple-200 font-semibold mb-2">
                    Result:
                  </h3>
                  {result.success ? (
                    result.data ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-purple-500/30">
                              {Object.keys(result.data[0] || {}).map((col) => (
                                <th
                                  key={col}
                                  className="text-left text-purple-300 py-2 px-3"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {result.data.map((row, i) => (
                              <tr
                                key={i}
                                className="border-b border-purple-500/10 hover:bg-white/5"
                              >
                                {Object.values(row).map((val, j) => (
                                  <td key={j} className="text-white py-2 px-3">
                                    {String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="text-purple-300 text-xs mt-2">
                          {result.rowCount} rows
                        </p>
                      </div>
                    ) : (
                      <p className="text-green-400">{result.message}</p>
                    )
                  ) : (
                    <p className="text-red-400">Error: {result.error}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "app" && (
            <div className="p-6">
              <div className="bg-slate-800/50 rounded-lg p-6 mb-6 border border-purple-500/30">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Task
                </h2>
                <div className="grid gap-4">
                  <input
                    type="text"
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    className="bg-slate-700/50 text-white border border-purple-500/30 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    className="bg-slate-700/50 text-white border border-purple-500/30 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <select
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({ ...newTask, priority: e.target.value })
                    }
                    className="bg-slate-700/50 text-white border border-purple-500/30 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                  <button
                    onClick={addTask}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition"
                  >
                    Add Task
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Table className="w-5 h-5" />
                  Tasks ({tasks.length})
                </h2>
                {tasks.length === 0 ? (
                  <p className="text-purple-300 text-center py-8">
                    No tasks yet. Add one above!
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/30 hover:border-purple-500/50 transition"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.completed === 1}
                          onChange={() => toggleTask(task.id)}
                          className="mt-1 w-5 h-5 rounded"
                        />
                        <div className="flex-1">
                          <h3
                            className={`font-semibold ${
                              task.completed
                                ? "line-through text-purple-400"
                                : "text-white"
                            }`}
                          >
                            {task.title}
                          </h3>
                          <p className="text-purple-300 text-sm mt-1">
                            {task.description}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                task.priority === "High"
                                  ? "bg-red-500/20 text-red-300"
                                  : task.priority === "Medium"
                                  ? "bg-yellow-500/20 text-yellow-300"
                                  : "bg-green-500/20 text-green-300"
                              }`}
                            >
                              {task.priority}
                            </span>
                            <span className="text-xs text-purple-400">
                              ID: {task.id}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-red-400 hover:text-red-300 transition text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white/5 backdrop-blur-lg rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold mb-2">
            Features Implemented:
          </h3>
          <ul className="text-purple-200 text-sm space-y-1">
            <li>✓ CREATE TABLE with INTEGER and TEXT types</li>
            <li>✓ PRIMARY KEY and UNIQUE constraints</li>
            <li>✓ INSERT, SELECT, UPDATE, DELETE operations</li>
            <li>✓ WHERE clauses with comparison operators</li>
            <li>✓ Basic JOIN support (INNER JOIN)</li>
            <li>✓ CREATE INDEX for performance optimization</li>
            <li>✓ Interactive SQL REPL</li>
            <li>✓ Practical demo: Task Manager web app</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
