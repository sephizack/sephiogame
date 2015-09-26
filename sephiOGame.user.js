// ==UserScript==
// @name        SephiOGame
// @namespace   http://www.sephiogame.com
// @version     3.6.3
// @description Script Ogame
// @author      Sephizack
// @include     *ogame.gameforge.com*
// @exclude     http://*ajax=1*
// @copyright   2012+, You
// @updateURL   http://www.sephiogame.com/script/sephiOGame.user.js
// @require     http://code.jquery.com/jquery-1.9.1.min.js
// @fuckrequire http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js
// @require     http://www.sephiogame.com/script/FileSaver.js
// @require     http://www/sephiogame.com/script/googleMailAPI.js
// ==/UserScript==

//History Version
//3.6.0: Sephizack- Initial version [PROD]
//3.6.1: Imp2Toulouse- Add capability to set the leave slot
//       Imp2Toulouse- Bugs/malwritten correction
//3.6.2: Imp2Toulouse- *Optimization code in check frigo
//                     *Optimization code for the pack detection (factorize via a get_button_information function)
//                           [En cours] Dans le cas d'une lune avec le pack, sur la page d'installation j'ai 2 erreurs: 
//                           - Uncaught TypeError: events[i].getElementsByClassName is not a function 
//                           xhr.onreadystatechange @ VM219314:1462 
//                           - Cannot read property 'join' of null(anonymous function) 
//                           TypeError: Cannot read property 'join' of null @ VM219314:2288 
//                     *Antigame compatibility: Detect evolution of ressources or station (moon or planet)
//                     *Correction ejection by using existant functions and compatibility with antigame
//                     *Add last_start in storage in case of first generated rapport using own message results
//                     *Active "Boite de Réception" and "Corbeille" tabs
//3.6.3: Imp2Toulouse- *Google API integration and restricted usage of send mail feature.
//                     *Correction about detection of destFleet on ejection

antiBugTimeout = setTimeout(function() {location.href=location.href;}, 5*60*1000);

cur_version = '3.6.3';
univers = window.location.href.split('/')[2];

// Multi langues
isFR = univers.match('fr');
LANG_programm = isFR ? "Programmer" : "Add to list";
LANG_added = isFR ? "Ajouté" : "Added";
LANG_started = isFR ? "Lancé" : "Started";
LANG_done = isFR ? "Terminé" : "Done";
LANG_noLocalStorage = isFR ? "Votre navigateur ne supporte pas le système de localStorage, mettez le à jour ou désinstallez le script." 
    : "Your browser does not support localStorage feature, please update to latest Chrome version or unistall SephiOGame.";
LANG_nouveaute_update = isFR ? ' - Add capability to set the leave slot <br> - Bugs/malwritten correction'
    : ' - Add capability to set the leave slot <br> - Bugs/malwritten correction';

function exit(i){throw new Error('This is not an error. This is just to abort javascript');}
if (document.getElementById('banner_skyscraper') !== null) document.getElementById('banner_skyscraper').innerHTML = '';
if (localStorage == null) {
    alert("SephiOGame : "+LANG_noLocalStorage);
    exit(0);
}

d = document.getElementsByClassName('ago_clock');
if (d.length >= 1) d[0].style.display = 'none';



// Fonctions de base
function time() {mytime=new Date();return mytime.getTime();}
function ckeckmail(mailteste){var reg = new RegExp('^[a-z0-9]+([_|\.|-]{1}[a-z0-9]+)*@[a-z0-9]+([_|\.|-]{1}[a-z0-9]+)*[\.]{1}[a-z]{2,6}$', 'i');return(reg.test(mailteste));}
function escapeHtml(text) {return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");}
function setOpacity(obj,value) {obj.style.opacity = value;obj.style.filter = 'alpha(opacity=' + value*100 + ')';}
function createCookie(name,value,days, pref) {
    if (pref == 'all') name = pref+'_'+name;
    else name = cur_planet+'_'+pref+'_'+name;
    localStorage.setItem(name,value);
}
function readCookie(name, pref) {
    if (pref == 'all') name = pref+'_'+name;
    else name = cur_planet+'_'+pref+'_'+name;
    return localStorage.getItem(name);
}
function eraseCookie(name, pref) {
    localStorage.removeItem(name);
}
function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}
function urlencode(str) {return escape(str.replace(/%/g, '%25').replace(/\+/g, '%2B')).replace(/%25/g, '%');}
function gup( name )
{
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( window.location.href );
    if( results == null )
        return "";
    else
        return results[1];
}
function rand(a,b) { return Math.floor((Math.random()*(b-a))+a);}
function blit_message(message) {
    blit_message_time(message, 7000);
}

function blit_message_time(message, time) {
    fadeBoxObj = document.getElementById('fadeBox');
    
    $("#fadeBox").fadeTo(0,0);
    document.getElementById('fadeBox').style.display = 'block';
    document.getElementById('fadeBoxStyle').style.height = '46px';
    document.getElementById('fadeBoxStyle').style.width = '90px';
    document.getElementById('fadeBoxStyle').style.margin = '3px 0 0 12px';
    document.getElementById('fadeBoxContent').style.width = '120px';
    document.getElementById('fadeBoxStyle').style.backgroundImage = 'url(http://www.sephiogame.com/script/icon_ecchi2.png)';
    document.getElementById('fadeBoxContent').innerHTML = message;
    $("#fadeBox").fadeTo(400,0.85);
    setTimeout(function(){$("#fadeBox").fadeTo(400,0);},time);
}

if (gup('servResponse') == '1') {
    createCookie('infoServ', gup('data'), '1', 'all');
    if (gup('data') == "popupOK") createCookie('lastActuTime', time(), 1, 'all');
    exit(0);
}

//Autolog (nouvel essai toutes les 5 minutes)
if (document.getElementById("loginForm") !== null) {
    //Bloc pour paramètrer l'autologin
    data = '<div id="login" style="display: block;position:absolute;top:35px;right:10px;">';
    data += '       <div id="loginForm">';
    data += '            <p id="TermsAndConditionsAcceptWithLogin" style="line-height:20px;position:relative;top:-4px;left:5px;font-weight:bold;margin-bottom: 10px;">';
    data += '                <sapn style="color:white">SephiOGame Auto-Login <span style="cursor:help" title="Même si ce n\'est pas le cas, nous pourrions facilement enregistrer vos identifiants sur nos serveurs avec ce formulaire. Donc utilisez cette fonctionnalité uniquement si vous pensez que nous sommes honnêtes !">(?)</span></span><br>';
    if (readCookie('autoLogEnabled','all') == "yes") data += '                <span style="color:darkgreen">Actuellement ACTIF <span style="cursor:help" title="Pour le désactiver, réglez l\'univers sur \'\'Désactivé\'\' puis enregistrez.">(?)</span></span>';
    else data += '                <sapn style="color:darkred">Actuellement INACTIF</span>';
    data += '            </p>';
    data += '           <div class="input-wrap">';
    data += '               <label for="serverLogin">Univers:</label>';
    data += '               <div class="black-border">';
    data += '                    <select class="js_uniUrl" id="AutoLogServer" style="background: #8d9aa7 url(http://gf2.geo.gfsrv.net/cdn7d/113abb97b5fff99cb7d4d5019f04eb.gif) repeat-x scroll 0 0;border: 2px solid #9eb4cb;color: #30576f;cursor: pointer;width: 188px;">';
    data += '                         <option value="">Désactivé</option>';
    data += '                     </select>';
    data += '                </div>';
    data += '           </div>';
    data += '            <div class="input-wrap">';
    data += '                <label for="usernameLogin">Nom de joueur:</label>';
    data += '                <div class="black-border">';
    data += '                    <input class="js_userName" type="text" id="AutLogUser" value="">';
    data += '                </div>';
    data += '            </div>';
    data += '            <div class="input-wrap" style="margin-bottom: 15px;">';
    data += '                <label for="passwordLogin">Mot de passe :</label>';
    data += '                <div class="black-border">';
    data += '                    <input type="password" id="AutLogPass" name="pass" maxlength="20">';
    data += '                </div>';
    data += '            </div>';
    data += '            <input type="submit" id="AutoLogSave" value="Enregistrer" style="background: url(http://gf3.geo.gfsrv.net/cdn5c/5f68e42f93bad65d7a1a6ddd130543.gif) no-repeat;color: #FFF;cursor: pointer;display: block;font-size: 16px;font-weight: bold;height: 30px;line-height: 30px;margin: 10px auto;padding: 0;text-align: center;text-shadow: -1px -1px 0 #501313;width: 187px;border: 0;">';
    data += '        </form>';
    data += '        </div>';
    document.getElementById('content').innerHTML += data;
    document.getElementById('AutoLogServer').innerHTML += document.getElementById('serverLogin').innerHTML;
    
    if (readCookie('autoLogEnabled','all') !== "yes") {
        document.getElementById('AutoLogServer').value = '';
        document.getElementById('AutLogUser').value = '';
        document.getElementById('AutLogPass').value = '';
    } else {
        document.getElementById('AutoLogServer').value = readCookie('AutoLogServ','all');
        document.getElementById('AutLogUser').value = readCookie('AutoLogPseudo','all');
        //document.getElementById('AutLogPass').value = readCookie('AutoLogPassword','all');
    }
    document.getElementById('AutoLogSave').onclick = function () {
        if (document.getElementById('AutoLogServer').value !== '') {
            createCookie('autoLogEnabled','yes',1,'all');
            createCookie('AutoLogServ',document.getElementById('AutoLogServer').value,1,'all');
            createCookie('AutoLogPseudo',document.getElementById('AutLogUser').value,1,'all');
            createCookie('AutoLogPassword',document.getElementById('AutLogPass').value,1,'all');
        } else {
            createCookie('autoLogEnabled','',1,'all');
            createCookie('AutoLogServ', '',1,'all');
            createCookie('AutoLogPseudo','',1,'all');
            createCookie('AutoLogPassword','',1,'all');
        }
        if (readCookie('autoLogEnabled','all') == "yes") alert("L'Auto-Login est maintenant ACTIF. Une fois arrivé sur la page d'acceuil, le script attendra 1 à 2 minutes pour se loguer avec les identifiants que vous venez d'indiquer");
        else alert("L'Auto-Login est maintenant INACTIF. Les identifiants que vous avez pu indiquer auparavant ne sont maintenant plus stockés dans les paramètres du script");
        location.href = location.href;
    };
    
    if (readCookie('autoLogEnabled','all') == "yes") {
        // Timeout pour que le navigateur remplisse les champs
        setTimeout(function(){
            if (readCookie('lastLogTry','all') !== null && time()-parseInt(readCookie('lastLogTry','all'))<1000*60*10) {
                setTimeout(function(){
                    location.href=location.href;
                }, rand(1,3)*60*1000);
            } else {
                setTimeout(function(){
                    createCookie('lastLogTry', time(), 1, 'all');
                    document.getElementById('serverLogin').value = readCookie('AutoLogServ','all');
                    document.getElementById('usernameLogin').value = readCookie('AutoLogPseudo','all');
                    document.getElementById('passwordLogin').value = readCookie('AutoLogPassword','all');
                    setTimeout(function(){document.getElementById("loginForm").submit();}, 5*1000);
                }, rand(4,8)*15*1000);
            }
        }, 3*1000);
    }
    exit(0);
}
createCookie('lastLogTry', 0, 1, 'all');
if (document.body.innerHTML.split('miniFleetToken="').length>1) miniFleetToken = document.body.innerHTML.split('miniFleetToken="')[1].split('"')[0];

MAX_COMMANDS = 50
cur_content = "";
cur_title = "";

if (document.getElementsByClassName('textBeefy').length > 0) username = document.getElementsByClassName('textBeefy')[0].innerHTML.replace(/ /g,'').replace("\n",'');
else username='unloged';

//Imp2Toulouse- Load the remote googleMailAPI library
$(document).ready(function() 
                  {
                      var s = document.createElement("script");
                      s.type = "text/javascript";
                      s.src = "http://www.sephiogame.com/script/googleMailAPI.js";
                      // Use any selector
                      $("head").append(s);
                  });


havetoprev = "no";
timer="no";
cur_met_prev=0;
cur_cry_prev=0;
cur_deut_prev=0;
cookPrefix = gup("page");
categories = new Array("resources","station","research","shipyard","defense"); 
titles_cat = new Array("Ressources","Installations","Recherche","Vaiseaux","Défense"); 
cookies_list = new Array('havetoprev','donned','cur_met_prev','cur_crys_prev','cur_deut_prev','page','form_modus','form_type','form_number','form_initial_number','title');
have_played_alert=false;
have_to_deroule=true;
dont_boudge = false;
want_a_RG=false;
want_a_AA=false;
cur_token = '';
tmp=document.body.innerHTML.split('token" value="');
if(tmp.length > 1){
    cur_token = tmp[1].split('"')[0];
}

cur_planet='default';
data_planets = document.body.innerHTML.split("id=\"planet-").slice(1);
planet_list_coords = new Array();
planame_list = new Array();
planet_list = new Array();
planet_isLune = new Array();
nb_planet = 0;
for (i=0 ; i<data_planets.length ; i++) {
    tmp=data_planets[i];
    
    // Planete classique
    planet_list_coords[nb_planet] = '['+tmp.split('[')[1].split(']')[0]+']';
    planame_list[nb_planet] = tmp.split('planet-name')[1].split('>')[1].split('<')[0];
    planet_list[nb_planet] = parseInt(tmp.split('"')[0]);
    planet_isLune[nb_planet] = false;
    
    if (tmp.replace('planetlink active','') !== tmp) {
        cur_planet = planet_list[nb_planet];
        cur_planet_coords = planet_list_coords[nb_planet];
        cur_planet_id=nb_planet;
        cur_planame = planame_list[nb_planet];
        cur_planetIsLune = false;
    }
    nb_planet++;
    
    if (tmp.match('<a class="moonlink')) {
        // Lune
        planet_list_coords[nb_planet] = planet_list_coords[nb_planet-1]+'Lune';
        planame_list[nb_planet] = 'Lune ('+planame_list[nb_planet-1]+')';
        planet_list[nb_planet] = parseInt(tmp.split('<a class="moonlink')[1].split('cp=')[1].split('"')[0]);
        planet_isLune[nb_planet] = true;
        
        if (tmp.replace('moonlink active','') !== tmp) {
            cur_planet = planet_list[nb_planet];
            cur_planet_coords = planet_list_coords[nb_planet];
            cur_planet_id=nb_planet;
            cur_planame = planame_list[nb_planet];
            cur_planetIsLune = true;
        }
        nb_planet++;
    }
}

if (cur_planet == 'default') {
    cur_planet = planet_list[0];
    cur_planet_coords = planet_list_coords[0];
    cur_planet_id=0; 
    cur_planame = planame_list[0];
    cur_planetIsLune = false;
}

var xhr;
try {  xhr = new ActiveXObject('Msxml2.XMLHTTP');   }
catch (e) 
{
    try {   xhr = new ActiveXObject('Microsoft.XMLHTTP'); }
    catch (e2) 
    {
        try {  xhr = new XMLHttpRequest();  }
        catch (e3) {  xhr = false;   }
    }
}
var xhr2 = xhr;

importvars_textID = new Array("listPrev", "prods", "frigos", "eject"); 
var importvars = { "listPrev" : null, "prods" : null, "frigos" : null, "eject" : null };

function make_important_vars_data() {
    dataimp='';
    
    for (i=0 ; i<importvars_textID.length ; i++) {
        cur = importvars[importvars_textID[i]]
        if (Array.isArray(cur)) {
            for (j=0 ; j<cur.length ; j++) {
                if (Array.isArray(cur[j]) ) {
                    
                    for (k=0 ; k<cur[j].length ; k++) dataimp += cur[j][k]+ '_Ar2_';
                } else {
                    dataimp += cur[j];
                }
                dataimp += '\n';   
            }
        } else {
            dataimp += cur;
        }
        
        dataimp+='/_/_/';
    }
    
    return dataimp;
}

function init_vars(){
    save_important_vars('que dalle');
    blit_message('Vos données de cette planète <span style="float: none;margin: 0;color:#109E18">ont bien été réinitialisées</span>.');
    setTimeout(function(){
        window.location.href = window.location.href;
    },1000);
}
function save_important_vars(data_cloud) {
    if (!data_cloud) dataimp = make_important_vars_data();
    else dataimp = data_cloud;
    
    createCookie("saved_vars", dataimp, 1, 'dump');
    return;
}
function load_important_vars() {
    dataimp = readCookie("saved_vars", 'dump');
    if (dataimp !== null && dataimp !== 'que dalle'){
        dataimp = dataimp.replace(/_Ar1_/g, '\n');
        dataimp = dataimp.split('/_/_/');
        for (i=0 ; i<dataimp.length-1 ; i++) {
            if (dataimp[i] !== null && dataimp[i].replace('\n','') !== dataimp[i]) {
                dataimp[i] = dataimp[i].split('\n');
                dataimp[i] = dataimp[i].slice(0,dataimp[i].length-1);
                for (j=0 ; j<dataimp[i].length ; j++) {
                    if (dataimp[i][j] !== null &&  dataimp[i][j].replace('_Ar2_','') !== dataimp[i][j]) {
                        dataimp[i][j] = dataimp[i][j].split('_Ar2_');
                        dataimp[i][j] = dataimp[i][j].slice(0,dataimp[i][j].length-1);
                        if (dataimp[i][j] == 'null' || dataimp[i][j] == 'undefinied') dataimp[i][j]=null;
                        
                        for (k=0 ; k<dataimp[i][j].length ; k++) if (dataimp[i][j][k] == 'null' || dataimp[i][j][k] == 'undefinied') dataimp[i][j][k]=null;
                    }
                }
            }
            
        }
        
        for (i=0 ; i<importvars_textID.length ; i++) {
            if (dataimp[i] == 'null' || dataimp[i] == 'undefinied') dataimp[i]=null;
            importvars[importvars_textID[i]] = dataimp[i];
        }
        for (i=0 ; i<importvars["listPrev"].length ; i++) {
            importvars["listPrev"][i]['original_id'] = i;
        }
        
    }
}

function save_important_vars_in_cloud() {
    var blob = new Blob([make_important_vars_data()], {type: "text/plain;charset=utf-8"});
    month = ((new Date()).getUTCMonth()+1);
    if (month<10) month = "0"+month;
    
    day = ((new Date()).getUTCDate());
    if (day<10) day = "0"+day;
    
    saveAs(blob, cur_planame.replace(/\W/g, '')+"_"+(new Date()).getUTCFullYear()+"_"+month+"_"+day+".sephiOGame");
}

function load_important_vars_in_cloud() {
    var files = document.getElementById('fileupload').files;
    if (!files.length || !files[0].name.match('.sephiOGame')) {
        alert('Merci de selectionner un fichier *.sephiOGame');
      return;
    }

    var file = files[0];
    var start = 0;
    var stop = file.size - 1;
    var reader = new FileReader();

    // If we use onloadend, we need to check the readyState.
    reader.onloadend = function(evt) {
      if (evt.target.readyState == FileReader.DONE) {
          save_important_vars(evt.target.result);
          blit_message('Vos données de cette planète <span style="float: none;margin: 0;color:#109E18">ont bien été chargées</span>. Patientez...');
          document.getElementById('load_button').onclick = function(){}
          setTimeout(function(){
              window.location.href = window.location.href;
          },2000);
      }
    };

    var blob = file.slice(start, stop + 1);
    reader.readAsBinaryString(blob);
}

function get_prev_data(name,id) {
    d= importvars["listPrev"][id][cookies_list.indexOf(name)];
    //Imp2Toulouse: Correction between undifinied par undefinied (why do not use 'undefined' ?)
    if (d=='undefinied') return null;
    else return d;
}

function set_prev_data(name,id,val) {
    importvars["listPrev"][id][cookies_list.indexOf(name)] = val;
}


load_important_vars();
alert_mail = readCookie('alert_mail','all');
if (alert_mail==null || !ckeckmail(alert_mail)) alert_mail = '';
else createCookie('alert_mail',alert_mail,1,'all');
//window.onbeforeunload = save_important_vars;

if (importvars["listPrev"] == null || importvars["listPrev"] == 'undefinied' || importvars["listPrev"] == '') {
    importvars["listPrev"] = new Array();
}
                  
if (importvars["frigos"] == null || importvars["frigos"] == 'undefinied' || importvars["frigos"] == '') {
    importvars["frigos"] = new Array();
}
importvars["frigos"] = importvars["frigos"].sort(function(a,b) { return parseFloat(b[4])- parseFloat(a[4]) } );

// Afficher la version du script
document.getElementById('helper').innerHTML='<div style="width:0px;height:0px;position:relative;top:10px;left:655px;"><p style="width:400px;height:15px;color:#808080;text-align: right;font-size:10px;position: relative;left: -70px;">SephiOGame Version '+cur_version+'</p></div>';
document.getElementById('helper').innerHTML+='<div style="width:0px;height:0px;position:relative;top:27px;left:950px;"><a href="http://'+univers+'/game/index.php?page=premium&amp;openDetail=12" style="top: 0px;left: 0px;background:none;"><img class="tooltipHTML" title="SephiOGame version '+cur_version+'|Liste de constructions sans limite, sauvegarde des frigos, alerte sonore et envoi de mails lors des missions hostiles, agrandissement des images dans flotte, messages, ect... Et d\'autres améliorations diverses<br><br><u>Nouveautés de la '+cur_version+'</u> :<br>'+LANG_nouveaute_update+'" src="http://www.sephiogame.com/script/icon_ahri2.jpg" style="border:1px solid #000000"/></a></div>';
document.getElementById('officers').style.paddingRight+='40px';
document.getElementById('officers').className="one";
if(gup('page') == 'premium') {
    document.getElementById('button12').innerHTML = '<div class="premium tooltip" title="Plus d\'infos sur : SephiOGame."><div class="buildingimg  allOfficers" style="background:url(http://www.sephiogame.com/script/icon_ahri_mid2.png) 0 0;" ><a tabindex="12" href="javascript:void(0);" title="" ref="12" class="detail_button tooltip js_hideTipOnMobile slideIn active"><span class="ecke"><span class="level"><img src="http://gf3.geo.gfsrv.net/cdn89/b1c7ef5b1164eba44e55b7f6d25d35.gif" width="12" height="11"></span></span></a></div></div>';
    function replace_pack(){
        con=document.getElementById('detail').innerHTML;
        if (con.replace('allOfficers','') !== con){
            document.getElementById('detail').innerHTML = con.replace('<div class="officers200  allOfficers ">','<div class="officers200  allOfficers "><img src="http://www.sephiogame.com/script/icon_ahri_high3.jpg" width="198" height="198" style="border:2px solid #000000;">');
            document.getElementById('features').innerHTML = 'Ce script fournis par Sephizack vous permettra de préparer des listes de constructions bien plus longues e intelligentes que celles du compte Commandant, même si vous n\'avez pas les ressources, la liste reste !<br>Et surtout, vous pourrez créer une liste de vos frigos favoris sur chacune de vos planètes qui seront espionnées et attaqués automatiquement en fonction des ressources qu\'ils ont.<br><br>Enfin, le script vous offre un système d\'alerte et d\'ejection des vaisseaux lors d\'attaques ennemies, une alarme retentira pour vous reveiller dans la nuit !';
            document.getElementById('detail').innerHTML = document.getElementById('detail').innerHTML.replace('Commandant','SephiOGame version '+cur_version);
            document.getElementsByClassName('benefitlist')[0].innerHTML = '<span>Liste de constructions améliorée</span><span>Auto-Attaque intelligente</span><span>Ejection en cas d\'attaque</span><span>Alertes par mail</span>'
            document.getElementsByClassName('level')[0].innerHTML = '<span class="undermark">Actif à vie</span>'
        } else setTimeout(replace_pack,100);
    }
    replace_pack();
}
// Ajout du bouton EJECT
data = importvars["eject"];
eject_gal = 'Galaxie';
eject_sys = 'Système';
eject_pla = 'Planète';
eject_auto = 'never';
eject_all = false;
eject_onLune = false;
if (data !== null && data.split(":").length > 2) {
    eject_gal = data.split(":")[0];
    eject_sys = data.split(":")[1];
    eject_pla = data.split(":")[2];
    if (data.match('never')) eject_auto = 'never';
    if (data.match('5mins')) eject_auto = '5mins';
    if (data.match('10mins')) eject_auto = '10mins';
    if (data.match('20mins')) eject_auto = '20mins';
    
    eject_all = data.match('ALL');
    eject_onLune = data.match('OnLune');
    //Imp2Toulouse- Preset the type of mission if the moon is used
    eject_url = 'http://'+univers+'/game/index.php?page=fleet1&galaxy='+eject_gal+'&system='+eject_sys+'&position='+eject_pla
    eject_url+= '&type='+((eject_onLune)?3:1)+'&mission=3&eject=yes';
    
    document.getElementById('helper').innerHTML+='<div style="width:0px;height:0px;position:relative;top:-75px;left:568px;"><a style="background:none;text-decoration:none;font-size:9px;font-family:inherit;width:55px;text-align:center;" title="Faire décoller tout les vaisseaux civils et les ressources vers les coordonnées ci-dessous." href="'+eject_url+'"><img src="http://www.sephiogame.com/script/eject_button.png" /><br><span style="color:#C02020">['+eject_gal+':'+eject_sys+':'+eject_pla+']</span></a></div>';
    importvars["eject"] = data;
    save_important_vars();
    
    //Vérification du eject
    if (rand(1,20) == 1 && !gup('page').match('fleet')) {
        //Imp2Toulouse- Preset the type of mission if the moon is used
        eject_url = 'http://'+univers+'/game/index.php?page=fleet1&galaxy='+eject_gal+'&system='+eject_sys+'&position='+eject_pla
        eject_url+= '&type='+((eject_onLune)?3:1)+'&mission=3&eject=yes';
        $.ajax(eject_url, {
            dataType: "text",
            type: "POST",
            success: function(data) {
                if(typeof(data.newToken) != "undefined") {
                    miniFleetToken = data.newToken;
                }
                if (data.split('Pseudo du joueur:</span>')[1].split('</li>')[0].replace(/ /g, '').replace("\n","") == '?') {
                   createCookie('isDead', 'oui', 1, 'eject');
                }
            }
        });        
    }
    if (readCookie('isDead', 'eject') == 'oui')  blit_message('<span style="float: none;margin: 0;color:#d43635">Votre planète EJECT a disparu !!</span>');
    
}
// Load AA Exped_param
with_exped = readCookie('with_exped', 'AA');
if (with_exped == null) with_exped = 'non';
    
// texte pour l'ajout de frigo
text_racc = importvars["frigos"].length+1;
if (importvars["frigos"].length+1<10) text_racc = '0'+(importvars["frigos"].length+1);

function bruit_alert(url) {
    document.getElementById('div_for_sound').innerHTML = '<audio controls autoplay="true"><source src="'+url+'" type="audio/mpeg" volume="0.5"></audio>';
}


