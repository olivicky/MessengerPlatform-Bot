/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Facebook bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to Facebook's Messenger APIs
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# RUN THE BOT:

  Follow the instructions here to set up your Facebook app and page:

    -> https://developers.facebook.com/docs/messenger-platform/implementation

  Run your bot from the command line:

    page_token=<MY PAGE TOKEN> verify_token=<MY_VERIFY_TOKEN> node facebook_bot.js [--lt [--ltsubdomain LOCALTUNNEL_SUBDOMAIN]]

  Use the --lt option to make your bot available on the web through localtunnel.me.

# USE THE BOT:

  Find your bot inside Facebook to send it a direct message.

  Say: "Hello"

  The bot will reply "Hello!"

  Say: "who are you?"

  The bot will tell you its name, where it running, and for how long.

  Say: "Call me <nickname>"

  Tell the bot your nickname. Now you are friends.

  Say: "who am I?"

  The bot will tell you your nickname, if it knows one for you.

  Say: "shutdown"

  The bot will ask if you are sure, and then shut itself down.

  Make sure to invite your bot into other channels using /invite @<my bot>!

# EXTEND THE BOT:

  Botkit has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
// Arbitrary value used to validate a webhook
// const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
//   (process.env.MESSENGER_VALIDATION_TOKEN) :
//   config.get('validationToken');
// 
// // Generate a page access token for your page from the App Dashboard
// const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
//   (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
//   config.get('pageAccessToken');
// if (!PAGE_ACCESS_TOKEN) {
//     console.log('Error: Specify page_token in environment or in configuration file');
//     process.exit(1);
// }
// 
// if (!VALIDATION_TOKEN) {
//     console.log('Error: Specify verify_token in environment or in configuration file');
//     process.exit(1);
// }
var Botkit = require('./lib/Botkit.js');
var os = require('os');
var config = require('config');
var commandLineArgs = require('command-line-args');
var localtunnel = require('localtunnel');
var request = require('request');;

var url = 'http://dmautomation-domoticadomain.rhcloud.com';
var idQuestion = "Ciao quale dispositivo vuoi controllare?";
var passwordQuestion = "Inserisci la password: "
var modeQuestion = "Che operazione vuoi compiere? Scrivi AUTOMATICO(A), SPEGNI(S), INVERNO(I), ESTATE(E), VENTILATORE(V), DEUMIDIFICATORE(D) oppure CIAO per uscire";
var fanQuestion = "A che velocità vuoi impostare il condizionatore?(default 1)";
var temperatureQuestion = "Quale temperatura vuoi impostare?";
var confortQuestion = "Che indice benessere preferisci?";

const cli = commandLineArgs([{
    name: 'lt',
    alias: 'l',
    args: 1,
    description: 'Use localtunnel.me to make your bot available on the web.',
    type: Boolean,
    defaultValue: false
}, {
    name: 'ltsubdomain',
    alias: 's',
    args: 1,
    description: 'Custom subdomain for the localtunnel.me URL. This option can only be used together with --lt.',
    type: String,
    defaultValue: null
}, ]);

const ops = cli.parse();
if (ops.lt === false && ops.ltsubdomain !== null) {
    console.log("error: --ltsubdomain can only be used together with --lt.");
    process.exit();
}

var controller = Botkit.facebookbot({
    debug: true,
    access_token: (process.env.page_token) ? (process.env.page_token) : config.get('pageAccessToken'),
    verify_token: (process.env.verify_token) ? (process.env.verify_token) : config.get('validationToken'),

});

var bot = controller.spawn({});

controller.setupWebserver(process.env.PORT || 5000, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log('ONLINE!');
        if (ops.lt) {
            var tunnel = localtunnel(process.env.PORT || 5000, {
                subdomain: ops.ltsubdomain
            }, function(err, tunnel) {
                if (err) {
                    console.log(err);
                    process.exit();
                }
                console.log("Your bot is available on the web at the following URL: " + tunnel.url + '/facebook/receive');
            });

            tunnel.on('close', function() {
                console.log("Your bot is no longer available on the web at the localtunnnel.me URL.");
                process.exit();
            });
        }
    });
});

controller.on('messaging_postbacks', function(bot,message){
	bot.reply(message, 'Benvenuto');
  bot.reply(message, ' sarò la tua assistente e ti guiderò nel controllo del tuo condizionatore. Per iniziare digita Ciao.');
  ;
});


controller.hears(['ciao', 'CIAO', 'Ciao'], 'message_received', function(bot, message) {
    bot.startConversation(message, askObjectId);
});

askObjectId = function(response, convo) {
    convo.ask(idQuestion, function(response, convo) {
        convo.say("OK");
        askObjectPassword(response, convo);
        convo.next();

        convo.on('end', function(convo) {
            console.log("convo end function called");
            if (convo.status == 'completed') {

                


            } else {
                console.log("convo end function called prematurely");
                // something happened that caused the conversation to stop prematurely
                convo.stop();
            }

        });

    });
}

