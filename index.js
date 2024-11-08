console.log("Uygulama başlatıldı.");

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot() {
  const options = new chrome.Options();
  options.addArguments("profile-directory=Default");
  options.addArguments("--disable-dev-shm-usage");
  options.addArguments("--no-sandbox");
  options.addArguments("headless");
  // Tarayıcıyı başlatıyoruz
  let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  
  try {
    await driver.get("https://tr.tradingview.com/chart/xUQxf6YK/?symbol=BTCUSDT");
    
    await driver.manage().window().setRect({ width: 1920, height: 1080 });
    
    await sleep(5000);
    
    const element = await driver.findElement(By.className('layout__area--center'));

    const screenshot = await element.takeScreenshot();

    const filePath = path.join(__dirname, 'element_screenshot.png');
    fs.writeFileSync(filePath, screenshot, 'base64');

    console.log("Ekran görüntüsü alındı ve kaydedildi: " + filePath);

    await sendScreenshotToTelegram(filePath);

  } catch (error) {
    console.error('Bir hata oluştu:', error);
  } finally {
    await driver.quit();
  }
}

async function sendScreenshotToTelegram(filePath) {
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

  const text= `BTCUSDT\n${formattedDate}\nYatırım Tavsiyesi Değildir. İşlemlerinizi yaparken bunu unutmayın!`;

  try {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', text);
    formData.append('photo', fs.createReadStream(filePath));

    
    const response = await axios.post(telegramUrl, formData, {
      headers: formData.getHeaders(),
    });

    console.log('Ekran görüntüsü Telegram\'a gönderildi:', response.data);

  } catch (error) {
    console.error('Telegram\'a fotoğraf gönderilirken hata oluştu:', error);
  }
}

schedule.scheduleJob('0 17 * * *', function() {
  console.log('Screenshot alma işlemi başladı.');
  takeScreenshot()
    .then(() => console.log('Screenshot alma işlemi tamamlandı.'))
    .catch(error => console.error('Bir hata oluştu:', error));
});
