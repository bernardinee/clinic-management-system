// const { Pool } = require('pg');
// require('dotenv').config(); // For local development with .env file
const { Pool } = require('pg');
// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}



// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to PostgreSQL database at:', res.rows[0].now);
  }
});

// Create tables if they don't exist
async function initializeDatabase() {
  try {
    // Create patients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone_number TEXT,
        address TEXT,
        age INTEGER,
        gender TEXT NOT NULL,
        date_of_birth TEXT,
        last_diagnosis TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Patients table ready');

    // Create visits table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        visit_date DATE DEFAULT CURRENT_DATE,
        diagnosis TEXT,
        treatment TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Visits table ready');
  } catch (err) {
    console.error('❌ Error creating tables:', err.message);
    process.exit(1);
  }
}

// Initialize the database
initializeDatabase();

// Export the pool for use in other files
module.exports = {
  query: (text, params) => pool.query(text, params),
  end: () => pool.end()
};