// Get DOM elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const patientList = document.getElementById('patientList');
const error = document.getElementById('error');

// Search function
async function searchPatients() {
    const searchName = searchInput.value.trim();
    
    if (!searchName) {
        showError('Please enter a patient name');
        return;
    }
    
    // Show loading
    hideAll();
    loading.classList.remove('hidden');
    
    try {
        const response = await fetch(`/api/patients/search?name=${encodeURIComponent(searchName)}`);
        const data = await response.json();
        
        hideAll();
        
        if (data.patients && data.patients.length > 0) {
            displayPatients(data.patients);
        } else {
            showNoResults();
        }
        
    } catch (err) {
        hideAll();
        showError('Failed to search patients. Please try again.');
        console.error('Search error:', err);
    }
}

// Display patients
function displayPatients(patients) {
    patientList.innerHTML = '';
    
    patients.forEach(patient => {
        const patientCard = document.createElement('div');
        patientCard.className = 'patient-card';
        
        patientCard.innerHTML = `
            <div class="patient-name">${patient.full_name}</div>
            <div class="patient-info">
                <div class="info-item">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${patient.phone_number || 'Not provided'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Location:</span>
                    <span class="info-value">${patient.address || 'Not provided'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Age:</span>
                    <span class="info-value">${patient.age || 'Not provided'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Gender:</span>
                    <span class="info-value">${patient.gender || 'Not provided'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Date of Birth:</span>
                    <span class="info-value">${patient.date_of_birth || 'Not provided'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Last Visit:</span>
                    <span class="info-value">${patient.last_visit_date || 'No visits'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Total Visits:</span>
                    <span class="info-value">${patient.visit_count || 0}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Last Diagnosis:</span>
                    <span class="info-value">${patient.last_diagnosis || 'None recorded'}</span>
                </div>
            </div>
        `;
        
        patientList.appendChild(patientCard);
    });
    
    results.classList.remove('hidden');
}

// Show no results message
function showNoResults() {
    patientList.innerHTML = '<div class="no-results">No patients found with that name</div>';
    results.classList.remove('hidden');
}

// Show error message
function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
}

// Hide all result sections
function hideAll() {
    loading.classList.add('hidden');
    results.classList.add('hidden');
    error.classList.add('hidden');
}

// Event listeners
searchBtn.addEventListener('click', searchPatients);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchPatients();
    }
});

// Clear results when input is cleared
searchInput.addEventListener('input', () => {
    if (searchInput.value.trim() === '') {
        hideAll();
    }
});