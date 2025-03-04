async function fetchCryptoData(url) {
    const response = await fetch(url);
    return response.json();
}

let coinChart = null;
let hasDVCX = false; // Simulación de tener DVCX en MetaMask

// Indicadores Generales del Mercado
async function loadMarketOverview() {
    const data = await fetchCryptoData('https://api.coingecko.com/api/v3/global');
    const totalMarketCap = data.data.total_market_cap.usd;
    const btcDominance = data.data.market_cap_percentage.btc;
    document.getElementById('total-market-cap').textContent = `$${totalMarketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    document.getElementById('btc-dominance').textContent = `${btcDominance.toFixed(2)}%`;
}

async function loadFearGreedIndex() {
    const data = await fetchCryptoData('https://api.alternative.me/fng/?limit=1');
    const value = data.data[0].value;
    const classification = data.data[0].value_classification;
    document.getElementById('fear-greed').textContent = `${value} - ${classification}`;
}

// Top 20 Criptomonedas por Capitalización
async function loadTop20CapCoins() {
    const data = await fetchCryptoData('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1');
    const list = document.getElementById('top-20-cap-list');
    list.innerHTML = data.map(coin => `
        <div class="coin-card">
            <img src="${coin.image}" alt="${coin.name} icon">
            <div class="coin-info">
                <strong>${coin.name} (${coin.symbol.toUpperCase()})</strong>
                <p>$${coin.current_price.toLocaleString()} 
                    <span class="${coin.price_change_percentage_24h >= 0 ? 'green' : 'red'}">
                        (${coin.price_change_percentage_24h.toFixed(2)}%)
                    </span>
                </p>
                <p>Market Cap: $${coin.market_cap.toLocaleString()}</p>
                <p>Volumen 24h: $${coin.total_volume.toLocaleString()}</p>
            </div>
        </div>
    `).join('');
}

// Top 10 Criptos de Baja Capitalización (entre $1M y $100M)
async function loadLowCapCoins() {
    const data = await fetchCryptoData('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1');
    const lowCap = data.filter(coin => coin.market_cap > 1000000 && coin.market_cap < 100000000).slice(0, 10);
    const list = document.getElementById('low-cap-list');
    list.innerHTML = lowCap.map(coin => `
        <div class="coin-card">
            <img src="${coin.image}" alt="${coin.name} icon">
            <div class="coin-info">
                <strong>${coin.name} (${coin.symbol.toUpperCase()})</strong>
                <p>$${coin.current_price.toLocaleString()} 
                    <span class="${coin.price_change_percentage_24h >= 0 ? 'green' : 'red'}">
                        (${coin.price_change_percentage_24h.toFixed(2)}%)
                    </span>
                </p>
                <p>Market Cap: $${coin.market_cap.toLocaleString()}</p>
                <p>Volumen 24h: $${coin.total_volume.toLocaleString()}</p>
            </div>
        </div>
    `).join('');
}

// Top 10 Memecoins
async function loadTopMemecoins() {
    const data = await fetchCryptoData('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=10&page=1');
    const list = document.getElementById('memecoin-list');
    list.innerHTML = data.map(coin => `
        <div class="coin-card">
            <img src="${coin.image}" alt="${coin.name} icon">
            <div class="coin-info">
                <strong>${coin.name} (${coin.symbol.toUpperCase()})</strong>
                <p>$${coin.current_price.toLocaleString()} 
                    <span class="${coin.price_change_percentage_24h >= 0 ? 'green' : 'red'}">
                        (${coin.price_change_percentage_24h.toFixed(2)}%)
                    </span>
                </p>
                <p>Market Cap: $${coin.market_cap.toLocaleString()}</p>
                <p>Volumen 24h: $${coin.total_volume.toLocaleString()}</p>
            </div>
        </div>
    `).join('');
}

// Indicadores de Trading para una Criptomoneda Específica
async function searchCoin() {
    const coinInput = document.getElementById('coin-search').value.toLowerCase();
    const coinDetails = document.getElementById('coin-details');
    coinDetails.classList.remove('hidden');

    try {
        const coinData = await fetchCryptoData(`https://api.coingecko.com/api/v3/coins/${coinInput}?tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
        const marketChart = await fetchCryptoData(`https://api.coingecko.com/api/v3/coins/${coinInput}/market_chart?vs_currency=usd&days=14`);

        document.getElementById('coin-name').textContent = coinData.name;

        const price = coinData.market_data.current_price.usd;
        const change24h = coinData.market_data.price_change_percentage_24h;
        const marketCap = coinData.market_data.market_cap.usd;
        const volume = coinData.market_data.total_volume.usd;

        document.getElementById('coin-price').textContent = `$${price.toLocaleString()}`;
        document.getElementById('price-change').textContent = `${change24h.toFixed(2)}%`;
        document.getElementById('market-cap').textContent = `$${marketCap.toLocaleString()}`;
        document.getElementById('volume').textContent = `$${volume.toLocaleString()}`;

        const prices = marketChart.prices.map(price => price[1]);

        // RSI (14 días)
        const rsiPeriod = 14;
        const gains = [], losses = [];
        for (let i = 1; i < rsiPeriod + 1; i++) {
            const diff = prices[prices.length - i] - prices[prices.length - i - 1];
            if (diff > 0) gains.push(diff); else losses.push(Math.abs(diff));
        }
        const avgGain = gains.reduce((a, b) => a + b, 0) / rsiPeriod || 0;
        const avgLoss = losses.reduce((a, b) => a + b, 0) / rsiPeriod || 1;
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        document.getElementById('rsi').textContent = rsi.toFixed(2);

        // MACD (12, 26, 9)
        const ema12 = calculateEMA(prices, 12);
        const ema26 = calculateEMA(prices, 26);
        const macdLine = ema12 - ema26;
        const signalLine = calculateEMA([macdLine], 9);
        document.getElementById('macd').textContent = `${macdLine.toFixed(2)} / ${signalLine.toFixed(2)}`;

        // Bollinger Bands (20 días, 2 desviaciones estándar)
        const period = 20;
        const sma20 = prices.slice(-period).reduce((a, b) => a + b, 0) / period;
        const variance = prices.slice(-period).reduce((a, b) => a + Math.pow(b - sma20, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        const upperBand = sma20 + (2 * stdDev);
        const lowerBand = sma20 - (2 * stdDev);
        document.getElementById('bollinger').textContent = `Upper: $${upperBand.toFixed(2)}, Lower: $${lowerBand.toFixed(2)}`;

        // Gráfico de precios
        if (coinChart) coinChart.destroy();
        const ctx = document.getElementById('price-chart').getContext('2d');
        coinChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: marketChart.prices.map((_, i) => i),
                datasets: [{
                    label: `${coinData.name} Price (USD)`,
                    data: marketChart.prices.map(price => price[1]),
                    borderColor: var(--accent-color),
                    fill: false,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: false },
                    y: { beginAtZero: false }
                }
            }
        });
    } catch (error) {
        alert('Moneda no encontrada o error en la API. Intenta de nuevo.');
        coinDetails.classList.add('hidden');
    }
}

