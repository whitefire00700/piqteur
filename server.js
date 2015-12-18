#!/bin/env node
var express = require('express');
var https = require('https');
var fs      = require('fs');

var mongodb = require('mongodb');
var mongoose = require('mongoose');

var Event = require('./public/models/event');
var User = require('./public/models/user');
var Counter = require('./public/models/counters');

var EventApp = function() {

	// Scope.
	var self = this;

	/* ================================================================ */
	/* Helper functions. */
	/* ================================================================ */

	/**
	 * Set up server IP address and port # using env variables/defaults.
	 */
	self.setupVariables = function() {
		self.dbUser = process.env.OPENSHIFT_MONGODB_DB_USERNAME;
		self.dbPass = process.env.OPENSHIFT_MONGODB_DB_PASSWORD;

		// Set the environment variables we need.
		self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
		self.port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
		self.mongodbip = process.env.OPENSHIFT_MONGODB_DB_HOST;
		self.mongodbport = process.env.OPENSHIFT_MONGODB_DB_PORT || 27017;
		self.appname = process.env.OPENSHIFT_APP_NAME;
		self.CLIENTID = process.env.IMGUR_CLIENT_ID;
		self.CLIENT_SECRET = process.env.IMGUR_CLIENT_SECRET;
		self.IMGURL_API = "api.imgur.com";
		self.TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/app-root/data/';
		self.GCM_GOOGLE_KEY = 'AIzaSyA-GnGcfxaLuHCIhmycr_FFw6jfA9eKh4c';
		if (typeof self.ipaddress === "undefined") {
			// Log errors on OpenShift but continue w/ 127.0.0.1 - this
			// allows us to run/test the app locally.
			console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
			self.ipaddress = "127.0.0.1";
			self.TOKEN_DIR = __dirname + '/credentials/';
			self.CLIENTID = "6c9551143955a60";
			self.CLIENT_SECRET = "c7385247df87d996eb7cce1683154bc67dd5e4e7";
		};
		if (typeof self.mongodbip === "undefined") {
			// Log errors on OpenShift but continue w/ 127.0.0.1 - this
			// allows us to run/test the app locally.
			console.warn('No OPENSHIFT_MONGODB_DB_HOST var, using 127.0.0.1');
			self.mongodbip = "127.0.0.1";
			self.appname = "eventApp";
			self.dbUser = "diwakar";
			self.dbPass = "12345";
		}
		self.TOKEN_PATH = self.TOKEN_DIR + 'imgur.json';
	};

	self.authorizeApp = function(cb) {
		// Load client secrets from a local file.
		fs.readFile(self.TOKEN_PATH, function processClientSecrets(err, content) {
			if (err) {
				console.log('Error loading client secret file: ' + err);
				console.log(self.TOKEN_PATH);
				console.log('Create new Authentication')
				return;
			}
			// Authorize a client with the loaded credentials, then call the
			// Drive API.
			self.authorize(JSON.parse(content), cb);
		});
	}

	self.authorize = function(credentials, cb) {
		self.ACCESS_TOKEN = credentials.access_token;
		self.IMGUR_USR_NAME = credentials.account_username;
		// TODO If ACCESS_TOKEN is invalid, create a new accesstoken
	}

	/**
	 * Populate the cache. self.populateCache = function() { if (typeof
	 * self.zcache === "undefined") { self.zcache = { 'index.html': '' }; } //
	 * Local cache for static content. self.zcache['index.html'] =
	 * fs.readFileSync('./index.html'); };
	 */


	/**
	 * Retrieve entry (content) from cache.
	 * 
	 * @param {string}
	 *            key Key identifying content to retrieve from cache.
	 * 
	 * self.cache_get = function(key) { return self.zcache[key]; };
	 */

	/**
	 * terminator === the termination handler Terminate server on receipt of the
	 * specified signal.
	 * 
	 * @param {string}
	 *            sig Signal to terminate on.
	 */
	self.terminator = function(sig){
		if (typeof sig === "string") {
			console.log('%s: Received %s - terminating sample app ...', Date(Date.now()), sig);
			process.exit(1);
		}
		console.log('%s: Node server stopped.', Date(Date.now()) );
	};


	/**
	 * Setup termination handlers (for exit and a list of signals).
	 */
	self.setupTerminationHandlers = function(){
		// Process on exit and signals.
		process.on('exit', function() { self.terminator(); });

		// Removed 'SIGPIPE' from the list - bugz 852598.
		['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
		 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
		 ].forEach(function(element, index, array) {
			 process.on(element, function() { self.terminator(element); });
		 });
	};

	/* ================================================================ */
	/* App server functions (main app logic here). */
	/* ================================================================ */

	/**
	 * Create the routing table entries + handlers for the application.
	 */
	self.createRoutes = function() {
		self.routes = { };
		self.postroutes = {};

		self.routes['/asciimo'] = function(req, res) {
			var link = "http://i.imgur.com/kmbjB.png";
			res.send("<html><body><img src='" + link + "'></body></html>");
		};

		self.routes['/'] = function(req, res) {
			res.setHeader('Content-Type', 'text/html');
			res.send(fs.readFileSync('./index.html'));
		};

		self.postroutes['/api/v1/event/save'] = function(req, res) {
			res.setHeader('Content-Type', 'application/json');
			var event = Event({
				eventTitle : req.body.eventTitle,
				eventOrganizer : {
					email : req.body.eventOrganizer.email,
					name : req.body.eventOrganizer.name,
					mobile : {
						countryCode : req.body.eventOrganizer.mobile.countryCode,
						number : req.body.eventOrganizer.mobile.number
					}
				},
				eventLocation : {
					latitude : req.body.eventLocation.latitude,
					longitude : req.body.eventLocation.longitude,
					address :{
						address1: req.body.eventLocation.address.address1,
						address2: req.body.eventLocation.address.address2,
						city: req.body.eventLocation.address.city,
						state: req.body.eventLocation.address.state,
						country: req.body.eventLocation.address.country,
						zipCode: req.body.eventLocation.address.zipCode
					} 
				},
				eventTimeLine : {
					startTimeStamp : req.body.eventTimeLine.startTimeStamp,
					endTimeStamp : req.body.eventTimeLine.endTimeStamp
				},
				eventType : req.body.eventType,
				publicCode : req.body.publicCode
			});

			event.save(function(err){				
				if (err) {
					res.status(401);
					res.send("{\"errorCode\":-2, \"errorMessages\":\""+err+"\"}");
				} else {
					res.status(200);
					res.send("{\"status\":\"Success\", \"publicCode\":\""+req.body.publicCode+"\"}");
				}
			});
		}

		self.postroutes['/api/v1/event/validate'] = function(req, res) {
			res.setHeader('Content-Type', 'application/json');			
			var publicCode = req.body.publicCode
			var userId = req.body.userId;//from json body
			User.findById(userId, function(err, user) {
				if(err) {
					res.status(201).send("{\"errorCode\":-1, \"errorMessages\":\"No Such User\"}");
				} else {
					var dataTobePushed = {
							$addToSet : {
								'users': user
							}
					}
					Event.findOneAndUpdate({ 'publicCode': publicCode }, dataTobePushed,{upsert:true, new:true}, function(err, event) {
						if(err){
							console.log(err);
							res.status(201).send("{\"errorCode\":-1, \"errorMessages\":\"Event not found\"}");
						} else {
							res.status(200).send(event);
						}
					});
				}
			});
	}

	self.postroutes['/api/v1/user/register'] = function(req,res) {
		var email = req.body.email;
		var nickName = req.body.nickName;
		var deviceId = req.body.deviceId;
		var dataTobePushed = {
				$set : {
					'nickName': nickName,
					'email': email
				},
				$push : {
					'devices': {
						'deviceId': deviceId
					}
				}
		}
		User.findOneAndUpdate({'email': {$in: email}, 'devices' : {$elemMatch: {'deviceId': deviceId}}}, dataTobePushed, {upsert:true, new:true}, function(err, user) {
			if(err) {
				res.status(401);
				res.send("{\"errorCode\":-2, \"errorMessages\":\""+err+"\"}");
			} else {
				res.status(200);
				res.send(user);
			}
		});
	}

	self.postroutes['/api/v1/user/:userId/register'] = function(req,res) {
		var userId = req.params.userId;
		var deviceId = req.body.deviceId;
		var dataTobePushed = {
				$set : {
					'devices.$.regToken': req.body.regToken //gcm reg
				}
		}
		User.findOneAndUpdate({'_id': userId, 'devices' : {$elemMatch: {'deviceId': deviceId}}}, dataTobePushed,{upsert:true, new: true}, function(err, user) {
			if(err){
				res.status(201).send("{\"errorCode\":-1, \"errorMessages\":\"Update failed\"}");
			} else {
				res.status(200).send(user);
			}
		});
	}

	self.postroutes['/api/v1/gcm/push/:eventId'] = function(req,res) {
		var eventId = req.params.eventId;
		
		Event.findById(eventId, function(err, events) {
			if(err){
				console.log(err);
				res.status(201).send("{\"errorCode\":-1, \"errorMessages\":\"Error finding event\"}");
			} else {
				User.find({'_id': {$in: events.users}}, "regToken", function(err, users){
					if(err){
						console.log(err);
						res.status(201).send("{\"errorCode\":-1, \"errorMessages\":\"Error finding event\"}");
					} else {
						var tokens = users.map(function(a){
							return a.regToken;
						});
						var gcmData = JSON.stringify({
							'data' : {
								'title': req.body.title,
								'body' : req.body.body
							},
							'registration_ids' : tokens
						});
						var postheaders = {
								'Content-Type' : 'application/json',
								'Content-Length' : Buffer.byteLength(gcmData, 'utf8'),
								'Authorization' : 'key='+self.GCM_GOOGLE_KEY
						};
						var optionsgetmsg = {
								host : 'gcm-http.googleapis.com',
								port : 443,
								path : '/gcm/send',
								method : 'POST',
								headers : postheaders
						};
						var reqPost = https.request(optionsgetmsg, function(response) {
							console.log("statusCode: ", response.statusCode);
							response.on('data', function(d) {
								console.info('GET result after POST:\n');
								res.status(response.statusCode).send(d);
								console.info('\n\nCall completed');
							});

						});
						reqPost.write(gcmData);
						reqPost.end();
						reqPost.on('error', function(e) {
							console.error(e);
						});						
					}
				});
			}
		});
	}

    //To get event by event id
	self.routes['/api/v1/event/:eventId'] = function(req, res) {
		res.setHeader('Content-Type', 'application/json');			
		var eventId = req.params.eventId;

		Event.findById(eventId, function(err, event) {
			if(err){
				res.status(401);
				res.send("{\"errorCode\":-2, \"errorMessages\":\"Event Not Available\"}");
			} else {
				res.status(200);
				res.send(event);//
			}
		});
	}
	//To get the events subscribed by the user, will be useful when he opens the app after he registers
	self.routes['/api/v1/user/:userId/events'] = function(req,res) {
		res.setHeader('Content-Type', 'application/json');			
		var userId = req.params.userId;
		
		Event.find({'users' : userId}, function(err, events) {
			if(err){
				console.log(err);
				res.status(401);
				res.send("{\"errorCode\":-2, \"errorMessages\":\"Events Not Available for user\"}");
			} else {
				res.status(200);
				res.send(events);
			}
		});
	}


	self.routes['/api/v1/imgur/generatePinUrl'] = function(req,res) {
		res.setHeader('Content-Type', 'application/json');
		var pinUrl = 'https://api.imgur.com/oauth2/authorize?client_id='+self.CLIENTID+'&response_type=pin&state=eventAppLogin';
		res.send("{\"pinUrl\":\""+pinUrl+"\"}");
	}

	self.routes['/api/v1/imgur/generateToken/:pinCode'] = function(req,res) {
		res.setHeader('Content-Type', 'application/json');			
		var imgurToken = JSON.stringify({ 
			client_id: self.CLIENTID, 
			client_secret: self.CLIENT_SECRET, 
			grant_type: "pin",
			pin: req.params.pinCode
		});

		var postheaders = {
				'Content-Type' : 'application/json',
				'Content-Length' : Buffer.byteLength(imgurToken, 'utf8')
		};

		var optionsgetmsg = {
				host : self.IMGURL_API,
				port : 443,
				path : '/oauth2/token',
				method : 'POST',
				headers : postheaders
		};
		var reqPost = https.request(optionsgetmsg, function(response) {
			console.log("statusCode: ", response.statusCode);
			response.on('data', function(d) {
				console.info('GET result after POST:\n');
				self.storeToken(d);			        
				res.status(response.statusCode).send(d);
				console.info('\n\nCall completed');
			});

		});
		reqPost.write(imgurToken);
		reqPost.end();
		reqPost.on('error', function(e) {
			console.error(e);
		});
	}

	self.storeToken = function(token) {
		try {
			fs.mkdirSync(self.TOKEN_DIR);
		} catch (err) {
			if (err.code != 'EEXIST') {
				throw err;
			}
		}			
		fs.writeFile(self.TOKEN_PATH, token);
		console.log('Token stored to ' + self.TOKEN_PATH);
		self.ACCESS_TOKEN = token.access_token;
	}

	//Deprecated
	self.routes['/api/v1/photo/list'] = function(req,res) {
		var getheaders = {
				'Content-Type' : 'application/json',
				'Authorization' : 'Bearer '+self.ACCESS_TOKEN
		};
		var optionsgetmsg = {
				host : self.IMGURL_API,
				port : 443,
				path : '/3/account/'+self.IMGUR_USR_NAME+'/images/ids',
				method : 'GET',
				headers : getheaders
		};
		var reqGet = https.request(optionsgetmsg, function(response) {
			console.log("statusCode: ", response.statusCode);
			response.on('data', function(d) {
				console.info('GET result after POST:\n');
				res.status(response.statusCode).send(d);
				console.info('\n\nCall completed');
			});

		});
		reqGet.end();
		reqGet.on('error', function(e) {
			console.error(e);
		});
	}

	self.routes['/api/v1/:eventId/photo/list'] = function(req,res) {
		var eventId = req.params.eventId;
		Event.findById(eventId, function(err, events) {
			if(err){
				res.status(201).send("{\"errorCode\":-1, \"errorMessages\":\"Error finding event\"}");
			} else {
				if(events == null) {
					res.status(201).send("{\"errorCode\":-1, \"errorMessages\":\"No images matching request\"}")
				} else {
					res.status(200).send(events.images);
				}
			}
		});
	}

	self.postroutes['/api/v1/:eventId/photo/refresh'] = function(req,res) {
		var eventId = req.params.eventId;
		var max = req.body.max;
		
		Event.findById(eventId, function(err, events) {
			if(err){
				res.status(201).send("{\"errorCode\":-1, \"errorMessages\":\"Error finding event\"}");
			} else {
				console.log(events);
				if(events == null) {
					res.status(201).send("{\"errorCode\":-1, \"errorMessages\":\"No images matching request\"}")
				} else {
					var newImages = events.imageCount-max;
					if(newImages<0){
						newImages = 0;
					}
					res.status(200).send("{\"newImages\":\""+newImages+"\"}");
				}
			}
		});
	}
	
    //To load only a set of images
	self.postroutes['/api/v1/:eventId/photo/paginate'] = function(req,res) {
		var max = req.body.max;
		var min = req.body.min;
		var eventId = req.params.eventId;
		Event.findOne({'_id': eventId, 'images' : {$elemMatch: {'seq': {$gte: min, $lte: max}}}}, function(err, events) {
			if(err){
				res.status(201).send("{\"errorCode\":-1, \"errorMessages\":\"Error finding event\"}");
			} else {
				if(events == null) {
					res.status(201).send("{\"errorCode\":-1, \"errorMessages\":\"No images matching request\"}")
				} else {
					res.status(200).send(events.images);
				}
			}
		});
		
	}

	self.postroutes['/api/v1/photo/upload/:userid/:eventid'] = function(req,res) {

// var imgurToken = JSON.stringify({
// image:
// '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'
// });

		var imgurToken = JSON.stringify({ 
			image: req.body.imageData,
			type: req.body.imageType
		});
		var userId = req.params.userid;
		var eventId = req.params.eventid;
		var getheaders = {
				'Content-Type' : 'application/json',
				'Accept' : 'application/json',
				'Content-Length' : Buffer.byteLength(imgurToken, 'utf8'),
				'Authorization' : 'Bearer '+self.ACCESS_TOKEN
				// 'Authorization' : 'Client-ID 6c9551143955a60'
		};
		var optionsgetmsg = {
				host : self.IMGURL_API,
				port : 443,
				path : '/3/upload',
				method : 'POST',
				headers : getheaders
		};
		var reqGet = https.request(optionsgetmsg, function(response) {
			console.log("statusCode: ", response.statusCode);			   
			response.on('data', function(d) {
				if(200 == response.statusCode) {
					console.info('GET result after POST:\n');
					User.findById(userId, function(err, user){
						var insertedImage = JSON.parse(d.toString());
						console.log(insertedImage);
						getNextSequenceValue(eventId,function(sequenceNumber) {
							var dataTobePushed = {
									$push : {
										'images': { 
											imageId: insertedImage.data.id, 
											imageUrl: insertedImage.data.link, 
											name: insertedImage.data.name, 
											userName: user.nickName,
											seq: sequenceNumber
										}
									},
									$inc : {
										imageCount : 1
									}
							}
							Event.findByIdAndUpdate(eventId, dataTobePushed,{upsert:true, new:true}, function(err, event) {
								if(err){
									res.status(201).send("{\"errorCode\":-1, \"errorMessages\":\"Upload failed\"}");
								} else {
									res.status(response.statusCode).send(d);
								}
							});
						})

					});
					console.info('\n\nCall completed');
				} else {
					res.status(400).send("{\"errorCode\":-1, \"errorMessages\":\""+ d +"\"}");
				}
			});

		});
		reqGet.write(imgurToken);
		reqGet.end();
		reqGet.on('error', function(e) {
			console.error(e);
		});

	}
};

var getNextSequenceValue = function(sequenceName, cb){
	var counter = Counter({
		_id : sequenceName			
	});
	counter.save(function(err, counter){		
		if (err) {
			console.log('ErrSequence '+err);
			cb(parseInt(0));
		} else {
			console.log('Sequence '+counter.sequenceValue);
			cb(parseInt(counter.sequenceValue));
		}
	});

}


/**
 * Initialize the server (express) and create the routes and register the
 * handlers.
 */
self.initializeServer = function() {

	var dbURI = 'mongodb://' + self.dbUser + ':' + self.dbPass + '@'
	+ self.mongodbip + ':' + parseInt(self.mongodbport) + '/'
	+ self.appname;
	mongoose.connect(dbURI);

	// CONNECTION EVENTS
	// When successfully connected
	mongoose.connection.on('connected', function() {
		// console.log('Mongoose default connection open to ' + dbURI);
		console.log('Mongoose connected to MongoDB');
	});

	self.createRoutes();
	self.app = express();
	self.app.use(express.bodyParser());

	// Add handlers for the app (from the routes).
	for (var r in self.routes) {
		self.app.get(r, self.routes[r]);
	}
	for ( var r in self.postroutes) {
		self.app.post(r, self.postroutes[r]);
	}
};


/**
 * Initializes the sample application.
 */
self.initialize = function() {
	self.setupVariables();
	self.authorizeApp();
	// self.populateCache();
	self.setupTerminationHandlers();

	// Create the express server and routes.
	self.initializeServer();		
};


/**
 * Start the server (starts up the sample application).
 */
self.start = function() {
	// Start the app on the specific interface (and port).
	self.app.listen(self.port, self.ipaddress, function() {
		console.log('%s: Node server started on %s:%d ...',
				Date(Date.now() ), self.ipaddress, self.port);
	});
};

};

var eventApp = new EventApp();
eventApp.initialize();
eventApp.start();