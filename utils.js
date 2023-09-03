const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const timeago = require('timeago.js');

function timeAgoTurkish(number, index) {
    return [
        ['Az önce', 'Şimdi'],
        ['%s saniye önce', '%s saniye içinde'],
        ['1 dakika önce', '1 dakika içinde'],
        ['%s dakika önce', '%s dakika içinde'],
        ['1 saat önce', '1 saat içinde'],
        ['%s saat önce', '%s saat içinde'],
        ['1 gün önce', '1 gün içinde'],
        ['%s gün önce', '%s gün içinde'],
        ['1 hafta önce', '1 hafta içinde'],
        ['%s hafta önce', '%s hafta içinde'],
        ['1 ay önce', '1 ay içinde'],
        ['%s ay önce', '%s ay içinde'],
        ['1 yıl önce', '1 yıl içinde'],
        ['%s yıl önce', '%s yıl içinde'],
    ][index];
}

timeago.register('tr_TR', timeAgoTurkish);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'assets/images/product') // Dosyanın kaydedileceği klasörü belirtin
    },
    filename: function (req, file, cb) {
        const randomPrefix = Math.floor(Math.random() * 1000000); // Rastgele 6 haneli sayı
        const originalname = file.originalname;
        const product_name = req.body.product_name;
        const fileName = `${randomPrefix}-${product_name}-${originalname}`;
        cb(null, fileName);
    }
});

const upload = multer({ storage: storage });

function date() {
    let date_time = new Date();
    let date = ("0" + date_time.getDate()).slice(-2);
    let month = ("0" + (date_time.getMonth() + 1)).slice(-2);
    let year = date_time.getFullYear();
    let hours = date_time.getHours();
    let minutes = date_time.getMinutes();
    let seconds = date_time.getSeconds();
    return year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
}

function parseDate(dateSource, style='simple') {
    if (style == 'simple') {
        let targetDate = new Date(dateSource);
        let formattedDate = timeago.format(targetDate, 'tr_TR'); // Dil ve coğrafi bölge kodu
        return formattedDate;
    } else if (style == 'default') {

        function twoDigitNumber(number) {
            return number.toLocaleString('tr-TR', { minimumIntegerDigits: 2, useGrouping: false });
        }

        let parsedDate = new Date(dateSource);
        return `${parsedDate.getFullYear()}/${parsedDate.getMonth() + 1}/${parsedDate.getDate()} ${twoDigitNumber(parsedDate.getHours())}:${twoDigitNumber(parsedDate.getMinutes())}:${twoDigitNumber(parsedDate.getSeconds())}`;;
    }
}

function log(connection, request, processType, action, process) {
    let logUser = request.session.username ? request.session.username : 1;

    const query = 'INSERT INTO logs (log_user, log_process_type, log_action, log_date, log_process) VALUES (?, ?, ?, ?, ?)';
    connection.query(query, [logUser, processType, action, date(), process], (err, result) => {
        if (err) throw err;
        console.log('LOG eklendi:', result);
    });
}

function calcStock(stockDatas, product_id = false) {
    let stockIn = [];
    let stockOut = [];
    for (let i = 0; i < stockDatas.length; i++) {
        if (stockDatas[i].stock_product == product_id) {
            if (stockDatas[i].stock_type == 'in') {
                stockIn.push(stockDatas[i].stock_quantity);
            } else if (stockDatas[i].stock_type == 'out') {
                stockOut.push(stockDatas[i].stock_quantity);
            }
        } else if (product_id == false) {
            if (stockDatas[i].stock_type == 'in') {
                stockIn.push(stockDatas[i].stock_quantity);
            } else if (stockDatas[i].stock_type == 'out') {
                stockOut.push(stockDatas[i].stock_quantity);
            }
        }
    }
    return stockIn.reduce((a, b) => a + b, 0) - stockOut.reduce((a, b) => a + b, 0);
}

function alert(req, response, context, redirectUrl, alertType, info=false) {
    let errorMessage = "<div class=\"col-sm-12 col-lg-12\">\n" +
        "<div class=\"alert text-white bg-" + alertType + "\" role=\"alert\">\n" +
        "                        <div class=\"iq-alert-icon\">\n" +
        "                           <i class=\"ri-{info}-line\"></i>\n" +
        "                        </div>\n" +
        "                        <div class=\"iq-alert-text\">" + context + "</div>\n" +
        "                        <button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\">\n" +
        "                        <i class=\"ri-close-line\"></i>\n" +
        "                        </button>\n" +
        "                     </div>\n" +
        "</div>";
    if (info == false) {
        errorMessage = errorMessage.replace("{info}", "alert");
    } else if (info == true) {
        errorMessage = errorMessage.replace("{info}", "information");
    }
    req.session.errorMessage = errorMessage; // Hata mesajını oturum verilerine kaydet
    response.redirect(redirectUrl);
}

function getAlert(req) {
    const errorMessage = req.session.errorMessage;
    req.session.errorMessage = null; // Oturum verisini temizle
    return errorMessage;
}

global.alert = alert;
global.getAlert = getAlert;
global.calcStock = calcStock;
global.parseDate = parseDate;
global.storage = storage;
global.upload = upload;
global.log = log;
global.date = date;