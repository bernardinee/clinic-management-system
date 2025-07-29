// Complete lookup.js - Replace your entire public/lookup.js with this
console.log('Patient lookup script loading...');

// Global variables
let searchBtn, previewBtn, searchInput, patientList, results, loading, error;

// Initialize DOM elements
function initDOM() {
    searchBtn = document.getElementById('searchBtn');
    previewBtn = document.getElementById('previewBtn');
    searchInput = document.getElementById('searchInput');
    patientList = document.getElementById('patientList');
    results = document.getElementById('results');
    loading = document.getElementById('loading');
    error = document.getElementById('error');
}

// Search patients function
async function searchPatients() {
    console.log('🔍 Search patients called');
    
    if (!searchInput) {
        console.error('Search input not found');
        showError('Search input not found on page');
        return;
    }
    
    const name = searchInput.value.trim();
    if (!name) {
        showError('Please enter a patient name to search');
        return;
    }

    console.log('Searching for:', name);
    hideAll();
    if (loading) loading.classList.remove('hidden');

    try {
        // Try primary search endpoint
        let response = await fetch(`/api/patients?name=${encodeURIComponent(name)}`);
        let patients = await response.json();
        
        console.log('Primary search response:', { status: response.status, ok: response.ok, data: patients });
        
        // Try alternative endpoint if first fails
        if (!response.ok || !patients || patients.length === 0) {
            console.log('Trying alternative search endpoint...');
            response = await fetch(`/api/patients/search?name=${encodeURIComponent(name)}`);
            const data = await response.json();
            patients = data.patients || data;
            console.log('Alternative search response:', { status: response.status, ok: response.ok, data: patients });
        }
        
        hideAll();

        if (response.ok && patients && patients.length > 0) {
            console.log(`✅ Found ${patients.length} patients`);
            displayPatients(patients, 'Search Results');
        } else {
            console.log('❌ No patients found');
            showNoResults();
        }
    } catch (err) {
        hideAll();
        console.error('Search error:', err);
        showError('Search failed. Please check if the server is running.');
    }
}

// Preview patients function
async function previewPatients() {
    console.log('👁️ Preview patients called');
    
    hideAll();
    if (loading) loading.classList.remove('hidden');

    try {
        // Try to get some patients for preview
        let response = await fetch('/api/patients?limit=10');
        let patients = await response.json();
        
        console.log('Preview response:', { status: response.status, ok: response.ok, data: patients });
        
        // Handle different response formats
        if (patients.patients && Array.isArray(patients.patients)) {
            patients = patients.patients;
        }
        
        hideAll();

        if (response.ok && patients && patients.length > 0) {
            console.log(`✅ Preview showing ${patients.length} patients`);
            displayPatients(patients, 'Preview - Sample Patient Records');
        } else {
            console.log('❌ No patients found for preview');
            showNoResults('No patient records found in the system.');
        }
    } catch (err) {
        hideAll();
        console.error('Preview error:', err);
        showError('Preview failed. Please check if the server is running.');
    }
}

// Display patients function
function displayPatients(patients, title = 'Results') {
    console.log(`📋 Displaying ${patients.length} patients`);
    
    if (!patientList) {
        console.error('Patient list element not found');
        showError('Patient list element not found on page');
        return;
    }
    
    patientList.innerHTML = '';

    // Add title
    const titleElement = document.createElement('div');
    titleElement.className = 'results-title';
    titleElement.innerHTML = `
        <h3>${title}</h3>
        <div class="results-count">${patients.length} patient${patients.length !== 1 ? 's' : ''} found</div>
    `;
    patientList.appendChild(titleElement);

    // Add patient cards
    patients.forEach((patient, index) => {
        console.log(`Creating card for patient ${index + 1}:`, patient.full_name);
        
        const patientCard = document.createElement('div');
        patientCard.classList.add('patient-card');
        patientCard.setAttribute('data-patient-id', patient.id);
        
        const patientName = patient.full_name || 'Unknown Name';
        const safeName = patientName.replace(/'/g, "\\'").replace(/"/g, '\\"');
        
        patientCard.innerHTML = `
            <div class="patient-header">
                <div class="patient-name">${patientName}</div>
                <div class="patient-actions">
                    <button class="edit-btn" onclick="editPatient(${patient.id})" title="Edit Patient">
                        ✏️ Edit
                    </button>
                    <button class="delete-btn" onclick="deletePatient(${patient.id}, '${safeName}')" title="Delete Patient">
                        🗑️ Delete
                    </button>
                </div>
            </div>
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
            <div class="edit-form-container" id="editForm${patient.id}" style="display: none;">
                <!-- Edit form will be injected here -->
            </div>
        `;
        
        patientList.appendChild(patientCard);
    });

    if (results) results.classList.remove('hidden');
    console.log('✅ Patient display complete');
}