askOperation = function(response, convo) {
    convo.ask(modeQuestion, [{
        pattern: new RegExp(/^(AUTOMATICO|automatico|Automatico|A|a)/i),
        callback: function(response, convo) {
            convo.say('OK!');
            askConfortIndex(response, convo);
            convo.next();
        }
    }, {
        pattern: new RegExp(/^(SPEGNI|spegni|Spegni|Spento|spento|S|s)/i),
        callback: function(response, convo) {
            askRecap(response,convo);
            convo.next();

        }
    }, {
        pattern: new RegExp(/^(ESTATE|estate|Estate|freddo|Freddo|E|e)/i),
        callback: function(response, convo) {
            convo.say('Bene! continuiamo...');
            askTemperature(response, convo, 21);
            convo.next();
        }
    }, {
        pattern: new RegExp(/^(INVERNO|inverno|Inverno|caldo|Caldo|I|i)/i),
        callback: function(response, convo) {
            convo.say('Bene! continuiamo......');
            askTemperature(response, convo, 26);
            convo.next();
        }
    }, {
        pattern: new RegExp(/^(VENTILATORE|ventilatore|Ventilatore|V|v)/i),
        callback: function(response, convo) {
            convo.say('Bene! continuiamo......');
            askFanVelocity(response, convo);
            convo.next();
        }
    }, {
        pattern: new RegExp(/^(DEUMIDIFICATORE|deumidificatore|Deumidificatore|D|d)/i),
        callback: function(response, convo) {
            convo.say('Bene! continuiamo......');
            askTemperature(response, convo, null);
            convo.next();
        }
    }, {
        pattern: new RegExp(/^(CIAO|Ciao|ciao|C|c)/i),
        callback: function(response, convo) {
            convo.say('Ho completato le tue richieste. Ciao a presto.');
            convo.silentRepeat();
            convo.next();
        }
    }, {
        default: true,
        callback: function(response, convo) {
            convo.say('Si prega di inserire una delle risposte suggerite.');
            convo.repeat();
            convo.next();
        }
    }]);
}

askObjectPassword = function(response, convo) {

    convo.ask(passwordQuestion, function(response, convo) {

        // reference a specific response by key
        var password = convo.extractResponse(passwordQuestion);
        var alias = convo.extractResponse(idQuestion);

        var data = JSON.stringify({
            'alias': alias,
            'password': password
        });

        console.log(data);

        var options = {
            url: url + '/checkDevice',

            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': data.length
            },
            body: data
        }

        var richiesta = request.post(options, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body)
                var response = JSON.parse(body); // Show the HTML for the Google homepage.
                if(response.response == 'true'){
                	convo.say("Bene! Siamo pronti per iniziare.");
                	var temperature = parseInt(response.temperature);
                	var humidity = parseInt(response.humidity);
                	if(temperature > 0){
                		convo.say("La temperatura attuale è di "+ temperature + " e umidità " + humidity + "%" );
                	}
                	askOperation(response, convo);
                	convo.next();
                }
                else{
                	convo.say("Password errata. Riprova o chiudi la chat.");
                	convo.silentRepeat();
                	convo.next();
                }
            } else {
                convo.say("Password errata. Riprova o chiudi la chat.");
                convo.silentRepeat();
                convo.next();
            }
        });

    });
}

askConfortIndex = function(response, convo) {
    convo.ask(confortQuestion, function(response, convo) {
		var regex = new RegExp('^(10|[1-9])$');
		var confortString = convo.extractResponse(confortQuestion);
		var confort = parseInt(confortString);
		
		if(regex.test(confortString)){
			console.log("Test superato range [1-10]");
			askRecap(response, convo);
        	convo.next();
		}
		else{
			console.log("Test non superato superato range [1-10]");
        	convo.say('Si prega di inserire una valore compreso tra 1 e 10');
            convo.repeat();
            convo.next();
		}
		
    });
}

askTemperature = function(response, convo, defaultValue) {
	var tempQuestion = temperatureQuestion;
	if(defaultValue != null){
		tempQuestion = tempQuestion + "(default " +defaultValue + "°)";
	}
		
    convo.ask(tempQuestion, function(response, convo) {
    	var regex = new RegExp('^(1[6-9]|2[0-7])$');
    	var temperatureString = convo.extractResponse(tempQuestion);
		var temperature = parseInt(temperatureString);
		
		if(regex.test(temperatureString)){
			console.log("Test superato range [16-27]");
			convo.say("Ok!");
        	askFanVelocity(response, convo);
        	convo.next();
		}
		else{
        	convo.say('Si prega di inserire una valore compreso tra 16 e 27');
            convo.repeat();
            convo.next();
        }
 
    });
}

