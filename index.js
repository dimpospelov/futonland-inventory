const fs = require('fs')
const Ftp = require('ftp')
const csv = require('fast-csv')
const { callbackify } = require('util')
const { Console } = require('console')

const dir = 'feeds/inventory/'
const loc = 'tmp/'
const stock = []

const ftp = new Ftp()
ftp.on('ready', () => {

    if (!fs.existsSync('tmp')) {
        fs.mkdir('tmp', (err) => {
            if (err) throw err
        })
    }
    downloadFiles()

})

const downloadFiles = () => {
    let count = 0
    ftp.list(dir, (err, list) => {
        if (err) throw err
        list.forEach((file) => {
            ftp.get(dir + file.name, (err, stream) => {
                if (err) throw err
                stream.pipe(fs.createWriteStream(loc + file.name))
                stream.once('close', () => {
                    console.log(file.name, 'downloaded')
                    count++
                    if (count == list.length) processFiles()
                })
            })
        })
    })
}

const processFiles = () => {
    fs.access(loc + 'products.csv', (err) => {
        if (err) throw err
        getPrices(loc + 'products.csv', (prices) => {

            let files = ['FLBKLYN-1.csv', 'FLBKLYN-2.csv', 'FLNYC-1.csv', 'FLNYC-2.csv', 'FLCHLS-1.csv', 'FLCHLS-2.csv']

            files.forEach((file) => {
                fs.access(loc + file, (err) => {
                    if (err) throw err
                    processStock(loc + file, prices)
                })
            })

            setTimeout(() => {
                console.log(stock.length)
            }, 5000)

        })
    })
}

const getPrices = (file, callback) => {
    let prices = {}

    fs.createReadStream(file)
        .pipe(csv.parse({
            delimiter: '\t',
            quote: null,
            discardUnmappedColumns: false,
            headers: true
        }))
        .transform((data) => {
            prices[data['itemid']] = data['sale_price']
        })
        .on('data', (data) => {
        })
        .on('end', () => {
            console.log('prices parsed')
            callback(prices)
        })

}

const processStock = (file, prices) => {

    fs.createReadStream(file)
        .pipe(csv.parse({
            delimiter: ',',
            quote: '"',
            discardUnmappedColumns: false,
            headers: true
        }))
        .transform((data) => {
            t = {}
            t['Store Code'] = data['Store Code']
            t['Item Id'] = data['Item Id']
            t['Quantity'] = data['Quantity']
            t['Price'] = prices[data['Item Id']]
            return t
        })
        .on('data', (data) => {
            stock.push(data)
        })
        .on('end', () => {
            console.log(file, 'parsed')
        })

}

ftp.connect({
    host: "feeds.futonland.com",
    port: 21,
    user: "constructorio",
    password: "XFSrd0UFZSzG"
})