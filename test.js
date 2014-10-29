var jmcommon = require('jm-common');
var utils = jmcommon.utils;
var DB = jmcommon.DB;
var MQ = jmcommon.MQ;

var SSO = require('./lib');

var mq = new MQ();
var sso = new SSO();
var uid, token;
var passwd = '123';
var newPasswd = '1234';

function updateUser(){
    var opts = {
        account: 'u' + uid
    };
    sso.updateUser(uid, opts, function(err, doc){
    });
};

function updatePasswd(){
    var opts = {
        id: uid,
        passwd: passwd,
        newPasswd: newPasswd
    };
    sso.updatePasswd(opts, function(err, doc){

    });
};

function signout(){
    sso.signout(uid, function(err, val){
        if(err){
            console.error(err);
        }else{
        }
    });
};

function isSignon(){
    var opts = {
        id: uid,
        token: token
    };
    sso.isSignon(opts, function(err, val){
        if(err){
            console.error(err);
        }else{
            console.info('isSignon: ' + val);
        }
    });
};

function signon(){
    var opts = {
        id: uid,
        passwd: passwd
    };
    sso.signon(opts, function(err, doc){
        if(err){
            console.error(err);
        }else{
            console.info('signon success: token=' + doc.token + ' \r\n' + doc)
            token = doc.token;
            isSignon();
            updatePasswd();
            signout();
            updateUser();
        }
    });
};

function signup(){
    var opts = {
        passwd: passwd
    };
    sso.signup(opts, function(err, doc){
        if(err){
            console.error(err);
        }else{
            console.info('signup success: ' + doc)
            uid = doc.id;
            signon();
        }
    });
};

DB.connect(null, false, function(err, db){
    var opts = {
        db: db,
        mq: mq
    };
    sso.init(opts);

    signup();

    sso.findUsers({id:[1]}, function(err, doc){
        console.info('find success: ' + doc)
    });

    sso.findUsersByIds([1, 2], function(err, doc){
        console.info('find success: ' + doc)
    });

    sso.updateUser(1, {passwd:'123'}, function(err, doc){
        console.info('update success: ' + doc)
    });

});
