// Initialize DOM elements - will be set after DOM is loaded
let searchBtn, previewBtn, searchInput, patientList, results, loading, error;

// Initialize DOM elements
function initializeDOMElements() {
    searchBtn = document.getElementById('searchBtn');
    previewBtn = document.getElementById('previewBtn');
    searchInput = document.getElementById('searchInput');
    patientList = document.getElementById('patientList');
    results = document.getElementById('results');
    loading = document.getElementById('loading');
    error = document.getElementById('error');
}

// Check if required elements exist
function checkRequiredElements() {
    const requiredElements = {
        searchBtn: searchBtn,
        searchInput: searchInput,
        patientList: patientList,
        results: results,
        loading: loading
    };
    
    for (const [name, element] of Object.entries(requiredElements)) {
        if (!element) {
            console.error(`Required element '${name}' not found in DOM`);
            return false;
        }
    }
    return true;
}

// Search patients function
async function searchPatients() {
    if (!searchInput) {
        console.error('Search input element not found');
        return;
    }
    
    const name = searchInput.value.trim();
    if (!name) {
        showError('Please enter a patient name to search');
        return;
    }

    hideAll();
    if (loading) loading.classList.remove('hidden');

    try {
        const response = await fetch(`/api/patients?name=${encodeURIComponent(name)}`);
        const patients = await response.json();
        hideAll();

        if (response.ok && patients.length > 0) {
            displayPatients(patients, 'Search Results');
        } else {
            showNoResults();
        }
    } catch (err) {
        hideAll();
        showError('An error occurred while searching. Please check if the server is running.');
        console.error('Search error:', err);
    }
}

// Preview patients function - shows sample data from the system
async function previewPatients() {
    hideAll();
    if (loading) loading.classList.remove('hidden');

    try {
        // Fetch a sample of patients (you can modify the endpoint as needed)
        const response = await fetch('/api/patients?limit=10&preview=true');
        const patients = await response.json();
        hideAll();

        if (response.ok && patients.length > 0) {
            displayPatients(patients, 'Preview - Sample Patient Records');
        } else {
            showNoResults('No patient records found in the system.');
        }
    } catch (err) {
        hideAll();
        showError('An error occurred while loading preview. Please check if the server is running.');
        console.error('Preview error:', err);
    }
}

// Display patient cards with delete functionality
function displayPatients(patients, title = 'Results') {
    if (!patientList) {
        console.error('Patient list element not found');
        return;
    }
    
    patientList.innerHTML = ''; // Clear previous results

    // Add a title section
    const titleElement = document.createElement('div');
    titleElement.className = 'results-title';
    titleElement.innerHTML = `
        <h3>${title}</h3>
        <div class="results-count">${patients.length} patient${patients.length !== 1 ? 's' : ''} found</div>
    `;
    patientList.appendChild(titleElement);

    patients.forEach(patient => {
        const patientCard = document.createElement('div');
        patientCard.classList.add('patient-card');
        patientCard.setAttribute('data-patient-id', patient.id);
        
        patientCard.innerHTML = `
            <div class="patient-header">
                <div class="patient-name">${patient.full_name}</div>
                <button class="delete-btn" onclick="deletePatient(${patient.id}, '${patient.full_name.replace(/'/g, "\\'")}')">
                    🗑️ Delete
                </button>
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
        `;
        patientList.appendChild(patientCard);
    });

    if (results) results.classList.remove('hidden');
}

