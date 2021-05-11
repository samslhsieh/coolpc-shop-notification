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

    const articlesElements = postContent.childNodes[4].childNodes[0].childNodes[0].childNodes[0]
        .childNodes[1].childNodes[1].childNodes
        .filter((article:any) => article.nodeName === 'article')

    const articles = articlesElements.map((article: any) => ({
        id: article.childNodes[1].childNodes[1].childNodes[1].childNodes[1].attrs[0].value,
        title: article.childNodes[1].childNodes[1].childNodes[1].childNodes[1].attrs[2].value,
        url: `https://www.coolpc.com.tw${article.childNodes[1].childNodes[1].childNodes[1].childNodes[1].attrs[1].value}`,
        img: `https://www.coolpc.com.tw${article.childNodes[1].childNodes[1].childNodes[1].childNodes[1].childNodes[0].attrs[3].value}`
    }))

    const sheetsId = process.env.GOOGLE_SPREADSHEETS_ID as string
    const keyPath = process.env.GOOGLE_SPREADSHEETS_KEY_PATH as string

    const googleSheets = new GoogleSheets({ keyPath })

    const { values } = await googleSheets.getData( sheetsId, 'Sheet1!A1')

    const article = articles[0]
    const a1 = values && values[0][0] || ''

    if (a1 !== article.title ) {
        console.log(`${moment().toISOString()} send notification`)

        await axios.post(process.env.GOOGLE_CHAT_WEBHOOK_ENDPOINT as string, buildMessage(article))

        await googleSheets.update(sheetsId, 'Sheet1!A1:C1', [[article.title, a1, moment().utcOffset(8).toISOString()]])
    } else {
        console.log(`${moment().toISOString()} not change`)
    }

    console.log(`${moment().toISOString()} finish`)
}).then((r) => console.log('finish'))

const buildMessage = (options: {id: string, title: string, url: string, img: string}) => ({
    "cards": [
        {
            "sections": [
                {
                    "widgets": [
                        {
                            "textParagraph": { "text": `<b>New Article： </b>` }
                        },
                        {
                            "textParagraph": { "text": `<b>${options.title}</b>` }
                        },
                        {
                            "image": { "imageUrl": options.img }
                        },
                        {
                            "buttons": [
                                {
                                    "textButton": {
                                        "text": "Go To Coolpc",
                                        "onClick": {
                                            "openLink": {
                                                "url": options.url
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
})
