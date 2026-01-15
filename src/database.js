/* eslint-disable no-unused-vars */
export class SimpleRDBMS {
  constructor() {
    this.tables = {};
    this.indexes = {};
    this.dataDir = "rdbms_data";
    this.loadFromStorage();
  }

  // Save database to localStorage (browser's persistent storage)
  saveToStorage() {
    try {
      const data = {
        tables: this.tables,
        indexes: this.indexes,
      };
      localStorage.setItem("rdbms_database", JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save to storage:", e);
    }
  }

  // Load database from localStorage
  loadFromStorage() {
    try {
      const stored = localStorage.getItem("rdbms_database");
      if (stored) {
        const data = JSON.parse(stored);
        this.tables = data.tables || {};
        this.indexes = data.indexes || {};
      }
    } catch (e) {
      console.error("Failed to load from storage:", e);
    }
  }

  // Main entry point - parse and execute SQL commands
  execute(sql) {
    const trimmed = sql.trim();
    let result;

    if (trimmed.toUpperCase().startsWith("CREATE TABLE")) {
      result = this.createTable(trimmed);
    } else if (trimmed.toUpperCase().startsWith("INSERT INTO")) {
      result = this.insert(trimmed);
    } else if (trimmed.toUpperCase().startsWith("SELECT")) {
      result = this.select(trimmed);
    } else if (trimmed.toUpperCase().startsWith("UPDATE")) {
      result = this.update(trimmed);
    } else if (trimmed.toUpperCase().startsWith("DELETE")) {
      result = this.delete(trimmed);
    } else if (trimmed.toUpperCase().startsWith("CREATE INDEX")) {
      result = this.createIndex(trimmed);
    } else if (trimmed.toUpperCase().startsWith("SHOW TABLES")) {
      result = this.showTables();
    } else if (trimmed.toUpperCase().startsWith("DESCRIBE")) {
      result = this.describeTable(trimmed);
    } else {
      throw new Error("Unknown command: " + trimmed);
    }

    // Save after any write operation
    if (
      !trimmed.toUpperCase().startsWith("SELECT") &&
      !trimmed.toUpperCase().startsWith("SHOW") &&
      !trimmed.toUpperCase().startsWith("DESCRIBE")
    ) {
      this.saveToStorage();
    }

    return result;
  }

  // CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE)
  createTable(sql) {
    const match = sql.match(/CREATE TABLE (\w+)\s*\((.*)\)/i);
    if (!match) throw new Error("Invalid CREATE TABLE syntax");

    const tableName = match[1];
    const columnDefs = match[2].split(",").map((c) => c.trim());

    const columns = [];
    const constraints = {
      primaryKey: null,
      unique: [],
    };

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

  // INSERT INTO users (name, email) VALUES ('John', 'john@email.com')
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

    // Auto-increment primary key if not provided
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

    // Validate primary key uniqueness
    if (table.constraints.primaryKey) {
      const pkValue = row[table.constraints.primaryKey];
      if (table.rows.some((r) => r[table.constraints.primaryKey] === pkValue)) {
        throw new Error("Primary key violation: duplicate key value");
      }
    }

    // Validate unique constraints
    table.constraints.unique.forEach((col) => {
      if (
        row[col] !== undefined &&
        table.rows.some((r) => r[col] === row[col])
      ) {
        throw new Error(`Unique constraint violation on column: ${col}`);
      }
    });

    table.rows.push(row);

    // Update any indexes
    Object.keys(this.indexes).forEach((indexKey) => {
      const [tbl, col] = indexKey.split(".");
      if (tbl === tableName) {
        this.updateIndex(indexKey, row);
      }
    });

    return { success: true, message: "Row inserted", rowsAffected: 1 };
  }

  // SELECT * FROM users WHERE age > 25
  select(sql) {
    const whereParts = sql.split(/WHERE/i);
    const selectPart = whereParts[0];
    const whereClause = whereParts[1]?.trim();

    const joinMatch = selectPart.match(
      /FROM\s+(\w+)\s+JOIN\s+(\w+)\s+ON\s+([\w.]+)\s*=\s*([\w.]+)/i
    );

    if (joinMatch) {
      return this.selectJoin(sql, joinMatch);
    }

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

  // Handle JOIN queries
  selectJoin(sql, joinMatch) {
    const table1Name = joinMatch[1];
    const table2Name = joinMatch[2];
    const [joinCol1Table, joinCol1] = joinMatch[3].split(".");
    const [joinCol2Table, joinCol2] = joinMatch[4].split(".");

    const table1 = this.tables[table1Name];
    const table2 = this.tables[table2Name];

    if (!table1 || !table2) throw new Error("Table not found in JOIN");

    const results = [];

    // Nested loop join
    table1.rows.forEach((row1) => {
      table2.rows.forEach((row2) => {
        if (row1[joinCol1] === row2[joinCol2]) {
          const joined = {};
          Object.keys(row1).forEach((k) => {
            joined[`${table1Name}.${k}`] = row1[k];
          });
          Object.keys(row2).forEach((k) => {
            joined[`${table2Name}.${k}`] = row2[k];
          });
          results.push(joined);
        }
      });
    });

    return { success: true, data: results, rowCount: results.length };
  }

  // UPDATE users SET age = 31 WHERE name = 'John'
  update(sql) {
    const match = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.*?)\s+WHERE\s+(.*)/i);
    if (!match)
      throw new Error("Invalid UPDATE syntax - must include WHERE clause");

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
      message: `Updated ${count} row(s)`,
      rowsAffected: count,
    };
  }

  // DELETE FROM users WHERE age < 18
  delete(sql) {
    const match = sql.match(/DELETE FROM\s+(\w+)\s+WHERE\s+(.*)/i);
    if (!match)
      throw new Error("Invalid DELETE syntax - must include WHERE clause");

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
      message: `Deleted ${deleted} row(s)`,
      rowsAffected: deleted,
    };
  }

  // CREATE INDEX idx_email ON users (email)
  createIndex(sql) {
    const match = sql.match(/CREATE INDEX\s+(\w+)\s+ON\s+(\w+)\s*\((\w+)\)/i);
    if (!match) throw new Error("Invalid CREATE INDEX syntax");

    const indexName = match[1];
    const tableName = match[2];
    const columnName = match[3];

    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} does not exist`);

    const indexKey = `${tableName}.${columnName}`;
    this.indexes[indexKey] = {};

    // Build index from existing rows
    table.rows.forEach((row) => {
      this.updateIndex(indexKey, row);
    });

    return {
      success: true,
      message: `Index ${indexName} created on ${tableName}(${columnName})`,
    };
  }

  // Add row to index
  updateIndex(indexKey, row) {
    const [tableName, columnName] = indexKey.split(".");
    const value = row[columnName];

    if (!this.indexes[indexKey][value]) {
      this.indexes[indexKey][value] = [];
    }
    this.indexes[indexKey][value].push(row);
  }

  // SHOW TABLES
  showTables() {
    const tables = Object.keys(this.tables).map((name) => ({
      table_name: name,
    }));
    return { success: true, data: tables, rowCount: tables.length };
  }

  // DESCRIBE users
  describeTable(sql) {
    const match = sql.match(/DESCRIBE\s+(\w+)/i);
    if (!match) throw new Error("Invalid DESCRIBE syntax");

    const tableName = match[1];
    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} does not exist`);

    const schema = table.columns.map((col) => ({
      column: col.name,
      type: col.type,
      key:
        col.name === table.constraints.primaryKey
          ? "PRI"
          : table.constraints.unique.includes(col.name)
          ? "UNI"
          : "",
    }));

    return { success: true, data: schema, rowCount: schema.length };
  }

  // Evaluate WHERE conditions
  evaluateWhere(row, whereClause) {
    const operators = {
      ">=": (a, b) => a >= b,
      "<=": (a, b) => a <= b,
      "!=": (a, b) => a != b,
      "=": (a, b) => a == b,
      ">": (a, b) => a > b,
      "<": (a, b) => a < b,
    };

    // Check operators in order (longer first to avoid conflicts)
    for (const [op, fn] of Object.entries(operators)) {
      if (whereClause.includes(op)) {
        const [col, val] = whereClause.split(op).map((s) => s.trim());
        return fn(row[col], this.parseValue(val));
      }
    }

    return true;
  }

  // Parse VALUES clause
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

  // Parse a single value
  parseValue(val) {
    val = val.trim();
    // Remove quotes from strings
    if (
      (val.startsWith("'") && val.endsWith("'")) ||
      (val.startsWith('"') && val.endsWith('"'))
    ) {
      return val.slice(1, -1);
    }
    // Convert to number if numeric
    if (!isNaN(val) && val !== "") return Number(val);
    return val;
  }

  // Cast value to correct type
  castValue(val, type) {
    if (type === "INTEGER") return parseInt(val);
    if (type === "REAL") return parseFloat(val);
    return String(val);
  }
}
