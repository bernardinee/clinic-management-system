const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Function to parse CSV (simple CSV parser)
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const patients = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const patient = {};
      
      headers.forEach((header, index) => {
        patient[header] = values[index] || null;
      });
      
      patients.push(patient);
    }
  }
  
  return patients;
}

// Function to import patients from CSV
async function importFromCSV(csvFilePath) {
  const client = await pool.connect();
  
  try {
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error(`❌ File not found: ${csvFilePath}`);
      return;
    }
    
    console.log(`📁 Reading CSV file: ${csvFilePath}`);
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    const patients = parseCSV(csvContent);
    
    if (patients.length === 0) {
      console.log('⚠️  No patients found in CSV file.');
      return;
    }
    
    console.log(`📊 Found ${patients.length} patients in CSV file.`);
    console.log('🌱 Starting import...');
    
    // Clear existing data before importing
    console.log('🗑️  Clearing existing data...');
    await client.query('DELETE FROM patients');
    console.log('✅ Cleared existing data');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const patient of patients) {
      try {
        // Map CSV columns to database columns (adjust as needed)
        await client.query(`
          INSERT INTO patients (
            full_name, 
            phone_number, 
            address, 
            age, 
            gender, 
            date_of_birth, 
            last_diagnosis
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          patient.full_name || patient.name || null,
          patient.phone_number || patient.phone || null,
          patient.address || patient.location || null,
          patient.age ? parseInt(patient.age) : null,
          patient.gender || null,
          patient.date_of_birth || patient.dob || null,
          patient.last_diagnosis || patient.diagnosis || null
        ]);
        
        console.log(`✅ Imported: ${patient.full_name || patient.name}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to import ${patient.full_name || patient.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`✅ Successfully imported: ${successCount} patients`);
    console.log(`❌ Failed to import: ${errorCount} patients`);
    
  } catch (error) {
    console.error('❌ Error during CSV import:', error);
  } finally {
    client.release();
    await pool.end();
    console.log('🔚 Database connection closed.');
  }
}

// Get CSV file path from command line argument
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.log('Usage: node import-csv.js <path-to-csv-file>');
  console.log('Example: node import-csv.js patients.csv');
  console.log('\nCSV file should have columns:');
  console.log('full_name,phone_number,address,age,gender,date_of_birth,last_diagnosis');
} else {
  importFromCSV(csvFilePath);
}