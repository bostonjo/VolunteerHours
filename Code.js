// Configuration - Update these with your actual sheet IDs
const CONFIG = {
  VOLUNTEER_HOURS_SHEET_ID: '1pn4OId3CoCZZtj1g7LsntJU800NE57IPxrcOhAuJnWY', // Sheet to store volunteer entries
  GARDENS_SHEET_ID: '1duYJ3-DaHJfkR-aNntwTrm9Un2pmmGPiaVwSVlzf0Nc', // Sheet to store garden list
  ADMIN_EMAIL: 'john.biske@gmail.com' // Admin email address
};

// Authorization validation function
function validatePermissions() {
  try {
    const authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
    if (authInfo.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) {
      throw new Error('Additional authorization required. Please reauthorize the application.');
    }
    return true;
  } catch (e) {
    console.error('Authorization validation failed:', e.message);
    return false;
  }
}

// Test function
function testAuthorization() {
  Logger.log('Running testAuthorization...');
  try {
    const email = Session.getActiveUser().getEmail();
    Logger.log('Authorized user email: ' + email);
    SpreadsheetApp.openById(CONFIG.VOLUNTEER_HOURS_SHEET_ID).getName(); // Attempt to access a sheet
    Logger.log('Successfully accessed sheet.');
  } catch (e) {
    Logger.log('Authorization test failed: ' + e.message);
  }
}

// Main function to serve HTML pages
function doGet(e) {
  const page = e.parameter.page || 'volunteer';
  
  if (page === 'admin') {
    return HtmlService.createTemplateFromFile('Admin')
      .evaluate()
      .setTitle('Volunteer Hours - Admin Portal')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else {
    return HtmlService.createTemplateFromFile('Volunteer')
      .evaluate()
      .setTitle('Volunteer Hours Tracker')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

// Include function for HTML templates
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Initialize sheets if they don't exist
function initializeSheets() {
  try {
    // Initialize volunteer hours sheet
    let volunteerSheet;
    try {
      volunteerSheet = SpreadsheetApp.openById(CONFIG.VOLUNTEER_HOURS_SHEET_ID);
    } catch (e) {
      // Create new sheet if doesn't exist
      volunteerSheet = SpreadsheetApp.create('Volunteer Hours Tracking');
      console.log('Created new Volunteer Hours sheet:', volunteerSheet.getId());
    }
    
    const volunteerWorksheet = volunteerSheet.getActiveSheet();
    if (volunteerWorksheet.getLastRow() === 0) {
      volunteerWorksheet.getRange(1, 1, 1, 8).setValues([[ 
        'Timestamp', 'Volunteer Name', 'Email', 'Start Date', 'End Date', 'Gardens', 'Hours', 'Comments'
      ]]);
      volunteerWorksheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    }
    
    // Initialize gardens sheet
    let gardensSheet;
    try {
      gardensSheet = SpreadsheetApp.openById(CONFIG.GARDENS_SHEET_ID);
    } catch (e) {
      // Create new sheet if doesn't exist
      gardensSheet = SpreadsheetApp.create('Gardens List');
      console.log('Created new Gardens sheet:', gardensSheet.getId());
    }
    
    const gardensWorksheet = gardensSheet.getActiveSheet();
    if (gardensWorksheet.getLastRow() === 0) {
      gardensWorksheet.getRange(1, 1, 1, 3).setValues([['Garden Name', 'Location', 'Active']]);
      gardensWorksheet.getRange(1, 1, 1, 3).setFontWeight('bold');
      
      // Add the default list of gardens
      gardensWorksheet.getRange(2, 1, 13, 3).setValues([
        ["Harcourt/Canton", "", "Yes"],
        ["Holyoke area", "", "Yes"],
        ["Follen/Braddock Corner", "", "Yes"],
        ["Follen and Braddock Hills/Lawyer's Alley", "", "Yes"],
        ["Newton 4 Corners", "", "Yes"],
        ["Durham/Rutland Gardens", "", "Yes"],
        ["Greenwich Area Gardens", "", "Yes"],
        ["Claremont/Blackwood Area", "", "Yes"],
        ["Wellington", "", "Yes"],
        ["Rose Garden", "", "Yes"],
        ["Meadow", "", "Yes"],
        ["Mass Ave Gardens", "", "Yes"],
        ["Northampton/Camden", "", "Yes"]
      ]);
    }
    
    return { success: true, message: 'Sheets initialized successfully' };
  } catch (error) {
    console.error('Error initializing sheets:', error);
    return { success: false, message: error.toString() };
  }
}

// Get list of active gardens with caching
function getGardens() {
  try {
    // Check cache first
    const cache = CacheService.getScriptCache();
    const cachedGardens = cache.get('gardens');
    
    if (cachedGardens) {
      return JSON.parse(cachedGardens);
    }
    
    // If not in cache, fetch from sheet
    const sheet = SpreadsheetApp.openById(CONFIG.GARDENS_SHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      const result = { success: true, gardens: [] };
      cache.put('gardens', JSON.stringify(result), 300); // Cache for 5 minutes
      return result;
    }
    
    const gardens = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === 'Yes') { // Only active gardens
        gardens.push({
          name: data[i][0],
          location: data[i][1]
        });
      }
    }
    
    const result = { success: true, gardens: gardens };
    // Cache the result for 5 minutes
    cache.put('gardens', JSON.stringify(result), 300);
    
    return result;
  } catch (error) {
    console.error('Error getting gardens:', error);
    return { success: false, message: error.toString() };
  }
}

// Clear gardens cache when gardens are modified
function clearGardensCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove('gardens');
  } catch (error) {
    console.error('Error clearing gardens cache:', error);
  }
}