// Delete patient function - MUST be global immediately
async function deletePatient(patientId, patientName) {
    console.log('🗑️ Delete patient called:', { patientId, patientName });
    
    // Confirm deletion
    const confirmDelete = confirm(`Are you sure you want to delete "${patientName}"?\n\nThis action cannot be undone and will permanently remove all patient data.`);
    
    if (!confirmDelete) {
        console.log('❌ Delete cancelled by user');
        return;
    }

    const patientCard = document.querySelector(`[data-patient-id="${patientId}"]`);
    if (!patientCard) {
        console.error(`Patient card with ID ${patientId} not found`);
        showError('Patient card not found');
        return;
    }
    
    const deleteBtn = patientCard.querySelector('.delete-btn');
    if (!deleteBtn) {
        console.error('Delete button not found in patient card');
        showError('Delete button not found');
        return;
    }
    
    const originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '⏳ Deleting...';
    deleteBtn.disabled = true;

    try {
        console.log(`Making DELETE request to /api/patients/${patientId}`);
        const response = await fetch(`/api/patients/${patientId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Delete response status:', response.status);
        const result = await response.json();
        console.log('Delete response data:', result);

        if (response.ok) {
            console.log('✅ Delete successful');
            
            // Remove the card with animation
            patientCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            patientCard.style.opacity = '0';
            patientCard.style.transform = 'translateX(-100%)';
            
            setTimeout(() => {
                patientCard.remove();
                
                // Check if any patients remain
                const remainingCards = document.querySelectorAll('.patient-card');
                if (remainingCards.length === 0) {
                    showNoResults('All patients have been removed from the results.');
                }
            }, 300);
            
            showSuccessMessage(result.message || `Patient "${patientName}" deleted successfully`);
            
        } else {
            console.log('❌ Delete failed:', result.error);
            
            // Restore button
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
            showError(result.error || 'Failed to delete patient');
        }
    } catch (err) {
        console.error('❌ Delete network error:', err);
        
        // Restore button
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
        showError('Network error. Please check if the server is running.');
    }
}

// Edit patient function - MUST be global immediately
async function editPatient(patientId) {
    console.log('✏️ Edit patient called:', patientId);
    
    const patientCard = document.querySelector(`[data-patient-id="${patientId}"]`);
    if (!patientCard) {
        showError('Patient card not found');
        return;
    }
    
    const editFormContainer = patientCard.querySelector(`#editForm${patientId}`);
    if (!editFormContainer) {
        showError('Edit form container not found');
        return;
    }
    
    // Toggle form visibility
    if (editFormContainer.style.display !== 'none') {
        editFormContainer.style.display = 'none';
        console.log('📝 Edit form closed');
        return;
    }
    
    try {
        console.log(`Fetching patient data for edit: /api/patients/${patientId}`);
        const response = await fetch(`/api/patients/${patientId}`);
        const result = await response.json();
        
        console.log('Edit fetch response:', { status: response.status, data: result });
        
        if (!response.ok) {
            showError('Failed to load patient data for editing');
            return;
        }
        
        const patient = result.patient || result;
        
        if (!patient) {
            showError('Patient data not found');
            return;
        }
        
        console.log('📝 Creating edit form for:', patient.full_name);
        
        // Create edit form
        editFormContainer.innerHTML = `
            <div class="edit-form">
                <h3>Edit ${patient.full_name || 'Patient'}</h3>
                <form id="editPatientForm${patientId}">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Full Name *</label>
                            <input type="text" name="fullName" value="${patient.full_name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Phone Number</label>
                            <input type="tel" name="phoneNumber" value="${patient.phone_number || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Age</label>
                            <input type="number" name="age" min="0" max="120" value="${patient.age || ''}">
                        </div>
                        <div class="form-group">
                            <label>Gender *</label>
                            <select name="gender" required>
                                <option value="">Select Gender</option>
                                <option value="Male" ${patient.gender === 'Male' ? 'selected' : ''}>Male</option>
                                <option value="Female" ${patient.gender === 'Female' ? 'selected' : ''}>Female</option>
                                <option value="Other" ${patient.gender === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Address</label>
                        <input type="text" name="address" value="${patient.address || ''}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Date of Birth</label>
                            <input type="date" name="dateOfBirth" value="${patient.date_of_birth || ''}">
                        </div>
                        <div class="form-group">
                            <label>Last Diagnosis</label>
                            <input type="text" name="lastDiagnosis" value="${patient.last_diagnosis || ''}">
                        </div>
                    </div>
                    <div class="edit-form-actions">
                        <button type="button" class="cancel-edit-btn" onclick="cancelEdit(${patientId})">
                            ❌ Cancel
                        </button>
                        <button type="submit" class="save-btn">
                            💾 Save Changes
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        editFormContainer.style.display = 'block';
        
        // Add form submit handler
        const editForm = document.getElementById(`editPatientForm${patientId}`);
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await savePatientEdit(patientId, editForm);
        });
        
        console.log('✅ Edit form created and displayed');
        
    } catch (err) {
        console.error('Edit form creation error:', err);
        showError('Failed to load patient data for editing');
    }
}

// Cancel edit function - MUST be global immediately
function cancelEdit(patientId) {
    console.log('❌ Cancel edit called:', patientId);
    const editFormContainer = document.querySelector(`#editForm${patientId}`);
    if (editFormContainer) {
        editFormContainer.style.display = 'none';
        editFormContainer.innerHTML = '';
    }
}

// Save patient edit function
async function savePatientEdit(patientId, editForm) {
    console.log('💾 Save patient edit called:', patientId);
    
    const saveBtn = editForm.querySelector('.save-btn');
    const originalText = saveBtn.innerHTML;
    
    saveBtn.innerHTML = '⏳ Saving...';
    saveBtn.disabled = true;
    
    try {
        const formData = new FormData(editForm);
        const patientData = {
            full_name: formData.get('fullName').trim(),
            phone_number: formData.get('phoneNumber').trim(),
            address: formData.get('address').trim(),
            age: formData.get('age') ? parseInt(formData.get('age')) : null,
            gender: formData.get('gender'),
            date_of_birth: formData.get('dateOfBirth'),
            last_diagnosis: formData.get('lastDiagnosis').trim()
        };
        
        if (!patientData.full_name) {
            throw new Error('Full name is required');
        }
        
        console.log('Saving patient data:', patientData);
        
        const response = await fetch(`/api/patients/${patientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patientData)
        });
        
        const result = await response.json();
        console.log('Save response:', { status: response.status, data: result });
        
        if (response.ok) {
            console.log('✅ Patient saved successfully');
            showSuccessMessage(`Patient "${patientData.full_name}" updated successfully`);
            cancelEdit(patientId);
            
            // Update the patient card display
            updatePatientCardDisplay(patientId, patientData);
            
        } else {
            throw new Error(result.error || 'Failed to update patient');
        }
        
    } catch (err) {
        console.error('Save error:', err);
        showError(err.message || 'Failed to save patient changes');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Update patient card display after edit
function updatePatientCardDisplay(patientId, patientData) {
    const patientCard = document.querySelector(`[data-patient-id="${patientId}"]`);
    if (!patientCard) return;
    
    // Update patient name
    const nameElement = patientCard.querySelector('.patient-name');
    if (nameElement) {
        nameElement.textContent = patientData.full_name;
    }
    
    // Update info values
    const infoItems = patientCard.querySelectorAll('.info-item');
    infoItems.forEach(item => {
        const label = item.querySelector('.info-label').textContent.toLowerCase();
        const valueElement = item.querySelector('.info-value');
        
        if (label.includes('phone')) {
            valueElement.textContent = patientData.phone_number || 'Not provided';
        } else if (label.includes('location')) {
            valueElement.textContent = patientData.address || 'Not provided';
        } else if (label.includes('age')) {
            valueElement.textContent = patientData.age || 'Not provided';
        } else if (label.includes('gender')) {
            valueElement.textContent = patientData.gender || 'Not provided';
        } else if (label.includes('birth')) {
            valueElement.textContent = patientData.date_of_birth || 'Not provided';
        } else if (label.includes('diagnosis')) {
            valueElement.textContent = patientData.last_diagnosis || 'None recorded';
        }
    });
    
    console.log('✅ Patient card display updated');
}

// Utility functions
function showSuccessMessage(message) {
    console.log('✅ Success:', message);
    
    let successElement = document.getElementById('success-message');
    if (!successElement) {
        successElement = document.createElement('div');
        successElement.id = 'success-message';
        successElement.style.cssText = `
            padding: 10px;
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            border-radius: 4px;
            margin: 10px 0;
            text-align: center;
        `;
        
        const container = document.querySelector('.container') || document.body;
        container.insertBefore(successElement, container.firstChild);
    }
    
    successElement.textContent = message;
    successElement.style.display = 'block';
    
    setTimeout(() => {
        successElement.style.display = 'none';
    }, 3000);
}

function showNoResults(customMessage = null) {
    if (!patientList) return;
    
    const message = customMessage || 'No patients found with that name';
    console.log('📭 No results:', message);
    
    patientList.innerHTML = `
        <div class="no-results" style="text-align: center; padding: 20px; color: #666; font-style: italic;">
            ${message}
        </div>
    `;
    if (results) results.classList.remove('hidden');
}

function showError(message) {
    console.error('❌ Error:', message);
    
    let errorElement = error;
    
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'error';
        errorElement.style.cssText = `
            padding: 10px;
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
            margin: 10px 0;
            text-align: center;
        `;
        
        const container = document.querySelector('.container') || document.body;
        const searchInput = document.getElementById('searchInput');
        
        if (searchInput && searchInput.parentNode) {
            searchInput.parentNode.insertBefore(errorElement, searchInput.nextSibling);
        } else {
            container.appendChild(errorElement);
        }
        
        error = errorElement;
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
        if (errorElement) errorElement.style.display = 'none';
    }, 5000);
}

function hideAll() {
    if (loading) loading.classList.add('hidden');
    if (results) results.classList.add('hidden');
    if (error) error.style.display = 'none';
    
    const successMessage = document.getElementById('success-message');
    if (successMessage) successMessage.style.display = 'none';
}

// CRITICAL: Make functions globally available IMMEDIATELY (before DOM loads)
window.deletePatient = deletePatient;
window.editPatient = editPatient;
window.cancelEdit = cancelEdit;
window.searchPatients = searchPatients;
window.previewPatients = previewPatients;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing patient lookup...');
    
    initDOM();
    
    // Set up event listeners
    if (searchBtn) {
        searchBtn.addEventListener('click', searchPatients);
        console.log('✅ Search button listener added');
    } else {
        console.warn('⚠️ Search button not found');
    }

    if (previewBtn) {
        previewBtn.addEventListener('click', previewPatients);
        console.log('✅ Preview button listener added');
    } else {
        console.log('ℹ️ Preview button not found (optional)');
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchPatients();
            }
        });

        searchInput.addEventListener('input', () => {
            if (searchInput.value.trim() === '') {
                hideAll();
            }
        });
        
        searchInput.focus();
        console.log('✅ Search input listeners added');
    } else {
        console.warn('⚠️ Search input not found');
    }
    
    console.log('🎉 Patient lookup system initialized successfully');
    
    // Test global functions
    console.log('🔧 Testing global functions:');
    console.log('- deletePatient:', typeof window.deletePatient);
    console.log('- editPatient:', typeof window.editPatient);
    console.log('- cancelEdit:', typeof window.cancelEdit);
});

console.log('📋 Patient lookup script loaded successfully');