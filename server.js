const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Import database after middleware setup
const db = require('./database');

// Add new patient (POST route)
app.post('/api/patients', (req, res) => {
    console.log('Received patient data:', req.body); // Debug log
    
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

    // Insert patient into database
    const query = `
        INSERT INTO patients (
            full_name, 
            phone_number, 
            address, 
            age, 
            gender, 
            date_of_birth, 
            last_diagnosis
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        full_name.trim(),
        phone_number ? phone_number.trim() : null,
        address ? address.trim() : null,
        age || null,
        gender,
        date_of_birth || null,
        initial_diagnosis ? initial_diagnosis.trim() : null  // Fixed: changed from last_diagnosis to initial_diagnosis
    ];

    console.log('Executing query with values:', values); // Debug log

    db.run(query, values, function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to add patient to database: ' + err.message });
        }

        console.log('Patient added successfully with ID:', this.lastID); // Debug log

        // Return success with the new patient ID
        res.status(201).json({
            success: true,
            message: 'Patient added successfully',
            patientId: this.lastID
        });
    });
});

// Search patients by name
app.get('/api/patients/search', (req, res) => {
    const searchName = req.query.name;
    
    if (!searchName) {
        return res.status(400).json({ error: 'Name is required' });
    }

    // Search for patients with names containing the search term
    const query = `
        SELECT *,
               NULL as last_visit_date,
               0 as visit_count
        FROM patients 
        WHERE full_name LIKE ? 
        ORDER BY full_name
    `;
    
    db.all(query, [`%${searchName}%`], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        res.json({ patients: rows });
    });
});

// Get all patients (for testing and search)
app.get('/api/patients', (req, res) => {
    const searchName = req.query.name;
    
    if (searchName) {
        // If there's a search parameter, search for patients
        const query = `
            SELECT *,
                   NULL as last_visit_date,
                   0 as visit_count
            FROM patients 
            WHERE full_name LIKE ? 
            ORDER BY full_name
        `;
        
        db.all(query, [`%${searchName}%`], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            res.json(rows); // Return just the array for the search functionality
        });
    } else {
        // Return all patients
        const query = `
            SELECT *,
                   NULL as last_visit_date,
                   0 as visit_count
            FROM patients 
            ORDER BY full_name
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            res.json({ patients: rows });
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.delete('/api/patients/:id', (req, res) => {
    const patientId = req.params.id;
    
    if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
    }

    const checkQuery = 'SELECT full_name FROM patients WHERE id = ?';
    
    db.get(checkQuery, [patientId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        
        // Delete the patient
        const deleteQuery = 'DELETE FROM patients WHERE id = ?';
        
        db.run(deleteQuery, [patientId], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to delete patient: ' + err.message });
            }
            
            res.json({
                success: true,
                message: `Patient "${row.full_name}" has been deleted successfully`
            });
        });
    });
});

// Get patient count for dashboard
app.get('/api/patients/count', (req, res) => {
    const query = 'SELECT COUNT(*) as count FROM patients';
    
    db.get(query, [], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        res.json({ count: row.count });
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
    console.log('=================================');
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log('✅ Database connected successfully');
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

process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed.');
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err);
            } else {
                console.log('✅ Database closed.');
            }
            process.exit(0);
        });
    });
}); 