askFanVelocity = function(response, convo) {
    convo.ask(fanQuestion, function(response, convo) {
    	var regex = new RegExp('^([1-4])$');
    	var fanString = convo.extractResponse(fanQuestion);
		var fan = parseInt(fanString);
		
		if(regex.test(fanString)){
			console.log("Test superato range [16-27]");
			convo.say("Perfetto!");
        	askRecap(response, convo);
        	convo.next();
		}
		else{
        	convo.say('Si prega di inserire una valore compreso tra 1 e 4');
            convo.repeat();
            convo.next();
        }
   
    });
}

askRecap = function(response, convo) {
    var alias = convo.extractResponse(idQuestion);
    var mode = convo.extractResponse(modeQuestion);
    var temperature = convo.extractResponse(temperatureQuestion);
    var velocity = convo.extractResponse(fanQuestion);
    var confort = convo.extractResponse(confortQuestion);
    var recapQuestion;
    
    if(mode == "AUTOMATICO" || mode == "Automatico" || mode == "automatico" || mode == "A" || mode == "a" ){
    	recapQuestion = "Sei sicuro di voler cambiare lo stato del dispositivo " + alias + " in modalità: " + mode + " e indice di confort: " + confort + "?";
    }
    else if(mode == "SPEGNI" || mode == "Spegni" || mode == "spegni" || mode == "S" || mode == "s"){
    	recapQuestion = "Sei sicuro di voler spegnere il dispositivo?";
    }
    else if(mode == "VENTILATORE" || mode == "Ventilatore" || mode == "ventilatore" || mode == "V" || mode == "v"){
    	recapQuestion = "Sei sicuro di voler cambiare lo stato del dispositivo " + alias + " in modalità: " + mode + " temperatura: 21° e velocità: " + velocity + "?";
    }
    else{
    	recapQuestion = "Sei sicuro di voler cambiare lo stato del dispositivo " + alias + " in modalità: " + mode + " temperatura: " + temperature + " e velocità: " + velocity + "?";
    }


    convo.ask(recapQuestion, [{
        pattern: bot.utterances.yes,
        callback: function(response, convo) {
            // do something useful with the users responses

                // reference a specific response by key
                var alias = convo.extractResponse(idQuestion);
                var mode = convo.extractResponse(modeQuestion);
                mode = mode.toUpperCase();
                var temperature = convo.extractResponse(tempQuestion);
                var velocity = convo.extractResponse(fanQuestion);
                var indice = convo.extractResponse(confortQuestion);
                var modalità;
                var confort;
                var temperatura;
                var velocità;
                if (indice == ""){
                	confort = "-1";
                }
                else{
                	confort = indice;
                }
                
                if(temperature == ""){
                	temperatura = "-1";
                }
                else{
                	temperatura = temperature;
                }
                
                
                if(velocity == ""){
                	velocità = "-1";
                }
                else{
                	velocità = velocity;
                }
                
                
                //     		
                console.log("conversation completed with values: id - " + alias + " mode - " + mode + " temperature - " + temperatura + " - velocity - " + velocità + " - confort" + confort);
                
                switch (mode) {
    				case "AUTOMATICO":
        				modalità = "5";
        				break;
    				case "SPEGNI":
        				modalità = "0";
        				break;
    				case "ESTATE":
       	 				modalità = "2";
        				break;
    				case "INVERNO":
        				modalità = "1";
        				break;
    				case "VENTILATORE":
        				modalità = "4";
        				temperatura = "21";
        				break;
    				case "DEUMIDIFICATORE":
        				modalità = "3";
        				break;
    			}


                var data = JSON.stringify({
                    'alias': alias,
                    'mode': modalità,
                    'speed': velocità,
                    'temperature': temperatura,
                    'confort': confort
                });

                console.log(data);

                var options = {
                    url: url + '/addBotAction',

                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        'Content-Length': data.length
                    },
                    body: data
                }

				if(mode != null){
				console.log("Entrato nell'if dove mode è diverso da null");
                var richiesta = request.post(options, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        console.log(body)
                        var response = JSON.parse(body); 
                		if(response.response == "true"){ 
                			console.log("Entrato nell'if perchè la risposta è true");
                        	convo.say('Operazione effettuata. Ho completato le tue richieste. Ciao a presto.');
                        	convo.silentRepeat();
                        	convo.next();
                        }
                        else{
                        	console.log("Entrato nell'else perchè la risposta è false");
                        	convo.say("Operazione non effettuata. Contatta l'amministratore.");
                        	convo.silentRepeat();
                        	convo.next();
                        }
                    } else {
                        convo.say("Operazione non effettuata. Contatta l'amministratore.");
                        convo.silentRepeat();
                        convo.next();
                    }
                });
                }
                else{
                	convo.say("Operazione non effettuata. Contatta l'amministratore.");
                        convo.silentRepeat();
                        convo.next();
                }

        }
    }, {
        pattern: bot.utterances.no,
        default: true,
        callback: function(response, convo) {
            askOperation(response, convo);
            convo.next();
        }
    }]);


}
