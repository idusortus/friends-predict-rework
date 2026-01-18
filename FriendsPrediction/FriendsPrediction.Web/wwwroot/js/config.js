// API Configuration
const CONFIG = {
    // For local development with Aspire
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:5256'  // Local API port
        : 'https://friends-prediction-api.politeriver-ded1b871.centralus.azurecontainerapps.io'
};
