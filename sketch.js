let table;
const canvas_width = 1200;
const canvas_height = 600;
const margin = {
    top: 120,
    right: 300,
    bottom: 100,
    left: 100
};
const barWidth = 50;
let hoveredBar = -1;
let hoveredPoint = null;
const INACTIVE_ALPHA = 100;

let animationProgress = 0;
let dataPointPulse = 0;
const ANIMATION_DURATION = 60;
let barOpacities = [];
let lineOpacities = { temperature: 255, precipitation: 255 };

const canvasTopMargin = 430;

let schoolDBNs = [];
let selectedSchool = "01M015";
let schoolSelector;

let selectedMonth = null;

function preload() {
    table = loadTable("data/compressed_data.csv", "csv", "header");
}

function setup() {
    let cnv = createCanvas(canvas_width, canvas_height);
    centerCanvas(cnv);
    extractSchoolDBNs();
    createSchoolSelector();
    filterDataBySchool();

    frameRate(30);
    barOpacities = new Array(10).fill(255);
    animationProgress = 0;

    createLinks();
}

function createLinks() {

    let linkContainer = createDiv('');
    linkContainer.position(margin.right + 840, canvas_height + 345);
    linkContainer.style('font-size', '10px');
    linkContainer.style('color', 'black');

    let linkText = createP('The original datasets:');
    linkText.style('margin', '0');
    linkText.style('padding-bottom', '10px');
    linkContainer.child(linkText);

    let link1 = createA('https://www.kaggle.com/datasets/sahirmaharajj/school-student-daily-attendance/data', 'School Attendance Data', '_blank');
    link1.style('color', 'brown');
    link1.style('text-decoration', 'underline');
    link1.style('display', 'block');
    linkContainer.child(link1);

    let link2 = createA('https://open-meteo.com/en/docs/historical-weather-api#latitude=40.7143&longitude=-74.006&start_date=2018-09-05&end_date=2019-06-26&hourly=&daily=weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,apparent_temperature_max,apparent_temperature_min,apparent_temperature_mean,sunrise,sunset,daylight_duration,sunshine_duration,precipitation_sum,rain_sum,snowfall_sum,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration&timezone=America%2FNew_York&models=', 'Historical Weather Data', '_blank');
    link2.style('color', 'brown');
    link2.style('text-decoration', 'underline');
    link2.style('display', 'block');
    linkContainer.child(link2);
}

function extractSchoolDBNs() {

    let dbnColumn = table.getColumn("School DBN");
    let uniqueDBNs = {};
    
    for (let i = 0; i < dbnColumn.length; i++) {
        uniqueDBNs[dbnColumn[i]] = true;
    }
    
    schoolDBNs = Object.keys(uniqueDBNs).sort();
    
    if (!schoolDBNs.includes(selectedSchool) && schoolDBNs.length > 0) {
        selectedSchool = schoolDBNs[0];
    }
    
    console.log("Found " + schoolDBNs.length + " unique schools in the dataset");
}

function createSchoolSelector() {
    schoolSelector = createSelect();
    schoolSelector.position(width - margin.right + 240, margin.top + 675);
    schoolSelector.option('Select a School DBN', '');
    
    for (let dbn of schoolDBNs) {
        schoolSelector.option(dbn);
    }
    
    schoolSelector.selected(selectedSchool);
    schoolSelector.changed(onSchoolSelected);

    schoolSelector.style('font-size', '14px');
    schoolSelector.style('padding', '5px');
    schoolSelector.style('width', '160px');
    schoolSelector.style('background-color', 'white');
    schoolSelector.style('border', '2px solid black');
    schoolSelector.style('border-radius', '0');
    schoolSelector.style('box-sizing', 'border-box');
}

function onSchoolSelected() {
    let newSchool = schoolSelector.value();
    
    if (newSchool !== '') {
        selectedSchool = newSchool;
        selectedMonth = null;
        filterDataBySchool();
        animationProgress = 0;
        barOpacities = new Array(10).fill(255);
    }
}

let dates, temperature, precipitation, present_rate, absent_rate;

