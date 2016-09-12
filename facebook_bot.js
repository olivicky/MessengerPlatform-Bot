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
var modeQuestion = "Che operazione vuoi compiere? Scrivi AUTOMATICO, SPEGNI, INVERNO, ESTATE, VENTILATORE, DEUMIDIFICATORE";
var fanQuestion = "A che velocità vuoi impostare il condizionatore?";
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
        pattern: 'AUTOMATICO',
        callback: function(response, convo) {
            convo.say('OK!');
            askConfortIndex(response, convo);
            convo.next();
        }
    }, {
        pattern: 'SPEGNI',
        callback: function(response, convo) {
            askRecap(response,convo);
            convo.next();

        }
    }, {
        pattern: 'ESTATE',
        callback: function(response, convo) {
            convo.say('Bene! continuiamo...');
            askTemperature(response, convo);
            convo.next();
        }
    }, {
        pattern: 'INVERNO',
        callback: function(response, convo) {
            convo.say('Bene! continuiamo......');
            askTemperature(response, convo);
            convo.next();
        }
    }, {
        pattern: 'VENTILATORE',
        callback: function(response, convo) {
            convo.say('Bene! continuiamo......');
            askTemperature(response, convo);
            convo.next();
        }
    }, {
        pattern: 'DEUMIDIFICATORE',
        callback: function(response, convo) {
            convo.say('Bene! continuiamo......');
            askTemperature(response, convo);
            convo.next();
        }
    }, {
        default: true,
        callback: function(response, convo) {
            convo.say('Please insert one of the suggested answer');
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
		console.log("risposta al valore di confort: " + response);
        convo.say("Perfetto, comando inviato");
        convo.silentRepeat();
        convo.next();
    });
}

askTemperature = function(response, convo) {
    convo.ask(temperatureQuestion, function(response, convo) {
        convo.say("Ok!");
        askFanVelocity(response, convo);
        convo.next();
    });
}

askFanVelocity = function(response, convo) {
    convo.ask(fanQuestion, function(response, convo) {
        convo.say("Perfetto!");
        askRecap(response, convo);
        convo.next();
    });
}

askTurnOff = function(response, convo) {
    convo.ask('Sei sicuro di voler spegnere il dispositivo?', [{
        pattern: bot.utterances.yes,
        callback: function(response, convo) {
            convo.say('Perfetto! Spengo il dispositivo.');
            convo.silentRepeat();
            convo.next();
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



askRecap = function(response, convo) {
    var alias = convo.extractResponse(idQuestion);
    var mode = convo.extractResponse(modeQuestion);
    var temperature = convo.extractResponse(temperatureQuestion);
    var velocity = convo.extractResponse(fanQuestion);
    var confort = convo.extractResponse(confortQuestion);
    var recapQuestion;
    
    if(mode == "AUTOMATICO"){
    	recapQuestion = "Sei sicuro di voler cambiare lo stato del dispositivo " + alias + " in modalità: " + mode + " e indice di confort: " + confort + "?";
    }
    else if(mode == "SPEGNI"){
    	recapQuestion = 'Sei sicuro di voler spegnere il dispositivo?";
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
                var temperature = convo.extractResponse(temperatureQuestion);
                var velocity = convo.extractResponse(fanQuestion);
                var indice = convo.extractResponse(confortQuestion);
                var modalità;
                var confort;
                if (indice == ""){
                	confort = "-1";
                }
                else{
                	confort = indice;
                }
                //     		
                console.log("conversation completed with values: id - " + alias + " mode - " + mode + " temperature - " + temperature + " - velocity - " + velocity + " - confort" + confort);
                
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
        				break;
    				case "DEUMIDIFICATORE":
        				modalità = "3";
        				break;
    			}


                var data = JSON.stringify({
                    'alias': alias,
                    'mode': modalità,
                    'speed': velocity,
                    'temperature': temperature,
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