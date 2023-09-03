const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
require('./utils');

const connection = mysql.createConnection({
    host     : 'http://db4free.net/',
    user     : 'kartaltepestock',
    password : 'kartaltepestock123',
    database : 'kartaltepestock',
});

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'assets')));

app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname + '/public/auth-sign-in.html'));
});

app.get('/products', function(request, response) {
    //if (request.session.loggedin) {
        //response.sendFile(path.join(__dirname + '/public/products.ejs'));
    //} else {
        //response.send('Please login to view this page!');
    //}

    const query = 'SELECT * FROM products';
    connection.query(query, (err, results) => {
        if (err) {
            alert(request, response, "Ürün verileri çekilirken hata oluştu.", "/dashboard", "danger", true);
        } else {
            if (results && results.length > 0) {
                const query = 'SELECT * FROM stocks';
                connection.query(query, (err, stockResults) => {
                    if (err) {
                        alert(req, res, "Ürün verileri alınırken hata oluştu.", "/dashboard", "danger", true);
                    } else  {
                        if (stockResults && stockResults.length > 0) {
                            response.render('products', { error: getAlert(request), datas: results, stockDatas: stockResults });
                        } else {
                            response.render('products', { error: getAlert(request), datas: results });
                        }
                    }
                });
            } else {
                alert(req, res, "Ürün verisi bulunamadı.", "/dashboard", "danger", true);
            }
        }
    });

    log(connection, request, 'Sayfa Görüntüleme', `${request.session.username} kullanıcısı ${date()} tarihinde "Ürünler" sayfasını görüntüledi.`, 'Görüntüleme');

});

app.get('/stock-list/:id', function(request, response) {
    //if (request.session.loggedin) {
    //response.sendFile(path.join(__dirname + '/public/products.ejs'));
    //} else {
    //response.send('Please login to view this page!');
    //}
    const id = request.params.id;

    if (/[a-zA-z]/.test(id)) {
        alert(req, res, "İlgili stok bulunamadı.", "/products", "danger", true);
    } else {
        const query = 'SELECT * FROM products WHERE pr_id = ?';
        connection.query(query, [id], (err, result) => {
            if (err) {
                alert(req, res, "Stok verilerine ait ürünün verileri alınırken hata oluştu.", "/products", "danger", true);
            } else {
                if (result && result.length > 0) {
                    const query = 'SELECT * FROM stocks WHERE stock_product = ?';
                    connection.query(query, [result[0].pr_id], (err, stockResults) => {
                        if (err) {
                            alert(req, res, "Stok verileri alınırken hata oluştu.", "/products", "danger", true);
                        } else {
                            if (stockResults && stockResults.length > 0) {
                                const baseUrl = request.protocol + '://' + request.get('host');
                                response.render('product-stock-list', { error: getAlert(request), productData: result[0], stockData: stockResults, baseUrl });
                            } else {
                                alert(req, res, "Stok verileri bulunamadı.", "/products", "danger", true);
                            }
                        }
                    });
                } else {
                    alert(req, res, "Stok verilerine ait ürünün verileri bulunamadı.", "/products", "danger", true);
                }
            }
        });
    }
});

app.get('/add-product', function(request, response) {
    //if (request.session.loggedin) {
    //response.sendFile(path.join(__dirname + '/public/products.ejs'));
    //} else {
    //response.send('Please login to view this page!');
    //}
    response.render('add-product');
});

app.post('/api/add-product', upload.single('product_image'), (req, res) => {
    const pName = req.body.product_name;
    const pCost = req.body.product_cost;
    const pPrice = req.body.product_price;
    const pImage = req.file ? req.file.filename : null;
    const pDesc = req.body.product_desc;
    const query = 'INSERT INTO products (pr_name, pr_cost, pr_price, pr_image, pr_desc) VALUES (?, ?, ?, ?, ?)';
    connection.query(query, [pName, pCost, pPrice, pImage, pDesc], (err, result) => {
        if (err) throw err;
        alert(req, res, "Ürün eklendi.", "/products", "success", true);
    });
});

