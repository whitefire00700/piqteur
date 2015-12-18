//grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//create a schema
var userSchema = new Schema({
	nickName : {
		type : String
	},
	devices : [{
		deviceId : String,
		regToken : String
	}],
	email : [String],
	createdTime : {
		type : Date
	},
	lastUsed : {
		type : Date
	},
	status : {
		type : String,
		enum : [
		        'Active',
		        'Blocked'
		        ],
		default: 'Active'
	}
}, { collection: 'user',versionKey: false });

//the schema is useless so far
//we need to create a model using it
var user = mongoose.model('user', userSchema);

//make this available to our users in our Node applications
module.exports = user;