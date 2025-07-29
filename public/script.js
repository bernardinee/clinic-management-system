// Fixed script.js for Adansie3 Herbal Clinic Management System
console.log('Dashboard script loading...');

// Main stats loading function - This fixes your "loadQuickStats function NOT found" error
async function loadQuickStats() {
    console.log('🔄 Loading quick stats...');
    
    try {
        // Use your existing /api/patients/count endpoint first (most reliable)
        console.log('📊 Fetching from /api/patients/count...');
        let response = await fetch('/api/patients/count');
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Got patient count:', data);
            updateStatsDisplay(data.count || 0);
            return;
        }
        
        // Fallback to /api/stats if count fails
        console.log('📊 Trying fallback /api/stats...');
        response = await fetch('/api/stats');
        
        if (response.ok) {
            const stats = await response.json();
            console.log('✅ Got stats:', stats);
            updateStatsDisplay(stats.totalPatients || 0);
            return;
        }
        
        // Final fallback - get all patients and count
        console.log('📊 Final fallback - fetching all patients...');
        response = await fetch('/api/patients?limit=1000');
        
        if (response.ok) {
            const patients = await response.json();
            console.log('✅ Got patients array:', patients);
            const count = Array.isArray(patients) ? patients.length : 0;
            updateStatsDisplay(count);
            return;
        }
        
        throw new Error('All API endpoints failed');
        
    } catch (error) {
        console.error('❌ Error loading stats:', error);
        showStatsError();
    }
}

// Update the stats display in your HTML
function updateStatsDisplay(totalPatients) {
    console.log('🎯 Updating display with total patients:', totalPatients);
    
    // Find the total patients element (your current HTML uses #totalPatients)
    const totalPatientsElement = document.getElementById('totalPatients');
    
    if (totalPatientsElement) {
        const oldValue = totalPatientsElement.textContent;
        totalPatientsElement.textContent = totalPatients;
        console.log(`✅ Updated total patients from "${oldValue}" to "${totalPatients}"`);
        
        // Add visual feedback
        totalPatientsElement.style.color = '#28a745';
        totalPatientsElement.style.fontWeight = 'bold';
        setTimeout(() => {
            totalPatientsElement.style.color = '';
            totalPatientsElement.style.fontWeight = '';
        }, 2000);
    } else {
        console.error('❌ Could not find #totalPatients element');
        
        // Try alternative selectors
        const alternatives = [
            '.stat-number',
            '.stat-value', 
            '.count',
            '.number',
            '[data-stat="total"]'
        ];
        
        for (const selector of alternatives) {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`✅ Found alternative element: ${selector}`);
                element.textContent = totalPatients;
                break;
            }
        }
    }
}

// Show error state
function showStatsError() {
    console.log('❌ Showing stats error');
    
    const totalPatientsElement = document.getElementById('totalPatients');
    if (totalPatientsElement) {
        totalPatientsElement.textContent = 'Error';
        totalPatientsElement.style.color = '#dc3545';
    }
    
    // Show error message
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        let errorDiv = document.getElementById('stats-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'stats-error';
            errorDiv.style.cssText = `
                background: #f8d7da;
                color: #721c24;
                padding: 8px 12px;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                margin-top: 10px;
                font-size: 14px;
                text-align: center;
            `;
            statsSection.appendChild(errorDiv);
        }
        errorDiv.textContent = 'Failed to load patient count. Please refresh the page.';
    }
}

// Auto-refresh stats every 30 seconds
let statsInterval;

function startStatsAutoRefresh() {
    // Clear any existing interval
    if (statsInterval) {
        clearInterval(statsInterval);
    }
    
    // Set up new interval
    statsInterval = setInterval(() => {
        console.log('🔄 Auto-refreshing stats...');
        loadQuickStats();
    }, 30000); // 30 seconds
    
    console.log('✅ Auto-refresh started (every 30 seconds)');
}

function stopStatsAutoRefresh() {
    if (statsInterval) {
        clearInterval(statsInterval);
        statsInterval = null;
        console.log('⏹️ Auto-refresh stopped');
    }
}

// Make functions globally available
window.loadQuickStats = loadQuickStats;
window.refreshStats = loadQuickStats; // Alias for manual refresh
window.startStatsAutoRefresh = startStatsAutoRefresh;
window.stopStatsAutoRefresh = stopStatsAutoRefresh;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing stats...');
    
    // Load stats immediately
    setTimeout(loadQuickStats, 100);
    
    // Start auto-refresh
    setTimeout(startStatsAutoRefresh, 1000);
});

// Also try when window fully loads (backup)
window.addEventListener('load', function() {
    console.log('🚀 Window loaded, ensuring stats are loaded...');
    setTimeout(loadQuickStats, 200);
});

// Function to refresh stats after patient operations (add/edit/delete)
function refreshStatsAfterChange() {
    console.log('🔄 Refreshing stats after data change...');
    setTimeout(loadQuickStats, 500); // Small delay to ensure DB is updated
}

// Make this available globally too
window.refreshStatsAfterChange = refreshStatsAfterChange;

console.log('✅ Dashboard script loaded successfully!');
console.log('💡 Manual commands available:');
console.log('   - refreshStats() - Refresh stats now');
console.log('   - startStatsAutoRefresh() - Start auto-refresh');
console.log('   - stopStatsAutoRefresh() - Stop auto-refresh');

// Export for other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadQuickStats,
        refreshStatsAfterChange,
        startStatsAutoRefresh,
        stopStatsAutoRefresh
    };
}