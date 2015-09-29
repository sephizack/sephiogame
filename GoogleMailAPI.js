/*! GoogleMailAPI for sephiOGame
 *  An send selfmail implementation.
 *  2015-09-24
 *
 *  By Imperator2Toulouse
 *  License: sephiOGame collaborator
 */
 
/**
   * auth init
   *
   * @param {}
   */
function checkAuth() {gapi.auth.authorize({'client_id': '4911713620-3podd31sn547c21h1mvidibmaiiupmug.apps.googleusercontent.com','scope': ['https://www.googleapis.com/auth/gmail.send'],'immediate': true}, handleAuthResult);} 

/**
   * Manage auth result
   *
   * @param {output, text} object to write, written text.
   */
function appendResults(output,text) {output.appendChild(document.createElement('P'));output.appendChild(document.createTextNode(text));}

/**
   * Handle auth flow result
   *
   * @param {authResult} Result data.
   */
function handleAuthResult(authResult) {if (authResult && !authResult.error) {if (gup('sephiScript')){document.getElementById('authorize-div').style.display = 'none';appendResults(document.getElementById('output'),(isFR)?'Vous avez autorisé google à envoyer des mails en votre nom. Merci pour votre confiance.':'You have authorized google to send email for you. Thanks to trust us.');}if (!readCookie('gapi_auth','all')){blit_message('Authentifié auprés de Google gmail!');createCookie('gapi_auth',1,1,'all');}loadGmailApi();} else {if (gup('sephiScript')) {authorizeDiv.style.display = 'inline';}if (readCookie('gapi_auth','all')){blit_message('Perte de l\'authentification Google gmail!');createCookie('gapi_auth',0,1,'all');}}}

/**
   * Initiate auth flow in response to user clicking authorize button.
   *
   * @param {Event} event Button click event.
   */
function handleAuthClick(event) {gapi.auth.authorize({'client_id': '4911713620-3podd31sn547c21h1mvidibmaiiupmug.apps.googleusercontent.com','scope': ['https://www.googleapis.com/auth/gmail.send'],'immediate': false},handleAuthResult);return false;}

  /**
   * Load Gmail API client library. List labels once client library
   * is loaded.
   */
function loadGmailApi() {gapi.client.load('gmail', 'v1', null);}

/**
 * Send Message.
 *
 * @param  {String} userId User's email address. The special value 'me'
 * can be used to indicate the authenticated user.
 * @param  {String} email body
 * @param  {Function} callback Function to call when the request is complete.
 */
function sendMessage(userId, email, callback) {gapi.auth.authorize({'client_id': '4911713620-3podd31sn547c21h1mvidibmaiiupmug.apps.googleusercontent.com', 'scope': ['https://www.googleapis.com/auth/gmail.send'], 'immediate': true},function(authResult){if (authResult && !authResult.error) {gapi.client.load('gmail', 'v1', function(){var mail = btoa("Content-Type:  text/plain; charset=\"UTF-8\"\r\nFrom: \"sephiOGame\" <sephiOGame@gmail.com>\r\nTo: "+userId+"\r\nSubject: Ogame Attack Alert\r\n\r\n"+email+"\r\n\r\n(c)SephiOGame Team\r\n").replace(/\+/g, '-').replace(/\//g, '_');var request = gapi.client.gmail.users.messages.send({'userId': userId,'resource': {'raw': mail}});request.execute(callback);blit_message('Email envoyé!');});}})}

