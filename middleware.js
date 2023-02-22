const express = require("express");
var database = require("./app/database.js");

module.exports = async (req, res, next) => {
    console.log(req.url);
    if (req.url == '/ws/') {
        next();
    } else {
        var token = req.headers['token'];
        console.log(token);
        let tokenCheck = await database.select("admin", { token: token });
        console.log('2');

        if (tokenCheck.data.length < 1 || tokenCheck.data.status == 'error') {
            res.send('not access');
        } else {
            next();
        }
    }
}