// Función para calcular EMA
function calculateEMA(data, period) {
    const multiplier = 2 / (period + 1);
    let ema = data.reduce((a, b) => a + b, 0) / data.length;
    for (let i = data.length - 1; i >= 0; i--) {
        ema = (data[i] - ema) * multiplier + ema;
    }
    return ema;
}

// Lógica del Asistente Lateral
function toggleSidebar() {
    const sidebar = document.getElementById('ai-sidebar');
    sidebar.classList.toggle('active');
}

document.getElementById('ai-assistant-btn').addEventListener('click', toggleSidebar);

function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    // Mostrar mensaje del usuario
    const chatMessages = document.getElementById('chat-messages');
    const userMessage = document.createElement('div');
    userMessage.className = 'chat-message user-message';
    userMessage.textContent = `Tú: ${message}`;
    chatMessages.appendChild(userMessage);

    // Respuesta de la IA (basada en criptomonedas o solicitudes)
    const aiResponse = getAIResponse(message);
    const aiMessage = document.createElement('div');
    aiMessage.className = 'chat-message ai-message';
    aiMessage.textContent = `DVCX AI: ${aiResponse}`;
    chatMessages.appendChild(aiMessage);

    // Desplazar al final del chat
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Limpiar input
    input.value = '';
}

// Respuestas del asistente de IA, limitadas a criptomonedas o solicitudes
function getAIResponse(message) {
    message = message.toLowerCase();
    const searchedCoin = document.getElementById('coin-search').value.toLowerCase() || '';

    // Solo responder preguntas relacionadas con criptomonedas o las buscadas
    if (!message.includes('cripto') && !message.includes('crypto') && !searchedCoin) {
        return 'Lo siento, solo puedo responder preguntas relacionadas con criptomonedas. Por favor, especifica una criptomoneda o pregunta sobre el mercado cripto.';
    }

    // Respuestas básicas sobre criptomonedas generales o específicas
    if (message.includes('rsi')) {
        return 'El RSI (Índice de Fuerza Relativa) mide el momentum del precio en una escala de 0 a 100. Si está por encima de 70, la criptomoneda puede estar sobrecomprada (posible venta); si está por debajo de 30, puede estar sobrevendida (posible compra). Es útil para identificar puntos de reversión.';
    } else if (message.includes('macd')) {
        return 'El MACD (Convergencia/Divergencia de Medias Móviles) compara dos EMAs (12 y 26 períodos) con una línea de señal (9 períodos). Cuando la línea MACD cruza por encima de la señal, es una señal alcista; si cruza por debajo, es bajista. Ayuda a identificar tendencias y momentum.';
    } else if (message.includes('bollinger bands')) {
        return 'Las Bandas de Bollinger miden la volatilidad con una media móvil simple (SMA) y dos bandas (2 desviaciones estándar arriba y abajo). Si el precio toca la banda superior, puede estar sobrecomprado; si toca la inferior, sobrevendido. Son útiles para identificar movimientos extremos y volatilidad.';
    } else if (message.includes('fear & greed')) {
        return 'El Índice de Miedo y Codicia mide el sentimiento del mercado cripto en una escala de 0 a 100. Valores bajos (0-25) indican miedo extremo (posible compra), mientras que valores altos (75-100) indican codicia extrema (posible venta). Ayuda a entender el comportamiento emocional del mercado.';
    } else if (message.includes('bitcoin dominance')) {
        return 'La Dominancia de Bitcoin mide qué porcentaje del market cap total del mercado cripto pertenece a Bitcoin. Si es alta (>60%), indica una "Bitcoin Season" (enfoque en Bitcoin); si es baja, una "Altcoin Season" (enfoque en altcoins). Es clave para evaluar tendencias generales.';
    } else if (message.includes('total market cap')) {
        return 'El Total Market Cap es la suma del valor de mercado de todas las criptomonedas. Representa el tamaño total del mercado cripto. Un aumento sostenido puede indicar un mercado alcista, mientras que una caída puede señalar un mercado bajista.';
    } else if (message.includes('precio') || message.includes('price')) {
        return `El Precio Actual es el valor en USD de ${searchedCoin || 'una criptomoneda'} en tiempo real. El Cambio 24h muestra su variación porcentual en las últimas 24 horas, útil para evaluar tendencias a corto plazo.`;
    } else if (message.includes('market cap')) {
        return `El Market Cap de ${searchedCoin || 'una criptomoneda'} es el valor total, calculado como precio por unidad × suministro circulante. Indica el tamaño y relevancia de un proyecto en el mercado.`;
    } else if (message.includes('volumen') || message.includes('volume')) {
        return `El Volumen de 24h de ${searchedCoin || 'una criptomoneda'} es la cantidad total negociada en las últimas 24 horas. Un volumen alto indica alta liquidez y actividad, confirmando tendencias de precio.`;
    } else if (message.includes(searchedCoin) && (message.includes('qué es') || message.includes('what is'))) {
        return `Soy DVCX AI. Puedo proporcionarte información básica sobre ${searchedCoin}, como su precio, market cap y volumen. Para respuestas avanzadas (e.g., análisis detallado, predicciones), necesitas sincronizar tu cartera MetaMask y verificar que tienes DVCX.`;
    } else if (message.includes('avanzado') || message.includes('avanzadas') || message.includes('advanced')) {
        if (hasDVCX) {
            return `¡Gracias por sincronizar tu MetaMask con DVCX! Puedo ofrecerte respuestas avanzadas. Por ejemplo, para ${searchedCoin || 'una criptomoneda'}, puedo analizar tendencias a largo plazo, correlaciones con otros activos, o estrategias de trading específicas. ¿Qué quieres saber?`;
        } else {
            document.getElementById('sync-metamask').classList.remove('hidden');
            return 'Lo siento, solo puedo ofrecer respuestas básicas sobre criptomonedas hasta que sincronices tu cartera MetaMask y verifiques que tienes DVCX. Haz clic en "Sincronizar MetaMask" para continuar.';
        }
    } else {
        return 'Lo siento, no entiendo tu pregunta. Por favor, pregunta sobre un indicador cripto específico (e.g., RSI, Fear & Greed) o una criptomoneda buscada.';
    }
}

// Simulación de sincronización con MetaMask
function syncMetamask() {
    // Aquí iría la integración real con MetaMask
    alert('Simulación: Conectar con MetaMask y verificar DVCX en tu cartera.');
    hasDVCX = true; // Simulación de que ahora tiene DVCX
    document.getElementById('sync-metamask').classList.add('hidden');
    const chatMessages = document.getElementById('chat-messages');
    const aiMessage = document.createElement('div');
    aiMessage.className = 'chat-message ai-message';
    aiMessage.textContent = 'DVCX AI: ¡Cartera sincronizada con éxito! Ahora puedo ofrecer respuestas avanzadas sobre criptomonedas.';
    chatMessages.appendChild(aiMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Cargar datos al iniciar
window.onload = async () => {
    await Promise.all([
        loadMarketOverview(),
        loadFearGreedIndex(),
        loadTop20CapCoins(),
        loadLowCapCoins(),
        loadTopMemecoins()
    ]);
};
