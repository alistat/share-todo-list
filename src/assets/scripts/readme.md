This directory must contain a file called services-config.js with the following contents:

window.firebaseConnection = {
  apiKey: "API_KEY",
  authDomain: "AUTH_DOMAIN",
  databaseURL: "DATABASE_URL",
  projectId: "PROJECT_ID",
  storageBucket: "STORAGE_BUKET",
  messagingSenderId: "MESSAGING_SENDER_ID"
};

window.firebaseFunctions = 'FUNCTIONS_URL';

window.externalServices = {
  googleAnalytics: true // false to disable
};
