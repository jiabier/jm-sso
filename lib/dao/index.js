var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var jmcommon = require('jm-common');
var BaseDao = jmcommon.Dao;
var util = require("util");

var schema = new Schema({
    id: {type: Number, unique: true, index: 1},
    account: {type: String, unique: true, index: 1},
    email:{type: String, unique: true, index: 1},
    mobile:{type: String, unique: true, index: 1},
    passwd : {type: String},
    salt:{type: String},
    nick:{type: String},
    active:{type: Boolean, default: true},
    crtime: {type: Date}
}, { autoIndex: true });

schema.path('crtime')
    .default(function(){
        return new Date()
    })
    .set(function(v){
        return v == 'now' ? new Date() : v;
    });

var Dao = function(db, opts) {
    this.db = db;
    db = db || mongoose;
    var model = db.model('User', schema);
    BaseDao.call(this, model);
};

util.inherits(Dao, BaseDao);

module.exports = Dao;

Dao.prototype.getUserByAccount = function (account, cb) {
    var c = {account:account};
    this.findOne(c, cb);
};

Dao.prototype.updateUser = function(opts, cb) {
    var c = {id: opts.id};
    this.update(c, opts, {}, cb);
};


