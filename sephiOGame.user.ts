// ==UserScript==
// @name        SephiOGame
// @namespace   http://www.sephiogame.com
// @version     3.7.8
// @description Script Ogame
// @author      Sephizack
//
// @exclude     /^(http|https)://s.*\.ogame\.gameforge\.com/feed/.*$/
// @exclude     /^(http|https)://s.*\.ogame\.gameforge\.com/board/.*$/
// @exclude     /^(http|https)://www\.sephiogame\.com/.*$/
// @exclude     /^(http|https)://www.*$/
// @exclude     /^(http|https)://.*ajax=1.*$/
// @include     /^(http|https)://s.*\.ogame\.gameforge\.com/game/index.php.*$/
// @include     /^(http|https)://fr\.ogame\.gameforge\.com/$/
//
// @copyright   2012+, You
// @updateURL   http://www.sephiogame.com/script/sephiOGame.user.js
// @require     http://code.jquery.com/jquery-1.9.1.min.js
// @grant       GM_xmlhttpRequest
// @connect     sephiogame.com
// ==/UserScript==
//
//History Version
//3.6.0: Sephizack-      Initial version [PROD]
//3.6.1: Imp2Toulouse-   *Add capability to set the leave slot
//       Imp2Toulouse-   *Bugs/malwritten correction
//3.6.2: Imp2Toulouse-   *Optimization code in check frigo
//                       *Optimization code for the pack detection (factorize via a get_button_information function)
//                           [En cours] Dans le cas d'une lune avec le pack, sur la page d'installation j'ai 2 erreurs: 
//                           - Uncaught TypeError: events[i].getElementsByClassName is not a function 
//                           xhr.onreadystatechange @ VM219314:1462 
//                           - Cannot read property 'join' of null(anonymous function) 
//                           TypeError: Cannot read property 'join' of null @ VM219314:2288 
//                       *Antigame compatibility: Detect evolution of ressources or station (moon or planet)
//                       *Correction ejection by using existant functions and compatibility with antigame
//                       *Add last_start in storage in case of first generated rapport using own message results
//                       *Active "Boite de Réception" and "Corbeille" tabs
//3.6.3: Imp2Toulouse-   *Google API integration and restricted usage of send mail feature.
//                       *Add email configuration in sephiOGame page
//                       *Correction about detection of destFleet on ejection
//                       *Add the direct retirement of a frigo in Galaxy and message menu
//3.6.3.1: Imp2Toulouse- *Compatibility correction
//3.6.3.2: Imp2Toulouse- *Integration of Ogame version 6.0.5
//                       *Review all frigo integration (from messages)
//3.6.3.2: Imp2Toulouse- *Review all Auto Attack processus
//                       *Review the Expedition send
//3.6.3.4: Imp2Toulouse- *NEW- Internal communication to the attack owner in order to specified its attack has been discovered + config allowed
//                        (4 different sentences used in random)
//                       *Bug correction in butin calculation (Thousand 'M' not correctly take into account)
//                       *Bug correction when more than 1000GT in calculation
//                       *NEW- Integration of expedition personnal fleet, speed and time to spent in.
//                       *Bug correction when a disconnection happens during a spy launch.
//                       *NEW- Integration of a link to a fight report convertisseur on API button in messages' "Rapport de Combat" Tab
//
//3.6.4: Imp2Toulouse-   *Official version integrating all beta changes
//
//3.6.4.1: Imp2Toulouse- *Add functionnalities
//                         *link with TopRaider on api button in combat and spy report
//                         *launch specific raid directly by clicking in target button in spy report
//3.6.4.2: Imp2Toulouse- *Debug functionnalities / Optimizations
//                         *Tools bar in messages has been debugged and improved
//                         *Code optimizations
//3.6.4.3:               * Fixes + prevent auto attack during period
//         Imp2Toulouse- * Fixes / Optimizations
//3.6.4.4:               * Many fixes
//3.7.0: Nouveautés de la version 3.7.0 :
//         Integration de la version 6.0.5
//         -Revue de l'integration de l'ensemble des frigos (depuis les messages)
//         -Revue de l'ensemble du processus d'auto attaque (créneau de non attaque configurable)
//         -Revue de l'envoi des expeditions
//         -Revue du calcul du butin
//         -Ajout de contrôles dans la gestion des frigos
//         -Ajout de controles basés sur la flotte/defense de l'ennemie
//         -Modification de la barre d'outil des messages (possibilité d'activer le nombre de sonde par frigo)
//3.7.1: Main evolution
//         -Retructuration of the script
//         -Multiple kind of auto ejection on AA desactivation
//         -Add (configuration and manage) priority of ressource ejected regarding the global fleets transport capacity
//       Bug corrections/Improvements
//         - Improvement of nb_slot configuration saving
//         - Improvement of fleets specification on ejection (new function get_fleets_capacity)
//3.7.2:               * Fixed Save/Load 
//3.7.3
//         - Correction "Report general" when spy report on planet was not a frigo
//         - Change match regex to improve detection of old spy report on detroyed planet
//3.7.4
//         - Correction "add frigo" on galaxy view
//         - Correction auto-eject bug on attack
//3.7.5
//         - Migrate starter packs to JSON data
//         - Bug correction regarding frigo icons on fight report
//         - Add webhook functionnality (to announce attack in webhookapps like discord)
//3.7.6
//         - Improve last version check (real call)
//         - Add functionnality allowing to add MOON as frigo from galaxy and message pages
//           Update spy process in order to spy moon too.
//3.7.7
//         -Auto insertion on spied frigos (insertion on access to the spy messages)
//         -Compatibilité avec AGO (Antigame Origin)
//         -Change spy process to add a specific return if no vessel to perform spy and add vebose explanation on error
//         -Improve add_programmation_button by adding case of original button has class built-it_disabled

declare var $: JQueryStatic;

class PersistedData {
    listPrev : string[][];
    prods : number[];
    frigos : string[][];
    eject : string;
}

var antiBugTimeout = setTimeout(function(){location.href=location.href;}, 5*60*1000);
var cur_version = '3.7.8';
var univers = window.location.href.split('/')[2];

// Multi langues
var isFR = univers.match('fr');
var LANG_programm = isFR ? "Programmer" : "Add to list";
var LANG_added = isFR ? "Ajouté" : "Added";
var LANG_started = isFR ? "Lancé" : "Started";
var LANG_done = isFR ? "Terminé" : "Done";
var LANG_noLocalStorage = isFR ? "Votre navigateur ne supporte pas le système de localStorage, mettez le à jour ou désinstallez le script." 
    : "Your browser does not support localStorage feature, please update to latest Chrome version or unistall SephiOGame.";
var LANG_nouveaute_update = '- Migrate starter packs to JSON data<br>- Bug correction regarding frigo icons on fight report<br>- Add webhook functionnality (to announce attack in webhookapps like discord)<br>- Improve last version check (real call)';

if ($('#banner_skyscraper')) $('#banner_skyscraper').html('');
if (localStorage == null) {
    alert("SephiOGame : "+LANG_noLocalStorage);
    exit(0);
}

var clock = $('#ago_clock');
if (clock.length >= 1) clock.css({ display: "none" });

//##############################################
// Fonctions de base
//##############################################
function exit(i: number){throw new Error('This is not an error. This is just to abort javascript');}
function time() : number {var mytime=new Date();return mytime.getTime();}
function checkmail(mailteste : string){var reg = new RegExp('^[a-z0-9]+([_|\.|-]{1}[a-z0-9]+)*@[a-z0-9]+([_|\.|-]{1}[a-z0-9]+)*[\.]{1}[a-z]{2,6}$', 'i');return(reg.test(mailteste));}
function storeData(name : string, value : string, name_prefix : string) {
    if (name_prefix == 'all') name = name_prefix+'_'+name;
    else name = GLOB_cur_planet+'_'+name_prefix+'_'+name;
    localStorage.setItem(name,value);
}
function readData(name : string, name_prefix : string) : string {
    if (name_prefix == 'all') name = name_prefix+'_'+name;
    else name = GLOB_cur_planet+'_'+name_prefix+'_'+name;
    return localStorage.getItem(name);
}
function removeData(name : string, name_prefix : string) {
    if (name_prefix == 'all') name = name_prefix+'_'+name;
    else name = GLOB_cur_planet+'_'+name_prefix+'_'+name;
    localStorage.removeItem(name);
}
function gup(name : string)
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
function rand(a : number,b : number) { return Math.floor((Math.random()*(b-a))+a);}
function blit_message(message : string) {
    blit_message_time(message, 7000);
}
function blit_message_time(message : string, time : number) {
    $("#fadeBox").fadeTo(0,0);
    $('#fadeBox').css({display: 'block'});
    $('#fadeBoxStyle').css({
        height: "46px",
        width: "90px",
        margin: "3px 0 0 12px",
        backgroundImage: "url(http://www.sephiogame.com/script/icon_ecchi2.png)"
    });
    $('#fadeBoxContent').css({width: "120px"});
    $('#fadeBoxContent').html(message);
    $("#fadeBox").fadeTo(400,0.85);
    setTimeout(function(){$("#fadeBox").fadeTo(400,0);},time);
}

//######################################################################################
// ALL Functions
//######################################################################################
/**
 * Auth, Save and Load gmail api
 *
 * @param  {authResult} result of the Auth request
 */
function Auth_Load_Save_info(authResult) {
    if (authResult && !authResult.error) {
        storeData('gapi_auth',time().toString(),'all');
        storeData('gapi_token',authResult.access_token,'all');
        storeData('gapi_expires_in',authResult.expires_in,'all');
        storeData('gapi_clientid',authResult.client_id,'all');
        storeData('gapi_scope',authResult.scope,'all');
        if (gup('sephiScript')){
            $('#authorize-div').css({display: 'none'});
            $('#alertmail-div').css({display: 'inline'});
            appendResults($('#output'),(isFR)?'Vous avez autorisé google à envoyer des mails en votre nom. Merci pour votre confiance.':'You have authorized google to send email for you. Thanks to trust us.');
        }
        blit_message((isFR)?'Vous êtes maintenant authentifié auprés de Google gmail!':'You are now authenticated on Google gmail!');
        loadGmailApi();
    } else {
        storeData('gapi_auth', '0', 'all');
        storeData('gapi_token', '0', 'all');
        storeData('gapi_expires_in', '0', 'all');
        storeData('gapi_clientid', '0', 'all');
        storeData('gapi_scope', '0', 'all');
        if (gup('sephiScript')) {
            $('#authorize-div').css({display: 'inline'});
            $('#authorize-div').css({display: 'none'});
        }
        blit_message('Perte de l\'authentification Google gmail! Cliquer sur le bouton pour vous authentifier.');
    }
}

function make_important_vars_data() {
    return JSON.stringify(GLOB_persistedData, null, 2);
}

function init_vars(){
    save_important_vars('');
    blit_message('Vos données de cette planète <span style="float: none; margin: 0; color:#109E18">ont bien été réinitialisées</span>.');
    setTimeout(function(){
        window.location.href = window.location.href;
    },1000);
}

function save_important_vars(data_cloud? : string) {
    var aSerializedData : string;
    if (!data_cloud) aSerializedData = make_important_vars_data();
    else aSerializedData = data_cloud;

    storeData("saved_vars_v2", aSerializedData, 'dump');
    return;
}

function load_important_vars() {
    var aSerializedData : string = readData("saved_vars_v2", 'dump');
    if (aSerializedData !== null) {
        // Migrated 
        try {
            GLOB_persistedData = JSON.parse(aSerializedData);
        } catch(e) {
            blit_message('<span style="color:red">Unable to load saved data</span>')
            console.log(e)
            throw e
        }
        console.log('JSON persisted data retrieved')
        return;
    }

    // Not migrated
    aSerializedData = readData("saved_vars", 'dump');
    if (aSerializedData !== null && aSerializedData !== 'que dalle') {
        try {
            GLOB_persistedData = JSON.parse(aSerializedData);
        } catch(e) {
            console.log('No JSON found, using old algorithm')
            try {
                // Must support old format for compatibility reasons. Can be removed after a long time :/
                GLOB_persistedData = load_persisted_data_deprecated(aSerializedData)
            } catch (e) {
                blit_message('<span style="color:red">Unable to load saved data</span>')
                console.log(e)
                throw e
            }
        }
    }
}

function load_persisted_data_deprecated(iSerializedData : string) : PersistedData {
    var result : PersistedData = {"listPrev" : null, "prods" : null, "frigos" : null, "eject" : null };
    iSerializedData = iSerializedData.replace(/_Ar1_/g, '\n');
    var aSerializedDataParts : any = iSerializedData.split('/_/_/');
    for (var i = 0; i < aSerializedDataParts.length - 1; i++) {
        if (aSerializedDataParts[i] !== null && aSerializedDataParts[i].replace('\n', '') !== aSerializedDataParts[i]) {
            aSerializedDataParts[i] = aSerializedDataParts[i].split('\n');
            aSerializedDataParts[i] = aSerializedDataParts[i].slice(0, aSerializedDataParts[i].length - 1);
            for (var j = 0; j < aSerializedDataParts[i].length; j++) {
                if (aSerializedDataParts[i][j] !== null && aSerializedDataParts[i][j].replace('_Ar2_', '') !== aSerializedDataParts[i][j]) {
                    aSerializedDataParts[i][j] = aSerializedDataParts[i][j].split('_Ar2_');
                    aSerializedDataParts[i][j] = aSerializedDataParts[i][j].slice(0, aSerializedDataParts[i][j].length - 1);
                    if (aSerializedDataParts[i][j] == 'null' || aSerializedDataParts[i][j] == 'undefined')
                        aSerializedDataParts[i][j] = null;
                    for (var k = 0; k < aSerializedDataParts[i][j].length; k++)
                        if (aSerializedDataParts[i][j][k] == 'null' || aSerializedDataParts[i][j][k] == 'undefined')
                            aSerializedDataParts[i][j][k] = null;
                }
            }
        }
    }
    
    for (var i=0 ; i<4 ; i++) {
        if (i == 0) result['listPrev'] = aSerializedDataParts[i];
        if (i == 1) result['prods'] = aSerializedDataParts[i];
        if (i == 2) result['frigos'] = aSerializedDataParts[i];
        if (i == 3) result['eject'] = aSerializedDataParts[i];
    }
    for (i=0 ; i<result.listPrev.length ; i++) {
        set_prev_data('original_id', i, i.toString())
    }

    return result;
}

function save_important_vars_in_cloud() {
    var blob = new Blob([make_important_vars_data()], {type: "text/plain;charset=utf-8"});
    var month = ((new Date()).getUTCMonth()+1);
    var monthStr = month<10 ? "0"+month : month.toString();

    var day = ((new Date()).getUTCDate());
    var dayStr = day<10 ? "0"+day : day.toString();

    saveAs(blob, GLOB_cur_planet_name.replace(/\W/g, '')+"_"+(new Date()).getUTCFullYear()+"_"+month+"_"+day+".sephiOGame");
}

function load_important_vars_in_cloud() {
    try {
        var files = $('#fileupload')[0].files;
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
                // Test the data with a JSON.parse()
                try {
                    JSON.parse(evt.target.result)
                } catch (e) {
                    blit_message('<span style="float: none;margin: 0;color:red">Erreur lors de la lecture des données</span>. Arret de la restauration.');
                    return;
                }

                save_important_vars(evt.target.result);
                blit_message('Vos données de cette planète <span style="float: none;margin: 0;color:#109E18">ont bien été chargées</span>. Patientez...');
                $('#load_button').on("click", function(){});
                setTimeout(function(){
                  window.location.href = window.location.href;
                },2000);
            }
        };

        var blob = file.slice(start, stop + 1);
        reader.readAsText(blob);
    } catch (e) {
        blit_message('<span style="float: none;margin: 0;color:red">Impossible de lire le fichier</span>.');
        return;
    }
}

function get_prev_data(name,id) {
    clock = (GLOB_persistedData["listPrev"][id] == null)?'undefined':GLOB_persistedData["listPrev"][id][cookies_list.indexOf(name)];
    //Imp2Toulouse: Correction between undifinied par undefined (why do not use 'undefined' ?)
    if (clock=='undefined') return null;
    else return clock;
}

function set_prev_data(name,id,val) {
    GLOB_persistedData["listPrev"][id][cookies_list.indexOf(name)] = val;
}

function bruit_alert(url) {
    $('#div_for_sound').html('<audio controls autoplay="true"><source src="'+url+'" type="audio/mpeg" volume="0.5"></audio>');
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

    if (Math.floor(boss/60/60) >0)//!== 0)
        temps_string += Math.floor(boss/60/60)+'h';

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

function get_prevision_bar_html(i, textSupp, textSupp2, infotitle, color,cost_met,cost_crys,cost_deut,ress_metal,ress_crystal,ress_deuterium,cur_progs_count) {
    color1='#109E18';
    color2='#109E18';
    color3='#109E18';
    if (parseInt(cost_met) > parseInt(ress_metal)) color1='#d43635';
    if (parseInt(cost_crys) > parseInt(ress_crystal)) color2='#d43635';
    if (parseInt(cost_deut) > parseInt(ress_deuterium)) color3='#d43635';
    if (textSupp == '['+LANG_started+'] ') cool_title= LANG_done;
    else cool_title=get_cool_title (cost_met,cost_crys,cost_deut,color1,color2,color3);

    data = "\n"+'<div id="block_prog_'+i+'" style="height:0px;position:relative;top:'+(27*(cur_progs_count-1))+'px;"><span style="display:none" id="prog_cur_place_'+i+'">'+i+'</span><div class="tooltipHTML" title="'+cool_title+'" id="info_prog_'+i+'" style="cursor:default;word-wrap: normal;height:20px;font: 700 12px Verdana,Arial,Helvetica,sans-serif;position:relative;left:-8px;padding-top:7px;background: url(http://www.sephiogame.com/images/barre_fond.gif) no-repeat;background-position:0px -1px;width:640px;margin-bottom:0px;color:'+color+';padding-left:40px;font-weight:normal;">';
    data += '<p style="width:600px;height:20px;white-space: nowrap">'+ textSupp+' <b>'+infotitle+'</b>';
    data += ' <i><span style="font-size:11px" id="info_prog_time_'+i+'"></span></i></p></div>';
    data += "\n"+'<div id="del_button_'+i+'" style="position:relative;height:0px;position:relative;left:610px;top:-20px;"><img style="cursor:pointer;width:16px;height:auto;" src="http://www.sephiogame.com/script/newsletter-close-button.png" title="Retirer cette construction de la liste" onclick="localStorage.setItem(\'all_delete_id\', \''+i+'\');"/></div>';
    data += "\n"+'<div id="dragdrop_prev_'+i+'" style="height:0px;position:relative;left:585px;top:-21px;"><img style="cursor:move;width:18px;height:auto;-moz-user-select: none;" draggable="false"  src="http://www.sephiogame.com/script/dragdrop.png" title="Déplacer"/></div>';
    data+= '</div>'
    return data;
}

function get_cost(data, type) {
    //if (data.match('energy')) return 0;
    tmp = data.split('<li class="'+type);
    if (tmp[0] !== data) {
        data = tmp[1].split('class="cost')[1].split("</")[0];
        if (!data.match(',')) res = data.replace('M','.000.000').match(/\d/g).join("");
        else res = parseInt(data.split(',')[0].match(/\d/g).join(""))*1000000 + parseInt(data.split(',')[1].match(/\d/g).join(""))*100000/Math.pow(10,data.split(',')[1].match(/\d/g).length -1);
    } else {res = 0}
    return parseInt(res);
}

function add_programmation_button() {
    if ( gup('page') !== 'premium' && gup('page') !== 'shop' && $("#content").length >0 && $("#content").children()[0].tagName == 'H2') {
        title=$("#content").children()[0].innerText;
        if (title !== cur_title) {
            var ress_metal = $("span#resources_metal").html().replace(/\./g,"");
            var ress_crystal = $("span#resources_crystal").html().replace(/\./g,"");
            var ress_deuterium = $("span#resources_deuterium").html().replace(/\./g,"");

            cur_title = title;
            title=title.replace(/ /g,'_esp_');
            cur_content = $("#content").html();

            cost_metal = get_cost(cur_content, "metal");
            cost_crystal = get_cost(cur_content, "crystal");
            cost_deuterium = get_cost(cur_content, "deuterium");

            max_nb = Math.floor(parseInt(ress_metal)/parseInt(cost_metal));
            tmp = Math.floor(parseInt(ress_crystal)/parseInt(cost_crystal));
            if (tmp < max_nb) max_nb = tmp;
            tmp = Math.floor(parseInt(ress_deuterium)/parseInt(cost_deuterium));
            if (tmp < max_nb) max_nb = tmp;
            max_text = '';
            if (max_nb > 0) max_text = max_nb; //max_text = '[max. '+max_nb+']';

            det = $("div#detail").html();
            form_modus = $('div#detail input[name="modus"]').val();
            form_type = $('div#detail input[name="type"]').val();

            form_number = ($('#number').length > 0)?$('#number').val():"";

            // Program button
            //I2T: Pour compatibilité AGO
            //var ori_build_button = $("#content").find('a').last();
            var ori_build_button = ($("#content").find('a.build-it_premium').length == 1)?$("#content").find('a.build-it_premium'):($("#content").find('a.build-it_disabled').length == 1)?$("#content").find('a.build-it_disabled'):$("#content").find('a.build-it');
            ori_build_button.css('position', 'absolute')//'relative');
            ori_build_button.css('right', '5px');
            var build_button = ori_build_button.clone();
            (AGO_actif)?ori_build_button.css('top', '35px'):ori_build_button.css('top', '80px');//'-16px');//'-85px')
            build_button.attr('class', 'build-it');
            build_button.attr('href', '#');
            build_button.attr('disabled', false);
            build_button.css('background-image', 'url(http://www.sephiogame.com/script/d99a48dc0f072590fbf110ad2a3ef5.png)');
            if ( typeof build_button.children()[0] != 'undefined') build_button.children()[0].innerHTML = LANG_programm;
            (AGO_actif)?build_button.css('top', '-16px'):build_button.css('top', '25px');//'-16px');//'-85px');
            build_button.click(function (e) {
                $(e.currentTarget).css('backgroundImage', 'url(http://www.sephiogame.com/script/sfdgdfshsdhg.png)');
                $(e.currentTarget).prop('disabled', true);
                $('#havetoprev').html('yes');
                $('#prev_ok').css('display', 'block');
                $('#is_ok_prev').html('no');
                if ( typeof $(e.currentTarget).children()[0] != 'undefined') $(e.currentTarget).children()[0].innerHTML = LANG_added;
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
            ori_build_button.parent().prepend(build_button);

            // Data
            var first_li = $("#content").find('ul.production_info').find('li').first();
            first_li.append(  '<span id="prev_ok" style="display:none;">'
                +      '<b>Construction programmée</b><br/>'
                +      '<span style="font-size:9px;position:relative;top:-5px;">Ne quittez pas cette page.</span><br/>'
                + '</span>'
                + '<div style="display:none" id="havetoprev">no</div>'
                + '<div style="display:none" id="cur_met_prev">'+cost_metal+'</div>'
                + '<div style="display:none" id="cur_crys_prev">'+cost_crystal+'</div>'
                + '<div style="display:none" id="cur_deut_prev">'+cost_deuterium+'</div>'
                + '<div style="display:none" id="title_prev">'+title+'</div>'
                + '<div style="display:none" id="form_type_prev">'+form_type+'</div>'
                + '<div style="display:none" id="form_modus_prev">'+form_modus+'</div>'
                + '<div style="display:none" id="form_number_prev">'+form_number+'</div>'
                + '<div style="display:none" id="is_ok_prev">no</div>')
            // Max number
            var p_amount = $("#content").find('p.amount')
            var div_enter = $("#content").find('div.enter');
            if (p_amount.length > 0) {
                p_amount.html(p_amount.html().replace(":"," max:"))
                p_amount.first().append(' <span style="color:#ffffff">'+max_text+'</span>');
                p_amount.css('display','block');
            }
            div_enter.css('top','125px');
            (AGO_actif)?div_enter.css('right','16px'):div_enter.css('right','-110px');

            $("#content").find('a#close').on("click",function(){
                $('div#detail').css("display", 'none');
            });

            $('div#detail').css({display: 'block'});
            $("#planet [name='form']")[0].id = 'form_finished';

            $('#form_finished').onsubmit =function(){
                dontAddToCookies = true;
                return true;
            };
            $('#form_finished').onkeyup = null;
            if ($('#number').length > 0) {
                $('#number').onkeyup = null;
                $('#number').onkeydown = null;
                $('#number').onkeypress = null;
                //Imp2Toulouse- Force the focus on number input to improve ergonomy
                $('#number').focus();
            }
        }
        //set down info_prog
        //$('#info_prog').css("top",parseInt(($("div#detail").css('display') !== 'none')?$('#detail').height():$('#detail').height()-30)+'px');
    }
    setTimeout(add_programmation_button, 500);
}

/***************************************
 ***** Change message actions tab
 ****************************************
 * Input: action_tab object
 * Output: Object changed
 ****************************************/
function change_actions_tab(action_tab){
    //Change APIKey from <div> to <a> tag
    action_tab.find("span.icon_apikey").each(function (index) {
        var parent=$(this).parent();
        if (! parent.attr("href")) {
            var title = $(this).attr("title");
            var api_num = $(this).attr("title").replace(/^.*input value='(.*)' readonly.*$/m, '$1');
            if (api_num.match(/^sr-.*$/)) api_param="SR_KEY=".concat(api_num);
            if (api_num.match(/^cr-.*$/)) api_param="CR_KEY=".concat(api_num);
            if (api_num.match(/^rr-.*$/)) api_param="RR_KEY=".concat(api_num);

            if (api_param != "" && api_param != null)
                parent.replaceWith(function () {
                    return $('<a/>', {
                        href: "http://topraider.eu/index.php?langue=fr&simulator=speedsim&".concat(api_param),
                        target: '_blank',
                        class: "icon_nf_link fleft",
                        html: this.innerHTML
                    })
                });
        }
        var parent=null;
    });
    // Change attack url allowing to auto attack target
    action_tab.find("span.icon_attack").each(function (index) {
        var parent=$(this).parent();
        if (! parent.attr("href").match("auto=yes")) {
            //Get information about butin (sum of metal, cristal and deut) * type_multifactor (50%, 75%, 100%, ...)
            if (parent.parent().parent().find("span.ctn4 .resspan").length >0) {
                process_espionnage_data(parent.parent().parent().find("span.ctn4 .resspan"));
                var butin = Math.floor(type_multip * (met + cri + deu));
                url_parent = parent.attr("href");
                url_pt = url_parent.replace("mission=1", "mission=1&auto=yes&ID=0&PT=" + (1 + Math.floor(butin / 5000)) + "&Referer=" + (encodeURIComponent($(location).attr('href').replace(/.*\?(.*)/g, "$1"))));
                url_gt = url_parent.replace("mission=1", "mission=1&auto=yes&ID=0&GT=" + (1 + Math.floor(butin / 25000)) + "&Referer=" + (encodeURIComponent($(location).attr('href').replace(/.*\?(.*)/g, "$1"))));
                title = "Butin&nbsp;:" + butin + "<br><a href='" + url_pt + "'>P.Transp&nbsp;:" + (1 + Math.floor(butin / 5000)) + "</a><br><a href='" + url_gt + "'>G.Transp&nbsp;:" + (1 + Math.floor(butin / 25000)) + "</a>";
                $(this).addClass("tooltipCustom tooltip-width:400");
                $(this).attr("title", title);
                var url_parent = null;
                var url_pt = null;
                var url_gt = null;
                var title=null;
            }
        }
        var parent = null;
    });

    if (action_tab.find("span#icon_frigo").length == 0 ) {
        action_tab.parent().each(function (index) {
            if ($(this).find('.msg_head .msg_title').length >0) {
                var planame = null, coord = null;
                // dans message rapport de combat
               if ($(this).find('.msg_head .msg_title').html().match(/Rapport de combat/)){
					// dans message Rapport de combat
					if ($(this).find('.msg_head .msg_title').html().match(/middlemark/))
						[, planame, coord] = $(this).find('.msg_head .msg_title span.middlemark').html().match(/Rapport de combat (.*) <figure.* class="txt_link">(.*)<\/a>.*$/);
					if ($(this).find('.msg_head .msg_title').html().match(/undermark/)) // Successfull fight
						[, planame, coord] = $(this).find('.msg_head .msg_title span.undermark').html().match(/Rapport de combat (.*) <figure.*<a.*>(.*)<\/a>/);
					if ($(this).find('.msg_head .msg_title').html().match(/overmark/))  // Failled fight
						[, planame, coord] = $(this).find('.msg_head .msg_title span.overmark').html().match(/Rapport de combat (.*) <figure.*<a.*>(.*)<\/a>/);
					//I2T: Prévision de correction
					//[, planame, coord] = $(this).find('.msg_head .msg_title span.overmark').html().match(/Rapport de combat (.*) <figure.* class="txt_link">(.*)<\/a>.*$/);
				}
                // dans message rapport d'espionnage
                if ($(this).find('.msg_head .msg_title').html().match(/Rapport d`espionnage/)){
					if ($(this).find('.msg_head .msg_title').html().match(/figure/))
						[, planame, coord] = $(this).find('.msg_head .msg_title .txt_link').html().match(/<\/figure>(.*) (.*)$/);
                    //DETECTION DEF/FLOTTE
                    var flottes = null, flottesActive = false, defense = null, defenseActive = false, flottesDetected = false, defenseDetected = false;
                    if ($(this).find('.msg_content div.compacting:eq(3) span:eq(0):contains("Flottes:")').length > 0) {
                        flottesDetected = true;
                        flottes = parseInt($(this).find('.msg_content div.compacting:eq(3) span:eq(0):contains("Flottes:")').html().match(/\d/g).join(""));
                        if ($(this).find('.msg_content div.compacting:eq(3) span:eq(0):contains("Flottes:")').html().match('M')) flottes*=1000000;
                        if ($(this).find('.msg_content div.compacting:eq(3) span:eq(0):contains("Flottes:")').html().match(',')) flottes/=100;
                        (flottes > 0) ? flottesActive = true : flottesActive = false;
                    }
                    if ($(this).find('.msg_content div.compacting:eq(3) span:eq(1):contains("Défense:")').length > 0) {
                        defenseDetected = true;
                        defense = parseInt($(this).find('.msg_content div.compacting:eq(3) span:eq(1):contains("Défense:")').html().match(/\d/g).join(""));
                        if ($(this).find('.msg_content div.compacting:eq(3) span:eq(1):contains("Défense:")').html().match('M')) defense*=1000000;
                        if ($(this).find('.msg_content div.compacting:eq(3) span:eq(1):contains("Défense:")').html().match(',')) defense/=100;
                        (defense > 0) ? defenseActive = true : defenseActive = false;
                    }
                    //END DETECTION
                }
				//Detection type frigo
				var typeFrigo=($(this).find('.msg_head .msg_title figure.moon').length >0)?"moon":"planet";
                coord+=(typeFrigo ==="moon")?"Lune":"";
                if (planame && coord) {
                    var galaxy, system, planet;
                    [,galaxy,system,planet] = coord.match(/\[(.*):(.*):(.*)\]/);

                    // Recherche d'un frigo avec ces coordonnées
                    //Imp2Toulouse- Factorize with is_frigo fonction
                    var num_frigo=is_frigo(GLOB_persistedData["frigos"],coord);
                    var infrig=(num_frigo>=0)?'yes':'no';
					//If coord is ours return
					if ($.inArray(coord,planet_list_coords) >=0) return;
                    ////
                    //nb sonde config dans option
                    var nb_sonde_default=parseInt(readData("nb_sondes","options"));
                    (nb_sonde_default==0 || nb_sonde_default == "undefined" || nb_sonde_default == "NaN")?nb_sonde_default=1:null;

                    var frigo_status="", img_surcharge="";
                    frigo_status=(flottesDetected == "undefined" || !(flottesDetected && flottesActive))?"":" avec une flotte active";
                    frigo_status=frigo_status+((frigo_status !=="")?" et ":"")+((defenseDetected == "undefined" || !(defenseDetected && defenseActive))?"":" avec une defense active");

                    if (
                        $(this).find('.msg_head .msg_title').html().match(/Rapport d`espionnage/) //in spy message only
                        && infrig == 'no' //if not a frigo yet
                        && readData('Prog_AF','all') == "true" // If autofrigo prog
                    ) {
                        var ressources=parseInt($(this).find('.msg_content div.compacting:eq(1) span:eq(4):contains("Ressources:")').html().replace('M','000').match(/\d/g).join(""));
                        var cur_planet_GAL=parseInt(cur_planet_coords.replace(/\[|\]/,'').split(/:/)[0]);
                        if (
                            (readData('SameGAL_AF','all') != "true" || (readData('SameGAL_AF','all') == "true" && galaxy == cur_planet_GAL))
                            && (readData('WithoutFLEET_DEF_AF', 'all') != "true" || (readData('WithoutFLEET_DEF_AF', 'all') == "true" && flottesActive == false && defenseActive == false))
                            && (readData('Seuil_Auto_ADD_AF','all') != "true" || (readData('Seuil_Auto_ADD_AF','all') == "true" && readData('Seuil_Auto_ADD_VAL_AF','all') <= (ressources/2)))
                        ) add_frigo({'nom': planame, 'galaxy': galaxy, 'system': system, 'position': planet, 'sondes': 1, 'flottes': flottes, 'defenses': defense, 'type': typeFrigo});
                    }


                    if (infrig == 'no') {
                        var info='Je ne suis pas encore un de vos frigos !';
                        var style='cursor:pointer;color:#A52592;padding:5px;text-decoration:none;padding-bottom:15px;';
                        var style_rep='cursor: "default";color: "#10E010";';
                        var message_res_action='Bienvenue dans les frigos !';
                        var action='localStorage.setItem(&quot;all_add_racc&quot;, &quot;'+(index+1)+'&quot;);this.onclick=null;$($(this).find(&quot;#res_action&quot;)).html(&quot;'+message_res_action+'&quot;);';
                        var text_action="</span>Integration de \'"+coord+" "+planame+"\' dans "+GLOB_cur_planet_name+"?<hr/><u>Status:</u> Frigo potentiel"+frigo_status+"<br><u>Actions:</u> <a href=\'javascript:void(0)\' onclick=\'"+(action)+"\'>Ajouter ce frigos</a>";
                        var img='http://www.sephiogame.com/images/frigoOff.png';
                        // dans message espionnage
                        if ($(this).find('.msg_head .msg_title').html().match(/Rapport d`espionnage/)) {
                            var message_res_action=((flottesDetected && !flottesActive) || (defenseDetected && !defenseActive))?'Bienvenue dans les frigos !':'Bienvenue dans les frigos ! <b>Attention</b>, il faudra prévoir une flotte personnalisée adaptée.';
                            var text_action="</span>Integration de \'"+coord+" "+planame+"\' dans "+GLOB_cur_planet_name+"?<hr/><u>Status:</u> Frigo libre"+(frigo_status)+"<br><u>Actions:</u> <a href=\'javascript:void(0)\' onclick=\'"+(action)+"\'>Ajouter ce frigos</a>";
                            var img_addon=((flottesDetected && !flottesActive) && (defenseDetected && !defenseActive))?'http://www.sephiogame.com/images/data-ok.png':'http://www.sephiogame.com/images/no-data.png';
                            var img_surcharge=(img_addon != null)?'<img src="'+(img_addon)+'" style="height:10px;width:10px;position:relative;top:-3px;left: -17px" />':'';
                        }
                    } else {
                        //Get DEF/FLOTTE from frigo information
                        var message_res_action='Retiré des frigos !';
                        var info='J\'ai l\'honneur d\'être un de vos frigos ! Je le retire?';
                        var action="localStorage.setItem(&quot;all_del_racc&quot;, &quot;"+coord+"&quot;);this.onclick=null;$(this).find(&quot;#res_action&quot;).html(&quot;"+message_res_action+"&quot;);";
                        var text_action="</span>Frigo \'"+coord+" "+planame+"\' de "+GLOB_cur_planet_name+"<hr/><u>Status:</u> Frigo actif"+(frigo_status)+"<br><u>Actions:</u> <a href=\'javascript:void(0)\' onclick=\'"+(action)+"\'>Retirer ce frigos</a>";
                        var img='http://www.sephiogame.com/images/frigoOn.png';
                        var style='cursor:pointer;color:#A52592;padding:5px;text-decoration:none;padding-bottom:15px;';
                        var style_rep='cursor: "default";color: "#10E010";';

                        // dans message espionnage
                        if ($(this).find('.msg_head .msg_title').html().match(/Rapport d`espionnage/)) {

                            [frigo_name, frigo_galaxy, frigo_system, frigo_position, frigo_sonde, frigo_flotte_perso, frigo_ignore, frigo_flotte, frigo_defense, frigo_sonde, frigo_cur_flotte, frigo_cur_def, frigo_sonde, frigo_type] = get_frigo_data(num_frigo);
                            //if flotte detected ==> update frigo with current flottes
                            if (flottesDetected) GLOB_persistedData["frigos"][num_frigo][9] = flottes;
                            //if frigo_flotte null or undefined
                            if ((frigo_flotte == null || frigo_flotte == "undefined" || frigo_flotte == "") && flottes !== null) GLOB_persistedData["frigos"][num_frigo][7] = flottes;
                            //if defense detected ==> update frigo with current defense
                            if (defenseDetected) GLOB_persistedData["frigos"][num_frigo][10] = defense;
                            //if frigo_defense null or undefined or defense_saved > defense
                            if ((frigo_defense == null || frigo_defense == "undefined" || frigo_defense == "" || parseInt(frigo_defense) > defense) && defense !== null) GLOB_persistedData["frigos"][num_frigo][8] = defense;

                            if (frigo_type == null || frigo_type == "undefined" || frigo_type == "") GLOB_persistedData["frigos"][num_frigo][12] = typeFrigo;
                            img_addon = ((!flottesDetected || (flottesDetected && flottesActive && parseInt(frigo_flotte) < flottes)) || (!defenseDetected || (defenseDetected && defenseActive && parseInt(frigo_defense) < defense)))?'http://www.sephiogame.com/images/warning.png':null;
                            var img_surcharge=(img_addon != null)?'<img src="'+(img_addon)+'" style="height:10px;width:10px;position:relative;top:-3px;left: -17px" />':'';

                            save_important_vars();
                            var text_action="</span>Frigo \'"+coord+" "+planame+"\' de "+GLOB_cur_planet_name+"<hr/><u>Status:</u> Frigo actif"+(frigo_status)+"<br><u>Actions:</u> <a href=\'javascript:void(0)\' onclick=\'"+(action)+"\'>Retirer ce frigos</a><br><u>Options:</u> Utiliser <input style=\'width:10px;height:10px;\' type=\'text\' value=\'"+((parseInt(GLOB_persistedData["frigos"][num_frigo][11])>0)?parseInt(GLOB_persistedData["frigos"][num_frigo][11]):nb_sonde_default)+"\' onchange=\'$(&quot;#sondes"+(index+1)+"&quot;).val(this.value);localStorage.setItem(&quot;all_updt_racc&quot;, &quot;"+(index+1)+","+num_frigo+"&quot;);\'> sondes sur ce frigo.";
                        }
                    }
                    frigData = '<a id="name_sep'+(index+1)+'" href="javascript:void(0)" >';
                    frigData +='<span id="icon_frigo" class="js_hideTipOnMobile tooltipCustom tooltip-width:400" title="'+text_action+'"><img id="img'+(index+1)+'" src="'+(img)+'" height="26px" width="26px" />'+(img_surcharge);
                    frigData +='<input type="hidden" id="raccourcis_name_sep'+(index+1)+'" value="'+planame+'">';
                    frigData +='<input type="hidden" id="galaxy'+(index+1)+'" value="'+(galaxy)+'">';
                    frigData +='<input type="hidden" id="system'+(index+1)+'" value="'+(system)+'">';
                    frigData +='<input type="hidden" id="position'+(index+1)+'" value="'+(planet)+'">';
                    frigData +='<input type="hidden" id="flottes'+(index+1)+'" value="'+(flottes)+'">';
                    frigData +='<input type="hidden" id="defense'+(index+1)+'" value="'+(defense)+'">';
                    frigData +='<input type="hidden" id="sondes'+(index+1)+'" value="'+((num_frigo>0&&parseInt(GLOB_persistedData["frigos"][num_frigo][11])>0)?parseInt(GLOB_persistedData["frigos"][num_frigo][11]):nb_sonde_default)+'">';
                    frigData +='<input type="hidden" id="type'+(index+1)+'" value="'+(typeFrigo)+'">';
                    frigData +='</span></a>';
                    //Add the object built
                    $($(this).find('.msg_action_link.overlay')).before(frigData);
                    var frigData = null; var message_res_action = null; var info = null; var text_action = null; var img = null; var action = null; var style = null; var style_rep = null;
                }
            }
        });
    }
}

function change_message_actiontab() {
    var subtabs_fleets=$('#ui-id-2 .tab_ctn .js_subtabs_fleets');
    var Overlay_Detail=$('.ui-dialog .overlayDiv');

    if (subtabs_fleets.length == 1) { // Message Fleet Tab
        if (subtabs_fleets.find('#ui-id-14 .tab_inner li.msg').length > 0) { // Tab subtabs-nfFleet20 - Espionnage
            change_actions_tab(subtabs_fleets.find('#ui-id-14 .tab_inner li.msg div.msg_actions'));
        }
        if (subtabs_fleets.find('#ui-id-16 .tab_inner li.msg').length > 0) { // Tab subtabs-nfFleet21 - Rapports de combat
            change_actions_tab(subtabs_fleets.find('#ui-id-16 .tab_inner li.msg div.msg_actions'));
        }
        if (subtabs_fleets.find('#ui-id-18 .tab_inner li.msg').length > 0) { // Tab subtabs-nfFleet22 - Expeditions
            change_actions_tab(subtabs_fleets.find('#ui-id-18 .tab_inner li.msg div.msg_actions'));
        }
        if (subtabs_fleets.find('#ui-id-20 .tab_inner li.msg').length > 0) { // Tab subtabs-nfFleet23 - Groupes/transport
            change_actions_tab(subtabs_fleets.find('#ui-id-20 .tab_inner li.msg div.msg_actions'));
        }
        if (subtabs_fleets.find('#ui-id-22 .tab_inner li.msg').length > 0) { // Tab subtabs-nfFleet24 - Divers
            change_actions_tab(subtabs_fleets.find('#ui-id-22 .tab_inner li.msg div.msg_actions'));
        }
        if (subtabs_fleets.find('#ui-id-24 .tab_inner li.msg').length > 0) { // Tab subtabs-nfFleetTrash - Corbeille
            change_actions_tab(subtabs_fleets.find('#ui-id-24 .tab_inner li.msg div.msg_actions'));
        }
        if (subtabs_fleets.find('#ui-id-26 .tab_inner li.msg').length > 0) { // Tab subtabs-nfFleetTrash - Corbeille
            change_actions_tab(subtabs_fleets.find('#ui-id-26 .tab_inner li.msg div.msg_actions'));
        }
        if (subtabs_fleets.find('#ui-id-28 .tab_inner li.msg').length > 0) { // Tab subtabs-nfFleetTrash - Corbeille
            change_actions_tab(subtabs_fleets.find('#ui-id-28 .tab_inner li.msg div.msg_actions'));
        }
        if (subtabs_fleets.find('#ui-id-30 .tab_inner li.msg').length > 0) { // Tab subtabs-nfFleetTrash - Corbeille
            change_actions_tab(subtabs_fleets.find('#ui-id-30 .tab_inner li.msg div.msg_actions'));
        }
    }
    if (Overlay_Detail.length == 1) { // Message detail overlay
        change_actions_tab(Overlay_Detail.find('.detail_msg .detail_msg_head .msg_actions'));
    }
}

function get_prevID_from_place(place) {
    ID = -1;
    for (var tmpi = 0; tmpi<GLOB_persistedData["listPrev"].length+nb_trucs_supprimed ; tmpi++) {
        if ($('#prog_cur_place_'+tmpi).length >0 && parseInt($('#prog_cur_place_'+tmpi).html()) == place) {
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

        tmp = GLOB_persistedData["listPrev"][fromPlace];
        GLOB_persistedData["listPrev"][fromPlace]=GLOB_persistedData["listPrev"][toPlace];
        GLOB_persistedData["listPrev"][toPlace]=tmp;
        if (fromPlace<toPlace) {
            prev_positions[fromID] = (fromPlace+1+GLOB_nb_special_bars)*27;
            prev_positions[toID] = (toPlace-1+GLOB_nb_special_bars)*27;
            $('#prog_cur_place_'+fromID).html(fromPlace+1);
            $('#prog_cur_place_'+toID).html(toPlace-1);
        } else {
            prev_positions[fromID] = (fromPlace-1+GLOB_nb_special_bars)*27;
            prev_positions[toID] = (toPlace+1+GLOB_nb_special_bars)*27;
            $('#prog_cur_place_'+fromID).html(fromPlace-1);
            $('#prog_cur_place_'+toID).html(toPlace+1);
        }
    } else {
        if (fromPlace < toPlace) {
            apply_move_prev(fromID, fromPlace, fromPlace + 1);
            toID = apply_move_prev(fromID, fromPlace + 1, toPlace);
        } else {
            apply_move_prev(fromID, fromPlace, fromPlace - 1);
            toID = apply_move_prev(fromID, fromPlace - 1, toPlace);
        }
    }
    return toID;
}

function save_list_in_cookies() {
    //add prev
    if (!dontAddToCookies && $('#is_ok_prev').length >0 && $('#is_ok_prev').html() == "no"
        && $('#havetoprev').length >0 && $('#havetoprev').html() == "yes") {

        var aNextAvailableId=GLOB_persistedData["listPrev"].length;

        form_number = '';
        if ($('#number').length >0) {
            form_number = $('#number').val();
        }


        page = gup("page");
        if ($('#title_prev').html().match('Satellite')) page = 'shipyard';

        GLOB_persistedData["listPrev"][aNextAvailableId] = new Array();
        set_prev_data("havetoprev", aNextAvailableId, "yes");
        set_prev_data("donned", aNextAvailableId, "no");
        set_prev_data("cur_met_prev", aNextAvailableId, $('#cur_met_prev').html());
        set_prev_data("cur_crys_prev", aNextAvailableId, $('#cur_crys_prev').html());
        set_prev_data("cur_deut_prev", aNextAvailableId, $('#cur_deut_prev').html());
        set_prev_data("page", aNextAvailableId, page);
        set_prev_data("form_modus", aNextAvailableId, $('#form_modus_prev').html());
        set_prev_data("form_type", aNextAvailableId, $('#form_type_prev').html());
        set_prev_data("form_number", aNextAvailableId, form_number);
        set_prev_data("form_initial_number", aNextAvailableId, form_number);
        set_prev_data("title", aNextAvailableId, $('#title_prev').html());
        GLOB_persistedData["listPrev"][aNextAvailableId]["original_id"] = aNextAvailableId;
        prev_positions[aNextAvailableId] = (aNextAvailableId+GLOB_nb_special_bars)*27;
        $('#is_ok_prev').html('yes');

        multip = '';factor=1;
        if (get_prev_data("form_number", aNextAvailableId) !== null && get_prev_data("form_number", aNextAvailableId) !== "") {multip = " (x"+get_prev_data("form_number", aNextAvailableId)+")";factor=parseInt(get_prev_data("form_number", aNextAvailableId));}

        count_progs++;
        blit_message('Cette action a été <span style="float: none;margin: 0;color:#109E18">ajoutée dans votre liste de programmation</span> !');
        var ress_metal = $(document.body).find('#resources_metal').html().match(/\d/g).join("");
        var ress_crystal = $(document.body).find('#resources_crystal').html().match(/\d/g).join("");
        var ress_deuterium = $(document.body).find('#resources_deuterium').html().match(/\d/g).join("");
        $('#info_prog').html( $('#info_prog').html() + get_prevision_bar_html(aNextAvailableId, ' ', titles_cat[categories.indexOf(gup('page'))], get_prev_data("title", aNextAvailableId).replace(/_esp_/g, ' ')+multip, "#6f9fc8", parseInt(get_prev_data("cur_met_prev", aNextAvailableId))*factor,parseInt(get_prev_data("cur_crys_prev", aNextAvailableId))*factor,parseInt(get_prev_data("cur_deut_prev", aNextAvailableId))*factor,ress_metal,ress_crystal,ress_deuterium,count_progs));
        $('#'+id_prev).height($('#'+id_prev).height()+27+ "px");
        save_important_vars();
        // Drag & Drop des constructions
        if (gup('sephiScript') != '1') for (var i=0 ; i<GLOB_persistedData["listPrev"].length && GLOB_persistedData["listPrev"][i] ; i++) {$('#dragdrop_prev_'+i).mousedown(drag_prev);}
        verif=setTimeout(gestion_cook,2000);
    }

    // Move prevs
    if (readData("move_id", 'all') !== null && readData("move_id", 'all') !== "-1") {
        haveMoved = true;
        fromBlockID=parseInt(readData("move_id", 'all'));

        fromPlace = parseInt($('#prog_cur_place_'+fromBlockID).html());
        toPlace = fromPlace;

        if (readData("move", 'all') == "up") {
            if (fromPlace!==0) toPlace = fromPlace-1;
            else toPlace = GLOB_persistedData["listPrev"].length-1;
        }
        if (readData("move", 'all') == "down") {
            if (fromPlace==GLOB_persistedData["listPrev"].length-1) toPlace = 0;
            else toPlace = fromPlace+1;
        }

        apply_move_prev(fromBlockID, fromPlace, toPlace);
        for (var u_u = 0 ; u_u<GLOB_persistedData["listPrev"].length && GLOB_persistedData["listPrev"][u_u]; u_u++) {
            id = get_prevID_from_place(u_u);
            $( '#block_prog_'+id ).animate({ top: prev_positions[id] + "px" }, {duration: 500, queue: false} );
        }
        storeData("move_id", '-1', "all");
        save_important_vars();
        verif = setTimeout(gestion_cook, 2000);
    }

    // Delete Prevs
    if (readData("delete_id", 'all') !== null && readData("delete_id", 'all') !== "-1") {
        haveDel = true;
        blockID = readData("delete_id", 'all');
        delid = parseInt( $('#prog_cur_place_'+readData("delete_id", 'all')).html());

        GLOB_persistedData["listPrev"].splice(delid, 1);
        nb_trucs_supprimed++;
        count_progs--;
        cur_progs_count=count_progs;
        storeData("delete_id", '-1', "all");
        save_important_vars();
        blit_message('Cette action a été <span style="float: none;margin: 0;color:#109E18">supprimée de votre liste de programmation</span> !');
        // Animation
        $('#block_prog_'+blockID).fadeOut(500);
        setTimeout(function(){
            $('#block_prog_'+blockID).css({display: 'none'});
            $('#block_prog_'+blockID).html('');
        }, 500);

        for (var u_u = delid ; u_u<GLOB_persistedData["listPrev"].length && GLOB_persistedData["listPrev"][u_u] ; u_u++) {
            id = GLOB_persistedData["listPrev"][u_u]["original_id"];
            prev_positions[id] = prev_positions[id] - 27;
            if ($('#prog_cur_place_'+id).length >0) {
                $('#prog_cur_place_'+id).html(u_u);
                $('#block_prog_'+id ).animate({ top: prev_positions[id] + "px" }, {duration: 200,queue: false} );
            }
        }

        setTimeout(function(){
            $("#support_prev_block").height(parseInt($("#support_prev_block").height()-27) + "px");
            $('#'+id_prev).height(parseInt($('#'+id_prev).height()-27) + "px");
            if (gup('page') == "overview")
                $("#overviewBottom").css({'margin-top': ((parseInt($("#overviewBottom").css('margin-top').replace('px',''))-27) + "px")});
        }, 200);

        verif = setTimeout(gestion_cook, 1000);
    }

    // Ajout de frigo
    //imp2Toulouse- Retrait de Frigo
    if ((gup('page') == "fleet2" || gup('page') == 'messages' || gup('page') == 'galaxy') 
        && (
            (readData('add_racc','all') != null && parseInt(readData('add_racc','all')) > 0) 
            || (readData('updt_racc','all') != null && parseInt(readData('updt_racc','all')) > 0) 
            || (readData('del_racc','all') != null && readData('del_racc','all').match(':'))
        )
       ) {
        if (readData('add_racc','all') != null && parseInt(readData('add_racc','all')) > 0) {
            var messageID = readData('add_racc','all');
            storeData('add_racc', '0', 'all');
            $('#raccourcis_name_sep'+messageID).focus()
            var cur_nb=GLOB_persistedData["frigos"].length;
            GLOB_persistedData["frigos"][cur_nb] = new Array();
            //Nom du frigo
            GLOB_persistedData["frigos"][cur_nb][0] = $('#raccourcis_name_sep'+messageID).val().replace(/__/g, '').replace(/'/g, '').replace(/"/g, '');
            //Galaxy
            GLOB_persistedData["frigos"][cur_nb][1] = $('#galaxy'+messageID).val().replace(/__/g, '').replace(/'/g, '').replace(/"/g, '');
            //System
            GLOB_persistedData["frigos"][cur_nb][2] = $('#system'+messageID).val().replace(/__/g, '').replace(/'/g, '').replace(/"/g, '');
            //Position
            GLOB_persistedData["frigos"][cur_nb][3] = $('#position'+messageID).val().replace(/__/g, '').replace(/'/g, '').replace(/"/g, '');
            //Checked or not checked
            GLOB_persistedData["frigos"][cur_nb][4] = '1';
            //Flotte_Perso
            GLOB_persistedData["frigos"][cur_nb][5] = '';
            //Ignore
            GLOB_persistedData["frigos"][cur_nb][6] = '0';
            if (gup('page') == 'messages') {
                //Flottes
                ($('#flottes' + messageID).length > 0) ? GLOB_persistedData["frigos"][cur_nb][7] = $('#flottes' + messageID).val().replace(/__/g, '').replace(/'/g, '').replace(/"/g, '') : null;
                //Defenses
                ($('#defenses' + messageID).length > 0) ? GLOB_persistedData["frigos"][cur_nb][8] = $('#defense' + messageID).val().replace(/__/g, '').replace(/'/g, '').replace(/"/g, ''): null;
            }
            //Flotte en cours
            GLOB_persistedData["frigos"][cur_nb][9] = '0';
            //defense en cours
            GLOB_persistedData["frigos"][cur_nb][10] = '0';
            //Nb sonde
            GLOB_persistedData["frigos"][cur_nb][11] = '1';
            //Type frigo
            GLOB_persistedData["frigos"][cur_nb][12] = $('#type'+messageID).val().replace(/__/g, '').replace(/'/g, '').replace(/"/g, '');
            save_important_vars();
            blit_message(GLOB_persistedData["frigos"][cur_nb][0]+'('+GLOB_persistedData["frigos"][cur_nb][12]+') a été <span style="float: none;margin: 0;color:#109E18">ajouté à vos frigos</span> !');

            messageID=null;
            if (gup('page') == 'messages') setTimeout(function(){window.location.href = window.location.href;}, 500);
            if (gup('page') == 'galaxy') $("div.btn_blue[onclick^='submitForm()']").trigger("click");
        }
        //Imp2Toulouse- Ajout de la suppression d'un frigo
        if (readData('del_racc','all') != null && readData('del_racc','all').match(':')) {
            //all_del_racc contents coord
            var delid=is_frigo(GLOB_persistedData["frigos"],readData('del_racc','all'));
            storeData('del_racc', '0', 'all');
            var frig_name=GLOB_persistedData["frigos"][delid][0];
            GLOB_persistedData["frigos"].splice(delid, 1);

            save_important_vars();
            blit_message(frig_name+' a été <span style="float: none;margin: 0;color:#109E18">supprimé de vos frigos</span> !');

            delid=null;frig_name=null;
            if (gup('page') == 'messages') setTimeout(function(){window.location.href = window.location.href;}, 500);
            if (gup('page') == 'galaxy') $("div.btn_blue[onclick^='submitForm()']").trigger("click");
        }
        if (readData('updt_racc','all') != null && parseInt(readData('updt_racc','all')) > 0) {
            [,messageID,num_frigo]=readData('updt_racc','all').match(/(.*),(.*)/);
            storeData('updt_racc', '0', 'all');
            $('#raccourcis_name_sep'+messageID).focus();

            GLOB_persistedData["frigos"][num_frigo][11] = $('#sondes'+messageID).val().replace(/__/g, '').replace(/'/g, '').replace(/"/g, '');

            save_important_vars();
            blit_message(GLOB_persistedData["frigos"][num_frigo][0]+' a été <span style="float: none;margin: 0;color:#109E18">mis à jour.</span> !');

            messageID=null;num_frigo=null;
            if (gup('page') == 'messages') setTimeout(function(){window.location.href = window.location.href;}, 500);
            if (gup('page') == 'galaxy') $("div.btn_blue[onclick^='submitForm()']").trigger("click");
        }
    }
    /* Affichage des raccourcis */
    dropelems = document.getElementsByClassName('dropdown dropdownList initialized');
    if (gup('page') == "fleet2" && dropelems.length>0 && have_to_change_dropid) {
        have_to_change_dropid=false;

        data_racc_dropdown='<li><a class="undefined" style="text-align:center;color:#80C080"><figure class="planetIcon planet tooltip js_hideTipOnMobile" title="Planète"></figure>------ Mes frigos ------</a></li>';
        for (var i=0;i<GLOB_persistedData["frigos"].length && GLOB_persistedData["frigos"][i] ;i++)
            data_racc_dropdown+='<li><a class="undefined" style="color:#80C080;" data-value="'+GLOB_persistedData["frigos"][i][1]+'#'+GLOB_persistedData["frigos"][i][2]+'#'+GLOB_persistedData["frigos"][i][3]+'#'+GLOB_persistedData["frigos"][i][4]+'#'+GLOB_persistedData["frigos"][i][0]+'" onClick="$(\'#targetPlanetName\').html(\''+GLOB_persistedData["frigos"][i][0]+'\');$(\'#galaxy\').val(\''+GLOB_persistedData["frigos"][i][1]+'\');$(\'#system\').val(\''+GLOB_persistedData["frigos"][i][2]+'\');$(\'#position\').val(\''+GLOB_persistedData["frigos"][i][3]+'\');"><figure class="planetIcon planet tooltip js_hideTipOnMobile" title="Planète"></figure>'+GLOB_persistedData["frigos"][i][0]+' ['+GLOB_persistedData["frigos"][i][1]+':'+GLOB_persistedData["frigos"][i][2]+':'+GLOB_persistedData["frigos"][i][3]+']</a></li>';

        dropelems[0].innerHTML += data_racc_dropdown;
    }

    setTimeout(save_list_in_cookies,200);
}

function delete_frigo(){
    delid = parseInt(this.id.replace('del_button_',''));
    GLOB_persistedData["frigos"].splice(delid, 1);
    save_important_vars();

    delid=null;
    window.location.href = window.location.href;
}

function edit_frigo(){
    for (var editid = 0 ; editid<GLOB_persistedData["frigos"].length && GLOB_persistedData["frigos"][editid] ; editid++) {
        GLOB_persistedData["frigos"][editid][0] = $('#frig_name_'+editid).val().replace(/__/g, '').replace(/'/g, '').replace(/"/g, '');
        GLOB_persistedData["frigos"][editid][4] = $('#frig_sondes_'+editid).val().match(/\d/g).join("");
        GLOB_persistedData["frigos"][editid][5] = $('#frig_flotte_perso_'+editid).val();
        GLOB_persistedData["frigos"][editid][6]= ($('#frig_ignore_'+editid).prop("checked"))?'1':'0';
        GLOB_persistedData["frigos"][editid][7]= $('#frig_flotte_'+editid).val();
        GLOB_persistedData["frigos"][editid][8]= $('#frig_defense_'+editid).val();
    }
    save_important_vars();
    blit_message_time('Modifications <span style="float: none;margin: 0;color:#109E18">enregistrées avec succès</span> !',1000);
}

function add_frigo(infos_frigo_to_add){
    var cur_nb=GLOB_persistedData["frigos"].length;
    GLOB_persistedData["frigos"][cur_nb] = new Array();
    //Nom du frigo
    GLOB_persistedData["frigos"][cur_nb][0] = infos_frigo_to_add['nom'].replace(/__/g, '').replace(/'/g, '').replace(/"/g, '');
    //Galaxy,System,Position
    GLOB_persistedData["frigos"][cur_nb][1] = infos_frigo_to_add['galaxy'];
    GLOB_persistedData["frigos"][cur_nb][2] = infos_frigo_to_add['system'];
    GLOB_persistedData["frigos"][cur_nb][3] = infos_frigo_to_add['position'];
    //Checked or not checked
    GLOB_persistedData["frigos"][cur_nb][4] = '1';
    //Flotte_Perso
    GLOB_persistedData["frigos"][cur_nb][5] = '';
    //Ignore
    GLOB_persistedData["frigos"][cur_nb][6] = '0';
    if (gup('page') == 'messages') {
        //Flottes
        GLOB_persistedData["frigos"][cur_nb][7] = infos_frigo_to_add['flottes'];
        //Defenses
        GLOB_persistedData["frigos"][cur_nb][8] = infos_frigo_to_add['defenses'];
    }
    //Flotte en cours
    GLOB_persistedData["frigos"][cur_nb][9] = '0';
    //defense en cours
    GLOB_persistedData["frigos"][cur_nb][10] = '0';
    //Nb sonde
    GLOB_persistedData["frigos"][cur_nb][11] = infos_frigo_to_add['sondes'];
    //Type frigo
    GLOB_persistedData["frigos"][cur_nb][12] = infos_frigo_to_add['type'].replace(/__/g, '').replace(/'/g, '').replace(/"/g, '');
    save_important_vars();
}

//Imp2Toulouse: Add function to factorize
//browse all frigos and return id back else -1
function is_frigo(frigos,coord:string){

    //Parcours des frigos: frigo trouvé pour cette galaxie, systeme et planete => return idFrigo
    var Galaxy="",System="", Planet="", Type="";
    [,Galaxy, System, Planet, Type]=coord.match(/\[(.*):(.*):(.*)\](.*)/);
    Type=(Type === "")?"planet":"moon";

    for (j=0 ; j<frigos.length ; j++){
        if (   frigos[j][1] == Galaxy
            && frigos[j][2] == System
            && frigos[j][3] == Planet
            && frigos[j][12] == Type
        ) {
            return(parseInt(j));
        }
    }
    return(-1);
}

function get_frigo_data(idfrigo) {return GLOB_persistedData["frigos"][idfrigo];}


//Imp2Toulouse: Add function allowing to get button information
function get_info_button(button){
    var current_level=0, evol_level=0, value="";
    if ($("#"+button+" .ecke").length > 0) {
        current_level=parseInt($("#"+button+" .ecke")[0].innerHTML.replace(/<(?:.|\n)*?>/gm, '').replace(/.*\|/,/^$/).match(/\d+/g).join(""));
    } else current_level=0;

    if ($("#"+button+" .eckeoben").length > 0) {
        evol_level=parseInt($("#"+button+" .eckeoben")[0].innerHTML.replace(/<(?:.|\n)*?>/gm, '').replace(/.*\|/,/^$/).match(/\d+/g).join(""));
    } else evol_level=current_level;

    if ($("#"+button+" :input:text").length > 0) {
        value=($("#"+button+" :input:text").val() != "")?parseInt($("#"+button+" :input:text").val().match(/\d+/g).join("")):0;
    }
    return([current_level,evol_level,value]);

    current_level=null;evol_level=null;value=null;
}
function set_info_button(button, value){
    if ($("#"+button+" :input:text").length > 0)
        $("#"+button+" :input:text").val(value);
}
//Imp2Toulouse: Add function calculating the cool time + transform to be generic (myvalue in param) + show week if needed ==> Change fonction name from get_last_AA_coolTime to get_Time_Remain
function get_Time_Remain(myvalue){
    lastAAcoolTime=null;
    if (myvalue !== null) {
        //Added to anticipate to the translation centralization
        if (isFR){min_translate='minute';mins_translate='minutes';hour_translate='heure';hours_translate='heures';day_translate='jour';days_translate='jours';week_translate='semaine';weeks_translate='semaines';and_translate='et';} else {min_translate='minut';mins_translate='minuts';hr_translate='hour';hrs_translate='hours';day_translate='day';days_translate='days';week_translate='week';weeks_translate='weeks';and_translate='and';}
        lastAATime = parseInt((time() - parseInt(myvalue))/1000);
        lastAATimeMin = Math.floor((lastAATime/60) % 60);
        lastAATimeHour = Math.floor((lastAATime/60/60));
        //added
        lastAATimeHourRemain = Math.floor((lastAATime/60/60) % 24);
        lastAATimeDay = Math.floor((lastAATime/60/60/24));
        lastAATimeDayRemain = Math.floor((lastAATime/60/60/24) % 7);
        lastAATimeWeek = Math.floor((lastAATime/60/60/24/7));

        minutesText = '';
        if (lastAATimeMin > 1)  minutesText = lastAATimeMin+' '+mins_translate;
        if (lastAATimeMin <= 1) minutesText = lastAATimeMin+' '+min_translate;

        hourText = '';
        if (lastAATimeHour > 1)  hourText = lastAATimeHour+' '+hours_translate;
        if (lastAATimeHour == 1) hourText = lastAATimeHour+' '+hour_translate;
        //added
        hourRemainText = '';
        if (lastAATimeHourRemain > 1)  hourRemainText = lastAATimeHourRemain+' '+hours_translate;
        if (lastAATimeHourRemain == 1) hourRemainText = lastAATimeHourRemain+' '+hour_translate;

        dayText = '';
        if (lastAATimeDay > 1)   dayText = lastAATimeDay+' '+days_translate;
        if (lastAATimeDay == 1)  dayText = lastAATimeDay+' '+day_translate;
        dayRemainText = '';
        if (lastAATimeDayRemain > 1){   hourText=hourRemainText;dayRemainText = lastAATimeDayRemain+' '+days_translate;}
        if (lastAATimeDayRemain == 1){  hourText=hourRemainText;dayRemainText = lastAATimeDayRemain+' '+day_translate;}
        //end added

        weekText = '';
        if (lastAATimeWeek > 1)  {hourText=hourRemainText; dayText=dayRemainText; weekText = lastAATimeWeek+' '+weeks_translate}
        if (lastAATimeWeek == 1) {hourText=hourRemainText; dayText=dayRemainText; weekText = lastAATimeWeek+' '+week_translate;}

        etText = '';
        if (hourText !== '') etText = ' '+and_translate+' ';

        etText2 = '';
        if (dayText !== '') etText2 = ', ';

        etText3 = '';
        if (weekText !== '') etText3 = ', ';

        lastAAcoolTime = weekText + etText3 + dayText + etText2 + hourText + etText + minutesText;

        //A little garbage
        lastAATime=null;lastAATimeMin=null;lastAATimeHour=null;lastAATimeHourRemain=null;lastAATimeWeek=null;minutesText=null;weekText=null;hourText=null;hourRemainText=null;etText=null;etText2=null;
    }
    return(lastAAcoolTime);
}

function checkNewScriptVersionFromServer() {
    GM_xmlhttpRequest ({
        method:     'GET',
        url:        'http://www.sephiogame.com/servInfos.php?lastVer=2',
        onload:     function (responseDetails) {
            if (responseDetails.status == 200) {
                var lastVersion = responseDetails.responseText;
                console.log('Last version is ' + lastVersion);
                if (parseInt(lastVersion.match(/\d/g).join("")) > parseInt(cur_version.match(/\d/g).join(""))){
                    blit_message('<span style="float: none;margin: 0;color:#109E18">Version '+lastVersion
                        +' disponible</span>.<br><a href="http://www.sephiogame.com/Actualites?curVer='+cur_version
                        +'#Infos" target="sephiogame">Rendez-vous sur le site pour l\'installer</a>');
                    $('#fadeBox').css("pointerEvents", 'auto');
                }
            }
        }
    });
}
if(rand(1,10) == 1) checkNewScriptVersionFromServer();

var GLOB_next_id : number;
var frigo_id_to_spy : number;
var GLOB_next_id : number;

function launch_spy(self? : any, override_id? : any){
    clearTimeout(backOverviewTimeout);
    if (GLOB_abandonne_spy) {
        GLOB_abandonne_spy=false;

        window.location.href = window.location.href.replace(gup('page'), 'overview').replace('&sephiScript=1', '');
        return;
    }

    //var frigo_id_to_spy : number;
    var caller_id = this.id;
    //var GLOB_next_id : number;// = -1;
    if (override_id) caller_id = override_id;
    var init_spy_id = 0;
    if (caller_id == 'spy_all') {
        GLOB_spy_fail=0;
        spy_all=true;
        frigo_id_to_spy=-1;
    } else if (caller_id == 'rap_gene') {
        GLOB_spy_fail=0;
        want_a_RG=true;
        spy_all=true;
        frigo_id_to_spy=-1;
    } else if (caller_id == 'auto_attack') {
        GLOB_spy_fail=0;
        want_a_AA=true;
        want_a_RG=true;
        spy_all=true;
        frigo_id_to_spy=-1;
        storeData('AA_butin', $('#butin_AA_RG').val().match(/\d/g).join(""), 'AA');
    } else {
        if (typeof GLOB_next_id == "undefined") GLOB_next_id=-1;
        if (spy_all) frigo_id_to_spy = GLOB_next_id;
        else frigo_id_to_spy = parseInt(caller_id.replace('spy_button_',''));
    }

    if (frigo_id_to_spy == -1) {
        while (init_spy_id < GLOB_persistedData["frigos"].length && (parseInt(GLOB_persistedData["frigos"][init_spy_id][4]) <= 0 || GLOB_persistedData["frigos"][init_spy_id][6] == '1')) {init_spy_id++;}
        frigo_id_to_spy = init_spy_id;
    }
    if (frigo_id_to_spy == GLOB_persistedData["frigos"].length) {
        $('#spy_all').css("color", 'darkred');
        $('#spy_all').html('&#9658; Aucun frigo à espionner, retour à l\'overview dans 30 secs.');
		setTimeout(function(){
			window.location.href = window.location.href.replace(gup('page'), 'overview').replace('&startAA=1', '').replace('&sephiScript=1', '');
		}, 30*1000);
        return;
    }

    if(spy_all && frigo_id_to_spy==init_spy_id) {
        $('#spy_all').css("color", '#808080');
        $('#spy_all').html('&#9658; Espionnage des frigos en cours...');
    }
    if(want_a_RG && frigo_id_to_spy==init_spy_id) {
        $('#rap_gene').css("color", '#808080');
        $('#rap_gene').html('&#9658; En attente du retour des sondes...');
    }
    if(want_a_AA && frigo_id_to_spy==init_spy_id) {
        $('#auto_attack').css("color", '#808080');
        $('#auto_attack').html('&#9658; En attente des rapports d\'espionnage...');
    }
    var nb_sondes = parseInt($('#frig_sondes_'+frigo_id_to_spy).val());

    params = {
        mission: 6,
        galaxy: GLOB_persistedData["frigos"][frigo_id_to_spy][1],
        system: GLOB_persistedData["frigos"][frigo_id_to_spy][2],
        position: GLOB_persistedData["frigos"][frigo_id_to_spy][3],
        type: (GLOB_persistedData["frigos"][frigo_id_to_spy][12] === "planet" || GLOB_persistedData["frigos"][frigo_id_to_spy][12] === "")?1:3,//type=1 for spy planet, type=3 for spy moon
        shipCount: nb_sondes,
        token: miniFleetToken
    };

    //document.getElementById('auto_attack').innerHTML='&#9658; Timeout lancé';
    if (superSpyAllTimeout !== 0) clearTimeout(superSpyAllTimeout);
    superSpyAllTimeout = setTimeout(function(){
        window.location.href = window.location.href.replace(gup('page'), 'overview').replace('&sephiScript=1', '');
    }, 5*60*1000);

    var spyTimeout = setTimeout(function(){
        blit_message('<span style="float: none;margin: 0;color:#d43635">Pas de réponse</span>. Nouvel essai ('+(GLOB_nb_spy_fail+1)+'/10).');
        //Imperator2Toulouse- If nb fails reached, abandon the spy process which will return to the overview
        if ( GLOB_nb_spy_fail > 10 ) {
            GLOB_abandonne_spy=true;
            clearTimeout(spyTimeout);
        } else {
            GLOB_nb_spy_fail+=1;
        }
        launch_spy();
    }, 5000);

    $.ajax('https://'+univers+'/game/index.php?page=minifleet&ajax=1', {
        data: params,
        dataType: "json",
        type: "POST",
        success: function(dateESP) {
            if(typeof(dateESP.newToken) != "undefined") {
                miniFleetToken = dateESP.newToken;
            }
            GLOB_nb_tries++;
            if (dateESP.response == undefined) {
                blit_message('<span style="float: none;margin: 0;color:#d43635">Erreur inconnue</span>. Nouvel essai');
                $('#auto_attack').html('&#9658; Erreur inconnue');
                clearTimeout(spyTimeout);
                setTimeout(launch_spy, 3000);
                return;
            }
            if (dateESP.response.message.match('en mode vacances!')) {
                blit_message('Impossible, vous êtes en mode vacances.');
                $('#auto_attack').html('&#9658; Aucun espionnage pendant vos vacances.');
                $('#spy_all').html('&#9658; Espionnage des frigos terminé.');
                $('#spy_all').css('color','#F02020');
                $('#rap_gene').html('&#9658; Aucun espionnage effectué.');
                $('#rap_gene').css('color','#F02020');
                clearTimeout(spyTimeout);
                GLOB_abandonne_spy = true;
                setTimeout(function(){window.location.href = window.location.href.replace(gup('page'), 'overview').replace('&startAA=1', '').replace('&sephiScript=1', '');}, 10000);
                return;
                //imp2Toulouse- Simplifacation using regular expression
            } else if (!dateESP.response.message.match(/[E|e]rreur/)) {
                blit_message('Espionnage sur '+GLOB_persistedData["frigos"][frigo_id_to_spy][0]+' <span style="float: none;margin: 0;color:#109E18">démarré avec succès</span>');
                $('#spy_isok_'+frigo_id_to_spy).css("display", 'block');
                GLOB_next_id = frigo_id_to_spy+1;
                wait_sec=rand(1,3);
            } else if (dateESP.response.message.match('planète')) {
                blit_message(''+GLOB_persistedData["frigos"][frigo_id_to_spy][0]+' <span style="float: none;margin: 0;color:#d43635">n\'existe plus</span>');
                GLOB_persistedData["frigos"][frigo_id_to_spy][0] = '[Détruit] ' + GLOB_persistedData["frigos"][frigo_id_to_spy][0];
                GLOB_persistedData["frigos"][frigo_id_to_spy][4] = '0';
                save_important_vars();
                GLOB_next_id = frigo_id_to_spy+1;
                wait_sec=2;
            } else if (dateESP.response.message.match('vacance')) {
                blit_message(''+GLOB_persistedData["frigos"][frigo_id_to_spy][0]+' <span style="float: none;margin: 0;color:#d43635">est en vacances</span>');
                GLOB_persistedData["frigos"][frigo_id_to_spy][0] = '[Vacances] ' + GLOB_persistedData["frigos"][frigo_id_to_spy][0];
                GLOB_persistedData["frigos"][frigo_id_to_spy][4] = '0';
                save_important_vars();
                GLOB_next_id = frigo_id_to_spy+1;
                wait_sec=2;
            } else if (dateESP.response.message.match('novice')) {
                blit_message(''+GLOB_persistedData["frigos"][frigo_id_to_spy][0]+' <span style="float: none;margin: 0;color:#d43635">est un novice</span>');
                GLOB_persistedData["frigos"][frigo_id_to_spy][0] = '[Novice] ' + GLOB_persistedData["frigos"][frigo_id_to_spy][0];
                GLOB_persistedData["frigos"][frigo_id_to_spy][4] = '0';
                save_important_vars();
                GLOB_next_id = frigo_id_to_spy+1;
                wait_sec=2;
            } else if (dateESP.response.message.match('pas assez de deutérium')) {
                blit_message('<span style="float: none;margin: 0;color:#d43635">Pas assez de deutérium</span> pour espionner '+GLOB_persistedData["frigos"][frigo_id_to_spy][0]);
                GLOB_next_id = frigo_id_to_spy+1;
                wait_sec=2;
            } else if (dateESP.response.message.match('pas de vaisseaux') && frigo_id_to_spy == 0) {
                blit_message('<span style="float: none;margin: 0;color:#d43635">Pas de vaisseaux</span> pour espionner. Retour.');
                $('#auto_attack').html('&#9658; Aucun vaisseau ne permet d\'espionner vos frigos');
                $('#spy_all').html('&#9658; Espionnage des frigos terminé.');
                $('#spy_all').css('color','#F02020');
                $('#rap_gene').html('&#9658; Aucun espionnage effectué.');
                $('#rap_gene').css('color','#F02020');
                clearTimeout(spyTimeout);
                GLOB_abandonne_spy = true;
                setTimeout(function(){window.location.href = window.location.href.replace(gup('page'), 'overview').replace('&startAA=1', '').replace('&sephiScript=1', '');}, 10000);
                return;
            } else {
                GLOB_next_id = frigo_id_to_spy;
                //Imp2Toulouse- Increase de delay for waiting spy back
                wait_sec=rand(6,15);
                setTimeout(function(){blit_message('<span style="float: none;margin: 0;">Erreur d\'espionnage : '+dateESP.response.message+'<br>Nouvel essai dans '+wait_sec+' secondes</span>');}, 2000);
                $('#spy_all').html('&#9658; Espionnage des frigos en cours... (Nouvel essai dans '+wait_sec+' secondes)');

                // Au bout de 5 erreurs on abandonne
                if (want_a_AA && GLOB_nb_tries>5 && GLOB_next_id==0) {
                    $('#auto_attack').css("color", '#F02020');
                    if (readData('aa_enable','AA') == 'oui') $('#auto_attack').html('&#9658; Rapport général + Auto-Attaque reportés dans une heure (impossible d\'espionner)');
                    else $('#auto_attack').html('&#9658; Rapport général reporté dans une heure (impossible d\'espionner)');
                    GLOB_abandonne_spy = true;
                    if (gup('startAA') == '1') {
                        storeData('progTime', (time() + 60*60*1000).toString(), 'AA' ); // re-essaye dans 60min
                        storeData('isProg', 'oui', 'AA' );
                        setTimeout(function(){window.location.href = window.location.href.replace(gup('page'), 'overview').replace('&startAA=1', '').replace('&sephiScript=1', '');}, 10000);
                    }
                }
            }

            if (spy_all) {
                while (GLOB_next_id < GLOB_persistedData["frigos"].length && (parseInt(GLOB_persistedData["frigos"][GLOB_next_id][4]) <= 0 || GLOB_persistedData["frigos"][GLOB_next_id][6] == '1')) GLOB_next_id++;
                if(GLOB_next_id < GLOB_persistedData["frigos"].length) {
                    setTimeout(launch_spy, wait_sec*1500);
                } else {
                    spy_all=false;
                    document.getElementById('spy_all').style.color='#109E18';
                    document.getElementById('spy_all').innerHTML='&#9658; Espionnage des frigos terminé';
                    if(want_a_RG) {
                        setTimeout(function(){blit_message_time("Attendez sur cette page, le script ira lire les rapports au retour des sondes.",20000);},3000);
                        document.getElementById('rap_gene').style.color='#808080';
                        document.getElementById('rap_gene').innerHTML='&#9658; En attente du retour des sondes...';
                        clearTimeout(superSpyAllTimeout);
                        setTimeout(check_espionnage_finished,10000);
                        $('#eventboxFilled').click();
                    }
                }
            }

            clearTimeout(spyTimeout);
        }
    });
}

var inactif_id_to_spy : number;
function autospy(self? : any, override_id? : any){
    clearTimeout(backOverviewTimeout);
    if (GLOB_abandonne_spy) {
        GLOB_abandonne_spy=false;

        window.location.href = window.location.href.replace(gup('page'), 'overview');
        return;
    }

    var caller_id = this.id;
    if (override_id) caller_id = override_id;
    var init_spy_id = 0;
    if (caller_id == 'auto_spy') {
        GLOB_spy_fail=0;
        spy_all=true;
        inactif_id_to_spy=-1;
    } else {
        if (typeof GLOB_next_id == "undefined") GLOB_next_id = -1;
        if (spy_all) inactif_id_to_spy = GLOB_next_id;
    }

    if (inactif_id_to_spy == -1) {
        if (typeof GLOB_next_id == "undefined") GLOB_next_id = 0;
        if (spy_all) inactif_id_to_spy = GLOB_next_id;
    }

    if (inactif_id_to_spy == GLOB_TAB_INACTIF.length) {
        $('#autospy_notif').css("color", 'darkred');
        $('#autospy_notif').html('&#9658; Aucune cible inactive à espionner, retour à l\'overview dans 30 secs.');
        setTimeout(function(){
            window.location.href = window.location.href.replace(gup('page'), 'overview');
        }, 30*1000);
        return;
    }

    if(spy_all && inactif_id_to_spy==init_spy_id) {
        $('#autospy_notif').css("color", '#808080');
        $('#autospy_notif').html('&#9658; Espionnage des cibles inactives en cours...');
    }

    params = {
        mission: 6,
        galaxy: parseInt(GLOB_TAB_INACTIF[inactif_id_to_spy]["coord"].split(':')[0]),
        system: parseInt(GLOB_TAB_INACTIF[inactif_id_to_spy]["coord"].split(':')[1]),
        position: parseInt(GLOB_TAB_INACTIF[inactif_id_to_spy]["coord"].split(':')[2]),
        type: parseInt(GLOB_TAB_INACTIF[inactif_id_to_spy]["type"]),//type=1 for spy planet, type=3 for spy moon
        shipCount: parseInt(GLOB_TAB_INACTIF[inactif_id_to_spy]["nb_sondes"]),
        token: miniFleetToken
    };

    //document.getElementById('auto_attack').innerHTML='&#9658; Timeout lancé';
    if (superSpyAllTimeout !== 0) clearTimeout(superSpyAllTimeout);
    superSpyAllTimeout = setTimeout(function(){
        window.location.href = window.location.href.replace(gup('page'), 'overview');
    }, 5*60*1000);

    var spyTimeout = setTimeout(function(){
        blit_message('<span style="float: none;margin: 0;color:#d43635">Pas de réponse</span>. Nouvel essai ('+(GLOB_nb_spy_fail+1)+'/10).');
        //Imperator2Toulouse- If nb fails reached, abandon the spy process which will return to the overview
        if ( GLOB_nb_spy_fail > 10 ) {
            GLOB_abandonne_spy=true;
            clearTimeout(spyTimeout);
        } else {
            GLOB_nb_spy_fail+=1;
        }
        autospy();
    }, 5000);

    $.ajax('https://'+univers+'/game/index.php?page=minifleet&ajax=1', {
        data: params,
        dataType: "json",
        type: "POST",
        success: function(dateESP) {
            if(typeof(dateESP.newToken) != "undefined") {
                miniFleetToken = dateESP.newToken;
            }
            GLOB_nb_tries++;
            if (dateESP.response == undefined) {
                blit_message('<span style="float: none;margin: 0;color:#d43635">Erreur inconnue</span>. Nouvel essai');
                $('#auto_attack').html('&#9658; Erreur inconnue');
                clearTimeout(spyTimeout);
                setTimeout(autospy, 3000);
                return;
            }
            if (dateESP.response.message.match('en mode vacances!')) {
                blit_message('Impossible, vous êtes en mode vacances.');
                $('#autospy_notif').html('&#9658; Aucun espionnage pendant vos vacances.');
                clearTimeout(spyTimeout);
                GLOB_abandonne_spy = true;
                setTimeout(function(){window.location.href = window.location.href.replace(gup('page'), 'overview');}, 10000);
                return;
                //imp2Toulouse- Simplifacation using regular expression
            } else if (!dateESP.response.message.match(/[E|e]rreur/)) {
                $('#autospy_notif').html('&#9658; Espionnage des frigos en cours...');
                blit_message('Espionnage sur '+GLOB_TAB_INACTIF[inactif_id_to_spy]["name"]+' <span style="float: none;margin: 0;color:#109E18">démarré avec succès</span>');
                (GLOB_TAB_INACTIF[inactif_id_to_spy]["type"] == "1")?$('#row'+GLOB_TAB_INACTIF[inactif_id_to_spy]["id"]+' #planet_spy_check').css("display", 'block'):$('#row'+GLOB_TAB_INACTIF[inactif_id_to_spy]["id"]+' #moon_spy_check').css("display", 'block');
                GLOB_next_id = inactif_id_to_spy+1;
                wait_sec=rand(1,3);
            } else if (dateESP.response.message.match('planète')) {
                blit_message(''+GLOB_TAB_INACTIF[inactif_id_to_spy]["name"]+' <span style="float: none;margin: 0;color:#d43635">n\'existe plus</span>');
                GLOB_next_id = inactif_id_to_spy+1;
                wait_sec=2;
            } else if (dateESP.response.message.match('vacance')) {
                blit_message(''+GLOB_TAB_INACTIF[inactif_id_to_spy]["player_name"]+' <span style="float: none;margin: 0;color:#d43635">est en vacances</span>');
                GLOB_next_id = inactif_id_to_spy+1;
                wait_sec=2;
            } else if (dateESP.response.message.match('novice')) {
                blit_message(''+GLOB_TAB_INACTIF[inactif_id_to_spy]["player_name"]+' <span style="float: none;margin: 0;color:#d43635">est un novice</span>');
                GLOB_next_id = inactif_id_to_spy+1;
                wait_sec=2;
            } else if (dateESP.response.message.match('pas assez de deutérium')) {
                blit_message('<span style="float: none;margin: 0;color:#d43635">Pas assez de deutérium</span> pour espionner '+GLOB_TAB_INACTIF[inactif_id_to_spy]["name"]+'.');
                GLOB_next_id = inactif_id_to_spy+1;
                wait_sec=2;
            } else if (dateESP.response.message.match('pas de vaisseaux') && inactif_id_to_spy == 0) {
                blit_message('<span style="float: none;margin: 0;color:#d43635">Pas de vaisseaux</span> pour espionner '+GLOB_TAB_INACTIF[inactif_id_to_spy]["name"]+'. Retour.');
                $('#autospy_notif').html('&#9658; Aucun vaisseau ne permet d\'espionner vos frigos');
                 clearTimeout(spyTimeout);
                GLOB_abandonne_spy = true;
                setTimeout(function(){window.location.href = window.location.href.replace(gup('page'), 'overview');}, 10000);
                return;
            } else {
                GLOB_next_id = inactif_id_to_spy;
                //Imp2Toulouse- Increase de delay for waiting spy back
                wait_sec=rand(6,15);
                setTimeout(function(){blit_message('<span style="float: none;margin: 0;">Erreur d\'espionnage : '+dateESP.response.message+'<br>Nouvel essai dans '+wait_sec+' secondes</span>');}, 2000);
                $('#autospy_notif').html('&#9658; Espionnage des frigos en cours... (Nouvel essai dans '+wait_sec+' secondes)');

                // Au bout de 5 erreurs on abandonne
                if (GLOB_nb_tries>5 && GLOB_next_id==0) {
                    $('#autospy_notif').css("color", '#F02020');
                    $('#autospy_notif').html('&#9658; Auto spy reporté ulterieurement (impossible d\'espionner)');
                    GLOB_abandonne_spy = true;
                 }
            }

            if (spy_all) {
                if(GLOB_next_id < GLOB_TAB_INACTIF.length) {
                    setTimeout(autospy, wait_sec*1500);
                } else {
                    spy_all=false;
                    $('#autospy_notif').css('color','#109E18');
                    $('#autospy_notif').html('&#9658; Espionnage des frigos terminé, en attente du retour des sondes...');
                    clearTimeout(superSpyAllTimeout);
                    setTimeout(check_autospy_finished,10000);
                    $('#eventboxFilled').click();
                }
            }
            clearTimeout(spyTimeout);
        }
    });
}

function save_alert_mail() {
    var mail : string = document.getElementById('alert_mail_to').value;
    var body : string = document.getElementById('alert_mail_body').value;
    var freq : string = document.getElementById('alert_mail_freq').value;
    //Imp2Toulouse- Get back information about mail checking.
    if (checkmail(mail) == true) {
        storeData('alert_mail_to',mail,'all');
        storeData('alert_mail_body',body,'all');
        storeData('alert_mail_freq',freq,'all');
        blit_message('Vous pouvez <span style="float: none;margin: 0;color:#109E18">tester</span> l\'envoi d\'un mail.');
        document.getElementById('test-mail').style.display = 'inline';
        return ('enregistrée');
    } else {
        if (mail=='') {
            storeData('alert_mail_to',mail,'all');
            storeData('alert_mail_body',mail,'all');
            storeData('alert_mail_freq',freq,'all');
            //blit_message('La fonction d\'alerte <span style="float: none;margin: 0;color:#109E18">à été désactivée</span>.');
            document.getElementById('test-mail').style.display = 'none';
            return ('supprimée');
        } else return ('incorrecte');//blit_message('Votre adresse mail est <span style="float: none;margin: 0;color:#d43635">est incorrecte</span>.');
    }
}

function send_to_webhook(cp_attacked,coords,isOnLune,time_attack,time_arrival,planet_origin,coords_origin, total_fleets_origin,liste_fleets_origin) {
    storeData('webhook_advert_'+cp_attacked, time().toString(), 'all');	
	var message="|_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_|\nAttaque en cours sur la "+((isOnLune)?"lune":"planete")+" "+cp_attacked+" "+coords+"\n\tNom du défenseur : "+username+"\n\tHeure d'impact : "+time_arrival+"\n\tInformation attaquant:\n\t\tAttaque depuis: "+planet_origin+" "+coords_origin+"\n\t\tNombres vaisseaux: "+total_fleets_origin+"\n\t\tListe vaisseaux: "+liste_fleets_origin+"\n|_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_|\n";

	var params = JSON.stringify({ "username": "I2T", "content":message });

	/*xhr2.open("POST", url_webhook,  true);
    xhr2.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhr2.send(params);*/

    $.ajax(url_webhook, {
        data: params,
        dataType: "json",
        type: "POST",
        success: function(call) {
            blit_message_time("<font color=green><b>Avertissement</b> par message votre discord.</font>", 2000);
            console.log("Notification de votre discord.");
        }
    });
}

function send_alert_mail(cp_attacked,coords,isOnLune,time_attack) {
    sendMessage(readData('alert_mail_to','all'),'Ogame Attack Alert',readData('alert_mail_body','all').replace("[CP_NAME]",cp_attacked).replace("[CP_COORDS]",coords).replace("[CP_ISLUNE]",(isOnLune)?"Lune":"Planet").replace("[CP_IMPACTTIME]",getFormatedTime(time_attack).replace(/:/," hours, ").replace(/:/, " minutes and ")+ " seconds"),'https://'+univers+'/game/index.php?page=shipyard&sephiScript=1');
    storeData('attack_advert', time().toString(), 'all');
}

//Imp2Toulouse- Take into account eject time set
function get_start_after_less(info){ return ((info == "never")?0:parseInt(info.match(/\d/g).join(""))*60); }

function check_attack() {
    //if (have_played_alert == false && $(document.body).html().match('<div id="attack_alert" class="tooltip eventToggle')){
    if (have_played_alert == false && $("div#attack_alert").length > 0){
        xhr.onreadystatechange  = function()
        {
            if(xhr.readyState  == 4)
            {
                if(xhr.status  == 200) {
                    if (xhr.responseText.match("Flotte ennemie")) {
                        if (!xhr.responseText.match("https://gf3.geo.gfsrv.net/cdnb7/60a018ae3104b4c7e5af8b2bde5aee.gif")) {
                            setTimeout(function(){if (readData("desactive_alarm", 'all') !== 'yes') bruit_alert('http://www.sephiogame.com/script/alert_nuclear_bomb3.ogg');}, 4000);
							have_played_alert = true;
                        }

						//if (xhr.responseText.match("allianceAttack").length >0)
						//	Attaque_groupee=true
						
                        // Auto-Eject
                        //events = xhr.responseText.split('eventFleet');
						events = xhr.responseText.split('<tr class="');
                        for (i=1 ; i<events.length ; i++) {
                            if (events[i].match('Flotte ennemie') && !events[i].match("https://gf3.geo.gfsrv.net/cdnb7/60a018ae3104b4c7e5af8b2bde5aee.gif") && !events[i].match("https://gf3.geo.gfsrv.net/cdne8/583cd7016e56770a23028cba6b5d2c.gif")) {
								//Imp2Toulouse- Compatibility with antigame
                                //isOnLune = events[i].getElementsByClassName('destFleet')[0].innerHTML.match('moon'); // Impossible d'utiliser GEBCN sur cet objet
                                isOnLune=events[i].split(/<td class="destFleet">/)[1].split(/<\/td>/)[0].match("moon");

                                coords = '['+events[i].split('destCoords')[1].split('[')[1].split(']')[0]+']';
                                if (isOnLune) coords += 'Lune';
                                time_attack = parseInt(events[i].split('data-arrival-time="')[1].split('"')[0]) - Math.floor(time()/1000);
								time_arrival= events[i].split('arrivalTime">')[1].split('</td>')[0].trim();

                                cp_attacked = planet_list[planet_list_coords.indexOf(coords)];
								planet_origin = events[i].split('originFleet">')[1].split('</td>')[0].split('</figure>')[1].trim();
								coords_origin = '['+events[i].split('coordsOrigin')[1].split('[')[1].split(']')[0]+']';
								total_fleets_origin = events[i].split('detailsFleet">')[1].split('<span>')[1].split('</span>')[0].trim();
								liste_fleets_origin = events[i].split('icon_movement">')[1].split('Vaisseaux:')[1].split('&lt;/table&gt;')[0].replace(/(<(?:.|\n)*?>)/gm, ' ').replace(/(&lt;(?:.|\n)*?&gt;)/gm, ' ').replace(/\s+/gm, ' ');
                                //Get attaker playerid
                                attaker_playerid=parseInt(events[i].match(/data-playerId="(\d+)"/)[1]);
                                //If using Antigame
                                //if ($("#eventboxContent #eventContent .ago_eventlist_activity img")) {
                                if ( GLOB_cur_planet == cp_attacked && readData("advertAttaker", 'all') === "1" && readData("attakerNotified", "AA") != cp_attacked)
                                    setTimeout(send_internal_message(attaker_playerid,cp_attacked),parseInt(rand(3,5))*60000);

                                //Imp2Toulouse- Add frequency defined in param
                                if (alert_mail_to !== '' && (readData('attack_advert','all') == null || (time()-parseInt(readData('attack_advert','all'))) > parseInt(readData('alert_mail_freq','all'))*60*1000) )
                                    setTimeout(send_alert_mail(planame_list[planet_list_coords.indexOf(coords)],coords,isOnLune,time_attack),2000);
								
								/*if (readData('webhook_advert_'+cp_attacked,'all') == null && (url_webhook != null || url_webhook.trim() != "")) {
                                    setTimeout(send_to_webhook(planame_list[planet_list_coords.indexOf(coords)], coords, isOnLune, time_attack, time_arrival, planet_origin, coords_origin, total_fleets_origin, liste_fleets_origin), 2000);
                                }*/
                                if (time_attack > start_after_less) return;

                                if (readData('escaped_'+cp_attacked, 'all') !== null && time() - parseInt(readData('escaped_'+cp_attacked, 'all')) < 20*60*1000) {
                                    if (cp_attacked == GLOB_cur_planet && eject_auto !== 'never') setTimeout(function(){blit_message("Auto-eject inactif pour "+parseInt(20 - (time() - parseInt(readData('escaped_'+cp_attacked, 'all')))/1000/60)+" minutes");}, 5000);
                                    return;
                                }

                                if (cp_attacked !== GLOB_cur_planet) {
                                    setTimeout(function(){blit_message("Changement de planète prévu pour gérer l'attaque");}, 5000);
                                    setTimeout(function(){
                                        window.location.href = 'https://'+univers+'/game/index.php?page=overview&eject=yes&cp='+cp_attacked;
                                    }, 15000);
                                } else {
                                    if (eject_auto == 'never') {
                                        storeData('escaped_'+cp_attacked, time().toString(), 'all');
                                        setTimeout(function(){blit_message("L'auto-éjection des vaisseaux n'est pas activée.");}, 10000);
                                    } else {
                                        blit_message("Auto-eject dans 10 secondes...");
                                        setTimeout(function(){
                                            storeData('escaped_'+cp_attacked, time().toString(), 'all');
                                            //Imp2Toulouse- adapt type regarding target moon
                                            window.location.href = 'https://'+univers+'/game/index.php?page=fleet1&galaxy='+eject_gal+'&system='+eject_sys+'&position='+eject_pla+'&type='+(isOnLune?3:1)+'&mission=3&eject=yes&cp='+cp_attacked;
                                        }, 10000);
                                        return;
                                    }
                                }
                            }
                        }
                    } else // If attakerNotif cookie = cur_planet set we delete it
                    if (readData("attakerNotified", "AA") == GLOB_cur_planet) removeData("attakerNotified", "AA");
                }
            }
        };

        xhr.open("POST", "https://"+univers+"/game/index.php?page=eventList",  true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.send();
    }
	setTimeout(check_attack, rand(4,6)*1000);
}

function send_internal_message(attakerChatID, cp_attacked){
    if (readData("msg_text", 'all') === null || readData("msg_text", 'all') === ''){
        var msg_text = {
            "intro":[ "Salut,\\n","Bonjour,\\n","Coucou,\\n","Salutation,\\n" ],
            "corps":[
                [ "J'ai vu ton attaque. \\n", "Je t'ai vu canaillou avec ton attaque. \\n", "J'ai cru voir une grosse attaque:) \\n", "Malgré que tu sois mon attaquant favori, \\n" ],
                [ "J'enleverai tout avant ton arrivé afin de ne plus être rentable. \\n", "Je vais enlever avant ton arrivé. \\n", "Je t'informe, afin de ne pas te faire perdre ton temps, que j'enleverai tout avant ton arrivé. Autant que tu concentres ton attaque sur quelqu'un de plus rentable. \\n", "Tu te doutes bien que puisque je t'ai vu, je vais enlever tous le pillable avant ton arrivé. \\n" ]
            ],
            "politesse":[ "Bon jeu.\\n","A plus tard et bon jeu.\\n","Bonne journée et bon jeu.\\n","Bonne continuation dans le jeu.\\n" ],
        };
        storeData("msg_text", JSON.stringify(msg_text), 'all');
    } else
        msg_text=JSON.parse(readData("msg_text", 'all'));

    var attaker_message_url='https://'+univers+'/game/index.php?page=ajaxChat';
    //Introduction
    text=msg_text.intro[parseInt(rand(1,4))].replace("\\n","\n");

    //Objectif1
    text+=msg_text.corps[0][parseInt(rand(1,4))].replace("\\n","\n");

    //Objectif2
    text+=msg_text.corps[1][parseInt(rand(1,4))].replace("\\n","\n");

    //Politesse
    text+=msg_text.politesse[parseInt(rand(1,4))].replace("\\n","\n")+"\n"+playerName;

    var params = {
        ajax: 1,
        mode: 1,
        playerId: attakerChatID,
        text: text
    }
    $.ajax(attaker_message_url, {
        data: params,
        dataType: "json",
        type: "POST",
        success: function(call) {
            storeData("attakerNotified", cp_attacked, "AA");
            blit_message_time("<font color=green><b>Avertissement</b> de l'attaquant par message interne.</font>", 6000);
            console.log("internal message sent '"+text+"'.");
        }
    });
}

function is_AA_blocked_by_time() {
    if (readData('time_no_AA','AA') !== 'oui') return false;

    var start_time  = get_cool_time(readData('time_no_AA_start','AA')/1000).split("<")[0].split("h");
    var end_time    = get_cool_time(readData('time_no_AA_end','AA')/1000).split("<")[0].split("h");
    start_time = parseInt(start_time[0])*60 + parseInt(start_time[1]);
    end_time = parseInt(end_time[0])*60 + parseInt(end_time[1]);
    // We've got the two times in minutes.

    var dateObj = new Date();
    var now = dateObj.getHours()*60 + dateObj.getMinutes();

    // It means end time is actually for the next day compared to start time, so we adapt by adding 24h
    if (end_time < start_time) end_time += 24*60
    if (now < start_time) now += 24*60

    // Now we are able to compare
    return start_time <= now && now <= end_time;
}

function check_espionnage_finished() {
    xhr.onreadystatechange = function(){
        if(xhr.readyState  == 4)
        {
            if(xhr.status  == 200) {
                if (!xhr.responseText.match("https://gf3.geo.gfsrv.net/cdnb7/60a018ae3104b4c7e5af8b2bde5aee.gif")) {
                    bonus = '';
                    if (want_a_AA) {
                        storeData('last_start', time().toString(), 'AA');
                        bonus = '&AA=OUI';
                    }
                    setTimeout(function(){window.location.href = 'https://'+univers+'/game/index.php?page=messages&RG=OUI'+bonus;}, 5000);
                } else {
                    document.getElementById('rap_gene').innerHTML='&#9658; En attente du retour des sondes... (Il reste '+(xhr.responseText.split("https://gf3.geo.gfsrv.net/cdnb7/60a018ae3104b4c7e5af8b2bde5aee.gif").length-1)+' évènements d\'espionnage)' ;
                }
            }
        }
    };

    xhr.open("POST", "https://"+univers+"/game/index.php?page=eventList",  true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send();

    setTimeout(check_espionnage_finished,rand(4,8)*1000);
}

function check_autospy_finished(){
    xhr.onreadystatechange = function(){
        if(xhr.readyState  == 4)
        {
            if(xhr.status  == 200) {
                if (!xhr.responseText.match("https://gf3.geo.gfsrv.net/cdnb7/60a018ae3104b4c7e5af8b2bde5aee.gif")) {
                    $('#autospy_notif').html('&#9658; L\'ensemble des cibles inactives ont été sondées.');
                    return;
                } else {
                    $('#autospy_notif').html('&#9658; En attente du retour des sondes... (Il reste '+(xhr.responseText.split("https://gf3.geo.gfsrv.net/cdnb7/60a018ae3104b4c7e5af8b2bde5aee.gif").length-1)+' évènements d\'espionnage).');
                }
            }
        }
    };

    xhr.open("POST", "https://"+univers+"/game/index.php?page=eventList",  true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send();

    setTimeout(check_autospy_finished,rand(4,8)*1000);
}

function get_fleets_capacity(outType="array", obj) {
    if ($(obj).length > 0) {
        var temp_fleets_volume=[];
        var temp_ships_volume="";
        $(obj).each(function(){
            temp_fleets_volume[$(this)[0].id] = $(this).find('a span.ecke span.level').html().match(/<\/span>(.*)$/)[1].replace('.','');
            temp_ships_volume+=$(this)[0].id.replace("button","am") +"="+ $(this).find('a span.ecke span.level').html().match(/<\/span>(.*)$/)[1].replace('.','') +"&";
        });
        return ((outType == "array")?temp_fleets_volume:temp_ships_volume.substr(0,temp_ships_volume.length-1));
        var temp_fleets_volume=null;temp_ships_volume=null;
    }
}

function check_attack_reload() {
    //Inutilisé
    if ($(document.body).html().replace('<div id="attack_alert" style="visibility:visible;">','') == $(document.body).html()){
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
        xhr.open("POST", "https://"+univers+"/game/index.php?page=eventList"+bonus_planet,  true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.send();
        setTimeout(check_attack_reload, rand(4,6)*1000);
    }
}

function update_timers() {
    ress_metal = $("span#resources_metal").html().match(/\d/g).join("");
    ress_crystal = $("span#resources_crystal").html().match(/\d/g).join("");
    ress_deuterium = $("span#resources_deuterium").html().match(/\d/g).join("");

    prod_metal = parseInt(GLOB_persistedData["prods"][0]);
    prod_crys = parseInt(GLOB_persistedData["prods"][1]);
    prod_deut = parseInt(GLOB_persistedData["prods"][2]);

    tot_boss=0;
    tot_cost_met=0;
    tot_cost_crys=0;
    tot_cost_deut=0;


    if (prod_metal !== null && prod_crys !== null && prod_deut !== null) {
        for (var i_timers=0 ; i_timers<GLOB_persistedData["listPrev"].length && GLOB_persistedData["listPrev"][i_timers]; i_timers++) {
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

function gestion_cook() {
    ress_metal = parseInt($("span#resources_metal").html().match(/\d/g).join(""));
    ress_crystal = parseInt($("span#resources_crystal").html().match(/\d/g).join(""));
    ress_deuterium = parseInt($("span#resources_deuterium").html().match(/\d/g).join(""));

    for (var programationId=0 ; programationId<GLOB_persistedData["listPrev"].length && GLOB_persistedData["listPrev"][programationId]; programationId++) {
        pref = get_prev_data("page", programationId);
        if (get_prev_data("havetoprev", programationId) == "yes") {
            if (!(parseInt(get_prev_data('cur_met_prev', programationId)) <= parseInt(ress_metal) && parseInt(get_prev_data('cur_crys_prev', programationId)) <= parseInt(ress_crystal) && parseInt(get_prev_data('cur_deut_prev', programationId)) <= parseInt(ress_deuterium) ))
                return;

            cooldown_class=(document.getElementById('Countdown') !== null && document.getElementById('Countdown').innerHTML !== 'terminé');
            cooldown_research=(document.getElementById('researchCountdown') !== null && document.getElementById('researchCountdown').innerHTML !== 'terminé');
            cooldown_ship=(document.getElementById('shipCountdown') !== null && document.getElementById('shipCountdown').innerHTML !== 'terminé');

            cooldownOK = ((pref=="resources" || pref=="station") && (gup("page") == "resources" || gup("page") == "station") && !cooldown_class)
                || (pref=="research" && gup("page") == "research" && !cooldown_research)
                || ((pref=="shipyard" || pref=="defense") && (gup("page") == "shipyard" || gup("page") == "defense") && !cooldown_ship)
                || (gup("page") == "overview" && ( ((pref=="resources" || pref=="station") && !cooldown_class) || (pref=="research" && !cooldown_research) || ((pref=="shipyard" || pref=="defense") && !cooldown_ship) ));

            multip = 1;
            if (get_prev_data("form_number", programationId) !== null && get_prev_data("form_number", programationId) !== "") multip = parseInt(get_prev_data("form_number", programationId));


            if (cooldownOK && gup('sephiScript') != '1') {
                if(get_prev_data("page", programationId) !== gup('page'))  {
                    blit_message("Démarrage dans 5s de : "+get_prev_data("title", programationId).replace(/_esp_/g, ' '));
                    setTimeout(function(){window.location.href = window.location.href.replace(gup('page'),get_prev_data("page", programationId));}, 5000);
                    return;
                }

                xhr.onreadystatechange=function(){
                    if(xhr.readyState  == 4) {
                        if(xhr.status  == 200) {
                            $('#detail').html(xhr.responseText);
                            cost_metal = parseInt(get_cost(xhr.responseText, "metal"));
                            cost_crystal = parseInt(get_cost(xhr.responseText, "crystal"));
                            cost_deuterium = parseInt(get_cost(xhr.responseText, "deuterium"));
                            just_dimin_number = false;

                            if ((cost_metal>ress_metal || cost_crystal>ress_crystal || cost_deuterium>ress_deuterium) && (cost_metal !== parseInt(get_prev_data('cur_met_prev', programationId)) || cost_crystal !== parseInt(get_prev_data('cur_crys_prev', programationId)) || cost_deuterium !== parseInt(get_prev_data('cur_deut_prev', programationId))) ){
                                set_prev_data("cur_met_prev", programationId, cost_metal);
                                set_prev_data("cur_crys_prev", programationId, cost_crystal);
                                set_prev_data("cur_deut_prev", programationId, cost_deuterium);
                                save_important_vars();
                                blit_message('<span style="float: none;margin: 0;color:#109E18">Coûts mis à jour</span>, retour sur vue d\'ensemble dans 2 secondes');
                                setTimeout(function(){window.location.href = window.location.href.replace(gup('page'), 'overview');}, 3000);
                            } else {
                                //add length >1 because with new version 6.0.5, Ogame has add a condition which match with "build-it_disabled" --> $(".build-it_disabled:not(.isWorking)")
                                if ( xhr.responseText.match("class=\"build-it_disabled") != null) { /*&& xhr.responseText.match("build-it_disabled").length > 1 && xhr.responseText.match("$(\".build-it_disabled:not(.isWorking)\")"*/ /*xhr.responseText.match("build-it_disabled")*/
                                    blit_message('<span style="float: none;margin: 0;color:red">Impossible de démarrer</span>, retour sur vue d\'ensemble dans 3 secondes');
                                    set_prev_data("havetoprev", programationId, "no");
                                    set_prev_data("donned", programationId, "yesno"+(time()+(1000*60*10)));
                                    save_important_vars();
                                    setTimeout(function(){window.location.href = window.location.href.replace(gup('page'), 'overview');}, 3000);
                                } else {
                                    multipText = "";
                                    if (get_prev_data("form_number", programationId) !== null && get_prev_data("form_number", programationId) !== "") {
                                        good_j=1;
                                        for (j=1; j<=parseInt(get_prev_data("form_number", programationId)) ; j++) {
                                            if (j*parseInt(get_prev_data('cur_met_prev', programationId)) < parseInt(ress_metal) && j*parseInt(get_prev_data('cur_crys_prev', programationId)) < parseInt(ress_crystal) && j*parseInt(get_prev_data('cur_deut_prev', programationId)) < parseInt(ress_deuterium)) {
                                                good_j = j;
                                            }
                                        }

                                        multipText ='<input name="menge" value="'+good_j+'">';
                                        if (parseInt(get_prev_data("form_number", programationId))-good_j >= 1) {
                                            just_dimin_number = true;
                                        }
                                        setTimeout(function(){$("#number").val(good_j);}, 1000);
                                    }

                                    blit_message('<span style="float: none;margin: 0;color:#109E18">Les ressources sont suffisantes</span> : démarrage dans 2 à 4 secondes.');
                                    setTimeout(function(){
                                        if (just_dimin_number){
                                            set_prev_data("form_number", programationId, parseInt(get_prev_data("form_number", programationId))-good_j);
                                            set_prev_data("havetoprev", programationId, "yes");
                                            set_prev_data("donned", programationId, "no");
                                        } else {
                                            set_prev_data("havetoprev", programationId, "no");
                                            set_prev_data("donned", programationId, "yes");
                                            storeData("back_to_overview", "yes", 'all');
                                            storeData("change_planet", "yes", 'all');
                                        }
                                        save_important_vars();
                                        //Note: Ne pas transformer en Jquery, ca bug $('#form_finished').submit()
                                        document.getElementById('form_finished').submit();
                                    }, rand(2,4)*1000);
                                }
                            }
                        } else $('#detail').html("Error code " + xhr.status);
                    }
                };

                $('#detail').css("display", 'block');
                if (document.getElementById('techDetailLoading') != null) $('#techDetailLoading').css("display", 'block');

                bonus_planet = "";
                if(gup('cp') !== "") bonus_planet = "&cp="+gup('cp');
                xhr.open("POST", "https://"+univers+"/game/index.php?page="+gup('page')+"&ajax=1"+bonus_planet,  true);
                xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                var data = "type=" + get_prev_data("form_type", programationId);
                xhr.send(data);


                break;
            } else {
                // Il manque plus que le cooldonw, on bouge plus si moins de 5 minutes
                if ((pref=="resources" || pref=="station")) tmp = document.getElementById('Countdown');
                if (pref=="research") tmp = document.getElementById('researchCountdown');
                if ((pref=="shipyard" || pref=="defense")) tmp = document.getElementById('shipCountdown');

                if (tmp !== null) {
                    tmp = tmp.innerHTML.split('m');
                    if (tmp.length == 1 || parseInt(tmp[0]) <= 5) GLOB_planet_change_inhibited = true;
                    if (tmp[0].replace('h','') !== tmp[0]) GLOB_planet_change_inhibited = false;
                    if (!changementAnnuleBlited && GLOB_planet_change_inhibited && nb_planet>1) {
                        changementAnnuleBlited = true;
                        blit_message('Changement de planète annulé dans l\'<span style="float: none;margin: 0;color:#109E18">attente d\'une construction</span>.');
                    }
                }
                //Imp2Toulouse- Add this condition cause getting error on Galaxy page where info_prog_time is not used
                h = document.getElementById('info_prog_time_'+programationId);
                if (h != null) {
                    if (h.innerHTML.match('>') || !h.innerHTML.match('Prêt')) break;
                }
            }
        }
    }
}

function finish_rapport_general() {
    data+='</tbody></table>';
    if (count_esp == 0) {
        $('#rapport_gen').html('&#9658; Aucun nouveau rapport d\'espionnage');
        $('#rapport_gen').css('color', '#808080');
    } else {
        $('#rapport_gen').html('&#9658; Rapport général en cours de création');
        $('#rapport_gen_place').html(data);
        $('#rapport_gen_place').css('display', 'block');
        GLOB_rgID = 1;
        GLOB_rgMaxID = count_esp;
        GLOB_rgButins = new Array();
        fill_rapport_general();
    }
}

function delete_msg(id){
    params="messageId="+id+"&action=103&ajax=1";
    $.ajax("https://"+univers+"/game/index.php?page=messages", {
        dataType: "text",
        data: params,
        type: "POST",
        success: function(response) {return true;},
        failed: function(response) {console.log("Fail to delete message '"+id+"'.");return false;}
    });
}

function get_msg(id){
    params="newMessageIds=[]&player="+id+"&action=111&ajax=1";
    $.ajax("https://"+univers+"/game/index.php?page=messages", {
        dataType: "text",
        data: params,
        type: "POST",
        success: function(response) {return(response);},
        error: function(response) {return false;}
    });
}

function read_rapports_and_create_table() {

    if (stopMail) return;

    params="messageId=-1&tabid=20&action=107&pagination="+cur_mail_page+"&ajax=1";
    $.ajax("https://"+univers+"/game/index.php?page=messages", {
        dataType: "text",
        data: params,
        type: "POST",
        success: function(response) {
            if (tot_mail_page == 0 ) tot_mail_page=parseInt($(response).find("li.curPage").html().split("/")[1]);
            console.log("Look for message(s) on page "+cur_mail_page+"...");
            elems=$(response).find("li."+class_bonus);

            if (elems.length == 0 || (cur_mail_page > tot_mail_page)) {
                no_more_new_esp = true;
                stopMail = true;
                console.log("   no message found on this page ....");
            } else console.log("   "+elems.length+" message(s) found on this page ....");

            $(elems).each(function(index){
                //Stop point if all message read
                if (stopMail == true) return;
                if (document.getElementById('with_readed_RG').checked && count_esp>=nb_limit*2) return;

                console.log("Message n°"+index+" title="+$(this).find("span.msg_title").text());
                console.log("  --> action=reading");
                if ($(this).find("span.msg_title").text().match(/Rapport d`espionnage de.*\[\d+:\d+:\d+\]/) != null) {

                    console.log("  --> action=checking ok, treat this message");
                    no_more_new_esp = false;
                    [,planame,galaxy,system,planet]=$(this).find("span.msg_title a").text().trim().match(/(.*) \[(\d+):(\d+):(\d+)\]/);
                    coord = '['+galaxy+":"+system+":"+planet+']';
                    //Imp2Toulouse: Replace by function
                    idFrig=is_frigo(GLOB_persistedData["frigos"],coord);
                    if (idFrig>=0 || gup('RG') !== 'OUI') {
                        count_esp++;
                        url = '';
                        process_espionnage_data($(this).find("span.ctn4 .resspan"));
                        url = "puredata:"+Math.floor(type_multip*(met+cri+deu));
                        color='';
                        if ($(this).html().match('status_abbr_honorableTarget')) color='color:#FFFF66;';
                        if ($(this).html().match('status_abbr_active')) color='color:#fff;';
                        if ($(this).html().match('status_abbr_inactive')) color='color:#6E6E6E;';
                        if ($(this).html().match('status_abbr_longinactive')) color='color:#4F4F4F;';

                        var flottes = null, defense = null;
                        if ($(this).find('.msg_content div.compacting:eq(3) span:eq(0):contains("Flottes:")').length > 0 && idFrig >=0) {
                            flottes = parseInt($(this).find('.msg_content div.compacting:eq(3) span:eq(0):contains("Flottes:")').html().match(/\d/g).join(""));
                            if ($(this).find('.msg_content div.compacting:eq(3) span:eq(0):contains("Flottes:")').html().match('M')) flottes*=1000000;
                            if ($(this).find('.msg_content div.compacting:eq(3) span:eq(0):contains("Flottes:")').html().match(',')) flottes/=100;
                            GLOB_persistedData['frigos'][idFrig][9]=flottes;
                        }
                        if ($(this).find('.msg_content div.compacting:eq(3) span:eq(1):contains("Défense:")').length > 0 && idFrig >=0) {
                            defense = parseInt($(this).find('.msg_content div.compacting:eq(3) span:eq(1):contains("Défense:")').html().match(/\d/g).join(""));
                            if ($(this).find('.msg_content div.compacting:eq(3) span:eq(1):contains("Défense:")').html().match('M')) defense*=1000000;
                            if ($(this).find('.msg_content div.compacting:eq(3) span:eq(1):contains("Défense:")').html().match(',')) defense/=100;
                            GLOB_persistedData['frigos'][idFrig][10]=defense;
                        }

                        if (idFrig >= 0 && ($(this).find('.msg_content div.compacting:eq(3) span:eq(0):contains("Flottes:")').length > 0 || $(this).find('.msg_content div.compacting:eq(3) span:eq(1):contains("Défense:")').length > 0)) save_important_vars();

                        data += '<tr id="rap_general_line_'+count_esp+'"><td id="rap_general_coord_'+count_esp+'" style="border: 1px solid #303030;padding: 5px 8px;text-align:center;height: 28px;">'+coord+'</td>';
                        data += '<td style="border: 1px solid #303030;padding: 5px 8px;"><a target=_blank style="text-decoration:none;'+color+'" href="https://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1" onclick="this.style.textDecoration=\'line-through\'"><span id="rap_general_planet_name_'+count_esp+'">'+planame+'</span></a><span id="url_rap_esp_'+count_esp+'" style="display:none;">'+url+'</span></td>';
                        data += '<td id="rap_general_butin_'+count_esp+'" style="border: 1px solid #303030;padding: 5px 8px;text-align:center;font-weight:bold;color:#FF9600;">-</td>';
                        data += '<td id="rap_general_attack_'+count_esp+'" style="border: 1px solid #303030;padding: 5px 8px;text-align: center;">Veuillez Patienter...</td>';
                        data += '</tr>';
                        count_esp++;
                        data += '<tr id="rap_general_line_'+count_esp+'"><td id="rap_general_coord_'+count_esp+'" style="border: 1px solid #303030;padding: 5px 8px;text-align:center;height: 28px;">'+coord+'</td>';
                        data += '<td style="border: 1px solid #303030;padding: 5px 8px;"><a target=_blank style="text-decoration:none;'+color+'" href="https://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1" onclick="this.style.textDecoration=\'line-through\'"><span id="rap_general_planet_name_'+count_esp+'">'+planame+' (2)</span></a><span id="url_rap_esp_'+count_esp+'" style="display:none;">second</span></td>';
                        data += '<td id="rap_general_butin_'+count_esp+'" style="border: 1px solid #303030;padding: 5px 8px;text-align:center;font-weight:bold;color:#FF9600;">-</td>';
                        data += '<td id="rap_general_attack_'+count_esp+'" style="border: 1px solid #303030;padding: 5px 8px;text-align: center;">Veuillez Patienter...</td>';
                        data += '</tr>';
                        console.log("  --> action=treating ok");
                    }
                }
            });
            $(elems).each(function(index) {
                if (stopMail == true) return;
                if (document.getElementById('with_readed_RG').checked && count_esp>=nb_limit*2) return;
                console.log("Message n°"+index+" title="+$(this).find("span.msg_title").text());
                if ($(this).find('.msg_head .fright .js_actionKill')) {
                    delete_msg($(this).attr("data-msg-id"));
                    console.log("  --> action=deleting");
                }
            });
            if (document.getElementById('with_readed_RG').checked && count_esp>=nb_limit*2) {
                blit_message("Le nombre demandé de rapport a été lu. C'est parti !");
                stopMail = true;
            }
            if (no_more_new_esp && !document.getElementById('with_readed_RG').checked) {
                blit_message("Tout les nouveaux rapports ont été lus. C'est parti !");
                stopMail = true;
            }
            if (stopMail) {
                finish_rapport_general();
                return;
            }

            // On passe à la page suivante
            cur_mail_page++;
            setTimeout(read_rapports_and_create_table, 3000);
        }
    });
    //Compatibility Antigame
    var AGO_actif=($("#content").attr("ago-status") == 1);
}

function start_rapport_general() {
    document.getElementById('rapport_gen').style.cursor = 'default';
    document.getElementById('rapport_gen').onclick=function(){return 1;};
    document.getElementById('rapport_gen').innerHTML = '&#9658; Veuillez patienter...';
    document.getElementById('rapport_gen').style.color = '#808080';

    data='<iframe style="display:none;" id="ifr_AA" src="https://ready"></iframe>';

    // Auto expédition
    if (with_exped !== 'non' && document.getElementById('AA_RG').checked) {
        waitingExped = true;
        tmp = cur_planet_coords.replace('[','').replace(']','').replace('Lune','').split(':');
        galaxy = tmp[0];
        system = parseInt(tmp[1]) - 10 + rand(0,20);
        planet = 16;
        if (system<1) system = rand(1,4);
        if (system>499) system = rand(495,499);
        //Imperator2Toulouse- Launch expedition with flotte_perso
        data+='<iframe style="display:none;" id="ifr_AA_exped" src="https://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=15&auto=yes&ID=Exped&GT='+parseInt(with_exped)+'&flotte_perso='+with_exped_perso+'&blockswitchplanet=yes"></iframe>';
        data +='<div id="exped_launch" style="color:#999;padding:5px;text-align:left;color: #A52592;">Démarrage d\'une expédition...</div>';
        storeData('AA_Exp','wait','all')
        exp_verif = setInterval(function(){
            e = document.getElementById('exped_launch');
            if (readData('AA_Exp','all').match('IS_OK')) {e.innerHTML = 'Expédition envoyée avec succès'; e.style.color='#fcce00';clearTimeout(ext_timeout);attack_cur();clearInterval(exp_verif);}
            else if (readData('AA_Exp','all') !== 'wait') {e.innerHTML = 'Impossible de démarrer une expédition'; e.style.color='#A01010';clearTimeout(ext_timeout);attack_cur();clearInterval(exp_verif);}
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
            if (document.getElementById('ifr_AA_exped')) document.getElementById('ifr_AA_exped').src = 'https://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=15&auto=yes&ID=Exped&GT='+parseInt(with_exped)+'&flotte_perso='+with_exped_perso+'&blockswitchplanet=yes';
        },3000);
    }
    data +='<table id="rap_general_table" style="width:100%;position:relative;top:0px;left:0px;border: 1px solid #000000;color: #777;background:#0D1014;margin:auto;margin-bottom:0px;"><tbody>';
    GLOB_rgEndData = '<tr style="background:#1b1b1b;color: #999;"><th style="border: 1px solid #303030;padding: 5px 8px;text-align:center;width:80px">Coord.</th><th style="border: 1px solid #303030;padding: 5px 8px;">Planète</th><th style="border: 1px solid #303030;padding: 5px 8px;text-align:center;width:100px">Butin</th><th style="border: 1px solid #303030;padding: 5px 8px;width: 170px;text-align: center;">Attaque Automatique</th></tr>';
    data+=GLOB_rgEndData;

    if (document.getElementById('with_readed_RG').checked){
        class_bonus = 'msg';
        nb_limit = parseInt(document.getElementById('NB_readed_RG').value);
    }
    read_rapports_and_create_table();
}


//Imp2Toulouse- Change function for using jquery and adapt to the new version 6.0.5
function process_espionnage_data(data) {
    type_multip = 0.5;
    if ($(data).text().match('status_abbr_honorableTarget')) type_multip = 0.75;
    $(data).each(function(){
        tmp=$(this).text().replace(',','.').match(/(Métal:|Cristal:|Deutérium:) (\S+)/);
        if (tmp != null)
            switch (tmp[1]) {
                case "Métal:":
                    if (tmp[2].match(/M/))
                        met=Math.round(parseFloat(tmp[2])*Math.pow(10,6));
                    else
                        met=tmp[2].replace('.','');
                    met=parseInt(met);
                    //console.log(tmp[1]+":"+met);
                    break;
                case "Cristal:":
                    //If have Thousand indicator
                    if (tmp[2].match(/M/))
                        cri=Math.round(parseFloat(tmp[2])*Math.pow(10,6));
                    else
                        cri=tmp[2].replace('.','');
                    cri=parseInt(cri);
                    //console.log(tmp[1]+":"+cri);
                    break;
                case "Deutérium:":
                    //If have Thousand indicator
                    if (tmp[2].match(/M/))
                        deu=Math.round(parseFloat(tmp[2])*Math.pow(10,6));
                    else
                        deu=tmp[2].replace('.','');
                    deu=parseInt(deu);
                    //console.log(tmp[1]+":"+deu);
                    break;
            }

    });
}

function fill_case(butin, flotte_perso, idFrigo, curplanet_name, check_perso_is_needed) {
    var tmp=$('#rap_general_planet_name_'+GLOB_rgID).parent().attr('href')+'&am202='+(2+Math.floor(butin/5000))+'&am203='+(2+Math.floor(butin/25000));
    $('#rap_general_planet_name_'+GLOB_rgID).parent().attr("href",tmp);
    tmp=null;
    document.getElementById('rap_general_butin_'+GLOB_rgID).innerHTML = get_cool_digit(butin);

    (check_perso_is_needed != "")?checkperso_param="&check_perso_is_needed="+check_perso_is_needed:checkperso_param="";

    attack_data = '<span id="RG_PT1_'+GLOB_rgID+'" style="cursor:pointer;font-size:12px" onclick="if (document.getElementById(\'ifr_AA\').src!==\'https://ready/\'){alert(\'Vous avez déjà une attaque en cours\');return;} document.getElementById(\'ifr_AA\').src = \'https://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+GLOB_rgID+'&PT='+(2+Math.floor(butin/5000))+'&force=0&flotte_perso='+flotte_perso+'&blockswitchplanet=yes&cp='+GLOB_cur_planet+checkperso_param+'\';setTimeout(function(){document.getElementById(\'RG_PT1_'+GLOB_rgID+'\').style.cursor=\'pointer\';},5000);document.getElementById(\'rap_general_planet_name_'+GLOB_rgID+'\').style.color = \'#761B68\';document.getElementById(\'rap_general_planet_name_'+GLOB_rgID+'\').innerHTML = \'[En Cours] '+curplanet_name+'\';">Envoyer '+(2+Math.floor(butin/5000))+' PT</span>';
    attack_data += '<br><span id="RG_GT1_'+GLOB_rgID+'" style="cursor:pointer;font-size:12px" onclick="if (document.getElementById(\'ifr_AA\').src!==\'https://ready/\'){alert(\'Vous avez déjà une attaque en cours\');return;} document.getElementById(\'ifr_AA\').src = \'https://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+GLOB_rgID+'&GT='+(2+Math.floor(butin/25000))+'&force=0&flotte_perso='+flotte_perso+'&blockswitchplanet=yes&cp='+GLOB_cur_planet+checkperso_param+'\';setTimeout(function(){document.getElementById(\'RG_GT1_'+GLOB_rgID+'\').style.cursor=\'pointer\';},5000);document.getElementById(\'rap_general_planet_name_'+GLOB_rgID+'\').style.color = \'#761B68\';document.getElementById(\'rap_general_planet_name_'+GLOB_rgID+'\').innerHTML = \'[En Cours] '+curplanet_name+'\';">Envoyer '+(2+Math.floor(butin/25000))+' GT</span>';
    attack_data += '<span id="frigoID_'+GLOB_rgID+'" style="display:none">'+idFrigo+'</span>';
    document.getElementById('rap_general_attack_'+GLOB_rgID).innerHTML = attack_data;
    GLOB_rgButins[GLOB_rgID] = new Array();
    GLOB_rgButins[GLOB_rgID][0] = butin;
    GLOB_rgButins[GLOB_rgID][1] = GLOB_rgID;

    (readData('force','AA') == 'oui')?forceparam = '&force=1':forceparam = '';
    GLOB_rgButins[GLOB_rgID][2] = 'https://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+GLOB_rgID+'&PT='+(2+Math.floor(butin/5000))+forceparam+'&flotte_perso='+flotte_perso+'&blockswitchplanet=yes&cp='+GLOB_cur_planet+checkperso_param;
    GLOB_rgButins[GLOB_rgID][3] = 'https://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+GLOB_rgID+'&GT='+(2+Math.floor(butin/25000))+forceparam+'&flotte_perso='+flotte_perso+'&blockswitchplanet=yes&cp='+GLOB_cur_planet+checkperso_param;
    GLOB_rgID++;
}

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
        idFrig=is_frigo(GLOB_persistedData["frigos"],document.getElementById('rap_general_coord_'+GLOB_rgID).innerHTML);
        //If 5 items set so a "flotte_perso" exist
        if (idFrig>=0 && GLOB_persistedData["frigos"][idFrig].length > 5) flotte_perso=GLOB_persistedData["frigos"][idFrig][5];
        ////

        mail_url = document.getElementById('url_rap_esp_'+GLOB_rgID).innerHTML.replace(/&amp;/g,'&');
        //Imperator2Toulouse- If second attack, middle butin is set
        butin = (mail_url !== "second") ? parseInt(mail_url.replace('puredata:','')) : parseInt(parseInt(document.getElementById('url_rap_esp_'+(GLOB_rgID-1)).innerHTML.replace('puredata:','')) /2);

        //Check if flotte perso need to be improved because of opponant flotte and def has changed or if flotte or def exist and flotteperso is empty
        check_perso_is_needed='';
        check_perso_is_needed=( ((parseInt(GLOB_persistedData["frigos"][idFrig][7]) >0 || parseInt(GLOB_persistedData["frigos"][idFrig][8])>0) && GLOB_persistedData["frigos"][idFrig][5] == '') || (parseInt(GLOB_persistedData["frigos"][idFrig][7])<parseInt(GLOB_persistedData["frigos"][idFrig][9])) || (parseInt(GLOB_persistedData["frigos"][idFrig][8])<parseInt(GLOB_persistedData["frigos"][idFrig][10])))?"1":"0";

        fill_case(butin, flotte_perso, idFrig, curplanet_name, check_perso_is_needed);
        fill_rapport_general();

    } else {
        // On trie le tableau
        GLOB_rgButins = GLOB_rgButins.sort(function(a,b) { return b[0] - a[0] });

        // On affiche le tableau
        for (k=0 ; k<GLOB_rgButins.length-1 ; k++) GLOB_rgEndData += '<tr>'+document.getElementById('rap_general_line_'+GLOB_rgButins[k][1]).innerHTML+'</tr>';
        document.getElementById('rap_general_table').innerHTML = GLOB_rgEndData;

        //Imp2Toulouse- clean lastRap
        removeData('lastRap', 'AA');
        storeData('lastRap', document.getElementById('rap_general_table').innerHTML, 'AA');
        //Imp2Toulouse- Add last_start in storage because it miss on first generated rapport with auto_AA (using own message results)
        storeData('last_start', time().toString(), 'AA');

        document.getElementById('rapport_gen').innerHTML = '&#9658; Rapport général réalisé avec succès';
        document.getElementById('rapport_gen').style.color = '#109E18';
        storeData('AA_feed', 'rien', 'all');
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

function clean_name(txt) {return txt.replace('[En Cours] ','').replace('[Abandon] ','').replace('[Essai 2] ','').replace('[Essai 3] ','').replace('[Essai 4] ','').replace('[Timeout 1] ','').replace('[Timeout 2] ','').replace('[Timeout 3] ','').replace('[Butin] ','').replace('<span title="Flotte envoyée">[OK]</span> ','').replace('<span title="Vous n\'avez plus assez de deuterium pour envoyer cette flotte">? [Deut]</span> ','').replace('<span title="Vous n\'avez plus de slots de flotte disponible">? [Flotte]</span> ','').replace('<span title="Votre flotte personnalisée est irréalisable">? [Perso]</span>','').replace('<span title="Vous manquez de petits transporteurs, cliquez sur \'\'forcer\'\' pour envoyer tout ceux que vous avez">? [PT]</span> ','').replace('<span title="Vous manquez de grands transporteurs, cliquez sur \'\'forcer\'\' pour envoyer tout ceux que vous avez">? [GT]</span> ','');}
function attack_cur() {
    if(GLOB_curAA_ID < GLOB_rgButins.length-1 &&
        parseInt(GLOB_rgButins[GLOB_curAA_ID][0]) > parseInt(document.getElementById('butin_AA_RG').value) &&
        (readData('AA_remain_slot', 'all') == "true" || readData('AA_remain_slot', 'all') == null)
    )  {
        encourstime = 0;
        if (!isFirstTry) encourstime = 1000;
        setTimeout(function(){
            // GLOB_rgButins[GLOB_curAA_ID][2] = url dans source de l'iframe
            if ((isFirstTry && type_vaisseaux_AA == 1) || (!isFirstTry && type_vaisseaux_AA == 2) || type_vaisseaux_AA == 3) {
                setTimeout(function(){document.getElementById('ifr_AA').src = GLOB_rgButins[GLOB_curAA_ID][2];}, 1000);
            } else {
                setTimeout(function(){document.getElementById('ifr_AA').src = GLOB_rgButins[GLOB_curAA_ID][3];}, 1000);
            }

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
        AATimeout = setTimeout(function(){
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
                document.getElementById('ifr_AA').src = 'https://ready';
                GLOB_curAA_ID++;
                attack_cur();
            }
        }, 25000);
    } else {
        launchAA=false;
		if (readData('AA_remain_slot', 'all') == "false") reason='[Flotte] ';
		else if (GLOB_curAA_ID > GLOB_rgButins.length-1 || parseInt(GLOB_rgButins[GLOB_curAA_ID][0]) < parseInt(document.getElementById('butin_AA_RG').value)) reason='[Butin] ';
		else reason='[Butin] ';
		
        for (tmp =GLOB_curAA_ID; tmp<GLOB_rgButins.length-1 ; tmp++) {
            document.getElementById('rap_general_planet_name_'+GLOB_rgButins[tmp][1]).style.color = 'darkred';
            document.getElementById('rap_general_planet_name_'+GLOB_rgButins[tmp][1]).innerHTML = reason +  clean_name(document.getElementById('rap_general_planet_name_'+GLOB_rgButins[tmp][1]).innerHTML);
        }

        blit_message("Auto attaque terminée, retour à la vue d'ensemble dans 30 secondes");
		removeData('AA_remain_slot','all');

        setTimeout(function(){
            window.location.href = window.location.href.replace(gup('page'), 'overview').replace('&sephiScript=1', '').replace('&startAA=1','');
        }, 30*1000);
    }
}
function check_AA_feedback() { // Checkout Auto Attack feedback
    if (readData('AA_feed','all') != null && readData('AA_feed','all') != 'rien') {
        ID = parseInt(readData('AA_feed','all').match(/\d/g).join(""));
        e = document.getElementById('rap_general_planet_name_'+ID);
        flotte_succes = false;

        if (readData('AA_feed','all').match('IS_OK')) {
            console.log ("e:"+e);
            e.innerHTML = '<span title="Flotte envoyée">[OK]</span> ' + clean_name(e.innerHTML); e.style.color='#109E18'; flotte_succes = true;
            // On augmente l'importance du frigo
            frigid = parseInt(document.getElementById('frigoID_'+ID).innerHTML);
            if (frigid >= 0) {
                GLOB_persistedData["frigos"][frigid][4] = parseInt(GLOB_persistedData["frigos"][frigid][4]) + 1;
                save_important_vars();
            }
        }
        fail_bec_PT = false;
        fail_bec_GT = false;
        if (readData('AA_feed','all').match('DEUT')) {e.innerHTML = '<span title="Vous n\'avez plus assez de deuterium pour envoyer cette flotte">? [Deut]</span> ' + clean_name(e.innerHTML); e.style.color='#d43635';flotte_succes = false;}
        if (readData('AA_feed','all').match('FLOTTE')) {e.innerHTML = '<span title="Vous n\'avez plus de slots de flotte disponible">? [Flotte]</span> ' + clean_name(e.innerHTML); e.style.color='#d43635';flotte_succes = false;}
        if (readData('AA_feed','all').match('DEForFLOTTE_HasCHANGED')) {e.innerHTML = '<span title="La flotte ou la defense de votre adversaire a changé, votre flotte perso n\'est peut-être plus adpatée, controler et cliquez sur \'\'forcer\'\' pour envoyer quand même.">? [CheckFlotte]</span> ' + clean_name(e.innerHTML); e.style.color='#d43635';flotte_succes = false;}
        if (readData('AA_feed','all').match('NO_PERSO')) {e.innerHTML = '<span title="Votre flotte personnalisée est irréalisable">? [Perso]</span> ' + clean_name(e.innerHTML); e.style.color='#d43635';flotte_succes = false;}
        if (readData('AA_feed','all').match('NO_PT')) {fail_bec_PT = true;e.innerHTML = '<span title="Vous manquez de petits transporteurs, cliquez sur \'\'forcer\'\' pour envoyer tout ceux que vous avez">? [PT]</span> ' + clean_name(e.innerHTML); e.style.color='#d43635';flotte_succes = false;}
        if (readData('AA_feed','all').match('NO_GT')) {fail_bec_GT = true;e.innerHTML = '<span title="Vous manquez de grands transporteurs, cliquez sur \'\'forcer\'\' pour envoyer tout ceux que vous avez">? [GT]</span> ' + clean_name(e.innerHTML); e.style.color='#d43635';flotte_succes = false;}
        if (AATimeout !== null) clearTimeout(AATimeout);
        storeData('lastRap', document.getElementById('rap_general_table').innerHTML, 'AA');
        document.getElementById('ifr_AA').src = 'https://ready';

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
        storeData('AA_feed', 'rien', 'all');
    }
    setTimeout(check_AA_feedback,500);
}

function countdownAA() {
    t=parseInt(readData('progTime','AA')) - time();
    //Imp2Toulouse
    //Add condition to avoid error when countdownAA is null
    var countdownObj = $('#countdownAA');
    if (countdownObj.length > 0) {
        if (t>0 && !is_AA_blocked_by_time()) {
            countdownObj.html(get_cool_time(t/1000));

            if (readData('time_no_AA_eject_done','AA') == 'oui') {
                storeData('time_no_AA_eject_done', 'non', 'AA');
                repeat_text = '';
                time_repeat = 0;

                if (readData('repeat', 'AA') == 'oui' && readData('repeatTime', 'AA') !== null) {
                    time_repeat = parseInt(readData('repeatTime', 'AA'));
                    repeat_text = ' <span style="color:#761B68">(Répéter toutes les <span id="AA_repeat">' + get_cool_time(time_repeat / 1000).replace('.00', '') + '</span>)</span>';
                }
                auto_attack_bar_text = 'Rapport général <span id="is_AA_enable">' + ((readData('aa_enable', 'AA') == 'oui') ? 'avec' : 'sans') + '</span> Auto-Attaque <b>prévue dans <span id="countdownAA">' + get_cool_time(time_restant / 1000) + '</span></b>' + repeat_text;
                $('span#auto_attack_bar_text').html(auto_attack_bar_text);
            }
        } else {
            var date= new Date();
            countdownObj.html((date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + 'h' + (date.getMinutes() < 10 ? '0' + date.getMinutes():date.getMinutes())+'.'+(date.getSeconds() < 10 ? '0' + date.getSeconds():date.getSeconds()));
            if (is_AA_blocked_by_time()) {
                auto_attack_bar_text = '<span style="color:darkred">Rapport général désactivé car <b>il est <span id="countdownAA">' + (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + 'h' + (date.getMinutes() < 10 ? '0' + date.getMinutes():date.getMinutes()) +'.'+ (date.getSeconds() < 10 ? '0' + date.getSeconds():date.getSeconds()) + '</span></b> (reprise à '+(readData('time_no_AA_h_end','AA') < 10 ? '0' + parseInt('0'+readData('time_no_AA_h_end','AA')):parseInt('0'+readData('time_no_AA_h_end','AA')))+'h'+(readData('time_no_AA_m_end','AA') < 10 ? '0' + parseInt('0'+readData('time_no_AA_m_end','AA')):parseInt('0'+readData('time_no_AA_m_end','AA')))+').</span>';
                $('span#auto_attack_bar_text').html(auto_attack_bar_text);
                //Si besoin d'une ejection durant la periode de désactivation des attaques
                if (readData('time_no_AA_eject_choice','AA') == 'avec' && (readData('time_no_AA_eject_done','AA') == 'non' || readData('time_no_AA_eject_done','AA') == null)) {
                    storeData('time_no_AA_eject_done','oui','AA');
                    setTimeout(startEject, 2000);
                } /*else
                 location.href = location.href;*/
            } else {
                setTimeout(startAA, 2000);
            }
        }
    }
}


function startEject(){
    blit_message_time("<b>Desactivation des Auto attaques</b><br>Lancement de l'ejection complète de votre flotte via le mode "+readData('time_no_AA_type_eject','AA')+" dans quelques secondes!",2000)
    sephi_opt="&eject=yes&ID="+readData('time_no_AA_type_eject','AA');
    switch(readData('time_no_AA_type_eject','AA')) {
        case "Exped":
//            [,galaxy,system,position]=cur_planet_coords.match(/\[(\d+):(\d+):(\d+)\]/);
            sephi_opt+='&galaxy='+gup('galaxy')+'&system='+gup('system')+'&position=16&type=1&mission=15';
            with_exped_speed = readData('time_no_AA_type_eject_exped_speed', 'AA');
            with_exped_time = readData('time_no_AA_type_eject_exped_temps', 'AA');
            sephi_opt+=((with_exped_speed == null || with_exped_speed == '')?'':"&exped_speed="+parseInt(with_exped_speed)) + ((with_exped_time == null || with_exped_time == '')?'':"&exped_time="+parseInt(with_exped_time));
            break;
        case "Transport":
            sephi_opt+='&galaxy='+eject_gal+'&system='+eject_sys+'&position='+eject_pla+'&type=1&mission=3';
            break;
        case "Recycl":
            sephi_opt+='&galaxy='+eject_gal+'&system='+eject_sys+'&position='+eject_pla+'&type=2&mission=8';
            break;
    }
    // On démarre l'Eject configuré
    window.location.href='https://'+univers+'/game/index.php?page=fleet1&cp='+GLOB_cur_planet+sephi_opt;
}

function startAA() {
    if ($(document.body).html().match('<div id="attack_alert" style="visibility:visible;">')) return;

    if (readData('repeat','AA') == 'oui' && readData('repeatTime','AA') !== null) {
        storeData('progTime', (time()+parseInt(readData('repeatTime','AA'))).toString(), 'AA');
        storeData('isProg', 'oui', 'AA');
        storeData('repeat', 'oui', 'AA');
    } else storeData('isProg', 'non', 'AA');

    // On démarre l'AA
    window.location.href='https://'+univers+'/game/index.php?page=shipyard&sephiScript=1&cp='+GLOB_cur_planet+'&startAA=1';
}

function add_auto_attack_bar() {
    if (gup('page') !== 'traderOverview' && gup('page') !== 'premium' && gup('page') !== 'galaxy'
        && gup('page') !== 'highscore' && gup('page') !== 'fleet1' && gup('page') !== 'fleet2'
        && gup('page') !== 'fleet3' && gup('page') != 'preferences'
        && readData('isProg','AA') == 'oui' && readData('progTime','AA') !== null) {
        var is_AA_blocked_by_time_result = is_AA_blocked_by_time();
        time_restant = parseInt(readData('progTime','AA')) - time();

        if (gup('startAA') == '1') return;

        if (!is_AA_blocked_by_time_result && time_restant <= 0) {
            time_restant = 0;
            startAA();
        } else {
            count_progs++;
            GLOB_nb_special_bars++;
            data += "\n"+'<div style="height:0px;position:relative;top:'+(27*(count_progs-1))+'px;">'
                +'<div id="AA_bandeau" style="cursor:default;word-wrap: normal;height:20px;'
                +'font: 700 12px Verdana,Arial,Helvetica,sans-serif;position:relative;left:-8px;padding-top:7px;'
                +'background: url(http://www.sephiogame.com/images/barre_fond.gif) no-repeat;'
                +'background-position:0px -1px;width:640px;margin-bottom:0px;color:#A52592;padding-left:40px;font-weight:normal;">';

            var auto_attack_bar_text = '';
            if (is_AA_blocked_by_time_result) {
                var date = new Date();
                auto_attack_bar_text = '<span style="color:darkred">Rapport général désactivé car <b>il est <span id="countdownAA">'
                    + (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + 'h'
                    + (date.getMinutes() < 10 ? '0' + date.getMinutes():date.getMinutes()) + '.'
                    + (date.getSeconds() < 10 ? '0' + date.getSeconds():date.getSeconds())
                    + '</span></b> (reprise à '
                    +(readData('time_no_AA_h_end','AA') < 10 ? '0' + parseInt('0'+readData('time_no_AA_h_end','AA')):parseInt('0'+readData('time_no_AA_h_end','AA')))+'h'
                    +(readData('time_no_AA_m_end','AA') < 10 ? '0' + parseInt('0'+readData('time_no_AA_m_end','AA')):parseInt('0'+readData('time_no_AA_m_end','AA')))
                    +').</span>';
                //Si besoin d'une ejection durant la periode de désactivation des attaques
                if (readData('time_no_AA_eject_choice','AA') == 'avec'
                    && (readData('time_no_AA_eject_done','AA') == 'non' || readData('time_no_AA_eject_done','AA') == null)) {
                    storeData('time_no_AA_eject_done','oui','AA');
                    setTimeout(startEject, 2000);
                }
            } else {
                repeat_text = '';
                time_repeat=0;
                if (readData('repeat','AA') == 'oui' && readData('repeatTime','AA') !== null) {
                    time_repeat = parseInt(readData('repeatTime','AA'));
                    repeat_text = ' <span style="color:#761B68">(Répéter toutes les <span id="AA_repeat">'
                        +get_cool_time(time_repeat/1000).replace('.00','')+'</span>)</span>';
                }
                auto_attack_bar_text = 'Rapport général <span id="is_AA_enable">'
                    +((readData('aa_enable','AA') == 'oui')?'avec':'sans')+'</span> Auto-Attaque '
                    +'<b>prévue dans <span id="countdownAA">'+get_cool_time(time_restant/1000)+'</span></b>'+repeat_text;
                if (readData('time_no_AA_eject_done','AA') == 'oui') {
                    storeData('time_no_AA_eject_done','non','AA');
                    $('span#auto_attack_bar_text').html(auto_attack_bar_text);
                }
            }
            data += '<p style="width:600px;height:20px;white-space: nowrap"><span id="auto_attack_bar_text">' + auto_attack_bar_text + '</span>';
            data += "\n"+'<div id="del_button_AA" style="height:0px;position:relative;left:578px;top:-20px;">'
                +'<img style="cursor:pointer;width:16px;height:auto;" src="http://www.sephiogame.com/script/newsletter-close-button.png" '
                +'title="Annuler la génération des rapports" onclick="localStorage.setItem(\''+GLOB_cur_planet+'_AA_isProg\', \'non\');'
                +'window.location.href=window.location.href.replace(\'startAA=1\',\'\');"/></div>';
            data += "\n"+'<div id="retard_AA_button" style="height:0px;position:relative;left:555px;top:-21px;">'
                +'<img style="cursor:pointer;width:16px;height:auto;" src="http://www.sephiogame.com/script/IconeChrono2.png" '
                +'title="Retarder la génération du rapport'+((readData('aa_enable','AA') == 'oui')?' avec ':' sans ')
                +'auto attaque de 15 minutes"/></div>';
            data += "\n"+'<div id="launch_AA_button" style="height:0px;position:relative;left:530px;top:-20px;">'
                +'<img style="cursor:pointer;width:16px;height:auto;" src="http://www.sephiogame.com/script/icon_launch.png" '
                +'title="Démarrer la génération du rapport'+((readData('aa_enable','AA') == 'oui')?' avec ':' sans ')
                +'auto attaque maintenant"/></div>';
            data += "\n"+'</div>';
            data += "\n"+'</div>';
            retard_AA_button = true;
            setInterval(countdownAA, 1000);
        }
    }
}

function countdownRetour() {
    t=retour_time - time() + parseInt(readData('ejection_time', 'eject'));
    if (t>0) {$('#countdownRetour').html(get_cool_time(t/1000));setTimeout(countdownRetour,1000);}
    else setTimeout(function(){window.location.href = 'https://'+univers+'/game/index.php?page=movement';}, 2000);
}


function drag_prev() {
    curY_decal = 0;
    cur_prev_id = parseInt(this.id.match(/\d/g).join(""));
    isDragingPrev= true;
    startMouseY = mouse.y;
    startMouseX = mouse.x;
    for (var u_u = 0 ; u_u<GLOB_persistedData["listPrev"].length && GLOB_persistedData["listPrev"][u_u] ; u_u++) {
        $("#block_prog_"+GLOB_persistedData["listPrev"][u_u]["original_id"]).css('zIndex', 1);
    }
    $("#block_prog_"+cur_prev_id).css('zIndex', 10000);
}

function drop_prev() {
    if (isDragingPrev) {
        isDragingPrev=false;
        curPlace = parseInt($('#prog_cur_place_'+cur_prev_id).html());
        decalY = mouse.y - startMouseY;
        decalArray = decalY/27;
        newPlace = parseInt(curPlace + decalArray);
        if (newPlace < 0) newPlace = 0;
        if (newPlace >= GLOB_persistedData["listPrev"].length) newPlace = GLOB_persistedData["listPrev"].length-1;

        apply_move_prev(cur_prev_id, curPlace, newPlace);
        save_important_vars();
        verif = setTimeout(gestion_cook, 2000);

        for (var u_u = 0 ; u_u<GLOB_persistedData["listPrev"].length && GLOB_persistedData["listPrev"][u_u]; u_u++) {
            id = get_prevID_from_place(u_u);
            $( '#block_prog_'+id ).animate({ top: (prev_positions[id]) + "px" }, {duration: 500,queue: false} );
            $( '#block_prog_'+id ).animate({ left: "0px" }, {duration: 500,queue: false} );
        }
    }
}

function update_prev_pos() {
    if (isDragingPrev) {
        curPlace = parseInt($('#prog_cur_place_'+cur_prev_id).html());
        decalY = mouse.y - startMouseY;
        decalArray = decalY/27;
        newPlace = parseInt(curPlace + decalArray);
        if (newPlace < 0) decalY = -curPlace*27 - 27;
        if (newPlace >= GLOB_persistedData["listPrev"].length) decalY = (GLOB_persistedData["listPrev"].length-1 - curPlace)*27 + 27;

        $("#block_prog_"+cur_prev_id).css('top', (prev_positions[cur_prev_id] + decalY) + "px");
        decalX = mouse.x - startMouseX;
    }
}
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
        storeData('plaposX'+cur_pla_id, plaPosX[cur_plalist_id], 'all');
        storeData('plaposY'+cur_pla_id, plaPosY[cur_plalist_id], 'all');
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
//
// sendShipsWithPopup(8,3,370,12,2,1);
// sendShipsWithPopup(<mission>,<galaxie>,<systeme>,<position>,<? type>,<nb vaisseaux>);
//
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//TEST nouvelle facon d'ejecter
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
function getXmlHttp() {
    if (window.XMLHttpRequest) {
        xmlhttp=new XMLHttpRequest();
    } else if (window.ActiveXObject) {
        xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
    }
    if (xmlhttp == null) {
        alert("Your browser does not support XMLHTTP.");
    }
    return xmlhttp;
}
//////////////////////////////////////////////////////////////////////////////////////////////////////
function PostXMLHttpRequest(_url,_data,_callback){
    xmlhttp = getXmlHttp();
    xmlhttp.onreadystatechange =function(){
        if (xmlhttp.readyState==4) {
            _callback(xmlhttp.responseText);
        }
    }
    xmlhttp.open("POST", _url, true);
    xmlhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xmlhttp.send(_data);
    return xmlhttp;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////
function SmartCut(source,prefix,suffix){
    if(typeof(prefix)=='object'){
        var pi=0;
        for(var i=0;(i<prefix.length)&&(pi!=-1);i++){
            pi=source.indexOf(prefix[i],pi);
        }
        if(pi!=-1){
            var copyFrom=pi+prefix[prefix.length-1].length;
            var si=source.indexOf(suffix,copyFrom);
            var r=source.substring(copyFrom,si);
            return r;
        }else return false;
    }else{
        var pi=source.indexOf(prefix);
        if(pi!=-1){
            var si=source.indexOf(suffix,pi+prefix.length);
            var r=source.substring(pi+prefix.length,si);
            return r;
        }else return false;
    };
}   ;
////////////////////////////////////////////////////////////////////////////////////////////////////////////
function Info(text){
    var txt="";
    for( var i = 0; i < arguments.length; i++ ) txt+=arguments[i];
    console.log(txt);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////
function SendFleet(response){
    var page=SmartCut(response,'<body id="','"');
    var params=JSON.parse(readData('data','form'));
    switch(page)
    {
        case 'fleet1':
            //Info('Response >',response,'<');
            if (params.step ==1){ //If first step
                params.step++; //Next step
                params.page=params.page.replace(page,"fleet2"); // Replace for next fleet2 page
                storeData('data',JSON.stringify(params), 'form'); // Save params
                PostXMLHttpRequest(params.url+"?"+params.page,params.to +"&"+ params.type_mission +"&"+ params.fleets,SendFleet);
                console.log("Request step1:"+params.url+"?"+params.page+", option="+params.to +"&"+ params.type_mission +"&"+ params.fleets);
            } else {
                if (params.step ==4) SendFleetSuccess(params);
                else SendFleetFailed(params);
            }
            break;
        case 'fleet2':
			//Info('Response >',response,'<');
            if (params.step ==2){ //If second step
                var token=SmartCut(response,["token'","='"],"'");
                params.step++;
                params.page=params.page.replace(page,"fleet3"); // Replace for next fleet3 page
                storeData('data',JSON.stringify(params), 'form');

                //Case of auto=yes
                if (params.sephi_opt.match('auto=yes') && params.sephi_opt.match('ID=') != null) {
                    var ID=params.sephi_opt.match(/ID=(\w+)/)[1];
                    //if (document.getElementById('consumption').innerHTML.match('overmark')) {
                    if ($('#consumption').length >0 && $('#consumption').html().find('overmark')) {
                        storeData(idcook, ID+'_DEUT', 'all');
                    }
                }

                //Case of auto=yes
                if (params.sephi_opt.match('eject=yes') && params.sephi_opt.match('ID=') != null) {
                    var ID = params.sephi_opt.match(/ID=(\w+)/)[1];
                    switch(ID){
                        case "Recycl":
                            $('#dbutton').click();
                            break;
                    }
                }
                PostXMLHttpRequest(params.url+"?"+params.page,params.type_mission +"&"+ params.fleets +"&"+ params.to +"&"+ params.token+token,SendFleet);
                console.log("Request step1:"+params.url+"?"+params.page+", option="+params.type_mission +"&"+ params.fleets +"&"+ params.to +"&"+ params.token+token);
            } else {
                SendFleetFailed(params);
            }
            break;
        case 'fleet3':
            //Info('Response >',response,'<');
            if (params.step ==3){ //If third step
                var token=SmartCut(response,["token'","='"],"'");
                //Info('Token >',token,'<');
                params.step++;
                params.page=params.page.replace(page,"movement"); // Replace for next movement page
                if ((params.sephi_opt.match('auto=yes') || params.sephi_opt.match('eject=yes')) && params.sephi_opt.match(/ID=(\w+)/) != null && params.sephi_opt.match(/ID=(\w+)/)[1] == 'Exped') {
                    params.type_mission.replace(/mission=\d+/, "mission=15");
                    if (params.sephi_opt.match(/exped_speed=(\w+)/) !== null ) params.fleets=params.fleets.replace(/speed=\d+/,"speed="+params.sephi_opt.match(/exped_speed=(\w+)/)[1]);
                    if (params.sephi_opt.match(/exped_time=(\w+)/) !== null ) params.fleets_opts=params.fleets_opts.replace(/expeditiontime=\d+/,"expeditiontime="+params.sephi_opt.match(/exped_time=(\w+)/)[1]);
                }
                storeData('data',JSON.stringify(params), 'form');

                PostXMLHttpRequest(params.url+"?"+ params.page,params.fleets_opts +"&"+ params.to +"&"+ params.type_mission +"&"+ params.fleets +"&"+ params.ressources +"&"+ params.token+token,SendFleet);
                               console.log("Request step1:"+params.url+"?"+params.page+", option="+params.fleets_opts +"&"+ params.to +"&"+ params.type_mission +"&"+ params.fleets +"&"+ params.ressources +"&"+ params.token+token);
            } else {
                SendFleetFailed(params);
            }
            break;
        /*no more necessary since version 6.0.5 where return is done on fleet1
         case 'movement':
         //if( parseInt(readCookie('step','form')) == 4){
         //Conf the coming back fleet
         if (params.step ==4){ //If fourth step
         createCookie('retour_auto', 'oui', 'eject'); createCookie('ejection_time', time().toString(), 'eject');
         SendFleetSuccess();
         } else {
         SendFleetFailed();
         }
         break;*/
        default:
            SendFleetFailed()
    }
    page=params=null;
}
//////////////////////////////////////////////////////////////////////////////////////////////////////
function SendFleetSuccess(params){
    console.log("Attack success (params=" +JSON.stringify(params)+ ").");
    if (params.sephi_opt.match('eject=yes')) {
        document.getElementById('eject_button').src = document.getElementById('eject_button').src.replace("grey", "green");
        blit_message("<b>Ejection</b> correctement effectuée depuis " + GLOB_cur_planet_name + ".");
        if  (!params.sephi_opt.match('ID=')) {
            storeData('retour_auto', 'oui', 'eject');
            storeData('ejection_time', time().toString(), 'eject');
            setTimeout(function () {
                window.location.href = "https://" + univers + "/game/index.php?page=overview&cp=" + (readData('eject_selectPlanet', 'all'));
            }, 4000);
        } else {
            setTimeout(function () {
                window.location.href = "https://" + univers + "/game/index.php?page=overview&cp=" + cur_planet_id;
            }, 4000);
        }
    }
    if (params.sephi_opt.match('auto=yes') && params.sephi_opt.match('ID=')){
        idcook = 'AA_feed';
        if (params.sephi_opt.match(/ID=(\w+)/)[1] == 'Exped'){
            idcook = 'AA_Exp';
        }
        if (params.sephi_opt.match(/ID=(\w+)/)[1] == '0'){
            if (typeof(params.sephi_opt.match(/Referer=(.*)/)) == 'object' && params.sephi_opt.match(/Referer=(.*)/) != null){
                if (params.sephi_opt.match(/Referer=(.*)/).length > 0 && params.sephi_opt.match(/Referer=(.*)/)[1] != "") {
                    setTimeout(function(){window.location.href = "https://"+univers+"/game/index.php?"+decodeURIComponent(params.sephi_opt.match(/Referer=(.*)/)[1]);}, 4000);
                    blit_message("<b>Attaque</b> correctement envoyée en "+params.to.replace(/\w+=(\d+)/g,"$1 ").replace(/&/g,"").trim().replace(/ /g,":")+"(retour auto vers la page).");
                }
            } else
                blit_message("<b>Attaque</b> correctement envoyée en "+params.to.replace(/\w+=(\d+)/g,"$1 ").replace(/&/g,"").trim().replace(/ /g,":")+".");
        }
        storeData(idcook, gup('ID')+'_IS_OK', 'all');

    }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////
function SendFleetFailed(params){
    console.log("Attack failled (params=" +JSON.stringify(params)+ ").");
    if (params.sephi_opt.match('eject=yes')) {
        document.getElementById('eject_button').src=document.getElementById('eject_button').src.replace("grey","red");
        blit_message("<b>Ejection</b> en erreur depuis "+GLOB_cur_planet_name+".");
        setTimeout(function(){document.getElementById('eject_button').src=document.getElementById('eject_button').src.replace("red","grey");window.location.href = "https://"+univers+"/game/index.php?page=overview&cp="+(readData('eject_selectPlanet', 'all'));}, 4000);
    }
    if (params.sephi_opt.match('auto=yes') && params.sephi_opt.match('ID=')){
        idcook = 'AA_feed';
        if (params.sephi_opt.match(/ID=(\w+)/)[1] == 'Exped'){
            idcook = 'AA_Exp';
        }
        if (params.sephi_opt.match(/ID=(\w+)/)[1] == '0'){
            if (typeof(params.sephi_opt.match(/Referer=(.*)/)) == 'object' && params.sephi_opt.match(/Referer=(.*)/) != null){
                if (params.sephi_opt.match(/Referer=(.*)/).length > 0 && params.sephi_opt.match(/Referer=(.*)/)[1] != "") {
                    setTimeout(function(){window.location.href = "https://"+univers+"/game/index.php?"+decodeURIComponent(params.sephi_opt.match(/Referer=(.*)/)[1]);}, 4000);
                    blit_message("<b>Attaque</b> en echec en "+params.to.replace(/\w+=(\d+)/g,"$1 ").replace(/&/g,"").trim().replace(/ /g,":")+"(retour auto vers la page).");
                }
            } else
                blit_message("<b>Attaque</b> en echec en "+params.to.replace(/\w+=(\d+)/g,"$1 ").replace(/&/g,"").trim().replace(/ /g,":")+".");
        }
        storeData(idcook, gup('ID')+'_NOT_OK', 'all');
    }
}

function ressources_by_priority(full_capacity,prio_metal,prio_crystal,prio_deut,metal,crystal,deut){
    var capa_metal=0, capa_crystal=0, capa_deut=0;
    if (prio_metal == 1) {//si p1=metal alors
        capa_metal= (metal <= full_capacity) ? metal : full_capacity ; //capa_metal= si ress_metal <= global_capa alors ress_metal sinon global_capa ;
        if (prio_crystal == 2) //si p2=chrystal alors
            capa_crystal= (crystal <= (full_capacity-metal)) ? crystal : (full_capacity-metal); //capa_chrystal= si ress_crystal <= (global_capa-ress_metal) alors ress_crystal sinon (global_capa-ress_metal)
        if (prio_deut == 2) //si p2=deut alors
            capa_deut= (deut <= (full_capacity-metal)) ? deut : (full_capacity-metal); //capa_deut= si ress_deut <= (global_capa-ress_metal) alors ress_deut sinon (global_capa-ress_metal)
        if (prio_crystal == 3) //si p3=chrystal alors
            capa_chrystal= (crystal <= (full_capacity-metal-deut)) ? crystal : (full_capacity-metal-deut); //capa_chrystal= si ress_crystal <= (global_capa-ress_metal-ress_deut) alors ress_crystal sinon (global_capa-ress_metal-ress_deut)
        if (prio_deut == 3) // si p3=deut alors
            capa_deut= (deut <= (full_capacity-metal-crystal)) ? deut : (full_capacity-metal-crystal); //capa_deut= si ress_deut <= (global_capa-ress_metal-ress_crystal) alors ress_deut sinon (global_capa-ress_metal-ress_crystal)
    }
    if (prio_crystal == 1) { //si p1=crystal alors
        capa_crystal= (crystal <= full_capacity) ? crystal : full_capacity ; //capa_chrystal= si ress_crystal <= global_capa alors ress_crystal sinon global_capa ;
        if (prio_metal == 2) //si p2=metal alors
            capa_metal= (metal <= (full_capacity-crystal)) ? metal : (full_capacity-crystal); //capa_metal= si ress_metal <= (global_capa-ress_crystal) alors ress_metal sinon (global_capa-ress_crystal)
        if (prio_deut == 2) // si p2=deut alors
            capa_deut= (deut <= (full_capacity-crystal)) ? deut : (full_capacity-crystal); //capa_deut= si ress_deut <= (global_capa-ress_crystal) alors ress_deut sinon (global_capa-ress_crystal)
        if (prio_metal == 3) //si p3=metal alors
            capa_metal= (metal <= (full_capacity-crystal-deut)) ? metal : (full_capacity-crystal-deut); //capa_metal= si ress_metal <= (global_capa-ress_crystal-ress_deut) alors ress_metal sinon (global_capa-ress_crystal-ress_deut)
        if (prio_deut == 3) // si p3=deut alors
            capa_deut= (deut <= (full_capacity-crystal-metal)) ? deut : (full_capacity-crystal-metal); //capa_deut= si ress_deut <= (global_capa-ress_crystal-ress_metal) alors ress_deut sinon (global_capa-ress_crystal-ress_metal)
    }
    if (prio_deut == 1) {  //si p1=deut alors
        capa_deut= (deut <= full_capacity) ? deut : full_capacity ; //capa_deut= si ress_deut <= global_capa alors ress_deut sinon global_capa ;
        if (prio_metal == 2) //si p2=metal alors
            capa_metal= (metal <= (full_capacity-deut)) ? metal : (full_capacity-deut); // capa_metal= si ress_metal <= (global_capa-ress_deut) alors ress_metal sinon (global_capa-ress_deut)
        if (prio_crystal == 2) //si p2=crystal alors
            capa_crystal= (crystal <= (full_capacity-deut)) ? crystal : (full_capacity-deut); //capa_chrystal= si ress_chrystal <= (global_capa-ress_deut) alors ress_chrystal sinon (global_capa-ress_deut)
        if (prio_metal == 3) //si p3=metal alors
            capa_metal= (metal <= (full_capacity-deut-crystal)) ? metal : (full_capacity-deut-crystal); //capa_metal= si ress_metal <= (global_capa-ress_crystal-ress_deut) alors ress_metal sinon (global_capa-ress_crystal-ress_deut)
        if (prio_crystal == 3) //si p3=chrystal alors
            capa_crystal= (crystal <= (full_capacity-deut-metal)) ? crystal : (full_capacity-deut-metal); //capa_chrystal= si ress_chrystal <= (global_capa-ress_deut-ress_metal) alors ress_chrystal sinon (global_capa-ress_deut-ress_metal)
    }
    //return positive value or 0
    return ([parseInt((capa_metal>=0)?capa_metal:0),parseInt((capa_crystal>0)?capa_crystal:0),parseInt((capa_deut>0)?capa_deut:0)]);
}

function check_galaxy_frigs() {
    cur_gal_state = $('#galaxyLoading').css('display');

    if (cur_gal_state != last_gal_state) {
        last_gal_state = cur_gal_state;
        if (cur_gal_state == "none")  {
            GAL_check_cur_gal = parseInt($('#galaxy_input').val());
            GAL_check_cur_sys = parseInt($('#system_input').val());
            $("#mobileDiv .row").not(".empty_filter").each( function(index){
                position=$(this).find("td.position").text();
                if (planame_list.indexOf($(this).find("td.planetname").text().trim()) < 0) {
                    if(is_frigo(GLOB_persistedData["frigos"],"["+GAL_check_cur_gal+":"+GAL_check_cur_sys+":"+position+"]") <0 ) {
                        b = $(this).find(('div#planet')+position);
                        if (b.length > 0) {
                            ListLinks = '<li><a href="javascript:void(0);" onclick="localStorage.setItem(\'all_add_racc\', \''+position+'\');setTimeout(function(){$(\'#showbutton\').click();},500);this.onclick=null;" style="cursor:pointer;color:#A52592;font-weight:bold">Ajouter aux frigos</a>';
                            ListLinks += '<input type="hidden" id="raccourcis_name_sep'+position+'" value="'+b.find('.textNormal').html()+'">';
                            ListLinks += '<input type="hidden" id="galaxy'+position+'" value="'+b.find('.ListImage').html().match(/.*\[(.*):.*:.*\].*/)[1]+'">';
                            ListLinks += '<input type="hidden" id="system'+position+'" value="'+b.find('.ListImage').html().match(/.*\[.*:(.*):.*\].*/)[1]+'">';
                            ListLinks += '<input type="hidden" id="position'+position+'" value="'+b.find('.ListImage').html().match(/.*\[.*:.*:(.*)\].*/)[1]+'">';
                            ListLinks += '<input type="hidden" id="type'+position+'" value="planet"></li>';
                            b.find('ul.ListLinks').append(ListLinks);
                        }
                    } else {
                        if ($(this).find("td.playername .status").html().match(/\(/)){
                            $(this).find("td.playername .status").html($(this).find("td.playername .status").html().replace("</span>)", "</span>&nbsp;<span class=\"status_abbr_frigo\"><span class=\"status_abbr_frigo tooltipHTML js_hideTipOnMobile\" style=\"color:#A52592;font-weight:bold;\" title=\"Cible frigo|La planete de ce joueur est un frigo qui sera régulièrement pillé.\">Fp</span></span>)"));
                        } else {
                            $(this).find("td.playername .status").html('(<span class="status_abbr_frigo"><span class="status_abbr_frigo tooltipHTML js_hideTipOnMobile" style="color:#A52592;font-weight:bold;" title="Cible frigo|La planete de ce joueur est un frigo qui sera régulièrement pillé.">Fp</span>)</span>');
                        }
                        $(this).find("td.planetname").css({'color':'#A52592','font-weight':'bold'});

                        b = $(this).find(('div#planet')+position);
                        if (b.length > 0) {
                            var ListLinks =  '<li><a href="javascript:void(0);" onclick="localStorage.setItem(\'all_del_racc\', \''+(b.find('ul.ListImage li span#pos-planet').html())+'\');setTimeout(function(){$(\'#showbutton\').click();},500);this.onclick=null;" style="cursor:pointer;color:#A52592;font-weight:bold">Supprimer des frigos</a>';
                            ListLinks += '<input type="hidden" id="raccourcis_name_sep'+(position)+'" value="'+b.find('.textNormal').html()+'">';
                            ListLinks += '<input type="hidden" id="galaxy'+(position)+'" value="'+b.find('ul.ListImage li span#pos-planet').html().match(/.*\[(.*):.*:.*\].*/)[1]+'">';
                            ListLinks += '<input type="hidden" id="system'+(position)+'" value="'+b.find('ul.ListImage li span#pos-planet').html().match(/.*\[.*:(.*):.*\].*/)[1]+'">';
                            ListLinks += '<input type="hidden" id="position'+(position)+'" value="'+b.find('ul.ListImage li span#pos-planet').html().match(/.*\[.*:.*:(.*)\].*/)[1]+'">';
                            ListLinks += '<input type="hidden" id="type'+position+'" value="planet"></li>';
                            b.find('ul.ListLinks').append(ListLinks);
                        }
                    }
                }

                if (planame_list.indexOf('Lune ('+$(this).find("td.planetname").text().trim()+')') < 0) {
                    if(is_frigo(GLOB_persistedData["frigos"],"["+GAL_check_cur_gal+":"+GAL_check_cur_sys+":"+position+"]Lune") <0 ) {
                        var b = $(this).find(('div#moon')+position);
                        if (b.length > 0) {
                            var ListLinks = '<li><a href="javascript:void(0);" onclick="localStorage.setItem(\'all_add_racc\', \''+position+'M'+'\');setTimeout(function(){$(\'#showbutton\').click();},500);this.onclick=null;" style="cursor:pointer;color:#A52592;font-weight:bold">Ajouter aux frigos</a>';
                            ListLinks += '<input type="hidden" id="raccourcis_name_sep'+position+'M'+'" value="'+b.find('.textNormal').html()+'">';
                            ListLinks += '<input type="hidden" id="galaxy'+position+'M'+'" value="'+b.find('.ListImage').html().match(/.*\[(.*):.*:.*\].*/)[1]+'">';
                            ListLinks += '<input type="hidden" id="system'+position+'M'+'" value="'+b.find('.ListImage').html().match(/.*\[.*:(.*):.*\].*/)[1]+'">';
                            ListLinks += '<input type="hidden" id="position'+position+'M'+'" value="'+b.find('.ListImage').html().match(/.*\[.*:.*:(.*)\].*/)[1]+'">';
                            ListLinks += '<input type="hidden" id="type'+position+'M'+'" value="moon"></li>';
                            b.find('ul.ListLinks').append(ListLinks);
                        }
                    } else {
                        if ($(this).find("td.playername .status").html().match(/\(/)){
                            $(this).find("td.playername .status").html($(this).find("td.playername .status").html().replace("</span>)", "</span>&nbsp;<span class=\"status_abbr_frigo\"><span class=\"status_abbr_frigo tooltipHTML js_hideTipOnMobile\" style=\"color:#A52592;font-weight:bold;\" title=\"Cible frigo|La lune de ce joueur est un frigo qui sera régulièrement pillé.\">Fl</span></span>)"));
                        } else {
                            $(this).find("td.playername .status").html('(<span class="status_abbr_frigo"><span class="status_abbr_frigo tooltipHTML js_hideTipOnMobile" style="color:#A52592;font-weight:bold;" title="Cible frigo|La lune de ce joueur est un frigo qui sera régulièrement pillé.">Fl</span>)</span>');
                        }
                        $(this).find("td.planetname").css({'color':'#A52592','font-weight':'bold'});

                        var b = $(this).find(('div#moon')+position);
                        if (b.length > 0) {
                            var ListLinks =  '<li><a href="javascript:void(0);" onclick="localStorage.setItem(\'all_del_racc\', \''+(b.find('ul.ListImage li span#pos-moon').html())+'Lune\');setTimeout(function(){$(\'#showbutton\').click();},500);this.onclick=null;" style="cursor:pointer;color:#A52592;font-weight:bold">Supprimer des frigos</a>';
                            ListLinks += '<input type="hidden" id="raccourcis_name_sep'+(position)+'M" value="'+b.find('.textNormal').html()+'">';
                            ListLinks += '<input type="hidden" id="galaxy'+(position)+'M" value="'+b.find('ul.ListImage li span#pos-moon').html().match(/.*\[(.*):.*:.*\].*/)[1]+'">';
                            ListLinks += '<input type="hidden" id="system'+(position)+'M" value="'+b.find('ul.ListImage li span#pos-moon').html().match(/.*\[.*:(.*):.*\].*/)[1]+'">';
                            ListLinks += '<input type="hidden" id="position'+(position)+'M" value="'+b.find('ul.ListImage li span#pos-moon').html().match(/.*\[.*:.*:(.*)\].*/)[1]+'">';
                            ListLinks += '<input type="hidden" id="type'+position+'M" value="moon"></li>';
                            b.find('ul.ListLinks').append(ListLinks);
                        }
                    }
                }
                /*               b = $(this).find(('div#debris')+position);
                 if (b.length > 0 && b.html().match("Champs de débris")) {
                 recly_needed = parseInt(b.find('ul.ListLinks li.debris-recyclers').html().match(/.*: (.*)/)[1]);
                 abalise = $('div#debris'+9).find('li a');
                 if(abalise.attr('onclick') !== null) {
                 abalise.attr(href,'https://'+univers+'/game/index.php?page=fleet1&galaxy='+GAL_check_cur_gal+'&system='+GAL_check_cur_sys+'&position='+i+'&type=1&mission=8&setRecy='+recly_needed);
                 abalise.onclick=null;
                 }
                 }*/
            });
        }
    }
}

function build_login_data(){
    //Bloc pour paramètrer l'autologin
    var data = '<div id="login" style="display: block;position:absolute;top:35px;right:10px;">';
    data += '       <div id="loginForm">';
    data += '            <p id="TermsAndConditionsAcceptWithLogin" style="line-height:20px;position:relative;top:-4px;left:5px;font-weight:bold;margin-bottom: 10px;">';
    data += '                <sapn style="color:white">SephiOGame Auto-Login <span style="cursor:help" title="Même si ce n\'est pas le cas, nous pourrions facilement enregistrer vos identifiants sur nos serveurs avec ce formulaire. Donc utilisez cette fonctionnalité uniquement si vous pensez que nous sommes honnêtes !">(?)</span></span><br>';
    if (readData('autoLogEnabled','all') == "yes") data += '                <span style="color:darkgreen">Actuellement ACTIF <span style="cursor:help" title="Pour le désactiver, réglez l\'univers sur \'\'Désactivé\'\' puis enregistrez.">(?)</span></span>';
    else data += '                <sapn style="color:darkred">Actuellement INACTIF</span>';
    data += '            </p>';
    data += '           <div class="input-wrap">';
    data += '               <label for="serverLogin">Univers:</label>';
    data += '               <div class="black-border">';
    data += '                    <select class="js_uniUrl" id="AutoLogServer" style="background: #8d9aa7 url(https://gf2.geo.gfsrv.net/cdn7d/113abb97b5fff99cb7d4d5019f04eb.gif) repeat-x scroll 0 0;border: 2px solid #9eb4cb;color: #30576f;cursor: pointer;width: 188px;">';
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
    data += '            <input type="submit" id="AutoLogSave" value="Enregistrer" style="background: url(https://gf3.geo.gfsrv.net/cdn5c/5f68e42f93bad65d7a1a6ddd130543.gif) no-repeat;color: #FFF;cursor: pointer;display: block;font-size: 16px;font-weight: bold;height: 30px;line-height: 30px;margin: 10px auto;padding: 0;text-align: center;text-shadow: -1px -1px 0 #501313;width: 187px;border: 0;">';
    data += '        </form>';
    data += '        </div>';
    return(data);
    data=null;
}

//add "Lance Full expedition" action into the planet menu when displayed
function planetmenu_isVisible() {
    $(".t_Tooltip").each(function() {
        if ($(this).find("a:contains('Expedition')").length == 0 && $(this).find(".t_ContentContainer").length > 0) {
            height = $(this).height() + 15;
            $(this).find(".t_ContentContainer").height(height);
            $(this).height(height);
            $(this).find(".t_Shadow").height(height);
            $(this).find(".t_Skin").height(height);
            $(this).find("canvas").height(height);

            [, cur_galaxy, cur_system] = $(this).find(".t_ContentContainer").html().match(/\[(\d+)\:(\d+)\:\d+\]/);
            sephi_opt = "&eject=yes&ID=Exped&galaxy=" + cur_galaxy + "&system=" + cur_system + "&position=16&type=1&mission=15";
            with_exped = readData('with_exped', 'AA');
            sephi_opt +="&PT=0&GT="&parseInt(with_exped);
            with_exped_speed = readData('with_exped_speed', 'AA');
            with_exped_time = readData('with_exped_time', 'AA');
            sephi_opt += ((with_exped_speed == null || with_exped_speed == '') ? '' : "&exped_speed=" + parseInt(with_exped_speed)) + ((with_exped_time == null || with_exped_time == '') ? '' : "&exped_time=" + parseInt(with_exped_time));

            $(this).find(".t_ContentContainer").append("<br>\n<a href='https://" + univers + "/game/index.php?page=fleet1&cp=33704854" + sephi_opt + "'>Lance FULL Expedition</a>");
        }
    });
};

//return if slot free
function hasEnoughSlots() : boolean {
	var hasEnoughSlots=true;
	[,cur_nb_flotte,max_nb_flotte] = $('.fleft span').first().html().match(/<\/span> (\d+)\/(\d+)/);
	// Calcule si le lancement d'une flotte est possible en fonction des slots disponibles
	if (readData('AA_leave_slot','AA') == 'oui') {
		//add Imp2Toulouse- Read nb of leave slot
		nb_slot_leave=(readData('AA_nb_slot','AA') == '' || readData('AA_nb_slot','AA') == null) ? defaut_AA_nb_slot:parseInt(readData('AA_nb_slot','AA'));
		// Replace by the number read
		if ((max_nb_flotte - cur_nb_flotte) <= nb_slot_leave) hasEnoughSlots=false;
	}
	storeData('AA_remain_slot', hasEnoughSlots.toString(), 'all');
	return hasEnoughSlots;
}

//---FUNCTIONS to treat Ogame API ---------------------
function traitements_joueurs(url : string){
    var myPlayers = new Map();

    $.ajax( {
        type: "GET",
        url: url,
        //format: <player id="xxxx" name="xxxx" status="xxxx" alliance="IDxxx"/>
        dataType: "xml",
        async:false,
        success: function(xml)
        {
            $(xml).find('player').each(
                function(){
                    var player={};
                    player.id = $(this).attr('id');
                    player.name = $(this).attr('name');
                    player.status = $(this).attr('status');
                    player.alliance = $(this).attr('alliance');
                    myPlayers.set(player.id,player);
                    player=null;
                }
            );
        }
    });

    return(myPlayers);
}

function traitements_colonies(url : string){
    var myPlayersDATA = new Map();

    $.ajax( {
        type: "GET",
        url: url,
        //Format: 	<planet id="xxxx" player="IDxxxx" name="xxxx" coords="Gal:Syst:Pos">
        //			<moon id="xxxx" name="xxxxx" size="INTxxxx"/>
        //			</planet>
        dataType: "xml",
        async:false,
        success: function(xml)
        {
            $(xml).find('planet').each(
                function(){
                    var colonie={};
                    var colonies=[];
                    colonie.id = $(this).attr('id');
                    colonie.player = $(this).attr('player');
                    colonie.name = $(this).attr('name');
                    colonie.coords = $(this).attr('coords');
                    colonie.moon_id = ($(this).find('moon').length>0)?$(this).find('moon').attr('id'):"";
                    colonie.moon_name = ($(this).find('moon').length>0)?$(this).find('moon').attr('name'):"";
                    colonie.moon_size = ($(this).find('moon').length>0)?$(this).find('moon').attr('size'):"";

                    colonies=(myPlayersDATA.has($(this).attr('player')))?myPlayersDATA.get($(this).attr('player')):[];
                    colonies.push(colonie);
                    (myPlayersDATA.has($(this).attr('player')))?myPlayersDATA.delete($(this).attr('player')):null;
                    myPlayersDATA.set($(this).attr('player'),colonies);
                    colonie=null;
                    colonies=null;
                }
            );
        }
    });

    return(myPlayersDATA);
}

function traitements_inactif(filtre_galaxy : number, myPlayers : any, myPlayersDATA : any){
    var elements= new Map();
    myPlayers.forEach(
        function (valeur,cle){
            if (valeur.status == "i" || valeur.status == "I") {
                var element={};
                element.player=valeur;
                element.colonies=myPlayersDATA.get(valeur.id).filter(function(obj){
                    if (obj.coords.split(":")[0] == filtre_galaxy && is_frigo(GLOB_persistedData["frigos"],'['+obj.coords+']') == -1) return(obj);
                });
                if (element.colonies.length >0) elements.set(valeur.id,element);
            }
        }
    );
    return(elements);
}

function colonies_by_systems(colonies_inactives : any){
    var tab_colonies_by_systems=[], tab_systems=[], player_name:string="";
    colonies_inactives.forEach(
        function (value, key){
            player_name=value.player.name;
            value.colonies.forEach(
                function (value, key){
                    var gal, sys, pos;
                    [gal,sys,pos]=value.coords.split(':');
                    if (typeof tab_colonies_by_systems[parseInt(sys)] == "undefined" ) tab_colonies_by_systems[parseInt(sys)]=[];
                    if (! tab_systems.includes(parseInt(sys))) tab_systems.push(parseInt(sys));
                    tab_colonies_by_systems[parseInt(sys)].push({pos:parseInt(pos),player_name:player_name,planet_name:value.name,moon_name:(value.moon_id)?value.moon_name:null});
                    tab_colonies_by_systems[parseInt(sys)].sort(function(obj1, obj2) {return obj1.pos - obj2.pos;});
                }
            );
        }
    );
    return([tab_systems.sort(function(a, b) {return a - b;}),tab_colonies_by_systems]);
}

function prepare_spy_inactif(current_galaxy : number, system1 : number, system2 : number, tab_systems : any, tab_colonies_by_systems : any, scope: number){
    var compteur=0, data="";
    var old_system:number;
    data+='<table cellspacing="15" id="autospytable" border="0" style="position:relative; left:15px">';
    data+='<thead>';
    data+='<tr id="autospyactionbg2" class="ct_head_row" style="">';
    data+='    <th colspan=3 class="first" style="width: 110px; padding-right: 5px;" align="right">SCOPE:&nbsp;<input id="scope" name="scope" style="width: 50px;" value="'+scope+'" onchange="if (this.value<1 || this.value>200){alert(&quot;Le scope doit etre compris entre 1 et 200.&quot;);return false;}"></th>';
    data+='    <th colspan=2 class="last" style="width: 110px; overflow: hidden;" align="left"><input id="rescope" name="rescope" type="button" value="ReScope">&nbsp;<input id="launch_autospy" name="launch_autospy" type="button" value="Launch"></th>';
    data+='</tr>';
    data+='<tr id="autospynotifbg2" class="ct_head_row" style=""><th colspan=5 class="first textBeefy" style="color:#6f9fc8;"><div id="autospy_notif">&#9658; Aucun espionnage en cours...</div></th></tr>';
    data+='<tr id="autospyheadbg2" class="ct_head_row" style="height: 50px">';
    data+='    <th class="first" style="width: 110px; padding-right: 5px;" align="center">Sous-Système</th>';
    data+='    <th class="" style="width: 110px; overflow: hidden;" align="center">Position</th>';
    data+='    <th class="" style="width: 110px; overflow: hidden;" align="center">Joueur</th>';
    data+='    <th class="" style="width: 110px; overflow: hidden;" align="center">Planete</th>';
    data+='    <th class="last" style="width: 110px; padding-right: 5px;" align="center">Lune</th>';
    data+='</tr>';
    data+='</thead>';
    data+='<tfoot>';
    data+='    <tr class="footer ct_foot_row" id="fleetstatus">';
    data+='        <td class="ct_foot_row" colspan="11" id="fleetstatusrow"></td>';
    data+='    </tr>';
    data+='</tfoot>';
    data+'<tbody>';
    for (var system = system1; system <= system2; system++){
        if (tab_systems.includes(system)) {
            tab_colonies_by_systems[system].forEach(
                function (obj:any) {
                    compteur++;
                    data+='<tr class="row" id="row'+compteur+'" style="height: 50px;">';
                    data+='    <td class="system js_no_action" style="border-radius: 6px;line-height: 20px;'+((system != old_system)?"background-color: rgba(0,0,0,0.66);":"")+'" align="center">'+((system != old_system)?system:"")+'</td>';
                    data+='    <td class="position js_no_action" style="border-radius: 6px;line-height: 20px;background-color: rgba(0,0,0,0);" align="center">'+obj.pos+'</td>';
                    data+='    <td class="playername js_no_action" style="border-radius: 6px;line-height: 20px;background-color: rgba(0,0,0,0);" align="center"><span class="">'+obj.player_name+'</span></td>';
                    data+='    <td class="planetname js_no_action" style="border-radius: 6px;line-height: 20px;background-color: rgba(0,0,0,0);" align="center" data-galaxy="'+current_galaxy+'" data-system="'+system+'" data-position="'+obj.pos+'" data-type="1" data-name="'+obj.planet_name+'"><a href="javascript: void(0);" title="'+obj.planet_name+'" onclick="return false;"><img src="https://gf1.geo.gfsrv.net/cdn92/0a0346dd4999bd04761fc6b086e7a1.png" alt="" style="height:25px;position:relative;top:8px;width:25px;"></a><div id="planet_spy_check" style="display:none;"><img style="position:relative;left:33px;top:-27px;" src="http://www.sephiogame.com/script/icon-tick.png" width="12" height="12"></div></td>';
                    data+='    <td class="moon js_no_action" style="border-radius: 6px;line-height: 20px;background-color: rgba(0,0,0,0);" align="center" data-galaxy="'+((obj.moon_name)?current_galaxy:'')+'" data-system="'+((obj.moon_name)?system:'')+'" data-position="'+((obj.moon_name)?obj.pos:'')+'" data-type="3" data-name="'+((obj.moon_name)?obj.moon_name:'')+'">'+((obj.moon_name)?'<a href="javascript: void(0);" title="'+obj.moon_name+'" onclick="return false;"><img src="https://gf1.geo.gfsrv.net/cdn04/7891019e5c9d1003345a09ebad70d1.gif" alt="" style="height:25px;position:relative;top:8px;width:25px;"></a><div id="moon_spy_check" style="display:none;"><img style="position:relative;left:33px;top:-27px;" src="http://www.sephiogame.com/script/icon-tick.png" width="12" height="12"></div>':'')+'</td>';
                    data+='</tr>';
                    old_system=system;
                });
        }
    }
    data+'<tbody>';
    data+='</table>';
    return(data);
}

function espionne_inactif(nb_sondes : number, current_galaxy : number, system1 : number, system2 : number, tab_systems : any, tab_colonies_by_systems : any, scope: number){
    $('#galaxyContent').ready(function() {
        $('#galaxyContent').css('display', 'none');
        if ($('#autospy_data').length == 0)
            $('#galaxyContent').after(
                '<div id="autospy_data" style="display:block;">'
                + '  <img id="autospy_data_waiting" src="https://gf1.geo.gfsrv.net/cdnc6/4161a64a933a5345d00cb9fdaa25c7.gif" style="position: relative; display:block;top:200px;left:300px;">'
                + '</div>'
            );
        else
            $('#autospy_data').html('<img id="autospy_data_waiting" src="https://gf1.geo.gfsrv.net/cdnc6/4161a64a933a5345d00cb9fdaa25c7.gif" style="position: relative; display:block;top:200px;left:300px;">');

        setTimeout(function(){
            $('#autospy_data').html(prepare_spy_inactif(current_galaxy,system1,system2, tab_systems,tab_colonies_by_systems,scope));
            $('#autospy_data #rescope').on("click",function(){
                setTimeout(launch_autospy(parseInt($('#contentWrapper #galaxyHeader #galaxy_input').val()), parseInt($('#contentWrapper #galaxyHeader #system_input').val()), parseInt(parseInt(readData('nb_sondes', 'options')) || 5),parseInt($('#scope').val())),2000);
            });
            $('#autospy_data #launch_autospy').on("click",function() {
                var compteur:number=0;
                $('#autospytable .row').each(function(){
                    compteur++;
                    GLOB_TAB_INACTIF.push({id:compteur,player_name:$(this).find('.playername').text(),name:$(this).find('.planetname').data('name'),coord:$(this).find('.planetname').data('galaxy')+":"+$(this).find('.planetname').data('system')+":"+$(this).find('.planetname').data('position'),type:$(this).find('.planetname').data('type'),nb_sondes:nb_sondes});
                    if ($(this).find('.moon').data('galaxy')){
                        GLOB_TAB_INACTIF.push({id:compteur,player_name:$(this).find('.playername').text(),name:$(this).find('.moon').data('name'),coord:$(this).find('.moon').data('galaxy')+":"+$(this).find('.moon').data('system')+":"+$(this).find('.moon').data('position'),type:$(this).find('.moon').data('type'),nb_sondes:nb_sondes});
                    }
                });
                autospy('','auto_spy');
            });
        },2000);

        //$('#autospy_data').css('display', 'block');
    });
}

function launch_autospy(current_galaxy : number, current_system : number, nb_sondes : number, scope : number){
    var players = new Map();
    var playersDATA = new Map();
    players=traitements_joueurs("https://s145-fr.ogame.gameforge.com/api/players.xml");
    playersDATA=traitements_colonies("https://s145-fr.ogame.gameforge.com/api/universe.xml");

    var colonies_inactives = new Map();
    colonies_inactives=traitements_inactif(current_galaxy,players,playersDATA);
    scope=parseInt(scope||100);

    var tab_systems:any,tab_colonies_by_systems:any;
    [tab_systems,tab_colonies_by_systems]=colonies_by_systems(colonies_inactives);
    var system1=((current_system-scope) <= 0)?1:current_system-scope;
    var system2=((current_system+scope) >= 500)?499:current_system+scope;

    espionne_inactif(nb_sondes, current_galaxy, system1, system2, tab_systems, tab_colonies_by_systems, scope);
}
//---End FUNCTIONS to treat Ogame API ---------------------

//######################################################################################
// End functions
//######################################################################################

//######################
// Declaration variables
//######################

var cur_content = "";
var cur_title = "";
var havetoprev = "no";
var timer="no";
var cur_met_prev=0;
var cur_cry_prev=0;
var cur_deut_prev=0;
var cookPrefix = gup("page");
var categories = new Array("resources","station","research","shipyard","defense");
var titles_cat = new Array("Ressources","Installations","Recherche","Vaiseaux","Défense");
var cookies_list = new Array('havetoprev','donned','cur_met_prev','cur_crys_prev','cur_deut_prev','page','form_modus','form_type','form_number','form_initial_number','title', 'original_id');
var have_played_alert=false;
var have_to_deroule=true;
var GLOB_planet_change_inhibited = false;
var want_a_RG=false;
var want_a_AA=false;
var cur_token = '';

var GLOB_cur_planet = 'default';
var GLOB_cur_planet_name : string;
var cur_planet_coords, cur_planet_id : number, cur_planetIsLune : boolean;
var planet_list_coords = new Array();
var planame_list = new Array();
var planet_list = new Array();
var planet_isLune = new Array();
var nb_planet = 0;

var GLOB_persistedData : PersistedData = { "listPrev" : null, "prods" : null, "frigos" : null, "eject" : null };
var GLOB_TAB_INACTIF = new Array();
var eject_gal = 'Galaxie';
var eject_sys = 'Système';
var eject_pla = 'Planète';
var eject_auto = 'never';

//default priority
var ress_priority_metal=1;
var ress_priority_crystal=2;
var ress_priority_deut=3;
var eject_all = false;
var eject_onLune = false;
var eject_type='';

storeData("move_id", '-1', "all");
storeData("delete_id", '-1', "all");
var dontAddToCookies = false;
var nb_trucs_supprimed = 0;
var prev_positions = new Array();
var haveMoved = false;
var haveDel = false;
//Imp2Toulouse- Wording: change 'have_to_cahnge' by 'have_to_change'
var have_to_change_dropid = true;

//Variable pour AA
var superSpyAllTimeout = 0;
var spy_all=false;
var GLOB_spy_fail=0;
var GLOB_abandonne_spy = false;
var GLOB_nb_tries = 0;
var GLOB_nb_spy_fail = 0;
var changementAnnuleBlited = false;
var speededUP = false;
var cur_mail_page = 1;
var tot_mail_page = 0;
var stopMail = false;
var no_more_new_esp = false;
var count_esp=0;
var nb_limit = 10000000;
var class_bonus = 'msg';
var waitingExped = false;
var type_multip = 0;
var met = 0;
var cri = 0;
var deu = 0;
var isFirstTry = true;
var AATimeout = null;
var launchAA = false;
var count_progs=0;
var GLOB_nb_special_bars = 0;
var new_prog_time = 0;
var retard_AA_button = false;
var curY_decal = 0;
var isDragingPrev=false;

//######################
// Declaration variables
//######################

//##############################
// Process autologin and Authent
//##############################

//Autolog (nouvel essai toutes les 5 minutes)
if ($("#loginForm").length == 1) {
    $('#content').append(build_login_data());
    $('#AutoLogServer').append($('#serverLogin').html());
    
    if (readData('autoLogEnabled','all') !== "yes") {
        $('#AutoLogServer').val('');
        $('#AutLogUser').val('');
        $('#AutLogPass').val('');
    } else {
        $('#AutoLogServer').val(readData('AutoLogServ','all'));
        $('#AutLogUser').val(readData('AutoLogPseudo','all'));
    }
    $('#AutoLogSave').click(function() {
        if ($('#AutoLogServer').val() !== '') {
            storeData('autoLogEnabled','yes','all');
            storeData('AutoLogServ',$('#AutoLogServer').val(),'all');
            storeData('AutoLogPseudo',$('#AutLogUser').val(),'all');
            storeData('AutoLogPassword',$('#AutLogPass').val(),'all');
        } else {
            storeData('autoLogEnabled','','all');
            storeData('AutoLogServ', '','all');
            storeData('AutoLogPseudo','','all');
            storeData('AutoLogPassword','','all');
        }
        if (readData('autoLogEnabled','all') == "yes") alert("L'Auto-Login est maintenant ACTIF. Une fois arrivé sur la page d'acceuil, le script attendra 1 à 2 minutes pour se loguer avec les identifiants que vous venez d'indiquer");
        else alert("L'Auto-Login est maintenant INACTIF. Les identifiants que vous avez pu indiquer auparavant ne sont maintenant plus stockés dans les paramètres du script");
        location.href = location.href;
    });
    
    if (readData('autoLogEnabled','all') == "yes") {
        // Timeout pour que le navigateur remplisse les champs
        setTimeout(function(){
            if (readData('lastLogTry','all') !== null && time()-parseInt(readData('lastLogTry','all'))<1000*60*10)
                setTimeout(function(){location.href=location.href;}, rand(1,3)*60*1000);
            else
                setTimeout(function(){
                    storeData('lastLogTry', time().toString(), 'all');$('#serverLogin').val(readData('AutoLogServ','all'));
                    $('#usernameLogin').val(readData('AutoLogPseudo','all'));$('#passwordLogin').val(readData('AutoLogPassword','all'));
                    setTimeout(function(){$('#loginForm').submit();}, 5*1000);
                }, rand(4,8)*15*1000);
        }, 3*1000);
    }
    exit(0);
}
storeData('lastLogTry', '0', 'all');

$(document).ready(function(){
    var s = document.createElement("script");
    s.type = "text/javascript";
    s.src = "https://apis.google.com/js/client.js?onload=checkAuth";
    // Use any selector
    $("head").append(s);

    var s = '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n        <meta http-equiv="Pragma" content="no-cache" />\n        <meta http-equiv="Expires" content="0" />\n';
    $("head").prepend(s);

});

//##################################
// End Process autologin and Authent
//##################################


//##################################
// INIT Context
//##################################

/* Affiche l'attaques en attente */
$('#ie_message').append('<div id="div_for_sound"></div>');

if (gup('servResponse') == '1') {
    storeData('infoServ', gup('data'), 'all');
    if (gup('data') == "popupOK") storeData('lastActuTime', time().toString(), 'all');
    exit(0);
}

//get miniFleetToken value
[,miniFleetToken]=($(document.body).html().match(/miniFleetToken="(\w+)"/).length > 1)? $(document.body).html().match(/miniFleetToken="(\w+)"/) : [,""];

//get username
username=($('span.textBeefy a.overlay.textBeefy').length > 0)?$('span.textBeefy a.overlay.textBeefy').html().replace(/ /g,'').replace("\n",''):"unloged";

//get current token
cur_token=($(document.body).find("#planet input[name='token']").length > 0)?$(document.body).find("#planet input[name='token']").val():"";

//Compatibility Antigame
var AGO_actif=($(document).find("#ago_global_data").length >0);

//Preparation de l'optimisation mais en attente d'avoir une lune pour vérifier le code
/*$(document.body).find("#planetList").find('[id*="planet-"] a').each(function(nb_planet){
    //Planete ?
    if ($(this).parent().find('a[class*=planetlink]').length > 0) {
        planet_list_coords[nb_planet] = $(this).find(".planet-koords").html();
        planame_list[nb_planet] = $(this).find(".planet-name").html();
        planet_list[nb_planet] = $(this).parent()[0].id.match(/planet-(\d+)/)[1];
        planet_isLune[nb_planet] = false;
        if ($(this).parent().find('a[class*=active]').length > 0) {
            cur_planet_coords = planet_list_coords[nb_planet];
            GLOB_cur_planet_name = planame_list[nb_planet];
            cur_planet = planet_list[nb_planet];
            cur_planet_id = nb_planet;
            cur_planetIsLune = false;
        }
    }
    nb_planet++;

    //Lune ?
    if ($(this).parent().find('a[class*=moonlink]').length > 0) {
        planet_list_coords[nb_planet] = planet_list_coords[nb_planet-1]+'Lune';
        planame_list[nb_planet] = 'Lune ('+planame_list[nb_planet-1]+')';
        planet_list[nb_planet] = $(this).parent()[0].id.match(/planet-(\d+)/)[1];
        planet_isLune[nb_planet] = false;
        if ($(this).parent().find('a[class*=active]').length > 0) {
            cur_planet_coords = planet_list_coords[nb_planet];
            GLOB_cur_planet_name = planame_list[nb_planet];
            cur_planet = planet_list[nb_planet];
            cur_planet_id = nb_planet;
            cur_planetIsLune = true;
        }
        nb_planet++;
    }
});
*/

// Analyse planets
class Planet {
    id : string
    name: string
    coords : string
    isLune : bool
}

var data_planets = $(document.body).html().split("id=\"planet-").slice(1);
for (var i=0 ; i<data_planets.length ; i++) {
    var tmp=data_planets[i];
    
    // Planete classique
    planet_list_coords[nb_planet] = '['+tmp.split('[')[1].split(']')[0]+']';
    planame_list[nb_planet] = tmp.split('planet-name')[1].split('>')[1].split('<')[0];
    planet_list[nb_planet] = parseInt(tmp.split('"')[0]);
    planet_isLune[nb_planet] = false;
    
    if (tmp.replace('planetlink active','') !== tmp) {
        GLOB_cur_planet = planet_list[nb_planet];
        cur_planet_coords = planet_list_coords[nb_planet];
        cur_planet_id=nb_planet;
        GLOB_cur_planet_name = planame_list[nb_planet];
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
            GLOB_cur_planet = planet_list[nb_planet];
            cur_planet_coords = planet_list_coords[nb_planet];
            cur_planet_id=nb_planet;
            GLOB_cur_planet_name = planame_list[nb_planet];
            cur_planetIsLune = true;
        }
        nb_planet++;
    }
}

if (GLOB_cur_planet == 'default') {
    GLOB_cur_planet = planet_list[0];
    cur_planet_coords = planet_list_coords[0];
    cur_planet_id=0; 
    GLOB_cur_planet_name = planame_list[0];
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

// Afficher la version du script
$('#helper').html('<div style="width:0px;height:0px;position:relative;top:10px;left:655px;"><p style="width:400px;height:15px;color:#808080;text-align: right;font-size:10px;position: relative;left: -70px;top:-5px">SephiOGame Version '+cur_version+'</p></div>');
$('#helper').append('<div style="width:0px;height:0px;position:relative;top:23px;left:950px;">'
    +'<a href="https://'+univers+'/game/index.php?page=premium&amp;openDetail=12" style="top: 0px;left: 0px;background:none;">'
    +'<img class="tooltipHTML" title="SephiOGame version '+cur_version
    +'|Liste de constructions sans limite, sauvegarde des frigos, alerte sonore et envoi de mails lors des missions hostiles, '
    +'agrandissement des images dans flotte, messages, ect... '
    +'Et d\'autres améliorations diverses<br><br><u>Nouveautés de la '+cur_version +'</u> :<br>'+LANG_nouveaute_update
    +'" src="http://www.sephiogame.com/script/icon_ahri2.jpg" style="border:1px solid #000000"/></a></div>');
$('#officers').css({paddingRight: '40px'});
$('#officers').addClass("one");

// Variable temporelle de changement de planetes
var plapla_change_time1 = 1;
var plapla_change_time2 = 3;
var url_webhook=(readData("url_webhook", "all") == null || readData("url_webhook", "all").trim() == "")?"":readData("url_webhook", "all");
//$(".smallplanet").mouseover(function(){setTimeout(planetmenu_isVisible(),1500)});

//##################################
// END INIT Context
//##################################


//##################################
// Chargement configuration
//##################################

load_important_vars();
var alert_mail_to = readData('alert_mail_to','all');
var alert_mail_body = readData('alert_mail_body','all');
var alert_mail_freq = readData('alert_mail_freq','all');
if (alert_mail_to==null || !checkmail(alert_mail_to)) alert_mail_to = '';
else storeData('alert_mail_to',alert_mail_to,'all');
if (alert_mail_body==null || alert_mail_body == "")
    alert_mail_body = 'Hello,\r\nThis mail to alert you that you are facing on an attack.\r\n\r\n'
        +'Your [CP_ISLUNE] [CP_NAME] [[CP_COORDS]] will be attacked in [CP_IMPACTTIME].';
else storeData('alert_mail_body',alert_mail_body,'all');
if (alert_mail_freq==null || alert_mail_freq == "") alert_mail_freq = 11; //minutes
else storeData('alert_mail_freq',alert_mail_freq,'all');

if (GLOB_persistedData["listPrev"] == null || GLOB_persistedData["listPrev"] == 'undefined' || GLOB_persistedData["listPrev"] == '')
    GLOB_persistedData["listPrev"] = new Array();

                  
if (GLOB_persistedData["frigos"] == null || GLOB_persistedData["frigos"] == 'undefined' || GLOB_persistedData["frigos"] == '')
    GLOB_persistedData["frigos"] = new Array();

GLOB_persistedData["frigos"] = GLOB_persistedData["frigos"].sort(function(a,b) { return parseFloat(b[4])- parseFloat(a[4]) } );

if(gup('page') == 'premium') {
    $('#button12').html('<div class="premium tooltip" title="Plus d\'infos sur : SephiOGame.">'
        +'<div class="buildingimg  allOfficers" style="background:url(http://www.sephiogame.com/script/icon_ahri_mid2.png) 0 0;" >'
        +'<a tabindex="12" href="javascript:void(0);" title="" ref="12" class="detail_button tooltip js_hideTipOnMobile slideIn active">'
        +'<span class="ecke"><span class="level"><img src="https://gf3.geo.gfsrv.net/cdn89/b1c7ef5b1164eba44e55b7f6d25d35.gif" width="12" height="11"></span>'
        +'</span></a></div></div>');
    replace_pack();
}

// Ajout du bouton EJECT
data = GLOB_persistedData["eject"];
if (data !== null && data.split(":").length > 2) {
    eject_gal = data.split(":")[0];
    eject_sys = data.split(":")[1];
    eject_pla = data.split(":")[2];
    if (data.match('never')) eject_auto = 'never';
    if (data.match('5mins')) eject_auto = '5mins';
    if (data.match('10mins')) eject_auto = '10mins';
    if (data.match('20mins')) eject_auto = '20mins';

    if (data.match('ress_priority_metal'))
        [,ress_priority_metal,ress_priority_crystal,ress_priority_deut]=data.match(/:ress_priority_metal\|(\d):ress_priority_crystal\|(\d):ress_priority_deut\|(\d):/);

    eject_all = data.match('ALL');
    eject_onLune = data.match('OnLune');
    eject_type = data.match('Type');

    //Imp2Toulouse- Preset the type of mission if the moon is used
    eject_url = 'https://'+univers+'/game/index.php?page=fleet1&galaxy='+eject_gal+'&system='+eject_sys+'&position='+eject_pla
    eject_url+= '&type='+((eject_onLune)?3:1)+'&mission=3&cp='+(planet_list[planame_list.indexOf(GLOB_cur_planet_name)])+'&eject=yes';

    $('#helper').append('<div style="width:0px;height:0px;position:relative;top:-79px;left:566px;">'
        +'<a style="background:none;text-decoration:none;font-size:9px;font-family:inherit;width:55px;text-align:center;" '
        +'title="Faire décoller tout les vaisseaux civils et les ressources vers les coordonnées ci-dessous." href="'+eject_url+'">'
        +'<img id="eject_button" src="http://www.sephiogame.com/images/eject_button_grey.png" /><br>'
        +'<span style="color:#C02020">['+eject_gal+':'+eject_sys+':'+eject_pla+']</span></a></div>');
    GLOB_persistedData["eject"] = data;
    save_important_vars();
    
    //Vérification du eject
    if (rand(1,20) == 1 && !gup('page').match('fleet')) {
        //Imp2Toulouse- Preset the type of mission if the moon is used
        eject_url = 'https://'+univers+'/game/index.php?page=fleet1&galaxy='+eject_gal+'&system='+eject_sys+'&position='+eject_pla
        eject_url+= '&type='+((eject_onLune)?3:1)+'&mission=3&cp='+(planet_list[planame_list.indexOf(GLOB_cur_planet_name)])+'&eject=yes';
        $.ajax(eject_url, {
            dataType: "text",
            type: "POST",
            success: function(data) {
                if(typeof(data.newToken) != "undefined") {
                    miniFleetToken = data.newToken;
                }
                if (data.split('Pseudo du joueur:</span>')[1].split('</li>')[0].replace(/ /g, '').replace("\n","") == '?') {
                   storeData('isDead', 'oui', 'eject');
                }
            }
        });        
    }
    if (readData('isDead', 'eject') == 'oui')
        blit_message('<span style="float: none;margin: 0;color:#d43635">Votre planète EJECT a disparu !!</span>');
}
// Texte pour l'ajout de frigo
//Non utilisé
//text_racc = (persistedData["frigos"].length+1<10) ? '0'+(persistedData["frigos"].length+1) : persistedData["frigos"].length+1;

// Load AA Exped_param
var with_exped = (readData('with_exped', 'AA') == null || readData('with_exped', 'AA') == "" ) ? 'non' : readData('with_exped', 'AA');
var with_exped_perso = (readData('with_exped_perso','AA') == null) ? '' : readData('with_exped_perso','AA');
var with_exped_speed = (readData('with_exped_speed', 'AA') == null) ? '10' : readData('with_exped_speed', 'AA');
var with_exped_time = (readData('with_exped_time', 'AA') == null) ? '1' : readData('with_exped_time', 'AA');

// Confimation de la MaJ
last_page_version=readData('last_page_ver','all');
storeData('last_page_ver',cur_version,'all');
if (cur_version !== last_page_version) {
    blit_message('Le script est maintenant en <span style="float: none;margin: 0;color:#109E18">version ' +cur_version+'</span>');
    storeData('maj_advert', '0', 'all');
}

/* Enregiste la vitesse de production */
GLOB_persistedData["prods"] = new Array();
GLOB_persistedData["prods"][0] = parseInt($(document.body).html().split('Production actuelle\\u00a0:')[1].split('<span')[1].split('/span>')[0].match(/\d/g).join(""));//parseInt($(document.body).html().split(',"tooltip":')[1].split('<span')[3].split('/span>')[0].match(/\d/g).join(""));
GLOB_persistedData["prods"][1] = parseInt($(document.body).html().split('Production actuelle\\u00a0:')[2].split('<span')[1].split('/span>')[0].match(/\d/g).join(""));//parseInt($(document.body).html().split(',"tooltip":')[2].split('<span')[3].split('/span>')[0].match(/\d/g).join(""));
GLOB_persistedData["prods"][2] = parseInt($(document.body).html().split('Production actuelle\\u00a0:')[3].split('<span')[1].split('/span>')[0].match(/\d/g).join(""));//parseInt($(document.body).html().split(',"tooltip":')[3].split('<span')[3].split('/span>')[0].match(/\d/g).join(""));

/* lit votre capacité de stockage */
capa_metal = parseInt($(document.body).html().split(',"max":')[1].split(',')[0].match(/\d/g).join(""));
capa_crystal = parseInt($(document.body).html().split(',"max":')[2].split(',')[0].match(/\d/g).join(""));
capa_deuterium = parseInt($(document.body).html().split(',"max":')[3].split(',')[0].match(/\d/g).join(""));

// Rapport général
leave_slot='';
noGTAA='';
forceAA='';
type_vaisseaux_AA = readData('type_vaisseaux','AA') == null ? 1 : parseInt(readData('type_vaisseaux','AA'));
defaut_AA_butin = 20000;
defaut_AA_nb_slot=1;
if (readData('AA_butin','AA') !== null) defaut_AA_butin = readData('AA_butin','AA').match(/\d/g).join("");
if (readData('AA_nb_slot','AA') !== null) defaut_AA_nb_slot = readData('AA_nb_slot','AA').match(/\d/g).join("");
if (readData('AA_leave_slot','AA') == 'oui') leave_slot=' checked';
if (readData('noGT','AA') == 'oui') noGTAA=' checked';
if (readData('force','AA') == 'oui') forceAA=' checked';

/* Page Sephi Script */
bonus_class="";
bonus_style="";
lastAAcoolTime=null;
cur_check_all_state = false;


//##################################
// End Chargement configuration
//##################################


//Set retour_time and check attack
//start_after_less = 5*60;
start_after_less = get_start_after_less(eject_auto);
retour_time = (start_after_less == 0)?5*60*1000 : start_after_less*1000 / 2;// When no auto eject, set back after 5min
setTimeout(check_attack, 2000);


//Prepare autoattack bar
id_prev="planet";
if (gup('page') == "overview") id_prev="detailWrapper";
data='';
data += '<div style="height:0px;"><div id="support_prev_block" style="height:;width:660px;background:#0D1014;position:relative;left:-5px;"></div></div>';
add_auto_attack_bar();

/* Affiche du retour d'ejection */
if (readData('retour_auto', 'eject') == 'oui') {
    time_restant = retour_time - time() + parseInt(readData('ejection_time', 'eject'));
    
    if (time_restant > 0) {
        count_progs++;
        GLOB_nb_special_bars++;
        data += "\n"+'<div style="height:0px;position:relative;top:'+(27*(count_progs-1))+'px;"><div style="cursor:default;word-wrap: normal;height:20px;font: 700 12px Verdana,Arial,Helvetica,sans-serif;position:relative;left:-8px;padding-top:7px;background: url(http://www.sephiogame.com/images/barre_fond.gif) no-repeat;background-position:0px -1px;width:640px;margin-bottom:0px;color:#A0A0A0;padding-left:40px;font-weight:normal;">';
        //Imp2Toulouse malwritten correction countdonwRetour by countdownRetour
        data += '<p style="width:600px;height:20px;white-space: nowrap"><b>Demande du retour de la flotte ejectée dans <span id="countdownRetour">'+get_cool_time((retour_time - time() + parseInt(readData('ejection_time', 'eject')))/1000)+'</span></b></p>';
        data += "\n"+'<div id="request_fleet_back" style="height:0px;position:relative;left:558px;top:-20px;"><img style="cursor:pointer;width:16px;height:auto;" src="https://gf2.geo.gfsrv.net/cdnd9/f9cb590cdf265f499b0e2e5d91fc75.gif" title="Demander le retour immédiat de la flotte ejectée" onclick="localStorage.setItem(\''+GLOB_cur_planet+'_eject_ejection_time\', \''+retour_time+'\');"/></div>';
        data += "\n"+'<div id="del_button_retour" style="height:0px;position:relative;left:578px;top:-20px;"><img style="cursor:pointer;width:16px;height:auto;" src="http://www.sephiogame.com/script/newsletter-close-button.png" title="Annuler le retour de la flotte ejectée" onclick="localStorage.setItem(\''+GLOB_cur_planet+'_eject_retour_auto\', \'non\');window.location.href=window.location.href;"/></div>';
        data += "\n"+'</div>';
        data += "\n"+'</div>';
        setTimeout(countdownRetour,1000);
    } else {
        if (gup('page') !== 'movement')
            setTimeout(function(){window.location.href = 'https://'+univers+'/game/index.php?page=movement';}, 2000);
    }
}
// End auto attack bar generation


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
        var info_button1=get_info_button("button1");
        lvlMineMetal= parseInt(info_button1[0]);
        lvlMineMetal_Next= parseInt(info_button1[1]);

        var info_button2=get_info_button("button2");
        lvlMineCris= parseInt(info_button2[0]);
        lvlMineCris_Next= parseInt(info_button2[1]);

        var info_button3=get_info_button("button3");
        lvlSynthDeut= parseInt(info_button3[0]);
        lvlSynthDeut_Next= parseInt(info_button3[1]);

        var info_button4=get_info_button("button4");
        lvlSolar= parseInt(info_button4[0]);
        lvlSolar_Next= parseInt(info_button4[1]);

        //destruction varriable
        info_button1=null;
        info_button2=null;
        info_button3=null;
        info_button4=null;

    } else {

        var info_button2=get_info_button("button2");
        lvlBaseLunaire= parseInt(info_button2[0]);
        lvlBaseLunaire_Next= parseInt(info_button2[1]);

        info_button2=null;
    } 
    
    if (GLOB_persistedData["listPrev"].length == 0 && ((!cur_planetIsLune && lvlMineMetal <= 1 && lvlMineCris <= 1 && lvlSolar <= 1) || (cur_planetIsLune && lvlBaseLunaire==0))) {
        blit_message_time("<b>Pack de démarrage rapide</b> disponible pour votre nouvelle "+(cur_planetIsLune ? 'lune' : 'planète')+" !", 6000);
        enable_quick_pack = true;
        count_progs++;
        GLOB_nb_special_bars++;
        data += "\n"+'<div style="height:0px;position:relative;top:'+(27*(count_progs-1))+'px;">';
        data += "\n"+'  <div style="cursor:default;word-wrap: normal;height:20px;font: 700 12px Verdana,Arial,Helvetica,sans-serif;position:relative;left:-8px;padding-top:7px;background: url(http://www.sephiogame.com/images/barre_fond.gif) no-repeat;background-position:0px -1px;width:640px;margin-bottom:0px;color:#A0A0A0;padding-left:40px;font-weight:normal;">';
        data += "\n"+'    <p style="width:600px;height:20px;white-space: nowrap; cursor:pointer" id="startquickpack" title="Activer le pack">Cliquez ici pour utiliser le <b>pack de démarrage rapide</b>.</p>';
        data += "\n"+'  </div>';
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
if (gup('page') !== 'traderOverview' && gup('page') !== 'premium' && gup('page')!=='buddies'
        && gup('page') !== 'resourceSettings' && gup('page') !== 'galaxy' && gup('page') !== 'highscore'
        && gup('sephiScript') != '1' && gup('page') !== 'fleet1' && gup('page') !== 'fleet2' && gup('page') !== 'fleet3'
    ) {
    ////////////////
    //Imp2Toulouse- FIRST IMPACT 6.0.5
    ////////////////
    if (gup('page')!=='resourceSettings' && gup('page')!=='messages' && gup('page')!=='chat') $('#planet').removeClass('shortHeader').addClass('Header'); 
    ////////////////
    var ress_metal = $(document.body).find('#resources_metal').html().match(/\d/g).join("");
    var ress_crystal = $(document.body).find('#resources_crystal').html().match(/\d/g).join("");
    var ress_deuterium = $(document.body).find('#resources_deuterium').html().match(/\d/g).join("");
   
    decalY_prev = count_progs;
    reportfini = false;
    for (var i=0 ; i<GLOB_persistedData["listPrev"].length && GLOB_persistedData["listPrev"][i]; i++) {
        pref = get_prev_data("page", i);
        multip = "";
        factor=1;
        if (get_prev_data("form_initial_number", i) !== null && get_prev_data("form_initial_number", i) !== "")
            multip = " (x"+get_prev_data("form_initial_number", i)+")";
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
            data += get_prevision_bar_html(i,textSupp, titles_cat[categories.indexOf(pref)], get_prev_data("title", i).replace(/_esp_/g, ' ')+multip, color, parseInt(get_prev_data("cur_met_prev", i))*factor,parseInt(get_prev_data("cur_crys_prev", i))*factor,parseInt(get_prev_data("cur_deut_prev", i))*factor,ress_metal,ress_crystal,ress_deuterium,count_progs);
        }
    }   
    
    if (reportfini) {
        save_important_vars();
        blit_message('La liste de constructions à été mise à jour, actualisation.');
        setTimeout(function(){location.href=location.href;}, 1000);
        exit(0);
    }
}

if (gup('page') !== 'traderOverview' && gup('page') !== 'premium' && gup('page') !== 'galaxy'
        && gup('page') !== 'highscore' && gup('page') !== 'fleet1' && gup('page') !== 'fleet2'
        && gup('page') !== 'fleet3'
    ) {
    // Affichage des commmandes programmées
    head_height=$('#'+id_prev).height();
    (gup('page') != 'messages')?decalTop=270:decalTop=0;
    if(gup('page') == 'shipyard' || gup('page') == 'research' || gup('page') == 'defense' || gup('page') == 'fleet1'
        || gup('page') == 'fleet2' || gup('page') == 'fleet3' || gup('page') == 'alliance'
        || gup('page') == 'movement') {decalTop-=50;head_height=250;}
    if(gup('page') == 'resourceSettings') decalTop=10;

    $('#'+id_prev).append('<div id="info_prog" style="position:relative;top:'+decalTop+'px;">'+data+'</div>');
    $('#'+id_prev).height(head_height+(count_progs*27-5) +"px");

    if (gup('page') == "overview") {$("#overviewBottom").css("margin-top", (count_progs*27) + "px");}
    $("#support_prev_block").height((count_progs*27)+"px");

    if (retard_AA_button) {
        $('#retard_AA_button').on('click',function(){
            new_prog_time = parseInt(readData('progTime','AA')) + 15*60*1000; // retarde de 15 min
            localStorage.setItem(GLOB_cur_planet+'_AA_progTime', new_prog_time);
        });
        $('#launch_AA_button').on('click',function(){
            new_prog_time = time()+ 10*1000; // lancer dans 10 secondes
            localStorage.setItem(GLOB_cur_planet+'_AA_progTime', new_prog_time);
        });
    }

    // Drag & Drop des constructions
    if (gup('sephiScript') != '1') for (var i=0 ; i<GLOB_persistedData["listPrev"].length && GLOB_persistedData["listPrev"][i]; i++) {$('#dragdrop_prev_'+i).mousedown(drag_prev);}
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


// Drag & Drop des planètes
document.getElementById('countColonies').innerHTML += '<img style="cursor:pointer;width:18px;height:auto;position:relative;z-index:1000;left:150px;top:-23px;" id="dragplaActive" src="http://www.sephiogame.com/script/dragdrop.png" title="Activer le déplacement des planètes">';
document.getElementById('countColonies').innerHTML += '<img style="cursor:pointer;width:18px;height:auto;position:relative;z-index:1000;left:154px;top:-22px;" id="dragplaReset" src="http://www.sephiogame.com/script/newsletter-close-button.png" title="Réinitialiser déplacement des planètes">';
document.getElementById('dragplaActive').onclick =function(){
    for (i=0 ; i<nb_planet ; i++) {
        e = document.getElementById('dragpla-'+planet_list[i]);
        if (e !== null) e.style.display = 'block';
        this.style.display = 'none';
    }
};

document.getElementById('dragplaReset').onclick =function(){
    for (i=0 ; i<nb_planet ; i++) {
        plaPosX[i] = 0;
        plaPosY[i] = 0;
        storeData('plaposX'+planet_list[i], plaPosX[i], 'all');
        storeData('plaposY'+planet_list[i], plaPosY[i], 'all');
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
    if (readData('plaposX'+planet_list[i], 'all') == null) plaPosX[i] = 0;
    else plaPosX[i] = parseInt(readData('plaposX'+planet_list[i], 'all'));
    if (readData('plaposY'+planet_list[i], 'all') == null) plaPosY[i] = 0;
    else plaPosY[i] = parseInt(readData('plaposY'+planet_list[i], 'all'));
    e=document.getElementById("planet-"+planet_list[i]);
    if(e !== null) {
        e.style.left = plaPosX[i]+"px";
        e.style.top = plaPosY[i]+"px";
    }
}


if (gup('page') == 'messages') {
    // Imp2Toulouse- Add id_prev pour le nouveau systeme de message
    $( '#buttonz' ).prepend( '<div id="planet" style="height:1px"> </div>' );
    setInterval(change_message_actiontab,500);
}

curY_decal = 0;
isDragingPla= false;
// Retour vue d'ensemble
if (gup('page') !== 'overview'
    && (
        gup('back') == '1'
        || (readData("back_to_overview", 'all') == "yes" && (readData("change_planet", 'all') !== "yes" || nb_planet==1))
        )
    ) {
    storeData("back_to_overview", "no", 'all');
    blit_message('Retour à vue d\'ensemble dans 10 à 15 secondes.');
    setTimeout(function(){window.location.href = window.location.href.replace(gup('page'), 'overview');}, rand(10,15)*1000);
}

//Met à jour la production et Evite de se deconnecter et visite toutes les planetes
if (parseInt(readData("plapla_change_time1", 'all')) >= 1) plapla_change_time1 = parseInt(readData("plapla_change_time1", 'all'));
if (parseInt(readData("plapla_change_time2", 'all')) >= plapla_change_time1) plapla_change_time2 = parseInt(readData("plapla_change_time2", 'all'));
if (plapla_change_time1>= plapla_change_time2) plapla_change_time2 = plapla_change_time1 + 1;
if (nb_planet>1 && (readData("change_planet", 'all') == "yes" || gup('page') == "overview") && gup('blockswitchplanet') != "yes") {
    attente = rand(plapla_change_time1,plapla_change_time2)*60;
    if ($(document.body).html().match('<div id="attack_alert" style="visibility:visible;">')) attente = rand(1,2)*30;
    
    if (readData("noplaplaChange", 'all') == 'oui') {
        storeData("change_planet", "no", 'all');
        setTimeout(function(){blit_message_time('<span style="float: none;margin: 0;color:red">Attention : Changement de planète désactivé</span>',10000);}, 20000);
    } else {
        if (readData("change_planet", 'all') == "yes") {
            attente=rand(10,15);
            storeData("change_planet", "no", 'all');
            blit_message('<span style="float: none;margin: 0;color:#109E18">Construction lancée</span>, changement de planète dans 10 à 15 secondes.');
        } else {
            dump_attente = attente;
            deb_time = time();
            for (i=1;i<=20;i++) setTimeout(function(){if (!GLOB_planet_change_inhibited) blit_message('Changement de planète prévu dans <span style="float: none;margin: 0;color:#109E18">'+get_cool_time(dump_attente - Math.floor((time()-deb_time)/1000))+' minutes</span>.', true);}, i*17000);
        }
    }
    
    if (readData("noplaplaChange", 'all') != 'oui') {
        // On prévoit le changement de planète
        setTimeout(function(){
            storeData("just_to_update_prod", "yes", 'all');

            if (gup('cp') == "") {url = window.location.href+'&cp='+planet_list[(cur_planet_id+1)%nb_planet];}
            else url = window.location.href.replace(gup('cp'), planet_list[(cur_planet_id+1)%nb_planet]);

            if (!GLOB_planet_change_inhibited) {
                if (gup('page') == "overview" && (gup('startAA') == 1 || gup('RG') == 'OUI' || gup('AA') == 'OUI')) url = 'https://'+univers+'/game/index.php?page=overview&cp='+planet_list[(cur_planet_id+1)%nb_planet];
                window.location.href = url;
            }
            if (GLOB_planet_change_inhibited && gup('page') !== 'overview') window.location.href = window.location.href.replace(gup('page'), 'overview');
        }, attente*1000);
    } else {
        // On actualise simplement la page pour vérifier si une attaque n'est pas en cours
        setTimeout(function(){
            window.location.href = window.location.href;
        }, rand(plapla_change_time1, plapla_change_time2)*60*1000);
    }
}

//Retour auto à vue d'ensemble apres 5-10 min
var backOverviewTimeout = setTimeout(function(){
    window.location.href = window.location.href.replace(gup('page'), 'overview').replace('&sephiScript=1', '');
}, rand(5,10)*60*1000);

if (gup('page') == "fleet1") {
    e=$('.send_none:eq(0)');
    if ($(e).length >= 1) {
        clock = '<div style="position: relative;top: -57px;left:128px;px;z-index: 1000;font-size:12px;height:0px;width:0px;"><div style="position:relative;left:95px;top:75px;width:200px;height:20px;">';
        clock += '<input type="text" id="flotte_id" title="Identificateur flotte" style="width:130px;text-align:left;height:20px;margin-left:0px;font-family: inherit;color:#202040;position:relative;left:10px;top:-23px;font-size:11px" value="Identificateur flotte"/>';
        clock += '<span class="factorbutton" style="position: relative;top:-22px;left:12px;"><input id="flotte_id_calc" class="btn_blue" style="margin-left:5px;min-width: 30px;height:25px;" type="button" value="Ok"></span>';
        clock += '</div></div>';
        $(e).html($(e).html()+clock);
        $('#flotte_id_calc').on("click",calc_ID_flotte);
    }
}

// Auto Espionnage si sonde
if (gup('page') == "fleet3") {
    e=$('input');
    haveSondes=false;
    count_types = 0;
    $(e).each(function(i){
        if ($(this)[0].name.match("am")) count_types++;
        if ($(this)[0].name.match("am210")) haveSondes=true;
    });
    if (haveSondes && count_types == 1 && $('#button6').attr("class") == 'on') $('#missionButton6').click();
}

if (gup('page') == "fleet1" && gup('eject') == 'yes') {
    var params;
    //Allow to get EXACT battleships and civilships
    var fleets_volume_battleships = get_fleets_capacity("list", $('div#buttonz div.content form#shipsChosen div#battleships li'));
    var fleets_volume_civilships = get_fleets_capacity("list", $('div#buttonz div.content form#shipsChosen div#civilships li'));

    //Define global ressources
    var ress_metal = parseInt($('#resources_metal').text().replace(/\./g, ""));
    var ress_crystal = parseInt($('#resources_crystal').text().replace(/\./g, ""));
    var ress_deuterium = parseInt($('#resources_deuterium').text().replace(/\./g, ""));

    //Calculate global fleet ressources transport and adapt the ressource priority on DEUT in FIRST
    if (fleets_volume_civilships != null) {
        [, PT, GT] = fleets_volume_civilships.match(/am202=(\d+).*am203=(\d+).*/);
        global_fleets_capacity = (PT * 5000) + (GT * 25000);
    } else global_fleets_capacity=0;

    //define ressources priorities params
    ress_priority = "prioMetal=" + ress_priority_metal + "&prioCrystal=" + ress_priority_crystal + "&prioDeuterium=" + ress_priority_deut;

    [capa_metal, capa_crystal, capa_deuterium] = ressources_by_priority(global_fleets_capacity, ress_priority_metal, ress_priority_crystal, ress_priority_deut, ress_metal, ress_crystal, ress_deuterium);
    //Define miss transporter to transport all ressource
    miss_ressources = (ress_metal - capa_metal) + (ress_crystal - capa_crystal) + (ress_deuterium - capa_deuterium);
    if (miss_ressources > 0) {
        mesg_miss_ressources = "Il manque " + (miss_ressources <= 25000 ? Math.ceil(miss_ressources / 5000) + "PT" : Math.ceil(miss_ressources / 25000) + "GT") + " pour transporter toutes vos ressources depuis " + GLOB_cur_planet_name + ".";
        setTimeout(function () {
            blit_message_time("<b style='color:red'>Ressources à quai:</b>" + mesg_miss_ressources, 4000)
        }, 1000);
        setTimeout(function () {
            sendMessage(readData('alert_mail_to', 'all'), "Fleets and ressources ejection from your planet " + GLOB_cur_planet_name, "Hello,\r\n\r\n" + "Ressources à quai: " + mesg_miss_ressources, "");
        }, 6000);
    }

    //Define ressources capacities params
    ressources = "metal=" + parseInt(capa_metal) + "&crystal=" + parseInt(capa_crystal) + "&deuterium=" + parseInt(capa_deuterium);

    if (gup('ID') == 'Exped') {
        with_exped_speed = readData('time_no_AA_type_eject_exped_speed', 'AA');
        with_exped_time = readData('time_no_AA_type_eject_exped_temps', 'AA')
        sephi_opt = "eject=yes&ID=Exped" + ((with_exped_speed == null || with_exped_speed == '') ? '' : "&exped_speed=" + parseInt(with_exped_speed)) + ((with_exped_time == null || with_exped_time == '') ? '' : "&exped_time=" + parseInt(with_exped_time));
        [,galaxy,system]=cur_planet_coords.match(/\[(\d+):(\d+):.*\]/);
        params = JSON.parse('{ "url": "' + "https://" + univers + "/game/index.php" + '", "page": "page=fleet1", "from": "' + "cp=" + planet_list[planame_list.indexOf(GLOB_cur_planet_name)] + '", "to": "' + "galaxy=" + galaxy + "&system=" + system + "&position=16"+'", "type_mission": "' + "type=1&mission=15" + '", "fleets": "' + "speed=1&" + (fleets_volume_civilships + "&" + fleets_volume_battleships) + '", "ressources": "' + ressources + '&' + ress_priority + '", "fleets_opts": "' + "union2=0&holdingOrExpTime=0&acsValues=-&holdingtime=1&expeditiontime=1&retreatAfterDefenderRetreat=0" + '", "token": "' + "token=" + '", "step": "' + 1 + '", "sephi_opt":"' + sephi_opt + '"}');
    } else if (gup('ID') == 'Transport') {
        with_exped_speed = readData('time_no_AA_type_eject_exped_speed', 'AA');
        sephi_opt = "eject=yes&ID=Transport"+ ((with_exped_speed == null || with_exped_speed == '') ? '' : "&exped_speed=" + parseInt(with_exped_speed));
        params = JSON.parse('{ "url": "' + "https://" + univers + "/game/index.php" + '", "page": "page=fleet1", "from": "' + "cp=" + planet_list[planame_list.indexOf(GLOB_cur_planet_name)] + '", "to": "' + "galaxy=" + (GLOB_persistedData['eject'].split(':')[0]) + "&system=" + (GLOB_persistedData['eject'].split(':')[1]) + "&position=" + (GLOB_persistedData['eject'].split(':')[2]) + '", "type_mission": "' + "type=" + ((eject_onLune) ? "3" : "1") + "&mission=4" + '", "fleets": "' + "speed=1&" + ((eject_all) ? fleets_volume_civilships + "&" + fleets_volume_battleships : fleets_volume_civilships) + '", "ressources": "' + ressources + '&' + ress_priority + '", "fleets_opts": "' + "union2=0&holdingOrExpTime=0&acsValues=-&holdingtime=1&expeditiontime=1&retreatAfterDefenderRetreat=0" + '", "token": "' + "token=" + '", "step": "' + 1 + '", "sephi_opt":"' + sephi_opt + '"}');
    }  else if (gup('ID') == 'Recycl') {
        with_exped_speed = readData('time_no_AA_type_eject_exped_speed', 'AA');
        sephi_opt = "eject=yes&ID=Recycl"+ ((with_exped_speed == null || with_exped_speed == '') ? '' : "&exped_speed=" + parseInt(with_exped_speed));
        [,galaxy,system,position]=cur_planet_coords.match(/\[(\d+):(\d+):(\d+)\]/);
        params = JSON.parse('{ "url": "' + "https://" + univers + "/game/index.php" + '", "page": "page=fleet1", "from": "' + "cp=" + planet_list[planame_list.indexOf(GLOB_cur_planet_name)] + '", "to": "' + "galaxy=" + galaxy + "&system=" + system + "&position=" + position + '", "type_mission": "' + "type=2&mission=8" + '", "fleets": "' + "speed=1&" + ((eject_all) ? fleets_volume_civilships + "&" + fleets_volume_battleships : fleets_volume_civilships) + '", "ressources": "' + ressources + '&' + ress_priority + '", "fleets_opts": "' + "union2=0&holdingOrExpTime=0&acsValues=-&holdingtime=1&expeditiontime=1&retreatAfterDefenderRetreat=0" + '", "token": "' + "token=" + '", "step": "' + 1 + '", "sephi_opt":"' + sephi_opt + '"}');
    } else {
        storeData('eject_selectPlanet', planet_list[planame_list.indexOf(GLOB_cur_planet_name)], 'all');
        sephi_opt = "eject=yes";
        params = JSON.parse('{ "url": "' + "https://" + univers + "/game/index.php" + '", "page": "page=fleet1", "from": "' + "cp=" + planet_list[planame_list.indexOf(GLOB_cur_planet_name)] + '", "to": "' + "galaxy=" + (GLOB_persistedData['eject'].split(':')[0]) + "&system=" + (GLOB_persistedData['eject'].split(':')[1]) + "&position=" + (GLOB_persistedData['eject'].split(':')[2]) + '", "type_mission": "' + "type=" + ((eject_onLune) ? "3" : "1") + "&mission=4" + '", "fleets": "' + "speed=1&" + ((eject_all) ? fleets_volume_civilships + "&" + fleets_volume_battleships : fleets_volume_civilships) + '", "ressources": "' + ressources + '&' + ress_priority + '", "fleets_opts": "' + "union2=0&holdingOrExpTime=0&acsValues=-&holdingtime=1&expeditiontime=1&retreatAfterDefenderRetreat=0" + '", "token": "' + "token=" + '", "step": "' + 1 + '", "sephi_opt":"' + sephi_opt + '"}');
    }
    storeData('data',JSON.stringify(params), 'form');
    PostXMLHttpRequest(params.url+"?"+params.page+"&"+params.from,"",SendFleet);
//    console.log("Request:"+params.url+"?"+params.page+"&"+params.from);
    params=null;ressources=null;fleets_volume_battleships=null;fleets_volume_civilships=null,ress_priority=null,ressources=null,capa_metal=null,capa_crystal=null,capa_deuterium=null;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////

if (gup('page') == "movement" && readData('retour_auto', 'eject') == 'oui' && time() - parseInt(readData('ejection_time', 'eject')) > retour_time){
    storeData('retour_auto', 'non', 'eject');
    flottes = document.getElementsByClassName('fleetDetails');
    for (i=flottes.length-1 ; i>=0 ; i--) {
        t = flottes[i].innerHTML.split('</a>')[0].split('>');
        coord = t[t.length-1];
        if (coord == cur_planet_coords.replace('Lune','') && flottes[i].innerHTML.split('return=').length > 1) {
            r = flottes[i].innerHTML.split('return=')[1].split('"')[0];

            // Autorise à re-ejecter dès que les flottes sont rentrés
            removeData('escaped_'+readData('eject_selectPlanet', 'all'), 'all');
            removeData('eject_selectPlanet', 'all');
            setTimeout(function(){window.location.href = 'https://'+univers+'/game/index.php?page=movement&back=1&return='+r;}, 2000);
            document.getElementById('eject_button').src=document.getElementById('eject_button').src.replace("green","grey").replace("red","grey");
            break;
        }
    }
}

// Recyclage
if (gup('page') == "fleet1" && gup('setRecy') !== null && gup('setRecy') !== '') {
    nbRecy = parseInt(gup('setRecy'));
    document.getElementById('shipsChosen').action += "&recyclPLZ=oui";
    setTimeout(function(){document.getElementById('button209').getElementsByTagName('a')[0].click();},100);
    setTimeout(function(){document.getElementById('ship_209').value=nbRecy;},300);
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

    maxPT = get_info_button("button202")[0];
    maxGT = get_info_button("button203")[0];

    //Check if Flotte/Def of opponant has changed
    check_perso_is_needed=(gup('check_perso_is_needed') === "1");

    maxNames = new Array('Chasseur léger','Chasseur lourd','Croiseur','Vaisseau de bataille','Traqueur','Bombardier','Destructeur','Étoile de la mort','Petit transporteur','Grand transporteur','Vaisseau de colonisation','Recycleur','Sonde d`espionnage');
    maxNames_button = new Array('204','205','206','207','215','211','213','214','202','203','208','209','210');
    perso_is_ok = true;
    //Check if flotte_perso is ok
    fleets_perso="";
    if (gup('flotte_perso') !== '') {
        nbf = gup('flotte_perso').split(':');
        var supPT = 0;
        var supGT = 0
        for (i=0; i<nbf.length ; i++) {
            if (maxNames_button[i] === undefined) break;
            if (maxNames_button[i] == "202" || maxNames_button[i] == "203"){
                if (maxNames_button[i] == "202" && nbf[i].length > 0) supPT = parseInt(nbf[i]);
                if (maxNames_button[i] == "203" && nbf[i].length > 0) supGT = parseInt(nbf[i]);
            } else {
                fleets_perso+= "&am"+maxNames_button[i]+"="+nbf[i];
            }
            if (parseInt(nbf[i]) > parseInt(get_info_button("button"+maxNames_button[i])[0]))    
                perso_is_ok=false;
        }
        
        if (perso_is_ok) {
            nbPT = supPT + nbPT;
            nbGT = supGT + nbGT;
        }
    }

    idcook = 'AA_feed';
    if (gup('ID') == 'Exped') idcook = 'AA_Exp';
    if (!hasEnoughSlots()) {
        document.title = 'Pas assez de slots disponible';
        //Imperator2Toulouse- In case of single auto attack
        if (gup('ID') == 0) {
            if (gup('Referer') != "") {
                setTimeout(function(){window.location.href = "https://"+univers+"/game/index.php?"+decodeURIComponent(gup('Referer'));}, 4000);
                blit_message("<b>Attaque</b> en echec par manque de slot libre (retour auto vers la page).");
            } else {
                blit_message("<b>Attaque</b> en echec par manque de slot libre.");
            }
        } else {
            storeData(idcook, gup('ID')+'_FLOTTE', 'all');
        }
    }
    else if (check_perso_is_needed && gup('force') !== '1') {document.title = 'Alerte sur volume de Flotte/Defense ennemie'; storeData(idcook, gup('ID')+'_DEForFLOTTE_HasCHANGED', 'all');}
    else if (!perso_is_ok) {document.title = 'Flotte Perso impossible'; storeData(idcook, gup('ID')+'_NO_PERSO', 'all');}
    else if (nbPT > maxPT && (gup('force') !== '1' || maxPT==0)) {document.title = 'Manque de Petits transporteurs'; storeData(idcook, gup('ID')+'_NO_PT', 'all');}
    else if (nbGT > maxGT && (gup('force') !== '1' || maxGT==0)) {document.title = 'Manque de Grands transporteurs'; storeData(idcook, gup('ID')+'_NO_GT', 'all');}
    else {
        ////////////////////////////
        //// USE NEW SendFleet
        var params; 
        var cp ="cp="+planet_list[planame_list.indexOf(GLOB_cur_planet_name)];
        var url= "https://"+univers+"/game/index.php";
        var to= "galaxy="+gup('galaxy')+"&system="+gup('system')+"&position="+gup('position');
        var type_mission= "type="+gup('type')+"&mission="+gup('mission');
        var ressources="metal=0&crystal=0&deuterium=0&prioMetal=1&prioCrystal=2&prioDeuterium=3";
        var fleets_opts= "union2=0&holdingOrExpTime=0&acsValues=-&holdingtime=1&expeditiontime=1&retreatAfterDefenderRetreat=0";
        var token= "token=";
        var step = 1;
        sephi_opt="auto=yes&ID="+gup('ID')+"&Referer="+gup('Referer');
        if (gup('ID') == 'Exped') {
            with_exped_speed=readData('with_exped_speed','AA');
            with_exped_time=readData('with_exped_time','AA');
            sephi_opt+=((with_exped_speed == null || with_exped_speed == '')?'':"&exped_speed="+parseInt(with_exped_speed)) + ((with_exped_time == null || with_exped_time == '')?'':"&exped_time="+parseInt(with_exped_time));

        }
        var fleets="speed=10&am202="+(nbPT)+"&am203="+(nbGT)+fleets_perso;
        console.log("fleets sent from "+GLOB_cur_planet_name+"="+fleets);

        params=JSON.parse('{ "url": "'+url+'", "page": "page=fleet1", "from": "'+cp+'", "to": "'+to+'", "type_mission": "'+type_mission+'", "fleets": "'+fleets+'", "ressources": "'+ressources+'", "fleets_opts": "'+fleets_opts+'", "token": "'+token+'", "step": "'+step+'", "sephi_opt": "'+sephi_opt+'"}');

        //    params=JSON.parse('{ "url": "'+"https://"+univers+"/game/index.php"+'", "page": "page=fleet1", "from": "'+"cp="+planet_list[planame_list.indexOf(GLOB_cur_planet_name)]+'", "to": "'+"galaxy="+(persistedData['eject'].split(':')[0])+"&system="+(persistedData['eject'].split(':')[1])+"&position="+(persistedData['eject'].split(':')[2])+'", "type_mission": "'+"type="+((eject_onLune)?"3":"1")+"&mission=4"+'", "fleets": "'+"speed=1&am204=99999&am205=99999&am206=99999&am207=99999&am215=99999&am211=99999&am213=99999&am214=99999"+((eject_all)?"&am202=99999&am203=99999&am208=99999&am209=99999&am210=99999":"")+'", "ressources": "'+"metal=999999999&crystal=999999999&deuterium=999999999"+'", "fleets_opts": "'+"union2=0&holdingOrExpTime=0&acsValues=-&holdingtime=0&expeditiontime=0&retreatAfterDefenderRetreat=0"+'", "token": "'+"token="+'", "step": "'+1+'"}');
        storeData('data',JSON.stringify(params), 'form');
        PostXMLHttpRequest(params.url+"?"+params.page+"&"+params.from,"",SendFleet);
        params=null;
        //////////

    }
}

if (gup('page') == "movement" && gup('auto') == 'yes') {
    idcook = 'AA_feed';
    if (gup('ID') == 'Exped') idcook = 'AA_Exp';
    storeData(idcook, gup('ID')+'_IS_OK', 'all');
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
    data+='<table id="tab_coming_soon" style="width:656px;position:relative;top:'+(document.getElementById("planet").offsetHeight-27)+'px;left:-2px;border: 1px solid #000000;color: #777;background:#0D1014;margin:auto;margin-bottom:16px;"><tbody><tr style="background:#1b1b1b;color: #999;"><th style="border: 1px solid #303030;padding: 5px 8px;">Planète</th><th style="border: 1px solid #303030;padding: 5px 8px;">Métal</th><th style="border: 1px solid #303030;padding: 5px 8px;">Cristal</th><th style="border: 1px solid #303030;padding: 5px 8px;">Deuterium</th><th style="border: 1px solid #303030;padding: 5px 8px;">Vaisseaux</th></tr>';
    
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
if (gup('page') == 'messages') {
    data = '    <div class="tab_ctn">';
    data += '        <ul class="tab_inner clearfix">';
    data += '            <div class="contentbox commander_ad clearfix">';
    data += '                <h2 class="header">';
    data += '                    <span class="c-right"></span>';
    data += '                    <span class="c-left"></span>';
    data += '                    Generation des rapports d\'auto-attaque';
    data += '                </h2>';
    data += '                <div class="content">';
     
    data += '                    <p id="old_rapport_gen" style="display:'+((readData('lastRap', 'AA') !== null)?'inline':'none')+';text-align:left;cursor:pointer;color:#6f9fc8;position:relative;top:7px;padding-left:30px;font-weight:normal;padding-bottom:10px;padding-top:10px;">&#9658; Relire le dernier <b>rapport général</b> de cette planète (Généré il y a '+get_Time_Remain(readData("last_start", "AA"))+')</p>';
    data += '                    <p id="rapport_gen" style="text-align:left;cursor:pointer;color:#6f9fc8;position:relative;top:7px;padding-left:30px;font-weight:normal;padding-bottom:10px;padding-top:10px;">&#9658; Demander un <b>rapport général</b> (seulement les rapports non lu de cette page)</p>';
    data += '                    <p style="text-align:left;color:#808080;position:relative;top:7px;padding-left:40px;font-weight:normal;padding-bottom:10px;padding-top:0px;"><input type="checkbox" id="with_readed_RG" style="position:relative;top:2px;"/> Considérer également les rapports lus (maximum <input type="text" id="NB_readed_RG" value="5" style="text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;" onfocus="document.getElementById(\'with_readed_RG\').checked = true;"> rapports)</p>';
    data += '                    <p style="text-align:left;color:#808080;position:relative;top:7px;padding-left:40px;font-weight:normal;padding-bottom:20px;padding-top:0px;"><input type="checkbox" id="AA_RG" style="position:relative;top:2px;"/> Attaquer automatiquement si le butin est supérieur à <input type="text" id="butin_AA_RG" value="'+defaut_AA_butin+'" style="text-align:center; width:50px;margin-left:5px;margin-right:5px;height: 15px;" onfocus="document.getElementById(\'AA_RG\').checked = true;"> (<span style="cursor:pointer;" id="save_AA_butin">enregistrer</span>)</p>';
    data += '                    <p id="old_rapport_gen_AA" style="display:none;text-align:left;cursor:pointer;color:#6f9fc8;position:relative;top:7px;padding-left:30px;font-weight:normal;padding-bottom:30px;">&#9658; Lancer une auto-attaque avec ce rapport';
    data += '                    <div id="rapport_gen_place" style="width:575px;margin:auto;"></div>';
    data += '                </div>';
    data += '                <div class="footer">';
    data += '                   <div class="c-right"></div>';
    data += '                   <div class="c-left"></div>';
    data += '                </div>';
    data += '            </div>';
    data += '        </ul>';
    data += '    </div>';

    $( '.tabs_btn' ).append( '<li id="tabs-RG-AA" class="list_item ui-state-default ui-corner-top ui-state-active" data-tabid="7" role="tab" tabindex="-1" aria-controls="tabs" aria-labelledby="ui-id-13" aria-selected="false" aria-expanded="false"><a href="#" class="tabs_btn_img tb_fleets ui-tabs-anchor" role="presentation" tabindex="-1" id="ui-id-13"><img src="http://www.sephiogame.com/script/Software_Update_icon.png" height="54" width="54"><div class="marker"></div><span class="icon_caption">Auto-Attaque</span></a></li>' );
    $( '.tabs_wrap' ).append( '<div id="tabs" class="ui-tabs-panel ui-widget-content ui-corner-bottom" aria-live="polite" aria-labelledby="ui-id-13" role="tabpanel" aria-hidden="true" style="display: none;">'+data+'</div>');

    $('#buttonz li[id^="tabs"] a').click(function(event){

        ////////////////////////
        var activeTabid = $('#buttonz .content .tabs_btn .list_item.ui-tabs-active a').attr('id');
        var activeTabrel = $('#buttonz .content .tabs_btn .list_item.ui-tabs-active a').attr('rel');
        var activeButtonid=$('#buttonz .content .tabs_btn .list_item.ui-tabs-active').attr('id');
        var activeButtontabid=$('#'+activeButtonid).attr("data-tabid");
        var activeAriaControls=$('#'+activeButtonid).attr("aria-controls");

        var activeSubtabid = '';
        $('#buttonz .content .tab_ctn .list_item.ui-tabs-active a').each(function(){
            activeSubtabid = $(this).attr('id');
        });
        var activeSubbuttonid=$('#buttonz .content .tab_ctn .list_item.ui-tabs-active').attr('id');
        
        //desactivate and hidden button and associated tab
        $('#'+activeButtonid).attr("aria-selected","false");
        $('#'+activeButtonid).attr("aria-expanded","false");
        $('#'+activeButtonid).attr("aria-hidden","true");
        $('#'+activeButtonid).attr("href","https://"+univers+"/game/"+activeTabrel);
        
        $('#'+activeSubbuttonid).attr("aria-selected","false");
        $('#'+activeSubbuttonid).attr("aria-expanded","false");
        $('#'+activeSubbuttonid).removeClass( "ui-tabs-active" );
        $('#'+activeAriaControls).attr("aria-hidden","true");
        $('#'+activeAriaControls).hide();
        $('#'+activeButtonid).removeClass( "ui-tabs-active" );
        
        $(this).parent().addClass( "ui-tabs-active" );
        $(this).parent().attr("aria-selected","true");
        $(this).parent().attr("aria-expanded","true");
        $(this).parent().attr("aria-hidden","false");
        $(this).parent().show();
        $('#'+$(this).parent().attr("aria-controls")).show();

    });

    document.getElementById('save_AA_butin').onclick =function(){
        storeData('AA_butin', document.getElementById('butin_AA_RG').value.match(/\d/g).join(""), 'AA');
        this.innerHTML = 'ok';
        this.style.cursor = 'default';
    };

    document.getElementById('rapport_gen').onclick =function(){
        document.getElementById('old_rapport_gen').style.display="none";
        start_rapport_general();
    };

    if (readData('lastRap', 'AA') !== null) document.getElementById('old_rapport_gen').onclick =function(){
        document.getElementById('old_rapport_gen_AA').style.display = 'block';
        document.getElementById('rapport_gen_place').innerHTML = '<iframe style="display:none;" id="ifr_AA" src="https://ready"></iframe><table id="rap_general_table" style="width:100%;position:relative;top:0px;left:0px;border: 1px solid #000000;color: #777;background:#0D1014;margin:auto;margin-bottom:0px;">'+readData('lastRap', 'AA')+'</table>';
        document.getElementById('old_rapport_gen').style.display="none";
        check_AA_feedback();
    };
    if (readData('lastRap', 'AA') !== null) document.getElementById('old_rapport_gen_AA').onclick =function(){
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
            idFrig=is_frigo(GLOB_persistedData["frigos"],document.getElementById('rap_general_coord_'+GLOB_rgID).innerHTML);
            //If 5 items set so a "flotte_perso" exist
            if (idFrig>=0 && GLOB_persistedData["frigos"][idFrig].length > 5) flotte_perso=GLOB_persistedData["frigos"][idFrig][5];
            ////

            // Set if flotte perso need to be check in case of opponant flotte or def has changed
            check_perso_is_needed='';
            check_perso_is_needed=(((parseInt(GLOB_persistedData["frigos"][idFrig][7]) >0 || parseInt(GLOB_persistedData["frigos"][idFrig][7])>0) && GLOB_persistedData["frigos"][idFrig][5] == '') || (parseInt(GLOB_persistedData["frigos"][idFrig][7])<parseInt(GLOB_persistedData["frigos"][idFrig][9])) || (parseInt(GLOB_persistedData["frigos"][idFrig][8])<parseInt(GLOB_persistedData["frigos"][idFrig][10])))?"1":"0";

            document.getElementById('rap_general_planet_name_'+GLOB_rgID).innerHTML = clean_name(document.getElementById('rap_general_planet_name_'+GLOB_rgID).innerHTML);
            document.getElementById('rap_general_planet_name_'+GLOB_rgID).style.color = '';
            GLOB_rgButins[GLOB_rgID] = new Array();
            GLOB_rgButins[GLOB_rgID][0] = butin;
            GLOB_rgButins[GLOB_rgID][1] = GLOB_rgID;

            (readData('force','AA') == 'oui')?forceparam = '&force=1':forceparam = '';
            (check_perso_is_needed != "")?checkperso_param="&check_perso_is_needed="+check_perso_is_needed:checkperso_param="";
            GLOB_rgButins[GLOB_rgID][2] = 'https://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+(GLOB_rgID)+'&PT='+(2+Math.floor(butin/5000))+forceparam+'&flotte_perso='+flotte_perso+'&cp='+GLOB_cur_planet+checkperso_param+'';
            GLOB_rgButins[GLOB_rgID][3] = 'https://'+univers+'/game/index.php?page=fleet1&galaxy='+galaxy+'&system='+system+'&position='+planet+'&type=1&mission=1&auto=yes&ID='+(GLOB_rgID)+'&GT='+(2+Math.floor(butin/25000))+forceparam+'&flotte_perso='+flotte_perso+'&cp='+GLOB_cur_planet+checkperso_param+'';
            GLOB_rgID++;
        }

        GLOB_rgButins = GLOB_rgButins.sort(function(a,b) { return b[0] - a[0] });
        GLOB_curAA_ID = 0;

        launchAA=true;

        isFirstTry = true;
        if (!waitingExped) attack_cur();
    };

    if (gup('RG') == 'OUI') {
        $( '.tabs_btn a' ).trigger("click");

        setTimeout(start_rapport_general,2000);
    }
    if (gup('AA') == 'OUI') {
        document.getElementById('AA_RG').checked = true;
    }
}
// END - Rapport général

add_programmation_button();
//setInterval(function(){if ($("#content") > 0 && cur_title !== '') {cur_title = ''}}, 100);
save_list_in_cookies();
update_timers();
verif=setTimeout(gestion_cook, rand(2,4)*1000);

/* Page Sephi Script */
if (gup('sephiScript') == '1') {
    document.getElementById('planetList').innerHTML = document.getElementById('planetList').innerHTML.replace(/page=shipyard/g,'page=shipyard&sephiScript=1');
    bonus_class="selected";
    bonus_style=" background-position:0px 27px;";
    document.getElementById('menuTable').innerHTML = document.getElementById('menuTable').innerHTML.replace('shipyard highlighted','shipyard').replace('menubutton  selected','menubutton');

    document.getElementById('planet').style.backgroundImage = 'url(http://www.sephiogame.com/script/cadre_sephi_script_page.png)';
    document.getElementById('header_text').innerHTML = document.getElementById('header_text').innerHTML.replace('Chantier spatial','SephiOGame');
    sephi_frigos_data= '';

    //Imp2toulouse- Factorize this part to the get_Time_Remain (previously get_last_AA_coolTime) function
    lastAAcoolTime=get_Time_Remain(readData("last_start", "AA"));

    titletext = 'Mes frigos';
    if (GLOB_persistedData["frigos"].length == 1) titletext = 'Mon frigo';
    if (GLOB_persistedData["frigos"].length>1) titletext = 'Mes '+GLOB_persistedData["frigos"].length+' frigos';
    // Les frigos
    sephi_frigos_data+='<div class="header" style=""><h2>'+titletext+'</h2></div>';
    sephi_frigos_data+='<div class="content" style="min-height: 90px;positon:relative;z-index:10;margin-bottom:40px;padding-top:25px;padding-left:30px;">';
    if (lastAAcoolTime != null) sephi_frigos_data+='<p style="color:#A52592;position:relative;top:-10px;margin-bottom:5px;padding-left:20px;">Dernier rapport global généré il y a ' + lastAAcoolTime+ '</p>';

    sephi_frigos_data+='<span id="spy_all" style="cursor:pointer;color:#6f9fc8;padding-left:20px;position:relative;top:px;">&#9658; <b>Espionner tout mes frigos</b> (ne quittez pas la page avant que tous soient cochés)</span><br><br>';
    sephi_frigos_data+='<span id="rap_gene" style="cursor:pointer;color:#6f9fc8;padding-left:20px;position:relative;top:px;">&#9658; Demander un <b>Rapport Général</b> (patientez ici avant d\'avoir votre rapport)</span><br><br>';
    sephi_frigos_data+='<div style="width:80%;height:1px;background:#404040;position:relative;top:-15px;left:7%;margin-top:20px"></div>';

    sephi_frigos_data+='<span id="auto_attack" style="cursor:pointer;color:#6f9fc8;padding-left:20px;">&#9658; Lancer un <b>rapport général</b> sur mes frigos avec les options configurées (laisser faire le script).</span><br><br>';
    sephi_frigos_data+='<div style="background:#404040;position:relative;top:-25px;left:7%;margin-top:20px"></div>';
    sephi_frigos_data+='<span style="text-align:left;color:#c0c0c0;position:relative;top:-12px;padding-left:40px;font-weight:normal;">Configuration de l\'Auto-Attaque:</span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-2px;padding-left:40px;font-weight:normal;"><input type="checkbox" id="prog_AA" style="position:relative;top:2px;"/> Lancer l\'action dans <input type="text" id="time_AA_h" value="1" title="Heures" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;" onfocus="document.getElementById(\'prog_AA\').checked = true;">h<input type="text" id="time_AA_m" value="0" title="Minutes" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;" onfocus="document.getElementById(\'prog_AA\').checked = true;">  <i><span id="save_AA_prog" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-7px;padding-left:40px;font-weight:normal;"><input type="checkbox" id="repeat_AA" style="position:relative;top:2px;"'+((readData('repeat','AA') == 'oui')?'checked':'')+'/> Répéter cette action toutes les <input type="text" id="repeat_AA_h" value="'+((readData('repeat_AA_h','AA') == null)?'6':parseInt('0'+readData('repeat_AA_h','AA')))+'" title="Heures" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;">h<input type="text" id="repeat_AA_m" value="'+((readData('repeat_AA_m','AA') == null)?'0':parseInt('0'+readData('repeat_AA_m','AA')))+'" title="Minutes" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;">  <i><span id="save_AA_repeatTime" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-7px;padding-left:40px;font-weight:normal;"><input type="checkbox" id="time_no_AA" style="position:relative;top:2px;"'+((readData('time_no_AA','AA') == 'oui')?'checked':'')+'/> Désactiver l\'action entre <input type="text" id="time_no_AA_h_start" value="'+((readData('time_no_AA_start','AA') == null)?'23':parseInt('0'+(readData('time_no_AA_h_start','AA') == null?'0':readData('time_no_AA_h_start','AA'))))+'" title="Heures" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;">h<input type="text" id="time_no_AA_m_start" value="'+((readData('time_no_AA_start','AA') == null)?'00':parseInt('0'+(readData('time_no_AA_m_start','AA') == null?'0':readData('time_no_AA_m_start','AA'))))+'" title="Minutes" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;"> et <input type="text" id="time_no_AA_h_end" value="'+((readData('time_no_AA_end','AA') == null)?'6':parseInt('0'+(readData('time_no_AA_h_end','AA') == null?'0':readData('time_no_AA_h_end','AA'))))+'" title="Heures" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;">h<input type="text" id="time_no_AA_m_end" value="'+((readData('time_no_AA_end','AA') == null)?'0':parseInt('0'+(readData('time_no_AA_m_end','AA') == null?'0':readData('time_no_AA_m_end','AA'))))+'" title="Minutes" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;">  <i><span id="save_time_no_AA" style="display:none;">(enregistré)</span></i></span><br>';
    sephi_frigos_data+='<table style="text-align:left;color:#808080;position:relative;top:-7px;left:23px;padding-left:40px;font-weight:normal;"><tr width="100%"><td><select id="time_no_AA_eject_choice" style="position:relative;top:-1px;visibility: visible;color: #000;background-color: #b3c3cb;border: 1px solid #668599;height:18px;"/><option value="avec" '+((readData('time_no_AA_eject_choice','AA') == 'avec')?'selected':'')+'>Avec</option><option value="sans" '+((readData('time_no_AA_eject_choice','AA') == 'sans' || readData('time_no_AA_eject_choice','AA') == null)?'selected':'')+'>Sans</option></select> une éjection</td><td id="time_no_AA_with_eject" style="display: '+((readData('time_no_AA_eject_choice','AA') == 'avec')?'block':'none')+'">&nbsp;par&nbsp;<select id="time_no_AA_type_eject" style="visibility: visible;color: #000;background-color: #b3c3cb;border: 1px solid #668599;height:18px;"/><option value="Transport" '+((readData('time_no_AA_type_eject','AA') == 'Transport' || readData('time_no_AA_type_eject','AA') == '') ? 'selected':'')+'>défaut (transport)</option><option value="Transport" '+(readData('time_no_AA_type_eject','AA') == 'Transport' ? 'selected':'')+'>transports (visible)</option><option value="Exped" '+(readData('time_no_AA_type_eject','AA') == 'Exped' ? 'selected':'')+'>une expedition (ghosted)</option><option value="Recycl" '+(readData('time_no_AA_type_eject','AA') == 'Recycl' ? 'selected':'')+'>le recyclage (ghosted)</option></select>, Speed:<select id="time_no_AA_type_eject_exped_speed" style="visibility: visible;color: #000;background-color: #b3c3cb;border: 1px solid #668599;height:18px;" '+((readData('time_no_AA_eject_choice','AA') == 'avec' && readData('time_no_AA_type_eject','AA') == 'Exped') ? '' : 'disabled')+'><option value="1"'+(readData('time_no_AA_type_eject_exped_speed','AA') == '1' ? 'selected' : '')+'>10%</option><option value="2" '+(readData('time_no_AA_type_eject_exped_speed','AA') == '2' ? 'selected' : '')+'>20%</option><option value="3" '+(readData('time_no_AA_type_eject_exped_speed','AA') == '3' ? 'selected' : '')+'>30%</option><option value="4"'+(readData('time_no_AA_type_eject_exped_speed','AA') == '4' ? 'selected' : '')+'>40%</option><option value="5" '+(readData('time_no_AA_type_eject_exped_speed','AA') == '5' ? 'selected' : '')+'>50%</option><option value="6" '+(readData('time_no_AA_type_eject_exped_speed','AA') == '6' ? 'selected' : '')+'>60%</option><option value="7" '+(readData('time_no_AA_type_eject_exped_speed','AA') == '7' ? 'selected' : '')+'>70%</option><option value="8" '+(readData('time_no_AA_type_eject_exped_speed','AA') == '8' ? 'selected' : '')+'>80%</option><option value="9" '+(readData('time_no_AA_type_eject_exped_speed','AA') == '9' ? 'selected' : '')+'>90%</option><option value="10" '+(readData('time_no_AA_type_eject_exped_speed','AA') == '10' ? 'selected' : '')+'>100%</option></select>, Temps:<select id="time_no_AA_type_eject_exped_temps" style="visibility: visible;color: #000;background-color: #b3c3cb;border: 1px solid #668599;height:18px;" '+((readData('time_no_AA_eject_choice','AA') == 'avec'  && readData('time_no_AA_type_eject','AA') == 'Exped') ? '' : 'disabled')+'><option value="1"'+(readData('time_no_AA_type_eject_exped_temps','AA') == '1' ? 'selected' : '')+'>1</option><option value="2"'+(readData('time_no_AA_type_eject_exped_temps','AA') == '2' ? 'selected' : '')+'>2</option><option value="3"'+(readData('time_no_AA_type_eject_exped_temps','AA') == '3' ? 'selected' : '')+'>3</option><option value="4"'+(readData('time_no_AA_type_eject_exped_temps','AA') == '4' ? 'selected' : '')+'>4</option><option value="5"'+(readData('time_no_AA_type_eject_exped_temps','AA') == '5' ? 'selected' : '')+'>5</option><option value="6"'+(readData('time_no_AA_type_eject_exped_temps','AA') == '6' ? 'selected' : '')+'>6</option><option value="7" '+(readData('time_no_AA_type_eject_exped_temps','AA') == '7' ? 'selected' : '')+'>7</option><option value="8" '+(readData('time_no_AA_type_eject_exped_temps','AA') == '8' ? 'selected' : '')+'>8</option><option value="9"'+(readData('time_no_AA_type_eject_exped_temps','AA') == '9' ? 'selected' : '')+'>9</option><option value="10" '+(readData('time_no_AA_type_eject_exped_temps','AA') == '10' ? 'selected' : '')+'>10</option><option value="11" '+(readData('time_no_AA_type_eject_exped_temps','AA') == '11' ? 'selected' : '')+'>11</option><option value="12" '+(readData('time_no_AA_type_eject_exped_temps','AA') == '12' ? 'selected' : '')+'>12</option><option value="13" '+(readData('time_no_AA_type_eject_exped_temps','AA') == '13' ? 'selected' : '')+'>13</option><option value="14" '+(readData('time_no_AA_type_eject_exped_temps','AA') == '14' ? 'selected' : '')+'>14</option><option value="15" '+(readData('time_no_AA_type_eject_exped_temps','AA') == '15' ? 'selected' : '')+'>15</option></select></td><td>&nbsp;<i><span id="save_time_no_AA_eject_choice" style="display:none;">(enregistré)</span></i></td></tr></table>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-2px;padding-left:40px;font-weight:normal;"><input type="checkbox" id="aa_enable" style="position:relative;top:2px;"'+((readData('aa_enable','AA') == 'oui')?'checked':'')+'/> Lancer une Auto-Attaque suite à la génération. <i><span id="save_AA_enable" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<div style="background:#404040;position:relative;top:-25px;left:7%;margin-top:20px"></div>';
    sephi_frigos_data+='<span style="text-align:left;color:#c0c0c0;position:relative;top:-12px;padding-left:40px;font-weight:normal;">Options spécifiques à cette planète :</span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-12px;padding-left:60px;font-weight:normal;">• Attaquer seulement les frigos dont le butin dépasse <input type="text" id="butin_AA_RG" value="'+defaut_AA_butin+'" style="text-align:center; width:50px;margin-left:5px;margin-right:5px;height: 15px;"/>  <i><span id="save_AA_butin" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-12px;padding-left:60px;font-weight:normal;">• Démarrer aussi une expédition avec <select id="do_exp_AA" style="position:relative;top:-1px;visibility: visible;color: #000;background-color: #b3c3cb;border: 1px solid #668599;height:18px;"><option value="non">Aucune flotte</option><option value="perso" '+(with_exped == 'perso' ? 'selected' : '')+'>Une flotte personalisée</option><option value="50" '+(with_exped == '50' ? 'selected' : '')+'>50 GT (Optimal si le 1er a moins de 100k points)</option><option value="100" '+(with_exped == '100' ? 'selected' : '')+'>100 GT (Optimal si le 1er a moins de 1M points)</option><option value="150" '+(with_exped == '150' ? 'selected' : '')+'>150 GT (Optimal si le 1er a moins de 5M points)</option><option value="200" '+(with_exped == '200' ? 'selected' : '')+'>200 GT (Optimal si le 1er a plus de 5M points)</option><option value="250" '+(with_exped == '250' ? 'selected' : '')+'>250 GT (Mode MadMax pour les warriors)</option></select> <i><span id="save_AA_do_exp" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-12px;padding-left:150px;font-weight:normal;" id="do_exp_AA_flotte_perso" style="display: '+(with_exped != 'perso' ? 'none' : 'block')+';">Flotte personnalisée<span style="cursor:help;" title="Rendez vous sur la page Flotte pour créer un tag de flotte personalisé.">(?)</span> <input id="do_exp_AA_perso" type="text" style="position:relative;top:-1px;visibility: visible;color: #000;background-color: #b3c3cb;border: 1px solid #668599;height:18px;width:80px" '+(with_exped == 'perso' ? '' : 'disabled')+' value="'+(with_exped_perso)+'">, Speed:<select id="do_exp_AA_perso_speed" style="position:relative;top:-1px;visibility: visible;color: #000;background-color: #b3c3cb;border: 1px solid #668599;height:18px;width:60px;" '+(with_exped == 'perso' ? '' : 'disabled')+'><option value="1"'+(with_exped_speed == '1' ? 'selected' : '')+'>10%</option><option value="2" '+(with_exped_speed == '2' ? 'selected' : '')+'>20%</option><option value="3" '+(with_exped_speed == '3' ? 'selected' : '')+'>30%</option><option value="4"'+(with_exped_speed == '4' ? 'selected' : '')+'>40%</option><option value="5" '+(with_exped_speed == '5' ? 'selected' : '')+'>50%</option><option value="6" '+(with_exped_speed == '6' ? 'selected' : '')+'>60%</option><option value="7" '+(with_exped_speed == '7' ? 'selected' : '')+'>70%</option><option value="8" '+(with_exped_speed == '8' ? 'selected' : '')+'>80%</option><option value="9" '+(with_exped_speed == '9' ? 'selected' : '')+'>90%</option><option value="10" '+(with_exped_speed == '10' ? 'selected' : '')+'>100%</option></select>, Temps:<select id="do_exp_AA_perso_temps" style="position:relative;top:-1px;visibility: visible;color: #000;background-color: #b3c3cb;border: 1px solid #668599;height:18px;width:60px;" '+(with_exped == 'perso' ? '' : 'disabled')+'><option value="1"'+(with_exped_time == '1' ? 'selected' : '')+'>1</option><option value="2"'+(with_exped_time == '2' ? 'selected' : '')+'>2</option><option value="3"'+(with_exped_time == '3' ? 'selected' : '')+'>3</option><option value="4"'+(with_exped_time == '4' ? 'selected' : '')+'>4</option><option value="5"'+(with_exped_time == '5' ? 'selected' : '')+'>5</option><option value="6"'+(with_exped_time == '6' ? 'selected' : '')+'>6</option><option value="7" '+(with_exped_time == '7' ? 'selected' : '')+'>7</option><option value="8" '+(with_exped_time == '8' ? 'selected' : '')+'>8</option><option value="9"'+(with_exped_time == '9' ? 'selected' : '')+'>9</option><option value="10" '+(with_exped_time == '10' ? 'selected' : '')+'>10</option><option value="11" '+(with_exped_time == '11' ? 'selected' : '')+'>11</option><option value="12" '+(with_exped_time == '12' ? 'selected' : '')+'>12</option><option value="13" '+(with_exped_time == '13' ? 'selected' : '')+'>13</option><option value="14" '+(with_exped_time == '14' ? 'selected' : '')+'>14</option><option value="15" '+(with_exped_time == '15' ? 'selected' : '')+'>15</option></select></span></span><br><br>';
    //Imp2Toulouse- Added an input to specify the number of free slot
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-18px;padding-left:60px;font-weight:normal;"><input type="checkbox" id="leave_slot_AA" style="position:relative;top:2px;" '+leave_slot+'/> Laisser <input type="text" size="1" id="nb_slot_AA" value="'+defaut_AA_nb_slot+'" style="position:relative;top:-3px;text-align:center; width:15px;margin-left:5px;margin-right:5px;height: 15px;"/> slot(s) de flotte libre <i><span id="save_AA_slot" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-18px;padding-left:60px;font-weight:normal;">Lors d\'une auto-attaque, envoyer <select id="type_vaisseaux_AA" style="position:relative;top:-1px;visibility: visible;color: #000;background-color: #b3c3cb;border: 1px solid #668599;height:18px;"><option value="1" '+(type_vaisseaux_AA == '1' ? 'selected' : '')+'>Les Petits Transporteurs en prioritée, puis les Grands</option><option value="2" '+(type_vaisseaux_AA == '2' ? 'selected' : '')+'>Les Grands Transporteurs en prioritée, puis les Petits</option><option value="3" '+(type_vaisseaux_AA == '3' ? 'selected' : '')+'>Des Petits Transporteurs uniquement</option><option value="4" '+(type_vaisseaux_AA == '4' ? 'selected' : '')+'>Des Grands Transporteurs uniquement</option></select><i><span id="save_type_vaisseaux_AA" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-18px;padding-left:60px;font-weight:normal;"><input type="checkbox" id="force_AA" style="position:relative;top:2px;" '+forceAA+'/> Envoyer la flotte même si il manque des transporteurs <i><span id="save_AA_force" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<div style="width:80%;height:1px;background:#404040;position:relative;top:-25px;left:7%;margin-top:20px"></div>';

    sephi_frigos_data+='<span style="text-align:left;color:#c0c0c0;position:relative;top:-12px;padding-left:40px;font-weight:normal;">Configuration des frigos:</span><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-2px;padding-left:40px;font-weight:normal;"><input type="checkbox" id="Prog_AF" '+ ((readData('Prog_AF','all') == "true")?'checked':'')+' style="position:relative;top:2px;"/> Auto ajouter les cibles espionnées.<i><span id="save_AF_Prog" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<ul style="text-align:left;color:#808080;position:relative;top:-2px;padding-left:40px;font-weight:normal;">Conditions optionnelles:<li><input type="checkbox" id="Activ_AF_SameGAL" '+((readData('Prog_AF','all') == "true")?'':'disabled')+' '+ ((readData('SameGAL_AF','all') == "true")?'checked':'')+' style="position:relative;top:2px;" onfocus="document.getElementById(\'Prog_AF\').checked = true;"> Dans la même galaxy (conseillée).<i><span id="save_AF_SameGAL" style="display:none;">(enregistré)</span></i></li><li><input type="checkbox" id="Activ_AF_WithoutFLEET_DEF" '+((readData('Prog_AF','all') == "true")?'':'disabled')+' '+ ((readData('WithoutFLEET_DEF_AF','all') == "true")?'checked':'')+' style="position:relative;top:2px;" onfocus="document.getElementById(\'Prog_AF\').checked = true;"> Sans flottes & sans défense (conseillé).<i><span id="save_AF_WithoutFLEET_DEF" style="display:none;">(enregistré)</span></i></li><li><input type="checkbox" id="Activ_AF_Seuil_Auto_ADD" '+((readData('Prog_AF','all') == "true")?'':'disabled')+' '+ ((readData('Seuil_Auto_ADD_AF','all') == "true")?'checked':'')+' style="position:relative;top:2px;" onfocus="document.getElementById(\'Prog_AF\').checked = true;"> Dont les ressources dépassent <input type="text" id="AF_Seuil_Auto_ADD_VAL" '+((readData('Prog_AF','AF') == "true" && readData('Seuil_Auto_ADD_AF','all') == "true")?'':'disabled')+' value="'+ ((readData('Seuil_Auto_ADD_VAL_AF','all') != "" && readData('Seuil_Auto_ADD_VAL_AF','all') != null)?readData('Seuil_Auto_ADD_VAL_AF','all'):'200000')+'" title="Seuil de ressource globale déclenchant l\'auto ajout de la cible en frigo" style="position:relative;top:-3px;text-align:center; width:45px;margin-left:5px;margin-right:5px;height: 15px;">.<i><span id="save_AF_Seuil_Auto_ADD" style="display:none;">(enregistré)</span></i></li></ul><br><br>';
    sephi_frigos_data+='<table style="width:604px;color:#6f9fc8;"><tr>';
    sephi_frigos_data+='<th style="border-right: #09d0ff dashed 0px;text-align:right;width:90px;"><span style="width:80px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;">Ignorer</span><br><span><input type="checkbox" title="Tout cocher/décocher" id="check_all"/></span></th>';
    sephi_frigos_data+='<th style="border-right: #09d0ff dashed 0px;text-align:center;width:75px;"><span style="width:70px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;">Nom</span><br><span>&nbsp;</span></th>';
    sephi_frigos_data+='<th style="border-right: #09d0ff dashed 0px;text-align:center;width:35px;"><span style="width:20px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;">#Pil-</span><br><span>lage</span></th>';
    sephi_frigos_data+='<th style="border-right: #09d0ff dashed 0px;text-align:center;width:30px;"><span style="font-size:x-small;position:relative;margin-left:5px;left:0px;">Status</span><br><span>&nbsp;</span></th>';
    sephi_frigos_data+='<th style="border-right: #09d0ff dashed 0px;text-align:center;width:80px;"><span style="width:70px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;">Flotte</span><br><span style="cursor:help;position:relative;" title="Rendez vous sur la page Flotte pour créer un tag de flotte personalisé.">perso. (?)</span></th>';
    sephi_frigos_data+='<th style="border-right: #09d0ff dashed 0px;text-align:center;width:40px;"><span style="width:37px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;">Flotte</span><br><span>ennemie</span></th><th style="width:5px;height:5px;">&nbsp;</th>';
    sephi_frigos_data+='<th style="border-right: #09d0ff dashed 0px;text-align:center;width:40px;"><span style="width:37px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;" disabled title="Volume actuel de la flotte ennemie" >Flotte</span><br><span>courante</span></th>';
    sephi_frigos_data+='<th style="border-right: #09d0ff dashed 0px;text-align:center;width:40px;"><span style="width:37px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;" title="Volume de la defense ennemie">Defense</span><br><span>ennemie</span></th><th style="width:5px;height:5px;">&nbsp;</th>';
    sephi_frigos_data+='<th style="border-right: #09d0ff dashed 0px;text-align:center;width:40px;"><span style="width:37px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;" disabled title="Volume actuel de la defense ennemie">Defense</span><br><span>courante</span></th>';
    sephi_frigos_data+='</tr></table>';

    for (var i=0;i<GLOB_persistedData["frigos"].length && GLOB_persistedData["frigos"][i] ;i++) {
        if (GLOB_persistedData["frigos"][i].length == 5) {GLOB_persistedData["frigos"][i][5] = '';}
        sephi_frigos_data+='<table style="width:604px;color:#6f9fc8;"><tr>';
        sephi_frigos_data+='<th style="width:70px;text-align:center;position:relative;top:-2px;left:10px;"><span onClick="window.location.href = \'https://'+univers+'/game/index.php?page=galaxy&no_header=1&galaxy='+GLOB_persistedData["frigos"][i][1]+'&system='+GLOB_persistedData["frigos"][i][2]+'&planet='+GLOB_persistedData["frigos"][i][3]+'\'" style="cursor:pointer;" title="Voir dans la galaxie">['+GLOB_persistedData["frigos"][i][1]+':'+GLOB_persistedData["frigos"][i][2]+':'+GLOB_persistedData["frigos"][i][3]+']</span></th>';
        checkouPAS = '';
        if (GLOB_persistedData["frigos"][i][6] == '1') checkouPAS = 'checked';
        sephi_frigos_data+='<th style="text-align:left;width:20px;"><input type="checkbox" style="width:20px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;" id="frig_ignore_'+i+'" '+checkouPAS+' /></th>';
        sephi_frigos_data+='<th style="text-align:left;width:55px;"><figure class="planetIcon '+((GLOB_persistedData["frigos"][i][12] != "moon" && GLOB_persistedData["frigos"][i][12] != "planet")?'planet':GLOB_persistedData["frigos"][i][12])+' tooltip js_hideTipOnMobile" title=""></figure><input type="text" style="width:55px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;" id="frig_name_'+i+'" value="'+GLOB_persistedData["frigos"][i][0]+'" /></th>';
        sephi_frigos_data+='<th style="text-align:right;width:12px;"><input type="text" style="width:12px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;" id="frig_sondes_'+i+'" title="Importance du frigo" value="'+GLOB_persistedData["frigos"][i][4]+'" /></th>';
        sephi_frigos_data+='<th style="text-align:left;width:30px;"><span style="font-size:x-small;position:relative;margin-left:5px;left:0px;">&nbsp;</span></th>';
        sephi_frigos_data+='<th style="text-align:right;width:70px;"><input type="text" style="width:70px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;" id="frig_flotte_perso_'+i+'" title="Flotte personalisée" placeholder="Flottes militaire" value="'+GLOB_persistedData["frigos"][i][5]+'" /></th>';
        sephi_frigos_data+='<th style="text-align:right;width:37px;"><input type="text" style="width:37px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;'+((GLOB_persistedData["frigos"][i][7] < GLOB_persistedData["frigos"][i][9])?"background-color: #09d0ff;":"")+'" id="frig_flotte_'+i+'" title="Volume de la flotte ennemie" value="'+GLOB_persistedData["frigos"][i][7]+'" /></th><th style="width:5px;heigth:5px;"><a style="width:5px;height:5px;position:relative;top:-4px;right:-4px;cursor: hand;" title="Aligner" href="javascript:void(0);" onclick="$(&quot;#frig_flotte_'+i+'&quot;).val($(&quot;#frig_cur_flotte_'+i+'&quot;).val()); $(&quot;#frig_flotte_'+i+'&quot;).css(&quot;background-color&quot;,&quot;white&quot);$(&quot;#frig_flotte_'+i+'&quot;).change();">&lt;</a></th>';
        sephi_frigos_data+='<th style="text-align:right;width:37px;"><input type="text" style="width:37px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;" disabled id="frig_cur_flotte_'+i+'" title="Volume actuel de la flotte ennemie" value="'+GLOB_persistedData["frigos"][i][9]+'"></input></th>';
        sephi_frigos_data+='<th style="text-align:right;width:37px;"><input type="text" style="width:37px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;'+((GLOB_persistedData["frigos"][i][8] < GLOB_persistedData["frigos"][i][10])?"background-color: #09d0ff;":"")+'" id="frig_defense_'+i+'" title="Volume de la defense ennemie" value="'+GLOB_persistedData["frigos"][i][8]+'" /></th><th style="width:5px;heigth:5px;"><a style="width:5px;height:5px;position:relative;top:-4px;right:-4px;cursor: hand;" title="Aligner" href="javascript:void(0);" onclick="$(&quot;#frig_defense_'+i+'&quot;).val($(&quot;#frig_cur_defense_'+i+'&quot;).val());$(&quot;#frig_defense_'+i+'&quot;).css(&quot;background-color&quot;,&quot;white&quot);$(&quot;#frig_defense_'+i+'&quot;).change();">&lt;</a></th>';
        sephi_frigos_data+='<th style="text-align:right;width:37px;"><input type="text" style="width:37px;font-size:x-small;position:relative;margin-left:5px;left:0px;text-align:center;" disabled id="frig_cur_defense_'+i+'" title="Volume actuel de la defense ennemie" value="'+GLOB_persistedData["frigos"][i][10]+'"></input></th>';
        sephi_frigos_data+='</tr></table>';
        sephi_frigos_data+= "\n"+'<div id="del_button_'+i+'" style="height:0px;position:relative;left:-5px;top:-22px;"><img style="cursor:pointer;width:16px;height:auto;" src="http://www.sephiogame.com/script/newsletter-close-button.png" title="Supprimer le frigo"/></div>';
        sephi_frigos_data+='<div style="width:0px;height:0px;position:relative;top:-29px;left:230px;"><img src="http://www.sephiogame.com/script/icon_spy.png" style="width:30px;height:auto;cursor:pointer;" title="Espionner" id="spy_button_'+i+'"/><img src="http://www.sephiogame.com/script/icon-tick.png" style="position:relative;left:18px;top:-17px;display:none;" id="spy_isok_'+i+'"/></div>';

        sephi_frigos_data+='<div style="background:#202020;height:1px;width:80%;margin:auto;margin-top:14px;"></div><br>';
        cur_check_all_state = cur_check_all_state || GLOB_persistedData["frigos"][i][6] == '0';
    }

    if (GLOB_persistedData["frigos"].length == 0) sephi_frigos_data+='<p style="padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;width:500px;height:80px;">Aucun frigo n\'a été ajouté pour cette planète.<br><br>Pour ajouter un nouveau frigo, vous devez l\'espionner puis l\'ajouter ou le rechercher dans galaxy et l\'ajouter.</p>'
    sephi_frigos_data+='<div class="footer" style="positon:relative;z-index:1;bottom:-30px;"></div></div>';
    sephi_frigos_data+='<div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:-45px;z-index:10;left:70px;"></div></div>'

    // Options du script
    sephi_frigos_data+='<div class="header"><h2>Options du script</h2></div>';
    sephi_frigos_data+='<div class="content" style="min-height: 100px;positon:relative;z-index:10;margin-bottom:50px;padding-top:15px;">';

    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:px;padding-left:40px;font-weight:normal;"><input type="checkbox" id="alarmeONOFF" style="position:relative;top:2px;" '+(readData("desactive_alarm", 'all') == 'yes' ? 'checked' : '')+'/> Désactiver l\'alarme lors des attaques <i><span id="save_alarmeONOFF" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:px;padding-left:40px;font-weight:normal;"><input type="checkbox" id="noplaplaChange" style="position:relative;top:2px;" '+(readData("noplaplaChange", 'all') == 'oui' ? 'checked' : '')+'/> Désactiver le changement automatique de planètes <i><span id="save_noplaplaChange" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:-5px;padding-left:60px;font-weight:normal;font-size:10px;">(Attention certaines fonctionnalités sont indisponibles sans le changement de planète)</span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:px;padding-left:40px;font-weight:normal;">Changement de planète toutes les <input type="input" id="changeTime1" style="position:relative;top:2px;width:30px;text-align:center;" value="'+plapla_change_time1+'"/> à <input type="input" id="changeTime2" style="position:relative;top:2px;width:30px;text-align:center;" value="'+plapla_change_time2+'"/> minutes <i><span id="save_timechange" style="display:none;">(enregistré)</span></i></span><br><br>';
    sephi_frigos_data+='<span style="text-align:left;color:#808080;position:relative;top:px;padding-left:40px;font-weight:normal;">Configuration notification webhook: <input type="input" id="url_webhook" style="position:relative;top:2px;width:300px;text-align:center;" value="'+url_webhook+'"/> <i><span id="save_url_webhook" style="display:none;">(enregistré)</span></i></span><br><br>';

    sephi_frigos_data+='<div class="footer" style="positon:relative;z-index:1;bottom:-40px;"></div></div>';
    sephi_frigos_data+='<div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:-35px;z-index:10;left:70px;"></div></div>'

    // Repport de bug
    sephi_frigos_data+='<div class="header"><h2>Site officiel du script</h2></div>';
    sephi_frigos_data+='  <div class="content" style="min-height: 100px;positon:relative;z-index:10;margin-bottom:50px;padding-top:15px;">';
    sephi_frigos_data+='  <table><tr><th><img src="http://www.sephiogame.com/script/Software_Update_icon.png" style="width:100px;height:auto;margin-left:30px;" /></th><th>';
    sephi_frigos_data+='    <p style="width:470px;padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">Depuis notre site web vous pouvez apprendre à uiliser le script, et nous repporter les bugs que vous trouvez pour nous aider à améliorer sephiOGame. Nous ferons notre possible pour les corriger dans les futures mises à jour du script :<br><br>'
    sephi_frigos_data+='      <span style="cursor:pointer;color:#ff9600;padding-left:10px;" onClick="window.open(\'http://www.sephiogame.com\',\'_blank\');">• Accéder au site de SephiOGame</span>';
    sephi_frigos_data+='      <br><br><span style="cursor:pointer;color:#ff9600;padding-left:10px;" onClick="window.open(\'http://www.sephiogame.com/Utilisation\',\'_blank\');">• Apprendre à utiliser le scrript</span>';
    sephi_frigos_data+='      <br><br><span style="cursor:pointer;color:#ff9600;padding-left:10px;" onClick="window.open(\'http://www.sephiogame.com/Actualites?curVer='+cur_version+'#Infos\',\'sephiogame\');">• Vérifier les mises à jour</span>';
    sephi_frigos_data+='      <br><br><span style="cursor:pointer;color:#ff9600;padding-left:10px;" onClick="window.open(\'http://www.sephiogame.com/Actualites#reportBug\',\'_blank\');">• Repporter un bug</span>';
    sephi_frigos_data+='    </p><br>';
    sephi_frigos_data+='  </th></tr></table>';
    sephi_frigos_data+='  <div class="footer" style="positon:relative;z-index:1;bottom:-40px;"></div>';
    sephi_frigos_data+='</div>';
    sephi_frigos_data+='<div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:-35px;z-index:10;left:70px;"></div></div>';

    // Mail alerte
    sephi_frigos_data+='<div class="header"><h2>Alertes sur missions hostiles</h2></div>';
    sephi_frigos_data+='<div class="content" style="min-height: 100px;positon:relative;z-index:10;margin-bottom:50px;padding-top:15px;">';
    sephi_frigos_data+='  <table><tr><th><img src="http://www.sephiogame.com/script/Earth_Alert.png" style="width:100px;height:auto;margin-left:30px;" /></th><th>';
    sephi_frigos_data+='    <p style="width:480px;padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">Le script met à votre disposition un envoi de mail via google, sous condition de lui donner l\'autorisation d\'envoyer des mails pour vous et que vous possediez un compte google.<br> Le script peut alors vous alerter par mail lorsqu\'une mission hostile est en cours. Un mail vous sera envoyé à l\'adresse indiqué toutes les 15 minutes.<br><br><i>Sans autorisation, aucun mail ne sera envoyé et elle couvre <u>l\'envoi du mail seulement</u>.</i><br><br>';
    sephi_frigos_data+='      <table id="alertmail-div" style="display: none;"><tr><td colspan=2><span style="padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">Pour configurer l\'envoi de message électronique, merci de spécifier:<br><br></td></tr>';
    sephi_frigos_data+='        <tr><td><span style="padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">• Votre adresse mail <span></td><td><input type="text" style="width: 150px;position:relative;margin-left:0px;" id="alert_mail_to" value="'+alert_mail_to+'" />&nbsp;<span class="factorbutton"><input style="width:17px;display: none;" id="test-mail" type="button" class="btn_blue" value="Test"></span><i><span id="save_alert_mail_to" style="display:none;"></span></i><br/><br/></span></td></tr>';
    sephi_frigos_data+='        <tr><td colspan="2"></td></tr>';
    sephi_frigos_data+='        <tr><td><span style="padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">• Votre message </span></td><td><textarea size="5" style="width: 200px;position:relative;margin-left:0px;" id="alert_mail_body">'+alert_mail_body+'</textarea><i><span id="save_alert_mail_body" style="display:none;"></span></i><br><br></span></td></tr>';
    sephi_frigos_data+='        <tr><td colspan="2"></td></tr>';
    sephi_frigos_data+='        <tr><td><span style="padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">• Sa fréquence (minutes)</span></td><td><input style="width: 20px;position:relative;margin-left:0px;" id="alert_mail_freq" value="'+alert_mail_freq+'"><i><span id="save_alert_mail_freq" style="display:none;"></span></i><br><br></span></td></tr>';
   //id="authorize-div" style="display: inline"><td><!--div id="authorize-div" style="display: inline" -->
    sephi_frigos_data+='      </table>';
    sephi_frigos_data+='      <table id="authorize-div" style="display: none;">';
    sephi_frigos_data+='        <tr><td><span style="padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">• Authorize access</span></td><td><span class="factorbutton"><input type="button" style="width: 80px;position:relative;margin-left:-360px;" id="authorize-button" class="btn_blue" value="Authorize"></span></td></tr>';
    sephi_frigos_data+='        <tr><td colspan="2"></td></tr>';
    sephi_frigos_data+='      </table>';
    sephi_frigos_data+='      <table>';
    sephi_frigos_data+='        <tr><td colspan=2><pre id="output" style="width:480px;padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#ff9600;"></pre><br></td></tr>';
    sephi_frigos_data+='      </table>';
    sephi_frigos_data+='    </p>';
    sephi_frigos_data+='    <p style="width:480px;padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">Le script permet également l\'envoi d\'un message instantanné (unique) à destination de votre attaquant (utilisation de 4 messages différents aléatoires).<br>';
    sephi_frigos_data+='      <table>';
    sephi_frigos_data+='        <tr><td colspan=2><span style="padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;"><input type="checkbox" id="advertAttaker" '+(readData("advertAttaker", 'all') == 1 ? 'checked' : '')+'/> Activer l\'envoi d\'un message instantannée lors des attaques <i><span id="save_advertAttaker" style="display:none;">(enregistré)</span></i></span><br/><br/></td></tr>';
    //Imperator2Toulouse- Init msg texte
    if (readData("msg_text", 'all') === null || readData("msg_text", 'all') === ''){
        var msg_text = {
            "intro":[ "Salut,\\n","Bonjour,\\n","Coucou,\\n","Salutation,\\n" ],
            "corps":[
                [ "J'ai vu ton attaque. \\n", "Je t'ai vu canaillou avec ton attaque. \\n", "J'ai cru voir une grosse attaque:) \\n", "Malgré que tu sois mon attaquant favori, \\n" ],
                [ "J'enleverai tout avant ton arrivé afin de ne plus être rentable. \\n", "Je vais enlever avant ton arrivé. \\n", "Je t'informe, afin de ne pas te faire perdre ton temps, que j'enleverai tout avant ton arrivé. Autant que tu concentres ton attaque sur quelqu'un de plus rentable. \\n", "Tu te doutes bien que puisque je t'ai vu, je vais enlever tous le pillable avant ton arrivé. \\n" ]
            ],
            "politesse":[ "Bon jeu.\\n","A plus tard et bon jeu.\\n","Bonne journée et bon jeu.\\n","Bonne continuation dans le jeu.\\n" ],
        };
        storeData("msg_text", JSON.stringify(msg_text), 'all');
    } else
        msg_text=JSON.parse(readData("msg_text", 'all'));

    sephi_frigos_data+='        <tr><td colspan=2><span style="padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">• Configurations des phrases (combinaison aléatoire) <i><span id="save_msg_text" style="display:none;">(enregistré)</span></i>:</span><br/>';
    sephi_frigos_data+='          <table style="padding-left:35px;width:504px;color:#6f9fc8;align:center;">';
    sephi_frigos_data+='            <tr align="center"><th>Introductions</th><th>Corps1</th><th>Corps2</th><th>Politesses</th></tr>';
    for (i=0; i<4;i++){
        sephi_frigos_data+='            <tr>';
        for (j=0; j<4;j++){
            objet=null;
            switch (j){
                case 0: objet=msg_text.intro;break;
                case 1: objet=msg_text.corps[0];break;
                case 2: objet=msg_text.corps[1];break;
                case 3: objet=msg_text.politesse;break;
            }
            sephi_frigos_data+='              <td id="msg_text" style="width:120px;"><input style="width:120px;height:25px;" name="msg_text['+(i+1)+']['+(j+1)+']" value="'+(objet[i])+'"/></td>';
        }
        sephi_frigos_data+='</tr>';
    }
    sephi_frigos_data+='          </table>';
    sephi_frigos_data+='      </table>';
    sephi_frigos_data+='    <br><br></p>';
    sephi_frigos_data+='  </th></tr></table>';
    sephi_frigos_data+='  <div class="footer" style="positon:relative;z-index:1;bottom:-40px;"></div>';
    sephi_frigos_data+='</div>';
    sephi_frigos_data+='<div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:-35px;z-index:10;left:70px;"></div></div>';

    // EJECT
    sephi_frigos_data+='<div class="header"><h2>Bouton EJECT</h2></div>';
    sephi_frigos_data+='<div class="content" style="min-height: 100px;positon:relative;z-index:10;margin-bottom:50px;padding-top:15px;">';
    sephi_frigos_data+='  <table><tr>';
    sephi_frigos_data+='    <th><img src="http://www.sephiogame.com/script/eject_button.png" style="width:100px;height:auto;margin-left:30px;" /></th>';
    sephi_frigos_data+='    <th><p style="width:480px;padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">';
    sephi_frigos_data+='           Le script vous permet de faire décoller tout vos vaisseaux civils et vos ressources en un instant, vous devez cependant lui spécifier les coordonnées vers lesquelles vous souhaitez décoller pour pouvoir utiliser cette fonction. (Une mission de transport sera alors lancée vers la planète en question)<br><br><i>Vous pouvez également demander au script de faire décoller automatiquement vos vaisseaux avec vos ressources 5 minutes avant de subir une attaque.</i><br><br><br/>';
    sephi_frigos_data+='           <span style="text-align:left;color:#808080;position:relative;top:-12px;padding-left:0px;font-weight:normal;">• Ejecter les vaisseaux civils de cette planète : <select id="auto_eject" style="visibility: visible;"><option value="never" '+(eject_auto == 'never' ? 'selected':'')+'>Jamais</option><option value="5mins" '+(eject_auto == '5mins' ? 'selected':'')+'>5 minutes avant l\'attaque ennemie</option><option value="10mins" '+(eject_auto == '10mins' ? 'selected':'')+'>10 minutes avant l\'attaque ennemie</option><option value="20mins" '+(eject_auto == '20mins' ? 'selected':'')+'>20 minutes avant l\'attaque ennemie</option></select></span><br/>';
    sephi_frigos_data+='           <span style="text-align:left;color:#808080;position:relative;top:-12px;padding-left:0px;font-weight:normal;">• Ejecter également les vaisseaux de combat : <input '+(eject_all ? 'checked' : '')+' type="checkbox" id="eject_all" style="position:relative;top:2px;"/></span><br>';
    sephi_frigos_data+='           <span style="text-align:left;color:#808080;position:relative;top:-12px;padding-left:0px;font-weight:normal;">• Prioriser les ressources Métal: <select id="ress_priority_metal" style="visibility: visible;"><option value="1" '+(ress_priority_metal == '1' ? 'selected':'')+'>Priority 1</option><option value="2" '+(ress_priority_metal == '2' ? 'selected':'')+'>Priority 2</option><option value="3" '+(ress_priority_metal == '3' ? 'selected':'')+'>Priority 3</option></select>&nbsp;Crystal: <select id="ress_priority_crystal" style="visibility: visible;"><option value="1" '+(ress_priority_crystal == '1' ? 'selected':'')+'>Priority 1</option><option value="2" '+(ress_priority_crystal == '2' ? 'selected':'')+'>Priority 2</option><option value="3" '+(ress_priority_crystal == '3' ? 'selected':'')+'>Priority 3</option></select>&nbsp;Deut: <select id="ress_priority_deut" style="visibility: visible;"><option value="1" '+(ress_priority_deut == '1' ? 'selected':'')+'>Priority 1</option><option value="2" '+(ress_priority_deut == '2' ? 'selected':'')+'>Priority 2</option><option value="3" '+(ress_priority_deut == '3' ? 'selected':'')+'>Priority 3</option></select></span><br/>';
    sephi_frigos_data+='           <table style="width:507px;color:#6f9fc8;"><tr>';
    sephi_frigos_data+='             <th style="width:700px;text-align:center;"><span style="text-align:left;color:#808080;position:relative;top:-12px;padding-left:0px;font-weight:normal;">• Coords planet d\'éjection <input type="text" style="width: 25px;position:relative;margin-left:30px;text-align:center;" value="'+eject_gal+'" title="Galaxie" id="eject_galaxy" onclick="if (this.value == \'Galaxie\') this.value=\'\';"/><input type="text" style="width: 25px;position:relative;margin-left:5px;text-align:center;" value="'+eject_sys+'" title="Système" id="eject_system" onclick="if (this.value == \'Système\') this.value=\'\';"/><input type="text" style="width: 25px;position:relative;margin-left:5px;text-align:center;" value="'+eject_pla+'" title="Planète" id="eject_planet" onclick="if (this.value == \'Planète\') this.value=\'\';"/></span><br><span style="position:relative;left:20px"><input type="checkbox" id="ejectLune" title="Si vous cochez cette case, l\'éjection se fera sur la lune des coordonnées demandées." style="position:relative;top:2px;" '+(eject_onLune?'checked':'')+'/> Ejecter vers la lune de cette planete</span></th>';
    sephi_frigos_data+='             <th style="width:300px;text-align:right;position:relative;left:-20px;top:0px;"><span class="factorbutton"><input class="btn_blue" id="eject_save_button" style="" type="button" value="Enregistrer"></span></th>';
    sephi_frigos_data+='           </tr></table>';
    sephi_frigos_data+='        </p><br>';
    sephi_frigos_data+='    </th>';
    sephi_frigos_data+='  </tr></table>';
    sephi_frigos_data+='  <div class="footer" style="positon:relative;z-index:1;bottom:-40px;"></div>';
    sephi_frigos_data+='</div>';
    sephi_frigos_data+='  <div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:-35px;z-index:10;left:70px;"></div></div>'

    // Sauvegarde
    sephi_frigos_data+='<div class="header"><h2>Gestion des données</h2></div>';
    sephi_frigos_data+='<div class="content" style="min-height: 100px;positon:relative;z-index:10;margin-bottom:50px;padding-top:15px;">';
    sephi_frigos_data+='  <table style="width:95%;positon:relative;z-index:2;"><tr style="vertical-align:top;">'
    sephi_frigos_data+='    <th style="width:70%"><p style="padding:30px;padding-top:5px;padding-bottom:5px;font-family: inherit;font-size:11px;color:#808080;">Vos données relatives au script sont enregistrées <b>uniquement grâce à votre navigateur internet</b>. Si vous souhaitez pouvoir les retrouver à tout moment, vous pouvez <b>les enregistrer</b> grâce à cette page.<br><br>Ainsi si vos données sont perdues, si vous souhaitez changer d\'ordinateur ou de navigateur, ou bien passer vos frigos à un ami, il vous suffit de cliquer sur le bouton \'\'Sauvegarder\'\' pour obtenir un fichier stockant les données de votre planète. Et plus tard de cliquer sur le bouton \'\'Restaurer\'\' pour rétablir le fichier.<br/><br/><br>En cas de disfonctionnement du script sur cette planète, vous pouvez également reinitialiser vos données de cette planète pour tenter de résoudre le problème.<br><br></p></th>';
    sephi_frigos_data+='    <th style="width:20%;text-align:right;"><table><tr><th colspan=2><center><span class="factorbutton"><input id="save_button" class="btn_blue" style="position:relative;top:110px;" type="button" value="Sauvegarder"></span></center></th></tr><tr><th><span class="factorbutton"><input type="file" id="fileupload" name="file" style="position:relative;top:130px;display:inline"/></span></th><th><span class="factorbutton"><input id="load_button" class="btn_blue" style="position:relative;top:130px;" type="button" value="Restaurer"></span></th></tr><tr><th colspan=2><center><span class="factorbutton"><input id="init_button" class="btn_blue" style="position:relative;top:195px;" type="button" value="Réinitialiser"></span></center></th></tr></table></th>';
    sephi_frigos_data+='  </tr></table>';
    sephi_frigos_data+='  <div class="footer" style="positon:relative;z-index:1;bottom:-40px;"></div>';
    sephi_frigos_data+='  <div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:-225px;z-index:10;left:70px;"></div></div>'
    sephi_frigos_data+='  <div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:-85px;z-index:10;left:70px;"></div></div>'
    sephi_frigos_data+='  <div style="width:0px;height:0px;"><div style="width:500px;height:1px;background:#202020;position:relative;top:10px;z-index:10;left:70px;"></div></div>'
    document.getElementById('buttonz').innerHTML = sephi_frigos_data;

    // Lancement Auto-Attaque
    document.getElementById('spy_all').onclick = launch_spy;
    document.getElementById('rap_gene').onclick = launch_spy;
    document.getElementById('auto_attack').onclick =function(){
        if (document.getElementById('prog_AA').checked) {
            var progTime = time() + 60*60*1000*parseInt('0'+document.getElementById('time_AA_h').value) + 60*1000*parseInt('0'+document.getElementById('time_AA_m').value);
            storeData('progTime', progTime, 'AA');
        } else {
            storeData('progTime', time() + 5 * 1000, 'AA');
        }
        storeData('isProg', 'oui','AA' );
        window.location.href = window.location.href;
    }

    /*document.getElementById('prog_AA').onclick =function(){
        //programmé oui démarrage direct, auquel cas : le prog time vaut le repeat time
        if (document.getElementById('prog_AA').checked) {
            $('#save_AA_prog').show(1500,function(){$('#save_AA_prog').hide();});
        }
    }*/
    var update_repeat_AA_time =function(){
        $('#repeat_AA').prop("checked", true );
        storeData('repeat', 'oui','AA');
        storeData('repeat_AA_h', $('#repeat_AA_h').val(), 'AA');
        storeData('repeat_AA_m', $('#repeat_AA_m').val(), 'AA');

        storeData('repeatTime', (60*60*1000*parseInt('0'+readData('repeat_AA_h','AA')) + 60*1000*parseInt('0'+readData('repeat_AA_m','AA'))).toString(),'AA');
        if ($('#AA_repeat').length > 0) $('#AA_repeat').html(get_cool_time(readData('repeatTime','AA')/1000).replace('.00',''));

        $('#save_AA_repeatTime').show(1500,function(){$('#save_AA_repeatTime').hide();});
    };
    $('#repeat_AA_h').on("change", update_repeat_AA_time);
    $('#repeat_AA_m').on("change", update_repeat_AA_time);

    $('#repeat_AA').on("click",function(){
        if (this.checked) {
            update_repeat_AA_time();
        } else storeData('repeat', 'non', 'AA');

        $('#save_AA_repeatTime').show(1500,function(){$('#save_AA_repeatTime').hide();});
    });
    $('#repeat_AA_h').on("change", update_repeat_AA_time);
    $('#repeat_AA_m').on("change", update_repeat_AA_time);

    document.getElementById('aa_enable').onclick =function(){
        if (this.checked) {
            storeData('aa_enable', 'oui', 'AA');
            $('#is_AA_enable').html("avec");
        } else {
            storeData('aa_enable', 'non', 'AA');
            $('#is_AA_enable').html("sans")
        }
        $('#save_AA_enable').show(1500,function(){$('#save_AA_enable').hide();});
    }

    var update_no_AA_time =function(){
        storeData('time_no_AA', 'oui', 'AA');
        storeData('time_no_AA_h_start', $('#time_no_AA_h_start').val(), 'AA');
        storeData('time_no_AA_m_start', $('#time_no_AA_m_start').val(), 'AA');
        storeData('time_no_AA_h_end', $('#time_no_AA_h_end').val(), 'AA');
        storeData('time_no_AA_m_end', $('#time_no_AA_m_end').val(), 'AA');

        storeData('time_no_AA_start', 60*60*1000*parseInt('0'+readData('time_no_AA_h_start','AA')) + 60*1000*parseInt('0'+readData('time_no_AA_m_start','AA')), 'AA');
        storeData('time_no_AA_end', 60*60*1000*parseInt('0'+readData('time_no_AA_h_end','AA')) + 60*1000*parseInt('0'+readData('time_no_AA_m_end','AA')), 'AA');
        $('#save_time_no_AA').show(1500,function(){$('#save_time_no_AA').hide();});
    };
    $('#time_no_AA').on("click",function(){
        if (this.checked) {
            update_no_AA_time();
        } else storeData('time_no_AA', 'non', 'AA');

        $('#save_time_no_AA').show(1500,function(){$('#save_time_no_AA').hide();});
    });
    $('#time_no_AA_h_start').on("change", update_no_AA_time);
    $('#time_no_AA_m_start').on("change", update_no_AA_time);
    $('#time_no_AA_h_end').on("change", update_no_AA_time);
    $('#time_no_AA_m_end').on("change", update_no_AA_time);

    $('#Prog_AF').on("change", function(){
        if (this.checked == true) {
            $('#Prog_AF').attr('checked', true);
            $('#Activ_AF_SameGAL').attr('disabled', false);
            $('#Activ_AF_SameGAL').attr('checked', true);
            $('#Activ_AF_WithoutFLEET_DEF').attr('disabled', false);
            $('#Activ_AF_WithoutFLEET_DEF').attr('checked', true);
            $('#Activ_AF_Seuil_Auto_ADD').attr('disabled', false);
            storeData('Prog_AF', "true", 'all');
            storeData('SameGAL_AF', "true", 'all');
            storeData('WithoutFLEET_DEF_AF', "true", 'all');
            storeData('Seuil_Auto_ADD_AF', "true", 'all');
        } else {
            $('#Prog_AF').attr('checked', false);
            $('#Activ_AF_SameGAL').attr('checked', false);
            $('#Activ_AF_SameGAL').attr('disabled', true);
            $('#Activ_AF_WithoutFLEET_DEF').attr('disabled', true);
            $('#Activ_AF_Seuil_Auto_ADD').attr('disabled', true);
            $('#Activ_AF_Seuil_Auto_ADD').attr('checked', false);
            $('#Activ_AF_Seuil_Auto_ADD').attr('disabled', true);
            storeData('Prog_AF', "false", 'all');
            storeData('SameGAL_AF', "false", 'all');
            storeData('WithoutFLEET_DEF_AF', "false", 'all');
            storeData('Seuil_Auto_ADD_AF', "false", 'all');
        }

        $('#save_AF_Prog').show(1500, function () {
            $('#save_AF_Prog').hide();
        });
    });
    $('#Activ_AF_SameGAL').on("change", function(){
        if (this.checked == true) {
            $('#Prog_AF').attr('checked',true);
            storeData('SameGAL_AF', "true", 'all');
        } else {
            storeData('SameGAL_AF', "false", 'all');
        }
        $('#save_AF_SameGAL').show(1500, function () {
            $('#save_AF_SameGAL').hide();
        });
    });
    $('#Activ_AF_WithoutFLEET_DEF').on("change", function() {
        if (this.checked == true) {
            $('#Prog_AF').attr('checked',true);
            storeData('WithoutFLEET_DEF_AF', "true", 'all');
        } else {
            storeData('WithoutFLEET_DEF_AF', "false", 'all');
        }
        $('#save_AF_WithoutFLEET_DEF').show(1500, function () {
            $('#save_AF_WithoutFLEET_DEF').hide();
        });
    });
    $('#Activ_AF_Seuil_Auto_ADD').on("change", function() {
        if (this.checked == true) {
            $('#Prog_AF').attr('checked',true);
            $('#AF_Seuil_Auto_ADD_VAL').attr('disabled',false);
            storeData('Seuil_Auto_ADD_AF', "true" ,'all');
        } else {
            $('#AF_Seuil_Auto_ADD_VAL').attr('disabled',false);
            storeData('Seuil_Auto_ADD_AF', "false", 'all');
        }
        $('#save_AF_Seuil_Auto_ADD').show(1500, function () {
            $('#save_AF_Seuil_Auto_ADD').hide();
        });
    });
    $('#AF_Seuil_Auto_ADD_VAL').on("change", function() {
        if ($('#AF_Seuil_Auto_ADD_VAL').val != "") {
            storeData('Seuil_Auto_ADD_VAL_AF', $('#AF_Seuil_Auto_ADD_VAL').val, 'all');
        }
    });

    $('#time_no_AA_eject_choice').on("change",function(){
        storeData('time_no_AA_eject_choice', this.value, 'AA');
        $('#time_no_AA_with_eject').css("display", ($(this).val() == "avec")?"block":"none");
        if (this.value === "avec") {
            storeData('time_no_AA_type_eject', $('#time_no_AA_type_eject').val(), 'AA');
            if ($('#time_no_AA_type_eject').val() == "Exped") {
                $('#time_no_AA_type_eject_exped_speed').prop("disabled",false);
                $('#time_no_AA_type_eject_exped_temps').prop("disabled",false);
                storeData('time_no_AA_type_eject_exped_speed', $('#time_no_AA_type_eject_exped_speed').val(), 'AA');
                storeData('time_no_AA_type_eject_exped_temps', $('#time_no_AA_type_eject_exped_temps').val(), 'AA');
            } else {
                $('#time_no_AA_type_eject_exped_speed').prop("disabled",true);
                $('#time_no_AA_type_eject_exped_temps').prop("disabled",true);
            }
        }else{
            $('#time_no_AA_type_eject_exped_speed').prop("disabled",true);
            $('#time_no_AA_type_eject_exped_temps').prop("disabled",true);
            removeData('time_no_AA_type_eject','AA');
            removeData('time_no_AA_type_eject_exped_speed', 'AA');
            removeData('time_no_AA_type_eject_exped_temps', 'AA');
        }
        $('#save_time_no_AA_eject_choice').show(1500,function(){$('#save_time_no_AA_eject_choice').hide();});
    });
    $('#time_no_AA_type_eject').on("change",function(){
        storeData('time_no_AA_type_eject', $('#time_no_AA_type_eject').val(), 'AA')
        $('#time_no_AA_type_eject_exped_speed').prop("disabled",($('#time_no_AA_type_eject').val() == "Exped")?false:true);
        $('#time_no_AA_type_eject_exped_temps').prop("disabled",($('#time_no_AA_type_eject').val() == "Exped")?false:true);
        $('#save_time_no_AA_eject_choice').show(1500,function(){$('#save_time_no_AA_eject_choice').hide();});
    });
    $('#time_no_AA_type_eject_exped_speed').on("change",function(){
        storeData('time_no_AA_type_eject_exped_speed', $('#time_no_AA_type_eject_exped_speed').val(), 'AA');
        $('#save_time_no_AA_eject_choice').show(1500,function(){$('#save_time_no_AA_eject_choice').hide();});
    });
    $('#time_no_AA_type_eject_exped_temps').on("change",function(){
        storeData('time_no_AA_type_eject_exped_temps', $('#time_no_AA_type_eject_exped_temps').val(), 'AA');
        $('#save_time_no_AA_eject_choice').show(1500,function(){$('#save_time_no_AA_eject_choice').hide();});
    });
        // Modifications sur les frigos
    for (var i=0;i<GLOB_persistedData["frigos"].length && GLOB_persistedData["frigos"][i] ;i++) {
        document.getElementById('frig_ignore_'+i).onclick = edit_frigo;
        document.getElementById('frig_name_'+i).onchange = edit_frigo;
        document.getElementById('frig_sondes_'+i).onchange = edit_frigo;
        document.getElementById('frig_flotte_perso_'+i).onchange = edit_frigo;
        document.getElementById('frig_flotte_'+i).onchange = edit_frigo;
        document.getElementById('frig_defense_'+i).onchange = edit_frigo;
        document.getElementById('del_button_'+i).onclick = delete_frigo;
        document.getElementById('spy_button_'+i).onclick = launch_spy;
    }

    // Block Ejection
    document.getElementById('eject_save_button').onclick =function(){
        eject_data = document.getElementById('eject_galaxy').value+':';
        eject_data += document.getElementById('eject_system').value+':';
        eject_data += document.getElementById('eject_planet').value+':';

        if (document.getElementById('auto_eject').value == 'never') eject_data += 'never:';
        if (document.getElementById('auto_eject').value == '5mins') eject_data += '5mins:';
        if (document.getElementById('auto_eject').value == '10mins') eject_data += '10mins:';
        if (document.getElementById('auto_eject').value == '20mins') eject_data += '20mins:';

        if ($("#ress_priority_metal").length > 0) eject_data+= 'ress_priority_metal|'+$("#ress_priority_metal").val()+':';
        if ($("#ress_priority_crystal").length > 0) eject_data+= 'ress_priority_crystal|'+$("#ress_priority_crystal").val()+':';
        if ($("#ress_priority_deut").length > 0) eject_data+= 'ress_priority_deut|'+$("#ress_priority_deut").val()+':';

        if (document.getElementById('eject_all').checked) eject_data += 'ALL:';

        if (document.getElementById('ejectLune').checked) eject_data += 'OnLune';

        storeData('isDead', 'n', 'eject');
        GLOB_persistedData["eject"] = eject_data;
        save_important_vars();

        blit_message("Données pour l'ejection enregistrées");
        window.location.href += '';
    }

    // Block Sauvegarde
    document.getElementById('save_button').onclick = save_important_vars_in_cloud;
    document.getElementById('load_button').onclick =function(){
        $('#fileupload').click();
    };
    document.getElementById('fileupload').onchange = load_important_vars_in_cloud;
    document.getElementById('init_button').onclick = init_vars;

    // Block alerte
    if (is_token_valide()) {
        var temps_restant=get_Time_Remain(parseInt(readData('gapi_auth','all')));
        appendResults(document.getElementById('output'),(isFR)?'Votre authentification est valide depuis '+temps_restant+'.':'Your authentication is alive since '+temps_restant+' yet.');
        temps_restant=null;

        document.getElementById('authorize-div').style.display = 'none';
        document.getElementById('alertmail-div').style.display = 'inline';
        document.getElementById('alert_mail_to').onblur =function(){
            document.getElementById('save_alert_mail_to').innerHTML = save_alert_mail();
            $('#save_alert_mail_to').show(1500,function(){$('#save_alert_mail_to').hide();});
            /*document.getElementById('save_alert_mail_to').style.display = 'inline';
            setTimeout(function() {document.getElementById('save_alert_mail_to').style.display = 'none';},1000);*/
        }
        document.getElementById('alert_mail_body').onblur =function(){
            document.getElementById('save_alert_mail_body').innerHTML = save_alert_mail();
             $('#save_alert_mail_body').show(1500,function(){$('#save_alert_mail_body').hide();});
            /*document.getElementById('save_alert_mail_body').style.display = 'inline';
            setTimeout(function() {document.getElementById('save_alert_mail_body').style.display = 'none';},1000);  */
        }
        document.getElementById('alert_mail_freq').onblur =function(){
            document.getElementById('save_alert_mail_freq').innerHTML = save_alert_mail();
            $('#save_alert_mail_freq').show(1500,function(){$('#save_alert_mail_freq').hide();});
            /*document.getElementById('save_alert_mail_freq').style.display = 'inline';
            setTimeout(function() {document.getElementById('save_alert_mail_freq').style.display = 'none';},1000);    */
        }
    } else {
        document.getElementById('alertmail-div').style.display = 'none';
        document.getElementById('authorize-div').style.display = 'inline';
        document.getElementById('authorize-button').onclick=function(){checkAuth_NEW(event);};
    }
    if (checkmail(document.getElementById('alert_mail_to').value)) document.getElementById('test-mail').style.display="inline";
    document.getElementById('test-mail').onclick=function(){sendMessage(document.getElementById('alert_mail_to').value,'Ogame TEST Notification "Attack Alert"','Hello,\r\n\r\nYou received this email to confirm you the good reception of mail during attack alert on OGame. This body will be sent on attack alert:\r\n"'+readData('alert_mail_body','all')+'"\r\n','https://'+univers+'/game/index.php?page=shipyard&sephiScript=1');};
    document.getElementById('advertAttaker').onclick =function(){
        if (this.checked) storeData('advertAttaker', 1, 'all');
        else storeData('advertAttaker', 0, 'all');
        $('#save_advertAttaker').show(1500,function(){$('#save_advertAttaker').hide();});
        /*document.getElementById('save_advertAttaker').style.display = 'inline';
        setTimeout(function() {document.getElementById('save_advertAttaker').style.display = 'none';},1000);*/
    }
    $("input[name^=msg_text]").on("change", function(){
        storeData("msg_text", JSON.stringify({"intro":[ $("input[name=msg_text\\[1\\]\\[1\\]]").val(),$("input[name=msg_text\\[2\\]\\[1\\]]").val(),$("input[name=msg_text\\[3\\]\\[1\\]]").val(),$("input[name=msg_text\\[4\\]\\[1\\]]").val() ],"corps":[[ $("input[name=msg_text\\[1\\]\\[2\\]]").val(),$("input[name=msg_text\\[2\\]\\[2\\]]").val(),$("input[name=msg_text\\[3\\]\\[2\\]]").val(),$("input[name=msg_text\\[4\\]\\[2\\]]").val() ],[ $("input[name=msg_text\\[1\\]\\[3\\]]").val(),$("input[name=msg_text\\[2\\]\\[3\\]]").val(),$("input[name=msg_text\\[3\\]\\[3\\]]").val(),$("input[name=msg_text\\[4\\]\\[3\\]]").val() ]],"politesse":[ $("input[name=msg_text\\[1\\]\\[4\\]]").val(),$("input[name=msg_text\\[2\\]\\[4\\]]").val(),$("input[name=msg_text\\[3\\]\\[4\\]]").val(),$("input[name=msg_text\\[4\\]\\[4\\]]").val() ],}), 'all');
        $('#save_msg_text').show(1500,function(){$('#save_msg_text').hide();});
    });

    // Paramètres AA
    var slot_AA_Management=function(){
        if ($('#leave_slot_AA:checked').length > 0)
            storeData('AA_leave_slot', 'oui', 'AA');
        else
            storeData('AA_leave_slot', 'non', 'AA');

        storeData('AA_nb_slot', $('#nb_slot_AA').val().match(/\d/g).join(""), 'AA');
        $('#save_AA_slot').show(1500,function(){$('#save_AA_slot').hide();});
    };
    $('#leave_slot_AA').on("click", slot_AA_Management);
    $('#nb_slot_AA').on("change", slot_AA_Management);
    ///////
    
    $('#type_vaisseaux_AA').on("change", function(){
        storeData('type_vaisseaux', this.value, 'AA');
        $('#save_type_vaisseaux_AA').show(1500,function(){$('#save_type_vaisseaux_AA').hide();});
    });
    $('#force_AA').on("click", function(){
        if (this.checked) storeData('force', 'oui', 'AA');
        else storeData('force', 'non', 'AA');
        $('#save_AA_force').show(1500,function(){$('#save_AA_force').hide();});
    });
    document.getElementById('butin_AA_RG').onchange =function(){
        storeData('AA_butin', document.getElementById('butin_AA_RG').value.match(/\d/g).join(""), 'AA');
        $('#save_AA_butin').show(1500,function(){$('#save_AA_butin').hide();});
        /*document.getElementById('save_AA_butin').style.display = 'inline';
        setTimeout(function() {document.getElementById('save_AA_butin').style.display = 'none';},1000);*/
    };

    if ($('#do_exp_AA').val() != "perso") $("#do_exp_AA_flotte_perso").css("display","none");
    var expedition_change = function(){
        storeData('with_exped', $('#do_exp_AA').val(), 'AA');
        if ($('#do_exp_AA').val() != "perso") {
            $("#do_exp_AA_flotte_perso").css("display","none");
            $("#do_exp_AA_perso:input").val("");
            $("#do_exp_AA_perso:input").prop("disabled", true);
            removeData('with_exped_perso', 'AA');
            $("#do_exp_AA_perso_speed").val("10");
            $("#do_exp_AA_perso_speed").prop("disabled", true);
            removeData('with_exped_speed', 'AA');
            $("#do_exp_AA_perso_temps").val("1");
            $("#do_exp_AA_perso_temps").prop("disabled", true);
            removeData('with_exped_time', 'AA');
            $('#save_AA_do_exp').show(1500,function(){$('#save_AA_do_exp').hide();});
        } else {
            $("#do_exp_AA_flotte_perso").css("display","block");
            $("#do_exp_AA_perso:input").prop("disabled", false).focus();
            storeData('with_exped_perso', $('#do_exp_AA_perso').val(), 'AA');
            $("#do_exp_AA_perso_speed").prop("disabled", false);
            storeData('with_exped_speed', $('#do_exp_AA_perso_speed').val(), 'AA');
            $("#do_exp_AA_perso_temps").prop("disabled", false);
            storeData('with_exped_time', $('#do_exp_AA_perso_temps').val(), 'AA');
            $('#save_AA_do_exp').show(1500,function(){$('#save_AA_do_exp').hide();});
        }
        with_exped=readData('with_exped','AA');
        with_exped_perso=readData('with_exped_perso','AA');
        with_exped_speed=readData('with_exped_speed','AA');
        with_exped_time=readData('with_exped_time','AA');
    };

    $('#do_exp_AA').on("change", expedition_change);
    $('#do_exp_AA_perso').on("change", expedition_change);
    $('#do_exp_AA_perso_speed').on("change", expedition_change);
    $('#do_exp_AA_perso_temps').on("change", expedition_change);

    // Options script
    document.getElementById('alarmeONOFF').onclick =function(){
        if (this.checked) storeData('desactive_alarm', 'yes', 'all');
        else storeData('desactive_alarm', 'no', 'all');
        $('#save_alarmeONOFF').show(1500,function(){$('#save_alarmeONOFF').hide();});
        /*document.getElementById('save_alarmeONOFF').style.display = 'inline';
        setTimeout(function() {document.getElementById('save_alarmeONOFF').style.display = 'none';},1000);*/
    };
    document.getElementById('noplaplaChange').onclick =function(){
        if (this.checked) storeData('noplaplaChange', 'oui', 'all');
        else storeData('noplaplaChange', 'non', 'all');
        $('#save_noplaplaChange').show(1500,function(){$('#save_noplaplaChange').hide();});
        /*document.getElementById('save_noplaplaChange').style.display = 'inline';
        setTimeout(function() {document.getElementById('save_noplaplaChange').style.display = 'none';},1000);*/
    };
    document.getElementById('changeTime1').onchange =function(){
        if (parseInt(this.value) > 1) {
            storeData('plapla_change_time1', this.value, 'all');
            $('#save_timechange').show(1500,function(){$('#save_timechange').hide();});
            /*document.getElementById('save_timechange').style.display = 'inline';
            setTimeout(function() {document.getElementById('save_timechange').style.display = 'none';},1000);*/
        }
    };
    document.getElementById('changeTime2').onchange =function(){
        if (parseInt(this.value) > 1) {
            storeData('plapla_change_time2', this.value, 'all');
            $('#save_timechange').show(1500,function(){$('#save_timechange').hide();});
            /*document.getElementById('save_timechange').style.display = 'inline';
            setTimeout(function() {document.getElementById('save_timechange').style.display = 'none';},1000);*/
        }
    };
    $('#url_webhook').on("change", function(){
        if ($(this).val() != "") {
            storeData('url_webhook', $(this).val(), 'all');
            $('#save_url_webhook').show(1500,function(){$('#save_url_webhook').hide();});
        }
    });
    if (!cur_check_all_state) document.getElementById("check_all").checked = true;
    document.getElementById("check_all").onclick =function(){
        for (var i=0;i<GLOB_persistedData["frigos"].length && GLOB_persistedData["frigos"][i] ;i++) {
            document.getElementById("frig_ignore_"+i).checked = cur_check_all_state;
            GLOB_persistedData["frigos"][i][6] = cur_check_all_state ? '1' : '0';
        }
        cur_check_all_state = !cur_check_all_state;
        save_important_vars();
        blit_message_time('Modifications <span style="float: none;margin: 0;color:#109E18">enregistrées avec succès</span> !',1000);
    };

    //Start AA
    if (gup('startAA') == '1') launch_spy('', 'auto_attack');
}
document.getElementById('menuTable').innerHTML = '<li style="height:0px;position: relative;top: -31px;"><span class="menu_icon"><div class="menuImage shipyard" style="background:url(http://www.sephiogame.com/script/sephi_script_logo.png);background-position-x:0px;'+bonus_style+'"></div></span><a class="menubutton '+bonus_class+'" href="https://'+univers+'/game/index.php?page=shipyard&sephiScript=1" target="_self"><span class="textlabel">SephiOGame</span></a></li>'+document.getElementById('menuTable').innerHTML;
document.getElementById('links').style.overflow = "visible";

// Page actualité
var lastActu = readData('lastActuTime', 'all');
var lastActuSecu = readData('lastActuTimeSecu', 'all');
if (lastActuSecu == null) {
    storeData('lastActuTimeSecu', time().toString(), 'all');
    lastActuSecu = time();
}
/*if (lastActu !== null) {
    lastActu = time() - parseInt(lastActu);
    lastActuSecu = time() - parseInt(lastActuSecu);
    if (lastActu > 16*60*60*1000 && lastActuSecu>10*60*1000) {
       $(document.body).on("click",function(){
            storeData('lastActuTimeSecu', time().toString(), 'all');
            document.getElementById('menuTable').innerHTML += '<form id="actuSephiOgame" action="http://www.sephiogame.com/Actualites?curVer='+cur_version+'&serv='+univers+'#Infos" style="display:none" target="sephiogame" method="post"><input type="submit" id="submitpopup"></form>';
            document.getElementById('submitpopup').click();
            $(document.body).on("click",function(){});
            window.focus();
            setTimeout(function(){window.focus();},1000);
        });
    }
} else {
    storeData('lastActuTime', time().toString(), 'all');
}*/

// Affiche les frigos sur la page galaxie et ajouter un bouton "ajouter aux frigos" //Imp2Toulouse- et ajouter un bouton "Supprimer des frigos"
var last_gal_state="",cur_gal_state="",GAL_check_cur_gal="",GAL_check_cur_sys="";
if (gup('page') == "galaxy") {
    if ($('#autospy').length == 0) $('#contentWrapper #galaxyHeader .btn_blue').first().after('<div id="autospy" class="btn_blue float_center">Auto-Spy</div>');
    $('#autospy').on("click",function() {
        //if (!gup("autospy")) window.location.href="https://"+univers+"/game/index.php?page=galaxy&autospy=1"
        //else
        if ($('#autospy_data').length >0){
            $('#autospy').css("color","white")
            if ($('#autospy_data').css("display") == "block") {
                $('#autospy_data').css("display", "none");
                $('#galaxyContent').css("display", "block");
            } else {
                $('#autospy_data').css("display", "block");
                $('#galaxyContent').css("display", "none");
            }
        } else {
            $('#autospy').css("color","darkred");
            setTimeout(launch_autospy(parseInt($('#contentWrapper #galaxyHeader #galaxy_input').val()), parseInt($('#contentWrapper #galaxyHeader #system_input').val()), parseInt(storeData("nb_sondes", this.value, "options") || 5),$('#scope').val()),2000);
        }
    });
/*    if (gup('autospy') == 1) {
        $('#autospy').css("color","darkred");
        setTimeout(launch_autospy(parseInt($('#contentWrapper #galaxyHeader #galaxy_input').val()), parseInt($('#contentWrapper #galaxyHeader #system_input').val()), parseInt(storeData("nb_sondes", this.value, "options") || 5),50),2000);
    } else {
        $('#autospy').css("color","white");
    }*/
    setInterval(check_galaxy_frigs,100);
}

// Fonction d'activation du pack
if (enable_quick_pack) {
    document.getElementById('startquickpack').onclick=function(){
        if (!cur_planetIsLune) {
            var dataPackJson : string;
            //I2T: Ajout de la différence si premiere planete sur demande utilisateur pour optimiser l'obtention du premier PT(Merci Lucas Geng)
            if (nb_planet == 1) { //I2T: Si premiere planete
                dataPackJson = `{
                  "listPrev": [
                    ["yes", "no", "75", "30", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "60", "15", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "90", "22", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "112", "45", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "135", "33", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "202", "50", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "168", "67", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "303", "75", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "253", "101", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "48", "24", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "76", "38", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "122", "61", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "379", "151", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "455", "113", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "196", "98", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "569", "227", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "225", "75", "0", "resources", "1", "3", "", "", "Synthétiseur_esp_de_esp_deutérium"],
                    ["yes", "no", "337", "112", "0", "resources", "1", "3", "", "", "Synthétiseur_esp_de_esp_deutérium"],
                    ["yes", "no", "506", "168", "0", "resources", "1", "3", "", "", "Synthétiseur_esp_de_esp_deutérium"],
                    ["yes", "no", "854", "341", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "759", "253", "0", "resources", "1", "3", "", "", "Synthétiseur_esp_de_esp_deutérium"],
                    ["yes", "no", "1139", "379", "0", "resources", "1", "3", "", "", "Synthétiseur_esp_de_esp_deutérium"],
                    ["yes", "no", "1281", "512", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "314", "157", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "503", "251", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "400", "120", "200", "station", "1", "14", "", "", "Usine_esp_de_esp_robots"],
                    ["yes", "no", "800", "240", "200", "station", "1", "14", "", "", "Usine_esp_de_esp_robots"],
                    ["yes", "no", "200", "400", "200", "station", "1", "31", "", "", "Laboratoire_esp_de_esp_recherche"],
                    ["yes", "no", "0", "800", "400", "research", "1", "113", "", "", "Technologie_esp_énergétique"],
                    ["yes", "no", "400", "0", "600", "research", "1", "115", "", "", "Réacteur_esp_à_esp_combustion"],
                    ["yes", "no", "400", "0", "600", "research", "1", "115", "", "", "Réacteur_esp_à_esp_combustion"],
                    ["yes", "no", "400", "200", "100", "station", "1", "21", "", "", "Chantier_esp_spatial"],
                    ["yes", "no", "800", "400", "200", "station", "1", "21", "", "", "Chantier_esp_spatial"],
                    ["yes", "no", "2000", "2000", "0", "shipyard", "1", "202", "1", "1", "Petit_esp_transporteur"],
                    ["yes", "no", "1922", "768", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "1025", "256", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "1537", "384", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "805", "402", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "2883", "1153", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "400", "800", "200", "station", "1", "31", "", "", "Laboratoire_esp_de_esp_recherche"],
                    ["yes", "no", "1600", "800", "400", "station", "1", "21", "", "", "Chantier_esp_spatial"],
                    ["yes", "no", "200", "1000", "200", "research", "1", "106", "", "", "Technologie_esp_Espionnage"],
                    ["yes", "no", "1600", "0", "2400", "research", "1", "115", "", "", "Réacteur_esp_à_esp_combustion"],
                    ["yes", "no", "400", "2000", "400", "research", "1", "106", "", "", "Technologie_esp_Espionnage"],
                    ["yes", "no", "0", "1000", "0", "shipyard", "1", "210", "1", "1", "Sonde_esp_d\`espionnage"],
                    ["yes", "no", "4324", "1729", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"]
                  ]
                }`;
            } else { //I2T: Si plusieurs planetes acquises
                dataPackJson = `{
                  "listPrev": [
                    ["yes", "no", "75", "30", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "60", "15", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "90", "22", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "112", "45", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "135", "33", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "202", "50", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "168", "67", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "48", "24", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "253", "101", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "303", "75", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "76", "38", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "122", "61", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "379", "151", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "225", "75", "0", "resources", "1", "3", "", "", "Synthétiseur_esp_de_esp_deutérium"],
                    ["yes", "no", "196", "98", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "569", "227", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "455", "113", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "683", "170", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "854", "341", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "314", "157", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "337", "112", "0", "resources", "1", "3", "", "", "Synthétiseur_esp_de_esp_deutérium"],
                    ["yes", "no", "1281", "512", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "506", "168", "0", "resources", "1", "3", "", "", "Synthétiseur_esp_de_esp_deutérium"],
                    ["yes", "no", "759", "253", "0", "resources", "1", "3", "", "", "Synthétiseur_esp_de_esp_deutérium"],
                    ["yes", "no", "1922", "768", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "1139", "379", "0", "resources", "1", "3", "", "", "Synthétiseur_esp_de_esp_deutérium"],
                    ["yes", "no", "400", "120", "200", "station", "1", "14", "", "", "Usine_esp_de_esp_robots"],
                    ["yes", "no", "800", "240", "200", "station", "1", "14", "", "", "Usine_esp_de_esp_robots"],
                    ["yes", "no", "503", "251", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "400", "200", "100", "station", "1", "21", "", "", "Chantier_esp_spatial"],
                    ["yes", "no", "2883", "1153", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "1025", "256", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "800", "400", "200", "station", "1", "21", "", "", "Chantier_esp_spatial"],
                    ["yes", "no", "2000", "2000", "0", "shipyard", "1", "202", "1", "1", "Petit_esp_transporteur"],
                    ["yes", "no", "4324", "1729", "0", "resources", "1", "4", "", "", "Centrale_esp_électrique_esp_solaire"],
                    ["yes", "no", "805", "402", "0", "resources", "1", "2", "", "", "Mine_esp_de_esp_cristal"],
                    ["yes", "no", "1537", "384", "0", "resources", "1", "1", "", "", "Mine_esp_de_esp_métal"],
                    ["yes", "no", "1600", "800", "400", "station", "1", "21", "", "", "Chantier_esp_spatial"],
                    ["yes", "no", "0", "1000", "0", "shipyard", "1", "210", "1", "1", "Sonde_esp_d\`espionnage"]
                  ]
                }`;
            }
        } else {
            // Lune
            dataPackJson = `{
              "listPrev": [
                ["yes", "no", "20000", "40000", "20000", "station", "1", "41", "", "", "Base_esp_lunaire"],
                ["yes", "no", "400", "120", "200", "station", "1", "14", "", "", "Usine_esp_de_esp_robots"],
                ["yes", "no", "800", "240", "200", "station", "1", "14", "", "", "Usine_esp_de_esp_robots"],
                ["yes", "no", "40000", "80000", "40000", "station", "1", "41", "", "", "Base_esp_lunaire"],
                ["yes", "no", "1600", "480", "400", "station", "1", "14", "", "", "Usine_esp_de_esp_robots"],
                ["yes", "no", "80000", "160000", "80000", "station", "1", "41", "", "", "Base_esp_lunaire"],
                ["yes", "no", "20000", "40000", "20000", "station", "1", "42", "", "", "Phalange_esp_de_esp_capteur"]
              ]
            }`
        }

        GLOB_persistedData['listPrev'] = JSON.parse(dataPackJson)['listPrev'];
        save_important_vars();
        location.href = location.href;
    };
}

// Initialisations chiantes
for (var u_u = 0 ; u_u<GLOB_persistedData["listPrev"].length && GLOB_persistedData["listPrev"][u_u] ; u_u++) {prev_positions[u_u] = (u_u+GLOB_nb_special_bars)*27;}

// Auto Active Rapport Complet
if (gup("page") == "preferences") {
    if (gup("autoRapComp") == 1){
        document.getElementById('prefs').innerHTML += '<input type="checkbox" name="fullSpioReport" checked>';
        document.getElementById('prefs').submit();
    }
    $("div.content div#two div.fieldwrapper div.thefield input.textInput").on("change",function(){
        storeData("nb_sondes", this.value, "options");
    });
}

clearTimeout(antiBugTimeout);