function filterDataBySchool() {
    let filteredRows = [];
    
    for (let i = 0; i < table.getRowCount(); i++) {
        let row = table.getRow(i);
        if (row.getString("School DBN") === selectedSchool) {
            if (selectedMonth !== null) {
                let date = new Date(row.getString("Date"));
                let monthName = [
                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
                ][date.getMonth()];
                
                if (monthName !== selectedMonth) {
                    continue;
                }
            }
            
            filteredRows.push(row);
        }
    }
    
    console.log(`Filtered to ${filteredRows.length} rows for school ${selectedSchool}${selectedMonth ? ' and month ' + selectedMonth : ''}`);
    
    dates = [];
    temperature = [];
    precipitation = [];
    present_rate = [];
    absent_rate = [];
    
    for (let row of filteredRows) {
        dates.push(row.getString("Date"));
        temperature.push(row.getNum("temperature_mean (°C)"));
        precipitation.push(row.getNum("precipitation_sum (mm)"));
        present_rate.push(row.getNum("Present"));
        absent_rate.push(row.getNum("Absent"));
    }
}

function centerCanvas(cnv) {
    let x = (windowWidth - canvas_width) / 2;
    let y = (windowHeight - canvas_height) / 2 + canvasTopMargin;
    cnv.position(x, y);
}

function windowResized() {
    centerCanvas();
    
    schoolSelector.position(margin.left, canvasTopMargin - 50);
}

