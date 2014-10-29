var Dao = require('../dao');
var jmcommon = require('jm-common');
var utils = jmcommon.utils;
var DB = jmcommon.DB;
var MQ = jmcommon.MQ;
var token = jmcommon.token;
var SequenceDao = jmcommon.SequenceDao;

var consts = require('../consts/consts');
var Code = consts.Code;
var TokenKey = consts.TokenKey;
var SequenceUserId = consts.SequenceUserId;

var Service = function(opts){
    if(!opts) return;
    utils.clone(opts, this);
    var db = opts.db || DB.connect();
    var mq = opts.mq || new MQ();
    this.db = db;
    this.mq = mq;
    this.dao = new Dao(db, mq);
    this.sq = new SequenceDao(db);
};

module.exports = Service;

Service.prototype.init = function(opts) {
    opts = opts || {};
    utils.clone(opts, this);
    var db = opts.db || DB.connect();
    var mq = opts.mq || new MQ();
    this.db = db;
    this.mq = mq;
    this.dao = new Dao(db, mq);
    this.sq = new SequenceDao(db);
};

Service.prototype.encryptPasswd = function(opts) {
    opts.salt = token.createKey(opts.id);
    opts.passwd = token.createCipher(opts.passwd, opts.salt);
};

Service.prototype.checkPasswd = function(opts, passwd) {
    return opts.passwd == token.createCipher(passwd, opts.salt);
};

Service.prototype.findUser = function(opts, cb){
    var dao = this.dao;
    var query = [];
    if(opts.any != undefined){
        var any = opts.any;
        if(opts.id == undefined){
            opts.id = any;
        }
        opts.account = opts.account || any;
        opts.email = opts.email || any;
        opts.mobile = opts.mobile || any;
    }
    if(opts.id != undefined){
        query.push({
            id: opts.id
        })
    }
    if(opts.account){
        query.push({
            account: opts.account
        })
    }
    if(opts.email){
        query.push({
            email: opts.email
        })
    }
    if(opts.mobile){
        query.push({
            mobile: opts.mobile
        })
    }
    if(opts._id){
        query.push({
            _id: opts._id
        })
    }

    if(!query.length){
        cb();
        return;
    }

    dao.findOne({'$or': query}, cb);
};

Service.prototype.signup = function(opts, cb){
    var userInfo = opts;
    var dao = this.dao;
    var self = this;
    self.findUser(opts, function(err, doc){
        if(err){
            cb(err);
            return;
        }

        if(doc){
            cb(new Error('SSO#signup User already exists'), {code: Code.FA_USER_EXIST});
            return;
        }

        var sq = self.sq;
        if(opts.id == undefined){
            sq.getNext(SequenceUserId, function(err, id){
                if(err){
                    cb(err);
                    return;
                }
                opts.id = id;

                self.encryptPasswd(opts);
                dao.create(opts, cb);
            });
        }else{
            self.encryptPasswd(opts);
            dao.create(opts, cb);
        }
    })
};

Service.prototype.signon = function(opts, cb){
    var dao = this.dao;
    var mq = this.mq;
    var self = this;
    this.findUser(opts, function(err, doc){
        if(err){
            cb(err);
            return;
        }
        if(doc){
            if(!self.checkPasswd(doc, opts.passwd)){
                cb(new Error('SSO#signon Password error'), {code: Code.FA_PASSWD_ERROR});
                return;
            }
            var tokenKey = token.createKey(doc.id);
            var rdata = {
                uid: doc.id,
                token: tokenKey
            }
            mq.hset(TokenKey, doc.id, tokenKey, function(err, r){
                if(err){
                    console.error(err);
                }
            });
            doc.token = tokenKey;
            cb(null, doc);
        }else{
            cb(new Error('SSO#signon User not exists'), {code: Code.FA_NOT_EXIST});
        }
    });
};

Service.prototype.signout = function(uid, cb){
    if(uid) {
        var mq = this.mq;
        mq.hdel(TokenKey, uid, cb);
        cb(null, uid)
    }else{
        cb(null);
    }
};

Service.prototype.updateUser = function (id, opts, cb) {
    var dao = this.dao;
    var c = {id: id};

    if(opts.passwd && !opts.salt){
        var o = {
            id: id,
            passwd: opts.passwd
        };
        this.encryptPasswd(o);
        opts.passwd = o.passwd;
        opts.salt = o.salt;
    }

    dao.update(c, opts, {}, cb);
};

Service.prototype.updatePasswd = function(opts, cb){
    var self = this;

    this.findUser(opts, function(err, doc){
        if(err){
            cb(err);
            return;
        }

        if(!doc){
            cb(new Error('SSO#updatePasswd User not exists'), {code: Code.FA_NOT_EXIST});
        }

        if(!self.checkPasswd(doc, opts.passwd)){
            cb(new Error('SSO#updatePasswd Old password wrong'), {code: Code.FA_PASSWD_ERROR});
        }

        var o = {
            id: doc.id,
            passwd: opts.newPasswd
        };
        self.encryptPasswd(o);
        delete o.id;
        self.updateUser(doc.id, o, cb);
    })
};

Service.prototype.isSignon = function(opts, cb){
    var mq = this.mq;
    mq.hget(TokenKey, opts.id, function(err, val){
        cb(err, opts.token === val);
    });
};

Service.prototype.findUsers = function(opts, cb){
    var dao = this.dao;
    var query = [];
    if(opts.any != undefined){
        var any = opts.any;
        if(opts.id == undefined){
            opts.id = any;
        }
        opts.account = opts.account || any;
        opts.email = opts.email || any;
        opts.mobile = opts.mobile || any;
    }
    if(opts.id != undefined){
        query.push({
			id: {'$in': opts.id}
        })
    }
    if(opts.account){
        query.push({
            account: {'$in': opts.account }
        })
    }
    if(opts.email){
        query.push({
            email: {'$in': opts.email}
        })
    }
    if(opts.mobile){
        query.push({
            mobile: {'$in': opts.mobile}
        })
    }
    if(opts._id){
        query.push({
            _id: {'$in': opts._id}
        })
    }

    if(!query.length){
        cb();
        return;
    }

    dao.find({'$or': query}, cb);
};

Service.prototype.findUserByOid = function (v, cb) {
    this.findUser({_id: v}, cb);
};

Service.prototype.findUserById = function (v, cb) {
    this.findUser({id: v}, cb);
};

Service.prototype.findUserByAccount = function (v, cb) {
    this.findUser({account: v}, cb);
};

Service.prototype.findUserByEmail = function (v, cb) {
    this.findUser({email: v}, cb);
};

Service.prototype.findUserByMobile = function (v, cb) {
    this.findUser({mobile: v}, cb);
};

Service.prototype.findUsersByOids = function (v, cb) {
    this.findUsers({_id: v}, cb);
};

Service.prototype.findUsersByIds = function (v, cb) {
    return this.findUsers({id: v}, cb);
};

Service.prototype.findUsersByAccounts = function (v, cb) {
    this.findUsers({account: v}, cb);
};

Service.prototype.findUsersByEmails = function (v, cb) {
    return this.findUsers({email: v}, cb);
};

Service.prototype.findUsersByMobiles = function (v, cb) {
    return this.findUsers({mobile: v}, cb);
};