app.get('/add-stock/:id', function(request, response) {
    //if (request.session.loggedin) {
    //response.sendFile(path.join(__dirname + '/public/products.ejs'));
    //} else {
    //response.send('Please login to view this page!');
    //}
    const id = request.params.id;

    if (/[a-zA-z]/.test(id)) {
        console.log("ID harf içeriyor. Ürünler kısmına yönlendirildi.");
        response.redirect('/products');
    } else {
        const query = 'SELECT * FROM products WHERE pr_id = ?';
        connection.query(query, [id], (err, result) => {
            if (err) {
                console.error("Veri çekme hatası:", err);
                response.redirect('/products');
            } else {
                if (result && result.length > 0) {
                    const query = 'SELECT * FROM stocks';
                    connection.query(query, [id], (err, stockResult) => {
                        if (err) {
                            console.error("Veri çekme hatası:", err);
                            response.redirect('/products');
                        } else {
                            if (stockResult && stockResult.length > 0) {
                                response.render('add-stock', { datas: result[0], stockDatas: calcStock(stockResult, result[0].pr_id) });
                            } else {
                                console.error("Veri bulunamadı:");
                                response.redirect('/products');
                            }
                        }
                    });
                } else {
                    console.error("Veri bulunamadı:");
                    response.redirect('/products');
                }
            }
        });
    }
});

app.post('/api/add-stock', (request, response) => {
    const stockProductID = request.body.stock_product;
    const stockType = request.body.stock_type;
    const stockQuantity = request.body.stock_quantity;
    const stockDesc = request.body.stock_desc;
const query = 'INSERT INTO stocks (stock_product, stock_type, stock_quantity, stock_date, stock_desc) VALUES (?, ?, ?, ?, ?)';
    connection.query(query, [stockProductID, stockType, stockQuantity, date(), stockDesc], (err, result) => {
        if (err) throw err;
        console.log('Veri eklendi:', result);
        response.redirect('/stock-list/' + stockProductID);
    });
});

app.get('/edit-stock/:id', (req, res) => {
    const id = req.params.id;

    if (/[a-zA-z]/.test(id)) {
        alert(req, res, "İlgili stok bulunamadı.", "/products", "danger", true);
    } else {
        const query = 'SELECT * FROM stocks WHERE stock_id = ?';
        connection.query(query, [id], (err, result) => {
            if (err) {
                alert(req, res, "Stok verisi bulunamadı.", "/products", "danger", true);
            } else {
                const query = 'SELECT * FROM stocks';
                connection.query(query, (err, stockResult) => {
                    if (err) {
                        alert(req, res, "Stok verileri alınırken hata oluştu.", "/stock-list/" + result[0].stock_product, "danger", true);
                    } else {
                        const query = 'SELECT * FROM products WHERE pr_id = ?';
                        connection.query(query, [result[0].stock_product], (err, productResult) => {
                           if (err) {
                               alert(req, res, "Stok verisine ait ürünün bilgileri alınırken hata oluştu.", "/stock-list/" + result[0].stock_product, "danger", true);
                           } else {
                               const baseUrl = req.protocol + '://' + req.get('host');
                               res.render('edit-stock', { error: getAlert(req), datas: result[0], stockDatas: calcStock(stockResult, result[0].stock_product), product: productResult[0], baseUrl: baseUrl });
                           }
                        });
                    }
                });
            }
        });
    }
});

app.post('/api/edit-stock/:id', (req, res) => {
    const id = req.params.id;
    const { stock_product_name, stock_product, stock_type, stock_quantity, stock_desc } = req.body;

    const updateQuery = 'UPDATE stocks SET stock_type = ?, stock_quantity = ?, stock_desc = ? WHERE stock_id = ?';
    connection.query(updateQuery, [stock_type, stock_quantity, stock_desc, id], (err, result) => {
        if (err) throw err;
        console.log('Veri güncellendi:', result);
        res.redirect('/stock-list/' + stock_product);
    });
});

app.get('/edit-product/:id', (req, res) => {
    const id = req.params.id;

    const query = 'SELECT * FROM products WHERE pr_id = ?';
    connection.query(query, [id], (err, result) => {
        if (err) throw err;

        res.render('edit-product', { datas: result[0] });
    });
});

