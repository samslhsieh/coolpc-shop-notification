import * as dotenv from 'dotenv'
import moment from 'moment'
import axios from 'axios'
import { GoogleSheets } from "./models/googleSheets";

dotenv.config()

new Promise(async (resolve, reject) => {
    const data = (await axios.get('https://www.coolpc.com.tw/tw/')).data as string

    const pattern = /<a data-post-id="(?<id>\d+)" href=\"(?<url>.+)\" title=\"(?<title>.+)\" class=.+<img.+data-wpfc-original-src=\"(?<img>.+)\" data-wpfc-original-srcset.+\/><\/a>/
    const patternGlobal = /<a data-post-id="(?<id>\d+)" href=\"(?<url>.+)\" title=\"(?<title>.+)\" class=.+<img.+data-wpfc-original-src=\"(?<img>.+)\" data-wpfc-original-srcset.+\/><\/a>/g

    const articleElements = data.match(patternGlobal) as any

    const articles = articleElements.map((articleElement: any) => {
        const a = { ...articleElement.match(pattern).groups }

        return { ...a, url: `https://www.coolpc.com.tw${a.url}`, img: `https://www.coolpc.com.tw${a.img}`}
    })

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
