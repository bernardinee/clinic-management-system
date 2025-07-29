// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const editForm = document.getElementById('editPatientForm');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const success = document.getElementById('success');
    const patientIdInput = document.getElementById('patientId');

    // Check if all required elements exist
    if (!editForm || !loading || !error || !success || !patientIdInput) {
        console.error('Required DOM elements not found');
        return;
    }

    // Get patient ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('id');

    if (!patientId) {
        showError('No patient ID provided. Please select a patient to edit.');
        editForm.style.display = 'none';
        return;
    }

    // Set patient ID in hidden input
    patientIdInput.value = patientId;

    // Load patient data
    loadPatientData(patientId);

    // Auto-calculate age when date of birth changes
    const dobInput = document.getElementById('dateOfBirth');
    const ageInput = document.getElementById('age');
    
    if (dobInput && ageInput) {
        dobInput.addEventListener('change', function(e) {
            const dobValue = e.target.value;
            
            if (dobValue) {
                const dob = new Date(dobValue);
                const today = new Date();
                
                // Calculate age
                let age = today.getFullYear() - dob.getFullYear();
                const monthDiff = today.getMonth() - dob.getMonth();
                
                // Adjust age if birthday hasn't occurred this year
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                    age--;
                }
                
                // Only set age if it's reasonable (0-120)
                if (age >= 0 && age <= 120) {
                    ageInput.value = age;
                } else {
                    ageInput.value = '';
                }
            } else {
                ageInput.value = '';
            }
        });
    }

    // Form submission handler
    editForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        console.log('Edit form submitted');

        const formData = new FormData(editForm);
        const patientData = {
            full_name: formData.get('fullName') ? formData.get('fullName').trim() : '',
            phone_number: formData.get('phoneNumber') ? formData.get('phoneNumber').trim() : '',
            address: formData.get('address') ? formData.get('address').trim() : '',
            age: formData.get('age') ? parseInt(formData.get('age')) : null,
            gender: formData.get('gender') ? formData.get('gender') : '',
            date_of_birth: formData.get('dateOfBirth') ? formData.get('dateOfBirth') : '',
            last_diagnosis: formData.get('lastDiagnosis') ? formData.get('lastDiagnosis').trim() : ''
        };

        console.log('Patient data prepared:', patientData);

        // Validation
        if (!patientData.full_name) {
            showError('Full name is required');
            return;
        }
        
        if (!patientData.gender) {
            showError('Please select a gender');
            return;
        }

        // Hide messages and show loading
        hideMessages();
        loading.classList.remove('hidden');

        try {
            console.log('Sending update request for patient ID:', patientId);
            
            const response = await fetch(`/api/patients/${patientId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(patientData)
            });

            console.log('Response received:', response.status);

            const result = await response.json();
            console.log('Response data:', result);
            
            hideMessages();

            if (response.ok) {
                console.log('Patient updated successfully:', result);
                showSuccess(result.patient.full_name);
                editForm.classList.add('hidden');
            } else {
                console.error('Error response:', result);
                showError(result.error || 'Failed to update patient');
            }
        } catch (err) {
            console.error('Network/Fetch error:', err);
            hideMessages();
            
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                showError('Cannot connect to server. Please make sure the server is running.');
            } else {
                showError('Network error: ' + err.message + '. Please check if the server is running and try again.');
            }
        }
    });

    // Load patient data function
    async function loadPatientData(patientId) {
        hideMessages();
        loading.classList.remove('hidden');

        try {
            console.log('Loading patient data for ID:', patientId);
            
            const response = await fetch(`/api/patients/${patientId}`);
            const result = await response.json();
            
            hideMessages();

            if (response.ok && result.success) {
                const patient = result.patient;
                console.log('Patient data loaded:', patient);
                
                // Populate form fields
                document.getElementById('fullName').value = patient.full_name || '';
                document.getElementById('phoneNumber').value = patient.phone_number || '';
                document.getElementById('address').value = patient.address || '';
                document.getElementById('age').value = patient.age || '';
                document.getElementById('gender').value = patient.gender || '';
                document.getElementById('dateOfBirth').value = patient.date_of_birth || '';
                document.getElementById('lastDiagnosis').value = patient.last_diagnosis || '';
                
                // Update page title
                document.title = `Edit ${patient.full_name} - Church Clinic`;
                
            } else {
                console.error('Failed to load patient:', result);
                showError(result.error || 'Failed to load patient information');
                editForm.style.display = 'none';
            }
        } catch (err) {
            console.error('Error loading patient:', err);
            hideMessages();
            showError('Failed to load patient information. Please check if the server is running.');
            editForm.style.display = 'none';
        }
    }

    // Show error message
    function showError(message) {
        error.textContent = message;
        error.classList.remove('hidden');
        error.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Show success message
    function showSuccess(patientName) {
        const successContent = success.querySelector('.success-content h3');
        if (successContent) {
            successContent.textContent = `✅ ${patientName} Updated Successfully!`;
        }
        success.classList.remove('hidden');
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Hide all messages
    function hideMessages() {
        loading.classList.add('hidden');
        error.classList.add('hidden');
        success.classList.add('hidden');
    }

    // Make functions available globally
    window.editAnother = function() {
        window.location.href = '/lookup.html';
    };

    window.cancelEdit = function() {
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            window.location.href = '/lookup.html';
        }
    };

    // Test server connection on page load
    fetch('/api/health')
        .then(response => response.json())
        .then(data => {
            console.log('✅ Server connection test successful:', data);
        })
        .catch(err => {
            console.warn('⚠️ Server connection test failed:', err);
            showError('Warning: Cannot connect to server. Please make sure the server is running.');
        });
});