const TelegramBot = require('node-telegram-bot-api');
const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const schedule = require('node-schedule');

// Telegram bot token'ınızı buraya yerleştirin
const token = '6425462581:AAFfBLk5jT0wRsZAVbBJDsiAte_YYX_IQ-I';
const bot = new TelegramBot(token, { polling: true });

// Telegram bot komutlarını dinliyoruz
bot.onText(/\/screenshot (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const symbol = match[1];  // Kullanıcının gönderdiği parametre (örneğin: BTCUSDT)

    console.log(`Screenshot komutu alındı. Parametre: ${symbol}`);

    // Ekran görüntüsü alma işlemini başlatıyoruz
    takeScreenshot(symbol)
        .then(() => {})
        .catch(error => {
            bot.sendMessage(chatId, 'Bir hata oluştu: ' + error.message);
        });
});

// Ekran görüntüsü alma fonksiyonu
async function takeScreenshot(symbol) {
    const options = new chrome.Options();
    options.addArguments("profile-directory=Default");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--no-sandbox");
    options.addArguments("headless"); // Tarayıcıyı başlatırken görsel olarak açmıyoruz

    // Tarayıcıyı başlatıyoruz
    let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

    try {
        // Dinamik URL'yi oluşturuyoruz
        const url = `https://tr.tradingview.com/chart/xUQxf6YK/?symbol=${symbol}`;
        await driver.get(url);

        // Tarayıcı boyutunu ayarlıyoruz
        await driver.manage().window().setRect({ width: 1920, height: 1080 });

        // Sayfa yüklenmesi ve işlem yapılması için 5 saniye bekliyoruz
        await sleep(5000);

        // 'layout__area--center' sınıfına sahip öğeyi buluyoruz
        const element = await driver.findElement(By.className('layout__area--center'));

        // Seçilen öğenin ekran görüntüsünü alıyoruz
        const screenshot = await element.takeScreenshot();

        // Ekran görüntüsünü dosyaya kaydediyoruz
        const filePath = path.join(__dirname, `element_screenshot_${symbol}.png`);
        fs.writeFileSync(filePath, screenshot, 'base64');

        console.log(`Ekran görüntüsü alındı ve kaydedildi: ${filePath}`);

        // Telegram API'ye gönderiyoruz
        await sendScreenshotToTelegram(filePath, symbol);

    } catch (error) {
        console.error('Bir hata oluştu:', error);
    } finally {
        // Tarayıcıyı kapatıyoruz
        await driver.quit();
    }
}

// Telegram'a fotoğraf gönderme fonksiyonu
async function sendScreenshotToTelegram(filePath, symbol) {
    const telegramUrl = 'https://api.telegram.org/bot6425462581:AAFfBLk5jT0wRsZAVbBJDsiAte_YYX_IQ-I/sendPhoto';
    const chatId = '-1002260128557';
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString('tr-TR', {
        weekday: 'long', // Günün adı (örneğin, Pazartesi)
        year: 'numeric', // Yıl
        month: 'long', // Ay adı (örneğin, Eylül)
        day: 'numeric', // Gün numarası
        hour: 'numeric', // Saat
        minute: 'numeric', // Dakika
        second: 'numeric', // Saniye
        hour12: false // 24 saat formatı
    });

    const text = `${symbol}\n${formattedDate}\nYatırım Tavsiyesi Değildir. İşlemlerinizi yaparken bunu unutmayın!`;

    try {
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('caption', text);
        formData.append('photo', fs.createReadStream(filePath)); // Fotoğraf dosyasını stream olarak ekliyoruz

        // Telegram API'ye fotoğraf gönderiyoruz
        const response = await axios.post(telegramUrl, formData, {
            headers: formData.getHeaders(),
        });

        console.log('Ekran görüntüsü Telegram\'a gönderildi:', response.data);

    } catch (error) {
        console.error('Telegram\'a fotoğraf gönderilirken hata oluştu:', error);
    }
}

// Sleep fonksiyonu
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Her gün saat 17:00'de ekran görüntüsü almak için zamanlanmış görev
schedule.scheduleJob('0 17 * * *', function() {
    console.log('Screenshot alma işlemi başladı.');
    takeScreenshot('BTCUSDT')
        .then(() => console.log('Screenshot alma işlemi tamamlandı.'))
        .catch(error => console.error('Bir hata oluştu:', error));
});
