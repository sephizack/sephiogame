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
function checkAuth() {if (!is_token_valide()){blit_message('Authentification expirée, reconnexion!');gapi.auth.authorize({'client_id': '4911713620-3podd31sn547c21h1mvidibmaiiupmug.apps.googleusercontent.com','scope': ['https://www.googleapis.com/auth/gmail.send'],'approval_prompt': 'force','immediate': false},Auth_Load_Save_info);}return false;} 

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
//function handleAuthResult(authResult) {if (authResult && !authResult.error) {createCookie('gapi_token',gapi.auth.getToken().access_token,1,'all');createCookie('gapi_clientid',gapi.auth.getToken().client_id,1,'all');createCookie('gapi_scope',gapi.auth.getToken().scope,1,'all');if (gup('sephiScript')){document.getElementById('authorize-div').style.display = 'none';appendResults(document.getElementById('output'),(isFR)?'Vous avez autorisé google à envoyer des mails en votre nom. Merci pour votre confiance.':'You have authorized google to send email for you. Thanks to trust us.');}if (readCookie('gapi_auth','all')){blit_message('Authentifié auprés de Google gmail!');createCookie('gapi_auth',1,1,'all');}loadGmailApi();} else {if (gup('sephiScript')) {authorizeDiv.style.display = 'inline';}if (!readCookie('gapi_auth','all')){blit_message('Perte de l\'authentification Google gmail! Cliquer sur le bouton pour vous authentifier.');createCookie('gapi_auth',0,1,'all');}}}

/**
   * Initiate auth flow in response to user clicking authorize button.
   *
   * @param {Event} event Button click event.
   */
//function handleAuthClick(event) {gapi.auth.authorize({'client_id': '4911713620-3podd31sn547c21h1mvidibmaiiupmug.apps.googleusercontent.com','scope': ['https://www.googleapis.com/auth/gmail.send'],'immediate': false},handleAuthResult);return false;}

/**
   * Check the token validity
   *
   * @param {}
   * @Return {boolean}
   */
function is_token_valide(){return( ((readCookie('gapi_token','all') != "" && readCookie('gapi_auth','all')>0) && (parseInt(time()-readCookie('gapi_auth','all')) > parseInt(readCookie('gapi_expires_in','all'))))?1:0);}

/**
   * Check the gmail API load
   *
   * @param {}
   * @Return {boolean}
   */
function is_gmail_loaded(){return(readCookie('gapi_gmail_loaded','all'));}

/**
   * Load Gmail API client library. List labels once client library
   * is loaded.
   */
function loadGmailApi() {createCookie('gapi_gmail_loaded',0,1,'all');gapi.client.load('gmail', 'v1').then(function(){createCookie('gapi_gmail_loaded',1,1,'all');},function(){createCookie('gapi_gmail_loaded',0,1,'all');});}

/**
 * Send Message.
 *
 * @param  {String} userId User's email address. The special value 'me'
 * can be used to indicate the authenticated user.
 * @param  {String} email body
 * @param  {Function} callback Function to call when the request is complete.
 */
function sendMessage(userId, body, callback) {var mail = "Content-Type:  text/plain; charset=\"UTF-8\"\r\n" + "From: \"sephiOGame\" <sephiOGame@gmail.com>\r\n" + "To: "+userId+"\r\n"+"Subject: Ogame Attack Alert\r\n\r\n" +body+"\r\n\r\n"+"(c)SephiOGame Team\r\n";var mailencoded=btoa(mail).replace(/\+/g, '-').replace(/\//g, '_'); mail=null; gapi.auth.authorize({'client_id': '4911713620-3podd31sn547c21h1mvidibmaiiupmug.apps.googleusercontent.com', 'scope': ['https://www.googleapis.com/auth/gmail.send'], 'immediate': true},function(authResult){if (authResult && !authResult.error) {gapi.client.load('gmail', 'v1', function(){var request = gapi.client.gmail.users.messages.send({'userId': 'me','resource': {'raw': mailencoded}});request.execute(callback);blit_message('Email envoyé!');});}})}

/**
 * New check auth system.
 *
 * @param  {Events} Events linked with this call
 */
function checkAuth_NEW(event) {if (is_token_valide()){var temps_restant=get_Time_Remain(readCookie('gapi_auth','all'));appendResults(document.getElementById('output'),(isFR)?'Votre authentification est encore valide pour '+temps_restant+' minutes.':'Your authentication is alive for '+temps_restant+' minutes yet.');temps_restant=null;if (!is_gmail_loaded()) loadGmailApi();} else {blit_message('Authentification expirée, reconnexion!');gapi.auth.authorize({'client_id': '4911713620-3podd31sn547c21h1mvidibmaiiupmug.apps.googleusercontent.com','scope': ['https://www.googleapis.com/auth/gmail.send'],'approval_prompt': 'force','immediate': false},Auth_Load_Save_info);}return false; }