// Sanitize user input to prevent XSS attacks
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

// Submit volunteer hours
function submitVolunteerHours(formData) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.VOLUNTEER_HOURS_SHEET_ID).getActiveSheet();
    
    // Sanitize input data
    const sanitizedData = {
      volunteerName: sanitizeInput(formData.volunteerName),
      email: sanitizeInput(formData.email),
      startDate: formData.startDate,
      endDate: formData.endDate,
      gardens: Array.isArray(formData.gardens) 
        ? formData.gardens.map(garden => sanitizeInput(garden)).join(', ')
        : sanitizeInput(formData.gardens),
      hours: parseFloat(formData.hours) || 0,
      comments: sanitizeInput(formData.comments || '')
    };
    
    const timestamp = new Date();
    const startDate = new Date(sanitizedData.startDate);
    const endDate = sanitizedData.endDate ? new Date(sanitizedData.endDate) : startDate;
    
    sheet.appendRow([
      timestamp,
      sanitizedData.volunteerName,
      sanitizedData.email,
      startDate,
      endDate,
      sanitizedData.gardens,
      sanitizedData.hours,
      sanitizedData.comments
    ]);
    
    // Send confirmation email to volunteer
    try {
      const emailBody = `
Dear ${sanitizedData.volunteerName},

Thank you for submitting your volunteer hours! Here are the details we received:

Date(s): ${sanitizedData.startDate}${sanitizedData.endDate ? ' to ' + sanitizedData.endDate : ''}
Garden(s): ${sanitizedData.gardens}
Hours: ${sanitizedData.hours}
Comments: ${sanitizedData.comments || 'None'}

Your contribution is greatly appreciated!

Best regards,
Volunteer Coordination Team
      `;
      
      GmailApp.sendEmail(
        sanitizedData.email,
        'Volunteer Hours Submission Confirmation',
        emailBody
      );
    } catch (emailError) {
      console.log('Could not send confirmation email:', emailError);
    }
    
    return {
      success: true,
      message: 'Volunteer hours submitted successfully! A confirmation email has been sent.'
    };
    
  } catch (error) {
    console.error('Error submitting volunteer hours:', error);
    return { success: false, message: error.toString() };
  }
}

// Admin authentication
function authenticateAdmin(email) { // The 'email' parameter here is not used by Session.getActiveUser()
  const userEmail = Session.getActiveUser().getEmail();
  Logger.log('Current logged-in user email: ' + userEmail);
  Logger.log('Configured admin email: ' + CONFIG.ADMIN_EMAIL);

  const isAdmin = userEmail === CONFIG.ADMIN_EMAIL;
  
  Logger.log('Is user admin? ' + isAdmin);
  
  return {
    success: isAdmin,
    isAdmin: isAdmin,
    userEmail: userEmail,
    message: isAdmin ? 'Admin authenticated' : 'Access denied - admin privileges required'
  };
}

// Get all gardens (for admin)
function getAllGardens() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.GARDENS_SHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, gardens: [] };
    }
    
    const gardens = [];
    for (let i = 1; i < data.length; i++) {
      gardens.push({
        rowIndex: i + 1,
        name: data[i][0],
        location: data[i][1],
        active: data[i][2]
      });
    }
    
    return { success: true, gardens: gardens };
  } catch (error) {
    console.error('Error getting all gardens:', error);
    return { success: false, message: error.toString() };
  }
}