function mouseClicked() {
    const schoolMonths = ['Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    let xStep = (width - margin.left - margin.right) / (schoolMonths.length);
    
    for (let i = 0; i < schoolMonths.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        let y = height - margin.bottom + 25;
        
        if (mouseX >= x - xStep/2 && mouseX <= x + xStep/2 &&
            mouseY >= y - 10 && mouseY <= y + 10) {
            
            if (selectedMonth === schoolMonths[i]) {
                selectedMonth = null;
                console.log("Cleared month selection");
            } else {
                selectedMonth = schoolMonths[i];
                console.log("Selected month: " + selectedMonth);
            }
            
            filterDataBySchool();
            animationProgress = 0;
            barOpacities = new Array(10).fill(255);
            
            return;
        }
    }
    
    if (selectedMonth !== null) {
        let btnX = margin.left + 200;
        let btnY = canvasTopMargin - 50;
        
        if (mouseX >= btnX && mouseX <= btnX + 150 &&
            mouseY >= btnY - 15 && mouseY <= btnY + 15) {
            selectedMonth = null;
            filterDataBySchool();
            animationProgress = 0;
            barOpacities = new Array(10).fill(255);
        }
    }
}

function draw() {
    background(255);
    
    if (animationProgress < ANIMATION_DURATION) {
        animationProgress++;
    }
    dataPointPulse = (sin(frameCount * 0.1) + 1) * 2;
    
    let schoolMonths = ['Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    let xStep = (width - margin.left - margin.right) / (schoolMonths.length);
    let chartHeight = height - margin.top - margin.bottom;
    
    strokeWeight(2);
    stroke(0);
    line(margin.left, height - margin.bottom, width - margin.right, height - margin.bottom);
    strokeWeight(2);
    stroke(255, 0, 0);
    line(margin.left, margin.top, margin.left, height - margin.bottom);
    stroke(0, 0, 255);
    strokeWeight(2);
    line(width - margin.right, margin.top, width - margin.right, height - margin.bottom);
    
    textSize(22);
    textAlign(CENTER);
    noStroke();
    fill(0);
    textFont('Arial');
    text('Weather Conditions and Student Attendance \n Patterns in New York City Schools (2018-2019)', width/2.4, margin.top/2);
    
    textSize(16);
    text('School DBN: ' + selectedSchool, width/2.4, margin.top/2 + 50);
    
    textSize(14);
    noStroke();
    fill(0);
    textFont('Arial');
    text('Months of the School Year', width/2.4, height - margin.bottom/3);
    
    push();
    translate(margin.left/2.3, height/2);
    rotate(-PI/2);
    noStroke();
    fill(255, 0, 0);
    textFont('Arial');
    text('Temperature (°F)', 0, 0);
    pop();
    
    push();
    translate(width - margin.right/1.25, height/2);
    rotate(PI/2);
    noStroke();
    fill(0, 0, 255);
    textFont('Arial');
    text('Precipitation (mm)', 0, 0);
    pop();
    
    textSize(12);
    textAlign(CENTER);
    for (let i = 0; i < schoolMonths.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        
        if (selectedMonth === schoolMonths[i]) {
            fill(255, 240, 200);
            noStroke();
            rect(x - xStep/2, height - margin.bottom + 10, xStep, 30);
            fill(0, 0, 255);
        } else {
            fill(0);
        }
        
        text(schoolMonths[i], x, height - margin.bottom + 25);
    }
    
    if (selectedMonth !== null) {
        noStroke();
        fill(0);
    }
    
    fill(255, 0, 0);
    textSize(12);
    strokeWeight(2);
    textAlign(RIGHT);
    let yStep = chartHeight / 10;
    for (let i = 0; i <= 10; i++) {
        let y = height - margin.bottom - i * yStep;
        let temp = i * 10;
        text(temp, margin.left - 15, y + 5);
    }
    
    fill(0, 0, 255);
    textSize(12);
    strokeWeight(2);
    textAlign(LEFT);
    for (let i = 0; i <= 11; i++) {
        let y = height - margin.bottom - (i * chartHeight / 11);
        let precip = Math.floor(i * 20);
        text(precip, width - margin.right + 15, y + 5);
    }

    let hasData = dates && dates.length > 0;
    
    if (hasData) {
        if (selectedMonth !== null) {
            drawDailyBars(xStep, chartHeight);
            drawDailyLines(xStep, chartHeight);
        } else {
            drawMonthlyData(schoolMonths, xStep, chartHeight);
        }
        
        drawLegend();
    } else {
        textAlign(CENTER);
        textSize(18);
        fill(0);
        text("No data available for school " + selectedSchool, width/2, height/2);
    }
    
if (hoveredBar !== -1) {
    if (selectedMonth !== null) {
        let i = hoveredBar;
        let dayWidth = (width - margin.left - margin.right) / dates.length;
        let x = margin.left + i * dayWidth + dayWidth/2;
        let y = height - margin.bottom - 10;
        
        let date = dates[i];
        let weatherCode = "Unknown weather";
        
        for (let j = 0; j < table.getRowCount(); j++) {
            let row = table.getRow(j);
            if (row.getString("Date") === date && row.getString("School DBN") === selectedSchool) {
                weatherCode = interpretWeatherCode(row.getNum("weather_code"));
                break;
            }
        }
        
        let day = new Date(dates[i]).getDate();
        let total = present_rate[i] + absent_rate[i];
        let presentPercent = (present_rate[i] / total * 100).toFixed(1);
        let absentPercent = (absent_rate[i] / total * 100).toFixed(1);
        let tempF = celsiusToFahrenheit(temperature[i]).toFixed(1);
        let precip = precipitation[i].toFixed(1);
        
        fill(255);
        stroke(0);
        rect(x - 90, y - 120, 180, 107);
        
        noStroke();
        fill(0);
        textAlign(LEFT);
        textSize(12);
        text(`Day: ${day} ${selectedMonth}`, x - 80, y - 100);
        text(`Present: ${presentPercent}%`, x - 80, y - 85);
        text(`Absent: ${absentPercent}%`, x - 80, y - 70);
        text(`Temp: ${tempF}°F`, x - 80, y - 55);
        text(`Precip: ${precip}mm`, x - 80, y - 40);
        text(`Weather: ${weatherCode}`, x - 80, y - 25);
        } else {
            let schoolMonths = ['Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            let xStep = (width - margin.left - margin.right) / (schoolMonths.length);
            let x = margin.left + hoveredBar * xStep + xStep / 2;
            let y = height - margin.bottom - 10;
        
            let monthlyPresence = calculateMonthlyAverages(present_rate, false);
            let monthlyAbsence = calculateMonthlyAverages(absent_rate, false);
            let monthlyTemp = calculateMonthlyAverages(temperature, true);
            let monthlyPrecip = calculateMonthlyAverages(precipitation, false);
        
            let month = schoolMonths[hoveredBar];
        
            let total = monthlyPresence[month] + monthlyAbsence[month];
            let presentPercent = (monthlyPresence[month] / total * 100).toFixed(1);
            let absentPercent = (monthlyAbsence[month] / total * 100).toFixed(1);
        
            let tempF = monthlyTemp[month].toFixed(1);
            let precip = monthlyPrecip[month].toFixed(1);
        
            fill(255);
            stroke(0);
            rect(x - 80, y - 100, 160, 90);
        
            noStroke();
            fill(0);
            textAlign(LEFT);
            textSize(12);
            text(`Month: ${month}`, x - 70, y - 80);
            text(`Present: ${presentPercent}%`, x - 70, y - 65);
            text(`Absent: ${absentPercent}%`, x - 70, y - 50);
            text(`Temp: ${tempF}°F`, x - 70, y - 35);
            text(`Precip: ${precip}mm`, x - 70, y - 20);
        }
    }
    
    if (hoveredPoint) {
        let x = hoveredPoint.x;
        let y = hoveredPoint.y;
        
        fill(255);
        stroke(0);
        rect(x + 10, y - 40, 180, 40);
        
        noStroke();
        fill(0);
        textAlign(LEFT);
        textSize(12);
        
        if (selectedMonth !== null && hoveredPoint.day) {
            text(`Day: ${hoveredPoint.day} ${hoveredPoint.month}`, x + 20, y - 25);
            text(`${hoveredPoint.type === 'temperature' ? 'Temp' : 'Precip'}: ${hoveredPoint.value}${hoveredPoint.type === 'temperature' ? '°F' : 'mm'}`, 
                 x + 20, y - 10);
        } else {
            text(`Month: ${hoveredPoint.month}`, x + 20, y - 25);
            text(hoveredPoint.exactValue || `${hoveredPoint.value}${hoveredPoint.type === 'temperature' ? '°F' : 'mm'}`, 
                 x + 20, y - 10);
        }
    }
}


function drawDailyBars(xStep, chartHeight) {
    let daysInMonth = dates.length;
    let dayWidth = (width - margin.left - margin.right) / daysInMonth;
    
    hoveredBar = -1;
    for (let i = 0; i < daysInMonth; i++) {
        let x = margin.left + i * dayWidth + dayWidth/2;
        let total = present_rate[i] + absent_rate[i];
        
        if (total > 0) {
            if (mouseX >= x - dayWidth/4 && mouseX <= x + dayWidth/4 &&
                mouseY >= height - margin.bottom - chartHeight &&
                mouseY <= height - margin.bottom) {
                hoveredBar = i;
                break;
            }
        }
    }
    
    for (let i = 0; i < daysInMonth; i++) {
        let x = margin.left + i * dayWidth + dayWidth/2;
        let total = present_rate[i] + absent_rate[i];
        
        if (total > 0) {
            let presenceHeight = map(present_rate[i] / total * 100, 0, 100, 0, chartHeight);
            let absenceHeight = map(absent_rate[i] / total * 100, 0, 100, 0, chartHeight);
            
            let alpha = (hoveredBar === -1 || hoveredBar === i) ? 255 : INACTIVE_ALPHA;

            fill(144, 238, 144, alpha);
            rect(x - dayWidth/4, height - margin.bottom - presenceHeight, dayWidth/2, presenceHeight);

            fill(255, 182, 193, alpha);
            rect(x - dayWidth/4, height - margin.bottom - presenceHeight - absenceHeight, dayWidth/2, absenceHeight);
        }
    }
}

function drawDailyLines(xStep, chartHeight) {
    let daysInMonth = dates.length;
    let dayWidth = (width - margin.left - margin.right) / daysInMonth;

    stroke(255, 0, 0);
    strokeWeight(2);
    noFill();
    beginShape();
    for (let i = 0; i < daysInMonth; i++) {
        let x = margin.left + i * dayWidth + dayWidth/2;
        let tempY = map(celsiusToFahrenheit(temperature[i]), 0, 100, height - margin.bottom, margin.top);
        vertex(x, tempY);
    }
    endShape();

    stroke(0, 0, 255);
    strokeWeight(2);
    noFill();
    beginShape();
    for (let i = 0; i < daysInMonth; i++) {
        let x = margin.left + i * dayWidth + dayWidth/2;
        let precipY = map(precipitation[i], 0, 100, height - margin.bottom, margin.top);
        vertex(x, precipY);
    }
    endShape();

    for (let i = 0; i < daysInMonth; i++) {
        let x = margin.left + i * dayWidth + dayWidth/2;
        let tempY = map(celsiusToFahrenheit(temperature[i]), 0, 100, height - margin.bottom, margin.top);
        
        fill(255, 0, 0);
        noStroke();
        ellipse(x, tempY, 8, 8);

        fill(0, 0, 255);
        noStroke();
        ellipse(x, map(precipitation[i], 0, 100, height - margin.bottom, margin.top), 8, 8);
    }
}

function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

function interpretWeatherCode(code) {
    switch (code) {
        case 0: return "Clear sky";
        case 1: return "Mainly clear";
        case 2: return "Partly cloudy";
        case 3: return "Overcast";
        case 45: return "Fog";
        case 48: return "Depositing rime fog";
        case 51: return "Light drizzle";
        case 53: return "Moderate drizzle";
        case 55: return "Dense drizzle";
        case 56: return "Light freezing drizzle";
        case 57: return "Dense freezing drizzle";
        case 61: return "Slight rain";
        case 63: return "Moderate rain";
        case 65: return "Heavy rain";
        case 66: return "Light freezing rain";
        case 67: return "Heavy freezing rain";
        case 71: return "Slight snow fall";
        case 73: return "Moderate snow fall";
        case 75: return "Heavy snow fall";
        case 77: return "Snow grains";
        case 80: return "Slight rain showers";
        case 81: return "Moderate rain showers";
        case 82: return "Violent rain showers";
        case 85: return "Slight snow showers";
        case 86: return "Heavy snow showers";
        case 95: return "Thunderstorm";
        case 96: return "Thunderstorm with slight hail";
        case 99: return "Thunderstorm with heavy hail";
        default: return "Unknown weather";
    }
}

function drawMonthlyData(schoolMonths, xStep, chartHeight) {
    let monthlyTemps = calculateMonthlyAverages(temperature, true);
    let monthlyPrecip = calculateMonthlyAverages(precipitation, false);
    let monthlyPresence = calculateMonthlyAverages(present_rate, false);
    let monthlyAbsence = calculateMonthlyAverages(absent_rate, false);
    
    let tempData = [];
    let precipData = [];
    let presenceData = [];
    let absenceData = [];
    
    for (let month of schoolMonths) {
        tempData.push(monthlyTemps[month]);
        precipData.push(monthlyPrecip[month]);
        presenceData.push(monthlyPresence[month]);
        absenceData.push(monthlyAbsence[month]);
    }
    
    drawBarsWithAnimation(schoolMonths, presenceData, absenceData, xStep, chartHeight);
    drawTemperatureLineWithAnimation(tempData, xStep);
    drawPrecipitationLineWithAnimation(precipData, xStep);
}


function drawBarsWithAnimation(schoolMonths, presenceData, absenceData, xStep, chartHeight) {
    hoveredBar = -1;

    for (let i = 0; i < schoolMonths.length; i++) {
        let x = margin.left + i * xStep + (xStep - barWidth) / 2;
        let baselineY = height - margin.bottom;
        let total = presenceData[i] + absenceData[i];

        if (isNaN(total) || total === 0) continue;
        
        let normalizedPresence = (presenceData[i] / total) * 100;
        let normalizedAbsence = (absenceData[i] / total) * 100;
        
        if (mouseX >= x && mouseX <= x + barWidth &&
            mouseY >= baselineY - (normalizedPresence + normalizedAbsence) * chartHeight/100 &&
            mouseY <= baselineY) {
            hoveredBar = i;
            break;
        }
    }

    for (let i = 0; i < schoolMonths.length; i++) {
        let x = margin.left + i * xStep + (xStep - barWidth) / 2;
        let baselineY = height - margin.bottom;
        let total = presenceData[i] + absenceData[i];

        if (isNaN(total) || total === 0) continue;
        
        let normalizedPresence = (presenceData[i] / total) * 100;
        let normalizedAbsence = (absenceData[i] / total) * 100;

        let barProgress = min(1, (animationProgress - (i * 3)) / 20);

        let targetOpacity = (hoveredBar === -1 || hoveredBar === i) ? 255 : INACTIVE_ALPHA;
        barOpacities[i] = lerp(barOpacities[i], targetOpacity, 0.2);
        
        noStroke();
        fill(144, 238, 144, barOpacities[i]);
        let presenceHeight = map(normalizedPresence * barProgress, 0, 100, 0, chartHeight);
        rect(x, baselineY - presenceHeight, barWidth, presenceHeight);

        fill(255, 182, 193, barOpacities[i]);
        let absenceHeight = map(normalizedAbsence * barProgress, 0, 100, 0, chartHeight);
        rect(x, baselineY - presenceHeight - absenceHeight, barWidth, absenceHeight);
    }
}

function drawTemperatureLineWithAnimation(tempData, xStep) {
    let isHovering = hoveredPoint && hoveredPoint.type === 'temperature';
    let targetOpacity = isHovering ? INACTIVE_ALPHA : 255;
    lineOpacities.temperature = lerp(lineOpacities.temperature, targetOpacity, 0.2);
    
    let progress = min(1, animationProgress / ANIMATION_DURATION);
    
    stroke(255, 0, 0, lineOpacities.temperature);
    strokeWeight(2);

    for (let i = 0; i < tempData.length - 1; i++) {
        if (isNaN(tempData[i]) || isNaN(tempData[i+1])) continue;
        
        let segmentProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        if (segmentProgress > 0) {
            let x1 = margin.left + i * xStep + xStep/2;
            let y1 = map(tempData[i], 0, 100, height - margin.bottom, margin.top);
            let x2 = margin.left + (i + 1) * xStep + xStep/2;
            let y2 = map(tempData[i + 1], 0, 100, height - margin.bottom, margin.top);

            let lineX2 = lerp(x1, x2, segmentProgress);
            let lineY2 = lerp(y1, y2, segmentProgress);
            line(x1, y1, lineX2, lineY2);
        }
    }

    for (let i = 0; i < tempData.length; i++) {
        if (isNaN(tempData[i])) continue;
        
        let pointProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        if (pointProgress > 0) {
            let x = margin.left + i * xStep + xStep/2;
            let y = map(tempData[i], 0, 100, height - margin.bottom, margin.top);
            fill(255, 0, 0, lineOpacities.temperature * pointProgress);
            let pointSize = hoveredPoint && hoveredPoint.type === 'temperature' && hoveredPoint.month === schoolMonths[i] ? 8 + dataPointPulse : 8;
            ellipse(x, y, pointSize, pointSize);
        }
    }
}

function drawPrecipitationLineWithAnimation(precipData, xStep) {
    let isHovering = hoveredPoint && hoveredPoint.type === 'precipitation';
    let targetOpacity = isHovering ? INACTIVE_ALPHA : 255;
    lineOpacities.precipitation = lerp(lineOpacities.precipitation, targetOpacity, 0.2);
    
    let progress = min(1, animationProgress / ANIMATION_DURATION);
    
    stroke(0, 0, 255, lineOpacities.precipitation);
    strokeWeight(2);

    for (let i = 0; i < precipData.length - 1; i++) {
        if (isNaN(precipData[i]) || isNaN(precipData[i+1])) continue;
        
        let segmentProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        if (segmentProgress > 0) {
            let x1 = margin.left + i * xStep + xStep/2;
            let y1 = map(precipData[i], 0, 220, height - margin.bottom, margin.top);
            let x2 = margin.left + (i + 1) * xStep + xStep/2;
            let y2 = map(precipData[i + 1], 0, 220, height - margin.bottom, margin.top);

            let lineX2 = lerp(x1, x2, segmentProgress);
            let lineY2 = lerp(y1, y2, segmentProgress);
            line(x1, y1, lineX2, lineY2);
        }
    }

    for (let i = 0; i < precipData.length; i++) {
        if (isNaN(precipData[i])) continue;
        
        let pointProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        if (pointProgress > 0) {
            let x = margin.left + i * xStep + xStep/2;
            let y = map(precipData[i], 0, 220, height - margin.bottom, margin.top);
            fill(0, 0, 255, lineOpacities.precipitation * pointProgress);
            let pointSize = hoveredPoint && hoveredPoint.type === 'precipitation' && hoveredPoint.month === schoolMonths[i] ? 8 + dataPointPulse : 8;
            ellipse(x, y, pointSize, pointSize);
        }
    }
}
function drawPrecipitationLineWithAnimation(precipData, xStep) {
    let isHovering = hoveredPoint && hoveredPoint.type === 'precipitation';
    let targetOpacity = isHovering ? INACTIVE_ALPHA : 255;
    lineOpacities.precipitation = lerp(lineOpacities.precipitation, targetOpacity, 0.2);
    
    let progress = min(1, animationProgress / ANIMATION_DURATION);
    
    stroke(0, 0, 255, lineOpacities.precipitation);
    strokeWeight(2);

    for (let i = 0; i < precipData.length - 1; i++) {
        if (isNaN(precipData[i]) || isNaN(precipData[i+1])) continue;
        
        let segmentProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        if (segmentProgress > 0) {
            let x1 = margin.left + i * xStep + xStep/2;
            let y1 = map(precipData[i], 0, 220, height - margin.bottom, margin.top);
            let x2 = margin.left + (i + 1) * xStep + xStep/2;
            let y2 = map(precipData[i + 1], 0, 220, height - margin.bottom, margin.top);
            
            let lineX2 = lerp(x1, x2, segmentProgress);
            let lineY2 = lerp(y1, y2, segmentProgress);
            line(x1, y1, lineX2, lineY2);
        }
    }

    for (let i = 0; i < precipData.length; i++) {
        if (isNaN(precipData[i])) continue;
        
        let pointProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        if (pointProgress > 0) {
            let x = margin.left + i * xStep + xStep/2;
            let y = map(precipData[i], 0, 220, height - margin.bottom, margin.top);
            fill(0, 0, 255, lineOpacities.precipitation * pointProgress);
            let pointSize = hoveredPoint && hoveredPoint.type === 'precipitation' && hoveredPoint.month === schoolMonths[i] ? 8 + dataPointPulse : 8;
            ellipse(x, y, pointSize, pointSize);
        }
    }
}

function drawLegend() {
    let legendX = width - margin.right + 105;
    let legendY = margin.top + 30;
    textAlign(LEFT);
    textSize(12);

    fill(0);
    noStroke();
    textStyle(BOLD);
    text('Legend', legendX, legendY - 30);
    
    let textWidthValue = textWidth('Legend');
    stroke(0);
    strokeWeight(2);
    line(legendX, legendY - 25, legendX + textWidthValue, legendY - 25);
    noStroke();
    
    stroke(255, 0, 0);
    line(legendX, legendY, legendX + 20, legendY);
    fill(255, 0, 0);
    ellipse(legendX + 10, legendY, 8, 8);
    fill(0);
    noStroke();
    text('Temperature', legendX + 30, legendY + 5);
    
    legendY += 30;
    
    stroke(0, 0, 255);
    line(legendX, legendY, legendX + 20, legendY);
    fill(0, 0, 255);
    ellipse(legendX + 10, legendY, 8, 8);
    fill(0);
    noStroke();
    text('Precipitation', legendX + 30, legendY + 5);
    
    legendY += 30;
    
    noStroke();
    fill(144, 238, 144);
    rect(legendX, legendY - 8, 20, 16);
    fill(0);
    text('Present', legendX + 30, legendY + 5);
    
    legendY += 30;
    
    fill(255, 182, 193);
    rect(legendX, legendY - 8, 20, 16);
    fill(0);
    text('Absent', legendX + 30, legendY + 5);

    legendY += 97;
    fill(0);
    textStyle(BOLD);
    text('Instructions', legendX, legendY);

    let textWidthInstructions = textWidth('Instructions');
    stroke(0);
    strokeWeight(2);
    line(legendX, legendY + 5, legendX + textWidthInstructions, legendY + 5);
    
    noStroke();
    textStyle(NORMAL);
    textSize(10);
    
    legendY += 25;
    text('- Select a school from the dropdown.', legendX, legendY);
    legendY += 20;
    text('- Hover over bars for details.', legendX, legendY);
    legendY += 20;
    text('- Click on a month to filter by month.', legendX, legendY);
}

function drawBarInfo(index, months, presenceData, absenceData, x, y) {
    let total = presenceData[index] + absenceData[index];

    if (isNaN(total) || total === 0) return;
    
    let presentPercent = (presenceData[index] / total * 100).toFixed(1);
    let absentPercent = (absenceData[index] / total * 100).toFixed(1);
    
    fill(255);
    stroke(0);
    rect(x + 10, y - 70, 160, 60);
    
    noStroke();
    fill(0);
    textAlign(LEFT);
    textSize(12);
    text(`Month: ${months[index]}`, x + 20, y - 50);
    text(`Present: ${presentPercent}%`, x + 20, y - 35);
    text(`Absent: ${absentPercent}%`, x + 20, y - 20);
}

function drawPointInfo(point) {
    fill(255);
    stroke(0);
    rect(point.x + 10, point.y - 40, 160, 40);
    
    noStroke();
    fill(0);
    textAlign(LEFT);
    textSize(12);
    text(`Month: ${point.month}`, point.x + 20, point.y - 25);
    text(`${point.type}: ${point.value}${point.type === 'temperature' ? '°F' : 'mm'}`, 
         point.x + 20, point.y - 10);
}

function calculateMonthlyAverages(data, isTemperature) {
  let monthlyData = {
      'Sept': [], 'Oct': [], 'Nov': [], 'Dec': [],
      'Jan': [], 'Feb': [], 'Mar': [], 'Apr': [], 'May': [], 'Jun': [],
  };
  
  for (let i = 0; i < dates.length; i++) {
      let date = new Date(dates[i]);
      let month = date.getMonth();
      let value = parseFloat(data[i]);
      
      if (isNaN(value)) continue;
      
      if (isTemperature) {
          value = (value * 9/5) + 32;
      }
      
      let monthName = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
      ][month];
      
      if (monthName in monthlyData) {
          monthlyData[monthName].push(value);
      }
  }
  
  let results = {};
  for (let month in monthlyData) {
      if (monthlyData[month].length > 0) {
          if (isTemperature) {
              results[month] = monthlyData[month].reduce((a, b) => a + b) / monthlyData[month].length;
          } else {
              results[month] = monthlyData[month].reduce((a, b) => a + b, 0);
          }
      } else {
          results[month] = NaN;
      }
  }
  
  return results;
}

function mouseMoved() {

    hoveredBar = -1;
    hoveredPoint = null;

    if (selectedMonth !== null) {
        checkDailyHoverElements();
    } else {
        checkMonthlyHoverElements();
    }
}

function checkDailyHoverElements() {
    let daysInMonth = dates.length;
    let dayWidth = (width - margin.left - margin.right) / daysInMonth;

    for (let i = 0; i < daysInMonth; i++) {
        let x = margin.left + i * dayWidth + dayWidth/2;
        let total = present_rate[i] + absent_rate[i];
        
        if (total > 0) {
            let presenceHeight = map(present_rate[i] / total * 100, 0, 100, 0, height - margin.top - margin.bottom);
            let absenceHeight = map(absent_rate[i] / total * 100, 0, 100, 0, height - margin.top - margin.bottom);
            
            if (mouseX >= x - dayWidth/4 && mouseX <= x + dayWidth/4 &&
                mouseY >= height - margin.bottom - presenceHeight - absenceHeight &&
                mouseY <= height - margin.bottom) {

                hoveredBar = i;
                return;
            }
        }
    }

    for (let i = 0; i < daysInMonth; i++) {
        let x = margin.left + i * dayWidth + dayWidth/2;
        let tempY = map(celsiusToFahrenheit(temperature[i]), 0, 100, height - margin.bottom, margin.top);
        
        if (dist(mouseX, mouseY, x, tempY) < 10) {
            let date = dates[i];
            let weatherCode = null;
            
            for (let j = 0; j < table.getRowCount(); j++) {
                let row = table.getRow(j);
                if (row.getString("Date") === date && row.getString("School DBN") === selectedSchool) {
                    weatherCode = interpretWeatherCode(row.getNum("weather_code"));
                    break;
                }
            }
            
            hoveredPoint = {
                type: 'temperature',
                day: new Date(dates[i]).getDate(),
                month: selectedMonth,
                value: celsiusToFahrenheit(temperature[i]).toFixed(1),
                x: x,
                y: tempY,
                weatherCode: weatherCode
            };
            return;
        }
    }
    
    for (let i = 0; i < daysInMonth; i++) {
        let x = margin.left + i * dayWidth + dayWidth/2;
        let precipY = map(precipitation[i], 0, 100, height - margin.bottom, margin.top);
        
        if (dist(mouseX, mouseY, x, precipY) < 10) {
            hoveredPoint = {
                type: 'precipitation',
                day: new Date(dates[i]).getDate(),
                month: selectedMonth,
                value: precipitation[i].toFixed(1),
                x: x,
                y: precipY
            };
            return;
        }
    }
}

function checkMonthlyHoverElements() {
    let schoolMonths = ['Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    let xStep = (width - margin.left - margin.right) / (schoolMonths.length);
    
    let monthlyTemps = calculateMonthlyAverages(temperature, true);
    let monthlyPrecip = calculateMonthlyAverages(precipitation, false);
    let monthlyPresence = calculateMonthlyAverages(present_rate, false);
    let monthlyAbsence = calculateMonthlyAverages(absent_rate, false);
    
    for (let i = 0; i < schoolMonths.length; i++) {
        let x = margin.left + i * xStep + (xStep - barWidth) / 2;
        
        let total = monthlyPresence[schoolMonths[i]] + monthlyAbsence[schoolMonths[i]];
        
        if (isNaN(total) || total === 0) continue;
        
        let normalizedPresence = (monthlyPresence[schoolMonths[i]] / total) * 100;
        let normalizedAbsence = (monthlyAbsence[schoolMonths[i]] / total) * 100;
        let totalHeight = map(normalizedPresence + normalizedAbsence, 0, 100, 0, height - margin.top - margin.bottom);
        
        if (mouseX >= x && mouseX <= x + barWidth &&
            mouseY >= height - margin.bottom - totalHeight &&
            mouseY <= height - margin.bottom) {
            
            hoveredBar = i;
            return;
        }
        
        let tempY = map(monthlyTemps[schoolMonths[i]], 0, 100, height - margin.bottom, margin.top);
        if (dist(mouseX, mouseY, margin.left + i * xStep + xStep/2, tempY) < 10) {
            hoveredPoint = {
                type: 'temperature',
                month: schoolMonths[i],
                value: monthlyTemps[schoolMonths[i]].toFixed(1),
                x: margin.left + i * xStep + xStep/2,
                y: tempY,
                exactValue: `Monthly Average: ${monthlyTemps[schoolMonths[i]].toFixed(1)}°F`
            };
            return;
        }
        
        let precipY = map(monthlyPrecip[schoolMonths[i]], 0, 220, height - margin.bottom, margin.top);
        if (dist(mouseX, mouseY, margin.left + i * xStep + xStep/2, precipY) < 10) {
            hoveredPoint = {
                type: 'precipitation',
                month: schoolMonths[i],
                value: monthlyPrecip[schoolMonths[i]].toFixed(1),
                x: margin.left + i * xStep + xStep/2,
                y: precipY,
                exactValue: `Monthly Total: ${monthlyPrecip[schoolMonths[i]].toFixed(1)}mm`
            };
            return;
        }
    }
}

