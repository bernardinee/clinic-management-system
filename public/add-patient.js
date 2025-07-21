// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const patientForm = document.getElementById('patientForm');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const success = document.getElementById('success');

    // Check if all required elements exist
    if (!patientForm || !loading || !error || !success) {
        console.error('Required DOM elements not found');
        return;
    }

    // Get pre-filled name from URL (if any)
    const urlParams = new URLSearchParams(window.location.search);
    const prefilledName = urlParams.get('name');
    if (prefilledName) {
        const fullNameInput = document.getElementById('fullName');
        if (fullNameInput) {
            fullNameInput.value = prefilledName;
        }
    }

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

        // Auto-calculate age when page loads (if DOB is already filled)
        if (dobInput.value) {
            dobInput.dispatchEvent(new Event('change'));
        }
    }

    // Form submission handler
    patientForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        console.log('Form submitted'); // Debug log

        const formData = new FormData(patientForm);
        const patientData = {
            full_name: formData.get('fullName') ? formData.get('fullName').trim() : '',
            phone_number: formData.get('phoneNumber') ? formData.get('phoneNumber').trim() : '',
            address: formData.get('address') ? formData.get('address').trim() : '',
            age: formData.get('age') ? parseInt(formData.get('age')) : null,
            gender: formData.get('gender') ? formData.get('gender') : '',
            date_of_birth: formData.get('dateOfBirth') ? formData.get('dateOfBirth') : '',
            initial_diagnosis: formData.get('lastDiagnosis') ? formData.get('lastDiagnosis').trim() : ''        };

        console.log('Patient data prepared:', patientData); // Debug log

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
            console.log('Sending request to /api/patients'); // Debug log
            
            const response = await fetch('/api/patients', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(patientData)
            });

            console.log('Response received:', response.status); // Debug log

            const result = await response.json();
            console.log('Response data:', result); // Debug log
            
            hideMessages();

            if (response.ok) {
                console.log('Patient added successfully:', result);
                showSuccess();
                patientForm.classList.add('hidden');
            } else {
                console.error('Error response:', result);
                showError(result.error || 'Failed to add patient');
            }
        } catch (err) {
            console.error('Network/Fetch error:', err);
            hideMessages();
            
            // More specific error messages
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                showError('Cannot connect to server. Please make sure the server is running on http://localhost:3000');
            } else {
                showError('Network error: ' + err.message + '. Please check if the server is running and try again.');
            }
        }
    });

    // Show error message
    function showError(message) {
        error.textContent = message;
        error.classList.remove('hidden');
        error.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Show success message
    function showSuccess() {
        success.classList.remove('hidden');
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Hide all messages
    function hideMessages() {
        loading.classList.add('hidden');
        error.classList.add('hidden');
        success.classList.add('hidden');
    }

    // Reset form and restore prefilled name if any
    function resetForm() {
        patientForm.reset();
        patientForm.classList.remove('hidden');
        hideMessages();
        
        // Restore prefilled name if it exists
        if (prefilledName) {
            const fullNameInput = document.getElementById('fullName');
            if (fullNameInput) {
                fullNameInput.value = prefilledName;
            }
        }
    }

    // Make resetForm available globally for the HTML button
    window.resetForm = resetForm;

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