// Add new garden
function addGarden(gardenData) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.GARDENS_SHEET_ID).getActiveSheet();
    
    // Sanitize input data
    const sanitizedName = sanitizeInput(gardenData.name);
    const sanitizedLocation = sanitizeInput(gardenData.location);
    
    sheet.appendRow([
      sanitizedName,
      sanitizedLocation,
      'Yes'
    ]);
    
    // Clear cache after modification
    clearGardensCache();
    
    return { success: true, message: 'Garden added successfully' };
  } catch (error) {
    console.error('Error adding garden:', error);
    return { success: false, message: error.toString() };
  }
}

// Update garden
function updateGarden(gardenData) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.GARDENS_SHEET_ID).getActiveSheet();
    
    // Sanitize input data
    const sanitizedName = sanitizeInput(gardenData.name);
    const sanitizedLocation = sanitizeInput(gardenData.location);
    const sanitizedActive = sanitizeInput(gardenData.active);
    
    sheet.getRange(gardenData.rowIndex, 1, 1, 3).setValues([[ 
      sanitizedName,
      sanitizedLocation,
      sanitizedActive
    ]]);
    
    // Clear cache after modification
    clearGardensCache();
    
    return { success: true, message: 'Garden updated successfully' };
  } catch (error) {
    console.error('Error updating garden:', error);
    return { success: false, message: error.toString() };
  }
}

// Delete garden
function deleteGarden(rowIndex) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.GARDENS_SHEET_ID).getActiveSheet();
    sheet.deleteRow(rowIndex);
    
    // Clear cache after modification
    clearGardensCache();
    
    return { success: true, message: 'Garden deleted successfully' };
  } catch (error) {
    console.error('Error deleting garden:', error);
    return { success: false, message: error.toString() };
  }
}

