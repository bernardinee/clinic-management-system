const { Pool } = require('pg');
// Debug all environment variables
console.log('All DATABASE related env vars:');
Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('DB')).forEach(key => {
  console.log(`${key}: ${process.env[key]?.substring(0, 40)}...`);
});
// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Force Supabase URL in production - TEMPORARY FIX FOR INTERVIEW
const DATABASE_URL = process.env.NODE_ENV === 'production' 
  ? 'postgresql://postgres:okrahbernardine123@db.brtdvkdejsddxazkwjht.supabase.co:5432/postgres'
  : process.env.DATABASE_URL;

// Debug logging
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Using DATABASE_URL starts with:', DATABASE_URL ? DATABASE_URL.substring(0, 30) : 'NONE');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to PostgreSQL database at:', res.rows[0].now);
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
    console.log('Patients table ready');

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
    console.log('Visits table ready');
  } catch (err) {
    console.error('Error creating tables:', err.message);
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