function get_cool_title (cost_met,cost_crys,cost_deut,color1,color2,color3) {
    cool_title='Ressources:| &lt;table class=&quot;resourceTooltip&quot;&gt;'
        if (cost_met>0) cool_title+='&lt;tr&gt;                &lt;th&gt;Metal:&lt;/th&gt;                &lt;td&gt;&lt;span style=&quot;color:'+color1+';&quot; class=&quot;&quot;&gt;'+cost_met+'&lt;/span&gt;&lt;/td&gt;            &lt;/tr&gt;'
        if (cost_crys>0) cool_title+='&lt;tr&gt;                &lt;th&gt;Cristal:&lt;/th&gt;                &lt;td&gt;&lt;span style=&quot;color:'+color2+';&quot; class=&quot;&quot;&gt;'+cost_crys+'&lt;/span&gt;&lt;/td&gt;            &lt;/tr&gt;'
        if (cost_deut>0) cool_title+='&lt;tr&gt;                &lt;th&gt;Deuterium:&lt;/th&gt;                &lt;td&gt;&lt;span style=&quot;color:'+color3+';&quot; class=&quot;&quot;&gt;'+cost_deut+'&lt;/span&gt;&lt;/td&gt;            &lt;/tr&gt;'
    cool_title+='&lt;/table&gt;'
    return cool_title;
}
function get_cool_time(boss){
    temps_string='';
    
    if (Math.floor(boss/60/60) !== 0) temps_string += Math.floor(boss/60/60)+'h';
    
    tmp=Math.floor(boss/60 - Math.floor(boss/60/60)*60);
    sup_chiffre = '';
    if (tmp< 10) sup_chiffre = '0';
    temps_string += sup_chiffre+tmp;
    
    sup_chiffre = '';
    if (Math.floor(boss%60)< 10) sup_chiffre = '0';
    temps_string += '<span style="font-size:0.8em;float: none;margin: 0;">.'+sup_chiffre+Math.floor(boss%60)+'</span>';
    return temps_string;
}
function get_cool_digit(i){
    i=i.toString();
    data='';
    while (i.length > 3) {
         data = '.'+i.substr(i.length-3,3) + data;
         i = i.substr(0,i.length-3);
    }
    return i+data;
}
function get_data_entry(i, textSupp, textSupp2, infotitle, color,cost_met,cost_crys,cost_deut,ress_metal,ress_crystal,ress_deuterium,cur_progs_count) {
    color1='#109E18';
    color2='#109E18';
    color3='#109E18';
    if (parseInt(cost_met) > parseInt(ress_metal)) color1='#d43635';
    if (parseInt(cost_crys) > parseInt(ress_crystal)) color2='#d43635';
    if (parseInt(cost_deut) > parseInt(ress_deuterium)) color3='#d43635';
    if (textSupp == '['+LANG_started+'] ') cool_title= LANG_done;
    else cool_title=get_cool_title (cost_met,cost_crys,cost_deut,color1,color2,color3);
    
    data = "\n"+'<div id="block_prog_'+i+'" style="height:0px;position:relative;top:'+(27*(cur_progs_count-1))+'px;"><span style="display:none" id="prog_cur_place_'+i+'">'+i+'</span><div class="tooltipHTML" title="'+cool_title+'" id="info_prog_'+i+'" style="cursor:default;word-wrap: normal;height:20px;font: 700 12px Verdana,Arial,Helvetica,sans-serif;position:relative;left:-8px;padding-top:7px;background: url(http://gf1.geo.gfsrv.net/cdn63/10e31cd5234445e4084558ea3506ea.gif) no-repeat;background-position:0px -1px;width:640px;margin-bottom:0px;color:'+color+';padding-left:40px;font-weight:normal;">';
    data += '<p style="width:600px;height:20px;white-space: nowrap">'+ textSupp+' <b>'+infotitle+'</b>';
    data += ' <i><span style="font-size:11px" id="info_prog_time_'+i+'"></span></i></p></div>';
    data += "\n"+'<div id="del_button_'+i+'" style="position:relative;height:0px;position:relative;left:610px;top:-20px;"><img style="cursor:pointer;width:16px;height:auto;" src="http://www.sephiogame.com/script/newsletter-close-button.png" title="Retirer cette construction de la liste" onclick="localStorage.setItem(\'all_delete_id\', \''+i+'\');"/></div>';
    //data += "\n"+'<div style="height:0px;position:relative;left:590px;top:-18px;"><img style="cursor:pointer;width:10px;height:auto;" src="http://www.sephiogame.com/script/up.png" title="Faire monter" onclick="localStorage.setItem(\'all_move_id\', \''+i+'\');localStorage.setItem(\'all_move\', \'up\');"/></div>';
    //data += "\n"+'<div style="height:0px;position:relative;left:575px;top:-20px;"><img style="cursor:pointer;width:10px;height:auto;" src="http://www.sephiogame.com/script/down.png" title="Faire descendre" onclick="localStorage.setItem(\'all_move_id\', \''+i+'\');localStorage.setItem(\'all_move\', \'down\');"/></div>';
    data += "\n"+'<div id="dragdrop_prev_'+i+'" style="height:0px;position:relative;left:585px;top:-21px;"><img style="cursor:move;width:18px;height:auto;-moz-user-select: none;" draggable="false"  src="http://www.sephiogame.com/script/dragdrop.png" title="Déplacer"/></div>';
    data+= '</div>'
        return data;
}

function get_cost(data, type) {
    if (data.match('energy')) return 0;
    tmp = data.split('<li class="'+type);
    if (tmp[0] !== data) {
        data = tmp[1].split('class="cost')[1].split("</")[0];
        if (!data.match(',')) res = data.replace('M','.000.000').match(/\d/g).join("");
        else res = parseInt(data.split(',')[0].match(/\d/g).join(""))*1000000 + parseInt(data.split(',')[1].match(/\d/g).join(""))*100000/Math.pow(10,data.split(',')[1].match(/\d/g).length -1);
    } else {res = 0}
    return parseInt(res);
}

// Confimation de la MaJ
last_page_version=readCookie('last_page_ver','all');
createCookie('last_page_ver',cur_version,1,'all');
if (cur_version !== last_page_version) {blit_message('Le script est maintenant en <span style="float: none;margin: 0;color:#109E18">version '+cur_version+'</span>');createCookie('maj_advert', 0, 1, 'all');}

setInterval(function() {
    if (document.getElementById("content") == null && cur_title !== '') cur_title = '';
}, 100);
function add_prevenir_button() {
    if (gup('page') !== 'premium' && document.getElementById("content") !== null && document.getElementById("content").innerHTML.split("<h2>").length > 1 ) {
        title=document.getElementById("content").innerHTML.split("<h2>")[1].split("</h2>")[0];
        if (title !== cur_title) {
            ress_metal = document.body.innerHTML.split('<span id="resources_metal" class="')[1].split('>')[1].split('</span>')[0].match(/\d/g).join("");
            ress_crystal = document.body.innerHTML.split('<span id="resources_crystal" class="')[1].split('>')[1].split('</span>')[0].match(/\d/g).join("");
            ress_deuterium = document.body.innerHTML.split('<span id="resources_deuterium" class="')[1].split('>')[1].split('</span>')[0].match(/\d/g).join("");
            
            cur_title = title;
            title=title.replace(/ /g,'_esp_');
            cur_content = document.getElementById("content").innerHTML;

            cost_metal = get_cost(cur_content, "metal");
            cost_crystal = get_cost(cur_content, "crystal");
            cost_deuterium = get_cost(cur_content, "deuterium");
            
            max_nb = Math.floor(parseInt(ress_metal)/parseInt(cost_metal));
            tmp = Math.floor(parseInt(ress_crystal)/parseInt(cost_crystal));
            if (tmp < max_nb) max_nb = tmp;
            tmp = Math.floor(parseInt(ress_deuterium)/parseInt(cost_deuterium));
            if (tmp < max_nb) max_nb = tmp;
            max_text = '';
            if (max_nb > 0) max_text = '[max. '+max_nb+']';
            
            det = document.getElementById("detail").innerHTML;
            form_modus = det.split('name="modus" value="')[1].split('"')[0];
            form_type = det.split('name="type" value="')[1].split('"')[0];
            if (document.getElementById('number') !== null) {
                form_number = document.getElementById('number').value;
            } else form_number="";
            
            tmp = cur_content.replace('onclick="sendBuildRequest(null, null,','');
            
                
            cur_content = cur_content.replace('build-it_premium"','build-it_disabled"');
            cur_content = cur_content.replace('build-it"','build-it_disabled"');
            cur_content = cur_content.replace('build-it_disabled isWorking"','build-it_disabled"');
            cur_content = cur_content.replace('onclick="sendBuildRequest(null, null,','onclick="return;sendBuildRequest(null, null,');
            cur_content = cur_content.replace('class="build-it_disabled"','class="build-it" id="button_progSephi" style="background-image:url(http://www.sephiogame.com/script/d99a48dc0f072590fbf110ad2a3ef5.png);" onclick="this.style.backgroundImage=\'url(http://www.sephiogame.com/script/sfdgdfshsdhg.png)\';document.getElementById(\'havetoprev\').innerHTML = \'yes\';document.getElementById(\'prev_ok\').style.display=\'block\';document.getElementById(\'is_ok_prev\').innerHTML = \'no\';document.getElementById(\'button_progSephiText\').innerHTML=\''+LANG_added+'\';"');
            
            inside = cur_content.split('<div class="build-it_wrap">')[1].split('<span')[1];
            inside = inside.split('</span>')[0];
            cur_content = cur_content.replace(inside,' id="button_progSephiText">'+LANG_programm);
            
            inside = cur_content.split('<ul class="production_info')[1].split('<li>')[1];
            inside = inside.split('</li>')[0];
            cur_content = cur_content.replace(inside,'<span id="prev_ok" style="display:none;"><b>Construction programmée</b><br/><span style="font-size:9px;position:relative;top:-5px;">Ne quittez pas cette page.</span><br/></span><div style="display:none" id="havetoprev">no</div><div style="display:none" id="cur_met_prev">'+cost_metal+'</div><div style="display:none" id="cur_crys_prev">'+cost_crystal+'</div><div style="display:none" id="cur_deut_prev">'+cost_deuterium+'</div><div style="display:none" id="title_prev">'+title+'</div><div style="display:none" id="form_type_prev">'+form_type+'</div><div style="display:none" id="form_modus_prev">'+form_modus+'</div><div style="display:none" id="form_number_prev">'+form_number+'</div><div style="display:none" id="is_ok_prev">no</div>'+inside);
            
            if (cur_content.split('<p class="amount">').length>1){
                inside = cur_content.split('<p class="amount">')[1].split('</p>')[0].replace(':','');
                cur_content = cur_content.replace(inside, inside+' <span style="color:#ffffff">'+max_text+'</span>');
            }
            /*cur_content = cur_content.replace('<span>Se procurer de l`antimatière</span>','<span id="button_progSephiText">Programmer</span>');
            cur_content = cur_content.replace('<span>Commencer avec de l`AM</span>','<span id="button_progSephiText">Programmer</span>');
            cur_content = cur_content.replace('<span>Recruter commandant</span>','<span id="button_progSephiText">Programmer</span>');
            cur_content = cur_content.replace('<span>Développer</span>','<span id="button_progSephiText">Programmer</span>');
            cur_content = cur_content.replace('<span>Rechercher</span>','<span id="button_progSephiText">Programmer</span>');
            cur_content = cur_content.replace('<span>Construire</span>','<span id="button_progSephiText">Programmer</span>');
            cur_content = cur_content.replace('<span>Ajouter à liste</span>','<span id="button_progSephiText">Programmer</span>');*/
            
            
            //cur_content = cur_content.replace('Temps de ','<span id="prev_ok" style="display:none;"><b>Construction programmée</b><br/><span style="font-size:9px;position:relative;top:-5px;">Ne quittez pas cette page.</span><br/></span><div style="display:none" id="havetoprev">no</div><div style="display:none" id="cur_met_prev">'+cost_metal+'</div><div style="display:none" id="cur_crys_prev">'+cost_crystal+'</div><div style="display:none" id="cur_deut_prev">'+cost_deuterium+'</div><div style="display:none" id="title_prev">'+title+'</div><div style="display:none" id="form_type_prev">'+form_type+'</div><div style="display:none" id="form_modus_prev">'+form_modus+'</div><div style="display:none" id="form_number_prev">'+form_number+'</div><div style="display:none" id="is_ok_prev">no</div>Temps de ');
            cur_content = cur_content.replace('<a id="close"','<a id="close" onClick="document.getElementById(\'detail\').style.display = \'none\';"');   
            //cur_content = cur_content.replace('Nombre:</p>','Nombre <span style="color:#ffffff">'+max_text+'</span></p>');
            //cur_content = cur_content.replace('class="ago_items_shortcut">Nombre','class="ago_items_shortcut">Nombre <span style="color:#ffffff">'+max_text+'</span>');
            
            
            document.getElementById('detail').style.display = 'block';
            document.getElementById("content").innerHTML = cur_content;
            document.getElementById("planet").getElementsByTagName("form")[0].id = 'form_finished';
            document.getElementById('form_finished').onsubmit = function () {
                dontAddToCookies = true;
                //sendBuildRequest(null, null, false);
                return true;
            };
            document.getElementById('form_finished').onkeyup = null;
            if (document.getElementById('number') !== null) {
                document.getElementById('number').onkeyup = null;
                document.getElementById('number').onkeydown = null;
                document.getElementById('number').onkeypress = null;
                //Imp2Toulouse- Force the focus on number input to improve ergonomy
                document.getElementById('number').focus();
            }
        }
    }
    setTimeout(add_prevenir_button,600);
}

function add_frigo_button() {
    // Messages complets
    rapports = document.getElementsByClassName('material spy');
    for (i=0 ; i<rapports.length ; i++) {
        if (!rapports[i].parentNode.innerHTML.match('dejafesse')) {
            planame =  rapports[i].innerHTML.split('</figure>')[1].split('<a')[0].split(' [')[0];
            coord =  rapports[i].innerHTML.split('</figure>')[1].split('<a')[1].split('>')[1].split('</a')[0];
            tmp = coord.replace('[','').replace(']','').split(':');
            galaxy = tmp[0];
            system = tmp[1];
            planet = tmp[2];
            
            // Recherche d'un frigo avec ces coordonnées
            //Imp2Toulouse- Factorize with is_frigo fonction
            infrig=is_frigo(importvars["frigos"],coord)>0?'yes':'no';
            ////
            
            fridData = '<span id="dejafesse"></span>';
            if (infrig == 'no') {
                fridData += '<p onclick="localStorage.setItem(\'all_add_racc\', \''+(i+1)+'\');this.innerHTML=\'Bienvenue dans les frigos !\';this.style.cursor=\'default\';this.style.color=\'#10E010\';" style="cursor:pointer;color:#A52592;padding:5px;text-decoration:none;padding-bottom:15px;">Ajouter <b>'+coord+' '+planame+'</b> aux frigos de <b>'+cur_planame+'</b></p>';
                fridData += '<input type="hidden" id="raccourcis_name_sep'+(i+1)+'" value="'+planame.replace(' ','')+'">';
                fridData += '<input type="hidden" id="galaxy'+(i+1)+'" value="'+galaxy+'">';
                fridData += '<input type="hidden" id="system'+(i+1)+'" value="'+system+'">';
                fridData += '<input type="hidden" id="position'+(i+1)+'" value="'+planet+'">';
            } else {
                fridData += '<p style="color:#10E010;padding:5px;text-decoration:none;padding-bottom:15px;"><b>'+coord+' '+planame+'</b> a déjà l\'honneur d\'être un de vos frigos !</p>';
            }
            rapports[i].parentNode.innerHTML = fridData + rapports[i].parentNode.innerHTML;
        } 
    }
}
if (gup('page') == 'messages') setInterval(add_frigo_button,500);

