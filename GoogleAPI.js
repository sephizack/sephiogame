/*! GoogleAPI for sephiOGame
 *  An send selfmail implementation.
 *  2015-09-24
 *
 *  By Imperator2Toulouse
 *  License: sephiOGame collaborator
 */
 
var CLIENT_ID = '4911713620-3podd31sn547c21h1mvidibmaiiupmug.apps.googleusercontent.com';
var SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

function checkAuth() {
 gapi.auth.authorize(
     {
         'client_id': CLIENT_ID,
         'scope': SCOPES,
         'immediate': true
     }, handleAuthResult);
}

 
    
function appendResults(text) {
   var output = document.getElementById('output');
   output.appendChild(document.createElement('P'));
   output.appendChild(document.createTextNode(text));
}


function handleAuthResult(authResult) {
 var authorizeDiv = document.getElementById('authorize-div');
 if (authResult && !authResult.error) {
   // Hide auth UI, then load client library.
   authorizeDiv.style.display = 'none';
   appendResults((isFR)?'Vous avez autorisé google à envoyer des mails en votre nom. Merci pour votre confiance.':'You have authorized google to send email for you. Thanks to trust us.');
   loadGmailApi();
 } else {
   // Show auth UI, allowing the user to initiate authorization by
   // clicking authorize button.
   authorizeDiv.style.display = 'inline';
 }
}


/**
   * Initiate auth flow in response to user clicking authorize button.
   *
   * @param {Event} event Button click event.
   */
function handleAuthClick(event) {
 gapi.auth.authorize(
   {client_id: CLIENT_ID, 
    scope: SCOPES, 
    immediate: false},
   handleAuthResult);
 return false;
}

  /**
   * Load Gmail API client library. List labels once client library
   * is loaded.
   */
function loadGmailApi() {
 //gapi.client.load('gmail', 'v1', listLabels);
}

  /**
   * Send email
   * @param {email address, body text, url callback}
   */
function sendmail(mail_address, mail, callback) {
}
