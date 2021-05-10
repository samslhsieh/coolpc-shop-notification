import * as dotenv from 'dotenv'
import moment from 'moment'
import axios from 'axios'
import parse5 from 'parse5'
import { GoogleSheets } from "./models/googleSheets";

dotenv.config()

new Promise(async (resolve, reject) => {
    const data = (await axios.get('https://www.coolpc.com.tw/tw/')).data

    const document = parse5.parse(data) as any

    const body = document.childNodes[1].childNodes[2]
    const home = body.childNodes
    const boxedWrapper = home[3].childNodes
    const wrapper = boxedWrapper[2].childNodes
    const main = wrapper[5]
    const section = main.childNodes[1].childNodes[0]
    const postContent = section.childNodes[1].childNodes[1]

    const articles = postContent.childNodes[4].childNodes[0].childNodes[0].childNodes[0]
        .childNodes[1].childNodes[1].childNodes
        .filter((article:any) => article.nodeName === 'article')

    const titles = articles.map((article: any) => article.childNodes[1].childNodes[2].childNodes[1].childNodes[0].childNodes[0].value)

    const sheetsId = process.env.GOOGLE_SPREADSHEETS_ID as string
    const keyPath = process.env.GOOGLE_SPREADSHEETS_KEY_PATH as string

    const googleSheets = new GoogleSheets({ keyPath })

    const { values } = await googleSheets.getData( sheetsId, 'Sheet1!A1')

    const title = titles[0]
    const a1 = values && values[0][0] || ''

    if (a1 !== title ) {
        console.log('will send mail to notify')

        await axios.post(process.env.GOOGLE_CHAT_WEBHOOK_ENDPOINT as string, {text: `New Article: ${title}`})

        await googleSheets.update(sheetsId, 'Sheet1!A1:C1', [[title, a1, moment().utcOffset(8).toISOString()]])
    } else {
        console.log('not change')
    }

    console.log('finish')
}).then((r) => console.log('finish'))
