import React, { useState } from 'react';
import { Upload, Download, FileText } from 'lucide-react';

const LeadProcessor = () => {
  const [processedData, setProcessedData] = useState(null);
  const [processing, setProcessing] = useState(false);

  const getCountryFromPhone = (phone) => {
    if (!phone) return 'Unknown';
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Country code mapping
    const countryMap = {
      '998': 'Uzbekistan',
      '972': 'Israel',
      '971': 'UAE',
      '92': 'Pakistan',
      '91': 'India',
      '86': 'China',
      '84': 'Vietnam',
      '7': 'UK', // Assuming 7xxx... are UK numbers
      '66': 'Thailand',
      '64': 'New Zealand',
      '62': 'Indonesia',
      '61': 'Australia',
      '60': 'Malaysia',
      '58': 'Venezuela',
      '55': 'Brazil',
      '51': 'Peru',
      '49': 'Germany',
      '48': 'Poland',
      '45': 'Denmark',
      '44': 'UK',
      '39': 'Italy',
      '38': 'Ukraine/Slovenia',
      '37': 'Latvia/Lithuania',
      '36': 'Hungary',
      '35': 'Portugal/Bulgaria',
      '34': 'Spain',
      '33': 'France',
      '30': 'Greece',
      '23': 'Nigeria',
      '1': 'USA/Canada'
    };

    // Try to match country codes (longest first)
    for (let len = 3; len >= 1; len--) {
      const code = cleanPhone.substring(0, len);
      if (countryMap[code]) {
        return countryMap[code];
      }
    }
    
    return 'Unknown';
  };

  const isValidPhone = (phone) => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, '');
    // Must have at least 7 digits and not be a placeholder
    return cleanPhone.length >= 7 && 
           cleanPhone !== '33666666666' && 
           cleanPhone !== '393330000000' &&
           !phone.includes('(778) 956-9573') &&
           phone !== '+';
  };

  const processCSV = (csvText) => {
    setProcessing(true);
    
    try {
      const lines = csvText.split('\n');
      const leads = new Map(); // Use Map to automatically handle duplicates
      
      // Skip header rows (first 2 lines)
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length < 4) continue;
        
        const dateCreated = parts[0];
        const name = parts[1];
        const email = parts[2];
        const phone = parts[3];
        
        // Skip if no name or invalid phone
        if (!name || !isValidPhone(phone)) continue;
        
        // Use email as unique key (to remove duplicates)
        const key = email + phone;
        
        if (!leads.has(key)) {
          // Split name into first and last
          const nameParts = name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          // Clean phone number and ensure it has +
          let cleanedPhone = phone.trim();
          if (!cleanedPhone.startsWith('+')) {
            cleanedPhone = '+' + cleanedPhone.replace(/\D/g, '');
          }
          
          const country = getCountryFromPhone(cleanedPhone);
          
          leads.set(key, {
            firstName,
            lastName,
            email: email.trim(),
            phone: cleanedPhone,
            country
          });
        }
      }
      
      // Group by country
      const byCountry = {};
      leads.forEach(lead => {
        if (!byCountry[lead.country]) {
          byCountry[lead.country] = [];
        }
        byCountry[lead.country].push(lead);
      });
      
      setProcessedData(byCountry);
      setProcessing(false);
    } catch (error) {
      console.error('Error processing CSV:', error);
      alert('Error processing file. Please check the format.');
      setProcessing(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      processCSV(event.target.result);
    };
    reader.readAsText(file);
  };

  const downloadCSV = (country, leads) => {
    const header = 'First Name,Last Name,Email,Phone Number,Country\n';
    const rows = leads.map(lead => 
      `${lead.firstName},${lead.lastName},${lead.email},${lead.phone},${lead.country}`
    ).join('\n');
    
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${country.replace(/\//g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    if (!processedData) return;
    
    // Combine all leads into one CSV
    const header = 'First Name,Last Name,Email,Phone Number,Country\n';
    const allLeads = [];
    
    Object.keys(processedData).sort().forEach(country => {
      allLeads.push(...processedData[country]);
    });
    
    const rows = allLeads.map(lead => 
      `${lead.firstName},${lead.lastName},${lead.email},${lead.phone},${lead.country}`
    ).join('\n');
    
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all_leads.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Lead Data Processor</h1>
          <p className="text-gray-600 mb-8">Upload your CSV to remove duplicates, filter invalid numbers, and organize by country</p>
          
          <div className="mb-8">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 text-indigo-500 mb-2" />
                <p className="text-sm text-gray-600">Click to upload CSV file</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".csv" 
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {processing && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              <p className="mt-4 text-gray-600">Processing your leads...</p>
            </div>
          )}

          {processedData && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Results</h2>
                <button
                  onClick={downloadAll}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download All Leads CSV
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(processedData).sort().map(country => (
                  <div key={country} className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{country}</h3>
                        <p className="text-sm text-gray-600">{processedData[country].length} leads</p>
                      </div>
                      <FileText className="w-8 h-8 text-indigo-500" />
                    </div>
                    
                    <button
                      onClick={() => downloadCSV(country, processedData[country])}
                      className="w-full bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                    >
                      Download CSV
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Countries</p>
                    <p className="text-2xl font-bold text-indigo-600">{Object.keys(processedData).length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Valid Leads</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {Object.values(processedData).reduce((sum, leads) => sum + leads.length, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duplicates Removed</p>
                    <p className="text-2xl font-bold text-green-600">✓</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Invalid Filtered</p>
                    <p className="text-2xl font-bold text-green-600">✓</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadProcessor;