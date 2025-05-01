const axios = require("axios");

let exchangeRatesCache = { data: null, lastFetched: null };

const fetchExchangeRates = async () => {
  if (
    exchangeRatesCache.data &&
    new Date() - exchangeRatesCache.lastFetched < 12 * 60 * 60 * 1000
  ) {
    return exchangeRatesCache.data;
  }

  const API_KEY = "mJaSBGP2lDd7EDknDawdjgZPEXILLvYQ";
  const response = await axios.get(
    `https://api.apilayer.com/exchangerates_data/latest?base=USD&apikey=${API_KEY}`
  );

  exchangeRatesCache.data = response.data.rates;
  exchangeRatesCache.lastFetched = new Date();

  return exchangeRatesCache.data;
};

const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;
  const rates = await fetchExchangeRates();

  if (!rates[fromCurrency] || !rates[toCurrency])
    throw new Error("Exchange rate not available.");

  return (amount / rates[fromCurrency]) * rates[toCurrency];
};

module.exports = { fetchExchangeRates, convertCurrency };