app.post('/api/edit-product/:id', upload.single('product_image'), (req, res) => {
    const id = req.params.id;
    const { product_name, product_desc, product_price, product_cost } = req.body;

    if (req.file) {
        const newImage = req.file.filename;
        const selectQuery = 'SELECT pr_image FROM products WHERE pr_id = ?';
        connection.query(selectQuery, [id], (err, result) => {
            if (err) throw err;

            if (result.length === 0) {
                return res.status(404).send('Veri bulunamadı.');
            }

            const oldImage = result[0].pr_image;

            if (oldImage) {
                const oldImagePath = path.join(__dirname, 'assets/images/product', oldImage);
                fs.unlink(oldImagePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Eski resim silinirken hata oluştu:', unlinkErr);
                    } else {
                        console.log('Eski resim başarıyla silindi:', oldImage);
                    }
                });
            }
        });

        const updateQuery = 'UPDATE products SET pr_name = ?, pr_desc = ?, pr_price = ?, pr_cost = ?, pr_image = ? WHERE pr_id = ?';
        connection.query(updateQuery, [product_name, product_desc, product_price, product_cost, newImage, id], (err, result) => {
            if (err) throw err;
            console.log('Veri güncellendi:', result);
            res.redirect('/products');
        });
    } else {
        const updateQuery = 'UPDATE products SET pr_name = ?, pr_desc = ?, pr_price = ?, pr_cost = ? WHERE pr_id = ?';
        connection.query(updateQuery, [product_name, product_desc, product_price, product_cost, id], (err, result) => {
            if (err) throw err;
            console.log('Veri güncellendi:', result);
            res.redirect('/products');
        });
    }
});

app.get('/api/delete-product/:id', (req, res) => {
    const id = req.params.id;
    console.log(id);
    const selectQuery = 'SELECT pr_image FROM products WHERE pr_id = ?';
    connection.query(selectQuery, [id], (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            return res.status(404).send('Veri bulunamadı.');
        }

        const pr_image = results[0].pr_image;

        const imagePath = __dirname + '/assets/images/product/' + pr_image;

        fs.unlink(imagePath, (unlinkErr) => {
            if (unlinkErr) {
                console.error('Resim silinirken hata oluştu:', unlinkErr);
            } else {
                console.log('Resim başarıyla silindi:', pr_image);
            }

            const deleteQuery = 'DELETE FROM products WHERE pr_id = ?';
            connection.query(deleteQuery, [id], (deleteErr, deleteResult) => {
                if (deleteErr) throw deleteErr;
                log(connection, req, 'Ürün Silme', `${req.session.username} kullanıcısı ${date()} tarihinde başarıyla ${results[0].pr_name} isimli ürünü sildi..`, 'Ürün');
                console.log('Veri silindi:', deleteResult);
                res.redirect('/products');
            });
        });
    });

});

app.get('/api/delete-stock/:id', (req, res) => {
    const id = req.params.id;

    const selectQuery = 'SELECT * FROM stocks WHERE stock_id = ?';
    connection.query(selectQuery, [id], (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            return res.status(404).send('Veri bulunamadı.');
        } else {
            const deleteQuery = 'DELETE FROM stocks WHERE stock_id = ?';
            connection.query(deleteQuery, [id], (deleteErr, deleteResult) => {
                if (deleteErr) throw deleteErr;
                log(connection, req, 'Stok Silme', `${req.session.username} kullanıcısı ${date()} tarihinde başarıyla ${results[0].stock_product} numaralı stoğu sildi.`, 'Stok');
                console.log('Stok verisi silindi:', deleteResult);
                res.redirect('/stock-list/' + results[0].stock_product);
            });
        }
    });
});

app.get('/dashboard', function(request, response) {
    //if (request.session.loggedin) {
        response.sendFile(path.join(__dirname + '/public/index.html'));
    //} else {
        //response.send('Please login to view this page!');
    //}
});

app.post('/auth', function(request, response) {

    let username = request.body.username;
    let password = request.body.password;
    console.log(username, password);
    if (username && password) {

        connection.query('SELECT * FROM accounts WHERE acc_email = ? AND acc_password = ?', [username, password], function(error, results, fields) {

            if (error) throw error;

            if (results.length > 0) {

                request.session.loggedin = true;
                request.session.username = username;

                log(connection, request, 'Oturum Açma', `${username} kullanıcısı ${date()} tarihinde başarıyla oturum açtı.`, 'Oturum');
                response.redirect('/dashboard');
            } else {
                log(connection, request, 'Oturum Açma', 'Oturum açmaya çalışılırken isim veya şifre yanlış girildi.', 'Oturum');
                response.send('Incorrect Username and/or Password!');
            }
            response.end();
        });
    } else {
        response.send('Please enter Username and Password!');
        response.end();
    }
});

app.listen(3000);