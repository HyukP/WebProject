const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const app = require("../app");

try {
    fs.readdirSync('upload');
} catch(err) {
    console.log('not exist directory');
    fs.mkdirSync('upload')
}

var upload = multer({
    storage : multer.diskStorage({
        destination : (req, file, done) => {
            done(null,"upload/");
        },
        filename : (req, file, done) => {
            const ext = path.extname(file.originalname);
            const fileName = path.basename(file.originalname, ext) + Date.now() + ext;
            console.log(fileName);
            done(null,fileName);
        },
    }),
    limits : {fileSzie : 30 * 1024 * 1024 },
});

router.post('/Image',(request,response, err) => {
    upload.single('file')(request,response,function(err){
        console.log(request.file);
        response.send({status : 200, file : request.file});
    })
})

module.exports = router;