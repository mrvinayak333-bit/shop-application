const supabase = require('./supabase');

/**
 * ⚡ SUPABASE SQL ADAPTER (V4 - ULTRA PRO)
 * Bridges complex SQL patterns to Supabase PostgREST.
 * Handles SELECT, JOIN, COUNT, INSERT, UPDATE, DELETE with advanced parsing.
 */
const poolWrapper = {
  async query(sql, params = []) {
    const trimmedSql = sql.trim().replace(/\s+/g, ' ');
    const upperSql = trimmedSql.toUpperCase();

    try {
      // 1. Metadata / Discovery (Skip for Supabase)
      if (upperSql.includes('INFORMATION_SCHEMA') || upperSql.includes('DESCRIBE') || upperSql.includes('SHOW TABLES')) {
        return [[], null];
      }

      // 2. SELECT Pattern
      if (upperSql.startsWith('SELECT')) {
        // Detect table
        const fromMatch = trimmedSql.match(/FROM\s+([A-Za-z0-9_"`]+)/i);
        if (!fromMatch) return [[], null];
        const table = fromMatch[1].replace(/['"`]/g, '').toLowerCase();

        // COUNT(*) handler: SELECT COUNT(*) as cnt FROM table
        const countMatch = trimmedSql.match(/SELECT\s+COUNT\(\*\)\s+as\s+(\w+)/i);
        if (countMatch) {
          const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
          if (error) throw error;
          return [[{ [countMatch[1]]: count }], null];
        }

        // Deep Selection (Joins)
        let selectStr = '*';
        if (upperSql.includes('JOIN')) {
          const joinMatches = [...trimmedSql.matchAll(/JOIN\s+([A-Za-z0-9_]+)/gi)];
          if (joinMatches.length > 0) {
            const joinedTables = joinMatches.map(m => m[1].toLowerCase() + '(*)').join(',');
            selectStr = `*, ${joinedTables}`;
          }
        }

        let query = supabase.from(table).select(selectStr);

        // WHERE Clause Parser
        const whereMatch = trimmedSql.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|GROUP BY|$)/i);
        if (whereMatch) {
          const whereContent = whereMatch[1];
          // Handle complex conditions
          const conditions = whereContent.split(/\s+AND\s+/i);
          let pIdx = 0;

          for (let cond of conditions) {
            cond = cond.trim();

            // NOT IN
            if (cond.toUpperCase().includes('NOT IN')) {
              const match = cond.match(/(\w+)\s+NOT IN\s+\(([^)]+)\)/i);
              if (match) {
                const field = match[1].trim().split('.').pop().replace(/['"`]/g, '');
                const vals = match[2].split(',').map(v => v.trim().replace(/['"`]/g, ''));
                query = query.not(field, 'in', `(${vals.join(',')})`);
                continue;
              }
            }

            // IN
            if (cond.toUpperCase().includes(' IN ')) {
              const match = cond.match(/(\w+)\s+IN\s+\(([^)]+)\)/i);
              if (match) {
                const field = match[1].trim().split('.').pop().replace(/['"`]/g, '');
                let vals = match[2].trim();
                if (vals === '?') {
                  vals = params[pIdx++];
                } else {
                  vals = vals.split(',').map(v => v.trim().replace(/['"`]/g, ''));
                }
                query = query.in(field, Array.isArray(vals) ? vals : [vals]);
                continue;
              }
            }

            // LIKE
            if (cond.toUpperCase().includes(' LIKE ')) {
              const match = cond.match(/(\w+)\s+LIKE\s+(.+)/i);
              if (match) {
                const field = match[1].trim().split('.').pop().replace(/['"`]/g, '');
                let val = match[2].trim();
                if (val === '?') val = params[pIdx++];
                else val = val.replace(/['"`%]/g, '');
                query = query.ilike(field, `%${val}%`);
                continue;
              }
            }

            // Basic operators: =, !=, >, <, >=, <=
            const opMatch = cond.match(/(\w+)\s*(=|!=|<>|>|<|>=|<=)\s*(.+)/i);
            if (opMatch) {
              const field = opMatch[1].trim().split('.').pop().replace(/['"`]/g, '');
              const op = opMatch[2] === '<>' ? 'neq' : opMatch[2];
              let val = opMatch[3].trim();

              if (val === '?') {
                val = params[pIdx++];
              } else {
                val = val.replace(/['"`]/g, '');
              }

              if (val === 'NULL') {
                if (op === '=') query = query.is(field, null);
                else query = query.not(field, 'is', null);
              } else {
                switch(op) {
                  case '=': query = query.eq(field, val); break;
                  case '!=':
                  case 'neq': query = query.neq(field, val); break;
                  case '>': query = query.gt(field, val); break;
                  case '<': query = query.lt(field, val); break;
                  case '>=': query = query.gte(field, val); break;
                  case '<=': query = query.lte(field, val); break;
                }
              }
            }
          }
        }

        // ORDER BY
        const orderMatch = trimmedSql.match(/ORDER BY\s+([A-Za-z0-9_.]+)\s+(ASC|DESC)/i);
        if (orderMatch) {
          query = query.order(orderMatch[1].split('.').pop().toLowerCase(), {
            ascending: orderMatch[2].toUpperCase() === 'ASC'
          });
        }

        // LIMIT
        const limitMatch = trimmedSql.match(/LIMIT\s+(\d+|\?)/i);
        if (limitMatch) {
          const limit = limitMatch[1] === '?' ? params[params.length - 1] : parseInt(limitMatch[1]);
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Post-processing for Joins (Flattening)
        if (data && upperSql.includes('JOIN')) {
          data.forEach(row => {
            Object.keys(row).forEach(key => {
              if (typeof row[key] === 'object' && row[key] !== null && !Array.isArray(row[key])) {
                Object.keys(row[key]).forEach(subKey => {
                  row[`${key}_${subKey}`] = row[key][subKey];
                });
                // Compatibility: also allow row.table.field
              }
            });
          });
        }

        return [data || [], null];
      }

      // 3. INSERT Pattern
      if (upperSql.startsWith('INSERT')) {
        const intoMatch = trimmedSql.match(/INSERT\s+INTO\s+([A-Za-z0-9_]+)\s*\((.+?)\)\s*VALUES\s*\((.+?)\)/i);
        if (intoMatch) {
          const table = intoMatch[1].toLowerCase();
          const fields = intoMatch[2].split(',').map(f => f.trim().replace(/['"`]/g, ''));
          const row = {};
          fields.forEach((f, i) => {
            let val = params[i];
            // Handle basic SQL functions in values if passed as strings (rare in this project)
            row[f] = val;
          });

          const { data, error } = await supabase.from(table).insert(row).select();
          if (error) throw error;
          return [{ insertId: data?.[0]?.id, affectedRows: 1 }, null];
        }
      }

      // 4. UPDATE Pattern
      if (upperSql.startsWith('UPDATE')) {
        const updateMatch = trimmedSql.match(/UPDATE\s+([A-Za-z0-9_]+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
        if (updateMatch) {
          const table = updateMatch[1].toLowerCase();
          const setParts = updateMatch[2].split(',');
          const updates = {};
          let pIdx = 0;
          setParts.forEach(part => {
            const field = part.split('=')[0].trim().replace(/['"`]/g, '');
            updates[field] = params[pIdx++];
          });

          let query = supabase.from(table).update(updates);
          const whereParts = updateMatch[3].split(/\s+AND\s+/i);
          whereParts.forEach(part => {
            const opMatch = part.match(/(\w+)\s*(=|!=|<>|>|<|>=|<=)\s*(.+)/i);
            if (opMatch) {
              const field = opMatch[1].trim().replace(/['"`]/g, '');
              const op = opMatch[2] === '<>' ? 'neq' : opMatch[2];
              let val = opMatch[3].trim();
              if (val === '?') val = params[pIdx++];
              else val = val.replace(/['"`]/g, '');

              switch(op) {
                case '=': query = query.eq(field, val); break;
                case '!=':
                case 'neq': query = query.neq(field, val); break;
              }
            }
          });

          const { data, error } = await query.select();
          if (error) throw error;
          return [{ affectedRows: data?.length || 0 }, null];
        }
      }

      // 5. DELETE Pattern
      if (upperSql.startsWith('DELETE')) {
        const fromMatch = trimmedSql.match(/FROM\s+([A-Za-z0-9_]+)/i);
        if (fromMatch) {
          const table = fromMatch[1].toLowerCase();
          let query = supabase.from(table).delete();
          const whereMatch = trimmedSql.match(/WHERE\s+(.+)/i);
          if (whereMatch) {
            const field = whereMatch[1].split('=')[0].trim().replace(/['"`]/g, '');
            query = query.eq(field, params[0]);
          }
          const { data, error } = await query.select();
          if (error) throw error;
          return [{ affectedRows: data?.length || 0 }, null];
        }
      }

      return [[], null];

    } catch (err) {
      console.error('❌ Supabase Adapter Error:', err.message, '\nSQL:', sql);
      throw err;
    }
  },

  async getConnection() {
    return {
      query: (sql, params) => this.query(sql, params),
      release: () => {},
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {}
    };
  },

  async testConnection() {
    try {
      const { error } = await supabase.from('master_users').select('id').limit(1);
      if (error && error.code !== 'PGRST116') throw error;
      console.log('✅ Supabase Bridge Online');
      return true;
    } catch (err) {
      return false;
    }
  }
};

module.exports = poolWrapper;
module.exports.testConnection = poolWrapper.testConnection;