// Generate volunteer hours report
function generateReport(filters) {
  try {
    console.log('=== REPORT GENERATION START ===');
    console.log('Filters received:', JSON.stringify(filters));
    
    // Initialize sheets first to make sure they exist
    const initResult = initializeSheets();
    if (!initResult.success) {
      console.error('Failed to initialize sheets:', initResult.message);
      return { success: false, message: 'Failed to initialize sheets: ' + initResult.message };
    }
    
    // Check if sheet exists
    let sheet;
    try {
      sheet = SpreadsheetApp.openById(CONFIG.VOLUNTEER_HOURS_SHEET_ID).getActiveSheet();
      console.log('Sheet opened successfully');
    } catch (e) {
      console.error('Error opening volunteer hours sheet:', e);
      return { success: false, message: 'Could not access volunteer hours sheet: ' + e.toString() };
    }
    
    const data = sheet.getDataRange().getValues();
    console.log('Total rows retrieved:', data.length);
    
    if (data.length <= 1) {
      console.log('No data found (only headers), returning empty result');
      return { 
        success: true, 
        data: [], 
        summary: { totalHours: 0, totalEntries: 0 } 
      };
    }
    
    let filteredData = [];
    let totalHours = 0;
    
    // Process each row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      console.log(`
--- Processing Row ${i} ---`);
      console.log('Raw row data:', row);
      
      // Skip completely empty rows
      if (!row || row.length === 0 || !row[1] || !row[3]) {
        console.log('Skipping row - missing essential data');
        continue;
      }
      
      try {
        // Parse dates more carefully
        let startDate, endDate;
        try {
          startDate = new Date(row[3]);
          endDate = row[4] ? new Date(row[4]) : startDate;
          
          // Check if dates are valid
          if (isNaN(startDate.getTime())) {
            console.log('Invalid start date, skipping row');
            continue;
          }
          if (isNaN(endDate.getTime())) {
            endDate = startDate;
          }
        } catch (dateError) {
          console.log('Date parsing error, skipping row:', dateError);
          continue;
        }
        
        // Parse other fields safely
        const volunteerName = (row[1] || '').toString().toLowerCase();
        const gardens = (row[5] || '').toString().toLowerCase();
        const hours = parseFloat(row[6]) || 0;
        
        console.log('Volunteer name:', volunteerName);
        console.log('Gardens:', gardens);
        console.log('Hours:', hours);
        
        let includeRow = true;
        let filterReasons = [];
        
        // Date range filter - always applied since we always have start and end dates
        if (filters.startDate && filters.endDate) {
          try {
            const filterStart = new Date(filters.startDate);
            const filterEnd = new Date(filters.endDate);
            
            if (!isNaN(filterStart.getTime()) && !isNaN(filterEnd.getTime())) {
              console.log('Filter start date:', filterStart);
              console.log('Filter end date:', filterEnd);
              
              // Set times to include the full day range
              filterStart.setHours(0, 0, 0, 0);
              filterEnd.setHours(23, 59, 59, 999);
              
              if (startDate < filterStart) {
                includeRow = false;
                filterReasons.push('Start date before filter range');
              }
              if (endDate > filterEnd) {
                includeRow = false;
                filterReasons.push('End date after filter range');
              }
            }
          } catch (filterDateError) {
            console.log('Filter date parsing error:', filterDateError);
          }
        }
        
        // Volunteer name filter - only apply if the filter was provided
        if (filters.hasOwnProperty('volunteerName') && filters.volunteerName && includeRow) {
          const filterName = filters.volunteerName.toLowerCase().trim();
          if (!volunteerName.includes(filterName)) {
            includeRow = false;
            filterReasons.push('Volunteer name does not match');
          }
        }
        
        // Garden filter - only apply if the filter was provided
        if (filters.hasOwnProperty('garden') && filters.garden && includeRow) {
          const filterGarden = filters.garden.toLowerCase();
          if (!gardens.includes(filterGarden)) {
            includeRow = false;
            filterReasons.push('Garden does not match');
          }
        }
        
        console.log('Include row:', includeRow);
        if (!includeRow) {
          console.log('Filter reasons:', filterReasons);
        }
        
        if (includeRow) {
          const entry = {
            timestamp: row[0],
            volunteerName: row[1] || '',
            email: row[2] || '',
            startDate: row[3],
            endDate: row[4] || row[3],
            gardens: row[5] || '',
            hours: hours,
            comments: row[7] || ''
          };
          
          filteredData.push(entry);
          totalHours += hours;
          console.log('✓ Entry added to results');
        }
        
      } catch (rowError) {
        console.error('Error processing row', i, ':', rowError);
        continue;
      }
    }
    
    console.log('\n=== FINAL RESULTS ===');
    console.log('Filtered entries:', filteredData.length);
    console.log('Total hours:', totalHours);
    
    const result = {
      success: true,
      data: filteredData,
      summary: {
        totalHours: totalHours,
        totalEntries: filteredData.length
      }
    };
    
    console.log('Final result object created successfully');
    console.log('=== REPORT GENERATION END ===');
    return result;
    
  } catch (error) {
    console.error('FATAL ERROR in generateReport:', error);
    const errorResult = { 
      success: false, 
      message: 'Error generating report: ' + error.toString() 
    };
    console.log('Returning error result:', JSON.stringify(errorResult));
    return errorResult;
  }
}

// Test function to add sample volunteer data
function addSampleVolunteerData() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.VOLUNTEER_HOURS_SHEET_ID).getActiveSheet();
    
    // Add sample entries
    const sampleData = [
      [new Date(), 'John Smith', 'john@email.com', new Date('2024-01-15'), new Date('2024-01-15'), 'Community Garden North', 3, 'Planted tomatoes'],
      [new Date(), 'Jane Doe', 'jane@email.com', new Date('2024-01-16'), new Date('2024-01-16'), 'Butterfly Garden', 2.5, 'Weeding and watering'],
      [new Date(), 'Bob Wilson', 'bob@email.com', new Date('2024-01-17'), new Date('2024-01-17'), 'Herb Garden, Community Garden South', 4, 'Harvesting herbs and general maintenance']
    ];
    
    sampleData.forEach(row => {
      sheet.appendRow(row);
    });
    
    return { success: true, message: 'Sample data added successfully!' };
  } catch (error) {
    return { success: false, message: 'Error adding sample data: ' + error.toString() };
  }
}

// Get volunteer statistics
function getVolunteerStats() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.VOLUNTEER_HOURS_SHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: true,
        stats: {
          totalVolunteers: 0,
          totalHours: 0,
          totalEntries: 0,
          averageHours: 0
        }
      };
    }
    
    const volunteers = new Set();
    let totalHours = 0;
    
    for (let i = 1; i < data.length; i++) {
      volunteers.add(data[i][1]); // Volunteer name
      totalHours += parseFloat(data[i][6]) || 0; // Hours
    }
    
    const totalEntries = data.length - 1;
    const averageHours = totalEntries > 0 ? (totalHours / totalEntries).toFixed(2) : 0;
    
    return {
      success: true,
      stats: {
        totalVolunteers: volunteers.size,
        totalHours: totalHours,
        totalEntries: totalEntries,
        averageHours: parseFloat(averageHours)
      }
    };
  } catch (error) {
    console.error('Error getting volunteer stats:', error);
    return { success: false, message: error.toString() };
  }
}

