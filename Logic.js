const {v4} = require('uuid');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class Logic {
  constructor() {
    this.msgCount = 10;
    this.msgHistory = [];
  }

  processingData(data) {
    const message = {
      ...data,
      id: v4(),
      date: new Date(Date.now()).toLocaleString(),
    }

    if (data.event === 'command') {
      return this.botCommandHandler(message);
    }

    if (data.type === 'text' ) {
      const text = message.message;
      const checkUrl = this.validateMessage(text);
      message.message = checkUrl;
    }

    if (data.event !== 'command') {
      this.msgHistory.push(message);
    }

    return message; 
  }

  validateMessage(text) {
    const validText = text.split(' ')
      .map((word) => {
        if (this.isValidHttpUrl(word)) {
          return `<a href="${word}">${word}</a>`
        }
        return word;
      });
    return validText.join(' ');
  }

  isValidHttpUrl(word) {
    let url;
    try {
      url = new URL(word);
    } catch (e) {
      return false;  
    }
    return url.protocol === 'http:' || url.protocol === 'https:';
  }

  getLastMessage(data) {
    if (!this.msgHistory.length) {
      return {
        event: 'getLastMessage',
        status: false,
      }
    }

    let lastMessages = null;
    if (this.msgHistory.length <= this.msgCount) {
      lastMessages = this.msgHistory.slice();
    } else {
      const startIndex = this.msgHistory.length - this.msgCount;
      lastMessages = this.msgHistory.slice(startIndex);
    }
    
    return {
      event: 'getLastMessage',
      status: true,
      message: lastMessages,
    }
  }

  loadHistory(data) {
    const { id } = data;
    if (!id) return;
    const indexLastMessage = this.msgHistory.findIndex((msg) => msg.id === id);
    let startIndex = indexLastMessage - this.msgCount;
    if (indexLastMessage === 0) {
      return {
        event: 'getHistory',
        status: false,
      }
    }
    if (startIndex < 0) startIndex = 0;
    const messages = this.msgHistory.slice(startIndex, indexLastMessage).reverse();
    return {
      event: 'getHistory',
      status: true,
      message: messages,
    }
  }

  async botCommandHandler(data) {
    const { message } = data;
    let [, command] = message.split(' ');
    command = command.trim();

    if (command === 'weather') {
      const response = await this.getWeather(data.location);
      if (!response.error) {
        const { current, location } = response;
        const weather = {
          location: location.name,
          temp: current.temp_c,
          condition: current.condition.text,
          icon: 'http:' + current.condition.icon,
        };
        return {...data, weather, type: 'weather'};
      } else {
        return {...data, type: 'text', message: response.error.message};
      }
    }

    if (command === 'usd' || command === 'eur') {
      const response = await this.getCurrencyCourse();
      const course = response.Valute[command.toUpperCase()];
      const text = `${course.Name}:  ${course.Value.toFixed(2)} руб.`
      return {...data, type: 'text', message: text}
    }

    return {...data, type: 'text', message: 'Не верная команда'};
  }

  async getWeather({ latitude, longitude }) {
    const url = 'http://api.weatherapi.com/v1/current.json';
    const params = {
      key: '4ab5c720755741ffa8b141807220707',
      lang: 'ru',
      q: `${latitude},${longitude}`,
    }
    const paramString = new URLSearchParams(params);
    const response = await fetch(`${url}?${paramString}`);
    const data = await response.json();
    return data;
  }

  async getCurrencyCourse() {
    const response = await fetch(' https://www.cbr-xml-daily.ru/daily_json.js');
    if (response.status >= 200 && response.status < 300) {
      const data = await response.json();
      return data;
    }    
  }

  randomNumber(max) {
    return Math.floor(Math.random() * max);
  }  
}

module.exports = Logic;