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
var http = require('http');


var idQuestion = "What's the id/nickname of object do you want to control?";
var modeQuestion = "What action do you want to perform? Say TURN ON, TURN OFF, WINTER, SUMMER, FAN, HUMIDITY";
var fanQuestion = "What fan velocity do you want?";
var temperatureQuestion = "What temperature do you want?";
var confortQuestion = "What confort index do you want?";

const cli = commandLineArgs([
      {name: 'lt', alias: 'l', args: 1, description: 'Use localtunnel.me to make your bot available on the web.',
      type: Boolean, defaultValue: false},
      {name: 'ltsubdomain', alias: 's', args: 1,
      description: 'Custom subdomain for the localtunnel.me URL. This option can only be used together with --lt.',
      type: String, defaultValue: null},
   ]);

const ops = cli.parse();
if(ops.lt === false && ops.ltsubdomain !== null) {
    console.log("error: --ltsubdomain can only be used together with --lt.");
    process.exit();
}

var controller = Botkit.facebookbot({
    debug: true,
    access_token: (process.env.page_token) ? (process.env.page_token) : config.get('pageAccessToken'),
    verify_token: (process.env.verify_token) ? (process.env.verify_token) : config.get('validationToken'),

});

var bot = controller.spawn({
});

controller.setupWebserver(process.env.PORT || 5000, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log('ONLINE!');
        if(ops.lt) {
            var tunnel = localtunnel(process.env.PORT || 5000, {subdomain: ops.ltsubdomain}, function(err, tunnel) {
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


controller.hears(['start'],'message_received',function(bot,message) {
  bot.startConversation(message, askObjectId);
});

askObjectId = function(response, convo) {
  convo.ask(idQuestion, function(response, convo) {
    convo.say("OK");
    askOperation(response, convo);
    convo.next();
    
    convo.on('end',function(convo) {
		console.log("convo end function called");
  		if (convo.status=='completed') {
  		
   		 	// do something useful with the users responses

    		// reference a specific response by key
    		var id  = convo.extractResponse(idQuestion);
     		var mode  = convo.extractResponse(modeQuestion);
     		var temperature  = convo.extractResponse(temperatureQuestion);
     		var velocity  = convo.extractResponse(fanQuestion);
     		var confort = convo.extractResponse(confortQuestion);
//     		
     		console.log("conversation completed with values: id - " + id + " mode - " + mode + " temperature - " + temperature + " - velocity - " + velocity + " - confort " + confort);

			
			var data = JSON.stringify({
				'devId': id,
				'mode': mode,
				'speed': velocity,
				'temperature': temperature,
				
				
			});
			
			console.log(data);

			var options = {
  host: 'http://dmautomation-domoticadomain.rhcloud.com',
  port: '80',
  path: '/addBotAction',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': data.length
  }
};

var req = http.request(options, function(res) {
  var msg = '';

  res.setEncoding('utf8');
  res.on('data', function(chunk) {
    msg += chunk;
  });
  res.on('end', function() {
    console.log(JSON.parse(msg));
  });
});

req.write(data);
req.end();	


  		} else {
  		console.log("convo end function called prematurely");
    		// something happened that caused the conversation to stop prematurely
  		}

	});
	
  });
}

askOperation = function(response, convo) {
  convo.ask(modeQuestion, [
      {
        pattern: 'TURN ON',
        callback: function(response,convo) {
          convo.say('OK!');
          askConfortIndex(response, convo);
          convo.next();
        }
      },
      {
        pattern: 'TURN OFF',
        callback: function(response,convo) {
          askTurnOff(response, convo);
          convo.next();

        }
      },
      {
        pattern: 'SUMMER',
        callback: function(response,convo) {
          convo.say('Great! I will continue...');
            askTemperature(response, convo);
          convo.next();
        }
      },
      {
        pattern: 'WINTER',
        callback: function(response,convo) {
          convo.say('Great! I will continue...');
            askTemperature(response, convo);
          convo.next();
        }
      },
      {
        pattern: 'FAN',
        callback: function(response,convo) {
          convo.say('Great! I will continue...');
            askTemperature(response, convo);
          convo.next();
        }
      },
      {
        pattern: 'HUMIDITY',
        callback: function(response,convo) {
          convo.say('Great! I will continue...');
            askTemperature(response, convo);
          convo.next();
        }
      },
      {
        default: true,
        callback: function(response,convo) {
          convo.say('Please insert one of the suggested answer');
          convo.repeat();
          convo.next();
        }
      }
    ]);
}

askConfortIndex = function(response, convo) { 
  convo.ask(confortQuestion, function(response, convo) {
    convo.say("Perfect! I update your object");
    convo.silentRepeat();
    convo.next();
  });
}

askTemperature = function(response, convo) { 
  convo.ask(temperatureQuestion, function(response, convo) {
    convo.say("Ok! The last step.");
    askFanVelocity(response, convo);
    convo.next();
  });
}

askFanVelocity = function(response, convo) { 
  convo.ask(fanQuestion, function(response, convo) {
    convo.say("Perfect! I update your object");
    convo.silentRepeat();
    convo.next();
  });
}

askTurnOff = function(response, convo){
convo.ask('Are you sure you want to turn off?', [
        {
            pattern: bot.utterances.yes,
            callback: function(response, convo) {
                convo.say('Perfect! I turn off your object');
                convo.silentRepeat();
    			convo.next();
            }
        },
    {
        pattern: bot.utterances.no,
        default: true,
        callback: function(response, convo) {
            askOperation(response, convo);
            convo.next();
        }
    }
    ]);

}
