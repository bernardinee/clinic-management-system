const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS configuration for production
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.CORS_ORIGIN || true
        : true,
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Security headers for production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });
}

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

    // Enhanced validation
    if (!full_name || !full_name.trim()) {
        console.log('Validation error: Full name is required');
        return res.status(400).json({ 
            error: 'Full name is required',
            field: 'full_name'
        });
    }

    if (!gender) {
        console.log('Validation error: Gender is required');
        return res.status(400).json({ 
            error: 'Gender is required',
            field: 'gender'
        });
    }

    // Validate age if provided
    if (age !== null && age !== undefined && (age < 0 || age > 150)) {
        return res.status(400).json({
            error: 'Age must be between 0 and 150',
            field: 'age'
        });
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
            RETURNING id, full_name
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
            patientId: result.rows[0].id,
            patientName: result.rows[0].full_name
        });
    } catch (err) {
        console.error('Database error:', err);
        
        // Handle specific PostgreSQL errors
        if (err.code === '23505') { // Unique constraint violation
            res.status(409).json({ 
                error: 'A patient with this information already exists',
                code: 'DUPLICATE_PATIENT'
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to add patient to database',
                code: 'DATABASE_ERROR'
            });
        }
    }
});

// NEW: Get single patient by ID for editing
app.get('/api/patients/:id', async (req, res) => {
    const patientId = req.params.id;
    
    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: 'Valid patient ID is required' });
    }

    try {
        const result = await query('SELECT * FROM patients WHERE id = $1', [patientId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        
        res.json({
            success: true,
            patient: result.rows[0]
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to fetch patient' });
    }
});

// NEW: Update patient (PUT route)
app.put('/api/patients/:id', async (req, res) => {
    const patientId = req.params.id;
    
    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: 'Valid patient ID is required' });
    }

    const {
        full_name,
        phone_number,
        address,
        age,
        gender,
        date_of_birth,
        last_diagnosis
    } = req.body;

    // Enhanced validation
    if (!full_name || !full_name.trim()) {
        return res.status(400).json({ 
            error: 'Full name is required',
            field: 'full_name'
        });
    }

    if (!gender) {
        return res.status(400).json({ 
            error: 'Gender is required',
            field: 'gender'
        });
    }

    // Validate age if provided
    if (age !== null && age !== undefined && (age < 0 || age > 150)) {
        return res.status(400).json({
            error: 'Age must be between 0 and 150',
            field: 'age'
        });
    }

    try {
        // Check if patient exists
        const checkResult = await query('SELECT full_name FROM patients WHERE id = $1', [patientId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // Update patient
        const result = await query(`
            UPDATE patients SET 
                full_name = $1,
                phone_number = $2,
                address = $3,
                age = $4,
                gender = $5,
                date_of_birth = $6,
                last_diagnosis = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `, [
            full_name.trim(),
            phone_number ? phone_number.trim() : null,
            address ? address.trim() : null,
            age || null,
            gender,
            date_of_birth || null,
            last_diagnosis ? last_diagnosis.trim() : null,
            patientId
        ]);

        console.log('Patient updated successfully:', result.rows[0].full_name);

        res.json({
            success: true,
            message: 'Patient updated successfully',
            patient: result.rows[0]
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            error: 'Failed to update patient',
            code: 'DATABASE_ERROR'
        });
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
            LIMIT 50
        `, [`%${searchName}%`]);
        
        res.json({ 
            patients: result.rows,
            total: result.rows.length,
            searchTerm: searchName
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});

// Get all patients
app.get('/api/patients', async (req, res) => {
    const searchName = req.query.name;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const preview = req.query.preview === 'true';
    
    try {
        if (searchName) {
            const result = await query(`
                SELECT *,
                       NULL as last_visit_date,
                       0 as visit_count
                FROM patients 
                WHERE full_name ILIKE $1 
                ORDER BY full_name
                LIMIT $2 OFFSET $3
            `, [`%${searchName}%`, limit, offset]);
            
            res.json(result.rows);
        } else {
            const queryText = preview 
                ? `SELECT *, NULL as last_visit_date, 0 as visit_count FROM patients ORDER BY created_at DESC LIMIT $1`
                : `SELECT *, NULL as last_visit_date, 0 as visit_count FROM patients ORDER BY full_name LIMIT $1 OFFSET $2`;
            
            const params = preview ? [limit] : [limit, offset];
            const result = await query(queryText, params);
            
            res.json(result.rows);
        }
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});

// ===== MISSING API ENDPOINTS - THESE FIX YOUR 404 ERRORS =====

// General stats endpoint (/api/stats)
app.get('/api/stats', async (req, res) => {
    try {
        const totalResult = await query('SELECT COUNT(*) as count FROM patients');
        const totalPatients = parseInt(totalResult.rows[0].count);
        
        // Get recent patients (last 7 days)
        const recentResult = await query(`
            SELECT COUNT(*) as count 
            FROM patients 
            WHERE created_at >= NOW() - INTERVAL '7 days'
        `);
        const recentPatients = parseInt(recentResult.rows[0].count);
        
        // Get gender distribution
        const genderResult = await query(`
            SELECT gender, COUNT(*) as count 
            FROM patients 
            WHERE gender IS NOT NULL 
            GROUP BY gender
        `);
        
        const genderStats = {};
        genderResult.rows.forEach(row => {
            genderStats[row.gender] = parseInt(row.count);
        });
        
        // Get age groups
        const ageGroupResult = await query(`
            SELECT 
                CASE 
                    WHEN age < 18 THEN '0-17'
                    WHEN age BETWEEN 18 AND 35 THEN '18-35'
                    WHEN age BETWEEN 36 AND 50 THEN '36-50'
                    WHEN age BETWEEN 51 AND 65 THEN '51-65'
                    WHEN age > 65 THEN '65+'
                    ELSE 'Unknown'
                END as age_group,
                COUNT(*) as count
            FROM patients 
            GROUP BY age_group
        `);
        
        const ageGroups = {};
        ageGroupResult.rows.forEach(row => {
            ageGroups[row.age_group] = parseInt(row.count);
        });
        
        const stats = {
            totalPatients,
            recentPatients,
            genderStats,
            ageGroups,
            timestamp: new Date().toISOString()
        };
        
        res.json(stats);
    } catch (err) {
        console.error('Stats endpoint error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Patient-specific stats endpoint (/api/patients/stats)
app.get('/api/patients/stats', async (req, res) => {
    try {
        const totalResult = await query('SELECT COUNT(*) as count FROM patients');
        const totalPatients = parseInt(totalResult.rows[0].count);
        
        // Get stats by gender
        const genderResult = await query(`
            SELECT gender, COUNT(*) as count 
            FROM patients 
            GROUP BY gender
        `);
        
        const byGender = {};
        genderResult.rows.forEach(row => {
            byGender[row.gender || 'Unknown'] = parseInt(row.count);
        });
        
        // Get stats by age groups
        const ageResult = await query(`
            SELECT 
                CASE 
                    WHEN age < 18 THEN 'Under 18'
                    WHEN age BETWEEN 18 AND 30 THEN '18-30'
                    WHEN age BETWEEN 31 AND 50 THEN '31-50'
                    WHEN age BETWEEN 51 AND 70 THEN '51-70'
                    WHEN age > 70 THEN 'Over 70'
                    ELSE 'Unknown'
                END as age_group,
                COUNT(*) as count
            FROM patients 
            GROUP BY age_group
        `);
        
        const byAge = {};
        ageResult.rows.forEach(row => {
            byAge[row.age_group] = parseInt(row.count);
        });
        
        // Get recent admissions (last 30 days)
        const recentResult = await query(`
            SELECT COUNT(*) as count 
            FROM patients 
            WHERE created_at >= NOW() - INTERVAL '30 days'
        `);
        const recentAdmissions = parseInt(recentResult.rows[0].count);
        
        const stats = {
            total: totalPatients,
            byGender,
            byAge,
            recentAdmissions,
            timestamp: new Date().toISOString()
        };
        
        res.json(stats);
    } catch (err) {
        console.error('Patient stats endpoint error:', err);
        res.status(500).json({ error: 'Failed to fetch patient stats' });
    }
});

// Dashboard stats endpoint (/api/dashboard/stats)
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const totalResult = await query('SELECT COUNT(*) as count FROM patients');
        const totalPatients = parseInt(totalResult.rows[0].count);
        
        // Get new patients this week
        const weekResult = await query(`
            SELECT COUNT(*) as count 
            FROM patients 
            WHERE created_at >= DATE_TRUNC('week', NOW())
        `);
        const newThisWeek = parseInt(weekResult.rows[0].count);
        
        // Get new patients this month
        const monthResult = await query(`
            SELECT COUNT(*) as count 
            FROM patients 
            WHERE created_at >= DATE_TRUNC('month', NOW())
        `);
        const newThisMonth = parseInt(monthResult.rows[0].count);
        
        // Get average age
        const avgAgeResult = await query(`
            SELECT AVG(age) as avg_age 
            FROM patients 
            WHERE age IS NOT NULL
        `);
        const averageAge = avgAgeResult.rows[0].avg_age ? 
            Math.round(parseFloat(avgAgeResult.rows[0].avg_age)) : 0;
        
        const stats = {
            overview: {
                totalPatients,
                newThisWeek,
                newThisMonth,
                averageAge
            },
            timestamp: new Date().toISOString()
        };
        
        res.json(stats);
    } catch (err) {
        console.error('Dashboard stats endpoint error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Delete patient
app.delete('/api/patients/:id', async (req, res) => {
    const patientId = req.params.id;
    
    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: 'Valid patient ID is required' });
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
            message: `Patient "${checkResult.rows[0].full_name}" has been deleted successfully`,
            deletedPatientName: checkResult.rows[0].full_name
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to delete patient' });
    }
});

// Get patient count for dashboard
app.get('/api/patients/count', async (req, res) => {
    try {
        const result = await query('SELECT COUNT(*) as count FROM patients');
        res.json({ 
            count: parseInt(result.rows[0].count),
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error occurred' });
    }
});

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        await query('SELECT 1');
        res.json({ 
            status: 'OK',
            server: 'running',
            database: 'connected',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (err) {
        console.error('Health check failed:', err);
        res.status(503).json({
            status: 'ERROR',
            server: 'running',
            database: 'disconnected',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed'
        });
    }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('=================================');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Access URL: http://localhost:${PORT}`);
    console.log('=================================');
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please try a different port or stop the other server.`);
    } else {
        console.error('❌ Server failed to start:', err);
    }
    process.exit(1);
});

// Graceful shutdown
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

process.on('SIGTERM', async () => {
    console.log('\n🔄 Received SIGTERM, shutting down gracefully...');
    server.close(async () => {
        try {
            await end();
            console.log('✅ Database connection pool closed.');
        } catch (err) {
            console.error('❌ Error closing database connection pool:', err);
        }
        process.exit(0);
    });
});