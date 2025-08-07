
const tempGaugeCanvas = document.getElementById('tempGauge');
const humGaugeCanvas = document.getElementById('humGauge');
const tempChartCanvas = document.getElementById('tempChart');
const humChartCanvas = document.getElementById('humChart');
const allDataList = document.getElementById('allDataList');

let tempGauge, humGauge, tempChart, humChart;
let dataIdCounter = 0;

function getGaugeColor(value, type) {
    if (type === 'Temperature') {
        if (value < 10) return '#007bff'; // Blue for low temp (<10°C)
        if (value >= 10 && value <= 25) return '#28a745'; // Green for normal temp (10-25°C)
        return '#dc3545'; // Red for high temp (>25°C)
    } else if (type === 'Humidity') {
        if (value < 30) return '#007bff'; // Blue for low hum (<30%)
        if (value >= 30 && value <= 70) return '#28a745'; // Green for normal hum (30-70%)
        return '#dc3545'; // Red for high hum (>70%)
    }
    return '#6c757d'; // Default gray
}

// Function to create a gauge chart (simplified for demonstration)
function createGauge(canvas, label, value, max) {
    return new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: [label, ''],
            datasets: [{
                data: [value, max - value],
                backgroundColor: [getGaugeColor(value, label), '#E0E0E0'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            cutout: '80%',
            rotation: 270,
            circumference: 180,
            plugins: {
                tooltip: { enabled: false },
                legend: { display: false },
                text: { label: label } // Pass label to plugin options
            },
            animation: false
        },
        plugins: [{
            id: 'text',
            beforeDraw: function(chart) {
                let width = chart.width,
                    height = chart.height,
                    ctx = chart.ctx;

                ctx.restore();
                let fontSize = (height / 114).toFixed(2);
                ctx.font = fontSize + "em sans-serif";
                ctx.textBaseline = "middle";

                let currentValue = chart.data.datasets[0].data[0];
                let text = currentValue + (chart.options.plugins.text.label === 'Temperature' ? '°C' : '%'),
                    textX = Math.round((width - ctx.measureText(text).width) / 2),
                    textY = height / 1.4;
                ctx.fillText(text, textX, textY);
                ctx.save();
            }
        }]
    });
}

// Function to create a line chart
function createLineChart(canvas, label, borderColor, yMin, yMax) {
    return new Chart(canvas, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: borderColor,
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: false, // Disable responsiveness for line charts
            maintainAspectRatio: false,
            animation: false, // Disable animation for line charts
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        displayFormats: {
                            minute: 'HH:mm'
                        },
                        tooltipFormat: 'HH:mm:ss'
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    min: yMin,
                    max: yMax,
                    title: {
                        display: true,
                        text: label
                    }
                }
            }
        }
    });
}

// Initialize charts
document.addEventListener('DOMContentLoaded', () => {
    tempGaugeCanvas.width = 150;
    tempGaugeCanvas.height = 150;
    humGaugeCanvas.width = 150;
    humGaugeCanvas.height = 150;
    tempChartCanvas.width = 400;
    tempChartCanvas.height = 200;
    humChartCanvas.width = 400;
    humChartCanvas.height = 200;

    tempGauge = createGauge(tempGaugeCanvas, 'Temperature', 0, 60); // Max range 60 (from -10 to 50)
    humGauge = createGauge(humGaugeCanvas, 'Humidity', 0, 100); // Max hum 100%
    tempChart = createLineChart(tempChartCanvas, 'Temperature (°C)', 'rgb(255, 99, 132)', -10, 50);
    humChart = createLineChart(humChartCanvas, 'Humidity (%)', 'rgb(54, 162, 235)', 0, 100);
});

// Function to update charts
window.api.onMqttData((event, data) => {
    const { temp, hum } = data;
    const now = new Date();

    // Update gauges
    tempGauge.data.datasets[0].data = [temp + 10, 60 - (temp + 10)]; // Adjust value for -10 to 50 range
    tempGauge.data.datasets[0].backgroundColor = [getGaugeColor(temp, 'Temperature'), '#E0E0E0'];
    tempGauge.update();
    humGauge.data.datasets[0].data = [hum, 100 - hum];
    humGauge.data.datasets[0].backgroundColor = [getGaugeColor(hum, 'Humidity'), '#E0E0E0'];
    humGauge.update();

    // Update data list
    dataIdCounter++;
    const maxListItems = 10; // Limit to 10 items in the list

    const dataRow = document.createElement('div');
    dataRow.classList.add('data-list-row');
    dataRow.innerHTML = `<span class="data-list-col">${dataIdCounter}</span><span class="data-list-col">${now.toLocaleTimeString()}</span><span class="data-list-col">${temp}°C</span><span class="data-list-col">${hum}%</span>`;

    // Insert after the header, but before the first data row
    const header = allDataList.querySelector('.data-list-header');
    if (header && header.nextElementSibling) {
        allDataList.insertBefore(dataRow, header.nextElementSibling);
    } else {
        allDataList.appendChild(dataRow); // Fallback if no header or no next sibling
    }

    // Remove old items, keeping the header in count
    while (allDataList.children.length > maxListItems + 1) {
        allDataList.removeChild(allDataList.lastChild);
    }

    // Update line charts
    // Remove data older than 1 hour
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));

    let i = 0;
    while (i < tempChart.data.labels.length && new Date(tempChart.data.labels[i]) < oneHourAgo) {
        tempChart.data.labels.shift();
        tempChart.data.datasets[0].data.shift();
        humChart.data.labels.shift();
        humChart.data.datasets[0].data.shift();
    }

    tempChart.data.labels.push(now);
    tempChart.data.datasets[0].data.push(temp);
    humChart.data.labels.push(now);
    humChart.data.datasets[0].data.push(hum);

    tempChart.update();
    humChart.update();
});
