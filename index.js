const fs = require('fs')
const Ftp = require('ftp')
const csv = require('fast-csv')

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
            let filesProcessed = 0

            files.forEach((file, index, array) => {
                fs.access(loc + file, (err) => {
                    if (err) throw err
                    processStock(loc + file, prices, () => {
                        filesProcessed++
                        if (filesProcessed == array.length) {
                            createFile()
                        }
                    })
                })
            })

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

const processStock = (file, prices, callback) => {

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
            if (data['Price']) {

                let match = false
                stock.forEach((line) => {
                    if (line['Store Code'] == data['Store Code'] && line['Item Id'] == data['Item Id']) {
                        line['Quantity'] = parseInt(line['Quantity']) + parseInt(data['Quantity'])
                        match = true
                    }
                })

                if (!match) {
                    stock.push(data)
                }
                
            }
        })
        .on('end', () => {
            console.log(file, 'parsed')
            callback()
        })

}

const createFile = () => {

    let data = ["Store Code", "Item Id", "Quantity", "Price"]

    stock.forEach((line) => {
        data += "\n"
        data += [line["Store Code"], line["Item Id"], line["Quantity"], line["Price"]]
    })

    fs.writeFile(loc + 'stock.txt', data, (err) => {
        if (err) throw err

        ftp.put(loc + 'stock.txt', dir + 'stock.txt', (err) => {
            if (err) throw err
            console.log('file uploaded')
            ftp.end()
        })

    })

}

ftp.connect({
    host: "feeds.futonland.com",
    port: 21,
    user: "constructorio",
    password: "XFSrd0UFZSzG"
})