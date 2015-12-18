//grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//create a schema
var counterSchema = new Schema({
	_id: String,
	sequenceValue : {
		type : Number,
		default: 0
	}
}, { collection: 'counter',versionKey: false });

counterSchema.pre('save', function(next, counter) {
	var doc = this;
	mongoose.model('counter').findOneAndUpdate(
			{'_id': this._id}
	, {$inc: { sequenceValue: 1} }
	,{upsert:true, new:true},
		function(err,doc) {
		counter(err,doc);
	});
});

//the schema is useless so far
//we need to create a model using it
var counter = mongoose.model('counter', counterSchema);

//make this available to our users in our Node applications
module.exports = counter;