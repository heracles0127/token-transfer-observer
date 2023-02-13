var express = require("express");
var router = express.Router();

var database = require("./database.js");

var md5 = require('md5');
var randomstring = require("randomstring");

module.exports = {
  admin_login: async (data,ws) => {
    let info = data;
  
    let rows = await database.select("admin", {
      email: info.email,
    });
  
    if (rows.data.length > 0) {
      rows = await database.select("admin", {
        email: info.email,
        password: md5(info.password)
      });
      if (rows.data.length > 0) {
        var token = randomstring.generate(60);
        await database.update("admin", {
          token: token
        }, {
          email: info.email
        });
        // res.send({
        //   status: 'success',
        //   token: token
        // })
        ws.send(JSON.stringify({
          type: "admin_login_confirm",
          data: {status: 'success',token: token}
        }));
      } else {
        // res.send({
        //   status: 'error',
        //   msg: 'password is not correct'
        // })
        ws.send(JSON.stringify({
          type: "admin_login_confirm",
          data: {status: 'error',msg: 'password is not correct'}
        }));
      }
    } else {
      // res.send({
      //   status: 'error',
      //   msg: 'email is not correct'
      // })
      ws.send(JSON.stringify({
        type: "admin_login_confirm",
        data: {status: 'error',msg: 'email is not correct'}
      }));
    }
  },
  login: async (data,ws) => {
    let info = data;
  
    rows = await database.select("users", {
      userID: info.userID,
      password: md5(info.password),
      verified: 1,
    });

    if (rows.data.length > 0) {
      var token = randomstring.generate(60);
      await database.update("users", {
        token: token
      }, {
        userID: info.userID
      });
      // res.send({
      //   status: 'success',
      //   token: token
      // })
      ws.send(JSON.stringify({
        type: "login_confirm",
        data: {status: 'success',token: token}
      }));
    } else {
      // res.send({
      //   status: 'error',
      //   msg: 'password is not correct'
      // })
      ws.send(JSON.stringify({
        type: "login_confirm",
        data: {status: 'error',msg: 'userID or password is not correct'}
      }));
    }
  },
  register: async (data,ws) =>{
    let rows = await database.select("users", {
      userID: data.userID,
      wallet: data.wallet,
      email: data.email,
    });
  
    if (rows.status == "failed") {//database failed
      // res.send({ status: "failed", msg: "get: db error" });
      ws.send(JSON.stringify({
        type: "register_confirm",
        data: {status: 'error',msg: "get: db error" }
      }));
    } else {
      if (rows.data.length > 0) {
        // res.send({
        //   status: 'error',
        //   msg: 'already registered'
        // })
        ws.send(JSON.stringify({
          type: "register_confirm",
          data: {status: 'error',msg: "already registered" }
        }));
      } else {
        rows = await database.select("transactions", {
          sender: data.wallet,
        });
  
        if (rows.status == "failed") {//database failed
          // res.send({ status: "failed", msg: "get: db error" });
          ws.send(JSON.stringify({
            type: "register_confirm",
            data: {status: 'error',msg: "get: db error" }
          }));
        } else {
          var token_amount = 0;
          rows.data.map(row => {
            token_amount += row.amount * 1;
          })
  
          var verify_code = randomstring.generate(20);
  
          rows = await database.insert("users", {
            ...data,
            token_amount: token_amount,
            password:md5(data.password),
            verified:0,
            verify_code:verify_code
          });
          
          const sendmail = require('sendmail')();
          sendmail({
              from: 'no-reply@yourdomain.com',
              to: data.email,
              subject: 'confirmable verify code',
              html: '<h1>Confirm your email address</h1><p>Your confirmation code is below — enter it in your open browser window and we\'ll help you get signed in.</p><p>verify code:'+ verify_code + '</p>',
            }, function(err, reply) {
              console.log(err && err.stack);
              console.dir(reply);
          });
  
          rows = await database.select("users");
          if (rows.status == "failed") {//database failed
            // res.send({ status: "failed", msg: "get list: db error" });
            ws.send(JSON.stringify({
              type: "register_confirm",
              data: {status: 'error',msg: "get: db error" }
            }));
          } else {
            // res.send(rows);
            ws.send(JSON.stringify({
              type: "register_confirm",
              data: {status: 'success'}
            }));
          }
        }
      }
    }
  },
  verify: async (data,ws) =>{
    let rows = await database.select("users", {
      verify_code: data.verify_code,
    });
    if(rows.data.length > 0){
      await database.update("users", {
        verify: 1,
        verify_code:'',
      }, {
        verify_code: data.verify_code
      });
      ws.send(JSON.stringify({
        type: "verify",
        data: {status: 'success',data:{token:rows.data[0].token}}
      }));
    }else{
      ws.send(JSON.stringify({
        type: "verify",
        data: {status: 'error',msg:'uncorrect verify code'}
      }));
    }
  }
};