// Delete patient function
async function deletePatient(patientId, patientName) {
    // Confirm deletion
    const confirmDelete = confirm(`Are you sure you want to delete "${patientName}"?\n\nThis action cannot be undone and will permanently remove all patient data.`);
    
    if (!confirmDelete) {
        return;
    }

    // Show loading state on the specific patient card
    const patientCard = document.querySelector(`[data-patient-id="${patientId}"]`);
    if (!patientCard) {
        console.error(`Patient card with ID ${patientId} not found`);
        return;
    }
    
    const deleteBtn = patientCard.querySelector('.delete-btn');
    if (!deleteBtn) {
        console.error('Delete button not found in patient card');
        return;
    }
    
    const originalText = deleteBtn.innerHTML;
    
    deleteBtn.innerHTML = '⏳ Deleting...';
    deleteBtn.disabled = true;

    try {
        const response = await fetch(`/api/patients/${patientId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            // Remove the patient card with a fade out effect
            patientCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            patientCard.style.opacity = '0';
            patientCard.style.transform = 'translateX(-100%)';
            
            setTimeout(() => {
                patientCard.remove();
                
                // Check if there are any patients left (excluding the title)
                if (patientList) {
                    const remainingCards = patientList.querySelectorAll('.patient-card');
                    if (remainingCards.length === 0) {
                        showNoResults('All patients have been removed from the results.');
                    }
                }
            }, 300);
            
            // Show success message
            showSuccessMessage(result.message || `Patient "${patientName}" deleted successfully`);
            
        } else {
            // Restore button state
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
            showError(result.error || 'Failed to delete patient');
        }
    } catch (err) {
        // Restore button state
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
        showError('Network error. Please check if the server is running.');
        console.error('Delete error:', err);
    }
}

// Make functions available globally
window.deletePatient = deletePatient;
window.previewPatients = previewPatients;

// Show success message
function showSuccessMessage(message) {
    // Create or update success message element
    let successElement = document.getElementById('success-message');
    if (!successElement) {
        successElement = document.createElement('div');
        successElement.id = 'success-message';
        successElement.className = 'success-message';
        
        const container = document.querySelector('.container');
        if (container && results) {
            container.insertBefore(successElement, results);
        } else {
            // Fallback: append to body if container not found
            document.body.appendChild(successElement);
        }
    }
    
    successElement.textContent = message;
    successElement.classList.remove('hidden');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        successElement.classList.add('hidden');
    }, 3000);
}

// Show no results message
function showNoResults(customMessage = null) {
    if (!patientList) {
        console.error('Patient list element not found');
        return;
    }
    
    patientList.innerHTML = `<div class="no-results">${customMessage || 'No patients found with that name'}</div>`;
    if (results) results.classList.remove('hidden');
}

// Show error message with null check
function showError(message) {
    // If error element doesn't exist, create it dynamically
    if (!error) {
        const errorElement = document.createElement('div');
        errorElement.id = 'error';
        errorElement.className = 'error-message';
        
        // Try to insert it in a logical place
        const container = document.querySelector('.container') || document.body;
        const searchInput = document.getElementById('searchInput');
        
        if (searchInput && container.contains(searchInput)) {
            container.insertBefore(errorElement, searchInput.nextSibling);
        } else {
            container.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorElement.classList.add('hidden');
        }, 5000);
        
        return;
    }
    
    error.textContent = message;
    error.classList.remove('hidden');
    error.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        error.classList.add('hidden');
    }, 5000);
}

// Hide all results and loading states
function hideAll() {
    if (loading) loading.classList.add('hidden');
    if (results) results.classList.add('hidden');
    if (error) error.classList.add('hidden');
    
    const successMessage = document.getElementById('success-message');
    if (successMessage) {
        successMessage.classList.add('hidden');
    }
}

// Event listeners for search (with null checks)
if (searchBtn) {
    searchBtn.addEventListener('click', searchPatients);
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
}

// Focus on search input when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements first
    initializeDOMElements();
    
    // Check if all required elements exist
    if (!checkRequiredElements()) {
        console.warn('Some required DOM elements are missing. Please check your HTML structure.');
    }
    
    // Set up event listeners after elements are initialized
    if (searchBtn) {
        searchBtn.addEventListener('click', searchPatients);
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
        
        // Focus on search input
        searchInput.focus();
    }
});