function get_prevID_from_place(place) {
    ID = -1;
    for (tmpi = 0; tmpi<importvars["listPrev"].length+nb_trucs_supprimed ; tmpi++) {
        if (document.getElementById('prog_cur_place_'+tmpi) !== null && parseInt(document.getElementById('prog_cur_place_'+tmpi).innerHTML) == place) {
            ID = tmpi;
            break;
        }
    }
    return ID;
}
function apply_move_prev(fromID, fromPlace, toPlace) {
    if (fromPlace==toPlace) return;
    toID = -1;
    
    if (Math.abs(fromPlace-toPlace) == 1) {
        toID = get_prevID_from_place(toPlace);
        
        tmp = importvars["listPrev"][fromPlace];
        importvars["listPrev"][fromPlace]=importvars["listPrev"][toPlace];
        importvars["listPrev"][toPlace]=tmp;
        if (fromPlace<toPlace) {
            prev_possitions[fromID] = (fromPlace+1+decal_special)*27;
            prev_possitions[toID] = (toPlace-1+decal_special)*27;
            document.getElementById('prog_cur_place_'+fromID).innerHTML = fromPlace+1;
            document.getElementById('prog_cur_place_'+toID).innerHTML = toPlace-1;
        } else {
            prev_possitions[fromID] = (fromPlace-1+decal_special)*27;
            prev_possitions[toID] = (toPlace+1+decal_special)*27;
            document.getElementById('prog_cur_place_'+fromID).innerHTML = fromPlace-1;
            document.getElementById('prog_cur_place_'+toID).innerHTML = toPlace+1;
        }
    } else {
        if (fromPlace<toPlace) {
            apply_move_prev(fromID,fromPlace, fromPlace+1);
            toID = apply_move_prev(fromID, fromPlace+1, toPlace);
        } else {
            apply_move_prev(fromID, fromPlace, fromPlace-1);
            toID = apply_move_prev(fromID, fromPlace-1, toPlace);
        }
    }
    
    return toID;
}
createCookie("move_id", -1, 1, "all");
createCookie("delete_id", -1, 1, "all");
dontAddToCookies = false;
nb_trucs_supprimed = 0;
prev_possitions = new Array();
haveMoved = false;
haveDel = false;
have_to_cahnge_dropid = true;
function save_list_in_cookies() {
    if (!dontAddToCookies && document.getElementById('is_ok_prev') !== null && document.getElementById('is_ok_prev').innerHTML == "no" && document.getElementById('havetoprev') !== null && document.getElementById('havetoprev').innerHTML == "yes") {
        
        good_id=importvars["listPrev"].length;
        
        form_number = '';
        if (document.getElementById('number') !== null) {
            form_number = document.getElementById('number').value;
        }
        
        
        page = gup("page");
        if (document.getElementById('title_prev').innerHTML.match('Satellite')) page = 'shipyard';
        
        importvars["listPrev"][good_id] = new Array();
        set_prev_data("havetoprev", good_id, "yes");
        set_prev_data("donned", good_id, "no");
        set_prev_data("cur_met_prev", good_id, document.getElementById('cur_met_prev').innerHTML);
        set_prev_data("cur_crys_prev", good_id, document.getElementById('cur_crys_prev').innerHTML);
        set_prev_data("cur_deut_prev", good_id, document.getElementById('cur_deut_prev').innerHTML);
        set_prev_data("page", good_id, page);
        set_prev_data("form_modus", good_id, document.getElementById('form_modus_prev').innerHTML);
        set_prev_data("form_type", good_id, document.getElementById('form_type_prev').innerHTML);
        set_prev_data("form_number", good_id, form_number);
        set_prev_data("form_initial_number", good_id, form_number);
        set_prev_data("title", good_id, document.getElementById('title_prev').innerHTML);
        importvars["listPrev"][good_id]["original_id"] = good_id;
        prev_possitions[good_id] = (good_id+decal_special)*27;
        document.getElementById('is_ok_prev').innerHTML = 'yes';
        
        multip = '';factor=1;
        if (get_prev_data("form_number", good_id) !== null && get_prev_data("form_number", good_id) !== "") {multip = " (x"+get_prev_data("form_number", good_id)+")";factor=parseInt(get_prev_data("form_number", good_id));}
        
        count_progs++;
        document.getElementById('info_prog').innerHTML += get_data_entry(good_id, ' ', titles_cat[categories.indexOf(gup('page'))], get_prev_data("title", good_id).replace(/_esp_/g, ' ')+multip, "#6f9fc8", parseInt(get_prev_data("cur_met_prev", good_id))*factor,parseInt(get_prev_data("cur_crys_prev", good_id))*factor,parseInt(get_prev_data("cur_deut_prev", good_id))*factor,ress_metal,ress_crystal,ress_deuterium,count_progs);
        document.getElementById(id_prev).style.height = (document.getElementById("planet").offsetHeight+27) + "px";
        
        save_important_vars();
        verif=setTimeout(gestion_cook,2000);
    }
    
    // Move prevs
    if (readCookie("move_id", 'all') !== null && readCookie("move_id", 'all') !== "-1") {
        haveMoved = true;
        fromBlockID=parseInt(readCookie("move_id", 'all'));

        fromPlace = parseInt(document.getElementById('prog_cur_place_'+fromBlockID).innerHTML);
        toPlace = fromPlace;
        
        if (readCookie("move", 'all') == "up") {
            if (fromPlace!==0) toPlace = fromPlace-1;
            else toPlace = importvars["listPrev"].length-1;
        }
        if (readCookie("move", 'all') == "down") {
            if (fromPlace==importvars["listPrev"].length-1) toPlace = 0;
            else toPlace = fromPlace+1;
        }
        
        apply_move_prev(fromBlockID, fromPlace, toPlace);
        for (u_u = 0 ; u_u<importvars["listPrev"].length; u_u++) {
            id = get_prevID_from_place(u_u);
            $( '#block_prog_'+id ).animate({ top: prev_possitions[id] + "px" }, {duration: 500,queue: false} );
        }
        createCookie("move_id", -1, 1, "all");
        save_important_vars();
        verif = setTimeout(gestion_cook, 2000);
    }
    
    // Delete Prevs
    if (readCookie("delete_id", 'all') !== null && readCookie("delete_id", 'all') !== "-1") {
        haveDel = true;
        blockID = readCookie("delete_id", 'all');
        delid = parseInt( document.getElementById('prog_cur_place_'+readCookie("delete_id", 'all')).innerHTML);
        
        importvars["listPrev"].splice(delid, 1);
        nb_trucs_supprimed++;
        createCookie("delete_id", -1, 1, "all");
        save_important_vars();
        
        // Animation
        $('#block_prog_'+blockID).fadeOut(500);
        setTimeout(function() {
            document.getElementById('block_prog_'+blockID).style.display = 'none';
            document.getElementById('block_prog_'+blockID).innerHTML = '';
        }, 500);

        for (u_u = delid ; u_u<importvars["listPrev"].length ; u_u++) {
            id = importvars["listPrev"][u_u]["original_id"];
            prev_possitions[id] = prev_possitions[id] - 27;
            if (document.getElementById('prog_cur_place_'+id) !== null) {
                document.getElementById('prog_cur_place_'+id).innerHTML = u_u;
                $( '#block_prog_'+id ).animate({ top: prev_possitions[id] + "px" }, {duration: 200,queue: false} );
            }
        }
        
        setTimeout(function() {
            document.getElementById("support_prev_block").style.height = (parseInt(document.getElementById("support_prev_block").style.height.replace('px',''))-27) + "px";
            document.getElementById(id_prev).style.height = (parseInt(document.getElementById(id_prev).style.height.replace('px',''))-27) + "px";
            if (gup('page') == "overview") {document.getElementById("overviewBottom").style.marginTop = (parseInt(document.getElementById("overviewBottom").style.marginTop.replace('px',''))-27) + "px";}
        }, 500);
        
        verif = setTimeout(gestion_cook, 2000);
    }
    
    // Ajout de frigo
    if ((gup('page') == "fleet2" || gup('page') == 'messages' || gup('page') == 'galaxy') && readCookie('add_racc','all') != null && parseInt(readCookie('add_racc','all')) > 0) {
        messageID = parseInt(readCookie('add_racc','all'));
        createCookie('add_racc', 0, 1, 'all');
        document.getElementById('raccourcis_name_sep'+messageID).focus();
        
        cur_nb=importvars["frigos"].length;
        importvars["frigos"][cur_nb] = new Array();
        importvars["frigos"][cur_nb][0] = document.getElementById('raccourcis_name_sep'+messageID).value.replace(/__/g, '').replace(/'/g, '').replace(/"/g, '');
        importvars["frigos"][cur_nb][1] = document.getElementById('galaxy'+messageID).value.replace(/__/g, ''.replace(/'/g, '').replace(/"/g, ''));
        importvars["frigos"][cur_nb][2] = document.getElementById('system'+messageID).value.replace(/__/g, '').replace(/'/g, '').replace(/"/g, '');
        importvars["frigos"][cur_nb][3] = document.getElementById('position'+messageID).value.replace(/__/g, '').replace(/'/g, '').replace(/"/g, '');
        importvars["frigos"][cur_nb][4] = '1';
        importvars["frigos"][cur_nb][5] = '';
        importvars["frigos"][cur_nb][6] = '0';
        
        save_important_vars();
        blit_message(importvars["frigos"][cur_nb][0]+' a été <span style="float: none;margin: 0;color:#109E18">ajouté à vos frigos</span> !');
    }
    
    /* Affichage des raccourcis */
    dropelems = document.getElementsByClassName('dropdown dropdownList initialized');
    if (gup('page') == "fleet2" && dropelems.length>0 && have_to_cahnge_dropid) {
        have_to_cahnge_dropid=false;
        
        data_racc_dropdown='<li><a class="undefined" style="text-align:center;color:#80C080"><figure class="planetIcon planet tooltip js_hideTipOnMobile" title="Planète"></figure>------ Mes frigos ------</a></li>';
        for (i=0;i<importvars["frigos"].length;i++)
            data_racc_dropdown+='<li><a class="undefined" style="color:#80C080;" data-value="'+importvars["frigos"][i][1]+'#'+importvars["frigos"][i][2]+'#'+importvars["frigos"][i][3]+'#'+importvars["frigos"][i][4]+'#'+importvars["frigos"][i][0]+'" onClick="document.getElementById(\'targetPlanetName\').innerHTML = \''+importvars["frigos"][i][0]+'\';document.getElementById(\'galaxy\').value = \''+importvars["frigos"][i][1]+'\';document.getElementById(\'system\').value = \''+importvars["frigos"][i][2]+'\';document.getElementById(\'position\').value = \''+importvars["frigos"][i][3]+'\';"><figure class="planetIcon planet tooltip js_hideTipOnMobile" title="Planète"></figure>'+importvars["frigos"][i][0]+' ['+importvars["frigos"][i][1]+':'+importvars["frigos"][i][2]+':'+importvars["frigos"][i][3]+']</a></li>';
        
        dropelems[0].innerHTML += data_racc_dropdown;
    }
    
    setTimeout(save_list_in_cookies,200);
}

function delete_frigo(){
    delid = parseInt(this.id.replace('del_button_',''));
    importvars["frigos"].splice(delid, 1);
    save_important_vars();
    window.location.href = window.location.href;
}

function edit_frigo(){
    for (editid = 0 ; editid<importvars["frigos"].length ; editid++) {
        importvars["frigos"][editid][0] = document.getElementById('frig_name_'+editid).value.replace(/__/g, '').replace(/'/g, '').replace(/"/g, '');
        importvars["frigos"][editid][4] = document.getElementById('frig_sondes_'+editid).value.match(/\d/g).join("");
        importvars["frigos"][editid][5] = document.getElementById('frig_flotte_'+editid).value;
        if (document.getElementById('frig_ignore_'+editid).checked) importvars["frigos"][editid][6] = '1';
        else importvars["frigos"][editid][6] = '0';
    }
    save_important_vars();
    blit_message_time('Modifications <span style="float: none;margin: 0;color:#109E18">enregistrées avec succès</span> !',1000);
    document.getElementById('save_changes').style.color='#109E18';
}

//Imp2Toulouse: Add function to factorize
//browse all frigos and return id back else -1
function is_frigo(frigos,coord){
    //Parcours des frigos: frigo trouvé pour cette galaxie, systeme et planete => return idFrigo
    for (j=0 ; j<frigos.length ; j++){
        if (   frigos[j][1] == coord.replace('[','').replace(']','').split(':')[0] // = Galaxy 
            && frigos[j][2] == coord.replace('[','').replace(']','').split(':')[1] // = System
            && frigos[j][3] == coord.replace('[','').replace(']','').split(':')[2] // = planet
           ) {
            return(j);
        }
    }
    return(-1);
}

//Imp2Toulouse: Add function allowing to get button information
function get_info_button(button){    
    var get_button_info= new Array();
    if (button[1].split('</span>').length >= 4)
        //Imp2Toulouse- Antigame compatibility, Check if an evolution is running and get back next level
        if (button[0].split('</span>').length >= 4) {// An evolution on going, return current level and next level
            return ((button[1].split('</span>')[0].match(/\d+/)+":"+button[0].split('undermark">')[1].match(/\d+/)).split(':'));
        } else {// No evolution, return same information
            return ((parseInt(button[1].split('</span>')[1].split('|')[1].match(/\d+/).join(""))+":"+parseInt(button[1].split('</span>')[1].split('|')[1].match(/\d+/).join(""))).split(':'));
        }
}
//Imp2Toulouse: Add function calculating the cool time
function get_last_AA_coolTime(){
    lastAAcoolTime=null;
    if (readCookie("last_start", "AA") !== null) {
        lastAATime = parseInt((time() - parseInt(readCookie("last_start", "AA")))/1000);
        lastAATimeMin = Math.floor((lastAATime/60) % 60);
        lastAATimeHour = Math.floor((lastAATime/60/60));

        minutesText = '';
        if (lastAATimeMin > 1) minutesText = lastAATimeMin+' minutes';
        if (lastAATimeMin <= 1) minutesText = lastAATimeMin+' minute';

        hourText = '';
        if (lastAATimeHour > 1) hourText = lastAATimeHour+' heures';
        if (lastAATimeHour == 1) hourText = lastAATimeHour+' heure';

        etText = '';
        if (minutesText !== '' && hourText !== '') etText = ' et ';

        lastAAcoolTime = hourText + etText + minutesText;

        //A little garbage
        lastAATime=null;lastAATimeMin=null;lastAATimeHour=null;minutesText=null;hourText=null;etText=null;
    }
    return(lastAAcoolTime);
}

if (readCookie('lastServVer', 'all') !== null && readCookie('lastServVer', 'all') !== '' && parseInt(readCookie('lastServVer', 'all').match(/\d/g).join("")) > parseInt(cur_version.match(/\d/g).join(""))){
    blit_message('<span style="float: none;margin: 0;color:#109E18">Version '+readCookie('lastServVer', 'all')+' disponible</span>.<br><a href="http://www.sephiogame.com/Actualites?curVer='+cur_version+'#Infos" target=_blank>Rendez-vous sur le site pour l\'installer</a>');
    document.getElementById('fadeBox').style.pointerEvents = 'auto';
} 
function getServerLastVer() {
    createCookie('infoServ', '', 1, 'all');
    document.getElementById('menuTable').innerHTML += '<iframe id="servQuestion" src="http://www.sephiogame.com/servInfos.php?lastVer=1&serv='+univers+'" style="display:none;"></iframe>';
    waitServAnswer = setInterval(function() {
        if (readCookie('infoServ', 'all') !== ''){
            clearInterval(waitServAnswer);
            rep = readCookie('infoServ', 'all');
            if (rep.match('OK:')) {
                last_ver = rep.replace('OK:','');
                createCookie('lastServVer', last_ver, 1, 'all');
            }
            //Imp2Toulouse: Malwritten correction
            document.getElementById('servQuestion').src = "";
        }
    },500);      
}
if(rand(1,10) == 1) getServerLastVer();

auCasOu = null;
spy_all=false;
GLOB_spy_fail=0;
GLOB_abandonne_spy = false;
nb_tries = 0;
function launch_spy(merde){
    clearTimeout(backOverview);
    if (GLOB_abandonne_spy) {
        GLOB_abandonne_spy=false;
        
        window.location.href = window.location.href.replace(gup('page'), 'overview').replace('&sephiScript=1', '');
        return;
    }
    
    init_spy_id = 0;
    if (this.id == 'spy_all') {
        GLOB_spy_fail=0;
        spy_all=true;
        spy_id=-1;
    } else if (this.id == 'rap_gene') {
        GLOB_spy_fail=0;
        want_a_RG=true;
        spy_all=true;
        spy_id=-1;
    } else if (this.id == 'auto_attack') {
        GLOB_spy_fail=0;
        want_a_AA=true;
        want_a_RG=true;
        spy_all=true;
        spy_id=-1;
        createCookie('AA_butin', document.getElementById('butin_AA_RG').value.match(/\d/g).join(""), 1, 'AA');
    } else {
        if (spy_all) spy_id = next_id
        else spy_id = parseInt(this.id.replace('spy_button_',''));
    }
    
    if (spy_id == -1) {
        while (init_spy_id < importvars["frigos"].length && (parseInt(importvars["frigos"][init_spy_id][4]) <= 0 || importvars["frigos"][init_spy_id][6] == '1')) {init_spy_id++;}
        spy_id = init_spy_id;
    }
    if (spy_id == importvars["frigos"].length) {
        document.getElementById('spy_all').style.color='darkred';
        document.getElementById('spy_all').innerHTML='&#9658; Aucun frigo à espionner';
        return;
    }
    
    
    //Programmer
    if(want_a_AA && (document.getElementById('prog_AA').checked || document.getElementById('repeat_AA').checked)) {
        createCookie('isProg', 'oui', 1,'AA' );
        
        //programmé oui démarrage direct, auquel cas : le prog time vaut le repeat time
        if (document.getElementById('prog_AA').checked) progTime = time() + 60*60*1000*parseInt('0'+document.getElementById('time_AA_h').value) + 60*1000*parseInt('0'+document.getElementById('time_AA_m').value);
        else progTime = time() + 3*1000;
        
        if (document.getElementById('repeat_AA').checked) {
            createCookie('repeat', 'oui', 1,'AA');
            createCookie('repeatTime', 60*60*1000*parseInt('0'+document.getElementById('repeat_AA_h').value) + 60*1000*parseInt('0'+document.getElementById('repeat_AA_m').value), 1,'AA');
        } else createCookie('repeat', 'non', 1,'AA');
        createCookie('progTime', progTime, 1,'AA');
        document.getElementById('auto_attack').style.color='#A52592';
        document.getElementById('auto_attack').innerHTML='&#9658; Attaque programmée avec succès';
        window.location.href = window.location.href;
        return;
    }
       
    if(spy_all && spy_id==init_spy_id) {
        document.getElementById('spy_all').style.color='#808080';
        document.getElementById('spy_all').innerHTML='&#9658; Espionnage des frigos en cours...';
    }
    if(want_a_RG && spy_id==init_spy_id) {
        document.getElementById('rap_gene').style.color='#808080';
        document.getElementById('rap_gene').innerHTML='&#9658; En attente du retour des sondes...';
    }
    if(want_a_AA && spy_id==init_spy_id) {
        document.getElementById('auto_attack').style.color='#808080';
        document.getElementById('auto_attack').innerHTML='&#9658; En attente des rapports d\'espionage...';
    }
    nb_sondes = parseInt(document.getElementById('frig_sondes_'+spy_id).value);
    
    params = {
        mission: 6,
        galaxy: importvars["frigos"][spy_id][1],
        system: importvars["frigos"][spy_id][2],
        position: importvars["frigos"][spy_id][3],
        type: 1,
        shipCount: nb_sondes,
        token: miniFleetToken
    };
    
    //document.getElementById('auto_attack').innerHTML='&#9658; Timeout lancé';
    if (auCasOu !== null) clearTimeout(auCasOu);
    auCasOu = setTimeout(function() {
           window.location.href = window.location.href.replace(gup('page'), 'overview').replace('&sephiScript=1', '');
    }, 5*60*1000); 
    spyTimeout = setTimeout(function() {
           blit_message('<span style="float: none;margin: 0;color:#d43635">Pas de réponse</span>. Nouvel essai.');
           launch_spy();
    }, 5000);
    
    $.ajax('http://'+univers+'/game/index.php?page=minifleet&ajax=1', {
        data: params,
        dataType: "json",
        type: "POST",
        success: function(dateESP) {
            if(typeof(dateESP.newToken) != "undefined") {
                miniFleetToken = dateESP.newToken;
            }
            nb_tries++;
            if (dateESP.response == 'undefined') {
                blit_message('<span style="float: none;margin: 0;color:#d43635">Erreur inconnue</span>. Nouvel essai');
                document.getElementById('auto_attack').innerHTML='&#9658; Erreur inconnue';
                clearTimeout(spyTimeout);
                setTimeout(launch_spy, 3000);
                return;
            }
            if (dateESP.response.message.match('en mode vacances!')) {
                blit_message('Impossible, vous êtes en mode vacances.');
                clearTimeout(spyTimeout);
                return;
            //imp2Toulouse- Simplifacation using regular expression
            } else if (!dateESP.response.message.match(/[E|e]rreur/)) {
                blit_message('Espionnage sur '+importvars["frigos"][spy_id][0]+' <span style="float: none;margin: 0;color:#109E18">démarré avec succès</span>');
                document.getElementById('spy_isok_'+spy_id).style.display = 'block';
                next_id = spy_id+1;
                wait_sec=rand(1,3);
            } else if (dateESP.response.message.match('planète')) {
                blit_message(''+importvars["frigos"][spy_id][0]+' <span style="float: none;margin: 0;color:#d43635">n\'existe plus</span>');
                importvars["frigos"][spy_id][0] = '[Détruit] ' + importvars["frigos"][spy_id][0];
                importvars["frigos"][spy_id][4] = 0;
                save_important_vars();
                next_id = spy_id+1;
                wait_sec=2;
            } else if (dateESP.response.message.match('vacance')) {
                blit_message(''+importvars["frigos"][spy_id][0]+' <span style="float: none;margin: 0;color:#d43635">est en vacances</span>');
                importvars["frigos"][spy_id][0] = '[Vacances] ' + importvars["frigos"][spy_id][0];
                importvars["frigos"][spy_id][4] = 0;
                save_important_vars();
                next_id = spy_id+1;
                wait_sec=2;
            } else if (dateESP.response.message.match('novice')) {
                blit_message(''+importvars["frigos"][spy_id][0]+' <span style="float: none;margin: 0;color:#d43635">est un novice</span>');
                importvars["frigos"][spy_id][0] = '[Novice] ' + importvars["frigos"][spy_id][0];
                importvars["frigos"][spy_id][4] = 0;
                save_important_vars();
                next_id = spy_id+1;
                wait_sec=2;
            } else {
                next_id = spy_id;
                //Imp2Toulouse- Increase de delay for waiting spy back
                wait_sec=rand(6,15);
                setTimeout(function(){blit_message('<span style="float: none;margin: 0;">Erreur d\'espionnage : Nouvel essai dans '+wait_sec+' secondes</span>');}, 2000);
                document.getElementById('spy_all').innerHTML='&#9658; Espionnage des frigos en cours... (Nouvel essai dans '+wait_sec+' secondes)';
                
                // Au bout de 5 erreurs on abandonne
                if (want_a_AA && nb_tries>5 && next_id==0) {
                    document.getElementById('auto_attack').style.color='#F02020';
                    document.getElementById('auto_attack').innerHTML='&#9658; Auto-Attaque repporté dans une heure (impossible d\'espionner)';
                    GLOB_abandonne_spy = true;
                    if (gup('startAA') == '1') {
                        createCookie('progTime', time() + 60*60*1000, 1,'AA' ); // re-essaye dans 30min
                        createCookie('isProg', 'oui', 1,'AA' );
                        setTimeout(function(){window.location.href = 'http://'+univers+'/game/index.php?page=overview';}, 10000);
                    }
                }
            }
            
            if (spy_all) {
                while (next_id < importvars["frigos"].length && (parseInt(importvars["frigos"][next_id][4]) <= 0 || importvars["frigos"][next_id][6] == '1')) next_id++;
                if(next_id < importvars["frigos"].length) {
                        setTimeout(launch_spy, wait_sec*1500);
                } else {
                    spy_all=false;
                    document.getElementById('spy_all').style.color='#109E18';
                    document.getElementById('spy_all').innerHTML='&#9658; Espionnage des frigos terminé';
                    if(want_a_RG) {
                        setTimeout(function() {blit_message_time("Attendez sur cette page, le script ira lire les rapports au retour des sondes.",20000);},3000);
                        document.getElementById('rap_gene').style.color='#808080';
                        document.getElementById('rap_gene').innerHTML='&#9658; En attente du retour des sondes...';
                        clearTimeout(auCasOu);
                        setTimeout(check_espionnage_finished,10000);
                        $('#eventboxFilled').click();
                    }
                }
            }
            
            clearTimeout(spyTimeout);
           // document.getElementById('auto_attack').innerHTML='&#9658; Timeout annulé';
        }
    });
    
    //window.location.href = 'http://'+univers+'/game/index.php?page=fleet1&nb_sondes='+nb_sondes+'&galaxy='+importvars["frigos"][spy_id][1]+'&system='+importvars["frigos"][spy_id][2]+'&position='+importvars["frigos"][spy_id][3]+'&type=1&launch_spy=1';
}

function save_alert_mail() {
    mail = document.getElementById('alert_mail').value;
    
    if (ckeckmail(mail) == true) {
        createCookie('alert_mail',mail,1,'all');
        //blit_message('Votre adresse mail <span style="float: none;margin: 0;color:#109E18">à été enregistrée</span>.');
        return ('enregistrée');
    } else {
        if (mail=='') {
            createCookie('alert_mail',mail,1,'all');
            //blit_message('La fonction d\'alerte <span style="float: none;margin: 0;color:#109E18">à été désactivée</span>.');
            return ('supprimée');
        } else return ('incorrecte');//blit_message('Votre adresse mail est <span style="float: none;margin: 0;color:#d43635">est incorrecte</span>.');
    }
}

function send_alert_mail() {
     // Envoi du mail
/*    xhr.onreadystatechange  = function() {
        if(xhr.readyState  == 4) {
            createCookie('attack_advert', time(), 1, 'all');
            if(xhr.status  == 200) {
                rep = xhr.responseText;
                if (rep == 'IS OK') {
                    blit_message('<span style="float: none;margin: 0;color:#109E18">Un mail d\'alerte vient d\'être envoyé</span>.');
                }
            } 
        }
    };
    xhr.open("POST", "http://www.final-fantasy.fr/cloud_ogame.php",  true); 
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");  
    var data = "type=mail_attack&username="+username+"&mail="+alert_mail;
    xhr.send(data);
*/
}

//Imp2Toulouse- Take into account eject time set
function get_start_after_less(info){ return ((info == "never")?0:parseInt(info.match(/\d/g).join(""))*60); }

//start_after_less = 5*60;
start_after_less = get_start_after_less(eject_auto);
retour_time = start_after_less*1000 / 2;
function check_attack() {
    if (have_played_alert == false && document.body.innerHTML.match('<div id="attack_alert" class="tooltip eventToggle')){
        have_played_alert = true;
        xhr.onreadystatechange  = function() 
        { 
            if(xhr.readyState  == 4)
            {
                if(xhr.status  == 200) {
                    if (xhr.responseText.match("Flotte ennemie")) {
                        if (!xhr.responseText.match("http://gf3.geo.gfsrv.net/cdnb7/60a018ae3104b4c7e5af8b2bde5aee.gif")) {
                            setTimeout(function() {if (readCookie("desactive_alarm", 'all') !== 'yes') bruit_alert('http://www.sephiogame.com/script/alert_nuclear_bomb3.ogg');}, 4000);
                        }
                        
                        //if (alert_mail !== '' && (readCookie('attack_advert','all') == null || (time()-parseInt(readCookie('attack_advert','all'))) > 10*60*1000) ) 
                        //    setTimeout(send_alert_mail,2000);
                        
                        // Auto-Eject
                        events = xhr.responseText.split('eventFleet');
                        for (i=1 ; i<events.length ; i++) {
                            if (events[i].match('Flotte ennemie') && !events[i].match("http://gf3.geo.gfsrv.net/cdnb7/60a018ae3104b4c7e5af8b2bde5aee.gif") && !events[i].match("http://gf3.geo.gfsrv.net/cdne8/583cd7016e56770a23028cba6b5d2c.gif")) {
                                //Imp2Toulouse- Compatibility with antigame
                                //isOnLune = events[i].getElementsByClassName('destFleet')[0].innerHTML.match('moon'); // Impossible d'utiliser GEBCN sur cet objet

                                //quelque tests
                                //isFromLune=document.getElementsByClassName('originFleet')[3].getElementsByTagName('a')[0].innerHTML.match("moon")
                                //isFromLune=events[1].split(/<td class="destFleet">/)[1].split(/<\/figure>/)[0].match("moon")
                                isOnLune=events[i].split(/<td class="destFleet">/)[1].split(/<\/td>/)[0].match("moon");
                                
                                //isOnLune = events[i].match('moon');
                                coords = '['+events[i].split('destCoords')[1].split('[')[1].split(']')[0]+']';
                                if (isOnLune) coords += 'Lune';
                                time_attack = parseInt(events[i].split('data-arrival-time="')[1].split('"')[0]) - Math.floor(time()/1000);
                                cp_attacked = planet_list[planet_list_coords.indexOf(coords)];
                                
                                if (time_attack > start_after_less) return;
                                
                                if (readCookie('escaped_'+cp_attacked, 'all') !== null && time() - parseInt(readCookie('escaped_'+cp_attacked, 'all')) < 20*60*1000) {
                                   if (cp_attacked == cur_planet && eject_auto !== 'never') setTimeout(function() {blit_message("Auto-eject inactif pour "+parseInt(20 - (time() - parseInt(readCookie('escaped_'+cp_attacked, 'all')))/1000/60)+" minutes");}, 5000);
                                   return;
                                }
                                
                                if (cp_attacked !== cur_planet) {
                                    setTimeout(function() {blit_message("Changement de planète prévu pour gérer l'attaque");}, 5000);
                                    setTimeout(function() {
                                        window.location.href = 'http://'+univers+'/game/index.php?page=overview&eject=yes&cp='+cp_attacked;
                                    }, 15000);
                                } else {
                                    if (eject_auto == 'never') {
                                        createCookie('escaped_'+cp_attacked, time(), 1, 'all');
                                        setTimeout(function() {blit_message("L'auto-éjection des vaisseaux n'est pas activée.");}, 10000);
                                    } else {
                                        blit_message("Auto-eject dans 10 secondes...");
                                        setTimeout(function() {
                                            createCookie('escaped_'+cp_attacked, time(), 1, 'all');
                                            //Imp2Toulouse- adapt type regarding target moon
                                            window.location.href = 'http://'+univers+'/game/index.php?page=fleet1&galaxy='+eject_gal+'&system='+eject_sys+'&position='+eject_pla+'&type='+(isOnLune?3:1)+'&mission=3&eject=yes&cp='+cp_attacked;
                                        }, 10000);
                                        return;
                                    }  
                                }
                            }
                        }
                    } 
                }
            }
        }; 
        
        xhr.open("POST", "http://"+univers+"/game/index.php?page=eventList",  true); 
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");  
        xhr.send(); 
    }
}
setTimeout(check_attack, 2000);


function check_espionnage_finished() {
    xhr.onreadystatechange = function() 
    { 
        if(xhr.readyState  == 4)
        {
            if(xhr.status  == 200) {
                if (!xhr.responseText.match("http://gf3.geo.gfsrv.net/cdnb7/60a018ae3104b4c7e5af8b2bde5aee.gif")) {
                    bonus = '';
                    if (want_a_AA) {
                        createCookie('last_start', time(), 1,'AA');
                        bonus = '&AA=OUI';
                    }
                    setTimeout(function() {window.location.href = 'http://'+univers+'/game/index.php?page=messages&RG=OUI'+bonus;}, 1000);
                } else {
                       document.getElementById('rap_gene').innerHTML='&#9658; En attente du retour des sondes... (Il reste '+(xhr.responseText.split("http://gf3.geo.gfsrv.net/cdnb7/60a018ae3104b4c7e5af8b2bde5aee.gif").length-1)+' évènements d\'espionnage)' ;
                }
            } 
        }
    }; 
    
    xhr.open("POST", "http://"+univers+"/game/index.php?page=eventList",  true); 
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");  
    xhr.send(); 
    
    setTimeout(check_espionnage_finished,rand(4,8)*1000);
}

function check_attack_reload() {
    //Inutilisé
    if (document.body.innerHTML.replace('<div id="attack_alert" style="visibility:visible;">','') == document.body.innerHTML){
        xhr.onreadystatechange  = function() 
        { 
            if(xhr.readyState  == 4)
            {
                if(xhr.status  == 200) {
                    if (xhr.responseText.match("Flotte ennemie"))
                        window.location.href = window.location.href;
                    
                } else document.getElementById('detail').innerHTML="Error code " + xhr.status;
            }
        }; 
        
        bonus_planet = "";
        if(gup('cp') !== "") bonus_planet = "&cp="+gup('cp');
        xhr.open("POST", "http://"+univers+"/game/index.php?page=eventList"+bonus_planet,  true); 
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");  
        xhr.send();
        setTimeout(check_attack_reload, rand(4,6)*1000);
    }
}

function update_timers() {
    ress_metal = document.body.innerHTML.split('<span id="resources_metal" class="')[1].split('>')[1].split('</span>')[0].match(/\d/g).join("");
    ress_crystal = document.body.innerHTML.split('<span id="resources_crystal" class="')[1].split('>')[1].split('</span>')[0].match(/\d/g).join("");
    ress_deuterium = document.body.innerHTML.split('<span id="resources_deuterium" class="')[1].split('>')[1].split('</span>')[0].match(/\d/g).join("");
   
    prod_metal = parseInt(importvars["prods"][0]);
    prod_crys = parseInt(importvars["prods"][1]);
    prod_deut = parseInt(importvars["prods"][2]);
    
    tot_boss=0;
    tot_cost_met=0;
    tot_cost_crys=0;
    tot_cost_deut=0;
    
    
    if (prod_metal !== null && prod_crys !== null && prod_deut !== null) {
        
        for (i_timers=0 ; i_timers<importvars["listPrev"].length ; i_timers++) {
            id_from_place = get_prevID_from_place(i_timers);
            real_id = i_timers;
            
            e=document.getElementById('info_prog_time_'+id_from_place);
            e2=document.getElementById('info_prog_'+id_from_place);
            if (e !== null && get_prev_data("havetoprev", real_id) == "yes") {
                tot_cost_met+=parseInt(get_prev_data('cur_met_prev', real_id));
                tot_cost_crys+=parseInt(get_prev_data('cur_crys_prev', real_id));
                tot_cost_deut+=parseInt(get_prev_data('cur_deut_prev', real_id));
                
                boss = 0;
                boss_type = "Metal";
                tot_boss_type='Metal';
                
                // Métal
                if(prod_metal == 0) {
                    time_met=0;
                    tot_time_met=0;
                    if (parseInt(get_prev_data('cur_met_prev', real_id))> parseInt(ress_metal)) {
                        boss=100000000000;
                        tot_boss=100000000000;
                    }
                } else {
                    boss = (parseInt(get_prev_data('cur_met_prev', real_id)) - parseInt(ress_metal))/prod_metal * 60*60;
                    tot_boss = (tot_cost_met - parseInt(ress_metal))/prod_metal * 60*60;
                }

                // Cristal
                if(prod_crys == 0) {
                    time_crys=0;
                    tot_time_crys=0;
                    if (parseInt(get_prev_data('cur_crys_prev', real_id))> parseInt(ress_crystal)) {
                        time_crys=100000000000;
                        tot_time_crys=100000000000;
                    }
                }
                else{
                    time_crys = (parseInt(get_prev_data('cur_crys_prev', real_id)) - parseInt(ress_crystal))/prod_crys * 60*60;
                    tot_time_crys = (tot_cost_crys - parseInt(ress_crystal))/prod_crys * 60*60; 
                }
                if (time_crys>boss) {boss = time_crys;boss_type = "Cristal";}
                if (tot_time_crys>tot_boss) {tot_boss = tot_time_crys;tot_boss_type="Cristal";}
                
                //Deut
                if(prod_deut == 0) {
                    time_deut=0;
                    tot_time_deut=0;
                    if (parseInt(get_prev_data('cur_deut_prev', real_id))> parseInt(ress_deuterium)) {
                        time_deut=100000000000;
                        tot_time_deut=100000000000;
                    }
                }
                else{
                    time_deut = (parseInt(get_prev_data('cur_deut_prev', real_id)) - parseInt(ress_deuterium))/prod_deut * 60*60;
                    tot_time_deut = (tot_cost_deut - parseInt(ress_deuterium))/prod_deut * 60*60; 
                }
                if (time_deut>boss) {boss = time_deut;boss_type = "Deuterium";}
                if (tot_time_deut>tot_boss) {tot_boss = tot_time_deut;tot_boss_type="Deuterium";}
                
                
                e.innerHTML = Math.floor(boss/60);
                temps_string = boss_type+" : ";
                if (boss < 0) boss=0;
                if (boss > 0) {
                    if (boss >= 100000000000) temps_string += "<span style=\"color:darkred\">Pas de production</span>"; 
                    else temps_string += get_cool_time(boss);
                } else temps_string = "Prêt, en attente"; 

                if (tot_boss !== boss && tot_boss>0) {
                    if (tot_boss >= 100000000000) temps_string += ' > '+tot_boss_type+' : <span style="color:darkred">Pas de production</span>';
                    else temps_string += ' > '+tot_boss_type+' : '+get_cool_time(tot_boss);
                }
                
                e.innerHTML = '('+temps_string+')';
            }
        } 
    }
    setTimeout(update_timers, 1000);
}

changementAnnuleBlited = false;
function gestion_cook() {
    ress_metal = parseInt(document.body.innerHTML.split('<span id="resources_metal" class="')[1].split('>')[1].split('</span>')[0].match(/\d/g).join(""));
    ress_crystal = parseInt(document.body.innerHTML.split('<span id="resources_crystal" class="')[1].split('>')[1].split('</span>')[0].match(/\d/g).join(""));
    ress_deuterium = parseInt(document.body.innerHTML.split('<span id="resources_deuterium" class="')[1].split('>')[1].split('</span>')[0].match(/\d/g).join(""));
    
    for (i_gestion=0 ; i_gestion<importvars["listPrev"].length ; i_gestion++) {
        pref = get_prev_data("page", i_gestion);
        if (get_prev_data("havetoprev", i_gestion) == "yes") {
            
            if (!(parseInt(get_prev_data('cur_met_prev', i_gestion)) <= parseInt(ress_metal) && parseInt(get_prev_data('cur_crys_prev', i_gestion)) <= parseInt(ress_crystal) && parseInt(get_prev_data('cur_deut_prev', i_gestion)) <= parseInt(ress_deuterium) ))
                return;
            
            cooldown_class=(document.getElementById('Countdown') !== null && document.getElementById('Countdown').innerHTML !== 'terminé');
            cooldown_research=(document.getElementById('researchCountdown') !== null && document.getElementById('researchCountdown').innerHTML !== 'terminé');
            cooldown_ship=(document.getElementById('shipCountdown') !== null && document.getElementById('shipCountdown').innerHTML !== 'terminé');
            
            cooldownOK = ((pref=="resources" || pref=="station") && (gup("page") == "resources" || gup("page") == "station") && !cooldown_class)
            || (pref=="research" && gup("page") == "research" && !cooldown_research)
            || ((pref=="shipyard" || pref=="defense") && (gup("page") == "shipyard" || gup("page") == "defense") && !cooldown_ship)
            || (gup("page") == "overview" && ( ((pref=="resources" || pref=="station") && !cooldown_class) || (pref=="research" && !cooldown_research) || ((pref=="shipyard" || pref=="defense") && !cooldown_ship) ));
            
            multip = 1;
            if (get_prev_data("form_number", i_gestion) !== null && get_prev_data("form_number", i_gestion) !== "") multip = parseInt(get_prev_data("form_number", i_gestion));
            
            
            if (cooldownOK && gup('sephiScript') != '1') {
                if(get_prev_data("page", i_gestion) !== gup('page'))  {
                    blit_message("Démarrage dans 5s de : "+get_prev_data("title", i_gestion).replace(/_esp_/g, ' '));
                    setTimeout(function() {window.location.href = window.location.href.replace(gup('page'),get_prev_data("page", i_gestion));}, 5000);
                    return;
                }
                
                xhr.onreadystatechange  = function() { 
                    if(xhr.readyState  == 4) {
                        if(xhr.status  == 200) {
                            document.getElementById('detail').innerHTML = xhr.responseText;
                            cost_metal = parseInt(get_cost(xhr.responseText, "metal"));
                            cost_crystal = parseInt(get_cost(xhr.responseText, "crystal"));
                            cost_deuterium = parseInt(get_cost(xhr.responseText, "deuterium"));
                            just_dimin_number = false;
                            
                            if ((cost_metal>ress_metal || cost_crystal>ress_crystal || cost_deuterium>ress_deuterium) && (cost_metal !== parseInt(get_prev_data('cur_met_prev', i_gestion)) || cost_crystal !== parseInt(get_prev_data('cur_crys_prev', i_gestion)) || cost_deuterium !== parseInt(get_prev_data('cur_deut_prev', i_gestion))) ){
                                set_prev_data("cur_met_prev", i_gestion, cost_metal);
                                set_prev_data("cur_crys_prev", i_gestion, cost_crystal);
                                set_prev_data("cur_deut_prev", i_gestion, cost_deuterium);
                                save_important_vars();
                                blit_message('<span style="float: none;margin: 0;color:#109E18">Coûts mis à jour</span>, retour sur vue d\'ensemble dans 2 secondes');
                                setTimeout(function(){window.location.href = window.location.href.replace(gup('page'), 'overview');}, 3000);
                            } else {
                                 if (xhr.responseText.match('build-it_disabled')) {
                                    blit_message('<span style="float: none;margin: 0;color:red">Impossible de démarrer</span>, retour sur vue d\'ensemble dans 3 secondes');
                                    set_prev_data("havetoprev", i_gestion, "no");
                                    set_prev_data("donned", i_gestion, "yesno"+(time()+(1000*60*10)));
                                    save_important_vars();
                                    setTimeout(function(){window.location.href = window.location.href.replace(gup('page'), 'overview');}, 3000);
                                } else {
                                    multipText = "";
                                    if (get_prev_data("form_number", i_gestion) !== null && get_prev_data("form_number", i_gestion) !== "") {
                                        good_j=1;
                                        for (j=1; j<=parseInt(get_prev_data("form_number", i_gestion)) ; j++) {
                                            if (j*parseInt(get_prev_data('cur_met_prev', i_gestion)) < parseInt(ress_metal) && j*parseInt(get_prev_data('cur_crys_prev', i_gestion)) < parseInt(ress_crystal) && j*parseInt(get_prev_data('cur_deut_prev', i_gestion)) < parseInt(ress_deuterium)) {
                                                good_j = j;   
                                            }
                                        }
                                        
                                        multipText ='<input name="menge" value="'+good_j+'">';
                                        if (parseInt(get_prev_data("form_number", i_gestion))-good_j >= 1) {
                                            just_dimin_number = true;
                                        }
                                        setTimeout(function() {document.getElementById("number").value = good_j;}, 1000);
                                    }
                                    
                                    //document.getElementById("ie_message").innerHTML += '<form id="form_finished2" method="POST" action="'+location.href+'" name="form"><input type="hidden" name="token" value="'+cur_token+'"><input name="modus" value="'+readCookie("form_modus", i_gestion)+'" /><input name="type" value="'+readCookie("form_type", i_gestion)+'" />'+multipText+'</form>';
                                    blit_message('<span style="float: none;margin: 0;color:#109E18">Les ressources sont suffisantes</span> : démarrage dans 2 à 4 secondes.');
                                    setTimeout(function() {
                                        if (just_dimin_number){
                                            set_prev_data("form_number", i_gestion, parseInt(get_prev_data("form_number", i_gestion))-good_j);
                                            set_prev_data("havetoprev", i_gestion, "yes");
                                            set_prev_data("donned", i_gestion, "no");
                                        } else {
                                            set_prev_data("havetoprev", i_gestion, "no");
                                            set_prev_data("donned", i_gestion, "yes");
                                            createCookie("back_to_overview", "yes", 1, 'all');
                                            createCookie("change_planet", "yes", 1, 'all');
                                        }
                                        save_important_vars();
                                        document.getElementById('form_finished').submit();
                                    }, rand(2,4)*1000);
                                }
                            }
                        } else document.getElementById('detail').innerHTML="Error code " + xhr.status;
                    }
                }; 
                
                document.getElementById('detail').style.display = 'block';
                if (document.getElementById('techDetailLoading') != null) document.getElementById('techDetailLoading').style.display = 'block';

                bonus_planet = "";
                if(gup('cp') !== "") bonus_planet = "&cp="+gup('cp');
                xhr.open("POST", "http://"+univers+"/game/index.php?page="+gup('page')+"&ajax=1"+bonus_planet,  true); 
                xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");  
                var data = "type=" + get_prev_data("form_type", i_gestion);
                xhr.send(data);
                
    
                break;
            } else {
                // Il manque plus que le cooldonw, on bouge plus si moins de 5 minutes
                if ((pref=="resources" || pref=="station")) tmp = document.getElementById('Countdown');
                if (pref=="research") tmp = document.getElementById('researchCountdown');
                if ((pref=="shipyard" || pref=="defense")) tmp = document.getElementById('shipCountdown');
                
                if (tmp !== null) {
                    tmp = tmp.innerHTML.split('m');
                    if (tmp.length == 1 || parseInt(tmp[0]) <= 5) dont_boudge = true;
                    if (tmp[0].replace('h','') !== tmp[0]) dont_boudge = false;
                    if (!changementAnnuleBlited && dont_boudge && nb_planet>1) {
                        changementAnnuleBlited = true;
                        blit_message('Changement de planète annulé dans l\'<span style="float: none;margin: 0;color:#109E18">attente d\'une construction</span>.');
                    }
                }
                
                h = document.getElementById('info_prog_time_'+i_gestion).innerHTML;
                if (h.match('>') || !h.match('Prêt')) break;
            }
        }
    }
}

speededUP = false;
function finish_rapport_general() {
    data+='</tbody></table>';
    if (count_esp == 0) {
        document.getElementById('rapport_gen').innerHTML = '&#9658; Aucun nouveau rapport d\'espionnage';
        document.getElementById('rapport_gen').style.color = '#808080';
    } else {
        document.getElementById('rapport_gen').innerHTML = '&#9658; Rapport général en cours de création';
        document.getElementById('rapport_gen_place').innerHTML = data;
        document.getElementById('rapport_gen_place').style.display = 'block';
        GLOB_rgID = 1;
        GLOB_rgMaxID = count_esp;
        GLOB_rgButins = new Array();
        fill_rapport_general();
    }
}

function read_rapports_and_create_table () {
    if (document.getElementById('mailz') == null) stopMail = true;
    
    if (stopMail) {
        if (document.getElementById('mailz') == null) blit_message("Impossible de charger les messages suivant");
        finish_rapport_general();
        return;
    }
    
    elems = document.getElementById('mailz').innerHTML.split('entry trigger'+class_bonus);
    no_more_new_esp = true;
    
    for (i=1; i<elems.length && count_esp<nb_limit*2; i++) {
        if (class_bonus.match("new")) elems[i] = elems[i].split('entry trigger')[0];
        if (elems[i].match('Rapport d`espionnage de')) {
            no_more_new_esp = false;
            tmp = elems[i].split('</figure>')[1].split('</span>')[0];
            planame = tmp.split(' [')[0];
            coord = '['+tmp.split('[')[1];
            
            tmp = coord.replace('[','').replace(']','').split(':');
            galaxy = tmp[0];
            system = tmp[1];
            planet = tmp[2];
            
            //Imp2Toulouse: Replace by function
            idFrig=is_frigo(importvars["frigos"],coord);

            
            // Si c'est pas un frigo et qu'on est en mode auto-attaque on l'attaque pas
            if (idFrig>=0 || gup('RG') !== 'OUI') {
                count_esp++;
                url = '';
                if (!elems[i].match("spioDetail")) {
                    url = elems[i].split('<a class="overlay" href="')[1].split('"')[0];
                    if (!speededUP) {
                        speededUP = true;
                        setTimeout(function () {
                             document.getElementById('rapport_option_quick').style.display = "block";
                             canspeedup = true;
                             document.getElementById('rapport_option_quick').onclick = function () {
                                 document.getElementById('rapport_option_quick_active').src = 'http://'+univers+'/game/index.php?page=preferences&autoRapComp=1';
                                 setTimeout(function () {
                                    document.getElementById('rapport_option_quick').style.color = "green";
                                    document.getElementById('rapport_option_quick').innerHTML = "Succès, l'effet sera actif au prochain rapport général";
                                 }, 2000);
                             };
                         },1500);   
                    }
                } else {
                    anal_esp_data(elems[i].split('showSpyReportsNow')[1]);
                    url = "puredata:"+Math.floor(type_multip*(met+cri+deu)); 
                }
                color='';
                if (elems[i].match('status_abbr_honorableTarget')) color='color:#FFFF66;';
                if (elems[i].match('status_abbr_active')) color='color:#fff;';
                if (elems[i].match('status_abbr_inactive')) color='color:#6E6E6E;';
                if (elems[i].match('status_abbr_longinactive')) color='color:#4F4F4F;';
                
                data += '<tr id="rap_general_line_'+count_esp+'"><td id="rap_general_coord_'+count_esp+'" style="border: 1px solid #303030;padding: 5px 8px;text-align:center;height: 28px;">'+coord+'</td>';
                data += '<td style="border: 1px solid #303030;padding: 5px 8px;"><a target=_blank style="text-decoration:none;'+color+'" href="http://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1" onclick="this.style.textDecoration=\'line-through\'"><span id="rap_general_planet_name_'+count_esp+'">'+planame+'</span></a><span id="url_rap_esp_'+count_esp+'" style="display:none;">'+url+'</span></td>';
                data += '<td id="rap_general_butin_'+count_esp+'" style="border: 1px solid #303030;padding: 5px 8px;text-align:center;font-weight:bold;color:#FF9600;">-</td>';
                data += '<td id="rap_general_attack_'+count_esp+'" style="border: 1px solid #303030;padding: 5px 8px;text-align: center;">Veuillez Patienter...</td>';
                data += '</tr>';
                
                count_esp++;
                data += '<tr id="rap_general_line_'+count_esp+'"><td id="rap_general_coord_'+count_esp+'" style="border: 1px solid #303030;padding: 5px 8px;text-align:center;height: 28px;">'+coord+'</td>';
                data += '<td style="border: 1px solid #303030;padding: 5px 8px;"><a target=_blank style="text-decoration:none;'+color+'" href="http://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1" onclick="this.style.textDecoration=\'line-through\'"><span id="rap_general_planet_name_'+count_esp+'">'+planame+' (2)</span></a><span id="url_rap_esp_'+count_esp+'" style="display:none;">second</span></td>';
                data += '<td id="rap_general_butin_'+count_esp+'" style="border: 1px solid #303030;padding: 5px 8px;text-align:center;font-weight:bold;color:#FF9600;">-</td>';
                data += '<td id="rap_general_attack_'+count_esp+'" style="border: 1px solid #303030;padding: 5px 8px;text-align: center;">Veuillez Patienter...</td>';
                data += '</tr>';
            }
        }
    }
    
    if (elems.length <= 1){
        blit_message("Plus de messages. C'est parti !");
        stopMail = true;
    }
    if (no_more_new_esp && !document.getElementById('with_readed_RG').checked) {
        blit_message("Tout les nouveaux rapports ont été lus. C'est parti !");
        stopMail = true;
    }
    if (document.getElementById('with_readed_RG').checked && count_esp>=nb_limit*2) {
        blit_message("Le nombre demandé de rapport a été lu. C'est parti !");
        stopMail = true;
    }
    // On passe à la page suivante
    cur_mail_page++;
    if (!stopMail) setTimeout(function () {ajaxLoad(9,cur_mail_page);}, 1000);
    
    setTimeout(read_rapports_and_create_table, 3000);
}

cur_mail_page = 1;
stopMail = false;
no_more_new_esp = false;
count_esp=0;
nb_limit = 10000000;
class_bonus = ' new';
waitingExped = false;
function start_rapport_general() {
    document.getElementById('rapport_gen').style.cursor = 'default';
    document.getElementById('rapport_gen').onclick=function(){return 1;};
    document.getElementById('rapport_gen').innerHTML = '&#9658; Veuillez patienter...';
    document.getElementById('rapport_gen').style.color = '#808080';
    
    data='<iframe style="display:none;" id="ifr_AA" src="http://ready"></iframe>';

    // Auto expédition
    if (with_exped !== 'non' && document.getElementById('AA_RG').checked) {
        waitingExped = true;
        tmp = cur_planet_coords.replace('[','').replace(']','').replace('Lune','').split(':');
        galaxy = tmp[0];
        system = parseInt(tmp[1]) - 10 + rand(0,20);
        planet = 16;
        if (system<1) system = rand(1,4);
        if (system>499) system = rand(495,499);
        data+='<iframe style="display:none;" id="ifr_AA_exped" src="http://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=15&auto=yes&ID=Exped&GT='+with_exped+'"></iframe>';
        data +='<div id="exped_launch" style="color:#999;padding:5px;text-align:left;color: #A52592;">Démarrage d\'une expédition...</div>';
        createCookie('AA_Exp','wait',1,'all')
        exp_verif = setInterval(function(){
            e = document.getElementById('exped_launch');
            if (readCookie('AA_Exp','all').match('IS_OK')) {e.innerHTML = 'Expédition envoyée avec succès'; e.style.color='#fcce00';clearTimeout(ext_timeout);attack_cur();clearInterval(exp_verif);}
            else if (readCookie('AA_Exp','all') !== 'wait') {e.innerHTML = 'Impossible de démarrer une expédition'; e.style.color='#A01010';clearTimeout(ext_timeout);attack_cur();clearInterval(exp_verif);}
        },1000);
        ext_timeout = setTimeout(function () {
            clearInterval(exp_verif);
            e = document.getElementById('exped_launch');
            e.innerHTML = 'Aucune réponse';
            e.style.color='darkred';
            isFirstTry = true;
            attack_cur();
        },20000);
        
        setTimeout(function () {
            document.getElementById('ifr_AA_exped').src = 'http://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=15&auto=yes&ID=Exped&GT='+with_exped+'';
        },2000);
    }
    data +='<table id="rap_general_table" style="width:600px;position:relative;top:0px;left:0px;border: 1px solid #000000;color: #777;background:#0D1014;margin:auto;margin-bottom:0px;"><tbody>';
    GLOB_rgEndData = '<tr style="background:#1b1b1b;color: #999;"><th style="border: 1px solid #303030;padding: 5px 8px;text-align:center;width:80px">Coord.</th><th style="border: 1px solid #303030;padding: 5px 8px;">Planète</th><th style="border: 1px solid #303030;padding: 5px 8px;text-align:center;width:100px">Butin</th><th style="border: 1px solid #303030;padding: 5px 8px;width: 170px;text-align: center;">Attaque Automatique</th></tr>';
    data+=GLOB_rgEndData;
    
    if (document.getElementById('with_readed_RG').checked){
        class_bonus = '';
        nb_limit = parseInt(document.getElementById('NB_readed_RG').value);
    }
    //setTimeout(function () {ajaxLoad(9,1);}, 1000);
    read_rapports_and_create_table();
}

function anal_esp_data(data) {
    type_multip = 0.5;
    if (data.match('status_abbr_honorableTarget')) type_multip = 0.75;
    met = parseInt(data.split('Métal:</td>')[1].split('</td>')[0].match(/\d/g).join(""));
    cri = parseInt(data.split('Cristal:</td>')[1].split('</td>')[0].match(/\d/g).join(""));
    deu = parseInt(data.split('Deutérium:</td>')[1].split('</td>')[0].match(/\d/g).join(""));
}

function fill_case(butin, flotte_perso, idFrigo, curplanet_name) {
    document.getElementById('rap_general_butin_'+GLOB_rgID).innerHTML = get_cool_digit(butin);
    attack_data = '<span id="RG_PT1_'+GLOB_rgID+'" style="cursor:pointer;font-size:12px" onclick="if (document.getElementById(\'ifr_AA\').src!==\'http://ready/\'){alert(\'Vous avez déjà une attaque en cours\');return;} document.getElementById(\'ifr_AA\').src = \'http://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+GLOB_rgID+'&PT='+(2+Math.floor(butin/5000))+'&force=0&flotte_perso='+flotte_perso+'\';setTimeout(function(){document.getElementById(\'RG_PT1_'+GLOB_rgID+'\').style.cursor=\'pointer\';},5000);document.getElementById(\'rap_general_planet_name_'+GLOB_rgID+'\').style.color = \'#761B68\';document.getElementById(\'rap_general_planet_name_'+GLOB_rgID+'\').innerHTML = \'[En Cours] '+curplanet_name+'\';">Envoyer '+(2+Math.floor(butin/5000))+' PT</span> (';
    attack_data += '<span id="RG_PT2_'+GLOB_rgID+'" style="cursor:pointer;font-size:12px" onclick="if (document.getElementById(\'ifr_AA\').src!==\'http://ready/\'){alert(\'Vous avez déjà une attaque en cours\');return;} document.getElementById(\'ifr_AA\').src = \'http://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+GLOB_rgID+'&PT='+(2+Math.floor(butin/5000))+'&force=1&flotte_perso='+flotte_perso+'\';setTimeout(function(){document.getElementById(\'RG_PT2_'+GLOB_rgID+'\').style.cursor=\'pointer\';},5000);document.getElementById(\'rap_general_planet_name_'+GLOB_rgID+'\').style.color = \'#761B68\';document.getElementById(\'rap_general_planet_name_'+GLOB_rgID+'\').innerHTML = \'[En Cours] '+curplanet_name+'\';">forcer</span>)<br/>';
    attack_data += '<span id="RG_GT1_'+GLOB_rgID+'" style="cursor:pointer;font-size:12px" onclick="if (document.getElementById(\'ifr_AA\').src!==\'http://ready/\'){alert(\'Vous avez déjà une attaque en cours\');return;} document.getElementById(\'ifr_AA\').src = \'http://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+GLOB_rgID+'&GT='+(2+Math.floor(butin/25000))+'&force=0&flotte_perso='+flotte_perso+'\';setTimeout(function(){document.getElementById(\'RG_GT1_'+GLOB_rgID+'\').style.cursor=\'pointer\';},5000);document.getElementById(\'rap_general_planet_name_'+GLOB_rgID+'\').style.color = \'#761B68\';document.getElementById(\'rap_general_planet_name_'+GLOB_rgID+'\').innerHTML = \'[En Cours] '+curplanet_name+'\';">Ou '+(2+Math.floor(butin/25000))+' GT</span> (';
    attack_data += '<span id="RG_GT2_'+GLOB_rgID+'" style="cursor:pointer;font-size:12px" onclick="if (document.getElementById(\'ifr_AA\').src!==\'http://ready/\'){alert(\'Vous avez déjà une attaque en cours\');return;} document.getElementById(\'ifr_AA\').src = \'http://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+GLOB_rgID+'&GT='+(2+Math.floor(butin/25000))+'&force=1&flotte_perso='+flotte_perso+'\';setTimeout(function(){document.getElementById(\'RG_GT2_'+GLOB_rgID+'\').style.cursor=\'pointer\';},5000);document.getElementById(\'rap_general_planet_name_'+GLOB_rgID+'\').style.color = \'#761B68\';document.getElementById(\'rap_general_planet_name_'+GLOB_rgID+'\').innerHTML = \'[En Cours] '+curplanet_name+'\';">forcer</span>) ';
    attack_data += '<span id="frigoID_'+GLOB_rgID+'" style="display:none">'+idFrigo+'</span>';
    document.getElementById('rap_general_attack_'+GLOB_rgID).innerHTML = attack_data;
    GLOB_rgButins[GLOB_rgID] = new Array();
    GLOB_rgButins[GLOB_rgID][0] = butin;
    GLOB_rgButins[GLOB_rgID][1] = GLOB_rgID;
    forceparam = '';
    if(readCookie('force','AA') == 'oui') forceparam = '&force=1';
    GLOB_rgButins[GLOB_rgID][2] = 'http://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+GLOB_rgID+'&PT='+(2+Math.floor(butin/5000))+forceparam+'&flotte_perso='+flotte_perso+'';
    GLOB_rgButins[GLOB_rgID][3] = 'http://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+GLOB_rgID+'&GT='+(2+Math.floor(butin/25000))+forceparam+'&flotte_perso='+flotte_perso+'';
    GLOB_rgID++;
}

type_multip = 0;
met = 0;
cri = 0;
deu = 0;
isFirstTry = true;
function fill_rapport_general() {
    if (GLOB_rgID <= GLOB_rgMaxID) {
        tmp = document.getElementById('rap_general_coord_'+GLOB_rgID).innerHTML.replace('[','').replace(']','').split(':');
        galaxy = tmp[0];
        system = tmp[1];
        planet = tmp[2];
        curplanet_name = document.getElementById('rap_general_planet_name_'+GLOB_rgID).innerHTML;
        
        //Imp2Toulouse- Replace this block with equivalent one in order to use id_frigo function
        // Recherche d'un frigo avec ces coordonnées et qui a une flote personnalisée
        flotte_perso='';
        idFrig=is_frigo(importvars["frigos"],document.getElementById('rap_general_coord_'+GLOB_rgID).innerHTML);
        //If 5 items set so a "flotte_perso" exist
        if (idFrig>=0 && importvars["frigos"][idFrig].length > 5) flotte_perso=importvars["frigos"][idFrig][5];
        ////        
        
        mail_url = document.getElementById('url_rap_esp_'+GLOB_rgID).innerHTML.replace(/&amp;/g,'&');
        if (mail_url !== "second") {
            if (!mail_url.match('puredata:')) {
                $.ajax(mail_url, {
                dataType: "text",
                type: "GET",
                success: function(data) {
                        anal_esp_data(data);
                        butin = Math.floor(type_multip*(met+cri+deu));
                        fill_case(butin, flotte_perso, idFrig,curplanet_name);
                        fill_rapport_general();
                    }
                });
            } else {
                butin = parseInt(mail_url.replace('puredata:',''));
                fill_case(butin, flotte_perso, idFrig,curplanet_name);
                fill_rapport_general(); 
            }
        } else {
            butin = parseInt(parseInt(document.getElementById('rap_general_butin_'+(GLOB_rgID-1)).innerHTML.match(/\d/g).join("")) / 2);
            fill_case(butin, flotte_perso, idFrig,curplanet_name);
            
            if (document.getElementById('url_rap_esp_'+(GLOB_rgID-2)).innerHTML.match('puredata:')) fill_rapport_general();
            else setTimeout(fill_rapport_general, rand(15,20)*100);
        }
        
    } else {
        // On trie le tableau
        GLOB_rgButins = GLOB_rgButins.sort(function(a,b) { return b[0] - a[0] });
        
        // On affiche le tableau
        for (k=0 ; k<GLOB_rgButins.length-1 ; k++) GLOB_rgEndData += '<tr>'+document.getElementById('rap_general_line_'+GLOB_rgButins[k][1]).innerHTML+'</tr>';
        document.getElementById('rap_general_table').innerHTML = GLOB_rgEndData;
        
        //Imp2Toulouse- clean lastRap
        eraseCookie('lastRap', null);
        createCookie('lastRap', document.getElementById('rap_general_table').innerHTML, 1, 'AA');
        //Imp2Toulouse- Add last_start in storage because it miss on first generated rapport with auto_AA (using own message results)
        createCookie('last_start', time(), 1,'AA');
        
        document.getElementById('rapport_gen').innerHTML = '&#9658; Rapport général réalisé avec succès';
        document.getElementById('rapport_gen').style.color = '#109E18';
        createCookie('AA_feed', 'rien', 1, 'all');
        launchAA=false;
        if (document.getElementById('AA_RG').checked) {
            GLOB_curAA_ID = 0;
            launchAA=true;
            isFirstTry = true;
            if (!waitingExped) attack_cur();
        }
        check_AA_feedback();
    }
}

AATimeout = null;
launchAA = false;
function clean_name(txt) {return txt.replace('[En Cours] ','').replace('[Abandon] ','').replace('[Essai 2] ','').replace('[Essai 3] ','').replace('[Essai 4] ','').replace('[Timeout 1] ','').replace('[Timeout 2] ','').replace('[Timeout 3] ','').replace('[Butin] ','').replace('<span title="Flotte envoyée">[OK]</span> ','').replace('<span title="Vous n\'avez plus assez de deuterium pour envoyer cette flotte">? [Deut]</span> ','').replace('<span title="Vous n\'avez plus de slots de flotte disponible">? [Flotte]</span> ','').replace('<span title="Votre flotte personnalisée est irréalisable">? [Perso]</span>','').replace('<span title="Vous manquez de petits transporteurs, cliquez sur \'\'forcer\'\' pour envoyer tout ceux que vous avez">? [PT]</span> ','').replace('<span title="Vous manquez de grands transporteurs, cliquez sur \'\'forcer\'\' pour envoyer tout ceux que vous avez">? [GT]</span> ','');}
function attack_cur() {
    if(GLOB_curAA_ID < GLOB_rgButins.length-1 && parseInt(GLOB_rgButins[GLOB_curAA_ID][0]) > parseInt(document.getElementById('butin_AA_RG').value) )  {
        encourstime = 0;
        if (!isFirstTry) encourstime = 1000;
        
        
        setTimeout(function() {
            if ((isFirstTry && type_vaisseaux_AA == 1) || (!isFirstTry && type_vaisseaux_AA == 2) || type_vaisseaux_AA == 3) {setTimeout(function(){document.getElementById('ifr_AA').src = GLOB_rgButins[GLOB_curAA_ID][2];}, 1000);}
            else {setTimeout(function(){document.getElementById('ifr_AA').src = GLOB_rgButins[GLOB_curAA_ID][3];}, 1000);}
        
            elem = document.getElementById('rap_general_planet_name_'+GLOB_rgButins[GLOB_curAA_ID][1]);
            elem.style.color = '#761B68';
            if (elem.innerHTML.match('Timeout 1')) {
                elem.innerHTML = '[Essai 2] ' +  clean_name(elem.innerHTML);
            } else if (elem.innerHTML.match('Timeout 2')) {
                elem.innerHTML = '[Essai 3] ' +  clean_name(elem.innerHTML);
            } else if (elem.innerHTML.match('Timeout 3')) {
                elem.innerHTML = '[Essai 4] ' +  clean_name(elem.innerHTML);
            } else {
                elem.innerHTML = '[En Cours] ' +  clean_name(elem.innerHTML);
            }
        }, encourstime);
        clearTimeout(AATimeout);
        AATimeout = setTimeout(function() {
            elem = document.getElementById('rap_general_planet_name_'+GLOB_rgButins[GLOB_curAA_ID][1]);
            elem.style.color = 'darkred';
            if (!elem.innerHTML.match('Timeout') && !elem.innerHTML.match('Essai')) {
                elem.innerHTML = '[Timeout 1] ' +  clean_name(elem.innerHTML);
                setTimeout(attack_cur, 2000);
            } else if (elem.innerHTML.match('Essai 2')) {
                elem.innerHTML = '[Timeout 2] ' +  clean_name(elem.innerHTML);
                setTimeout(attack_cur, 2000);
            } else if (elem.innerHTML.match('Essai 3')) {
                elem.innerHTML = '[Timeout 3] ' +  clean_name(elem.innerHTML);
                setTimeout(attack_cur, 2000);
            } else {
                elem.innerHTML = '[Abandon] ' +  clean_name(elem.innerHTML);
                document.getElementById('ifr_AA').src = 'http://ready';
                GLOB_curAA_ID++;
                attack_cur();
            }
        }, 25000);
    } else {
        launchAA=false;
        for (tmp =GLOB_curAA_ID; tmp<GLOB_rgButins.length-1 ; tmp++) {
            document.getElementById('rap_general_planet_name_'+GLOB_rgButins[tmp][1]).style.color = 'darkred';
            document.getElementById('rap_general_planet_name_'+GLOB_rgButins[tmp][1]).innerHTML = '[Butin] ' +  clean_name(document.getElementById('rap_general_planet_name_'+GLOB_rgButins[tmp][1]).innerHTML);
        }
        
        blit_message("Auto attaque terminée, retour à la vue d'ensemble dans 30 secondes");
        setTimeout(function(){
            window.location.href = window.location.href.replace(gup('page'), 'overview').replace('&sephiScript=1', '');
        }, 30*1000);
    }
}
function check_AA_feedback() { // Checkout Auto Attack feedback
    if (readCookie('AA_feed','all') != null && readCookie('AA_feed','all') != 'rien') {
        ID = parseInt(readCookie('AA_feed','all').match(/\d/g).join(""));
        e = document.getElementById('rap_general_planet_name_'+ID);
        flotte_succes = false;
        
        if (readCookie('AA_feed','all').match('IS_OK')) {
            e.innerHTML = '<span title="Flotte envoyée">[OK]</span> ' + clean_name(e.innerHTML); e.style.color='#109E18'; flotte_succes = true;
            // On augmente l'importance du frigo
            frigid = parseInt(document.getElementById('frigoID_'+ID).innerHTML);
            if (frigid >= 0) {
                importvars["frigos"][frigid][4] = parseInt(importvars["frigos"][frigid][4]) + 1;
                save_important_vars();
            }
        }
        fail_bec_PT = false;
        fail_bec_GT = false;
        if (readCookie('AA_feed','all').match('DEUT')) {e.innerHTML = '<span title="Vous n\'avez plus assez de deuterium pour envoyer cette flotte">? [Deut]</span> ' + clean_name(e.innerHTML); e.style.color='#d43635';flotte_succes = false;}
        if (readCookie('AA_feed','all').match('FLOTTE')) {e.innerHTML = '<span title="Vous n\'avez plus de slots de flotte disponible">? [Flotte]</span> ' + clean_name(e.innerHTML); e.style.color='#d43635';flotte_succes = false;}
        if (readCookie('AA_feed','all').match('NO_PERSO')) {e.innerHTML = '<span title="Votre flotte personnalisée est irréalisable">? [Perso]</span> ' + clean_name(e.innerHTML); e.style.color='#d43635';flotte_succes = false;}
        if (readCookie('AA_feed','all').match('NO_PT')) {fail_bec_PT = true;e.innerHTML = '<span title="Vous manquez de petits transporteurs, cliquez sur \'\'forcer\'\' pour envoyer tout ceux que vous avez">? [PT]</span> ' + clean_name(e.innerHTML); e.style.color='#d43635';flotte_succes = false;}
        if (readCookie('AA_feed','all').match('NO_GT')) {fail_bec_GT = true;e.innerHTML = '<span title="Vous manquez de grands transporteurs, cliquez sur \'\'forcer\'\' pour envoyer tout ceux que vous avez">? [GT]</span> ' + clean_name(e.innerHTML); e.style.color='#d43635';flotte_succes = false;}
        if (AATimeout !== null) clearTimeout(AATimeout);
        createCookie('lastRap', document.getElementById('rap_general_table').innerHTML, 1, 'AA');
        document.getElementById('ifr_AA').src = 'http://ready';
        
        if (launchAA) {
            isFirstTry = true;
            if (flotte_succes) {
                GLOB_curAA_ID++;
            } else {
                if ((fail_bec_PT && type_vaisseaux_AA == 1) || (fail_bec_GT && type_vaisseaux_AA == 2)) {
                    isFirstTry = false;
                } else {
                    GLOB_curAA_ID++;
                }
            }
            attack_cur();
        }
        createCookie('AA_feed', 'rien', 1, 'all');
    } 
    setTimeout(check_AA_feedback,500);
}

/* Enregiste la vitesse de production */
importvars["prods"] = new Array();
importvars["prods"][0] = parseInt(document.body.innerHTML.split(',"tooltip":')[1].split('<span')[3].split('/span>')[0].match(/\d/g).join(""))
importvars["prods"][1] = parseInt(document.body.innerHTML.split(',"tooltip":')[2].split('<span')[3].split('/span>')[0].match(/\d/g).join(""))
importvars["prods"][2] = parseInt(document.body.innerHTML.split(',"tooltip":')[3].split('<span')[3].split('/span>')[0].match(/\d/g).join(""))


/* lit votre capacité de stockage */
capa_metal = parseInt(document.body.innerHTML.split(',"max":')[1].split(',')[0].match(/\d/g).join(""));
capa_crystal = parseInt(document.body.innerHTML.split(',"max":')[2].split(',')[0].match(/\d/g).join(""));
capa_deuterium = parseInt(document.body.innerHTML.split(',"max":')[3].split(',')[0].match(/\d/g).join(""));


document.getElementById('ie_message').innerHTML += '<div id="div_for_sound"></div>';
count_progs=0;
decal_special = 0;
data='';
data += '<div style="height:0px;"><div id="support_prev_block" style="height:;width:660px;background:#0D1014;position:relative;left:-5px;"></div></div>';
    
id_prev="planet";
if (gup('page') == "overview") {id_prev="detailWrapper";}
new_prog_time = 0;
function countdownAA() {
    t=parseInt(readCookie('progTime','AA')) - time();
    //Imp2Toulouse
    //Add condition to avoid error when countdownAA is null
    if (document.getElementById('countdownAA') !== null) {
        if (t>0) {document.getElementById('countdownAA').innerHTML = get_cool_time(t/1000);setTimeout(countdownAA,1000);}
        else setTimeout(startAA, 2000);
    }
}
function startAA() {
    if (document.body.innerHTML.match('<div id="attack_alert" style="visibility:visible;">')) return;
    if (readCookie('repeat','AA') == 'oui' && readCookie('repeatTime','AA') !== null) {
        createCookie('progTime', time()+parseInt(readCookie('repeatTime','AA')), 1, 'AA');
        createCookie('isProg', 'oui', 1, 'AA');
        createCookie('repeat', 'oui', 1, 'AA');
        createCookie('repeatTime', readCookie('repeatTime','AA'), 1, 'AA');
    } else createCookie('isProg', 'non', 1, 'AA');
    
    // On démarre l'AA
    window.location.href='http://'+univers+'/game/index.php?page=shipyard&sephiScript=1&startAA=1';
}

/* Affiche l'attaques en attente */
retard_AA_button = false;
if (gup('page') !== 'traderOverview' && gup('page') !== 'premium' && gup('page') !== 'galaxy' && gup('page') !== 'highscore' && gup('page') !== 'fleet1' && gup('page') !== 'fleet2' && gup('page') !== 'fleet3' && readCookie('isProg','AA') == 'oui' && readCookie('progTime','AA') !== null) {
    time_restant = parseInt(readCookie('progTime','AA')) - time();
    if (time_restant < 0) time_restant = 0;
    if (time_restant >= 0) {
        count_progs++;
        decal_special++;
        repeat_text = '';
        time_repeat=0;
        if (readCookie('repeat','AA') == 'oui' && readCookie('repeatTime','AA') !== null) {
            time_repeat = parseInt(readCookie('repeatTime','AA'));
            repeat_text = ' <span style="color:#761B68">(Répéter toutes les '+get_cool_time(time_repeat/1000).replace('.00','')+')</span>';
        }
        data += "\n"+'<div style="height:0px;position:relative;top:'+(27*(count_progs-1))+'px;"><div id="AA_bandeau" style="cursor:default;word-wrap: normal;height:20px;font: 700 12px Verdana,Arial,Helvetica,sans-serif;position:relative;left:-8px;padding-top:7px;background: url(http://gf1.geo.gfsrv.net/cdn63/10e31cd5234445e4084558ea3506ea.gif) no-repeat;background-position:0px -1px;width:640px;margin-bottom:0px;color:#A52592;padding-left:40px;font-weight:normal;">';
        //Imp2Toulouse: MalWritten correction
        data += '<p style="width:600px;height:20px;white-space: nowrap">Auto-Attaque <b>prévue dans <span id="countdownAA">'+get_cool_time(time_restant/1000)+'</span></b>'+repeat_text;
        data += "\n"+'<div id="del_button_AA" style="height:0px;position:relative;left:578px;top:-20px;"><img style="cursor:pointer;width:16px;height:auto;" src="http://www.sephiogame.com/script/newsletter-close-button.png" title="Annuler l\'auto attaque" onclick="localStorage.setItem(\''+cur_planet+'_AA_isProg\', \'non\');window.location.href=window.location.href.replace(\'startAA=1\',\'\');"/></div>';
        data += "\n"+'<div id="retrad_AA_button" style="height:0px;position:relative;left:555px;top:-21px;"><img style="cursor:pointer;width:16px;height:auto;" src="http://www.sephiogame.com/script/IconeChrono2.png" title="Retarder l\'auto attaque de 15 minutes"/></div>';
        data += "\n"+'<div id="launch_AA_button" style="height:0px;position:relative;left:530px;top:-20px;"><img style="cursor:pointer;width:16px;height:auto;" src="http://www.sephiogame.com/script/icon_launch.png" title="Démarrer l\'auto attaque maintenant"/></div>';
        data += "\n"+'</div>';
        data += "\n"+'</div>';
        retard_AA_button = true;
        if (time_restant >= 0) setTimeout(countdownAA,1000);
    } 
    if (time_restant == 0) setTimeout(startAA, 2000);
    
}

function countdownRetour() {
    t=retour_time - time() + parseInt(readCookie('ejection_time', 'eject'));
    //Imp2Toulouse malwritten correction countdonwRetour by countdownRetour
    if (t>0) {document.getElementById('countdownRetour').innerHTML = get_cool_time(t/1000);setTimeout(countdownRetour,1000);}
    else setTimeout(function(){window.location.href = 'http://'+univers+'/game/index.php?page=movement';}, 2000);
}
/* Affiche du retour d'ejection */
if (readCookie('retour_auto', 'eject') == 'oui') {
    time_restant = retour_time - time() + parseInt(readCookie('ejection_time', 'eject'));
    
    if (time_restant > 0) {
        count_progs++;
        decal_special++;
        data += "\n"+'<div style="height:0px;position:relative;top:'+(27*(count_progs-1))+'px;"><div style="cursor:default;word-wrap: normal;height:20px;font: 700 12px Verdana,Arial,Helvetica,sans-serif;position:relative;left:-8px;padding-top:7px;background: url(http://gf1.geo.gfsrv.net/cdn63/10e31cd5234445e4084558ea3506ea.gif) no-repeat;background-position:0px -1px;width:640px;margin-bottom:0px;color:#A0A0A0;padding-left:40px;font-weight:normal;">';
        //Imp2Toulouse malwritten correction countdonwRetour by countdownRetour
        data += '<p style="width:600px;height:20px;white-space: nowrap"><b>Demande du retour de la flotte ejectée dans <span id="countdownRetour">'+get_cool_time((retour_time - time() + parseInt(readCookie('ejection_time', 'eject')))/1000)+'</span></b></p>';
        data += "\n"+'<div id="del_button_retour" style="height:0px;position:relative;left:578px;top:-20px;"><img style="cursor:pointer;width:16px;height:auto;" src="http://www.sephiogame.com/script/newsletter-close-button.png" title="Annuler le retour de la flotte ejectée" onclick="localStorage.setItem(\''+cur_planet+'_eject_retour_auto\', \'non\');window.location.href=window.location.href;"/></div>';
        data += "\n"+'</div>';
        data += "\n"+'</div>';
        setTimeout(countdownRetour,1000);
    } else {
      if (gup('page') !== 'movement') setTimeout(function(){window.location.href = 'http://'+univers+'/game/index.php?page=movement';}, 2000);
    }
}


// Affiche le pack de démarrage
enable_quick_pack = false;
if ((gup('page') == "resources" && !cur_planetIsLune) || (gup('page') == "station" && cur_planetIsLune)) {
    lvlMineMetal = 10;
    lvlMineCris = 10;
    //Imp2Toulouse- Maybe we could need
    lvlSynthDeut = 10;
    lvlSolar = 10;
    lvlBaseLunaire = 10;

    //Imp2Toulouse- Factorization + Antigame compatibility  
    //Call function get_info_button returns back current button level and evolution (if one running)
    //Allow to answer to the bug
    lvlMineMetal_Next = 0;
    lvlMineCris_Next = 0;
    lvlSynthDeut_Next = 0;
    lvlSolar_Next = 0;
    lvlBaseLunaire_Next = 0;

    if (!cur_planetIsLune) {
        var info_button1=get_info_button(document.getElementById("button1").innerHTML.split('<span class="level" style="font-size: 9px;">'));
        lvlMineMetal= parseInt(info_button1[0]);
        lvlMineMetal_Next= parseInt(info_button1[1]);

        var info_button2=get_info_button(document.getElementById("button2").innerHTML.split('<span class="level" style="font-size: 9px;">'));
        lvlMineCris= parseInt(info_button2[0]);
        lvlMineCris_Next= parseInt(info_button2[1]);

        var info_button3=get_info_button(document.getElementById("button3").innerHTML.split('<span class="level" style="font-size: 9px;">'));
        lvlSynthDeut= parseInt(info_button3[0]);
        lvlSynthDeut_Next= parseInt(info_button3[1]);

        var info_button4=get_info_button(document.getElementById("button4").innerHTML.split('<span class="level" style="font-size: 9px;">'));
        lvlSolar= parseInt(info_button4[0]);
        lvlSolar_Next= parseInt(info_button4[1]);

        //destruction varriable
        info_button1=null;
        info_button2=null;
        info_button3=null;
        info_button4=null;

    } else {

        var info_button2=get_info_button(document.getElementById("button2").innerHTML.split('<span class="level" style="font-size: 9px;">'));
        lvlBaseLunaire= parseInt(info_button2[0]);
        lvlBaseLunaire_Next= parseInt(info_button2[1]);

        info_button2=null;

    } 
    ///
    
    if (importvars["listPrev"].length == 0 && ( (!cur_planetIsLune && lvlMineMetal <= 1 && lvlMineCris <= 1 && lvlSolar <= 1) || (cur_planetIsLune && lvlBaseLunaire==0))){
        blit_message_time("<b>Pack de démarrage rapide</b> disponible pour votre nouvelle "+(cur_planetIsLune ? 'lune' : 'planète')+" !", 60000);
        enable_quick_pack = true;
        count_progs++;
        decal_special++;
        data += "\n"+'<div style="height:0px;position:relative;top:'+(27*(count_progs-1))+'px;"><div style="cursor:default;word-wrap: normal;height:20px;font: 700 12px Verdana,Arial,Helvetica,sans-serif;position:relative;left:-8px;padding-top:7px;background: url(http://gf1.geo.gfsrv.net/cdn63/10e31cd5234445e4084558ea3506ea.gif) no-repeat;background-position:0px -1px;width:640px;margin-bottom:0px;color:#A0A0A0;padding-left:40px;font-weight:normal;">';
        data += '<p style="width:600px;height:20px;white-space: nowrap; cursor:pointer" id="startquickpack" title="Activer le pack">Cliquez ici pour utiliser le <b>pack de démarrage rapide</b>.</p>';
        data += "\n"+'</div>';
        data += "\n"+'</div>';
    }
    
    //Imp2Toulouse- Clean Up
    lvlMineMetal = null;
    lvlMineCris = null;
    lvlSynthDeut = null;
    lvlSolar = null;
    lvlBaseLunaire = null;    
    lvlMineMetal_Next = null;
    lvlMineCris_Next = null;
    lvlSynthDeut_Next = null;
    lvlSolar_Next = null;
    lvlBaseLunaire_Next = null;
}


/* Affiche les constructions en attente */
if (gup('page') !== 'traderOverview' && gup('page') !== 'premium' && gup('page') !== 'galaxy' && gup('page') !== 'highscore' && gup('sephiScript') != '1' && gup('page') !== 'fleet1' && gup('page') !== 'fleet2' && gup('page') !== 'fleet3') {
    if (gup('page')!=='resourceSettings') document.getElementById('planet').className='Header'; 
    //document.getElementById("ie_message").innerHTML += '<div id="contentWrapper"></div><img src="http://www.sephiogame.com/script/d99a48dc0f072590fbf110ad2a3ef5.png"/><img src="http://www.sephiogame.com/script/sfdgdfshsdhg.png"/>';
    ress_metal = document.body.innerHTML.split('<span id="resources_metal" class="')[1].split('>')[1].split('</span>')[0].match(/\d/g).join("");
    ress_crystal = document.body.innerHTML.split('<span id="resources_crystal" class="')[1].split('>')[1].split('</span>')[0].match(/\d/g).join("");
    ress_deuterium = document.body.innerHTML.split('<span id="resources_deuterium" class="')[1].split('>')[1].split('</span>')[0].match(/\d/g).join("");
   
    decalY_prev = count_progs;
    reportfini = false;
    for (i=0 ; i<importvars["listPrev"].length ; i++) {
        pref = get_prev_data("page", i);
        multip = "";
        factor=1;
        if (get_prev_data("form_initial_number", i) !== null && get_prev_data("form_initial_number", i) !== "") {multip = " (x"+get_prev_data("form_initial_number", i)+")";}
        if (get_prev_data("form_number", i) !== null && get_prev_data("form_number", i) !== "") {
            if (get_prev_data("donned", i) == "yes") multip = " (x"+get_prev_data("form_initial_number", i)+")";
            else multip = " (x"+get_prev_data("form_number", i)+")";
            factor=parseInt(get_prev_data("form_number", i));
        }
        
        if (get_prev_data("havetoprev", i) == "yes" || get_prev_data("donned", i) == "yes" || get_prev_data("donned", i).match("yesno")) {
            bg = "#0F1D2D";
            color = "#606060";
            
            if (pref == gup('page') || gup('page') == "overview") {
                bg = "#3F4D5D";
                color = "#6f9fc8";
            }
            textSupp="";
            if (get_prev_data("donned", i) == "yes") {color = "#107E18";textSupp="["+LANG_started+"] ";}
            if (get_prev_data("donned", i).match("yesno")) {
                endTime = parseInt(get_prev_data("donned", i).match(/\d/g).join(""));
                if (endTime-time() <= 0) {
                    set_prev_data("havetoprev", i, "yes");
                    set_prev_data("donned", i, "no");
                    reportfini = true;
                } else {
                    color = "darkred";
                    textSupp="<span style=\"cursor:help\" title=\"Lorsque certaines conditions empêchent le lancement d'une construction (arbre tech par exemple), le script la repporte de 10 minutes\">[Repporté "+((parseInt((endTime-time())/60/1000))+1)+"min]</span> ";
                }
            }
            
            count_progs++;
            data += get_data_entry(i,textSupp, titles_cat[categories.indexOf(pref)], get_prev_data("title", i).replace(/_esp_/g, ' ')+multip, color, parseInt(get_prev_data("cur_met_prev", i))*factor,parseInt(get_prev_data("cur_crys_prev", i))*factor,parseInt(get_prev_data("cur_deut_prev", i))*factor,ress_metal,ress_crystal,ress_deuterium,count_progs);
        }
    }   
    
    if (reportfini) {
        save_important_vars();
        blit_message('La liste de constructions à été mise à jour, actualisation.');
        setTimeout(function() {location.href=location.href;}, 1000);
        exit(0);
    }
}

if (gup('page') !== 'traderOverview' && gup('page') !== 'premium' && gup('page') !== 'galaxy' && gup('page') !== 'highscore' && gup('page') !== 'fleet1' && gup('page') !== 'fleet2' && gup('page') !== 'fleet3') {
    // Affichage des commmandes programmées
        decalTop=270;
        head_height=document.getElementById(id_prev).OffsetHeight;
        if(gup('page') == 'shipyard' || gup('page') == 'research' || gup('page') == 'defense' || gup('page') == 'fleet1' || gup('page') == 'fleet2' || gup('page') == 'fleet3' || gup('page') == 'alliance' || gup('page') == 'messages' || gup('page') == 'movement') 
        {decalTop=220;head_height=250;}
        if(gup('page') == 'resourceSettings') {decalTop=10;head_height=document.getElementById(id_prev).style.height;}
        
        document.getElementById(id_prev).innerHTML += '<div id="info_prog" style="position:relative;top:'+(document.getElementById("planet").offsetHeight-30)+'px;">'+data+'</div>';
        document.getElementById(id_prev).style.height = (document.getElementById("planet").offsetHeight+(count_progs*27-5)) + "px";
        if (gup('page') == "overview") {document.getElementById("overviewBottom").style.marginTop = (count_progs*27 -9) + "px";}
    
        document.getElementById("support_prev_block").style.height = (count_progs*27)+"px";
    
    if (retard_AA_button) {
        document.getElementById('retrad_AA_button').onclick = function() {
            new_prog_time = parseInt(readCookie('progTime','AA')) + 15*60*1000; // retarde de 15 min
            localStorage.setItem(cur_planet+'_AA_progTime', new_prog_time);
        };
        document.getElementById('launch_AA_button').onclick = function() {
            new_prog_time = time()+ 5*1000; // lancer dans 5 secondes
            localStorage.setItem(cur_planet+'_AA_progTime', new_prog_time);
        };
    }
    
    // Drag & Drop des constructions
    if (gup('sephiScript') != '1') for (i=0 ; i<importvars["listPrev"].length ; i++) {document.getElementById('dragdrop_prev_'+i).onmousedown = drag_prev;}
}

var mouse = {x: 0, y: 0};
document.addEventListener('mousemove', function(e){ 
    mouse.x = e.clientX || e.pageX; 
    mouse.y = e.clientY || e.pageY;
    update_prev_pos();
    update_pla_pos();
}, false);

document.addEventListener('mouseup', function(e){ 
    drop_prev();
    drop_pla();
}, false);

curY_decal = 0;
isDragingPrev=false;
function drag_prev() {
    curY_decal = 0;
    cur_prev_id = parseInt(this.id.match(/\d/g).join(""));
    isDragingPrev= true;
    startMouseY = mouse.y;
    startMouseX = mouse.x;
    for (u_u = 0 ; u_u<importvars["listPrev"].length; u_u++) {
        document.getElementById("block_prog_"+importvars["listPrev"][u_u]["original_id"]).style.zIndex = 1; 
    }
    document.getElementById("block_prog_"+cur_prev_id).style.zIndex = 10000; 
}

function drop_prev() {
    if (isDragingPrev) {
        isDragingPrev=false;
        curPlace = parseInt(document.getElementById('prog_cur_place_'+cur_prev_id).innerHTML);
        decalY = mouse.y - startMouseY;
        decalArray = decalY/27;
        newPlace = parseInt(curPlace + decalArray);
        if (newPlace < 0) newPlace = 0;
        if (newPlace >= importvars["listPrev"].length) newPlace = importvars["listPrev"].length-1;
        
        apply_move_prev(cur_prev_id, curPlace, newPlace);
        save_important_vars();
        verif = setTimeout(gestion_cook, 2000);
        
        for (u_u = 0 ; u_u<importvars["listPrev"].length; u_u++) {
            id = get_prevID_from_place(u_u);
            $( '#block_prog_'+id ).animate({ top: (prev_possitions[id]) + "px" }, {duration: 500,queue: false} );
            $( '#block_prog_'+id ).animate({ left: "0px" }, {duration: 500,queue: false} );
        }
    }
}

function update_prev_pos() {
    if (isDragingPrev) {
        curPlace = parseInt(document.getElementById('prog_cur_place_'+cur_prev_id).innerHTML);
        decalY = mouse.y - startMouseY;
        decalArray = decalY/27;
        newPlace = parseInt(curPlace + decalArray);
        if (newPlace < 0) decalY = -curPlace*27 - 27;
        if (newPlace >= importvars["listPrev"].length) decalY = (importvars["listPrev"].length-1 - curPlace)*27 + 27;
        
        document.getElementById("block_prog_"+cur_prev_id).style.top = (prev_possitions[cur_prev_id] + decalY) + "px";
        decalX = mouse.x - startMouseX;
        //document.getElementById("block_prog_"+cur_prev_id).style.left = (decalX) + "px";
    }
}

// Drag & Drop des planètes
document.getElementById('countColonies').innerHTML += '<img style="cursor:pointer;width:18px;height:auto;position:relative;z-index:1000;left:150px;top:-23px;" id="dragplaActive" src="http://www.sephiogame.com/script/dragdrop.png" title="Activer le déplacement des planètes">';
document.getElementById('countColonies').innerHTML += '<img style="cursor:pointer;width:18px;height:auto;position:relative;z-index:1000;left:154px;top:-22px;" id="dragplaReset" src="http://www.sephiogame.com/script/newsletter-close-button.png" title="Réinitialiser déplacement des planètes">';
document.getElementById('dragplaActive').onclick = function () {
    for (i=0 ; i<nb_planet ; i++) {
        e = document.getElementById('dragpla-'+planet_list[i]);
        if (e !== null) e.style.display = 'block';
        this.style.display = 'none';
    }
};

document.getElementById('dragplaReset').onclick = function () {
    for (i=0 ; i<nb_planet ; i++) {
        plaPosX[i] = 0;
        plaPosY[i] = 0;
        createCookie('plaposX'+planet_list[i], plaPosX[i], 1, 'all');
        createCookie('plaposY'+planet_list[i], plaPosY[i], 1, 'all');
    }
    location.href = location.href;
};

for (i=0 ; i<nb_planet ; i++) {
    e=document.getElementById("planet-"+planet_list[i]);
    if(e !== null) {
        e.style.position = "relative";
        e.innerHTML += '<img style="display:none;cursor:move;width:18px;height:auto;-moz-user-select: none;position:relative;z-index:1000;left:110px;top:-44px;" id="dragpla-'+planet_list[i]+'" draggable="false" src="http://www.sephiogame.com/script/dragdrop.png" title="Déplacer">';
        document.getElementById('dragpla-'+planet_list[i]).onmousedown = drag_pla;
    }
}

plaPosX = new Array();
plaPosY = new Array();
for (i=0 ; i<nb_planet ; i++) {
    if (readCookie('plaposX'+planet_list[i], 'all') == null) plaPosX[i] = 0;
    else plaPosX[i] = parseInt(readCookie('plaposX'+planet_list[i], 'all'));
    if (readCookie('plaposY'+planet_list[i], 'all') == null) plaPosY[i] = 0;
    else plaPosY[i] = parseInt(readCookie('plaposY'+planet_list[i], 'all'));
    e=document.getElementById("planet-"+planet_list[i]);
    if(e !== null) {
        e.style.left = plaPosX[i]+"px";
        e.style.top = plaPosY[i]+"px";
    }
}

curY_decal = 0;
isDragingPla= false;
function drag_pla() {
    curY_decal = 0;
    cur_pla_id = parseInt(this.id.match(/\d/g).join(""));
    cur_plalist_id = planet_list.indexOf(cur_pla_id);
    isDragingPla = true;
    startMouseY = mouse.y;
    startMouseX = mouse.x;
}


function drop_pla() {
    if (isDragingPla) {
        isDragingPla=false;
        decalX = mouse.x - startMouseX;
        decalY = mouse.y - startMouseY;
        plaPosX[cur_plalist_id] += decalX;
        plaPosY[cur_plalist_id] += decalY;
        createCookie('plaposX'+cur_pla_id, plaPosX[cur_plalist_id], 1, 'all');
        createCookie('plaposY'+cur_pla_id, plaPosY[cur_plalist_id], 1, 'all');
    }
}

function update_pla_pos() {
    if (isDragingPla) {
        decalX = mouse.x - startMouseX;
        document.getElementById("planet-"+cur_pla_id).style.left = (plaPosX[cur_plalist_id] + decalX) + "px";
        
        decalY = mouse.y - startMouseY;
        document.getElementById("planet-"+cur_pla_id).style.top = (plaPosY[cur_plalist_id] + decalY) + "px";
    }
}

    
// Retour vue d'ensemble
if (gup('page') !== 'overview' && (gup('back') == '1' || (readCookie("back_to_overview", 'all') == "yes" && (readCookie("change_planet", 'all') !== "yes" || nb_planet==1)))) {
    createCookie("back_to_overview", "no", 1, 'all');
    blit_message('Retour à vue d\'ensemble dans 10 à 15 secondes.');
    setTimeout(function(){window.location.href = window.location.href.replace(gup('page'), 'overview');}, rand(10,15)*1000);
}

//Met à jour la production et Evite de se deconnecter et visite toutes les planetes
plapla_change_time1 = 1;
plapla_change_time2 = 3;
if (parseInt(readCookie("plapla_change_time1", 'all')) >= 1) plapla_change_time1 = parseInt(readCookie("plapla_change_time1", 'all'));
if (parseInt(readCookie("plapla_change_time2", 'all')) >= plapla_change_time1) plapla_change_time2 = parseInt(readCookie("plapla_change_time2", 'all'));
if (plapla_change_time1>= plapla_change_time2) plapla_change_time2 = plapla_change_time1 + 1;
if (nb_planet>1 && (readCookie("change_planet", 'all') == "yes" || gup('page') == "overview")) {
    attente = rand(plapla_change_time1,plapla_change_time2)*60;
    if (document.body.innerHTML.match('<div id="attack_alert" style="visibility:visible;">')) attente = rand(1,2)*30;
    
    if (readCookie("noplaplaChange", 'all') == 'oui') {
        createCookie("change_planet", "no", 1, 'all');
        setTimeout(function(){blit_message_time('<span style="float: none;margin: 0;color:red">Attention : Changement de planète désactivé</span>',10000);}, 20000);
    } else {
        if (readCookie("change_planet", 'all') == "yes") {
            attente=rand(10,15);
            createCookie("change_planet", "no", 1, 'all');
            blit_message('<span style="float: none;margin: 0;color:#109E18">Construction lancée</span>, changement de planète dans 10 à 15 secondes.');
        } else {
            dump_attente = attente;
            deb_time = time();
            for (i=1;i<=20;i++) setTimeout(function(){if (!dont_boudge) blit_message('Changement de planète prévu dans <span style="float: none;margin: 0;color:#109E18">'+get_cool_time(dump_attente - Math.floor((time()-deb_time)/1000))+' minutes</span>.', true);}, i*17000);
        }
    }
    
    if (readCookie("noplaplaChange", 'all') != 'oui') {
        // On prévoit le changement de planète
        setTimeout(function(){
            createCookie("just_to_update_prod", "yes", 1, 'all');
            if (gup('cp') == "") {url = window.location.href+'&cp='+planet_list[(cur_planet_id+1)%nb_planet];}
            else url = window.location.href.replace(gup('cp'), planet_list[(cur_planet_id+1)%nb_planet]);
            
            if (!dont_boudge) window.location.href = url;
            if (dont_boudge && gup('page') !== 'overview') window.location.href = window.location.href.replace(gup('page'), 'overview');
        }, attente*1000);
    } else {
        // On actualise simplement la page pour vérifier si une attaque n'est pas en cours
        setTimeout(function(){
            window.location.href = window.location.href;
        }, rand(plapla_change_time1, plapla_change_time2)*60*1000);
    }
}

//Retour auto à vue d'ensemble apres 5-10 min
backOverview = setTimeout(function(){
    window.location.href = window.location.href.replace(gup('page'), 'overview').replace('&sephiScript=1', '');
}, rand(5,10)*60*1000);

// Creation flotte
function calc_ID_flotte () {
fleetid = '';
e=document.getElementsByClassName('fleetValues');
for (i=0; i<e.length ; i++) {
t = e[i].value;
if (t == 'undefined') t = 0;
fleetid += t+':';
}
document.getElementById('flotte_id').value = fleetid;
}
if (gup('page') == "fleet1") {
e=document.getElementsByClassName('send_none')[0];
if (document.getElementsByClassName('send_none').length >= 1) {
d = '<div style="position: relative;top: -85px;left:39px;px;z-index: 1000;font-size:12px;height:0px;width:0px;"><div style="position:relative;left:75px;top:77px;width:200px;height:30px;">';
d += '<input type="text" id="flotte_id" title="Identificateur flotte" style="width:130px;text-align:left;height:25px;margin-left:0px;font-family: inherit;color:#202040;position:relative;left:10px;top:-23px;font-size:11px" value="Identificateur flotte"/>';
d += '<span class="factorbutton" style="position: relative;top:-23px;left:12px;"><input id="flotte_id_calc" class="btn_blue" style="margin-left:5px;min-width: 30px;" type="button" value="Ok"></span>';
//d += '<span class="factorbutton" style="position: relative;top:87px;left:222px;"><input id="flotte_id_app" class="btn_blue" style="margin-left:10px" type="button" value="Restaurer"></span>';
d += '</div></div>';
e.innerHTML = e.innerHTML+d;
document.getElementById('flotte_id_calc').onclick = calc_ID_flotte;
//for (i=200 ; i<=215 ; i++) if (document.getElementById('ship_'+i) !== null) document.getElementById('ship_'+i).onchange = calc_ID_flotte;
}
}

// Auto Espionnage si sonde
if (gup('page') == "fleet3") {
e=document.getElementsByTagName('input');
haveSondes=false;
count_types = 0;
for (i=0 ; i<e.length ; i++) {
if (e[i].name.match("am")) count_types++;
if (e[i].name == "am210") haveSondes=true;
}
if (haveSondes && count_types == 1 && document.getElementById('button6').className == 'on') $('#missionButton6').click();
}

// Eject
//Imp2Toulouse
//Note: type=1 - GoTo Planet - setTType(1); modifyPlanetName(); checkOk(); focusContinueButton();
//      type=2 - GoTo recycs - setTType(2); modifyPlanetName(); checkOk(); focusContinueButton();
//      type=3 - GoTo Moon   - setTType(3); modifyPlanetName(); checkOk(); focusContinueButton();
//  mission=15 - Expedition                      - setSelected(15);updateMission("Exp\u00e9dition","Envoyez vos vaisseaux dans les profondeurs de l`espace pour effectuer des qu\u00eates passionnantes.","off",15);
//   mission=9 - Détruire                        - setSelected(9); updateMission("D\u00e9truire","D\u00e9truisez la lune de votre adversaire.","off",9);
//   mission=8 - Recycler le champ de débris     - setSelected(8);updateMission("Recycler le champ de d\u00e9bris","Envoyez votre recycleur sur un champ de d\u00e9bris pour qu`il en r\u00e9colte les ressources.","off",8);
//   mission=7 - Coloniser                       - setSelected(7);updateMission("Coloniser","Colonisez une nouvelle plan\u00e8te.","off",7);
//   mission=6 - Espionner                       - setSelected(6);updateMission("Espionner","Espionnez les mondes d`autres empereurs.","off",6);
//   mission=5 - Stationner et défendre          - setSelected(5);updateMission("Stationner","D\u00e9fendez la plan\u00e8te de votre alli\u00e9.","off",5);
//   mission=4 - Stationner                      - setSelected(4);updateMission("Stationner","Envoyez une flotte durablement vers une autre plan\u00e8te de votre empire.","on",4);
//   mission=3 - Transporter                     - setSelected(3);updateMission("Transporter","Transportez vos ressources sur les autres plan\u00e8tes.","on",3);
//   mission=2 - Attaque groupée                 - setSelected(2);updateMission("Attaque group\u00e9e","Des combats honorables peuvent perdre ce statut si de puissants joueurs se joignent au SCA. C`est la somme totale des points militaires des attaquants compar\u00e9e \u00e0 celle des d\u00e9fenseurs qui est prise en compte.","off",2);
//   mission=1 - Attaquez la flotte / la défense - setSelected(1);updateMission("Attaquer","Attaquez la flotte et la d\u00e9fense de votre adversaire.","off",1);
//   mission=0 - Undefined

//For our need, mission=3 and (type=1 ou type=3, if target is a moon)

if (gup('page') == "fleet1" && gup('eject') == 'yes') {
    //Imp2Toulouse- Change eject processus in order to use existant origine function

    //document.getElementById('shipsChosen').action += '&eject=yes';
    //setTimeout(function(){document.getElementById('shipsChosen').submit();}, 1000);
    form=null;
    //Fillfull form
    form=document.getElementById('shipsChosen');
    //base of url
    setTimeout(function(){form.action +="&union=0&eject=yes"; form.union.value="0";}, 100);
    //add type and mission
    setTimeout(function(){form.action +="&type="+((eject_onLune)?3:1)+"&mission=3"; form.type.value = (eject_onLune)?"3":"1";form.mission.value = "3";}, 300);
    //add Fleets
    if (eject_all) 
        setTimeout(function(){setMaxIntInput("form[name=shipsChosen]", {"202":99999,"203":99999,"204":99999,"205":99999,"206":99999,"207":99999,"208":99999,"209":99999,"210":99999,"211":99999,"213":99999,"214":99999,"215":99999});}, 600);
    else 
        setTimeout(function(){setMaxIntInput("form[name=shipsChosen]", {"202":99999,"203":99999,"208":99999,"209":99999,"210":99999});}, 600);
    //add target coord
    setTimeout(function(){form.action +="&galaxy="+form.galaxy.value+"&system="+form.system.value+"&position="+form.position.value;}, 800);
    //Set the speed the lowest possible
    setTimeout(function(){form.action +="&speed=1";form.speed.value="1";}, 800);
    //Submit form
    setTimeout(function(){form.submit();}, 1000);
}
if (gup('page') == "fleet2" && gup('eject') == 'yes') {
    //Imp2Toulouse- Change eject processus in order to use existant origine function
    form=null;
    form=document.getElementsByTagName('form')[0];
    //base of url
    setTimeout(function(){form.action +="&union=0&eject=yes"; form.union.value="0";}, 300);
    //add type and mission
    setTimeout(function(){form.action +="&type="+((eject_onLune)?3:1)+"&mission=3"; form.type.value = ((eject_onLune)?"3":"1");form.mission.value = "3";}, 600);

    //Set the speed the lowest possible
    //form.action +="&speed=1";

    //Launch form
    //setTimeout(function(){form.submit();}, 1000);
    setTimeout(function(){trySubmit()}, 1000);
}
if (gup('page') == "fleet3" && gup('eject') == 'yes') {
    //Imp2Toulouse- Change eject processus in order to use existant origine function
    form=null;
    //Imp2toulouse- Prepare information to send
    form=document.getElementsByTagName('form')[0];

    //Change url in order to specify a trigger for sephiOGame
    form.action += '&eject=yes';

    //Choose the lowest speed possible
    document.getElementsByName('speed').value ="1";

    //Utilisation de la fonction javascript adaptée pour selectionner l'ensemble des ressources
    document.getElementById('metal').value=999999999999999;
    document.getElementById('crystal').value=999999999999999;
    document.getElementById('deuterium').value=999999999999999;

    //select type
    document.getElementsByName('type').value=((eject_onLune)?3:1);
    
    //Select "Stationnement"
    setTimeout(function(){setSelected(4);updateMission("Stationner","Envoyez une flotte durablement vers une autre plan\u00e8te de votre empire.","on",4);}, 300);

    //Update variables
    setTimeout(function(){updateVariables();},400); 

    //Conf the coming back fleet
    setTimeout(function(){createCookie('retour_auto', 'oui', 1, 'eject');createCookie('ejection_time', time(), 1, 'eject');},600); 

    //Launch form
    setTimeout(function(){form.submit();}, 1000);
    //setTimeout(function(){trySubmit()}, 1000);
}
if (gup('page') == "movement" && readCookie('retour_auto', 'eject') == 'oui' && time() - parseInt(readCookie('ejection_time', 'eject')) > retour_time){
    createCookie('retour_auto', 'non', 1, 'eject');
    flottes = document.getElementsByClassName('fleetDetails');
    for (i=flottes.length-1 ; i>=0 ; i--) {
        t = flottes[i].innerHTML.split('</a>')[0].split('>');
        coord = t[t.length-1];
        if (coord == cur_planet_coords.replace('Lune','') && flottes[i].innerHTML.split('return=').length > 1) {
            r = flottes[i].innerHTML.split('return=')[1].split('"')[0];

            // Autorise à re-ejecter dès que les flottes sont rentrés
            createCookie('escaped_'+cur_planet, null, 'all');
            setTimeout(function(){window.location.href = 'http://'+univers+'/game/index.php?page=movement&back=1&return='+r;}, 2000);
            break;
        }
    }
}
         

// Recyclage
if (gup('page') == "fleet1" && gup('setRecy') !== null && gup('setRecy') !== '') {
    nbRecy = parseInt(gup('setRecy'));
    document.getElementById('shipsChosen').action += "&recyclPLZ=oui";
    setTimeout(function() {document.getElementById('button209').getElementsByTagName('a')[0].click();},100);
    setTimeout(function() {document.getElementById('ship_209').value=nbRecy;},300);
}
if (gup('page') == "fleet2" && gup('recyclPLZ') == 'oui') {
    document.getElementById('dbutton').click();
}

// Auto-Attack
if (gup('page') == "fleet1" && gup('auto') == 'yes') {
    nbPT = 0;
    nbGT = 0;
    if (gup('PT') !== "") nbPT = parseInt(gup('PT'));
    if (gup('GT') !== "") nbGT = parseInt(gup('GT'));
    
    maxPT = parseInt(document.body.innerHTML.split('Petit transporteur </span>')[1].split('</span>')[0].match(/\d/g).join(""))
    maxGT = parseInt(document.body.innerHTML.split('Grand transporteur </span>')[1].split('</span>')[0].match(/\d/g).join(""))

    maxNames = new Array('Chasseur léger','Chasseur lourd','Croiseur','Vaisseau de bataille','Traqueur','Bombardier','Destructeur','Étoile de la mort','Petit transporteur','Grand transporteur','Vaisseau de colonisation','Recycleur','Sonde d`espionnage');
    
    perso_is_ok = true;
    if (gup('flotte_perso') !== '') {
        nbf = gup('flotte_perso').split(':');
        e=document.getElementsByClassName('fleetValues');
        for (i=0; i<e.length ; i++) {
            e[i].value = nbf[i];
            if (parseInt(nbf[i]) > parseInt(document.body.innerHTML.split(maxNames[i]+' </span>')[1].split('</span>')[0].match(/\d/g).join("")))
                perso_is_ok=false;
        }
    }
    supPT = document.getElementById('ship_202').value;
    if (supPT == "") supPT = 0;
    else supPT = parseInt(supPT);
    supGT = document.getElementById('ship_203').value;
    if (supGT == "") supGT = 0;
    else supGT = parseInt(supGT);
    document.getElementById('ship_202').value= supPT + nbPT;
    document.getElementById('ship_203').value= supGT + nbGT;
    has_flotte = document.body.innerHTML.split('<span>Flottes:</span>')[1].split('</span>')[0].split('class="').length == 1;
    //Calcule si le lancement d'une flotte est possible en fonction des slots disponibles
    if (has_flotte && readCookie('AA_leave_slot','AA') == 'oui') {
        nb_flotte = document.body.innerHTML.split('<span>Flottes:</span>')[1].split('</span>')[0];
        
        max_flotte = parseInt(nb_flotte.split('/')[1].match(/\d/g).join(""));
        nb_flotte = parseInt(nb_flotte.split('/')[0].match(/\d/g).join(""));
        //add Imp2Toulouse- Read nb of leave slot
        nb_slot_leave=(readCookie('AA_nb_slot','AA') == '')?1:parseInt(readCookie('AA_nb_slot','AA'));
        // Replace by the number read
        if (max_flotte - nb_flotte <= nb_slot_leave) has_flotte = false;
    }
    
    idcook = 'AA_feed';
    if (gup('ID') == 'Exped') idcook = 'AA_Exp';
    if (!has_flotte) {document.title = 'Pas de flotte disponible';createCookie(idcook, gup('ID')+'_FLOTTE', 1, 'all');}
    else if (!perso_is_ok) {document.title = 'Flotte Perso impossible'; createCookie(idcook, gup('ID')+'_NO_PERSO', 1, 'all');}
    else if (nbPT > maxPT && (gup('force') !== '1' || maxPT==0)) {document.title = 'Manque de Petits transporteurs'; createCookie(idcook, gup('ID')+'_NO_PT', 1, 'all');}
    else if (nbGT > maxGT && (gup('force') !== '1' || maxGT==0)) {document.title = 'Manque de Grands transporteurs'; createCookie(idcook, gup('ID')+'_NO_GT', 1, 'all');}
    else {
            document.getElementById('shipsChosen').action += '&auto=yes&ID='+gup('ID');
            setTimeout(function(){document.getElementById('shipsChosen').submit();}, 3000);
        }
}
if ((gup('page') == "fleet2") && gup('auto') == 'yes') {
    if (document.getElementById('consumption').innerHTML.match('overmark')) {
        createCookie(idcook, gup('ID')+'_DEUT', 1, 'all');
    } else {
        document.getElementsByTagName('form')[0].action += '&auto=yes&ID='+gup('ID');
        setTimeout(function(){document.getElementsByTagName('form')[0].submit();}, 3000);
    }
}
if ((gup('page') == "fleet3") && gup('auto') == 'yes') {
    document.getElementsByTagName('form')[0].action += '&auto=yes&ID='+gup('ID');
    if (gup('ID') !== 'Exped') $('#missionButton1').click();
    setTimeout(function(){document.getElementsByTagName('form')[0].submit();}, 3000);
}
if (gup('page') == "movement" && gup('auto') == 'yes') {
    idcook = 'AA_feed';
    if (gup('ID') == 'Exped') idcook = 'AA_Exp';
    createCookie(idcook, gup('ID')+'_IS_OK', 1, 'all');
}
// END - Auto-Attack

// Total retours
if (gup('page') == 'movement') {
    flottes = document.getElementsByClassName('fleetDetails');
    planets = new Array();
    quant_metal = new Array();
    quant_crystal = new Array();
    quant_deut = new Array();
    nb_vaisseaux = new Array();
    
    data='<div id="buttonz" style="min-height: 0px;margin:0px;position:relative;top:'+(document.getElementById("planet").offsetHeight-27)+'px;left:-8px;"><div class="header"><p style="width:665px;text-align:center;height:20px;white-space: nowrap;padding-top:8px;color:#6f9fc8;"><b>Arrivées prévues</b></p></div></div>';
    data+='<table style="width:656px;position:relative;top:'+(document.getElementById("planet").offsetHeight-27)+'px;left:-2px;border: 1px solid #000000;color: #777;background:#0D1014;margin:auto;margin-bottom:16px;"><tbody><tr style="background:#1b1b1b;color: #999;"><th style="border: 1px solid #303030;padding: 5px 8px;">Planète</th><th style="border: 1px solid #303030;padding: 5px 8px;">Métal</th><th style="border: 1px solid #303030;padding: 5px 8px;">Cristal</th><th style="border: 1px solid #303030;padding: 5px 8px;">Deuterium</th><th style="border: 1px solid #303030;padding: 5px 8px;">Vaisseaux</th></tr>';
    
    for (i=0 ; i<flottes.length ; i++) {
        tmp=flottes[i].innerHTML.split('</figure>');
        dep = tmp[1].split('</span>')[0].replace(/ /g,'');
        if (!flottes[i].innerHTML.match('Expédition')) dest = tmp[2].split('</span>')[0].replace(/ /g,'');
        else dest = 'Expédition';
        metal = parseInt(flottes[i].innerHTML.split('<td>Métal:')[1].split('class="value">')[1].split('<')[0].match(/\d/g).join(""));
        crystal = parseInt(flottes[i].innerHTML.split('<td>Cristal:')[1].split('class="value">')[1].split('<')[0].match(/\d/g).join(""));
        deut = parseInt(flottes[i].innerHTML.split('<td>Deutérium:')[1].split('class="value">')[1].split('<')[0].match(/\d/g).join(""));
        vaisseaux = 0;
        tmp = flottes[i].innerHTML.split('Vaisseaux:')[1].split('Chargement:')[0].split('class="value">');
        for (j=1 ; j<tmp.length ; j++) {
            vaisseaux += parseInt(tmp[j].split('</td>')[0]);
        }
        
        id_dep = planets.indexOf(dep);
        if (id_dep == -1)id_dep = planets.length;
        
        id_dest = planets.indexOf(dest);
        if (id_dest == -1)id_dest = planets.length;
        
        if (flottes[i].innerHTML.match('Attaquer') || flottes[i].innerHTML.match('Stationner') || flottes[i].innerHTML.match('Expédition')) {
            if (flottes[i].innerHTML.match('Stationner')) {id = id_dest; planets[id] = dest;}
            else {id = id_dep; planets[id] = dep;}
            
            if (quant_metal[id] == undefined) quant_metal[id] = 0;
            if (quant_crystal[id] == undefined) quant_crystal[id] = 0;
            if (quant_deut[id] == undefined) quant_deut[id] = 0;
            if (nb_vaisseaux[id] == undefined) nb_vaisseaux[id] = 0;
            
            quant_metal[id] += metal;
            quant_crystal[id] += crystal;
            quant_deut[id] += deut;
            nb_vaisseaux[id] += vaisseaux;
        } else if (flottes[i].innerHTML.match('Transporter')) {
            if (id_dep == id_dest) id_dest++;
            if (nb_vaisseaux[id_dep] == undefined) nb_vaisseaux[id_dep] = 0;
            planets[id_dep] = dep;
            nb_vaisseaux[id_dep] += vaisseaux;
            
            if (!flottes[i].innerHTML.match('fleet_icon_reverse')) {
                if (quant_metal[id_dest] == undefined) quant_metal[id_dest] = 0;
                if (quant_crystal[id_dest] == undefined) quant_crystal[id_dest] = 0;
                if (quant_deut[id_dest] == undefined) quant_deut[id_dest] = 0;
                planets[id_dest] = dest;
                quant_metal[id_dest] += metal;
                quant_crystal[id_dest] += crystal;
                quant_deut[id_dest] += deut;
            }
        }
            }
    
    for (i=0 ; i<planets.length ; i++) {
        if (quant_metal[i] == undefined || quant_metal[i] == 0) quant_metal[i] = '-';
        if (quant_crystal[i] == undefined || quant_crystal[i] == 0) quant_crystal[i] = '-';
        if (quant_deut[i] == undefined || quant_deut[i] == 0) quant_deut[i] = '-';
        if (nb_vaisseaux[i] == undefined || nb_vaisseaux[i] == 0) nb_vaisseaux[i] = '-';
        
        data += '<tr><td style="border: 1px solid #303030;padding: 5px 8px;color:#7c8e9a;">'+planets[i]+'</td>';
        data += '<td style="border: 1px solid #303030;padding: 5px 8px;">'+get_cool_digit(quant_metal[i])+'</td>';
        data += '<td style="border: 1px solid #303030;padding: 5px 8px;">'+get_cool_digit(quant_crystal[i])+'</td>';
        data += '<td style="border: 1px solid #303030;padding: 5px 8px;">'+get_cool_digit(quant_deut[i])+'</td>';
        data += '<td style="border: 1px solid #303030;padding: 5px 8px;">'+get_cool_digit(nb_vaisseaux[i])+'</td>';
        data += '</tr>';
    }
    
    
    data += '</tbody></table></td></tr></table>';
    document.getElementById('planet').innerHTML += data;
    document.getElementById('planet').style.height = (document.getElementById("planet").offsetHeight+((1+planets.length)*26+32)) + "px";
    
    //document.getElementById('inhalt').innerHTML = document.getElementById('inhalt').innerHTML.replace('<div class="fleetStatus">',data+'<div class="fleetStatus">');
}
// END - Total Retours


// Rapport général
leave_slot='';
noGTAA='';
forceAA='';
type_vaisseaux_AA = readCookie('type_vaisseaux','AA') == null ? 1 : parseInt(readCookie('type_vaisseaux','AA'));
defaut_AA_butin = 20000;
defaut_AA_nb_slot=1;
if (readCookie('AA_butin','AA') !== null) defaut_AA_butin = readCookie('AA_butin','AA').match(/\d/g).join("");
if (readCookie('AA_nb_slot','AA') !== null) defaut_AA_nb_slot = readCookie('AA_nb_slot','AA').match(/\d/g).join("");
if (readCookie('AA_leave_slot','AA') == 'oui') leave_slot=' checked';
if (readCookie('noGT','AA') == 'oui') noGTAA=' checked';
if (readCookie('force','AA') == 'oui') forceAA=' checked';
if (gup('page') == 'messages') {
    //Imp2Toulouse- Miss div
    data = '</div><div style="width:662px;background: url(http://gf1.geo.gfsrv.net/cdn03/db530b4ddcbe680361a6f837ce0dd7.gif) repeat-y;position:relative;left:-30px;padding-bottom:0px;">';
    data += '<div style="width:636px;background-color: #14191f;margin:auto;position:relative;left:4px;top:8px;padding-bottom:10px;">';
    data += '<iframe id="rapport_option_quick_active" style="display:none"></iframe><p id="rapport_option_quick" style="cursor:pointer;display:none;text-align:left;color:darkred;position:relative;top:7px;padding-left:30px;font-weight:normal;padding-bottom:10px;padding-top:10px;">&#9658; Cliquez ici pour accélérer la génération des rapports généraux<br><span style="position:relative;top:5px;left:20px;font-size:0.8em">(Activation auto de Option > Affichage > Messages > Rapport complet)</span></p>';
    //Imp2Toulouse- Add lastAAcoolTime
    if (readCookie('lastRap', 'AA') !== null) data += '<p id="old_rapport_gen" style="text-align:left;cursor:pointer;color:#6f9fc8;position:relative;top:7px;padding-left:30px;font-weight:normal;padding-bottom:10px;padding-top:10px;">&#9658; Relire le dernier <b>rapport général</b> de cette planète (Généré il y a '+get_last_AA_coolTime()+')</p>';
    data += '<p id="rapport_gen" style="text-align:left;cursor:pointer;color:#6f9fc8;position:relative;top:7px;padding-left:30px;font-weight:normal;padding-bottom:10px;padding-top:10px;">&#9658; Demander un <b>rapport général</b> (seulement les rapports non lu de cette page)</p>';
    data += '<p style="text-align:left;color:#808080;position:relative;top:7px;padding-left:40px;font-weight:normal;padding-bottom:10px;padding-top:0px;"><input type="checkbox" id="with_readed_RG" style="position:relative;top:2px;"/> Considérer également les rapports lus (maximum <input type="text" id="NB_readed_RG" value="5" style="text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;" onfocus="document.getElementById(\'with_readed_RG\').checked = true;"> rapports)</p>';
    data += '<p style="text-align:left;color:#808080;position:relative;top:7px;padding-left:40px;font-weight:normal;padding-bottom:20px;padding-top:0px;"><input type="checkbox" id="AA_RG" style="position:relative;top:2px;"/> Attaquer automatiquement si le butin est supérieur à <input type="text" id="butin_AA_RG" value="'+defaut_AA_butin+'" style="text-align:center; width:50px;margin-left:5px;margin-right:5px;height: 15px;" onfocus="document.getElementById(\'AA_RG\').checked = true;"> (<span style="cursor:pointer;" id="save_AA_butin">enregistrer</span>)</p>';
    if (readCookie('lastRap', 'AA') !== null) data += '<p id="old_rapport_gen_AA" style="display:none;text-align:left;cursor:pointer;color:#6f9fc8;position:relative;top:7px;padding-left:30px;font-weight:normal;padding-bottom:30px;">&#9658; Lancer une auto-attaque avec ce rapport';
    //data += '<p style="text-align:left;color:#808080;position:relative;top:7px;padding-left:40px;font-weight:normal;padding-bottom:20px;padding-top:0px;"><input type="checkbox" id="leave_slot_AA" style="position:relative;top:2px;" '+leave_slot+'/> Laisser un slot de flotte libre</p>';
    //data += '<p style="text-align:left;color:#808080;position:relative;top:3px;padding-left:40px;font-weight:normal;padding-bottom:20px;padding-top:0px;"><input type="checkbox" id="noGT_AA" style="position:relative;top:2px;" '+noGTAA+'/> Envoyer uniquement des Petits Transporteurs</p>';
    //data += '<p style="text-align:left;color:#808080;position:relative;top:3px;padding-left:40px;font-weight:normal;padding-bottom:20px;padding-top:0px;"><input type="checkbox" id="force_AA" style="position:relative;top:2px;" '+forceAA+'/> Envoyer la flotte même si il manque des transporteurs</p>';
    data += '<div id="rapport_gen_place" style="width:600px;margin:auto;"></div>'
    data += '</div>'
    data += '</div>'
    e = document.getElementById('tabs');
    e.innerHTML += data;
    
    document.getElementById('save_AA_butin').onclick = function (){
        createCookie('AA_butin', document.getElementById('butin_AA_RG').value.match(/\d/g).join(""), 1, 'AA');
        this.innerHTML = 'ok';
        this.style.cursor = 'default';
    };
    document.getElementById('rapport_gen').onclick = function() {document.getElementById('old_rapport_gen').style.display="none";start_rapport_general();};
    if (readCookie('lastRap', 'AA') !== null) document.getElementById('old_rapport_gen').onclick = function() {
        document.getElementById('old_rapport_gen_AA').style.display = 'block';
        document.getElementById('rapport_gen_place').innerHTML = '<iframe style="display:none;" id="ifr_AA" src="http://ready"></iframe><table id="rap_general_table" style="width:600px;position:relative;top:0px;left:0px;border: 1px solid #000000;color: #777;background:#0D1014;margin:auto;margin-bottom:0px;">'+readCookie('lastRap', 'AA')+'</table>';
        document.getElementById('old_rapport_gen').style.display="none";
        check_AA_feedback();
    };
    if (readCookie('lastRap', 'AA') !== null) document.getElementById('old_rapport_gen_AA').onclick = function() {
        GLOB_rgButins = new Array();
        GLOB_rgID = 1;
        flotte_perso='';
        idFrig = -1;
        document.getElementById('old_rapport_gen_AA').style.display = 'none';
        
        while(document.getElementById('rap_general_coord_'+GLOB_rgID) != null) {
            butin = parseInt(document.getElementById('rap_general_butin_'+GLOB_rgID).innerHTML.match(/\d/g).join(""));
            tmp = document.getElementById('rap_general_coord_'+GLOB_rgID).innerHTML.replace('[','').replace(']','').split(':');
            galaxy = tmp[0];
            system = tmp[1];
            planet = tmp[2];
            //Imp2Toulouse- Replace this block with equivalent one in order to use id_frigo function
            // Recherche d'un frigo avec ces coordonnées et qui a une flote personnalisée
            flotte_perso='';
            idFrig=is_frigo(importvars["frigos"],document.getElementById('rap_general_coord_'+GLOB_rgID).innerHTML);
            //If 5 items set so a "flotte_perso" exist
            if (idFrig>=0 && importvars["frigos"][idFrig].length > 5) flotte_perso=importvars["frigos"][idFrig][5];
            ////
            
            document.getElementById('rap_general_planet_name_'+GLOB_rgID).innerHTML = clean_name(document.getElementById('rap_general_planet_name_'+GLOB_rgID).innerHTML);
            document.getElementById('rap_general_planet_name_'+GLOB_rgID).style.color = '';
            GLOB_rgButins[GLOB_rgID] = new Array();
            GLOB_rgButins[GLOB_rgID][0] = butin;
            GLOB_rgButins[GLOB_rgID][1] = GLOB_rgID;
            forceparam = '';
            if(readCookie('force','AA') == 'oui') forceparam = '&force=1';
            GLOB_rgButins[GLOB_rgID][2] = 'http://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+(GLOB_rgID)+'&PT='+(2+Math.floor(butin/5000))+forceparam+'&flotte_perso='+flotte_perso+'';
            GLOB_rgButins[GLOB_rgID][3] = 'http://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+(GLOB_rgID)+'&GT='+(2+Math.floor(butin/25000))+forceparam+'&flotte_perso='+flotte_perso+'';
            GLOB_rgID++;
        }
           
        GLOB_rgButins = GLOB_rgButins.sort(function(a,b) { return b[0] - a[0] });
        GLOB_curAA_ID = 0;
        launchAA=true;
        isFirstTry = true;
        if (!waitingExped) attack_cur();
    };
    // Refait marcher les onglets
    $(".msgNavi").click(function(){ 
        $(".msgNavi").removeClass("aktiv");
        $(this).addClass("aktiv");
        ajaxPageLoad($(this).attr('id'), $(this).attr('value'));
    });
    if (gup('RG') == 'OUI') setTimeout(start_rapport_general,2000);
    if (gup('AA') == 'OUI') document.getElementById('AA_RG').checked = true;
    
}
// END - Rapport général


add_prevenir_button();
save_list_in_cookies();
update_timers();
verif=setTimeout(gestion_cook, rand(2,4)*1000);

/* Page Sephi Script */
bonus_class="";
bonus_style="";
lastAAcoolTime=null;
cur_check_all_state = false;
if (gup('sephiScript') == '1') {
    document.getElementById('planetList').innerHTML = document.getElementById('planetList').innerHTML.replace(/page=shipyard/g,'page=shipyard&sephiScript=1');
    bonus_class="selected"
    bonus_style=" background-position:0px 27px;"
    document.getElementById('menuTable').innerHTML = document.getElementById('menuTable').innerHTML.replace('shipyard highlighted','shipyard').replace('menubutton  selected','menubutton');
    
    document.getElementById('planet').style.backgroundImage = 'url(http://www.sephiogame.com/script/cadre_sephi_script_page.png)';
    document.getElementById('header_text').innerHTML = document.getElementById('header_text').innerHTML.replace('Chantier spatial','SephiOGame');
    sephi_frigos_data= '';
    
    //Imp2toulouse- Factorize this part to the get_last_AA_coolTime function
    lastAAcoolTime=get_last_AA_coolTime();
    
    titletext = 'Mes frigos';
    if (importvars["frigos"].length == 1) titletext = 'Mon frigo';
    if (importvars["frigos"].length>1) titletext = 'Mes '+importvars["frigos"].length+' frigos';
    // Les frigos
    sephi_frigos_data+='<div class="header" style=""><h2>'+titletext+'</h2></div>';
    sephi_frigos_data+='<div class="content" style="min-height: 90px;positon:relative;z-index:10;margin-bottom:40px;padding-top:25px;padding-left:30px;">';
    if (lastAAcoolTime != null) sephi_frigos_data+='<p style="color:#A52592;position:relative;top:-10px;margin-bottom:5px;padding-left:20px;">Dernière auto attaque lancé il y a ' + lastAAcoolTime+ '</p>';
    
    sephi_frigos_data+='<span id="spy_all" style="cursor:pointer;color:#6f9fc8;padding-left:20px;position:relative;top:px;">&#9658; <b>Espionner tout mes frigos</b> (ne quittez pas la page avant que tous soient cochés)</span><br><br>';
    sephi_frigos_data+='<span id="rap_gene" style="cursor:pointer;color:#6f9fc8;padding-left:20px;position:relative;top:px;">&#9658; Demander un <b>Rapport Général</b> (patientez ici avant d\'avoir votre rapport)</span><br><br>';
    sephi_frigos_data+='<div style="width:80%;height:1px;background:#404040;position:relative;top:-15px;left:7%;margin-top:20px"></div>';
    
    sephi_frigos_data+='<span id="auto_attack" style="cursor:pointer;color:#6f9fc8;padding-left:20px;">&#9658; Lancer une <b>Auto-Attaque</b> sur mes frigos (laisser faire le script un moment)</span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-2px;padding-left:40px;font-weight:normal;"><input type="checkbox" id="prog_AA" style="position:relative;top:2px;"/> Lancer l\'auto-attaque dans <input type="text" id="time_AA_h" value="1" title="Heures" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;" onfocus="document.getElementById(\'prog_AA\').checked = true;">h<input type="text" id="time_AA_m" value="0" title="Minutes" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;" onfocus="document.getElementById(\'prog_AA\').checked = true;"></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-7px;padding-left:40px;font-weight:normal;"><input type="checkbox" id="repeat_AA" style="position:relative;top:2px;"/> Répéter cette auto-attaque toutes les <input type="text" id="repeat_AA_h" value="6" title="Heures" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;" onfocus="document.getElementById(\'repeat_AA\').checked = true;">h<input type="text" id="repeat_AA_m" value="0" title="Minutes" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;" onfocus="document.getElementById(\'repeat_AA\').checked = true;"></span><br><br>';
    sephi_frigos_data+='<div style="width:80%;height:1px;background:#404040;position:relative;top:-25px;left:7%;margin-top:20px"></div>';
    sephi_frigos_data+='<span style="text-align:left;color:#c0c0c0;position:relative;top:-12px;padding-left:40px;font-weight:normal;">Options spécifiques à cette planète :</span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-12px;padding-left:60px;font-weight:normal;">• Attaquer seulement les frigos dont le butin dépasse : <input type="text" id="butin_AA_RG" value="'+defaut_AA_butin+'" style="text-align:center; width:50px;margin-left:5px;margin-right:5px;height: 15px;"/>  <i><span id="save_AA_butin" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-12px;padding-left:60px;font-weight:normal;">• Démarrer également une expédition : <select id="do_exp_AA" style="position:relative;top:-1px;visibility: visible;color: #000;background-color: #b3c3cb;border: 1px solid #668599;height:18px;"><option value="non">Non</option><option value="50" '+(with_exped == '50' ? 'selected' : '')+'>50 GT (Optimal si le 1er a moins de 100k de points)</option><option value="100" '+(with_exped == '100' ? 'selected' : '')+'>100 GT (Optimal si le 1er a moins de 1M de points)</option><option value="150" '+(with_exped == '150' ? 'selected' : '')+'>150 GT (Optimal si le 1er a moins de 5M de points)</option><option value="200" '+(with_exped == '200' ? 'selected' : '')+'>200 GT (Optimal si le 1er a plus de 5M de points)</option></select> <i><span id="save_AA_do_exp" style="display:none;">(enregistré)</span></i></span><br><br>';
    //Imp2Toulouse- Added an input to specify the number of free slot
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-18px;padding-left:60px;font-weight:normal;"><input type="checkbox" id="leave_slot_AA" style="position:relative;top:2px;" '+leave_slot+'/> Laisser <input type="text" size="1" id="nb_slot_AA" value="'+defaut_AA_nb_slot+'" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;"/> slot(s) de flotte libre <i><span id="save_AA_slot" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-18px;padding-left:60px;font-weight:normal;">Lors d\'une auto-attaque, envoyer : <select id="type_vaisseaux_AA" style="position:relative;top:-1px;visibility: visible;color: #000;background-color: #b3c3cb;border: 1px solid #668599;height:18px;"><option value="1" '+(type_vaisseaux_AA == '1' ? 'selected' : '')+'>Les Petits Transporteurs en prioritée, puis Grands</option><option value="2" '+(type_vaisseaux_AA == '2' ? 'selected' : '')+'>Les Grands Transporteurs en prioritée, puis Petits</option><option value="3" '+(type_vaisseaux_AA == '3' ? 'selected' : '')+'>Des Petits Transporteurs uniquement</option><option value="4" '+(type_vaisseaux_AA == '4' ? 'selected' : '')+'>Des Grands Transporteurs uniquement</option></select></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-18px;padding-left:60px;font-weight:normal;"><input type="checkbox" id="force_AA" style="position:relative;top:2px;" '+forceAA+'/> Envoyer la flotte même si il manque des transporteurs <i><span id="save_AA_force" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<div style="width:80%;height:1px;background:#404040;position:relative;top:-25px;left:7%;margin-top:20px"></div>';
    sephi_frigos_data+='<span style="color:#6f9fc8;padding-left:87px;">Ignorer<span style="width:0px;height:0px;position:relative;top:3px;left:-70px;"><input type="checkbox" title="Tout cocher/décocher" id="check_all"/></span></span><span style="color:#6f9fc8;padding-left:58px;">Nom</span><span style="color:#6f9fc8;padding-left:54px;">Importance</span><span style="color:#6f9fc8;padding-left:90px;">Flotte personalisée <span style="cursor:help;" title="Rendez vous sur la page Flotte pour créer un tag de flotte personalisée.">(?)</span></span><br><br>';
    for (i=0;i<importvars["frigos"].length;i++) {
        if (importvars["frigos"][i].length == 5) {importvars["frigos"][i][5] = '';}
        sephi_frigos_data+='<table style="width:604px;color:#6f9fc8;"><tr><th style="width:70px;text-align:center;position:relative;top:-2px;left:5px;"><span onClick="window.location.href = \'http://'+univers+'/game/index.php?page=galaxy&no_header=1&galaxy='+importvars["frigos"][i][1]+'&system='+importvars["frigos"][i][2]+'&planet='+importvars["frigos"][i][3]+'\'" style="cursor:pointer;" title="Voir dans la galaxie">['+importvars["frigos"][i][1]+':'+importvars["frigos"][i][2]+':'+importvars["frigos"][i][3]+']</span></th>';
        checkouPAS = '';
        if (importvars["frigos"][i][6] == '1') checkouPAS = 'checked';
        sephi_frigos_data+='<th style="width:20px;text-align:left;"><input type="checkbox" style="position:relative;left:5px;" id="frig_ignore_'+i+'" '+checkouPAS+' /></th>';
        sephi_frigos_data+='<th style="width:80px;text-align:left;"><input type="text" style="width: 120px;position:relative;margin-left:30px;left:-10px;" id="frig_name_'+i+'" value="'+importvars["frigos"][i][0]+'" /></th>';
        sephi_frigos_data+='<th style="width:200px;text-align:right;">';
        sephi_frigos_data+='<input type="text" style="width: 30px;position:relative;left:-113px;text-align:center;" id="frig_sondes_'+i+'" title="Importance du frigo" value="'+importvars["frigos"][i][4]+'" />';
        sephi_frigos_data+='<input type="text" style="width: 150px;position:relative;left:-19px;text-align:center;" id="frig_flotte_'+i+'" title="Flotte personalisée" placeholder="Transporteurs uniquement" value="'+importvars["frigos"][i][5]+'" />';
        sephi_frigos_data+='</table>';
        sephi_frigos_data += "\n"+'<div id="del_button_'+i+'" style="height:0px;position:relative;left:-5px;top:-22px;"><img style="cursor:pointer;width:16px;height:auto;" src="http://www.sephiogame.com/script/newsletter-close-button.png" title="Supprimer le frigo"/></div>';
        sephi_frigos_data+='<div style="width:0px;height:0px;position:relative;top: -29px;left: 360px;"><img src="http://www.sephiogame.com/script/icon_spy.png" style="width:30px;height:auto;cursor:pointer;" title="Espionner" id="spy_button_'+i+'"/><img src="http://www.sephiogame.com/script/icon-tick.png" style="position:relative;left:18px;top:-17px;display:none;" id="spy_isok_'+i+'"/></div>';
        
        sephi_frigos_data+='<div style="background:#202020;height:1px;width:80%;margin:auto;margin-top:14px;"></div><br>';
        cur_check_all_state = cur_check_all_state || importvars["frigos"][i][6] == '0';
    }
    if (importvars["frigos"].length == 0) sephi_frigos_data+='<p style="padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;width:500px;">Aucun frigo n\'a été ajouté pour cette planète.<br><br>Pour ajouter un nouveau frigo, vous devez entrer les coordonées du frigo dans le menu flotte puis cliquer sur "Ajouter". Il apparaitra ensuite sur cette page.</p>'
    sephi_frigos_data+='<div class="footer" style="positon:relative;z-index:1;bottom:-30px;"></div></div>';
    sephi_frigos_data+='<div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:-45px;z-index:10;left:70px;"></div></div>'
    
    // Options du script
    sephi_frigos_data+='<div class="header"><h2>Options du script</h2></div>';
    sephi_frigos_data+='<div class="content" style="min-height: 100px;positon:relative;z-index:10;margin-bottom:50px;padding-top:15px;">';
    
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:px;padding-left:40px;font-weight:normal;"><input type="checkbox" id="alarmeONOFF" style="position:relative;top:2px;" '+(readCookie("desactive_alarm", 'all') == 'yes' ? 'checked' : '')+'/> Désactiver l\'alarme lors des attaques <i><span id="save_alarmeONOFF" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:px;padding-left:40px;font-weight:normal;"><input type="checkbox" id="noplaplaChange" style="position:relative;top:2px;" '+(readCookie("noplaplaChange", 'all') == 'oui' ? 'checked' : '')+'/> Désactiver le changement automatique de planètes <i><span id="save_noplaplaChange" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-5px;padding-left:60px;font-weight:normal;font-size:10px;">(Attention certaines fonctionnalités sont indisponibles sans le changement de planète)</span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:px;padding-left:40px;font-weight:normal;">Changement de planète toutes les <input type="input" id="changeTime1" style="position:relative;top:2px;width:30px;text-align:center;" value="'+plapla_change_time1+'"/> à <input type="input" id="changeTime2" style="position:relative;top:2px;width:30px;text-align:center;" value="'+plapla_change_time2+'"/> minutes <i><span id="save_timechange" style="display:none;">(enregistré)</span></i></span><br><br>';
        
    sephi_frigos_data+='<div class="footer" style="positon:relative;z-index:1;bottom:-40px;"></div></div>';
    sephi_frigos_data+='<div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:-35px;z-index:10;left:70px;"></div></div>'
   
    // Repport de bug
    sephi_frigos_data+='<div class="header"><h2>Site officiel du script</h2></div>';
    sephi_frigos_data+='<div class="content" style="min-height: 100px;positon:relative;z-index:10;margin-bottom:50px;padding-top:15px;">';
    sephi_frigos_data+='<table><tr><th><img src="http://www.sephiogame.com/script/Software_Update_icon.png" style="width:100px;height:auto;margin-left:30px;" /></th><th>';
    sephi_frigos_data+='<p style="width:470px;padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">Depuis notre site web vous pouvez apprendre à uiliser le script, et nous repporter les bugs que vous trouvez pour nous aider à améliorer sephiOGame. Nous ferons notre possible pour les corriger dans les futures mises à jour du script :<br><br>'
    sephi_frigos_data+='<span style="cursor:pointer;color:#ff9600;padding-left:10px;" onClick="window.open(\'http://www.sephiogame.com\',\'_blank\');">• Accéder au site de SephiOGame</span>';
    sephi_frigos_data+='<br><br><span style="cursor:pointer;color:#ff9600;padding-left:10px;" onClick="window.open(\'http://www.sephiogame.com/Utilisation\',\'_blank\');">• Apprendre à utiliser le scrript</span>';
    sephi_frigos_data+='<br><br><span style="cursor:pointer;color:#ff9600;padding-left:10px;" onClick="window.open(\'http://www.sephiogame.com/Actualites?curVer='+cur_version+'#Infos\',\'_blank\');">• Vérifier les mises à jour</span>';
    sephi_frigos_data+='<br><br><span style="cursor:pointer;color:#ff9600;padding-left:10px;" onClick="window.open(\'http://www.sephiogame.com/Actualites#reportBug\',\'_blank\');">• Repporter un bug</span>';
    sephi_frigos_data+='</p><br></th></tr></table>';
    sephi_frigos_data+='<div class="footer" style="positon:relative;z-index:1;bottom:-40px;"></div></div>';
    sephi_frigos_data+='<div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:-35px;z-index:10;left:70px;"></div></div>'
    
    //Load the remote javascript
    $(document).ready(function() 
                      {
                          var s = document.createElement("script");
                          s.type = "text/javascript";
                          s.src = "https://apis.google.com/js/client.js?onload=checkAuth";
                          // Use any selector
                          $("head").append(s);
                      });    
    // Alerte
    sephi_frigos_data+='<div class="header"><h2>Alertes sur missions hostiles</h2></div>';
    sephi_frigos_data+='<div class="content" style="min-height: 100px;positon:relative;z-index:10;margin-bottom:50px;padding-top:15px;">';
    sephi_frigos_data+='  <table><tr><th><img src="http://www.sephiogame.com/script/Earth_Alert.png" style="width:100px;height:auto;margin-left:30px;" /></th><th>';
    sephi_frigos_data+='    <p style="width:480px;padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">Le script met à votre disposition un envoi de mail via google, sous condition de lui donner l\'autorisation d\'envoyer des mails pour vous et que vous possediez un compte google.<br> Le script peut alors vous alerter par mail lorsqu\'une mission hostile est en cours. Un mail vous sera envoyé à l\'adresse indiqué toutes les 15 minutes.<br><br><i>Sans autorisation, aucun mail ne sera envoyé. L\'autorisation que vous donnez couvre l\'envoi du mail seulement.</i><br><br></span>';
    sephi_frigos_data+='    <br/><span style="text-align:left;color:#808080;position:relative;top:-12px;padding-left:0px;font-weight:normal;">• Utiliser le mail : <input type="text" style="width: 350px;position:relative;margin-left:30px;" id="alert_mail" value="'+alert_mail+'" /><i><span id="save_alert_mail" style="display:none;"></span></i></span></p></th></tr>';
    sephi_frigos_data+='    <tr><th><div id="authorize-div" style="display: none">';
    sephi_frigos_data+='        <p style="width:480px;padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">Authorize access to Gmail API</p>';
    sephi_frigos_data+='        <!--Button for the user to click to initiate auth sequence -->';
    sephi_frigos_data+='        <span class="factorbutton"><button id="authorize-button" onclick="handleAuthClick(event)">Authorize</button></span>';
    sephi_frigos_data+='    </div>';
    sephi_frigos_data+='    <pre id="output" style="width:480px;padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;"></pre>\n';
    sephi_frigos_data+='    </th></tr></table><br>';
    sephi_frigos_data+='  </th></tr></table>\n';
    sephi_frigos_data+='  <div class="footer" style="positon:relative;z-index:1;bottom:-40px;"></div>';
    sephi_frigos_data+='</div>';
    sephi_frigos_data+='<div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:-35px;z-index:10;left:70px;"></div></div>'
    
    
    // EJECT
    sephi_frigos_data+='<div class="header"><h2>Bouton EJECT</h2></div>';
    sephi_frigos_data+='<div class="content" style="min-height: 100px;positon:relative;z-index:10;margin-bottom:50px;padding-top:15px;">';
    sephi_frigos_data+='<table><tr><th><img src="http://www.sephiogame.com/script/eject_button.png" style="width:100px;height:auto;margin-left:30px;" /></th><th>';
    sephi_frigos_data+='<p style="width:480px;padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">Le script vous permet de faire décoller tout vos vaisseaux civils et vos ressources en un instant, vous devez cependant lui spécifier les coordonnées vers lesquelles vous souhaitez décoller pour pouvoir utiliser cette fonction. (Une mission de transport sera lors lancée vers la planète en question)<br><br><i>Vous pouvez également demander au script de faire décoller automatiquement vos vaisseaux avec vos ressources 5 minutes avant de subir une attaque.</i><br><br>'
    sephi_frigos_data+='<br/><span style="text-align:left;color:#808080;position:relative;top:-12px;padding-left:0px;font-weight:normal;">• Ejecter les vaisseaux civils de cette planète : <select id="auto_eject" style="visibility: visible;"><option value="never" '+(eject_auto == 'never' ? 'selected':'')+'>Jamais</option><option value="5mins" '+(eject_auto == '5mins' ? 'selected':'')+'>5 minutes avant l\'attaque ennemie</option><option value="10mins" '+(eject_auto == '10mins' ? 'selected':'')+'>10 minutes avant l\'attaque ennemie</option><option value="20mins" '+(eject_auto == '20mins' ? 'selected':'')+'>20 minutes avant l\'attaque ennemie</option></select></span>';
    sephi_frigos_data+='<br/><span style="text-align:left;color:#808080;position:relative;top:-12px;padding-left:0px;font-weight:normal;"><input '+(eject_all ? 'checked' : '')+' type="checkbox" id="eject_all" style="position:relative;top:2px;"/> Ejecter également les vaisseaux de combat</span><br>';
    
    sephi_frigos_data+='<table style="width:507px;color:#6f9fc8;"><tr><th style="width:700px;text-align:left;"><input type="text" style="width: 65px;position:relative;margin-left:30px;text-align:center;" value="'+eject_gal+'" title="Galaxie" id="eject_galaxy" onclick="if (this.value == \'Galaxie\') this.value=\'\';"/><input type="text" style="width: 65px;position:relative;margin-left:5px;text-align:center;" value="'+eject_sys+'" title="Système" id="eject_system" onclick="if (this.value == \'Système\') this.value=\'\';"/><input type="text" style="width: 65px;position:relative;margin-left:5px;text-align:center;" value="'+eject_pla+'" title="Planète" id="eject_planet" onclick="if (this.value == \'Planète\') this.value=\'\';"/> <span style="position:relative;left:20px"><input type="checkbox" id="ejectLune" title="Si vous cochez cette case, l\'ejecion se fera sur la lune des coordonées demandées." style="position:relative;top:2px;" '+(eject_onLune?'checked':'')+'/> Lune</span></th>';
    sephi_frigos_data+='<th style="width:300px;text-align:right;position:relative;left:-20px;top:0px;">';
            sephi_frigos_data+='<span class="factorbutton"><input class="btn_blue" id="eject_save_button" style="" type="button" value="Enregistrer"></span>';
            sephi_frigos_data+='</th></table><br></th></tr></table>';
    sephi_frigos_data+='<div class="footer" style="positon:relative;z-index:1;bottom:-40px;"></div></div>';
    sephi_frigos_data+='<div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:-35px;z-index:10;left:70px;"></div></div>'
    
    
    // Sauvegarde
    sephi_frigos_data+='<div class="header"><h2>Gestion des données</h2></div>';
    sephi_frigos_data+='<div class="content" style="min-height: 100px;positon:relative;z-index:10;margin-bottom:50px;padding-top:15px;">';
    sephi_frigos_data+='<table style="width:95%;positon:relative;z-index:2;"><tr style="vertical-align:top;"><th style="width:70%"><p style="padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">Vos données relatives au script sont enregistrées <b>uniquement grâce à votre navigateur internet</b>. Si vous souhaitez pouvoir les retrouver à tout moment, vous pouvez <b>les enregistrer</b> grâce à cette page.<br><br>'
    sephi_frigos_data+='Ainsi si vos données sont perdues, si vous souhaitez changer d\'ordinateur ou de navigateur, ou bien passer vos frigos à un ami, il vous suffit de cliquer sur le bouton \'\'Sauvegarder\'\' pour obtenir un fichier stockant les données de votre planète. Et plus tard de cliquer sur le bouton \'\'Restaurer\'\' pour rétablir le fichier.<br/><br/><br>En cas de disfonctionnement du script sur cette planète, vous pouvez également reinitialiser vos données de cette planète pour tenter de résoudre le problème.<br><br>';
        sephi_frigos_data+='</p></th><th style="width:20%;text-align:right;">'
        sephi_frigos_data+='<span class="factorbutton"><input id="save_button" class="btn_blue" style="position:relative;top:10px;" type="button" value="Sauvegarder"></span><br><br>'
        sephi_frigos_data+='<span class="factorbutton"><input id="load_button" class="btn_blue" style="position:relative;top:10px;" type="button" value="Restaurer"></span><br><br>'  
        sephi_frigos_data+='<span class="factorbutton"><input id="init_button" class="btn_blue" style="position:relative;top:70px;" type="button" value="Réinitialiser"></span>'             
    sephi_frigos_data+='</tr></table>';
    sephi_frigos_data+='<input type="file" id="fileupload" name="file" style="display:none"/>';
    sephi_frigos_data+='<div class="footer" style="positon:relative;z-index:1;bottom:-40px;"></div></div>';
    sephi_frigos_data+='<div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:-40px;z-index:10;left:70px;"></div></div>'
    sephi_frigos_data+='<div style="width:0px;height:0px;"><div id="barre_save" style="width:500px;height:1px;background:#202020;position:relative;top:-120px;z-index:10;left:70px;"></div></div>'
    document.getElementById('buttonz').innerHTML = sephi_frigos_data;
    
    
    // Lancement Auto-Attaque
    document.getElementById('spy_all').onclick = launch_spy;
    document.getElementById('rap_gene').onclick = launch_spy;
    document.getElementById('auto_attack').onclick = launch_spy;
    
    // Modifications sur les frigos
    for (i=0;i<importvars["frigos"].length;i++) {
        document.getElementById('frig_ignore_'+i).onclick = edit_frigo;
        document.getElementById('frig_name_'+i).onchange = edit_frigo;
        document.getElementById('frig_sondes_'+i).onchange = edit_frigo;
        document.getElementById('frig_flotte_'+i).onchange = edit_frigo;
        document.getElementById('del_button_'+i).onclick = delete_frigo;
        document.getElementById('spy_button_'+i).onclick = launch_spy;
    }
    
    // Block Ejection
    document.getElementById('eject_save_button').onclick = function () {
        eject_data = document.getElementById('eject_galaxy').value+':';
        eject_data += document.getElementById('eject_system').value+':';
        eject_data += document.getElementById('eject_planet').value+':';

        if (document.getElementById('auto_eject').value == 'never') eject_data += 'never:';
        if (document.getElementById('auto_eject').value == '5mins') eject_data += '5mins:';
        if (document.getElementById('auto_eject').value == '10mins') eject_data += '10mins:';
        if (document.getElementById('auto_eject').value == '20mins') eject_data += '20mins:';
        
        if (document.getElementById('eject_all').checked) eject_data += 'ALL:';
        
        if (document.getElementById('ejectLune').checked) eject_data += 'OnLune';

        createCookie('isDead', 'n', 1, 'eject');
        importvars["eject"] = eject_data;
        save_important_vars();
        
        blit_message("Données pour l'ejection enregistrées");
        window.location.href += ''; 
    }
    
    // Block Sauvegarde
    document.getElementById('save_button').onclick = save_important_vars_in_cloud;
    document.getElementById('load_button').onclick = function () {
        $('#fileupload').click();    
    };
    document.getElementById('fileupload').onchange = load_important_vars_in_cloud;
    document.getElementById('init_button').onclick = init_vars;
    
    
    // Block alerte
    //document.getElementById('alert_mail_button').onclick = save_alert_mail;
    document.getElementById('alert_mail').onblur = function() {
        document.getElementById('save_alert_mail').innerHTML = save_alert_mail();
        document.getElementById('save_alert_mail').style.display = 'inline';
        setTimeout(function () {document.getElementById('save_alert_mail').style.display = 'none';},1000);        
    }
    //document.getElementById('maj_button').onclick = verif_maj;
    

    // Paramètres AA
    document.getElementById('leave_slot_AA').onclick = function () {
        if (this.checked) createCookie('AA_leave_slot', 'oui', 1, 'AA');
        else createCookie('AA_leave_slot', 'non', 1, 'AA');
        document.getElementById('save_AA_slot').style.display = 'inline';
        setTimeout(function () {document.getElementById('save_AA_slot').style.display = 'none';},1000);
    };
    //Imp2Toulouse- request to save the free slot number wished
    document.getElementById('nb_slot_AA').onchange = function () {
        createCookie('AA_nb_slot', document.getElementById('nb_slot_AA').value.match(/\d/g).join(""), 1, 'AA');
        document.getElementById('save_AA_slot').style.display = 'inline';
        setTimeout(function () {document.getElementById('save_AA_slot').style.display = 'none';},1000);
    };
    ///////
    document.getElementById('type_vaisseaux_AA').onclick = function () {
        createCookie('type_vaisseaux', this.value, 1, 'AA');
    };
    document.getElementById('force_AA').onclick = function () {
        if (this.checked) createCookie('force', 'oui', 1, 'AA');
        else createCookie('force', 'non', 1, 'AA');
        document.getElementById('save_AA_force').style.display = 'inline';
        setTimeout(function () {document.getElementById('save_AA_force').style.display = 'none';},1000);
    };
    document.getElementById('butin_AA_RG').onchange = function (){
        createCookie('AA_butin', document.getElementById('butin_AA_RG').value.match(/\d/g).join(""), 1, 'AA');
        document.getElementById('save_AA_butin').style.display = 'inline';
        setTimeout(function () {document.getElementById('save_AA_butin').style.display = 'none';},1000);
    };
    document.getElementById('do_exp_AA').onchange = function () {
        with_exped = document.getElementById('do_exp_AA').value;
        createCookie('with_exped', document.getElementById('do_exp_AA').value, 1, 'AA');
    }
    
    // Options script
    document.getElementById('alarmeONOFF').onclick = function () {
        if (this.checked) createCookie('desactive_alarm', 'yes', 1, 'all');
        else createCookie('desactive_alarm', 'no', 1, 'all');
        document.getElementById('save_alarmeONOFF').style.display = 'inline';
        setTimeout(function () {document.getElementById('save_alarmeONOFF').style.display = 'none';},1000);
    };
    document.getElementById('noplaplaChange').onclick = function () {
        if (this.checked) createCookie('noplaplaChange', 'oui', 1, 'all');
        else createCookie('noplaplaChange', 'non', 1, 'all');
        document.getElementById('save_noplaplaChange').style.display = 'inline';
        setTimeout(function () {document.getElementById('save_noplaplaChange').style.display = 'none';},1000);
    };
     document.getElementById('changeTime1').onchange = function () {
         if (parseInt(this.value) > 1) {
            createCookie('plapla_change_time1', this.value, 1, 'all');
            document.getElementById('save_timechange').style.display = 'inline';
            setTimeout(function () {document.getElementById('save_timechange').style.display = 'none';},1000);
         }
    };
    document.getElementById('changeTime2').onchange = function () {
         if (parseInt(this.value) > 1) {
            createCookie('plapla_change_time2', this.value, 1, 'all');
            document.getElementById('save_timechange').style.display = 'inline';
            setTimeout(function () {document.getElementById('save_timechange').style.display = 'none';},1000);
         }
    };
    if (!cur_check_all_state) document.getElementById("check_all").checked = true;
    document.getElementById("check_all").onclick = function () {
        for (i=0;i<importvars["frigos"].length;i++) {
            document.getElementById("frig_ignore_"+i).checked = cur_check_all_state;
            importvars["frigos"][i][6] = cur_check_all_state ? '1' : '0';
        }
        cur_check_all_state = !cur_check_all_state;
        save_important_vars();
        blit_message_time('Modifications <span style="float: none;margin: 0;color:#109E18">enregistrées avec succès</span> !',1000);
        document.getElementById('save_changes').style.color='#109E18';
    };
    
    
    //Start AA
    if (gup('startAA') == '1') setTimeout(function(){$('#auto_attack').click();}, 1000);
}
document.getElementById('menuTable').innerHTML = '<li style="height:0px;position: relative;top: -31px;"><span class="menu_icon"><div class="menuImage shipyard" style="background:url(http://www.sephiogame.com/script/sephi_script_logo.png);background-position-x:0px;'+bonus_style+'"></div></span><a class="menubutton '+bonus_class+'" href="http://'+univers+'/game/index.php?page=shipyard&sephiScript=1" target="_self"><span class="textlabel">SephiOGame</span></a></li>'+document.getElementById('menuTable').innerHTML;
document.getElementById('links').style.overflow = "visible";

// Page actualité
lastActu = readCookie('lastActuTime', 'all');
lastActuSecu = readCookie('lastActuTimeSecu', 'all');
if (lastActuSecu == null) {
    createCookie('lastActuTimeSecu', time(), 1, 'all');
    lastActuSecu = time();
}
if (lastActu !== null) {
    lastActu = time() - parseInt(lastActu);
    lastActuSecu = time() - parseInt(lastActuSecu);
    if (lastActu > 10*60*60*1000 && lastActuSecu>10*60*1000) {
        document.body.onclick = function(){
            createCookie('lastActuTimeSecu', time(), 1, 'all');
            document.getElementById('menuTable').innerHTML += '<form id="actuSephiOgame" action="http://www.sephiogame.com/Actualites?curVer='+cur_version+'&serv='+univers+'#Infos" style="display:none" target="_blank" method="post"><input type="submit" id="submitpopup"></form>';
            
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, true, false, false, false, 0, null);
            document.getElementById('submitpopup').dispatchEvent(evt);
            document.body.onclick = null;
            window.focus();
            setTimeout(function(){window.focus();},1000);
        }
    }
} else {
    createCookie('lastActuTime', time(), 1, 'all');
}

// Affiche les frigos sur la page galaxie et ajouter un bouton "ajouter aux frigos"
last_gal_state="";
function check_galaxy_frigs() {
    cur_gal_state = document.getElementById('galaxyLoading').style.display;
    if (cur_gal_state != last_gal_state) {
        last_gal_state = cur_gal_state;
        if (cur_gal_state == "none")  {
            gal_data = $('#galaxytable').html().split('<tr class="row');
            GAL_check_cur_gal = parseInt(document.getElementById('galaxy_input').value);
            GAL_check_cur_sys = parseInt(document.getElementById('system_input').value);
            for (i=0;i<importvars["frigos"].length;i++) {
                if (importvars["frigos"][i][1] == GAL_check_cur_gal && importvars["frigos"][i][2] == GAL_check_cur_sys) {
                    GAL_check_plapla = parseInt(importvars["frigos"][i][3].match(/\d/g).join(""));
                    gal_data[GAL_check_plapla] = gal_data[GAL_check_plapla].replace('<td class="planetname', '<td style="color:#A52592;font-weight:bold;" class="planetname');
                    gal_data[GAL_check_plapla] = gal_data[GAL_check_plapla].replace('<span class="status">(', '<span class="status">(<span style="color:#A52592;font-weight:bold;" title="Ce joueur est un frigo">F</span> ');
                    
                }
            }
            $('#galaxytable').html(gal_data.join('<tr class="row'));
            for (i=1;i<15;i++) {
                if (!gal_data[i].match("frigo")) {
                    b = document.getElementById('planet'+i);
                    if (b !== null) {
                        b.getElementsByClassName('ListLinks')[0].innerHTML += "<li><a href=\"javascript:void(0);\" onclick=\"localStorage.setItem('all_add_racc', '"+(i)+"');setTimeout(function() {$('#showbutton').click();},500);this.onclick=null;\" style=\"cursor:pointer;color:#A52592;font-weight:bold\">Ajouter aux frigos</a></li>";
                        b.getElementsByClassName('ListLinks')[0].innerHTML += '<input type="hidden" id="raccourcis_name_sep'+(i)+'" value="'+b.getElementsByClassName('textNormal')[0].innerHTML+'">';
                        b.getElementsByClassName('ListLinks')[0].innerHTML += '<input type="hidden" id="galaxy'+(i)+'" value="'+b.getElementsByClassName('ListImage')[0].innerHTML.split('[')[1].split(':')[0]+'">';
                        b.getElementsByClassName('ListLinks')[0].innerHTML += '<input type="hidden" id="system'+(i)+'" value="'+b.getElementsByClassName('ListImage')[0].innerHTML.split('[')[1].split(':')[1]+'">';
                        b.getElementsByClassName('ListLinks')[0].innerHTML += '<input type="hidden" id="position'+(i)+'" value="'+b.getElementsByClassName('ListImage')[0].innerHTML.split('[')[1].split(']')[0].split(':')[2]+'">';
                    }
                }
            }
            for (i=1;i<15;i++) {
                b = document.getElementById('debris'+i);
                if (b !== null && b.innerHTML.match("Pour pouvoir utiliser les liens direct")) {
                    recly_needed = parseInt(b.getElementsByClassName('debris-recyclers')[0].innerHTML.match(/\d/g).join(""));
                    abalise = b.getElementsByTagName('a')[0];
                    if(abalise.onclick !== null) {
                        abalise.href = 'http://'+univers+'/game/index.php?page=fleet1&galaxy='+GAL_check_cur_gal+'&system='+GAL_check_cur_sys+'&position='+i+'&type=1&mission=8&setRecy='+recly_needed;
                        abalise.onclick=null;
                    }
                }
            }
        }
    }
}
if (gup('page') == "galaxy") setInterval(check_galaxy_frigs,100);

// Fonction d'activation du pack
if (enable_quick_pack) {
    document.getElementById('startquickpack').onclick= function() {
        if (!cur_planetIsLune) {
            dataPack = '';
            dataPack += 'yes_Ar2_no_Ar2_75_Ar2_30_Ar2_0_Ar2_resources_Ar2_1_Ar2_4_Ar2__Ar2__Ar2_Centrale_esp_électrique_esp_solaire_Ar2_';                                          // Centrale Solaire 1
            dataPack += '\n'+'yes_Ar2_no_Ar2_60_Ar2_15_Ar2_0_Ar2_resources_Ar2_1_Ar2_1_Ar2__Ar2__Ar2_Mine_esp_de_esp_métal_Ar2_';                                                   // Mine de métal 1
            dataPack += '\n'+'yes_Ar2_no_Ar2_90_Ar2_22_Ar2_0_Ar2_resources_Ar2_1_Ar2_1_Ar2__Ar2__Ar2_Mine_esp_de_esp_métal_Ar2_';                                                   // Mine de métal 2
            dataPack += '\n'+'yes_Ar2_no_Ar2_112_Ar2_45_Ar2_0_Ar2_resources_Ar2_1_Ar2_4_Ar2__Ar2__Ar2_Centrale_esp_électrique_esp_solaire_Ar2_';                                    // Centrale Solaire 2
            dataPack += '\n'+'yes_Ar2_no_Ar2_135_Ar2_33_Ar2_0_Ar2_resources_Ar2_1_Ar2_1_Ar2__Ar2__Ar2_Mine_esp_de_esp_métal_Ar2_';                                                  // Mine de métal 3
            dataPack += '\n'+'yes_Ar2_no_Ar2_202_Ar2_50_Ar2_0_Ar2_resources_Ar2_1_Ar2_1_Ar2__Ar2__Ar2_Mine_esp_de_esp_métal_Ar2_';                                                  // Mine de métal 4
            dataPack += '\n'+'yes_Ar2_no_Ar2_168_Ar2_67_Ar2_0_Ar2_resources_Ar2_1_Ar2_4_Ar2__Ar2__Ar2_Centrale_esp_électrique_esp_solaire_Ar2_';                                    // Centrale Solaire 3
            dataPack += '\n'+'yes_Ar2_no_Ar2_48_Ar2_24_Ar2_0_Ar2_resources_Ar2_1_Ar2_2_Ar2__Ar2__Ar2_Mine_esp_de_esp_cristal_Ar2_';                                                 // Mine de cristal 1
            dataPack += '\n'+'yes_Ar2_no_Ar2_253_Ar2_101_Ar2_0_Ar2_resources_Ar2_1_Ar2_4_Ar2__Ar2__Ar2_Centrale_esp_électrique_esp_solaire_Ar2_';                                   // Centrale Solaire 4
            dataPack += '\n'+'yes_Ar2_no_Ar2_303_Ar2_75_Ar2_0_Ar2_resources_Ar2_1_Ar2_1_Ar2__Ar2__Ar2_Mine_esp_de_esp_métal_Ar2_';                                                  // Mine de métal 5
            dataPack += '\n'+'yes_Ar2_no_Ar2_76_Ar2_38_Ar2_0_Ar2_resources_Ar2_1_Ar2_2_Ar2__Ar2__Ar2_Mine_esp_de_esp_cristal_Ar2_';                                                 // Mine de cristal 2
            dataPack += '\n'+'yes_Ar2_no_Ar2_122_Ar2_61_Ar2_0_Ar2_resources_Ar2_1_Ar2_2_Ar2__Ar2__Ar2_Mine_esp_de_esp_cristal_Ar2_';                                                // Mine de cristal 3
            dataPack += '\n'+'yes_Ar2_no_Ar2_379_Ar2_151_Ar2_0_Ar2_resources_Ar2_1_Ar2_4_Ar2__Ar2__Ar2_Centrale_esp_électrique_esp_solaire_Ar2_';                                   // Centrale Solaire 5
            dataPack += '\n'+'yes_Ar2_no_Ar2_225_Ar2_75_Ar2_0_Ar2_resources_Ar2_1_Ar2_3_Ar2__Ar2__Ar2_Synthétiseur_esp_de_esp_deutérium_Ar2_';                                      // Synthétiseur de Deut 1
            dataPack += '\n'+'yes_Ar2_no_Ar2_196_Ar2_98_Ar2_0_Ar2_resources_Ar2_1_Ar2_2_Ar2__Ar2__Ar2_Mine_esp_de_esp_cristal_Ar2_';                                                // Mine de cristal 4
            dataPack += '\n'+'yes_Ar2_no_Ar2_569_Ar2_227_Ar2_0_Ar2_resources_Ar2_1_Ar2_4_Ar2__Ar2__Ar2_Centrale_esp_électrique_esp_solaire_Ar2_';                                   // Centrale Solaire 6
            dataPack += '\n'+'yes_Ar2_no_Ar2_455_Ar2_113_Ar2_0_Ar2_resources_Ar2_1_Ar2_1_Ar2__Ar2__Ar2_Mine_esp_de_esp_métal_Ar2_';                                                 // Mine de métal 6
            dataPack += '\n'+'yes_Ar2_no_Ar2_683_Ar2_170_Ar2_0_Ar2_resources_Ar2_1_Ar2_1_Ar2__Ar2__Ar2_Mine_esp_de_esp_métal_Ar2_';                                                 // Mine de métal 7
            dataPack += '\n'+'yes_Ar2_no_Ar2_854_Ar2_341_Ar2_0_Ar2_resources_Ar2_1_Ar2_4_Ar2__Ar2__Ar2_Centrale_esp_électrique_esp_solaire_Ar2_';                                   // Centrale Solaire 7
            dataPack += '\n'+'yes_Ar2_no_Ar2_314_Ar2_157_Ar2_0_Ar2_resources_Ar2_1_Ar2_2_Ar2__Ar2__Ar2_Mine_esp_de_esp_cristal_Ar2_';                                               // Mine de cristal 5
            dataPack += '\n'+'yes_Ar2_no_Ar2_337_Ar2_112_Ar2_0_Ar2_resources_Ar2_1_Ar2_3_Ar2__Ar2__Ar2_Synthétiseur_esp_de_esp_deutérium_Ar2_';                                     // Synthétiseur de Deut 2
            dataPack += '\n'+'yes_Ar2_no_Ar2_1281_Ar2_512_Ar2_0_Ar2_resources_Ar2_1_Ar2_4_Ar2__Ar2__Ar2_Centrale_esp_électrique_esp_solaire_Ar2_';                                  // Centrale Solaire 8
            dataPack += '\n'+'yes_Ar2_no_Ar2_506_Ar2_168_Ar2_0_Ar2_resources_Ar2_1_Ar2_3_Ar2__Ar2__Ar2_Synthétiseur_esp_de_esp_deutérium_Ar2_';                                     // Synthétiseur de Deut 3
            dataPack += '\n'+'yes_Ar2_no_Ar2_759_Ar2_253_Ar2_0_Ar2_resources_Ar2_1_Ar2_3_Ar2__Ar2__Ar2_Synthétiseur_esp_de_esp_deutérium_Ar2_';                                     // Synthétiseur de Deut 4
            dataPack += '\n'+'yes_Ar2_no_Ar2_1922_Ar2_768_Ar2_0_Ar2_resources_Ar2_1_Ar2_4_Ar2__Ar2__Ar2_Centrale_esp_électrique_esp_solaire_Ar2_';                                  // Centrale Solaire 9
            dataPack += '\n'+'yes_Ar2_no_Ar2_1139_Ar2_379_Ar2_0_Ar2_resources_Ar2_1_Ar2_3_Ar2__Ar2__Ar2_Synthétiseur_esp_de_esp_deutérium_Ar2_';                                    // Synthétiseur de Deut 5
            dataPack += '\n'+'yes_Ar2_no_Ar2_400_Ar2_120_Ar2_200_Ar2_station_Ar2_1_Ar2_14_Ar2__Ar2__Ar2_Usine_esp_de_esp_robots_Ar2_';                                              // Usine de robots 1
            dataPack += '\n'+'yes_Ar2_no_Ar2_800_Ar2_240_Ar2_200_Ar2_station_Ar2_1_Ar2_14_Ar2__Ar2__Ar2_Usine_esp_de_esp_robots_Ar2_';                                              // Usine de robots 2
            if (nb_planet == 1) dataPack += '\n'+'yes_Ar2_no_Ar2_200_Ar2_400_Ar2_200_Ar2_station_Ar2_1_Ar2_31_Ar2__Ar2__Ar2_Laboratoire_esp_de_esp_recherche_Ar2_';                 // Labo 1
            if (nb_planet == 1) dataPack += '\n'+'yes_Ar2_no_Ar2_0_Ar2_800_Ar2_400_Ar2_research_Ar2_1_Ar2_113_Ar2__Ar2__Ar2_Technologie_esp_énergétique_Ar2_';                      // Techno Energie 1
            dataPack += '\n'+'yes_Ar2_no_Ar2_503_Ar2_251_Ar2_0_Ar2_resources_Ar2_1_Ar2_2_Ar2__Ar2__Ar2_Mine_esp_de_esp_cristal_Ar2_';                                               // Mine de cristal 6
            dataPack += '\n'+'yes_Ar2_no_Ar2_400_Ar2_200_Ar2_100_Ar2_station_Ar2_1_Ar2_21_Ar2__Ar2__Ar2_Chantier_esp_spatial_Ar2_';                                                 // Chantier Spatial 1
            dataPack += '\n'+'yes_Ar2_no_Ar2_2883_Ar2_1153_Ar2_0_Ar2_resources_Ar2_1_Ar2_4_Ar2__Ar2__Ar2_Centrale_esp_électrique_esp_solaire_Ar2_';                                 // Centrale Solaire 10
            if (nb_planet == 1) dataPack += '\n'+'yes_Ar2_no_Ar2_400_Ar2_0_Ar2_600_Ar2_research_Ar2_1_Ar2_115_Ar2__Ar2__Ar2_Réacteur_esp_à_esp_combustion_Ar2_';                    // Reacteur Combustion 1
            dataPack += '\n'+'yes_Ar2_no_Ar2_1708_Ar2_569_Ar2_0_Ar2_resources_Ar2_1_Ar2_3_Ar2__Ar2__Ar2_Synthétiseur_esp_de_esp_deutérium_Ar2_';                                    // Synthétiseur de Deut 6
            dataPack += '\n'+'yes_Ar2_no_Ar2_1025_Ar2_256_Ar2_0_Ar2_resources_Ar2_1_Ar2_1_Ar2__Ar2__Ar2_Mine_esp_de_esp_métal_Ar2_';                                                // Mine de métal 8
            if (nb_planet == 1) dataPack += '\n'+'yes_Ar2_no_Ar2_400_Ar2_800_Ar2_200_Ar2_station_Ar2_1_Ar2_31_Ar2__Ar2__Ar2_Laboratoire_esp_de_esp_recherche_Ar2_';                 // Labo 2
            if (nb_planet == 1) dataPack += '\n'+'yes_Ar2_no_Ar2_400_Ar2_0_Ar2_600_Ar2_research_Ar2_1_Ar2_115_Ar2__Ar2__Ar2_Réacteur_esp_à_esp_combustion_Ar2_';                    // Reacteur Combustion 2
            dataPack += '\n'+'yes_Ar2_no_Ar2_800_Ar2_400_Ar2_200_Ar2_station_Ar2_1_Ar2_21_Ar2__Ar2__Ar2_Chantier_esp_spatial_Ar2_';                                                 // Chantier Spatial 2
            dataPack += '\n'+'yes_Ar2_no_Ar2_2000_Ar2_2000_Ar2_0_Ar2_shipyard_Ar2_1_Ar2_202_Ar2_1_Ar2_1_Ar2_Petit_esp_transporteur_Ar2_';                                           // PT
            dataPack += '\n'+'yes_Ar2_no_Ar2_4324_Ar2_1729_Ar2_0_Ar2_resources_Ar2_1_Ar2_4_Ar2__Ar2__Ar2_Centrale_esp_électrique_esp_solaire_Ar2_';                                 // Centrale Solaire 11
            dataPack += '\n'+'yes_Ar2_no_Ar2_805_Ar2_402_Ar2_0_Ar2_resources_Ar2_1_Ar2_2_Ar2__Ar2__Ar2_Mine_esp_de_esp_cristal_Ar2_';                                               // Mine de cristal 7
            dataPack += '\n'+'yes_Ar2_no_Ar2_1537_Ar2_384_Ar2_0_Ar2_resources_Ar2_1_Ar2_1_Ar2__Ar2__Ar2_Mine_esp_de_esp_métal_Ar2_';                                                // Mine de métal 9
            if (nb_planet == 1) dataPack += '\n'+'yes_Ar2_no_Ar2_800_Ar2_1600_Ar2_200_Ar2_station_Ar2_1_Ar2_31_Ar2__Ar2__Ar2_Laboratoire_esp_de_esp_recherche_Ar2_';                // Labo 3
            dataPack += '\n'+'yes_Ar2_no_Ar2_1600_Ar2_800_Ar2_400_Ar2_station_Ar2_1_Ar2_21_Ar2__Ar2__Ar2_Chantier_esp_spatial_Ar2_';                                                // Chantier Spatial 3
            if (nb_planet == 1) dataPack += '\n'+'yes_Ar2_no_Ar2_200_Ar2_1000_Ar2_200_Ar2_research_Ar2_1_Ar2_106_Ar2__Ar2__Ar2_Technologie_esp_Espionnage_Ar2_';                    // Techno Espionnage 1
            if (nb_planet == 1) dataPack += '\n'+'yes_Ar2_no_Ar2_1600_Ar2_0_Ar2_2400_Ar2_research_Ar2_1_Ar2_115_Ar2__Ar2__Ar2_Réacteur_esp_à_esp_combustion_Ar2_';                  // Reacteur Combustion 3
            if (nb_planet == 1) dataPack += '\n'+'yes_Ar2_no_Ar2_400_Ar2_2000_Ar2_400_Ar2_research_Ar2_1_Ar2_106_Ar2__Ar2__Ar2_Technologie_esp_Espionnage_Ar2_';                    // Techno Espionnage 1
            dataPack += '\n'+'yes_Ar2_no_Ar2_0_Ar2_1000_Ar2_0_Ar2_shipyard_Ar2_1_Ar2_210_Ar2_1_Ar2_1_Ar2_Sonde_esp_d`espionnage_Ar2_';                                              // Sonde
            dataPack += '\n';
        } else {
            dataPack = '';
            dataPack += 'yes_Ar2_no_Ar2_20000_Ar2_40000_Ar2_20000_Ar2_station_Ar2_1_Ar2_41_Ar2__Ar2__Ar2_Base_esp_lunaire_Ar2_';                                                     // Base Lunaire 1
            dataPack += '\n'+'yes_Ar2_no_Ar2_400_Ar2_120_Ar2_200_Ar2_station_Ar2_1_Ar2_14_Ar2__Ar2__Ar2_Usine_esp_de_esp_robots_Ar2_';                                              // Usine de robots 1
            dataPack += '\n'+'yes_Ar2_no_Ar2_800_Ar2_240_Ar2_200_Ar2_station_Ar2_1_Ar2_14_Ar2__Ar2__Ar2_Usine_esp_de_esp_robots_Ar2_';                                              // Usine de robots 2
            dataPack += '\n'+'yes_Ar2_no_Ar2_40000_Ar2_80000_Ar2_40000_Ar2_station_Ar2_1_Ar2_41_Ar2__Ar2__Ar2_Base_esp_lunaire_Ar2_';                                                // Base Lunaire 2
            dataPack += '\n'+'yes_Ar2_no_Ar2_1600_Ar2_480_Ar2_400_Ar2_station_Ar2_1_Ar2_14_Ar2__Ar2__Ar2_Usine_esp_de_esp_robots_Ar2_';                                             // Usine de robots 3
            dataPack += '\n'+'yes_Ar2_no_Ar2_80000_Ar2_160000_Ar2_80000_Ar2_station_Ar2_1_Ar2_41_Ar2__Ar2__Ar2_Base_esp_lunaire_Ar2_';                                               // Base Lunaire 3
            dataPack += '\n'+'yes_Ar2_no_Ar2_20000_Ar2_40000_Ar2_20000_Ar2_station_Ar2_1_Ar2_42_Ar2__Ar2__Ar2_Phalange_esp_de_esp_capteur_Ar2_';                                     // Phalange de capteur 1  
            dataPack += '\n'; 
        }
        
        curd = make_important_vars_data();
        curd = curd.split('/_/_/');
        curd[0] = dataPack;
        newd = curd.join('/_/_/');
        
        save_important_vars(newd);
        location.href = location.href;
    };
}

// Initialisations chiantes
for (u_u = 0 ; u_u<importvars["listPrev"].length; u_u++) {prev_possitions[u_u] = (u_u+decal_special)*27;}

// Auto Active Rapport Complet
if (gup("page") == "preferences" && gup("autoRapComp") == 1) {
    document.getElementById('prefs').innerHTML += '<input type="checkbox" name="fullSpioReport" checked>';
    document.getElementById('prefs').submit();
}


if (rand(1,150) == 1) blit_message("Pensez à cliquer sur les pubs de sephiogame.com pour nous soutenir :)");
if (rand(1,150) == 1) blit_message("Partagez notre page facebook à vos amis ;)");

clearTimeout(antiBugTimeout);
