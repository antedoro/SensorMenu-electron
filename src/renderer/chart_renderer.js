
const tempGaugeCanvas = document.getElementById('tempGauge');
const humGaugeCanvas = document.getElementById('humGauge');
const tempChartCanvas = document.getElementById('tempChart');
const humChartCanvas = document.getElementById('humChart');

let tempGauge, humGauge, tempChart, humChart;

// Function to create a gauge chart (simplified for demonstration)
function createGauge(canvas, label, value, max) {
    return new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: [label, ''],
            datasets: [{
                data: [value, max - value],
                backgroundColor: ['#4CAF50', '#E0E0E0'],
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
function createLineChart(canvas, label, borderColor) {
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
                    type: 'category',
                    labels: [],
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    beginAtZero: true,
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
    tempGaugeCanvas.width = 200;
    tempGaugeCanvas.height = 200;
    humGaugeCanvas.width = 200;
    humGaugeCanvas.height = 200;
    tempChartCanvas.width = 400;
    tempChartCanvas.height = 200;
    humChartCanvas.width = 400;
    humChartCanvas.height = 200;

    tempGauge = createGauge(tempGaugeCanvas, 'Temperature', 0, 50); // Max temp 50°C
    humGauge = createGauge(humGaugeCanvas, 'Humidity', 0, 100); // Max hum 100%
    tempChart = createLineChart(tempChartCanvas, 'Temperature (°C)', 'rgb(255, 99, 132)');
    humChart = createLineChart(humChartCanvas, 'Humidity (%)', 'rgb(54, 162, 235)');
});

// Function to update charts
window.api.onMqttData((event, data) => {
    const { temp, hum } = data;
    const timestamp = new Date().toLocaleTimeString();

    // Update gauges
    tempGauge.data.datasets[0].data = [temp, 50 - temp];
    tempGauge.update();
    humGauge.data.datasets[0].data = [hum, 100 - hum];
    humGauge.update();

    // Update line charts
    tempChart.data.labels.push(timestamp);
    tempChart.data.datasets[0].data.push(temp);
    humChart.data.labels.push(timestamp);
    humChart.data.datasets[0].data.push(hum);

    // Keep only the last 20 data points
    const maxDataPoints = 20;
    if (tempChart.data.labels.length > maxDataPoints) {
        tempChart.data.labels.shift();
        tempChart.data.datasets[0].data.shift();
        humChart.data.labels.shift();
        humChart.data.datasets[0].data.shift();
    }

    tempChart.update();
    humChart.update();
});
