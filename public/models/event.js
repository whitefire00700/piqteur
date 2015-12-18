//grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Event = require('./user');

//create a schema
var eventSchema = new Schema({
	eventTitle : {
		type : String
	},
	eventOrganizer : {
		email : {
			type : String
		},
		name : {
			type : String
		},
		mobile : {
			countryCode : {
				type : String
			},
			number : {
				type: Number
			}
			
		}
	},
	eventLocation : {
		latitude : {
			type : Number
		},
		longitude : {
			type : Number
		},
		address : {
			address1: {
				type : String
			},
			address2 : {
				type : String
			},
			city : {
				type : String
			},
			state : {
				type : String
			},
			country : {
				type : String
			},
			zipCode : {
				type : String
			}
		}
	},
	eventTimeLine : {
		startTimeStamp : {
			type : Date
		},
		endTimeStamp : {
			type : Date
		}
	},
	eventType : {
		type : String,
		enum : [
		        'Wedding',
		        'Reception'
		        ]
	},
	images : [{
		imageId : String,
		imageUrl : String,
		name : String,
		userName : String,
		seq : {
			type : Number
		}
	}],
	imageCount : {
		type : Number,
		default : 0
	},
	publicCode : {
		type : String
	},
	users: [{
	        	 type: mongoose.Schema.Types.ObjectId, 
	        	 ref: 'user'
	}]
}, { collection: 'event',versionKey: false });

eventSchema.methods.isExists = function (cb) {	
	return this.model('event').find({ publicCode: this.publicCode }, cb);
}

//the schema is useless so far
//we need to create a model using it
var event = mongoose.model('event', eventSchema);

//make this available to our users in our Node applications
module.exports = event;