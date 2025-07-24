const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Import database after middleware setup
const { query, end } = require('./database');

// Add new patient (POST route)
app.post('/api/patients', async (req, res) => {
    console.log('Received patient data:', req.body);
    
    const {
        full_name,
        phone_number,
        address,
        age,
        gender,
        date_of_birth,
        initial_diagnosis
    } = req.body;

    // Validation
    if (!full_name || !full_name.trim()) {
        console.log('Validation error: Full name is required');
        return res.status(400).json({ error: 'Full name is required' });
    }

    if (!gender) {
        console.log('Validation error: Gender is required');
        return res.status(400).json({ error: 'Gender is required' });
    }

    try {
        // Insert patient into database
        const result = await query(`
            INSERT INTO patients (
                full_name, 
                phone_number, 
                address, 
                age, 
                gender, 
                date_of_birth, 
                last_diagnosis
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [
            full_name.trim(),
            phone_number ? phone_number.trim() : null,
            address ? address.trim() : null,
            age || null,
            gender,
            date_of_birth || null,
            initial_diagnosis ? initial_diagnosis.trim() : null
        ]);

        console.log('Patient added successfully with ID:', result.rows[0].id);

        res.status(201).json({
            success: true,
            message: 'Patient added successfully',
            patientId: result.rows[0].id
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to add patient to database: ' + err.message });
    }
});

// Search patients by name
app.get('/api/patients/search', async (req, res) => {
    const searchName = req.query.name;
    
    if (!searchName) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await query(`
            SELECT *,
                   NULL as last_visit_date,
                   0 as visit_count
            FROM patients 
            WHERE full_name ILIKE $1 
            ORDER BY full_name
        `, [`%${searchName}%`]);
        
        res.json({ patients: result.rows });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Get all patients
app.get('/api/patients', async (req, res) => {
    const searchName = req.query.name;
    
    try {
        if (searchName) {
            const result = await query(`
                SELECT *,
                       NULL as last_visit_date,
                       0 as visit_count
                FROM patients 
                WHERE full_name ILIKE $1 
                ORDER BY full_name
            `, [`%${searchName}%`]);
            
            res.json(result.rows);
        } else {
            const result = await query(`
                SELECT *,
                       NULL as last_visit_date,
                       0 as visit_count
                FROM patients 
                ORDER BY full_name
            `);
            
            res.json({ patients: result.rows });
        }
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.delete('/api/patients/:id', async (req, res) => {
    const patientId = req.params.id;
    
    if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
    }

    try {
        // Check if patient exists
        const checkResult = await query('SELECT full_name FROM patients WHERE id = $1', [patientId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        
        // Delete the patient
        await query('DELETE FROM patients WHERE id = $1', [patientId]);
        
        res.json({
            success: true,
            message: `Patient "${checkResult.rows[0].full_name}" has been deleted successfully`
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to delete patient: ' + err.message });
    }
});

// Get patient count for dashboard
app.get('/api/patients/count', async (req, res) => {
    try {
        const result = await query('SELECT COUNT(*) as count FROM patients');
        res.json({ count: result.rows[0].count });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
    console.log('=================================');
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log('🌐 Open your browser and go to http://localhost:3000');
    console.log('=================================');
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please try a different port or stop the other server.`);
    } else {
        console.error('❌ Server failed to start:', err);
    }
    process.exit(1);
});

process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down server...');
    server.close(async () => {
        console.log('✅ Server closed.');
        try {
            await end();
            console.log('✅ Database connection pool closed.');
        } catch (err) {
            console.error('❌ Error closing database connection pool:', err);
        }
        process.exit(0);
    });
});